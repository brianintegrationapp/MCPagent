# MCP Agent Demo

A **Next.js** application demonstrating the integration of large language models (LLMs) with real‑world tools using the **Model Context Protocol (MCP)** server from Integration.app. This project showcases a fully operational AI assistant capable of dynamically discovering and invoking actions (e.g., creating HubSpot contacts, syncing documents) without hard‑coding every endpoint.

## Features

- **Dynamic Tool Invocation**: The AI agent discovers available tools at runtime via MCP, turning natural language into executable actions.
- **Chat Interface**: Interactive chat powered by OpenAI GPT-4 (or GPT-4o), with automatic function‑calling support.
- **HubSpot Integration**: Create and list contacts in HubSpot CRM through preconfigured Integration.app actions.
- **Document Sync & Management**: Connect to external data sources, sync documents via Inngest flows, and extract text from files using AWS S3 & Unstructured API.
- **Webhooks & Flows**: Handle events (create/update/delete/download) via webhooks and trigger Inngest-driven background jobs.
- **Authentication**: Customer‑scoped tokens generated on the server; secure Integration.app workspace credentials.
- **Scalable Architecture**: Designed for production—auditable, tenant‑isolated, rate‑limited, and observable.

## Getting Started

### Prerequisites

- Node.js (v16+)
- Docker & Docker Compose (for running MCP server locally)
- A MongoDB instance (URI in `MONGODB_URI`)
- AWS S3 credentials (for file uploads)
- Integration.app credentials:
  - `INTEGRATION_APP_TOKEN`
  - `INTEGRATION_KEY`
  - `INTEGRATION_APP_WORKSPACE_KEY`
  - `INTEGRATION_APP_WORKSPACE_SECRET`
- OpenAI API key: `OPENAI_API_KEY`
- Unstructured API credentials (optional for text extraction):
  - `UNSTRUCTURED_API_KEY`
  - `UNSTRUCTURED_API_URL`

### Installation

1. **Clone the repo**:
   ```bash
   git clone https://github.com/your-org/mcp-agent-demo.git
   cd mcp-agent-demo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Variables**:
   Create a `.env.local` in the root:
   ```ini
   OPENAI_API_KEY=sk-...
   MONGODB_URI=mongodb+srv://...
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_BUCKET_NAME=...
   AWS_REGION=...
   INTEGRATION_APP_TOKEN=...
   INTEGRATION_KEY=...
   INTEGRATION_APP_WORKSPACE_KEY=...
   INTEGRATION_APP_WORKSPACE_SECRET=...
   UNSTRUCTURED_API_KEY=...
   UNSTRUCTURED_API_URL=https://api.unstructured.io
   ```

4. **Run integration.app MCP server** (locally or remote):
   ```bash
   # via Docker Compose
   docker-compose up -d mcp-server

   # or manually
   npm run start:mcp-server
   ```

5. **Start the Next.js app**:
   ```bash
   npm run dev
   ```

6. **Open** `http://localhost:3000` in your browser.

## Usage

- **Chat Agent**: Navigate to `/chat`, type requests like:
  > *"Create a new contact John Doe with email john@example.com"*

- **Contacts List**: View live HubSpot contacts in the sidebar; updates automatically after creation.

- **Integrations**: Go to `/integrations` to connect to external data sources, sync documents, and pick folders/files to subscribe.

## Architecture Overview

```text
Next.js Frontend   ←→  /api/*  ←→  MCP Chat Route
           │                        │
           │                        └→ StdioClientTransport → MCP Server → Integration.app actions
           │
           └→ Integration.app React Provider

Inngest Functions (sync, download) ←→ MongoDB ←→ AWS S3 / Unstructured
```

- **MCP Chat Route** (`app/api/mcp-chat/route.ts`): Bridges GPT function calls to MCP tools.
- **Integration Provider** (`app/integration-provider.tsx`): Fetches per-customer tokens for Integration.app SDK.
- **Inngest Workflows** (`app/api/inngest`, `lib/flows.ts`): Background jobs for document sync and processing.
- **Webhooks** (`app/api/webhooks/*`): Handle external events from Integration.app or HubSpot.
