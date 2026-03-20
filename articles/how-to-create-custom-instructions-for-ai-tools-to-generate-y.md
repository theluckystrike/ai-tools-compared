---
layout: default
title: "How to Create Custom Instructions for AI Tools to."
description: "A practical guide for developers and power users on configuring AI coding assistants to produce consistent, structured log output that matches your project's standards."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-create-custom-instructions-for-ai-tools-to-generate-y/
categories: [guides]
tags: [tools, ai, configuration]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---

{% raw %}
# How to Create Custom Instructions for AI Tools to Generate Your Preferred Log Format

Log format consistency matters more than most developers realize. When every team member follows the same pattern, debugging becomes faster, log aggregation tools work better, and incident response improves significantly. AI coding assistants can enforce these standards automatically—but only when you teach them what you want.

This guide shows you how to configure custom instructions for GitHub Copilot, Cursor, and other AI tools to generate log statements that match your preferred format.

## Understanding Custom Instructions

Custom instructions are persistent preferences that AI tools reference when generating code. Unlike one-off prompts, these instructions apply across sessions and projects. Most modern AI coding assistants support this feature through configuration files, workspace settings, or dedicated instruction fields.

The key is specificity. A vague instruction like "use good logging" produces inconsistent results. A detailed instruction like "always use structured JSON logging with timestamp, level, message, and context fields" gives the AI clear boundaries to work within.

## Setting Up Custom Instructions in GitHub Copilot

GitHub Copilot accepts custom instructions through `.github/copilot-instructions.md` or directly in your IDE settings. Create a file called `.github/copilot-instructions.md` in your repository root:

```markdown
# Logging Standards

All log statements must use this JSON structure:
{
  "timestamp": "ISO8601 format",
  "level": "DEBUG|INFO|WARN|ERROR|FATAL",
  "message": "string describing the event",
  "context": {
    "function": "function name",
    "request_id": "correlation ID when available"
  }
}

Use Python's logging module with JSONFormatter. Never use print() statements for production code.
```

When you write code in this repository, Copilot reads these instructions and generates log statements matching your specification. The AI understands the pattern and applies it consistently throughout your codebase.

## Configuring Cursor for Structured Logging

Cursor, built on VS Code, offers a similar feature through its workspace instructions. Open `.cursor/rules` or add instructions through the settings UI:

```
For all logging statements:
- Use console.log with a structured object format
- Always include: timestamp (ISO8601), level, message, metadata
- Example: console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: 'User login successful',
    metadata: { userId: user.id, ip: req.ip }
  }))
- Avoid string concatenation in logs
- Use appropriate log levels: DEBUG for development, INFO for operations, WARN for recoverable issues, ERROR for failures
```

This approach works particularly well in TypeScript and JavaScript projects where you want machine-parseable log output for your logging infrastructure.

## Creating a Reusable Instruction Template

For teams managing multiple projects, a shared instruction template ensures consistency across repositories. Create a file like `docs/ai-instructions.md` that teams can copy:

```markdown
# AI Assistant Configuration

## Log Format Requirements

All logging must follow this structure:

### Python Projects
```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "context": {
                "function": record.funcName,
                "module": record.module,
                "line": record.lineno
            }
        }
        return json.dumps(log_data)
```

### JavaScript/TypeScript Projects
```typescript
const logger = {
  info: (message: string, meta: object = {}) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...meta
    }));
  },
  error: (message: string, error?: Error, meta: object = {}) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error ? { message: error.message, stack: error.stack } : undefined,
      ...meta
    }));
  }
};
```

## Testing Your Custom Instructions

After setting up custom instructions, verify they work by asking the AI to generate a simple function. For example:

> "Write a function that fetches user data from an API and logs the result"

The generated code should use your specified log format automatically. If it doesn't, refine your instructions with more specific examples or constraints.

Common issues include:
- **Ambiguous terminology**: "structured logging" means different things to different people
- **Missing context**: instructions should cover both format and when to log
- **Overly complex rules**: simpler instructions produce more consistent results

## Advanced: Conditional Logging Instructions

For sophisticated projects, you can create context-aware instructions that adapt based on environment:

```markdown
# Environment-Specific Logging

Development: Use console.log with colors and human-readable timestamps
Production: Use JSON format for log aggregation tools
Testing: Suppress all log output or use in-memory capture

Detect environment from NODE_ENV or DEBUG flag.
```

The AI applies these rules intelligently, switching between formats based on your project configuration.

## Maintaining Your Instructions

Review and update your custom instructions periodically. As your project evolves, logging requirements change. Keep instructions in version control so changes are tracked and can be rolled back if needed.

Document the reasoning behind your format choices. This helps team members understand why the AI generates certain output and makes it easier to propose improvements.

---

Custom instructions transform AI assistants from generic code generators into domain-specific tools that understand your project's conventions. By investing time in proper configuration, you achieve consistent, structured logging without repetitive manual corrections.


## Related Reading

- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
