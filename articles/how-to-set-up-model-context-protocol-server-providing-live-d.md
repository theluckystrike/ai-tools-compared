---
layout: default
title: "How to Set Up Model Context Protocol Server Providing Live"
description: "A practical guide for developers setting up a Model Context Protocol server to feed live database schema information to AI assistants for smarter code"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-set-up-model-context-protocol-server-providing-live-d/
categories: [guides]
tags: [ai-tools-compared, tools, mcp, database, ai]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

## Introduction



When you're building applications that interact with databases, AI coding assistants often struggle to generate accurate code because they lack visibility into your actual database structure. The Model Context Protocol (MCP) solves this problem by enabling your AI tools to query live database schema information directly. This guide walks you through setting up an MCP server that exposes your database schema to AI assistants like Claude, Cursor, or other MCP-compatible tools.



The Model Context Protocol is an open standard that allows AI systems to connect to external data sources and tools. By running an MCP server for your database, you give AI assistants the ability to ask questions about your tables, columns, relationships, and indexes in real-time.



## Prerequisites



Before setting up your MCP server, ensure you have Python 3.10 or later installed. You'll also need access to a database—PostgreSQL, MySQL, SQLite, or any other database supported by SQLAlchemy. This guide uses Python with FastMCP, which provides a straightforward way to create MCP servers.



Install the required dependencies:



```bash
uv venv
uv pip install fastmcp sqlalchemy pydantic
```


Create a new directory for your project and initialize it:



```bash
mkdir db-mcp-server && cd db-mcp-server
uv init
```


## Building the MCP Server



Create a file named `server.py` in your project directory. This server will connect to your database and expose schema information through MCP tools.



```python
from fastmcp import FastMCP
from sqlalchemy import create_engine, inspect
from typing import List, Dict, Any

# Initialize FastMCP server
mcp = FastMCP("Database Schema Server")

# Database connection string
DATABASE_URL = "postgresql://user:password@localhost:5432/mydb"

def get_db_inspector():
    """Create a database inspector for schema queries."""
    engine = create_engine(DATABASE_URL)
    return inspect(engine)

@mcp.tool()
def get_tables() -> List[str]:
    """Get all table names in the database."""
    inspector = get_db_inspector()
    return inspector.get_table_names()

@mcp.tool()
def get_table_schema(table_name: str) -> Dict[str, Any]:
    """Get complete schema for a specific table."""
    inspector = get_db_inspector()
    
    columns = inspector.get_columns(table_name)
    primary_keys = inspector.get_pk_constraint(table_name)
    foreign_keys = inspector.get_foreign_keys(table_name)
    indexes = inspector.get_indexes(table_name)
    
    return {
        "table_name": table_name,
        "columns": columns,
        "primary_key": primary_keys,
        "foreign_keys": foreign_keys,
        "indexes": indexes
    }

@mcp.tool()
def get_all_schemas() -> Dict[str, Any]:
    """Get schema information for all tables."""
    inspector = get_db_inspector()
    tables = inspector.get_table_names()
    
    schemas = {}
    for table in tables:
        schemas[table] = inspector.get_columns(table_name)
    
    return schemas

if __name__ == "__main__":
    mcp.run(transport="stdio")
```


This server exposes three tools: `get_tables` lists all available tables, `get_table_schema` returns detailed information about a specific table including columns, keys, and indexes, and `get_all_schemas` provides an overview of your entire database structure.



## Configuring the MCP Server



To connect your AI assistant to this server, you need to configure the MCP client. The configuration varies depending on your AI tool, but most support a `mcp.json` configuration file.



Create a file named `mcp.json` in your project:



```json
{
  "mcpServers": {
    "db-schema": {
      "command": "python",
      "args": ["/path/to/your/db-mcp-server/server.py"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/mydb"
      }
    }
  }
}
```


The exact location for this configuration file depends on your AI assistant. For Claude Desktop, place it in `~/Library/Application Support/Claude/mcp.json`. For Cursor, check the settings under the MCP configuration section.



## Using the Server with AI Assistants



Once configured, your AI assistant can now query your database schema directly. Here's how this works in practice:



**Asking about table structure:**

> "What columns does the users table have?"



The AI will call `get_table_schema("users")` and receive detailed column information including names, types, nullable status, and default values.



**Finding relationships:**

> "What foreign keys exist in the orders table?"



The AI uses the `get_table_schema` tool to retrieve foreign key constraints and explain how tables relate to each other.



**Generating accurate queries:**

> "Write a SQL query to find all orders placed by users who signed up in the last 30 days."



The AI now understands both the `users` and `orders` table structures, enabling it to write accurate JOIN queries with correct column references.



## Adding Dynamic Schema Updates



For development environments where the database schema changes frequently, you might want the schema information to stay current. Modify the server to support on-demand schema refreshing:



```python
from functools import lru_cache

@mcp.tool()
def refresh_schema() -> str:
    """Clear cached schema to force refresh on next query."""
    get_db_inspector.cache_clear()
    return "Schema cache cleared"
```


Add the `@lru_cache` decorator to the `get_db_inspector` function to enable caching, then provide a tool to clear it when schema changes occur.



## Security Considerations



When exposing database schema through MCP, follow these security practices:



**Restrict database credentials:** Use a read-only database user that can only query the information schema. Create a dedicated user for MCP access:



```sql
CREATE USER mcp_reader WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE mydb TO mcp_reader;
GRANT USAGE ON SCHEMA public TO mcp_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_reader;
```


**Limit network exposure:** Run the MCP server locally and avoid exposing it to untrusted networks. The stdio transport keeps all communication local to your machine.



**Validate table names:** If your server accepts table names as parameters, validate them against the list of actual tables to prevent SQL injection through tool parameters.



## Extending the Server



Once the basic schema server is working, consider adding these capabilities:



- Query execution tool for running SELECT statements and returning results

- Sample data generation based on table structures

- Documentation generation from schema comments

- Relationship visualization data



The MCP architecture makes it easy to add new tools as your needs evolve.







## Related Reading

- [How to Set Up Model Context Protocol Server for Custom Proje](/ai-tools-compared/how-to-set-up-model-context-protocol-server-for-custom-proje/)
- [How to Set Up Model Context Protocol Server for Internal Pac](/ai-tools-compared/how-to-set-up-model-context-protocol-server-for-internal-pac/)
- [How to Set Up Model Context Protocol for Feeding Jira Ticket](/ai-tools-compared/how-to-set-up-model-context-protocol-for-feeding-jira-ticket/)
- [How to Set Up Model Context Protocol for Feeding Monitoring](/ai-tools-compared/how-to-set-up-model-context-protocol-for-feeding-monitoring-/)
- [How to Set Up Model Context Protocol with Local Database](/ai-tools-compared/how-to-set-up-model-context-protocol-with-local-database-schema-information-2026/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
