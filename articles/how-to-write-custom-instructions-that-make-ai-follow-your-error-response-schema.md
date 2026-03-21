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
score: 8
intent-checked: true
voice-checked: true
---
Write custom instructions for AI coding tools by defining your error response schema (success flag, nested error object with code/message/details, timestamp, requestId) and requiring the AI to implement exactly this structure in all generated error handling code. Custom instructions ensure consistent API error responses across generated code without requiring repeated schema specification in each prompt.


This guide shows you practical techniques for writing custom instructions that ensure AI-generated error handling code always follows your error response schema.


## Understanding Error Response Schemas


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


## Writing Effective Custom Instructions


### Specify the Exact Schema Structure


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


### Define Error Code Conventions


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


### Include Code Generation Examples


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


### Specify HTTP Status Code Mappings


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


## Practical Implementation


### For Cursor and Cline Users


Add custom instructions to your `.cursorrules` or project-specific rules file:


```
## Error Handling

All error responses must follow our API error schema defined in docs/error-schema.md.

When throwing errors in TypeScript:
1. Use custom error classes extending Error
2. Include error code, message, and validation details
3. Use the ErrorResponseBuilder utility from lib/errors

Example:
throw new ValidationError('Email validation failed', {
  field: 'email',
  details: ['Invalid email format']
});
```


### For Claude Code Users


Create a `CLAUDE.md` file in your project root with error handling instructions:


```
# Error Response Requirements

All API error responses must conform to the schema in ./schemas/error-response.json.

Use the ErrorFormatter class for consistent error generation:
import { ErrorFormatter } from './lib/errors';

throw ErrorFormatter.validation('Invalid input', {
  fields: { email: 'Must be valid email' }
});
```


### For GitHub Copilot Users


Add inline instructions or create a `.github/copilot-instructions.md` file:


```
# Error Response Format

Always generate error responses matching our standard format:
- success: false
- error.code: UPPERCASE_WITH_UNDERSCORES
- error.message: human-readable string
- error.details: array of {field, message} objects when applicable
- error.timestamp: new Date().toISOString()
- error.requestId: generate or use incoming request ID
```


## Testing Your Custom Instructions


After adding custom instructions, verify they work by asking AI to generate error handling code. Check for:


1. Consistent structure: All fields present in the correct hierarchy

2. Correct field types: Codes are strings, timestamps are ISO dates, etc.

3. Proper status codes: Matching HTTP codes for each error type

4. Use of utilities: Using your existing error handling functions


If the AI deviates from your schema, refine your instructions with more specific examples or constraints.


## Common Pitfalls to Avoid


Being too vague: Instructions like "use good error handling" leave too much room for interpretation. Be specific about every field and format.


Missing edge cases: If your schema handles partial failures differently from complete failures, explain both scenarios in your instructions.


Forgetting validation details: Many APIs include field-level validation errors. Specify whether this is an array of objects or a flat object.


Ignoring language differences: Error handling patterns differ between languages. Provide examples for each language you use.


## Related Articles

- [Writing Custom Instructions That Make AI Follow Your Team's](/ai-tools-compared/writing-custom-instructions-that-make-ai-follow-your-teams-changelog-entry-format/)
- [How to Write Custom Instructions That Make AI Respect Your](/ai-tools-compared/how-to-write-custom-instructions-that-make-ai-respect-your-api-rate-limit-patterns/)
- [How to Write Custom Instructions for AI That Follow Your](/ai-tools-compared/how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/)
- [How to Write ChatGPT Custom Instructions](/ai-tools-compared/how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/)
- [ChatGPT Custom GPT Not Following Instructions](/ai-tools-compared/chatgpt-custom-gpt-not-following-instructions/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
