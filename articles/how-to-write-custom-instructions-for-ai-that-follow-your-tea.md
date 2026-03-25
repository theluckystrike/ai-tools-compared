---
layout: default
title: "How to Write Custom Instructions for AI That Follow Your"
description: "A practical guide for developers on creating AI custom instructions that align with team code review standards, with concrete examples and code snippets"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/
categories: [guides]
tags: [ai-tools-compared, ai, prompts, development, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


AI coding assistants have become integral to modern development workflows, but their default behaviors often miss the mark when it comes to your team's specific code review standards. Rather than fighting against AI-generated code that fails pull request reviews, you can write custom instructions that guide the AI to produce code matching your team's conventions from the start.

This guide shows you how to create effective custom instructions that enforce your code review standards, reducing iteration cycles and helping your AI pair-programmer become a truly valuable team member.

Table of Contents

- [Prerequisites](#prerequisites)
- [Code Review Requirements](#code-review-requirements)
- [Practical Examples for Common Standards](#practical-examples-for-common-standards)
- [Testing Requirements](#testing-requirements)
- [Advanced - Context-Aware Instructions](#advanced-context-aware-instructions)
- [Testing Requirements](#testing-requirements)
- [Troubleshooting](#troubleshooting)

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - Understand Custom Instructions

Custom instructions are system-level prompts that shape how an AI assistant behaves across all your interactions. Most AI coding tools support some form of custom instructions, whether through Claude's `CLAUDE.md`, Cursor's `.cursorrules`, or GitHub Copilot's custom instructions file.

The key insight is that these instructions work best when they are specific, enforceable, and aligned with your actual code review checklist. Generic advice like "write clean code" rarely produces the results you want. Instead, you need precise rules that the AI can follow without ambiguity.

Step 2 - Structuring Your Custom Instructions

Effective custom instructions follow a structured approach. Start with your team's code review problems, what gets flagged most often in pull requests? Common offenders include missing error handling, inadequate test coverage, inconsistent naming, and lack of documentation.

Here's a template for structuring custom instructions that actually work:

```markdown
Project Code Standards

Step 3 - Language and Framework Conventions
- Use TypeScript strict mode for all new TypeScript files
- Prefer functional components in React; use hooks over class components
- Follow Airbnb JavaScript Style Guide with exceptions listed below

Code Review Requirements
- All functions over 10 lines need JSDoc comments
- Error handling required for all async operations
- Include unit tests for utility functions
- Use early returns to reduce nesting depth
```

The structure matters because it gives the AI a mental framework for generating code. When you organize instructions by category, the AI can reference the appropriate section when making different types of decisions.

Practical Examples for Common Standards

Enforcing Naming Conventions

If your team requires specific naming patterns, make them explicit. Instead of vague preferences, provide concrete rules:

```markdown
Step 4 - Naming Conventions
- Variables and functions: camelCase
- React components: PascalCase
- Constants: UPPER_SNAKE_CASE
- File names: kebab-case
- Component files: ComponentName.tsx format
- Test files: componentName.test.ts format
```

This approach eliminates guesswork. When the AI needs to name a new component, it has clear guidance rather than choosing arbitrarily.

Error Handling Standards

Code review often flags inconsistent error handling. Address this directly:

```markdown
Step 5 - Error Handling
- Never leave console.log in production code; use a proper logger
- Always handle Promise rejections with try/catch or .catch()
- Wrap async operations in proper error boundaries in React
- Create custom error classes for domain-specific errors
- Include error context in error messages (what failed, why, what to do next)
```

With these instructions, the AI will automatically include proper error handling rather than adding it as an afterthought.

Test Coverage Requirements

If your team requires tests, specify the expectations clearly:

```markdown
Testing Requirements
- Minimum 80% test coverage for business logic
- Test edge cases, not just happy paths
- Use describe/it structure for all test files
- Include integration tests for API endpoints
- Mock external services; use real implementations only when necessary
```

The AI will then write tests alongside code rather than treating testing as a separate step.

Step 6 - Making Instructions Actionable

The difference between custom instructions that work and those that get ignored comes down to actionability. Vague instructions like "write secure code" are meaningless to an AI. Specific, actionable instructions produce consistent results.

Consider this ineffective instruction:

> "Make sure to follow security best practices"

Versus this actionable version:

> "Never use eval(), always sanitize user inputs, use parameterized queries for SQL, implement proper authentication checks on all API routes"

The second version gives the AI concrete behaviors to avoid or adopt.

Step 7 - Iterating on Your Instructions

Custom instructions are not a one-time setup. Start with your top five code review concerns, implement instructions for those, and observe the results. Track what gets approved on first review versus what still needs fixes.

Most teams find that their instructions evolve over time. You might discover that a particular rule is too strict or not strict enough. The key is treating your custom instructions as a living document that improves through feedback from your actual code review process.

Advanced - Context-Aware Instructions

For larger projects, consider creating instruction tiers that apply based on context. Some AI tools support conditional instructions that activate based on file type, directory, or project area:

```markdown
Backend API Standards
[Apply to: /api/, /services/]
- Use RESTful URL patterns
- Return consistent JSON response structures
- Include pagination for list endpoints

Frontend Component Standards
[Apply to: /components/, /pages/]
- Follow component composition patterns
- Use CSS-in-JS or CSS modules, never inline styles
- Implement proper loading and error states
```

This targeted approach keeps instructions relevant to the task at hand rather than overwhelming the AI with rules that don't apply.

Step 8 - Real-World Custom Instructions Examples

Here are complete, production-tested custom instruction sets for different teams:

Startup SaaS Team (.cursorrules)

```
Cursor Rules - Startup SaaS Development

Step 9 - Tech Stack
- React 18 with TypeScript
- Next.js 14 (App Router)
- Supabase for authentication and database
- Tailwind CSS for styling
- Vercel for deployment

Step 10 - Code Standards

React Components
- Use functional components only
- Prefer TypeScript interfaces over types for props
- All components must have TypeScript prop definitions
- Use React hooks (useState, useContext, useCallback)
- Implement proper loading and error states
- Example pattern:
  ```typescript
 interface ButtonProps {
 onClick: () => void;
 loading?: boolean;
 variant?: 'primary' | 'secondary';
 }
 export function Button({ onClick, loading, variant = 'primary' }: ButtonProps) {
 return <button disabled={loading} className={`btn-${variant}`} onClick={onClick} />
 }
 ```

API Routes
- Use Next.js API routes in /app/api
- Validate all request bodies with zod
- Return { success: boolean; data?: T; error?: string }
- Include proper HTTP status codes (200, 400, 401, 500)
- Never expose database errors to client

Database
- Use Supabase client library
- All queries in @/lib/database/queries
- Always use parameterized queries
- Add row-level security policies
- Use migrations for schema changes

Testing Requirements
- Jest for unit tests
- Playwright for E2E tests
- Minimum 80% coverage for utils
- All API routes need integration tests
- Test files: componentName.test.ts

Common Code Review Issues
- Missing error boundaries in components
- Unhandled async errors in useEffect
- Missing null checks on optional data
- Hardcoded values instead of env variables
- No loading states on async operations

Step 11 - What NOT to do
- No console.log in production code (use winston logger)
- No raw SQL queries (use ORM/parameterized)
- No mixing component logic with styling
- No default exports for components
- No modifying props directly in components

Step 12 - Security Checklist
- Sanitize all user input before display
- CSRF tokens on all state-changing requests
- Rate limit API endpoints
- Validate on both client and server
- Use Content Security Policy headers
```

Enterprise Backend Team (.cursorrules)

```
Cursor Rules - Enterprise Backend (Python/FastAPI)

Step 13 - Architecture
- Python 3.11+
- FastAPI with async/await
- PostgreSQL with SQLAlchemy ORM
- Redis for caching
- OpenTelemetry for observability

Step 14 - Code Style
- Black formatter (line length: 100)
- isort for imports
- mypy for type checking (strict mode)
- pylint with score threshold 8.0

Step 15 - API Standards
- RESTful design with resource versioning (/v1/, /v2/)
- OpenAPI documentation via FastAPI
- Structured error responses with error codes
- Request/response logging to CloudWatch
- All endpoints require authentication

Step 16 - Database Patterns
- Alembic for migrations (never manually alter schema)
- ORM entities in /models/
- Queries in repository classes
- Always use transactions for multi-step operations
- Soft deletes for customer data (never hard delete)

Testing Requirements
- pytest with 85% code coverage minimum
- Unit tests for business logic
- Integration tests for API endpoints
- Load tests for critical paths (> 1000 req/sec)
- Fixtures for test data

Step 17 - Required Code Review Checks
- No hardcoded credentials (use environment variables)
- All external API calls have timeout and retry logic
- Database queries use connection pooling
- Sensitive data logged as [REDACTED]
- Proper logging at info/warning/error levels

Step 18 - Deploy ment
- Docker containers with minimal base images
- Kubernetes manifests in /k8s/
- Helm charts for configuration
- Blue-green deployment strategy
- Automatic rollback on failure
```

Data Team/Jupyter Notebooks (custom instructions)

```
Custom Instructions - Data Analysis Notebooks

Step 19 - Notebook Structure
- Clear markdown cells explaining each section
- Descriptive cell comments for complex analysis
- Results always include confidence intervals
- Visualizations with titles, axes labels, legends
- Summary cell at top with key findings

Step 20 - Code Quality
- Use pandas, numpy, scikit-learn from official docs
- Always check for data quality issues first (nulls, duplicates, outliers)
- Validate assumptions before modeling
- Seeds for reproducibility (random_state=42)
- All plots should be publication-quality (matplotlib.style.use('seaborn-v0_8-darkgrid'))

Step 21 - Analysis Standards
- Sample size and statistical significance always noted
- P-values reported, not just p < 0.05
- Effect sizes included, not just p-values
- Explain why chosen that statistical test
- Limitations of analysis clearly stated

Step 22 - Visualization Rules
- Color-blind friendly palettes (use colorblind=True in seaborn)
- No pie charts (use bar charts instead)
- Proper axis labels and units
- Caption describing what to see in plot
- Show 95% confidence intervals on estimates
```

Step 23 - Test Your Custom Instructions

Create a validation checklist to verify instructions actually work:

```markdown
Step 24 - Custom Instructions Validation Checklist

Test 1 - Basic Compliance
- [ ] AI generates code following naming conventions
- [ ] AI uses specified frameworks/libraries
- [ ] Generated code matches error handling style
- [ ] Comments/docstrings follow template

Test 2 - Code Review Standards
- [ ] Generated tests meet coverage requirement
- [ ] Error handling present without asking
- [ ] Logging implemented correctly
- [ ] Security best practices included

Test 3 - Edge Cases
- [ ] AI handles constraints mentioned (e.g., no console.log)
- [ ] AI avoids anti-patterns listed
- [ ] AI includes required patterns automatically
- [ ] Multi-file changes consistent with rules

Test Feature
- [ ] Request: "Create a new API endpoint for user signup"
- [ ] Verify: Route structure, validation, error response, logging, testing all follow instructions
- [ ] If any deviation: Update instructions to be clearer/more specific
```

Step 25 - Measuring Instruction Effectiveness

Track the impact of your custom instructions:

```python
Analyze code review feedback over time
pull_request_data = {
    "before_instructions": {
        "avg_review_comments": 8.2,
        "common_issues": [
            "Missing error handling (30%)",
            "No tests (25%)",
            "Wrong naming (20%)",
            "Security issues (15%)"
        ],
        "rework_iterations": 2.3
    },
    "after_instructions": {
        "avg_review_comments": 3.1,  # 62% reduction
        "common_issues": [
            "Logic issues (40%)",
            "Performance (35%)",
            "Style edge cases (25%)"
        ],
        "rework_iterations": 1.1  # 52% reduction
    }
}
```

When AI-generated code passes review comments drop by 60%+, your instructions are working.

Step 26 - Integrate Instructions Across Tools

Most modern AI tools support instructions, but syntax varies:

Cursor - `.cursorrules` file in project root
VS Code + Copilot - `.github/copilot-instructions.md`
Claude - `claude_system_prompt.md` or via Project settings
GitHub Copilot - Settings in repository or organization

For consistency across tools, maintain a single source:

```bash
sync-instructions.sh
Copy instructions to all tools' expected locations

cp team-instructions.md .cursorrules
cp team-instructions.md .github/copilot-instructions.md
cp team-instructions.md claude_system_prompt.md

git add .cursorrules .github/copilot-instructions.md claude_system_prompt.md
git commit -m "Update custom instructions across all AI tools"
```

Step 27 - Common Mistakes and How to Fix Them

Mistake 1 - Too Generic
 "Write clean code and follow best practices"
 "Use early returns to reduce nesting. Max function length 30 lines. Avoid else blocks."

Mistake 2 - Too Long
 500-line instruction document that no one reads
 One-page summary with links to detailed guidelines

Mistake 3 - Not Enforceable
 "Be mindful of performance"
 "Use .includes() instead of .find() for existence checks. Batch database queries when selecting >10 items."

Mistake 4 - Out of Date
 Instructions reference old tech stack
 Review instructions quarterly as tools/standards evolve

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to write custom instructions for ai that follow your?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Is this approach secure enough for production?

The patterns shown here follow standard practices, but production deployments need additional hardening. Add rate limiting, input validation, proper secret management, and monitoring before going live. Consider a security review if your application handles sensitive user data.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

Related Articles

- [How to Write Custom Instructions That Make AI Follow Your](/how-to-write-custom-instructions-that-make-ai-follow-your-error-response-schema/)
- [Writing Custom Instructions That Make AI Follow Your Team's](/writing-custom-instructions-that-make-ai-follow-your-teams-changelog-entry-format/)
- [How to Write ChatGPT Custom Instructions](/how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/)
- [How to Write Custom Instructions That Make AI Respect Your](/how-to-write-custom-instructions-that-make-ai-respect-your-api-rate-limit-patterns/)
- [ChatGPT Custom GPT Not Following Instructions](/chatgpt-custom-gpt-not-following-instructions/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
