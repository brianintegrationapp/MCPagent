# MCP Agent Demo

A **Next.js** application demonstrating the integration of large language models (LLMs) with real‑world tools using the **Model Context Protocol (MCP)** server from Integration.app. This project showcases a fully operational AI assistant capable of dynamically discovering and invoking actions (e.g., creating HubSpot contacts, syncing documents) without hard‑coding every endpoint.

## Features

- **Dynamic Tool Invocation**: The AI agent discovers available tools at runtime via MCP, turning natural language into executable actions.
- **Chat Interface**: Interactive chat powered by OpenAI GPT-4 (or GPT-4o), with automatic function‑calling support.
- **HubSpot Integration**: Create and list contacts in HubSpot CRM through preconfigured Integration.app actions.
- **Authentication**: Customer‑scoped tokens generated on the server; secure Integration.app workspace credentials.
- **Scalable Architecture**: Designed for production—auditable, tenant‑isolated, rate‑limited, and observable.

- **MCP Chat Route** (`app/api/mcp-chat/route.ts`): Bridges GPT function calls to MCP tools.
- **Integration Provider** (`app/integration-provider.tsx`): Fetches per-customer tokens for Integration.app SDK.
- **Inngest Workflows** (`app/api/inngest`, `lib/flows.ts`): Background jobs for document sync and processing.
- **Webhooks** (`app/api/webhooks/*`): Handle external events from Integration.app or HubSpot.
