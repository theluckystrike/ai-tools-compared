---
layout: default
title: "Writing Claude Md Files That Teach AI Your Project Specific"
description: "A practical guide to creating effective CLAUDE.md files that communicate your project's error handling conventions to AI assistants. Includes code examples and"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /writing-claude-md-files-that-teach-ai-your-project-specific-error-handling-patterns/
categories: [guides]
tags: [ai-tools-compared, claude-code, ai-assistants, error-handling, troubleshooting, artificial-intelligence, claude-ai]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

When you work with AI coding assistants like Claude Code, the quality of output depends heavily on context. A well-crafted CLAUDE.md file transforms generic responses into project-aligned code. This guide focuses specifically on teaching AI assistants your error handling patterns, a critical aspect that often gets overlooked but dramatically affects code quality.

Table of Contents

- [Why Error Handling Deserves Special Attention](#why-error-handling-deserves-special-attention)
- [Structuring Your Error Handling Section](#structuring-your-error-handling-section)
- [Error Handling Conventions](#error-handling-conventions)
- [Documenting Error Naming Conventions](#documenting-error-naming-conventions)
- [Specifying Logging Requirements](#specifying-logging-requirements)
- [Defining Retry and Recovery Patterns](#defining-retry-and-recovery-patterns)
- [User-Facing Error Messages](#user-facing-error-messages)
- [Example: Complete Error Handling Section](#example-complete-error-handling-section)
- [Error Handling Conventions](#error-handling-conventions)
- [Teaching the AI Your Result Type Pattern](#teaching-the-ai-your-result-type-pattern)
- [Showing Before/After Examples Inline](#showing-beforeafter-examples-inline)
- [Layering Error Handling for Different Architectural Tiers](#layering-error-handling-for-different-architectural-tiers)
- [Testing Your Error Handling Instructions](#testing-your-error-handling-instructions)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)
- [Maintaining Your CLAUDE.md File](#maintaining-your-claudemd-file)

Why Error Handling Deserves Special Attention

Error handling varies significantly between projects and organizations. Some teams prefer exceptions, others use result types. Logging conventions, retry strategies, and user-facing error messages all follow project-specific conventions. Without explicit guidance, AI assistants default to their training patterns, which may not match your codebase.

A dedicated section in your CLAUDE.md file ensures every AI-generated function follows your error handling standards from the start.

Structuring Your Error Handling Section

Organize your CLAUDE.md file with a clear error handling section. Place it prominently, ideally early in the file, since AI models pay special attention to the first substantial sections.

```markdown
Error Handling Conventions

This project follows specific error handling patterns described below.
```

Define Your Primary Error Strategy

Start by stating whether your project uses exceptions, result types, or a hybrid approach. Be explicit about when to use each.

```markdown
Error Strategy

- Use Result types (Either/Ok/Err) for expected failures in business logic
- Use exceptions only for truly exceptional, unrecoverable situations
- Always log errors with appropriate context before returning
```

This single statement prevents the AI from wrapping everything in try-catch blocks when your codebase uses functional error handling.

Documenting Error Naming Conventions

Consistent error naming makes debugging significantly easier. Specify your conventions in the CLAUDE.md file.

```markdown
Error Naming

- Custom errors: `{Domain}Error` (e.g., `PaymentError`, `AuthenticationError`)
- Error codes: `ERR_{DOMAIN}_{DESCRIPTION}` (e.g., `ERR_PAYMENT_DECLINED`)
- Wrap third-party errors with domain-specific errors to provide context
```

When the AI encounters an unknown error type, these patterns ensure it creates appropriately named errors rather than generic "Error" types.

Specifying Logging Requirements

Error logging often follows team-specific standards. Document yours explicitly.

```markdown
Logging

- All errors must be logged with structured metadata
- Include correlation IDs when available
- Log levels: ERROR for failures requiring attention, WARN for recoverable issues
- Never log sensitive data (passwords, tokens, PII)
```

This prevents the AI from using `console.log` in production code when your team requires structured logging with specific fields.

Defining Retry and Recovery Patterns

Network failures and transient errors require consistent retry logic. Specify your approach in the CLAUDE.md file.

```markdown
Retry Logic

- Use exponential backoff with jitter for network calls
- Maximum 3 retries for external APIs
- Include circuit breaker patterns for critical dependencies
- Do not retry authentication failures, fail fast instead
```

The AI will then implement appropriate retry mechanisms rather than infinite loops or no retry logic at all.

User-Facing Error Messages

How errors surface to users requires careful thought. Define your standards.

```markdown
User Messages

- Never expose internal error details to users
- Use friendly, actionable messages (e.g., "Unable to save. Check your connection.")
- Technical details go to logs only
- Maintain consistent tone across all error messages
```

This ensures the AI generates user-safe error messages instead of exposing stack traces.

Complete Error Handling Section

Here's an example you can adapt:

```markdown
Error Handling Conventions

This project uses TypeScript with a focus on explicit error handling.

Error Types

- Domain errors extend `AppError` base class
- Validation errors use `ValidationError` with field-level details
- Third-party errors are wrapped in domain-specific errors

Logging

- Use `logger.error()` with structured context object
- Include: error code, user ID (if authenticated), request ID, timestamp
- Never log stack traces in production, use error codes instead

API Responses

- Return `{ success: false, error: { code: string, message: string } }`
- HTTP status codes: 400 for validation, 401 for auth, 500 for server errors
- Never return 200 OK with error details in body

Testing

- Write unit tests for error paths, not just happy paths
- Test error messages are user-safe
- Verify logging is called with correct context
```

Teaching the AI Your Result Type Pattern

If your project uses a Result type instead of exceptions, show Claude Code exactly what the type looks like and how to use it. Generic descriptions produce generic code; concrete examples produce idiomatic code.

```markdown
Result Type Usage

This project uses a custom Result type. Always import from `@/lib/result`.

```typescript
import { Result, ok, err } from '@/lib/result';

// Return ok() for success
async function fetchUser(id: string): Promise<Result<User, UserError>> {
 const row = await db.users.findById(id);
 if (!row) return err(new UserError('ERR_USER_NOT_FOUND', id));
 return ok(mapRowToUser(row));
}

// Callers use .match() or early return with isErr()
const result = await fetchUser(userId);
if (result.isErr()) {
 logger.warn('user lookup failed', { error: result.error });
 return res.status(404).json({ error: result.error.toResponse() });
}
const user = result.value;
```

Never throw inside functions that return Result. Catch all exceptions at service boundaries and convert them to err() values.
```

This level of specificity, showing the actual import path, method names, and call site patterns, produces far better alignment than a paragraph description alone.

Showing Before/After Examples Inline

One of the most effective techniques is including explicit "do this / not that" examples in the CLAUDE.md file for error handling patterns that you see violated repeatedly.

```markdown
Common Mistakes to Avoid

Do not catch and swallow errors silently:
```typescript
// WRONG
try {
 await sendEmail(user.email, template);
} catch (e) {
 // do nothing
}

// CORRECT
try {
 await sendEmail(user.email, template);
} catch (e) {
 logger.error('email send failed', { userId: user.id, error: e });
 throw new NotificationError('ERR_EMAIL_SEND_FAILED', { cause: e });
}
```

Do not expose raw error messages to API consumers:
```typescript
// WRONG
res.status(500).json({ error: e.message });

// CORRECT
logger.error('unexpected error', { requestId, error: e });
res.status(500).json({ error: { code: 'ERR_INTERNAL', message: 'Something went wrong.' } });
```
```

Claude Code treats these examples as strong signals. When it sees the WRONG pattern in your existing codebase, it will flag it; when generating new code, it will follow the CORRECT pattern.

Layering Error Handling for Different Architectural Tiers

Most full-stack projects have distinct error handling needs at each tier: the API layer, the service layer, and the data layer. If your CLAUDE.md treats all three identically, the AI will apply a one-size-fits-all pattern that fits none of them well.

Document each tier explicitly:

```markdown
Error Handling by Layer

Data layer (repositories):
- Catch DB driver exceptions and wrap in `DatabaseError`
- Never let Postgres/MySQL error codes leak past the repository boundary
- Return null for not-found rather than throwing

Service layer:
- Translate repository nulls into domain errors (`UserNotFoundError`)
- Orchestrate retry logic here, not in routes
- Use Result types for expected business rule failures

API layer (routes/controllers):
- Convert domain errors to HTTP responses using `errorToHttpResponse()`
- Log with request context (method, path, user ID, correlation ID)
- Always return a structured JSON body, never a bare string
```

With this structure, Claude Code knows to generate `return null` in a repository function but `return err(new UserNotFoundError(id))` in the service that calls it, matching the actual conventions in your codebase.

Testing Your Error Handling Instructions

After adding error handling guidance to your CLAUDE.md file, verify it works. Ask Claude Code to implement a simple function with error cases:

```
Create a function that fetches user data from an API and handles network errors, validation errors, and authentication errors appropriately.
```

Review the output against your documented patterns. If something doesn't match, refine your CLAUDE.md instructions.

Common Mistakes to Avoid

Several patterns reduce the effectiveness of error handling guidance:

- Vague instructions: "Handle errors properly" means nothing to an AI. Be specific.

- Contradictory guidance: Don't say "use exceptions sparingly" without defining what counts as exceptional.

- Missing context: Include why certain patterns exist, not just what to do.

- Outdated examples: Review and update your error handling section as patterns evolve.

Maintaining Your CLAUDE.md File

Error handling patterns evolve with projects. Schedule periodic reviews of your CLAUDE.md error handling section:

1. After major refactoring that changes error patterns

2. When adopting new libraries with different error handling styles

3. When team members consistently need to correct AI-generated error handling

Keep the error handling section focused and actionable. Remove outdated patterns and add new ones as your project matures.

Frequently Asked Questions

Who is this article written for?

This article is written for developers, technical professionals, and power users who want practical guidance. Whether you are evaluating options or implementing a solution, the information here focuses on real-world applicability rather than theoretical overviews.

How current is the information in this article?

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Always verify specific feature availability and pricing directly on the official website before making purchasing decisions.

Does Claude offer a free tier?

Most major tools offer some form of free tier or trial period. Check Claude's current pricing page for the latest free tier details, as these change frequently. Free tiers typically have usage limits that work for evaluation but may not be sufficient for daily professional use.

How do I get started quickly?

Pick one tool from the options discussed and sign up for a free trial. Spend 30 minutes on a real task from your daily work rather than running through tutorials. Real usage reveals fit faster than feature comparisons.

What is the learning curve like?

Most tools discussed here can be used productively within a few hours. Mastering advanced features takes 1-2 weeks of regular use. Focus on the 20% of features that cover 80% of your needs first, then explore advanced capabilities as specific needs arise.

Related Articles

- [Writing Claude Md Files That Teach AI Your Project Testing](/writing-claude-md-files-that-teach-ai-your-project-testing-conventions-and-patterns/)
- [Writing CLAUDE.md Files That Define Your Project's API](/writing-claude-md-files-that-define-your-projects-api-versioning-strategy/)
- [Writing CLAUDE MD Files That Define Your Project's API](/writing-claude-md-files-that-define-your-projects-api-versioning-strategy-for-ai/)
- [Claude Code API Error Handling Standards](/claude-code-api-error-handling-standards/)
- [Best AI Tools for Writing Idiomatic Rust Error Handling](/best-ai-tools-for-writing-idiomatic-rust-error-handling-with/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
