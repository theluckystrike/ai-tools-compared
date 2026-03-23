---
layout: default
title: "How to Set Up Model Context Protocol Server for Custom"
description: "A practical guide to building an MCP server that serves your project documentation to AI coding tools. Step-by-step implementation with code examples"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-set-up-model-context-protocol-server-for-custom-proje/
categories: [guides]
tags: [ai-tools-compared, mcp, documentation, ai-tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---

{% raw %}

Setting up a Model Context Protocol server for your custom project documentation transforms how AI coding assistants understand and interact with your codebase. When your AI tool can access your internal docs, architecture decisions, and API specifications directly through MCP, you get more accurate suggestions that align with your project's conventions.

This guide walks you through building a MCP server that serves your documentation to Claude, Cursor, and other compatible AI tools.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Initialize Your MCP Server Project](#step-1-initialize-your-mcp-server-project)
- [Step 2: Structure Your Documentation](#step-2-structure-your-documentation)
- [Step 3: Build the MCP Server](#step-3-build-the-mcp-server)
- [Step 4: Configure Your AI Tool](#step-4-configure-your-ai-tool)
- [Step 5: Test Your Implementation](#step-5-test-your-implementation)
- [Using Your Documentation Server](#using-your-documentation-server)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- Node.js 18 or higher installed

- A project with documentation you want to expose

- An AI coding tool that supports MCP (Claude Desktop, Cursor, or Windsurf)

- Basic familiarity with TypeScript or JavaScript

## Step 1: Initialize Your MCP Server Project

Create a new directory for your MCP server and initialize it with the necessary dependencies:

```bash
mkdir myproject-mcp-server
cd myproject-mcp-server
npm init -y
npm install @modelcontextprotocol/server-sdk @types/node typescript
```

Create a TypeScript configuration file:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

## Step 2: Structure Your Documentation

Organize your project documentation in a way that MCP can easily parse. A clean structure helps your server deliver relevant information to AI tools:

```
myproject/
├── docs/
│   ├── architecture/
│   │   └── system-design.md
│   ├── api/
│   │   └── endpoints.md
│   ├── setup/
│   │   └── local-development.md
│   └── conventions/
│       └── coding-standards.md
```

Each document should have clear headings and practical content that an AI assistant can reference when generating code or answering questions.

## Step 3: Build the MCP Server

Create your server implementation in `src/index.ts`. This server will read your documentation files and expose them through MCP tools:

```typescript
import { Server } from '@modelcontextprotocol/server-sdk';
import { StdioServerTransport } from '@modelcontextprotocol/server-sdk/stdio';
import * as fs from 'fs';
import * as path from 'path';

interface DocFile {
  path: string;
  content: string;
  category: string;
}

function loadDocumentation(docsDir: string): DocFile[] {
  const docs: DocFile[] = [];

  function walkDir(dir: string, category: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath, file);
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        docs.push({
          path: fullPath.replace(docsDir, '').replace('.md', ''),
          content,
          category
        });
      }
    }
  }

  walkDir(docsDir, 'general');
  return docs;
}

const docsDir = path.join(process.cwd(), 'docs');
const documentation = loadDocumentation(docsDir);

const server = new Server(
  {
    name: 'project-docs-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'search_docs',
        description: 'Search through project documentation by keyword or topic',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for documentation'
            },
            category: {
              type: 'string',
              description: 'Optional category to filter results',
              enum: ['architecture', 'api', 'setup', 'conventions', 'general']
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_doc',
        description: 'Retrieve a specific documentation file by path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Documentation path (e.g., /api/endpoints)'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'list_docs',
        description: 'List all available documentation with summaries',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'search_docs') {
    const query = args.query.toLowerCase();
    const results = documentation.filter(doc =>
      doc.content.toLowerCase().includes(query) ||
      doc.path.toLowerCase().includes(query)
    );

    if (args.category) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(
            results.filter(d => d.category === args.category).map(d => ({
              path: d.path,
              category: d.category,
              preview: d.content.substring(0, 200)
            })),
            null,
            2
          )
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(
          results.map(d => ({
            path: d.path,
            category: d.category,
            preview: d.content.substring(0, 200)
          })),
          null,
          2
        )
      }]
    };
  }

  if (name === 'get_doc') {
    const doc = documentation.find(d => d.path === args.path);

    if (!doc) {
      return {
        content: [{
          type: 'text',
          text: `Document not found: ${args.path}`
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: doc.content
      }]
    };
  }

  if (name === 'list_docs') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(
          documentation.map(d => ({
            path: d.path,
            category: d.category,
            title: d.content.match(/^#\s+(.+)$/m)?.[1] || 'Untitled'
          })),
          null,
          2
        )
      }]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Project documentation MCP server running');
}

main().catch(console.error);
```

## Step 4: Configure Your AI Tool

Each AI tool has its own method for adding MCP servers. For Claude Desktop, create or edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "project-docs": {
      "command": "node",
      "args": ["/path/to/your/myproject-mcp-server/dist/index.js"],
      "env": {
        "DOCS_DIR": "/path/to/your/project/docs"
      }
    }
  }
}
```

For Cursor, add the server configuration in Settings → MCP Servers:

```json
{
  "mcpServers": {
    "project-docs": {
      "command": "node",
      "args": ["C:\\path\\to\\your\\myproject-mcp-server\\dist\\index.js"]
    }
  }
}
```

## Step 5: Test Your Implementation

Build and test your server:

```bash
npm run build
node dist/index.js
```

Verify the server is working by checking if your AI tool can access the documentation tools. In Claude, you should see three new tools available: `search_docs`, `get_doc`, and `list_docs`.

## Using Your Documentation Server

Once configured, your AI coding assistant can now reference your project documentation. Here are practical examples:

**Asking about architecture:**

> "How is authentication handled in this project?"

The AI will search your docs for authentication-related content and provide accurate guidance based on your actual implementation.

**Getting setup instructions:**

> "What are the steps to set up local development?"

The AI retrieves your setup documentation and provides precise instructions.

**Finding API conventions:**

> "What format should I use for API response errors?"

Your conventions document gets searched and relevant details are extracted.

## Best Practices

Keep your documentation server effective by following these practices:

**Update documentation regularly.** Your MCP server serves static content, so rebuild and restart when docs change.

**Use clear, scannable headings.** AI tools parse markdown headings to understand document structure quickly.

**Include code examples.** Practical examples help AI tools generate more accurate code that matches your patterns.

**Add troubleshooting sections.** Common issues and solutions in your docs help AI assistants diagnose problems faster.

## Troubleshooting

If your server isn't connecting, verify the path to your compiled JavaScript is correct. Check that your documentation directory exists and contains markdown files. For permission issues, ensure Node has read access to your docs directory.

Some AI tools require a restart after adding MCP server configuration. Close and reopen the application to load the new server.

## Frequently Asked Questions

**How long does it take to set up model context protocol server for custom?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Can I adapt this for a different tech stack?**

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

## Related Articles

- [How to Create Model Context Protocol Server That Serves API](/how-to-create-model-context-protocol-server-that-serves-api-/)
- [How to Build Model Context Protocol Server That Provides Rea](/how-to-build-model-context-protocol-server-that-provides-rea/)
- [How to Build a Model Context Protocol Server That Serves](/how-to-build-model-context-protocol-server-that-serves-opena/)
- [How to Build Model Context Protocol Server for Internal](/how-to-build-model-context-protocol-server-for-internal-desi/)
- [How to Set Up Model Context Protocol Server for Internal](/how-to-set-up-model-context-protocol-server-for-internal-pac/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
