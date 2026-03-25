---
layout: default
title: "How to Create Model Context Protocol Server That Serves API"
description: "Learn to build a Model Context Protocol server that exposes your API documentation to AI assistants, enabling accurate code generation and intelligent"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-create-model-context-protocol-server-that-serves-api-/
categories: [guides]
tags: [ai-tools-compared, tools, api]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

Introduction

As AI coding assistants become more sophisticated, they need better access to your API documentation to generate accurate code and provide intelligent responses. The Model Context Protocol (MCP) provides a standardized way for AI tools to interact with external services and data sources. By creating a MCP server that serves your API documentation, you enable AI assistants to understand your API's structure, endpoints, authentication requirements, and response formats without manual context injection.

This guide walks through building a MCP server in Python that exposes your API documentation to AI tools. You'll learn how to structure your server, parse documentation formats, and expose tools that AI assistants can query dynamically.

Prerequisites

Before building your MCP documentation server, ensure you have:

- Python 3.10 or higher installed

- An API with documentation (OpenAPI/Swagger, Postman collection, or custom format)

- Basic familiarity with FastMCP or similar MCP frameworks

Step 1 - Set Up Your Project

Start by creating a new Python project and installing the necessary dependencies:

```bash
mkdir api-docs-mcp-server
cd api-docs-mcp-server
uv venv
uv pip install fastmcp pydantic pyyaml httpx
```

Initialize your project structure:

```
api-docs-mcp-server/
 main.py
 docs/
    openapi.yaml
 requirements.txt
```

Step 2 - Create the MCP Server

The core of your documentation server involves parsing your API documentation and exposing it through MCP tools. Here's a complete implementation using FastMCP:

```python
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional, List
import yaml
import httpx

mcp = FastMCP("API Documentation Server")

Store parsed documentation in memory
api_docs = {}

class EndpointInfo(BaseModel):
    path: str
    method: str
    summary: str
    description: Optional[str] = None
    parameters: List[dict] = []
    request_body: Optional[dict] = None
    responses: dict = {}

def load_openapi_spec(path: str) -> dict:
    """Load and parse OpenAPI specification file."""
    with open(path, 'r') as f:
        return yaml.safe_load(f)

def parse_endpoints(spec: dict) -> List[EndpointInfo]:
    """Extract endpoint information from OpenAPI spec."""
    endpoints = []
    paths = spec.get('paths', {})

    for path, methods in paths.items():
        for method, details in methods.items():
            if method in ['get', 'post', 'put', 'delete', 'patch']:
                endpoint = EndpointInfo(
                    path=path,
                    method=method.upper(),
                    summary=details.get('summary', ''),
                    description=details.get('description'),
                    parameters=details.get('parameters', []),
                    request_body=details.get('requestBody'),
                    responses=details.get('responses', {})
                )
                endpoints.append(endpoint)

    return endpoints

@mcp.tool()
async def load_documentation(spec_path: str = "docs/openapi.yaml") -> str:
    """Load API documentation from OpenAPI specification file."""
    global api_docs
    spec = load_openapi_spec(spec_path)
    api_docs['spec'] = spec
    api_docs['endpoints'] = parse_endpoints(spec)
    api_docs['title'] = spec.get('info', {}).get('title', 'API')
    api_docs['version'] = spec.get('info', {}).get('version', '1.0.0')

    return f"Loaded documentation for {api_docs['title']} v{api_docs['version']} with {len(api_docs['endpoints'])} endpoints"

@mcp.tool()
async def get_endpoint(path: str, method: str) -> dict:
    """Get detailed information about a specific endpoint."""
    if not api_docs.get('endpoints'):
        return {"error": "No documentation loaded. Call load_documentation first."}

    for endpoint in api_docs['endpoints']:
        if endpoint.path == path and endpoint.method.upper() == method.upper():
            return {
                "path": endpoint.path,
                "method": endpoint.method,
                "summary": endpoint.summary,
                "description": endpoint.description,
                "parameters": endpoint.parameters,
                "request_body": endpoint.request_body,
                "responses": endpoint.responses
            }

    return {"error": f"Endpoint {method} {path} not found"}

@mcp.tool()
async def search_endpoints(query: str) -> List[dict]:
    """Search for endpoints matching a query string."""
    if not api_docs.get('endpoints'):
        return [{"error": "No documentation loaded. Call load_documentation first."}]

    query_lower = query.lower()
    results = []

    for endpoint in api_docs['endpoints']:
        if (query_lower in endpoint.path.lower() or
            query_lower in endpoint.summary.lower() or
            (endpoint.description and query_lower in endpoint.description.lower())):
            results.append({
                "path": endpoint.path,
                "method": endpoint.method,
                "summary": endpoint.summary
            })

    return results

@mcp.tool()
async def list_endpoints() -> List[dict]:
    """List all available endpoints."""
    if not api_docs.get('endpoints'):
        return [{"error": "No documentation loaded. Call load_documentation first."}]

    return [
        {"path": e.path, "method": e.method, "summary": e.summary}
        for e in api_docs['endpoints']
    ]

if __name__ == "__main__":
    mcp.run()
```

Step 3 - Create Sample Documentation

Create a sample OpenAPI specification to test your server:

```yaml
docs/openapi.yaml
openapi: 3.0.0
info:
  title: Task Management API
  version: 1.0.0
  description: API for managing tasks and projects

paths:
  /tasks:
    get:
      summary: List all tasks
      description: Retrieve a paginated list of all tasks
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  tasks:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        title:
                          type: string
                        status:
                          type: string
                          enum: [pending, in_progress, completed]
    post:
      summary: Create a new task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - title
              properties:
                title:
                  type: string
                description:
                  type: string
                priority:
                  type: string
                  enum: [low, medium, high]
      responses:
        '201':
          description: Task created successfully

  /tasks/{task_id}:
    get:
      summary: Get a specific task
      parameters:
        - name: task_id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful response
        '404':
          description: Task not found
    delete:
      summary: Delete a task
      parameters:
        - name: task_id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Task deleted successfully
```

Step 4 - Run and Testing the Server

Start your MCP server:

```bash
python main.py
```

The server will start and listen for connections from AI tools. To test it, you can use a MCP-compatible client or manually invoke the tools:

```python
import asyncio
from main import load_documentation, list_endpoints, get_endpoint, search_endpoints

async def test_server():
    # Load documentation
    result = await load_documentation("docs/openapi.yaml")
    print(result)

    # List all endpoints
    endpoints = await list_endpoints()
    print(f"Found {len(endpoints)} endpoints:")
    for ep in endpoints:
        print(f"  {ep['method']} {ep['path']} - {ep['summary']}")

    # Search for endpoints
    results = await search_endpoints("task")
    print(f"\nSearch results: {results}")

    # Get specific endpoint details
    details = await get_endpoint("/tasks", "GET")
    print(f"\nGET /tasks details: {details}")

asyncio.run(test_server())
```

Step 5 - Integrate with AI Tools

Once your MCP server is running, configure your AI assistant to connect to it. Most AI coding tools support MCP through their configuration files:

```json
{
  "mcpServers": {
    "api-docs": {
      "command": "python",
      "args": ["/path/to/api-docs-mcp-server/main.py"]
    }
  }
}
```

After configuration, your AI assistant can query your API documentation directly. For example:

- "Show me all endpoints related to user authentication"

- "What parameters does the POST /tasks endpoint accept?"

- "How do I authenticate with the API?"

Advanced Features

To enhance your documentation server further, consider adding these capabilities:

Response Examples - Extract and expose example responses from your OpenAPI spec so AI tools can understand data structures.

Authentication Documentation - Parse security schemes and expose authentication requirements clearly.

Rate Limiting Info - Include rate limit headers and retry-after values in endpoint documentation.

Version Comparison - Support multiple API versions and allow querying differences between versions.

Step 6 - Caching Documentation in Memory vs. Reloading on Change

Loading the OpenAPI spec on every tool call adds latency. But serving stale docs when the spec changes during development produces confusing AI suggestions. The right approach is to cache with optional hot-reload:

```python
import asyncio
import hashlib
from pathlib import Path

class DocumentationCache:
    def __init__(self, spec_path: str):
        self.spec_path = Path(spec_path)
        self._cache: dict = {}
        self._last_hash: str = ""

    def _file_hash(self) -> str:
        return hashlib.md5(self.spec_path.read_bytes()).hexdigest()

    def get_or_reload(self) -> dict:
        current_hash = self._file_hash()
        if current_hash != self._last_hash:
            spec = load_openapi_spec(str(self.spec_path))
            self._cache = {
                "spec": spec,
                "endpoints": parse_endpoints(spec),
                "title": spec.get("info", {}).get("title", "API"),
                "version": spec.get("info", {}).get("version", "1.0.0"),
            }
            self._last_hash = current_hash
        return self._cache
```

This approach reloads automatically when the file changes without polling. When the MD5 matches the cached hash, it returns the cached result immediately. Development workflows benefit from the hot-reload; production deployments benefit from the cache hit performance.

Step 7 - Exposing Authentication Schemes

AI assistants generate better API client code when they understand the authentication model. Parse the security schemes from your OpenAPI spec and expose them as a dedicated tool:

```python
@mcp.tool()
async def get_auth_schemes() -> dict:
    """Get authentication requirements for the API."""
    if not api_docs.get("spec"):
        return {"error": "No documentation loaded."}

    spec = api_docs["spec"]
    security_schemes = spec.get("components", {}).get("securitySchemes", {})
    global_security = spec.get("security", [])

    result = {"global_requirements": global_security, "schemes": {}}

    for name, scheme in security_schemes.items():
        result["schemes"][name] = {
            "type": scheme.get("type"),
            "description": scheme.get("description", ""),
        }
        if scheme.get("type") == "apiKey":
            result["schemes"][name]["in"] = scheme.get("in")
            result["schemes"][name]["name"] = scheme.get("name")
        elif scheme.get("type") == "http":
            result["schemes"][name]["scheme"] = scheme.get("scheme")  # bearer, basic
        elif scheme.get("type") == "oauth2":
            result["schemes"][name]["flows"] = list(scheme.get("flows", {}).keys())

    return result
```

When an AI assistant calls `get_auth_schemes()` before generating code for a protected endpoint, it automatically includes correct `Authorization` headers or API key parameters rather than requiring you to specify authentication in every prompt.

Step 8 - Supporting Multiple API Versions

APIs evolve. An MCP documentation server that only knows the current version can't help when a client is pinned to an older version. Add multi-version support with a version registry:

```python
Store multiple spec versions
api_versions: dict[str, dict] = {}

@mcp.tool()
async def load_version(spec_path: str, version_label: str = "current") -> str:
    """Load a specific API version's documentation."""
    spec = load_openapi_spec(spec_path)
    api_versions[version_label] = {
        "spec": spec,
        "endpoints": parse_endpoints(spec),
        "title": spec.get("info", {}).get("title", "API"),
        "version": spec.get("info", {}).get("version"),
    }
    return f"Loaded {version_label}: {api_versions[version_label]['title']} v{api_versions[version_label]['version']}"

@mcp.tool()
async def list_versions() -> list[dict]:
    """List all loaded API versions."""
    return [
        {"label": label, "api_version": data["version"], "title": data["title"]}
        for label, data in api_versions.items()
    ]

@mcp.tool()
async def search_endpoints_by_version(query: str, version_label: str = "current") -> list[dict]:
    """Search endpoints in a specific API version."""
    if version_label not in api_versions:
        return [{"error": f"Version '{version_label}' not loaded."}]
    endpoints = api_versions[version_label]["endpoints"]
    query_lower = query.lower()
    return [
        {"path": e.path, "method": e.method, "summary": e.summary}
        for e in endpoints
        if query_lower in e.path.lower() or query_lower in e.summary.lower()
    ]
```

Load both versions at startup and AI assistants can generate code targeting either, or compare endpoints across versions to identify breaking changes.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to create model context protocol server that serves api?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Is this approach secure enough for production?

The patterns shown here follow standard practices, but production deployments need additional hardening. Add rate limiting, input validation, proper secret management, and monitoring before going live. Consider a security review if your application handles sensitive user data.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

Related Articles

- [How to Build a Model Context Protocol Server That Serves](/how-to-build-model-context-protocol-server-that-serves-opena/)
- [How to Build Model Context Protocol Server for Internal Desi](/how-to-build-model-context-protocol-server-for-internal-desi/)
- [How to Build Model Context Protocol Server That Provides](/how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/)
- [How to Build a Model Context Protocol Server That](/how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/)
- [How to Build Model Context Protocol Server That Provides Rea](/how-to-build-model-context-protocol-server-that-provides-rea/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
