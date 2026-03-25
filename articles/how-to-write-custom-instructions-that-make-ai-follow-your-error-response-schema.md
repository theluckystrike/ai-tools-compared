---
layout: default
title: "How to Write Custom Instructions That Make AI Follow Your"
description: "Learn how to write effective custom instructions for AI coding assistants to generate consistent, structured error responses that match your project's API"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-write-custom-instructions-that-make-ai-follow-your-error-response-schema/
categories: [guides]
tags: [ai-tools-compared, tools, troubleshooting, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


Write custom instructions for AI coding tools by defining your error response schema (success flag, nested error object with code/message/details, timestamp, requestId) and requiring the AI to implement exactly this structure in all generated error handling code. Custom instructions ensure consistent API error responses across generated code without requiring repeated schema specification in each prompt.

This guide shows you practical techniques for writing custom instructions that ensure AI-generated error handling code always follows your error response schema.

Table of Contents

- [Prerequisites](#prerequisites)
- [Why AI Deviates From Your Schema Without Instructions](#why-ai-deviates-from-your-schema-without-instructions)
- [Tool-by-Tool Configuration Comparison](#tool-by-tool-configuration-comparison)
- [Advanced - TypeScript Type-Driven Instructions](#advanced-typescript-type-driven-instructions)
- [Troubleshooting](#troubleshooting)

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - Understand Error Response Schemas

Before writing custom instructions, you need a clearly defined error response schema. Most modern APIs use a standardized format like this:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2026-03-16T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

This schema includes a success flag, nested error object with code, message, details array, timestamp, and request ID. Your custom instructions must communicate this structure clearly.

Why AI Deviates From Your Schema Without Instructions

AI coding assistants learn from millions of codebases and naturally produce the patterns they have seen most frequently. GPT-4 and Claude have ingested thousands of Express.js, FastAPI, and Django projects, each with different error response conventions. Without explicit guidance, the model picks the structure that statistically fits the surrounding code, which may be RFC 7807 Problem Details, a flat `{ error: "message" }` object, or any number of other patterns.

The result is drift - the first endpoint your AI generates returns `{ success, error: { code, message } }`, the second returns `{ status: "error", message: "..." }`, and the third returns `{ errors: [...] }`. Consumers of your API now need branching logic to handle every variant. Custom instructions lock the AI into a single canonical structure before it writes a single line.

Step 2 - Writing Effective Custom Instructions

Specify the Exact Schema Structure

The most important rule is being explicit about your error response structure. Instead of saying "use proper error formatting," specify every field:

```
When generating error responses, always use this exact structure:

{
  "success": boolean,
  "error": {
    "code": string (uppercase with underscores, e.g., "VALIDATION_ERROR"),
    "message": string (human-readable description),
    "details": array of { field: string, message: string } (optional),
    "timestamp": string (ISO 8601 format),
    "requestId": string (prefixed with "req_")
  }
}
```

This level of detail prevents AI from inventing fields or using different structures across endpoints.

Define Error Code Conventions

Your custom instructions should specify how error codes are formatted and what codes are available. Create a clear mapping:

```
Error codes must use UPPERCASE_WITH_UNDERSCORES format. Use these codes:
- VALIDATION_ERROR: Request validation failed
- AUTHENTICATION_ERROR: Invalid or missing authentication
- AUTHORIZATION_ERROR: Insufficient permissions
- NOT_FOUND: Resource does not exist
- RATE_LIMIT_ERROR: Too many requests
- INTERNAL_ERROR: Unexpected server error
- EXTERNAL_SERVICE_ERROR: Third-party service unavailable
```

With this guidance, AI generates consistent error codes instead of variations like "validation-error," "invalid_input," or "bad_request."

Include Code Generation Examples

Concrete examples are more effective than abstract rules. Provide a complete example of error handling in your target language:

```javascript
// For Express.js applications, use this pattern:
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details || undefined,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || `req_${crypto.randomUUID()}`
      }
    });
  }
  // Handle other error types similarly
});
```

Place this example in your custom instructions to show the AI exactly how error handling should look in your codebase.

Specify HTTP Status Code Mappings

Error response schemas often pair with specific HTTP status codes. Make these mappings explicit:

```
Map error codes to HTTP status codes:
- VALIDATION_ERROR -> 400
- AUTHENTICATION_ERROR -> 401
- AUTHORIZATION_ERROR -> 403
- NOT_FOUND -> 404
- RATE_LIMIT_ERROR -> 429
- INTERNAL_ERROR -> 500
- EXTERNAL_SERVICE_ERROR -> 502
```

This ensures AI generates both the correct response body and the appropriate status code.

Step 3 - Practical Implementation

For Cursor and Cline Users

Add custom instructions to your `.cursorrules` or project-specific rules file:

```
Step 4 - Error Handling

All error responses must follow our API error schema defined in docs/error-schema.md.

When throwing errors in TypeScript:
1. Use custom error classes extending Error
2. Include error code, message, and validation details
3. Use the ErrorResponseBuilder utility from lib/errors

throw new ValidationError('Email validation failed', {
  field: 'email',
  details: ['Invalid email format']
});
```

For Claude Code Users

Create a `CLAUDE.md` file in your project root with error handling instructions:

```
Error Response Requirements

All API error responses must conform to the schema in ./schemas/error-response.json.

Use the ErrorFormatter class for consistent error generation:
import { ErrorFormatter } from './lib/errors';

throw ErrorFormatter.validation('Invalid input', {
  fields: { email: 'Must be valid email' }
});
```

For GitHub Copilot Users

Add inline instructions or create a `.github/copilot-instructions.md` file:

```
Error Response Format

Always generate error responses matching our standard format:
- success: false
- error.code: UPPERCASE_WITH_UNDERSCORES
- error.message: human-readable string
- error.details: array of {field, message} objects when applicable
- error.timestamp: new Date().toISOString()
- error.requestId: generate or use incoming request ID
```

Tool-by-Tool Configuration Comparison

Different AI tools vary in how persistently they honor custom instructions. Understanding these differences helps you calibrate how detailed your instructions need to be:

| Tool | Config Mechanism | Instruction Persistence | Schema Adherence |
|---|---|---|---|
| Cursor | `.cursorrules` | Per-project, always active | High with examples |
| Claude Code | `CLAUDE.md` | Per-project, always active | High with examples |
| GitHub Copilot | `copilot-instructions.md` | Per-repo | Moderate |
| ChatGPT | Custom Instructions (account) | Account-wide | Moderate |
| Cline | `.clinerules` | Per-project | High with examples |
| Windsurf | `.windsurfrules` | Per-project | High with examples |

Tools that read project-level config files on every request (Cursor, Claude Code, Cline) provide more consistent adherence than tools that rely on account-level settings or inline prompting. For critical schema enforcement, project-level config files are the most reliable mechanism.

Advanced - TypeScript Type-Driven Instructions

If your project uses TypeScript, embedding your type definitions directly into the custom instructions is the most precise way to communicate your schema. AI models parse TypeScript interface definitions accurately and generate code that satisfies the type contracts:

```typescript
// Include this in your CLAUDE.md or .cursorrules:

interface ApiError {
  code: ErrorCode;
  message: string;
  details?: ValidationDetail[];
  timestamp: string;  // ISO 8601
  requestId: string;  // "req_" prefix required
}

interface ValidationDetail {
  field: string;
  message: string;
}

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_SERVICE_ERROR';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
```

With these type definitions in your custom instructions, the AI will generate code that satisfies the type checker automatically, no runtime surprises.

Step 5 - Test Your Custom Instructions

After adding custom instructions, verify they work by asking AI to generate error handling code. Check for:

1. Consistent structure: All fields present in the correct hierarchy

2. Correct field types: Codes are strings, timestamps are ISO dates, etc.

3. Proper status codes: Matching HTTP codes for each error type

4. Use of utilities: Using your existing error handling functions

A useful verification workflow is to ask the AI to generate error handling for three different endpoint types in a single session: a validation-heavy POST endpoint, a resource-fetching GET endpoint, and an authenticated-only DELETE endpoint. Diffing the error response shapes across all three will reveal any inconsistencies in how your instructions are being interpreted.

If the AI deviates from your schema, refine your instructions with more specific examples or constraints.

Step 6 - Common Pitfalls to Avoid

Being too vague - Instructions like "use good error handling" leave too much room for interpretation. Be specific about every field and format.

Missing edge cases - If your schema handles partial failures differently from complete failures, explain both scenarios in your instructions.

Forgetting validation details - Many APIs include field-level validation errors. Specify whether this is an array of objects or a flat object.

Ignoring language differences - Error handling patterns differ between languages. Provide examples for each language you use.

Omitting the "why" - AI models follow instructions more reliably when the instructions include brief rationale. Adding "so that API consumers can parse errors without branching logic" after your schema definition improves adherence, the model treats the instruction as a meaningful constraint rather than an arbitrary rule.

Not versioning your instructions: Store your `.cursorrules`, `CLAUDE.md`, and related files in version control. When your schema evolves, update the instructions at the same time. Drift between your actual schema and your AI instructions is a common source of inconsistent code in growing codebases.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to write custom instructions that make ai follow your?

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

- [How to Write Custom Instructions for AI That Follow Your](/how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/)
- [How to Write ChatGPT Custom Instructions](/how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/)
- [How to Write Custom Instructions That Make AI Respect Your](/how-to-write-custom-instructions-that-make-ai-respect-your-api-rate-limit-patterns/)
- [How to Set Up Custom Instructions for AI Tools to Match](/how-to-set-up-custom-instructions-for-ai-tools-to-match-your/)
- [How to Create Custom Instructions for AI Coding Tools That](/how-to-create-custom-instructions-for-ai-coding-tools-that-e/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
