import { NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"
import path from "path"
import fs from "fs"

// Import from your SDK's cjs sub-path
import { StdioClientTransport } from "@modelcontextprotocol/sdk/dist/cjs/client/stdio.js"
import { Client } from "@modelcontextprotocol/sdk/dist/cjs/client/index.js"

// We'll store references at module scope
let mcpClient: any = null

// GPT model
const MODEL = "gpt-4-0613"

// The function that GPT can call
const toolFunctions = [
  {
    name: "create_hubspot_contact",
    description: "Create a new contact in HubSpot via Integration App (MCP).",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The contact's full name",
        },
        email: {
          type: "string",
          description: "The contact's email address",
        },
      },
      required: ["name", "email"],
    },
  },
]

export async function POST(req: NextRequest) {
  try {
    // 1) Parse input
    const { userMessage, history } = await req.json() as {
      userMessage: string
      history: { role: string; content: string }[]
    }

    // 2) If we haven't spawned the MCP server yet, do so
    if (!mcpClient) {
      console.log("MCP: Spawning child process for Integration App MCP server...")

      // (a) Path to the server code
      const pathToMcpServer = path.join(
        process.cwd(),
        "node_modules",
        "@integration-app",
        "mcp-server",
        "dist",
        "index.js",
      )
      if (!fs.existsSync(pathToMcpServer)) {
        throw new Error("Integration App MCP server file not found at: " + pathToMcpServer)
      }

      // (b) .env variables
      const token = process.env.INTEGRATION_APP_TOKEN
      const integrationKey = process.env.INTEGRATION_KEY
      if (!token || !integrationKey) {
        throw new Error("Missing INTEGRATION_APP_TOKEN or INTEGRATION_KEY")
      }

      // (c) Create stdio transport
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [pathToMcpServer],
        env: {
          INTEGRATION_APP_TOKEN: token,
          INTEGRATION_KEY: integrationKey,
        },
        stderr: "pipe",
        shell: false,
      })

      console.log("MCP: Starting child process now...")
      await transport.start()
      console.log("MCP: child process started, hooking up client...")

      if (transport.stderr) {
        transport.stderr.on("data", (chunk) => {
          console.log("=== Child process stderr ===")
          console.log(chunk.toString("utf-8"))
        })
      }

      // (d) Create the client
      const client = new Client(transport, {
        name: "MyNextJsClient",
        version: "1.0.0",
        description: "Integration App MCP in Next.js (simple chat to HubSpot contact creation)",
        capabilities: { tools: {} },
      })

      // Wire up
      client.onSend = (msg) => transport.send(msg)
      transport.onmessage = (incoming) => client.handleMessage(incoming)

      // Save globally
      mcpClient = client

      // (e) Wait 2s to let server init
      console.log("MCP: waiting 2s for server to initialize...")
      await new Promise((r) => setTimeout(r, 2000))
      console.log("MCP: 2s passed. Ready for requests, skipping list_tools.")
    }

    // 3) Build GPT conversation
    // Filter out function messages from history
    const conversation = (history || []).filter(
      (m) => m.role === "user" || m.role === "assistant"
    )
    conversation.push({ role: "user", content: userMessage })

    // Insert system instructions
    const systemMessage = {
      role: "system" as const,
      content: `You can call create_hubspot_contact if the user wants to create a contact in HubSpot. Otherwise answer normally.`,
    }
    const openAiMessages = [systemMessage, ...conversation]

    // 4) Call GPT with function calling
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error("Missing OPENAI_API_KEY")
    }
    const openai = new OpenAI({ apiKey: openaiApiKey })

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: openAiMessages,
      functions: toolFunctions,
      function_call: "auto",
    })

    const choice = completion.choices[0]
    if (!choice) {
      return NextResponse.json({
        newMessages: [{ role: "assistant", content: "No response from GPT." }],
      })
    }

    // 5) If GPT calls create_hubspot_contact => call_tool
    const funcCall = choice.message?.function_call
    if (funcCall) {
      const { name, arguments: argsString } = funcCall
      if (name === "create_hubspot_contact") {
        console.log("GPT wants to create a HubSpot contact, parsing arguments...")

        let parsedArgs: any = {}
        try {
          parsedArgs = JSON.parse(argsString || "{}")
        } catch (err) {
          console.warn("Failed to parse function_call arguments:", err)
        }

        console.log("MCP: calling call_tool => 'create-contact' with", parsedArgs)
        // Update "create-contact" if your Integration App action has a different key
        const toolResp = await mcpClient.request({
          name: "call_tool",
          data: {
            toolName: "create-contact",
            arguments: {
              email: parsedArgs.email,
              fullname: parsedArgs.name,
            },
          },
        })

        const textOutput = toolResp?.content?.[0]?.text || JSON.stringify(toolResp, null, 2)
        return NextResponse.json({
          newMessages: [
            {
              role: "assistant",
              content: `Called create_hubspot_contact with ${JSON.stringify(parsedArgs)}`,
            },
            {
              role: "function",
              content: textOutput,
            },
          ],
        })
      }
    }

    // 6) Otherwise normal text
    const text = choice.message?.content || "[No text returned]"
    return NextResponse.json({
      newMessages: [{ role: "assistant", content: text }],
    })
  } catch (err: any) {
    console.error("MCP Chat Route Error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
