---
layout: default
title: "Writing Custom Instructions for AI Tools That Enforce Your"
description: "A practical guide for developers to create custom instructions that force AI coding tools to implement security headers consistently across all projects"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /writing-custom-instructions-for-ai-tools-that-enforce-your-security-header-standards/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


Write custom instructions for AI tools by specifying all required security headers (Strict-Transport-Security, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy) with exact values and explaining when to apply them in middleware or server configuration. These instructions ensure every piece of AI-generated web server code includes your complete security header requirements automatically.


This guide shows you how to create effective custom instructions for AI coding tools that enforce your security header standards across all projects.

Why Security Headers Need Explicit Instructions


Modern web frameworks rarely enable security headers out of the box. An AI tool generating an Express.js middleware might include basic CORS configuration, but it won't automatically add Strict-Transport-Security, Content-Security-Policy, or X-Content-Type-Options headers unless specifically instructed. This creates inconsistent security posture across your codebase.

Custom instructions solve this problem by establishing a permanent context that AI tools reference for every code generation request. Rather than repeating security header requirements in every prompt, you define them once and the AI applies them automatically.

Security headers are one of the lowest-effort, highest-impact security controls available. Tools like securityheaders.com and Mozilla Observatory grade your headers automatically and are commonly used by security auditors. Missing a header like `X-Frame-Options` leaves your site vulnerable to clickjacking. Missing `Content-Security-Policy` leaves it vulnerable to cross-site scripting injection. When AI tools omit these headers from generated server code, those vulnerabilities propagate silently into production.


Understanding the Required Headers


Before writing instructions, understand what each header does and what value it should carry:

| Header | Purpose | Recommended Value |
|---|---|---|
| Strict-Transport-Security | Forces HTTPS connections | `max-age=31536000; includeSubDomains` |
| Content-Security-Policy | Restricts resource loading origins | `default-src 'self'` (customize per app) |
| X-Content-Type-Options | Prevents MIME-type sniffing | `nosniff` |
| X-Frame-Options | Prevents clickjacking via iframes | `DENY` or `SAMEORIGIN` |
| X-XSS-Protection | Enables browser XSS filter (legacy) | `1; mode=block` |
| Referrer-Policy | Controls referrer information leakage | `strict-origin-when-cross-origin` |
| Permissions-Policy | Restricts browser feature access | `geolocation=(), microphone=(), camera=()` |

`X-XSS-Protection` is deprecated in modern browsers but still relevant for supporting older clients. Browsers with CSP properly configured do not rely on it, but including it costs nothing and helps with legacy browser compatibility.


Creating Effective Security Header Instructions


Effective security header instructions must be specific and actionable. Here's a practical template you can adapt for your organization:


```
Always implement the following security headers in middleware or server configuration:

1. Strict-Transport-Security: max-age=31536000; includeSubDomains
2. Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
3. X-Content-Type-Options: nosniff
4. X-Frame-Options: DENY
5. X-XSS-Protection: 1; mode=block
6. Referrer-Policy: strict-origin-when-cross-origin
7. Permissions-Policy: geolocation=(), microphone=(), camera=()

When generating any web server code, include a security middleware module that applies all headers above. Use appropriate framework-specific implementations.
```


This instruction works across different AI tools, whether you use Claude Code, Cursor, GitHub Copilot, or other assistants. The key is placing these instructions where the AI will consistently reference them.


Implementing Instructions in Different AI Tools


Each AI coding tool handles custom instructions differently. Understanding these mechanisms ensures your security header requirements get applied consistently.


Claude Code and Projects


Create a `.claude/settings.json` file or use project-specific instructions in the project directory. You can also include instructions in a dedicated `CLAUDE.md` file at your project root:


```markdown
Security Requirements

All generated server code must include security headers. See SECURITY.md for requirements.
```


Create a separate `SECURITY.md` with detailed header specifications:


```markdown
Security Header Standards

Required Headers

All HTTP responses must include these headers:

| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| Content-Security-Policy | default-src 'self' |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |

Implementation

Use framework-specific middleware. For Express.js, use helmet with explicit configuration.
```


This separation keeps instructions organized while remaining accessible to AI tools. Claude Code reads both files automatically when they exist at the project root.


Cursor Rules


Cursor uses a `.cursorrules` file in your project root. Add security header enforcement:


```markdown
// Security Headers Requirement
// All server code generation must include security middleware

Framework: [Express/Next.js/NestJS/etc]
Security Requirements:
- Always include security headers middleware
- Use helmet.js for Express applications
- Configure CSP for your framework
- Never disable security headers for development
- Never use wildcard CSP directives in production code
```

The `Never disable security headers for development` rule is critical. A common anti-pattern is adding `if (process.env.NODE_ENV === 'development') return next()` inside security middleware, AI tools may suggest this to avoid HTTPS errors locally, but it creates a false sense of security and often gets committed to production branches.


GitHub Copilot


Copilot respects instructions in `.github/copilot-instructions.md` or inline comments. Use a combination approach:


```javascript
// Security: All endpoints require these headers
// Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options
// See /docs/security-headers.md for full requirements
app.use(securityMiddleware);
```

For repository-wide rules, create `.github/copilot-instructions.md`:

```markdown
Copilot Instructions

When generating server-side code for this project:
- Always apply the security middleware defined in src/middleware/security.ts
- Never generate routes without the security middleware applied
- Reference SECURITY.md for required header values
```


ChatGPT Custom GPTs and API


For ChatGPT-based workflows, embed security header requirements in the system prompt of your Custom GPT or in the `system` field of your API requests:

```
You are a backend code assistant. When generating Node.js, Python, or Go server code, always include security header middleware. Required headers: Strict-Transport-Security (max-age=31536000; includeSubDomains), Content-Security-Policy (default-src 'self'), X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Referrer-Policy (strict-origin-when-cross-origin). Use framework-native middleware or established libraries like helmet for Node.js.
```


Framework-Specific Implementation Examples


Your instructions should include framework-specific guidance since security header implementation varies significantly between frameworks.


Express.js with Helmet


When generating Express.js code, your instructions should specify using the helmet middleware:


```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

Helmet is the de facto standard for Express security headers. It ships with sensible defaults and lets you override individual headers. Always pin the version in your `package.json`, helmet's defaults have changed across major versions, and an upgrade can alter your CSP policy silently.


Next.js Configuration


For Next.js applications, security headers belong in `next.config.js`:


```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "default-src 'self'" },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};
```


Nginx Configuration


For reverse proxy setups, include header directives in your server block:


```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

The `always` keyword ensures headers are added to all responses, including error responses (4xx, 5xx). Without it, headers only appear on successful responses, which means error pages are unprotected.


Testing Your Implementation


After implementing custom instructions, verify they work by generating sample code and checking the output. Create a test prompt:


```bash
Generate a basic Express.js API with two endpoints: /users and /users/:id
```


Review the generated code to confirm security headers appear in the middleware. If they are missing, refine your instructions with more specific language.


You can also use automated tools to verify headers in deployed applications:


```bash
Using curl to check headers
curl -I https://yourdomain.com

Expected output should include:
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

For a grade, submit your domain to securityheaders.com or run Mozilla Observatory against it. An An or A+ rating indicates your headers are complete and correctly configured.


Maintaining Security Header Instructions


Security standards evolve, and your instructions should too. Schedule quarterly reviews of your security header requirements to account for new threats, browser changes, or regulatory updates.


Track changes to your instruction files in version control. When updating header requirements, generate new code for existing applications to maintain consistency across your infrastructure.


Document any exceptions or project-specific variations. Some applications might require relaxed CSP policies or custom CORS configurations. Rather than weakening your base instructions, create supplementary rules for specific use cases.


Common Pitfalls to Avoid


Several mistakes reduce the effectiveness of security header instructions. Avoid these common issues:


Overly broad instructions that generate vague code don't help. Instead of "add security headers," specify exactly which headers and their values.


Inconsistent placement of instructions across projects creates gaps. Use a centralized location that applies to all repositories, or explicitly document where instructions live in each project.


Missing framework-specific guidance leads to generic code that doesn't work in your stack. Include implementation examples for each framework your team uses.


Failing to test means you won't discover issues until a security audit catches them. Regularly generate sample code to verify instructions remain effective.

Environment-conditional bypasses are a frequent AI suggestion. Instructions should explicitly forbid patterns like disabling headers in development mode.
---


Frequently Asked Questions

Who is this article written for?

This article is written for developers, technical professionals, and power users who want practical guidance on securing AI-generated code. Whether you are evaluating options or implementing a solution, the information here focuses on real-world applicability rather than theoretical overviews.

How current is the information in this article?

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Always verify specific feature availability and pricing directly on the official website before making purchasing decisions.

Are there free alternatives available?

Free alternatives exist for most tool categories. Helmet.js is open source and free for Express. Next.js headers configuration requires no additional libraries. For AI tool instructions, the `.cursorrules` and `CLAUDE.md` mechanisms are available on all tiers including free.

Can I trust these tools with sensitive data?

Review each tool's privacy policy, data handling practices, and security certifications before using it with sensitive data. Look for SOC 2 compliance, encryption in transit and at rest, and clear data retention policies. Enterprise tiers often include stronger privacy guarantees.

What is the learning curve like?

Writing security header instructions is straightforward once you understand what each header does. The table in this article provides a starting point. Adapting the instructions for your specific framework and verifying output with curl or securityheaders.com takes less than a hour for most projects.

Related Articles

- [Writing Custom Instructions That Make AI Follow Your Team's](/writing-custom-instructions-that-make-ai-follow-your-teams-changelog-entry-format/)
- [ChatGPT Custom GPT Not Following Instructions](/chatgpt-custom-gpt-not-following-instructions/)
- [How to Create Custom Instructions for AI Coding Tools That E](/how-to-create-custom-instructions-for-ai-coding-tools-that-e/)
- [How to Create Custom Instructions for AI Tools to Generate](/how-to-create-custom-instructions-for-ai-tools-to-generate-y/)
- [How to Set Up Custom Instructions for AI Tools to Match Your](/how-to-set-up-custom-instructions-for-ai-tools-to-match-your/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
