---

layout: default
title: "How to Build Model Context Protocol Server That Provides."
description:"A practical guide to building an MCP server that streams real-time test results. Includes Python implementation, code examples, and integration."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-build-model-context-protocol-server-that-provides-rea/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

{%- include why-choose-mcp-server.html -%}



Model Context Protocol (MCP) enables AI assistants to interact with external tools and data sources through a standardized interface. When your AI assistant needs access to test execution results, building a dedicated MCP server provides a clean, maintainable solution. This guide walks through creating an MCP server that streams real-time test results from your test suite to any connected AI client.



## Understanding MCP Server Architecture



An MCP server exposes capabilities through well-defined tools and resources. For test result streaming, you need three core components: a test runner integration layer, an event emission system, and MCP protocol handlers. The server runs as a standalone process that AI clients connect to when they need test information.



The MCP protocol uses JSON-RPC 2.0 for communication. Clients discover available tools through the `tools/list` method, then invoke specific tools with `tools/call`. For real-time updates, MCP supports server-side notifications that push data without client requests.



## Setting Up Your Project



Create a new Python project with the required dependencies:



```bash
mkdir mcp-test-server && cd mcp-test-server
uv venv
source .venv/bin/activate
uv pip install mcp pytest pytest-asyncio aiofiles
```


The MCP SDK provides the core server functionality. pytest runs your tests, and asyncio enables the non-blocking operations needed for real-time streaming.



## Implementing the MCP Server



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
            if "PASSED" in line or "✓" in line:
                passed += 1
                details.append({"status": "passed", "message": line.strip()})
            elif "FAILED" in line or "✗" in line:
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



## Adding Real-Time Streaming



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



## Integrating with AI Assistants



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


The AI assistant can now invoke `run_tests` to execute test suites and receive structured results. This integration works with voice interfaces too—ask your assistant to run tests and describe the results audibly.



## Production Considerations



For production deployments, add authentication to protect test execution capabilities. Implement request timeouts to prevent hung test runs from blocking the server. Store test history in a database if you need trend analysis over time.



Containerize the server with Docker for consistent deployments:



```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN uv pip install --system -r requirements.txt
CMD ["python", "server.py"]
```


## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [How to Build Model Context Protocol Server That Provides.](/ai-tools-compared/how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/)
- [How to Build a Model Context Protocol Server That.](/ai-tools-compared/how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/)
- [How to Create Model Context Protocol Server That Serves.](/ai-tools-compared/how-to-create-model-context-protocol-server-that-serves-api-/)

Built by

Built by theluckystrike — More at [zovo.one](https://zovo.one)
