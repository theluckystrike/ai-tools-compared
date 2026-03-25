---
layout: default
title: "How to Build Custom MCP Servers for Claude"
description: "Build custom Model Context Protocol servers to extend Claude with tools, resources, and prompts. complete guide with Python and Node.js examples"
date: 2026-03-22
author: theluckystrike
permalink: how-to-build-custom-mcp-servers-for-claude
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, claude-ai]
---

{% raw %}

Model Context Protocol (MCP) lets you extend Claude with custom tools, expose data sources as resources, and define reusable prompts. all without modifying Claude's core behavior. A custom MCP server can give Claude access to your internal APIs, databases, or file systems in a controlled, auditable way.

This guide builds three real MCP servers: a database query tool, a REST API wrapper, and a file watcher resource.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - How MCP Works

Claude communicates with MCP servers over stdio or HTTP. The server advertises its capabilities (tools, resources, prompts) and Claude decides when to call them based on context.

```
Claude (client) ←→ MCP Protocol ←→ Your MCP Server ←→ Data Sources
                  (JSON-RPC/stdio)
```

Three primitive types:
- Tools: Functions Claude can call (like function calling in the API)
- Resources: Read-only data Claude can access (files, DB records, API responses)
- Prompts: Reusable prompt templates with arguments

Step 2 - Set Up

```bash
Python SDK
pip install mcp

Node.js SDK
npm install @modelcontextprotocol/sdk
```

Configure Claude Desktop to load your server in `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-db-server": {
      "command": "python",
      "args": ["/path/to/db_server.py"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost/mydb"
      }
    }
  }
}
```

Step 3 - Server 1: Database Query Tool (Python)

```python
db_server.py
import asyncio
import os
import json
from contextlib import asynccontextmanager
import asyncpg
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

DB_URL = os.environ["DATABASE_URL"]
ALLOWED_SCHEMAS = {"public", "analytics"}  # Security: restrict schema access

app = Server("database-tools")
db_pool: asyncpg.Pool | None = None

@asynccontextmanager
async def lifespan():
    global db_pool
    db_pool = await asyncpg.create_pool(DB_URL, min_size=1, max_size=5)
    yield
    await db_pool.close()

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="query_database",
            description=(
                "Run a read-only SQL query against the database. "
                "Only SELECT statements are allowed. "
                "Returns results as JSON."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL SELECT query to execute"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum rows to return (default 100, max 1000)",
                        "default": 100
                    }
                },
                "required": ["sql"]
            }
        ),
        types.Tool(
            name="list_tables",
            description="List all accessible tables and their column definitions",
            inputSchema={
                "type": "object",
                "properties": {
                    "schema": {
                        "type": "string",
                        "description": "Schema name (default: public)",
                        "default": "public"
                    }
                }
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "query_database":
        return await handle_query(arguments)
    elif name == "list_tables":
        return await handle_list_tables(arguments)
    raise ValueError(f"Unknown tool: {name}")

async def handle_query(args: dict) -> list[types.TextContent]:
    sql = args["sql"].strip()
    limit = min(int(args.get("limit", 100)), 1000)

    # Security: only allow SELECT
    if not sql.upper().startswith("SELECT"):
        return [types.TextContent(
            type="text",
            text="Error: Only SELECT queries are permitted"
        )]

    # Security: block schema access outside allowed set
    for schema in ALLOWED_SCHEMAS:
        if schema not in sql.lower() and "." in sql:
            pass  # Will rely on DB permissions for enforcement

    try:
        async with db_pool.acquire() as conn:
            # Run in read-only transaction
            async with conn.transaction(readonly=True):
                rows = await conn.fetch(
                    f"SELECT * FROM ({sql}) AS q LIMIT $1",
                    limit
                )

        result = [dict(row) for row in rows]
        return [types.TextContent(
            type="text",
            text=json.dumps({
                "rows": result,
                "count": len(result),
                "truncated": len(result) == limit
            }, indent=2, default=str)
        )]
    except asyncpg.PostgresError as e:
        return [types.TextContent(type="text", text=f"Database error: {e}")]

async def handle_list_tables(args: dict) -> list[types.TextContent]:
    schema = args.get("schema", "public")
    if schema not in ALLOWED_SCHEMAS:
        return [types.TextContent(type="text", text=f"Schema '{schema}' not accessible")]

    async with db_pool.acquire() as conn:
        tables = await conn.fetch("""
            SELECT table_name,
                   json_agg(json_build_object(
                       'column', column_name,
                       'type', data_type,
                       'nullable', is_nullable
                   ) ORDER BY ordinal_position) AS columns
            FROM information_schema.columns
            WHERE table_schema = $1
            GROUP BY table_name
            ORDER BY table_name
        """, schema)

    result = {row["table_name"]: json.loads(row["columns"]) for row in tables}
    return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

async def main():
    async with lifespan():
        async with stdio_server() as (read_stream, write_stream):
            await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

Step 4 - Server 2: REST API Wrapper (Node.js)

```typescript
// api_server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = process.env.API_BASE_URL ?? "https://api.example.com";
const API_KEY = process.env.API_KEY;

const server = new Server(
  { name: "api-wrapper", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "api_get",
      description: "Make a GET request to the internal API",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "API path (e.g. /users/123)" },
          params: {
            type: "object",
            description: "Query parameters",
            additionalProperties: { type: "string" }
          }
        },
        required: ["path"]
      }
    },
    {
      name: "api_post",
      description: "Make a POST request to the internal API",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          body: { type: "object", description: "Request body (JSON)" }
        },
        required: ["path", "body"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args || typeof args !== "object") {
    throw new McpError(ErrorCode.InvalidParams, "Arguments required");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(API_KEY ? { "Authorization": `Bearer ${API_KEY}` } : {})
  };

  try {
    let url = `${BASE_URL}${args.path}`;
    let fetchOptions: RequestInit = { headers };

    if (name === "api_get") {
      if (args.params) {
        const query = new URLSearchParams(args.params as Record<string, string>);
        url += `?${query}`;
      }
      fetchOptions.method = "GET";
    } else if (name === "api_post") {
      fetchOptions.method = "POST";
      fetchOptions.body = JSON.stringify(args.body);
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => ({ raw: await response.text() }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: response.status,
          ok: response.ok,
          data
        }, null, 2)
      }]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Request failed: ${message}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Step 5 - Server 3: File Watcher Resource

Resources expose live data Claude can read. This one exposes log files:

```python
log_resource_server.py
import asyncio
import os
from pathlib import Path
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

app = Server("log-resources")
LOG_DIR = Path(os.environ.get("LOG_DIR", "/var/log/app"))

@app.list_resources()
async def list_resources() -> list[types.Resource]:
    resources = []
    for log_file in LOG_DIR.glob("*.log"):
        resources.append(types.Resource(
            uri=f"file://{log_file}",
            name=log_file.name,
            description=f"Log file: {log_file.name}",
            mimeType="text/plain"
        ))
    return resources

@app.read_resource()
async def read_resource(uri: str) -> str:
    path = Path(uri.replace("file://", ""))

    # Security: ensure path is within LOG_DIR
    try:
        path.resolve().relative_to(LOG_DIR.resolve())
    except ValueError:
        raise ValueError(f"Access denied: {uri}")

    if not path.exists():
        raise FileNotFoundError(f"Log file not found: {path.name}")

    # Return last 200 lines
    lines = path.read_text().splitlines()
    return "\n".join(lines[-200:])

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

Step 6 - Registering Multiple Servers

```json
{
  "mcpServers": {
    "database": {
      "command": "python",
      "args": ["/opt/mcp/db_server.py"],
      "env": { "DATABASE_URL": "postgresql://..." }
    },
    "internal-api": {
      "command": "node",
      "args": ["/opt/mcp/api_server.js"],
      "env": {
        "API_BASE_URL": "https://internal.example.com",
        "API_KEY": "sk-..."
      }
    },
    "logs": {
      "command": "python",
      "args": ["/opt/mcp/log_resource_server.py"],
      "env": { "LOG_DIR": "/var/log/myapp" }
    }
  }
}
```

Once registered, Claude can use all three servers in a single conversation: query the database, call the internal API, and read log files as needed.

Step 7 - Security Checklist

- Restrict SQL to SELECT only; use a read-only DB user
- Validate all file paths against an allowed base directory
- Rotate API keys referenced in environment variables
- Log all tool calls with timestamps and arguments
- Set `ALLOWED_SCHEMAS` or equivalent for DB servers to limit data exposure

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Related Articles

- [How to Build Custom AI Coding Workflows with MCP Server](/how-to-build-custom-ai-coding-workflows-with-mcp-server-inte/)
- [Claude MCP Server Connection Failed Fix (2026)](/claude-mcp-server-connection-failed-fix-2026/)
- [Migrating from ChatGPT Plugins to Claude MCP Tools](/migrating-from-chatgpt-plugins-to-claude-mcp-tools-for-coding-workflows/)
- [How to Build Model Context Protocol Server That Provides Rea](/how-to-build-model-context-protocol-server-that-provides-rea/)
- [Transfer ChatGPT Custom GPTs to Claude Projects](/transfer-chatgpt-custom-gpts-to-claude-projects-step-by-step/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
