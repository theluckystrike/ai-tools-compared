---
layout: default
title: "How to Create Model Context Protocol Server That Serves."
description: "Learn to build a Model Context Protocol server that exposes your API documentation to AI assistants, enabling accurate code generation and intelligent."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-create-model-context-protocol-server-that-serves-api-/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

## Introduction



As AI coding assistants become more sophisticated, they need better access to your API documentation to generate accurate code and provide intelligent responses. The Model Context Protocol (MCP) provides a standardized way for AI tools to interact with external services and data sources. By creating an MCP server that serves your API documentation, you enable AI assistants to understand your API's structure, endpoints, authentication requirements, and response formats without manual context injection.



This guide walks through building an MCP server in Python that exposes your API documentation to AI tools. You'll learn how to structure your server, parse documentation formats, and expose tools that AI assistants can query dynamically.



## Prerequisites



Before building your MCP documentation server, ensure you have:



- Python 3.10 or higher installed

- An API with documentation (OpenAPI/Swagger, Postman collection, or custom format)

- Basic familiarity with FastMCP or similar MCP frameworks



## Setting Up Your Project



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
├── main.py
├── docs/
│   └── openapi.yaml
└── requirements.txt
```


## Creating the MCP Server



The core of your documentation server involves parsing your API documentation and exposing it through MCP tools. Here's a complete implementation using FastMCP:



```python
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional, List
import yaml
import httpx

mcp = FastMCP("API Documentation Server")

# Store parsed documentation in memory
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


## Creating Sample Documentation



Create a sample OpenAPI specification to test your server:



```yaml
# docs/openapi.yaml
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


## Running and Testing the Server



Start your MCP server:



```bash
python main.py
```


The server will start and listen for connections from AI tools. To test it, you can use an MCP-compatible client or manually invoke the tools:



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


## Integrating with AI Tools



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



## Advanced Features



To enhance your documentation server further, consider adding these capabilities:



Response Examples: Extract and expose example responses from your OpenAPI spec so AI tools can understand data structures.



Authentication Documentation: Parse security schemes and expose authentication requirements clearly.



Rate Limiting Info: Include rate limit headers and retry-after values in endpoint documentation.



Version Comparison: Support multiple API versions and allow querying differences between versions.



## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
