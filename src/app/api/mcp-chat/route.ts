import { NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"
import path from "path"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import type { Request, Result } from "@modelcontextprotocol/sdk/types.js"

interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

let mcpClient: Client<Request, Request, Result> | null = null
let toolsCache: Tool[] = []
let openai: OpenAI | null = null

export async function POST(req: NextRequest) {
  try {
    const { userMessage, history } = await req.json()

    // --- initialize OpenAI ---
    if (!openai) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY")
      openai = new OpenAI({ apiKey })
    }

    // --- initialize MCP client + fetch tools once ---
    if (!mcpClient) {
      const pathToMcpServer = path.join(
        process.cwd(),
        "node_modules",
        "@integration-app",
        "mcp-server",
        "dist",
        "index.js"
      )
      const integrationAppToken = process.env.INTEGRATION_APP_TOKEN
      const integrationKey = process.env.INTEGRATION_KEY
      if (!integrationAppToken || !integrationKey) {
        throw new Error("Missing INTEGRATION_APP_TOKEN or INTEGRATION_KEY")
      }

      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [pathToMcpServer],
        env: {
          INTEGRATION_APP_TOKEN: integrationAppToken,
          INTEGRATION_KEY: integrationKey,
        },
        stderr: "pipe",
      })

      const client = new Client<Request, Request, Result>({
        name: "MyNextJsClient",
        version: "1.0.0",
        description: "Integration App MCP in Next.js",
        capabilities: { tools: {} },
      })

      await client.connect(transport)
      mcpClient = client

      const listResp = await mcpClient.listTools({})
      toolsCache = Array.isArray(listResp.tools)
        ? (listResp.tools as Tool[])
        : []
      if (!toolsCache.length) {
        throw new Error("No tools available from MCP server")
      }
    }

    // --- turn MCP tools into OpenAI function definitions ---
    const functions = toolsCache.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }))

    // --- prepare chat history ---
    const formattedHistory = history.map((msg: Message) => ({
      role: msg.role,
      content: msg.content,
    }))

    // --- 1) First GPT call, with functions=... and function_call="auto" ---
    const first = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant; use tools when needed." },
        ...formattedHistory,
        { role: "user", content: userMessage },
      ],
      functions,
      function_call: "auto",
    })

    const msg1 = first.choices[0].message

    // --- 2) If GPT asked to call a function, invoke it on the MCP server ---
    if (msg1.function_call) {
      const { name, arguments: rawArgs } = msg1.function_call
      const args = rawArgs ? JSON.parse(rawArgs) : {}

      // call the MCP tool
      const toolResp = await mcpClient.callTool({ name, arguments: args })

      // extract text from the tool response
      const toolText = Array.isArray(toolResp.content)
        ? toolResp.content
            .filter((x) => x.type === "text")
            .map((x: any) => x.text)
            .join(" ")
        : JSON.stringify(toolResp)

      // --- 3) Second GPT call, feeding it the function result ---
      const second = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a helpful assistant; use tools when needed." },
          ...formattedHistory,
          { role: "user", content: userMessage },
          // replay the function_call
          {
            role: "assistant",
            function_call: {
              name,
              arguments: rawArgs,
            },
          },
          { role: "function", name, content: toolText },
        ],
      })

      const final = second.choices[0].message.content || ""
      return NextResponse.json({
        newMessages: [{ role: "assistant", content: final }],
      })
    }

    // --- 4) Otherwise no tool needed, return GPT's direct answer ---
    const direct = msg1.content || ""
    return NextResponse.json({
      newMessages: [{ role: "assistant", content: direct }],
    })
  } catch (err: any) {
    console.error("MCP Chat Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
