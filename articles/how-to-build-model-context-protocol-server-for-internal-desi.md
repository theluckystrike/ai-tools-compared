---
layout: default
title: "How to Build Model Context Protocol Server for Internal Desi"
description: "A practical guide for developers on building an MCP server to serve design system component documentation to AI coding assistants. Includes code."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-build-model-context-protocol-server-for-internal-desi/
categories: [guides]
tags: [ai-tools-compared, tools, mcp, design-systems]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


Building a Model Context Protocol (MCP) server specifically for your internal design system component documentation transforms how AI coding assistants interact with your UI libraries. Instead of relying on vague descriptions or searching through outdated wikis, developers can query your design system directly through structured tools that return accurate, up-to-date component information.



This guide walks through creating a production-ready MCP server that exposes your design system components to any MCP-compatible AI client.



## Why Your Design System Needs an MCP Server



Design systems often suffer from discoverability problems. Components live in repositories, documentation gets stale, and developers spend valuable time hunting down prop definitions or usage examples. An MCP server solves this by providing a standardized interface where AI assistants can ask questions like "What props does the Button component accept?" or "Show me how to use the Modal component with custom footer actions."



The MCP protocol handles the heavy lifting: request routing, response formatting, and tool discovery. Your server focuses on one thing—translating component metadata into useful AI-readable responses.



## Project Setup and Dependencies



Create a new Python project for your MCP server. You'll need the FastMCP library, which simplifies server implementation:



```bash
mkdir design-system-mcp && cd design-system-mcp
python3 -m venv .venv
source .venv/bin/activate
pip install fastmcp pandas
```


Initialize your project structure:



```
design-system-mcp/
├── components/
│   └── registry.json
├── app.py
└── requirements.txt
```


## Building the Component Registry



First, establish how your server will access component metadata. For most design systems, a JSON registry works well. Create a `components/registry.json` that describes your components:



```json
{
  "Button": {
    "description": "Primary action button with support for variants, sizes, and icons",
    "props": {
      "variant": {
        "type": "enum",
        "values": ["primary", "secondary", "ghost", "danger"],
        "default": "primary"
      },
      "size": {
        "type": "enum", 
        "values": ["sm", "md", "lg"],
        "default": "md"
      },
      "disabled": {
        "type": "boolean",
        "default": false
      },
      "onClick": {
        "type": "function",
        "description": "Click handler function"
      },
      "children": {
        "type": "node",
        "description": "Button label or content"
      }
    },
    "usage": {
      "basic": "<Button>Click me</Button>",
      "withVariant": "<Button variant=\"danger\">Delete</Button>",
      "withIcon": "<Button icon={<Icon name=\"arrow\" />}>Next</Button>"
    }
  },
  "Modal": {
    "description": "Overlay dialog for user interactions",
    "props": {
      "isOpen": {
        "type": "boolean",
        "required": true
      },
      "onClose": {
        "type": "function",
        "required": true
      },
      "title": {
        "type": "string"
      },
      "children": {
        "type": "node"
      },
      "footer": {
        "type": "node",
        "description": "Custom footer content, defaults to Cancel/Confirm actions"
      }
    },
    "usage": {
      "basic": "<Modal isOpen={show} onClose={() => setShow(false)} title=\"Confirm\">\n  <p>Are you sure?</p>\n</Modal>"
    }
  }
}
```


This registry structure mirrors what TypeScript interfaces would expose, making it easy for AI models to understand component contracts.



## Implementing the MCP Server



Now create `app.py` with your server implementation:



```python
import json
from pathlib import Path
from fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("Design System Docs")

# Load component registry
def load_registry() -> dict:
    registry_path = Path(__file__).parent / "components" / "registry.json"
    with open(registry_path) as f:
        return json.load(f)

@mcp.tool()
def get_component(name: str) -> str:
    """Get detailed information about a specific design system component."""
    registry = load_registry()
    component = registry.get(name)
    
    if not component:
        available = ", ".join(registry.keys())
        return f"Component '{name}' not found. Available: {available}"
    
    # Format component info for AI consumption
    props_list = []
    for prop_name, prop_info in component.get("props", {}).items():
        prop_type = prop_info.get("type", "any")
        required = prop_info.get("required", False)
        values = prop_info.get("values", [])
        
        if values:
            props_list.append(f"  - {prop_name} ({'required' if required else 'optional'}): {prop_type} = {values}")
        else:
            props_list.append(f"  - {prop_name} ({'required' if required else 'optional'}): {prop_type}")
    
    usage_examples = component.get("usage", {})
    usage_text = "\n".join([f"// {k}\n{v}" for k, v in usage_examples.items()])
    
    return f"""# {name}

{component.get('description', 'No description')}

## Props
{chr(10).join(props_list) if props_list else '  No props defined'}

## Usage Examples
{usage_text}
"""

@mcp.tool()
def list_components(category: str = None) -> str:
    """List all available design system components, optionally filtered by category."""
    registry = load_registry()
    
    components = []
    for name, info in registry.items():
        if category and info.get("category") != category:
            continue
        components.append(f"- **{name}**: {info.get('description', 'No description')[:80]}...")
    
    return "Available components:\n" + "\n".join(components) if components else "No components found."

@mcp.tool()
def search_components(query: str) -> str:
    """Search for components by name or description keywords."""
    registry = load_registry()
    query_lower = query.lower()
    
    matches = []
    for name, info in registry.items():
        if query_lower in name.lower() or query_lower in info.get("description", "").lower():
            matches.append(f"- {name}: {info.get('description', '')}")
    
    return "Search results:\n" + "\n".join(matches) if matches else f"No components matching '{query}'"

if __name__ == "__main__":
    mcp.run()
```


## Connecting to Claude Code



With your server running, configure Claude Code to connect. The server runs as a subprocess that Claude communicates with via stdin/stdout:



```bash
# Run the server
python app.py
```


In your Claude Code configuration (typically `~/.claude/settings.json` or project-specific), add the server:



```json
{
  "mcpServers": {
    "design-system": {
      "command": "python",
      "args": ["/path/to/design-system-mcp/app.py"]
    }
  }
}
```


After restarting Claude Code, your AI assistant gains three new tools: `get_component` for detailed component info, `list_components` for enumerating available components, and `search_components` for finding components by keyword.



## Practical Usage Examples



Once connected, developers can have natural conversations about your design system:



**Finding component props:**

> "What props does the Modal component accept?"

> → Calls `get_component("Modal")` → Returns formatted props with types and required status



**Checking usage patterns:**

> "Show me how to use the Button component with an icon"

> → Calls `get_component("Button")` → Returns usage examples from registry



**Discovering components:**

> "What buttons are available in our design system?"

> → Calls `list_components()` → Returns all components with descriptions



## Extending the Server



Several enhancements make your MCP server more powerful:



**Dynamic loading from source:** Parse TypeScript/Flow prop types directly from your component source files using AST parsers rather than maintaining a separate registry.



**Version tracking:** Include version information so developers can query historical props or identify deprecated usage.



**Live documentation URLs:** Return links to live Storybook or documentation pages for components that have visual examples.



**Integration with package managers:** Query `node_modules` to verify installed versions and detect outdated usage patterns.



## Production Considerations



For enterprise deployments, add authentication to prevent unauthorized access to internal component information. The MCP protocol supports custom headers and authentication tokens that you can validate in each tool call.



Consider running the server as a local service that multiple team members can connect to, or deploy it internally with appropriate network controls. Rate limiting protects against abuse, and logging helps track which components developers query most frequently—valuable signal for documentation priorities.





## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [How to Set Up Model Context Protocol Server Providing.](/ai-tools-compared/how-to-set-up-model-context-protocol-server-providing-live-d/)
- [How to Set Up Model Context Protocol Server for Internal Package Registry Documentation](/ai-tools-compared/how-to-set-up-model-context-protocol-server-for-internal-pac/)
- [How to Build a Model Context Protocol Server That.](/ai-tools-compared/how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
