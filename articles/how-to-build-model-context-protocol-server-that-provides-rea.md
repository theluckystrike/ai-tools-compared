---
layout: default
title: "How to Build Model Context Protocol Server That Provides Rea"
description: "A practical guide to building an MCP server that streams real-time test results. Includes Python implementation, code examples, and integration"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-build-model-context-protocol-server-that-provides-rea/
categories: [guides]
tags: [ai-tools-compared, tools]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Model Context Protocol (MCP) enables AI assistants to interact with external tools and data sources through a standardized interface. When your AI assistant needs access to test execution results, building a dedicated MCP server provides a clean, maintainable solution. This guide walks through creating a MCP server that streams real-time test results from your test suite to any connected AI client.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1: Understand MCP Server Architecture

An MCP server exposes capabilities through well-defined tools and resources. For test result streaming, you need three core components: a test runner integration layer, an event emission system, and MCP protocol handlers. The server runs as a standalone process that AI clients connect to when they need test information.

The MCP protocol uses JSON-RPC 2.0 for communication. Clients discover available tools through the `tools/list` method, then invoke specific tools with `tools/call`. For real-time updates, MCP supports server-side notifications that push data without client requests.

Step 2: Set Up Your Project

Create a new Python project with the required dependencies:

```bash
mkdir mcp-test-server && cd mcp-test-server
uv venv
source .venv/bin/activate
uv pip install mcp pytest pytest-asyncio aiofiles
```

The MCP SDK provides the core server functionality. pytest runs your tests, and asyncio enables the non-blocking operations needed for real-time streaming.

Step 3: Implementing the MCP Server

Create `server.py` with the following structure:

```python
import asyncio
import json
import subprocess
from pathlib import Path
from typing import Any
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

class TestResultServer:
    def __init__(self):
        self.server = Server("test-results")
        self._register_handlers()

    def _register_handlers(self):
        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            return [
                Tool(
                    name="run_tests",
                    description="Run test suite and stream results in real-time",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "test_path": {
                                "type": "string",
                                "description": "Path to test file or directory"
                            },
                            "framework": {
                                "type": "string",
                                "enum": ["pytest", "unittest", "jest"],
                                "default": "pytest"
                            }
                        }
                    }
                ),
                Tool(
                    name="get_test_status",
                    description="Get current status of running or last test execution"
                )
            ]

        @self.server.call_tool()
        async def call_tool(name: str, arguments: dict) -> list[TextContent]:
            if name == "run_tests":
                return await self.run_tests(
                    arguments.get("test_path", "tests/"),
                    arguments.get("framework", "pytest")
                )
            elif name == "get_test_status":
                return [TextContent(type="text", text=json.dumps(self.status))]
            return []

    async def run_tests(self, test_path: str, framework: str) -> list[TextContent]:
        self.status = {"running": True, "results": []}

        cmd = self._build_command(framework, test_path)
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()
        results = self._parse_output(stdout.decode(), framework)

        self.status = {
            "running": False,
            "results": results,
            "exit_code": process.returncode
        }

        return [TextContent(type="text", text=json.dumps(results, indent=2))]

    def _build_command(self, framework: str, test_path: str) -> list[str]:
        if framework == "pytest":
            return ["pytest", "-v", "--tb=short", test_path]
        return ["npm", "test", "--", test_path]

    def _parse_output(self, output: str, framework: str) -> dict:
        lines = output.split("\n")
        passed = failed = 0
        details = []

        for line in lines:
            if "PASSED" in line or "" in line:
                passed += 1
                details.append({"status": "passed", "message": line.strip()})
            elif "FAILED" in line or "" in line:
                failed += 1
                details.append({"status": "failed", "message": line.strip()})

        return {
            "total": passed + failed,
            "passed": passed,
            "failed": failed,
            "details": details
        }

    async def run(self):
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )

if __name__ == "__main__":
    server = TestResultServer()
    asyncio.run(server.run())
```

This server exposes two tools: `run_tests` executes your test suite and returns structured results, while `get_test_status` provides visibility into the current execution state.

Step 4: Adding Real-Time Streaming

The implementation above returns results after completion. For true real-time streaming, modify the server to emit progress notifications:

```python
async def run_tests_streaming(self, test_path: str, framework: str):
    cmd = self._build_command(framework, test_path)

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    # Stream output line by line as tests run
    while True:
        line = await process.stdout.readline()
        if not line:
            break

        test_update = self._parse_test_line(line.decode())
        if test_update:
            # Emit notification to connected clients
            await self.server.request_context.send_notification(
                "notifications/test_progress",
                test_update
            )
```

Clients receive these notifications automatically without polling, enabling live test result dashboards.

Step 5: Integrate with AI Assistants

Once your MCP server runs, connect it to your AI assistant. In Claude Desktop or another MCP-compatible client, add the server configuration:

```json
{
  "mcpServers": {
    "test-results": {
      "command": "python",
      "args": ["/path/to/mcp-test-server/server.py"]
    }
  }
}
```

The AI assistant can now invoke `run_tests` to execute test suites and receive structured results. This integration works with voice interfaces too, ask your assistant to run tests and describe the results audibly.

Production Considerations

For production deployments, add authentication to protect test execution capabilities. Implement request timeouts to prevent hung test runs from blocking the server. Store test history in a database if you need trend analysis over time.

Containerize the server with Docker for consistent deployments:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN uv pip install --system -r requirements.txt
CMD ["python", "server.py"]
```

Step 6: Handling Multiple Test Frameworks

Production codebases often use more than one test framework. a Python backend tested with pytest, a JavaScript frontend tested with Jest. Extend the command builder to route correctly:

```python
def _build_command(self, framework: str, test_path: str) -> list[str]:
    commands = {
        "pytest": ["pytest", "-v", "--tb=short", "--json-report", test_path],
        "unittest": ["python", "-m", "pytest", "--tb=short", test_path],
        "jest": ["npx", "jest", "--json", test_path],
        "vitest": ["npx", "vitest", "run", "--reporter=json", test_path],
        "go": ["go", "test", "-v", "-json", test_path],
    }
    return commands.get(framework, commands["pytest"])
```

Using `--json-report` for pytest (via `pytest-json-report`) and `--json` for Jest produces structured output that's far easier to parse than terminal text. The AI client receives clean JSON it can summarize, display as a table, or correlate with source code rather than raw console output.

Step 7: Persisting Test History with SQLite

Trend analysis. detecting when a test suite starts flaking, tracking coverage over time. requires storing results. SQLite is the right choice for a MCP server: zero configuration, embeddable, and queryable via SQL.

```python
import sqlite3
from datetime import datetime

def init_db(db_path: str = "test_history.db"):
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            test_path TEXT NOT NULL,
            framework TEXT NOT NULL,
            total INTEGER,
            passed INTEGER,
            failed INTEGER,
            duration_ms INTEGER,
            exit_code INTEGER
        )
    """)
    conn.commit()
    return conn

def save_run(conn, test_path: str, framework: str, results: dict, duration_ms: int, exit_code: int):
    conn.execute("""
        INSERT INTO runs (timestamp, test_path, framework, total, passed, failed, duration_ms, exit_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.utcnow().isoformat(),
        test_path, framework,
        results["total"], results["passed"], results["failed"],
        duration_ms, exit_code
    ))
    conn.commit()
```

Expose a `get_test_trends` tool that AI clients can use to detect regressions:

```python
@self.server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        # ... existing tools ...
        Tool(
            name="get_test_trends",
            description="Get pass/fail trend for a test path over recent runs",
            inputSchema={
                "type": "object",
                "properties": {
                    "test_path": {"type": "string"},
                    "limit": {"type": "integer", "default": 10}
                }
            }
        )
    ]
```

Step 8: Secure the MCP Server

An MCP server that can execute test commands on your system is a meaningful attack surface. Before exposing it outside localhost, add authentication.

The simplest approach is a bearer token check on every tool invocation:

```python
import os
import hashlib
import hmac

ALLOWED_TOKEN = os.environ.get("MCP_AUTH_TOKEN", "")

def verify_token(provided: str) -> bool:
    if not ALLOWED_TOKEN:
        return False
    return hmac.compare_digest(
        hashlib.sha256(provided.encode()).digest(),
        hashlib.sha256(ALLOWED_TOKEN.encode()).digest()
    )
```

Also restrict the `test_path` argument to prevent directory traversal. Resolve the path and verify it stays within the project root:

```python
import pathlib

PROJECT_ROOT = pathlib.Path("/workspace").resolve()

def safe_test_path(user_path: str) -> pathlib.Path:
    resolved = (PROJECT_ROOT / user_path).resolve()
    if not str(resolved).startswith(str(PROJECT_ROOT)):
        raise ValueError(f"test_path must be within {PROJECT_ROOT}")
    return resolved
```

These two controls. token authentication and path restriction. prevent the most common misuse scenarios when running a MCP server in a shared or CI environment.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to build model context protocol server that provides rea?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Can I adapt this for a different tech stack?

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

Related Articles

- [How to Build Model Context Protocol Server That Provides](/how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/)
- [How to Build a Model Context Protocol Server That](/how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/)
- [How to Build Model Context Protocol Server for Internal Desi](/how-to-build-model-context-protocol-server-for-internal-desi/)
- [How to Build a Model Context Protocol Server That Serves](/how-to-build-model-context-protocol-server-that-serves-opena/)
- [How to Create Model Context Protocol Server That Serves API](/how-to-create-model-context-protocol-server-that-serves-api-/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
