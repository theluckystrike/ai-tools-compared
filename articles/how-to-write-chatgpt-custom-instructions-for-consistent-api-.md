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
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}


ChatGPT's custom instructions feature lets you define persistent context that shapes every conversation. For developers working on API design, well-crafted custom instructions mean you get consistent, high-quality suggestions without repeating the same context across sessions. This guide shows you how to write custom instructions that deliver reliable API design recommendations tailored to your project requirements and coding standards.


## Understanding Custom Instructions in ChatGPT


Custom instructions live in your ChatGPT settings and apply to every new conversation. They consist of two fields: "What would you like ChatGPT to know about you?" and "How would you like ChatGPT to respond?" Both fields work together to establish the context and behavioral patterns you want the model to follow.


For API design work, you need to address several dimensions in your instructions:


- Your technology stack and framework preferences

- Your coding conventions and style guidelines

- The types of APIs you typically design

- The quality standards you expect in responses


The key to effective custom instructions is specificity. Generic statements like "write good API code" produce generic results. Concrete, measurable requirements generate precise, useful suggestions.


## Writing the Profile Section


The first field should establish your technical context. Include your primary language, framework, and any specific constraints your projects typically face.


A solid profile section might look like:


```
I primarily work with Python using FastAPI for REST APIs and PostgreSQL for data storage.
My team follows PEP 8 style guidelines and uses Pydantic v2 for request/response validation.
We implement OAuth 2.0 with JWT tokens for authentication. Our APIs follow RESTful conventions
with JSON request/response bodies. Error responses use problem details format (RFC 7807).
```


This tells ChatGPT exactly what tools and patterns you use, eliminating the need to repeat this information in every prompt. The model will suggest Pydantic models, FastAPI route handlers, and JWT-based auth patterns because it knows those are your standards.


## Defining Response Behavior


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


## Examples of Effective Custom Instructions


### Example 1: Microservices Developer


If you work on microservices architectures, your instructions might emphasize:


```
I design microservices in Go using the standard library and chi router.
APIs communicate via gRPC for internal services and REST for external consumers.
I follow the principles of domain-driven design with clear bounded contexts.
Version APIs using URI versioning (/v1/, /v2/). Include rate limiting in all endpoints.
```


With these instructions, ChatGPT will suggest gRPC definitions, URI versioning strategies, and Go idioms like middleware chains for rate limiting.


### Example 2: Enterprise Java Developer


For enterprise Java environments:


```
I work with Java 17+ and Spring Boot 3.x for building enterprise APIs.
Use Spring WebFlux for reactive endpoints where appropriate.
JPA/Hibernate for persistence with HikariCP connection pooling.
Follow OpenAPI 3.0 specifications with springdoc-openapi.
Validation uses Bean Validation with custom constraint annotations.
```


The model will generate Spring annotations, reactive programming patterns, and validation constraints matching enterprise requirements.


### Example 3: TypeScript/Node.js Developer


For TypeScript environments:


```
I build APIs with Node.js 20+ and Express or NestJS.
TypeScript strict mode is enabled with no implicit any.
Use Zod for runtime validation and Swagger/OpenAPI for documentation.
Database access through Prisma ORM with PostgreSQL.
Follow DDD principles with clear separation of controllers, services, and repositories.
```


This produces TypeScript-first suggestions with proper typing, Zod schemas, and NestJS patterns.


## Testing and Refining Your Instructions


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


## Advanced Custom Instruction Techniques


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


## Maintaining Consistency Across Sessions


Custom instructions persist until you change them, which creates consistency but also requires maintenance. Review and update your instructions when:


- Your tech stack changes

- Your team adopts new conventions

- You start working on a different type of project


Consider keeping a backup of your custom instructions in a document. This lets you maintain different instruction sets for different project types and quickly swap between contexts.


## Related Articles

- [How to Write Custom Instructions for AI That Follow Your](/ai-tools-compared/how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/)
- [How to Write Custom Instructions That Make AI Follow Your](/ai-tools-compared/how-to-write-custom-instructions-that-make-ai-follow-your-error-response-schema/)
- [How to Write Custom Instructions That Make AI Respect Your](/ai-tools-compared/how-to-write-custom-instructions-that-make-ai-respect-your-api-rate-limit-patterns/)
- [ChatGPT Custom GPT Not Following Instructions](/ai-tools-compared/chatgpt-custom-gpt-not-following-instructions/)
- [How to Create Custom System Prompt for ChatGPT API That Enfo](/ai-tools-compared/how-to-create-custom-system-prompt-for-chatgpt-api-that-enfo/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
