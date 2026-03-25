---
layout: default
title: "How to Write ChatGPT Custom Instructions"
description: "A practical guide for developers on crafting effective ChatGPT custom instructions that produce consistent, high-quality API design recommendations"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/
categories: [guides]
tags: [ai-tools-compared, chatgpt, api-design, prompts, api]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

ChatGPT's custom instructions feature lets you define persistent context that shapes every conversation. For developers working on API design, well-crafted custom instructions mean you get consistent, high-quality suggestions without repeating the same context across sessions. This guide shows you how to write custom instructions that deliver reliable API design recommendations tailored to your project requirements and coding standards.

Table of Contents

- [Prerequisites](#prerequisites)
- [Advanced Custom Instruction Techniques](#advanced-custom-instruction-techniques)
- [Advanced Custom Instruction Techniques](#advanced-custom-instruction-techniques)
- [Troubleshooting](#troubleshooting)

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - Understand Custom Instructions in ChatGPT

Custom instructions live in your ChatGPT settings and apply to every new conversation. They consist of two fields: "What would you like ChatGPT to know about you?" and "How would you like ChatGPT to respond?" Both fields work together to establish the context and behavioral patterns you want the model to follow.

For API design work, you need to address several dimensions in your instructions:

- Your technology stack and framework preferences

- Your coding conventions and style guidelines

- The types of APIs you typically design

- The quality standards you expect in responses

The key to effective custom instructions is specificity. Generic statements like "write good API code" produce generic results. Concrete, measurable requirements generate precise, useful suggestions.

Step 2 - Writing the Profile Section

The first field should establish your technical context. Include your primary language, framework, and any specific constraints your projects typically face.

A solid profile section might look like:

```
I primarily work with Python using FastAPI for REST APIs and PostgreSQL for data storage.
My team follows PEP 8 style guidelines and uses Pydantic v2 for request/response validation.
We implement OAuth 2.0 with JWT tokens for authentication. Our APIs follow RESTful conventions
with JSON request/response bodies. Error responses use problem details format (RFC 7807).
```

This tells ChatGPT exactly what tools and patterns you use, eliminating the need to repeat this information in every prompt. The model will suggest Pydantic models, FastAPI route handlers, and JWT-based auth patterns because it knows those are your standards.

Step 3 - Defining Response Behavior

The second custom instruction field controls how ChatGPT structures its responses. For API design, you want suggestions that are immediately usable in your codebase, not abstract concepts.

Include instructions like:

```
When suggesting API endpoints, provide complete code examples including route handlers,
request models, response models, and error handling. Include type hints throughout.
For database operations, show both the schema definition and the ORM model.
Always include docstrings following Google style format.
```

This produces functional code rather than pseudocode. You can further refine this by specifying response formats:

```
Structure API suggestions with these sections: 1) Endpoint definition with HTTP method
and path, 2) Request model with field types and validation, 3) Response model,
4) Implementation code, 5) Example request/response, 6) Common error cases.
```

Step 4 - Examples of Effective Custom Instructions

Example 1 - Microservices Developer

If you work on microservices architectures, your instructions might emphasize:

```
I design microservices in Go using the standard library and chi router.
APIs communicate via gRPC for internal services and REST for external consumers.
I follow the principles of domain-driven design with clear bounded contexts.
Version APIs using URI versioning (/v1/, /v2/). Include rate limiting in all endpoints.
```

With these instructions, ChatGPT will suggest gRPC definitions, URI versioning strategies, and Go idioms like middleware chains for rate limiting.

Example 2 - Enterprise Java Developer

For enterprise Java environments:

```
I work with Java 17+ and Spring Boot 3.x for building enterprise APIs.
Use Spring WebFlux for reactive endpoints where appropriate.
JPA/Hibernate for persistence with HikariCP connection pooling.
Follow OpenAPI 3.0 specifications with springdoc-openapi.
Validation uses Bean Validation with custom constraint annotations.
```

The model will generate Spring annotations, reactive programming patterns, and validation constraints matching enterprise requirements.

Example 3 - TypeScript/Node.js Developer

For TypeScript environments:

```
I build APIs with Node.js 20+ and Express or NestJS.
TypeScript strict mode is enabled with no implicit any.
Use Zod for runtime validation and Swagger/OpenAPI for documentation.
Database access through Prisma ORM with PostgreSQL.
Follow DDD principles with clear separation of controllers, services, and repositories.
```

This produces TypeScript-first suggestions with proper typing, Zod schemas, and NestJS patterns.

Step 5 - Test and Refining Your Instructions

After setting up custom instructions, test them with a few API design questions:

1. Ask for a CRUD endpoint for a resource like "users" or "products"

2. Request an endpoint with authentication

3. Ask for error handling implementation

Evaluate whether the responses match your expectations:

- Does the code use your framework of choice?

- Are the naming conventions consistent with your codebase?

- Is the validation approach what you would implement yourself?

- Are the code examples complete enough to use directly?

If something misses the mark, refine your instructions. Common adjustments include:

- Adding specific libraries or packages you use

- Clarifying naming conventions (camelCase vs snake_case)

- Specifying testing requirements

- Including documentation expectations

Advanced Custom Instruction Techniques

For more sophisticated control, use conditional instructions:

```
If I ask about authentication, always suggest OAuth 2.0 with JWT unless I specify otherwise.
If I mention GraphQL, use Apollo Server with a schema-first approach.
If I ask for database design, first show the ER diagram before writing schemas.
```

You can also establish persona and tone:

```
Be concise and technical in responses. Prefer working code over lengthy explanations.
When suggesting improvements, cite specific benefits (performance, security, maintainability).
If I could achieve the same result with less code, show the simpler approach.
```

Step 6 - Maintaining Consistency Across Sessions

Custom instructions persist until you change them, which creates consistency but also requires maintenance. Review and update your instructions when:

- Your tech stack changes

- Your team adopts new conventions

- You start working on a different type of project

Consider keeping a backup of your custom instructions in a document. This lets you maintain different instruction sets for different project types and quickly swap between contexts.

Step 7 - Custom Instructions Library

Save these ready-to-use instruction templates for different tech stacks:

Next.js with Supabase

```
Profile - I build full-stack applications using Next.js 15, TypeScript strict mode, and Supabase for PostgreSQL backend. I use Server Actions for API logic, client components with React hooks, and Zod for validation. Authentication uses Supabase Auth with JWT. Database access through Supabase client library with RLS policies.

Response - When I request API endpoints, show: 1) Server Action code with proper error handling, 2) TypeScript types for request/response, 3) Zod validation schemas, 4) RLS policy requirements, 5) Client-side usage example. Include database schema assumptions.
```

Django with Django REST Framework

```
Profile - I develop with Django 5.0 and Django REST Framework. Using PostgreSQL with django-environ for configuration. Models use Django ORM with proper relationships and constraints. Authentication via drf-spectacular and OpenAPI 3.0 documentation.

Response - For API endpoints, provide: 1) Serializer class definition with field validation, 2) ViewSet implementation with proper queryset filtering, 3) Pagination and permission classes, 4) URL routing configuration, 5) Example API calls. Always include docstrings following Django conventions.
```

Rust with Actix-web

```
Profile - I write APIs in Rust using Actix-web framework. Database access through SQLx with compile-time query verification. Error handling with custom error types implementing ResponseError. Serde for JSON serialization with derive macros. All endpoints require explicit error types and Result returns.

Response - When suggesting endpoints, show: 1) Handler function with proper type signatures, 2) Request/response struct definitions with Serde attributes, 3) Custom error enum implementation, 4) Database query code, 5) Endpoint registration in App configuration. Use #[derive(Serialize, Deserialize)] consistently.
```

Go with Gin

```
Profile - I build REST APIs in Go 1.21+ using Gin web framework. Database access through GORM ORM with PostgreSQL. Error handling returns errors as part of function signatures. Validation uses struct tags with popular validators. All responses use consistent JSON envelope format.

Response - For API suggestions, provide: 1) Handler function with gin.Context parameter, 2) Struct definitions with struct tags for validation and JSON serialization, 3) GORM query examples with proper error checking, 4) Middleware setup if needed, 5) Curl examples. Follow Go conventions: CamelCase for exported functions, lowercase for packages.
```

Advanced Custom Instruction Techniques

Conditional Instructions for Multiple Workflows

```
Add these conditional instructions to your response profile:

If I ask about database design - First show the ER diagram in ASCII art, then provide the schema.

If I ask about testing - Always include unit test examples using my testing framework of choice.

If I ask about deployment - Assume containerized deployment with Docker and Kubernetes.

If I mention "urgent" or "quick": Provide the most concise solution without extensive explanation.

If I reference a specific file - Ask for the file content first before suggesting changes.
```

Style and Tone Customization

```
Style guidance:

- Avoid verbose explanations. Prefer working code over lengthy descriptions.
- If multiple approaches exist, show the most performant option.
- Point out security implications when relevant.
- Use code comments only for non-obvious logic.
- Always include what NOT to do alongside what to do.

Example tone:
"Bad - Use proper error handling in your code.
Good - Use typed error responses to prevent information leakage in production. Example - return status 500 with generic 'Internal Error' rather than stacktraces."
```

Step 8 - Measuring Custom Instruction Effectiveness

Track whether custom instructions are improving suggestion quality:

```python
Simple metric tracking
import json
from datetime import datetime

def track_suggestion_quality(suggestion_text, accepted: bool, modified: bool):
    """Log suggestion outcomes"""

    entry = {
        "timestamp": datetime.now().isoformat(),
        "accepted": accepted,
        "modified": modified,
        "quality_score": 1.0 if accepted else (0.5 if modified else 0.0),
        "suggestion_length": len(suggestion_text)
    }

    with open("instruction_effectiveness.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")

def analyze_effectiveness():
    """Calculate effectiveness metrics"""
    total = 0
    accepted = 0

    with open("instruction_effectiveness.jsonl") as f:
        for line in f:
            entry = json.loads(line)
            total += 1
            if entry["accepted"]:
                accepted += 1

    acceptance_rate = (accepted / total * 100) if total > 0 else 0
    return {
        "total_suggestions": total,
        "accepted": accepted,
        "acceptance_rate": f"{acceptance_rate:.1f}%"
    }
```

Track acceptance rates before and after updating instructions. If acceptance rate drops, revert instructions and try different wording.

Step 9 - Integration with Workflow

ChatGPT Plus Workflow

1. Open ChatGPT
2. Custom instructions automatically load
3. Ask API design question
4. Receive suggestions aligned with your standards
5. Copy code directly into your project or IDE

API Design Assistant Strategy

Use ChatGPT for exploratory design:

```
Session Flow:
1. "I need to design a user management API. What endpoints should I include?"
   (Uses your custom instructions for tech stack)

2. "Show me the authentication flow for JWT tokens"
   (Generates examples matching your standards)

3. "How should I handle error responses?"
   (Uses your defined error format)

4. "Generate the complete POST /users endpoint"
   (Produces production-ready code)
```

Step 10 - Updating Instructions Over Time

Maintenance schedule:

- Monthly: Review acceptance rates and adjust wording if needed
- Quarterly: Update with new technology versions or framework changes
- Annually: review with team for standardization

Example update:

```
Before - "Use JWT for authentication"
After - "Use JWT with RS256 algorithm, 15-minute expiry for access tokens, 7-day for refresh tokens. Implement token rotation on refresh."
```

Specific instructions yield better results than generic ones.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to write chatgpt custom instructions?

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
- [How to Write Custom Instructions That Make AI Follow Your](/how-to-write-custom-instructions-that-make-ai-follow-your-error-response-schema/)
- [How to Write Custom Instructions That Make AI Respect Your](/how-to-write-custom-instructions-that-make-ai-respect-your-api-rate-limit-patterns/)
- [ChatGPT Custom GPT Not Following Instructions](/chatgpt-custom-gpt-not-following-instructions/)
- [How to Create Custom System Prompt for ChatGPT API That Enfo](/how-to-create-custom-system-prompt-for-chatgpt-api-that-enfo/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
