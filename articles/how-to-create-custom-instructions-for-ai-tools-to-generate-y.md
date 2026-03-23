---
layout: default
title: "How to Create Custom Instructions for AI Tools to Generate"
description: "A practical guide for developers and power users on configuring AI coding assistants to produce consistent, structured log output that matches your project's"
date: 2026-03-16
last_modified_at: 2026-03-22
author: theluckystrike
permalink: /how-to-create-custom-instructions-for-ai-tools-to-generate-y/
categories: [guides]
tags: [ai-tools-compared, tools, ai, configuration, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


{% raw %}

Log format consistency matters more than most developers realize. When every team member follows the same pattern, debugging becomes faster, log aggregation tools work better, and incident response improves significantly. AI coding assistants can enforce these standards automatically—but only when you teach them what you want.


This guide shows you how to configure custom instructions for GitHub Copilot, Cursor, and other AI tools to generate log statements that match your preferred format.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Understand Custom Instructions


Custom instructions are persistent preferences that AI tools reference when generating code. Unlike one-off prompts, these instructions apply across sessions and projects. Most modern AI coding assistants support this feature through configuration files, workspace settings, or dedicated instruction fields.


The key is specificity. A vague instruction like "use good logging" produces inconsistent results. A detailed instruction like "always use structured JSON logging with timestamp, level, message, and context fields" gives the AI clear boundaries to work within.


### Step 2: Set Up Custom Instructions in GitHub Copilot


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


### Step 3: Configure Cursor for Structured Logging


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


### Step 4: Create a Reusable Instruction Template


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

 error: error? { message: error.message, stack: error.stack }: undefined,

...meta

 }));

 }

};

```

### Step 5: Test Your Custom Instructions

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

### Step 6: Comparing AI Tools for Custom Instruction Support

Different AI coding assistants handle custom instructions with varying degrees of flexibility and persistence. Understanding these differences helps you choose the right tool and configure it correctly.

| Tool | Instruction Method | Scope | Persistence |
|------|-------------------|-------|-------------|
| GitHub Copilot | `.github/copilot-instructions.md` | Repository | Per-repo, version controlled |
| Cursor | `.cursor/rules` or UI settings | Workspace | Per-workspace |
| Windsurf | `.windsurfrules` file | Repository | Per-repo |
| Claude (via API) | System prompt | Per-session | Requires explicit injection |
| ChatGPT | Custom instructions in settings | Account-wide | Global default |

The file-based approaches used by Copilot and Cursor have a major advantage: your instruction configuration lives in version control. When a new team member clones the repository, they automatically inherit the team's AI configuration standards without any manual setup.

Claude's API-based approach is more flexible for programmatic use cases—you can inject different system prompts depending on context, such as using stricter logging rules in production code generation versus a more relaxed format in prototyping contexts.

### Step 7: Step-by-Step Workflow for Setting Up a Team Logging Standard

Here is a concrete workflow for rolling out custom instruction-based logging standards across a team.

**Step 1: Define your log schema.** Start with a simple JSON schema document that specifies every field, its type, and its purpose. Keep this schema in your project wiki so it can be referenced independently of any AI tool configuration.

**Step 2: Write example log lines.** Write three to five realistic example log entries that conform to your schema. Include edge cases like errors with stack traces, logs with nested context objects, and minimal logs with no optional fields.

**Step 3: Draft the instruction file.** Translate your schema and examples into the instruction format for your chosen AI tool. Lead with the most important rules. Put the most common case first, then handle edge cases. Avoid negatives where possible—"use JSON format" is clearer than "do not use plain text format."

**Step 4: Test with representative prompts.** Ask your AI assistant to write a function for each of the following: an API endpoint handler, a background job, and an error handler. Check whether the generated logging matches your schema in all three cases.

**Step 5: Iterate and commit.** Refine the instructions based on what you observe. Commit the final instruction file to version control. Add a note in your onboarding documentation explaining that this file controls AI logging behavior.

### Step 8: Pro Tips for Better AI Logging Instructions

**Anchor your instructions with a named formatter.** Instead of describing the format in prose, provide a concrete implementation of a logging formatter class and instruct the AI to use it by name. This reduces ambiguity dramatically.

**Include what NOT to do.** Even though positive instructions are generally clearer, log formatting has common antipatterns worth calling out explicitly: no `print()` in production, no string interpolation that concatenates sensitive values into log messages, no logging inside tight loops without rate limiting.

**Separate concerns.** Write one set of instructions for log format and a separate set for log placement (when to log). Mixing the two leads to instructions that are hard to update.

**Version your instructions.** Add a comment at the top of your instruction file with a version number. When you update the format, increment the version. This makes it easy to identify which version of the standard generated a given piece of code.

```markdown
# Logging Standards v2.1
# Updated: 2026-03-01 — Added request_id to all log context objects
```

**Test against your log aggregation tool.** If you use Datadog, Splunk, or a similar platform, paste a sample log line from AI-generated code directly into the query interface and verify it parses correctly before rolling out the instructions to your full team.

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Frequently Asked Questions

**Do custom instructions slow down code generation?**
Not meaningfully. The instruction file is small and loaded once per session. Inference latency is dominated by response generation, not instruction loading.

**What happens when the AI ignores my instructions?**
This usually means the instructions are ambiguous or conflicting. Try adding a concrete example that matches your format exactly. If the AI generates a log line that looks almost right but not quite, paste that incorrect line into the instructions as a "do not do this" example.

**Can I use different logging instructions for different parts of a monorepo?**
Yes. Both Copilot and Cursor support multiple instruction files. Place a more specific instruction file in a subdirectory to override the root-level rules for that portion of the codebase.

**Should the instruction file include the full formatter implementation?**
It helps to include at least a skeleton implementation. The AI will anchor to your exact class and method names, which produces more consistent results than describing the behavior in natural language alone.

**How often should I update the instructions?**
Review them whenever your log aggregation configuration changes, when you adopt a new observability tool, or when team members report that AI-generated logging is inconsistent with the expected format. Quarterly reviews are a reasonable default for stable projects.

### Step 9: Maintaining Your Instructions

Review and update your custom instructions periodically. As your project evolves, logging requirements change. Keep instructions in version control so changes are tracked and can be rolled back if needed.

Document the reasoning behind your format choices. This helps team members understand why the AI generates certain output and makes it easier to propose improvements.
---

Custom instructions transform AI assistants from generic code generators into domain-specific tools that understand your project's conventions. By investing time in proper configuration, you achieve consistent, structured logging without repetitive manual corrections.

## Related Articles

- [How to Create Custom Instructions for AI Coding Tools That E](/how-to-create-custom-instructions-for-ai-coding-tools-that-e/)
- [ChatGPT Custom GPT Not Following Instructions](/chatgpt-custom-gpt-not-following-instructions/)
- [How to Set Up Custom Instructions for AI Tools to Match Your](/how-to-set-up-custom-instructions-for-ai-tools-to-match-your/)
- [How to Write ChatGPT Custom Instructions](/how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/)
- [How to Write Custom Instructions for AI That Follow Your](/how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/)

```

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
