---
layout: default
title: "How to Configure AI Context Includes and Excludes"
description: "A practical guide to configuring AI coding assistants to focus on specific directories in monorepo setups, improving context accuracy and response quality"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-configure-ai-context-includes-and-excludes-for-monore/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


Monorepos require explicit context configuration to prevent AI from hallucinating about unrelated packages. This guide shows how to set up AI tools to include only relevant workspace paths, package dependencies, and type definitions while excluding irrelevant codebases.

When working with large monorepo projects, AI coding assistants often struggle to provide relevant suggestions because they attempt to process the entire repository. Configuring context includes and excludes allows you to direct the AI's attention to the specific packages and directories that matter for your current task. This results in more accurate completions, better-informed responses, and faster interactions.

Table of Contents

- [Why Monorepos Challenge AI Context](#why-monorepos-challenge-ai-context)
- [Prerequisites](#prerequisites)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)
- [Troubleshooting](#troubleshooting)

Why Monorepos Challenge AI Context

Monorepos contain multiple projects, packages, or services within a single repository. A typical monorepo might include a frontend application, backend API, shared utilities, design system components, and documentation. When you ask an AI coding assistant for help, it attempts to build context from files across the entire repository, which introduces several problems.

First, irrelevant files dilute the context. If you're working on a React component but the AI is processing Python backend code, the relevant signals get buried in noise. Second, token limits mean that processing everything leaves less room for the actual code you care about. Third, the AI may suggest solutions using the wrong package or framework because it doesn't know which part of the monorepo you're actually working in.

Configuring includes and excludes solves these issues by telling the AI exactly which parts of the repository to consider.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1: Configure Cursor for Monorepo Context

Cursor, an AI-powered code editor based on VS Code, provides several ways to control context scope. The most direct method uses the `.cursorrules` file in your project root.

Create a `.cursorrules` file with explicit include and exclude patterns:

```
Focus on the frontend React application
@frontend/src/
@frontend/src//*.tsx
@frontend/src//*.ts

Include shared types but exclude node_modules
@shared/types/
!node_modules/
!dist/
!build/
```

The `@` symbol tells Cursor to include these paths in context. The `!` prefix excludes specific patterns. This approach works well when you have clearly separated package directories.

For more granular control, Cursor supports workspace-specific settings. Create a `.cursor` folder with context configuration files for different parts of your monorepo. Each file can specify which directories to include when working within that workspace context.

Step 2: Configure Claude Code (Claude CLI) Context

Claude Code, Anthropic's CLI tool for AI-assisted development, uses `.claude` directory for project settings. Create a `settings.local.yml` file to configure context behavior.

For a Turborepo-style monorepo with Next.js frontend and Node.js backend:

```yaml
context:
  includes:
    - apps/web/src/
    - apps/web/pages/
    - apps/web/components/
    - packages/ui/
    - packages/utils/
  excludes:
    - "/node_modules/"
    - "/.next/"
    - "/dist/"
    - "/build/"
    - "/*.test.ts"
    - "/*.spec.ts"
```

This configuration tells Claude Code to focus on your Next.js application and shared packages while ignoring dependencies, build outputs, and test files that would consume context tokens without adding value.

You can also use the `--context` flag when starting a Claude Code session to temporarily override these settings:

```bash
claude --context "packages/api/" "Review the auth middleware"
```

Step 3: Configure GitHub Copilot Context

GitHub Copilot integrates directly into GitHub's ecosystem and offers context configuration through `.github/copilot-includes.md` and `.github/copilot-excludes.md` files in your repository root.

Create `copilot-includes.md` to specify priority files:

```markdown
<!-- copilot-includes.md -->
apps/api/src//*.js
apps/api/src//*.ts
packages/auth//*.ts
packages/config//*.js
```

Create `copilot-excludes.md` for files to ignore:

```markdown
<!-- copilot-excludes.md -->
/node_modules/
/dist/
/build/
/__pycache__/
/.venv/
*.log
.env.local
```

Copilot processes files listed in the includes file first, then considers other relevant files while respecting the excludes list. This ranking system ensures your primary focus areas get priority in context building.

Step 4: Configure Windshow's Windsurf

Windsurf, another AI code editor, uses a `.windsurfrules` file for context configuration. The syntax combines includes and excludes in a single file:

```
Primary focus: React frontend
@apps/web/src/
@apps/web/components/

Shared utilities
@packages/shared/

Exclude dependencies and builds
!node_modules
!.next
!dist
!build
!*.lock
```

Windsurf also supports workspace-specific rules. Create a `.windsurf` directory with separate rule files for different projects within your monorepo. This allows context switching based on which workspace you're currently editing.

Step 5: Pattern Matching for Monorepo Structures

Understanding glob patterns helps you create precise configurations. Here are practical patterns for common monorepo structures.

For npm workspaces with packages in `packages/` and apps in `apps/`:

```
Include all packages but exclude specific types
@packages/
@apps/frontend/
@apps/admin-panel/

Exclude common non-source directories
!/node_modules/
!/dist/
!/coverage/
```

For Turborepo with multiple apps and packages:

```
Target specific app
@apps/nextjs/
@packages/ui/

Exclude test files from primary context
!/*.test.ts
!/*.test.js
!/*.spec.ts
```

For pnpm workspaces with scattered packages:

```
Include by package type
@features/auth/
@features/payments/
@features/reporting/

Exclude generated files
!/schema.graphql
!/*.pb.ts
```

Step 6: Optimizing Context for Better Results

After configuring includes and excludes, verify that your settings produce the desired behavior. Test by asking your AI assistant to explain or modify code in different parts of your monorepo. The responses should focus on the relevant directories without pulling in unrelated code.

Monitor token usage when working with large files. Even with includes configured, very large files can consume your entire context window. Consider splitting oversized files or using additional excludes for files over a certain size threshold.

Keep your configuration files in version control so team members benefit from optimized context settings. Document the rationale behind include/exclude choices, especially for monorepos with unconventional structures.

Common Mistakes to Avoid

A frequent error is being too broad with includes. Including `@` or entire root directories defeats the purpose of context configuration. Be specific about which packages or apps matter for your workflow.

Another mistake is excluding test files entirely. While tests consume context tokens, they provide valuable context for understanding how code should behave. Consider including focused test files rather than excluding all tests.

Forgetting to exclude generated files is another common oversight. Files in `dist/`, `build/`, `.next/`, and similar directories should always be excluded since they contain compiled output, not source code.

Finally, configuration files left at the root may not apply to nested projects. If your monorepo has independent sub-projects, consider adding localized configuration files to those directories for more precise control.

Properly configured context includes and excludes transform AI assistance from a generic tool into a focused collaborator that understands exactly which part of your monorepo you're working in and provides relevant, accurate guidance accordingly.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to configure ai context includes and excludes?

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

- [Claude Projects Feature Which Plan Tier Includes It Explaine](/claude-projects-feature-which-plan-tier-includes-it-explaine/)
- [Best Way to Configure AI Coding Tools to Follow Your Databas](/best-way-to-configure-ai-coding-tools-to-follow-your-databas/)
- [Best Way to Configure Claude Code to Understand Your Interna](/best-way-to-configure-claude-code-to-understand-your-interna/)
- [Best Way to Configure CursorRules for Python FastAPI Project](/best-way-to-configure-cursorrules-for-python-fastapi-project/)
- [How to Configure AI Coding Tools to Exclude Secrets and](/how-to-configure-ai-coding-tools-to-exclude-secrets-and-env-/)

Step 7: Tool-Specific Configuration Deep Dives

Cursor: Complete Monorepo Configuration

For a Turborepo with apps/web, apps/api, packages/ui, packages/utils:

```json
// .cursorrules (root of monorepo)
// Prioritize frontend work
@apps/web/src/
@apps/web/pages/
@apps/web/components/
@packages/ui/
@packages/utils/

// Exclude everything else
!node_modules
!dist
!build
!.next
!/*.test.ts
!/*.spec.ts
```

For per-workspace configuration, create:

```json
// apps/web/.cursorrules
@apps/web/src/
@packages/ui/
@packages/utils/
!/node_modules
!/dist
!/.next
```

This allows different context rules depending on which workspace folder you're editing.

Claude Code (via .claude folder)

For the same monorepo:

```yaml
.claude/settings.local.yml
contextRules:
  version: 2

includes:
  # Frontend code
  - apps/web/src/
  - apps/web/pages/
  - apps/web/components/

  # Shared UI package
  - packages/ui/src/
  - packages/ui/components/

  # Utilities both apps depend on
  - packages/utils/
  - packages/types/

excludes:
  - "/node_modules/"
  - "/.next/"
  - "/dist/"
  - "/build/"
  - "/*.test.ts"
  - "/*.test.js"
  - "/*.spec.ts"
  - "/*.spec.js"
  - "/__snapshots__/"
  - "/coverage/"

Optional: token budget for context window
tokenBudget: 8000
```

Use from CLI:

```bash
Use these context rules
claude --context-config .claude/settings.local.yml "Analyze the login flow"

Or temporarily override
claude --context "apps/api/" "Review API middleware"
```

GitHub Copilot: Repository Configuration

Copilot uses GitHub's symantic search. Configure priority files:

```markdown
<!-- .github/copilot-includes.md -->
High-priority files for Copilot context
apps/web/src//*.tsx
apps/web/src//*.ts
packages/ui/src//*.tsx
packages/utils//*.ts
packages/types//*.ts
```

```markdown
<!-- .github/copilot-excludes.md -->
Files to ignore
/node_modules/
/.next/
/dist/
/build/
/__snapshots__/
/*.test.ts
/*.test.js
/*.spec.ts
/*.spec.js
```

Copilot processes includes first, respects excludes absolutely.

Windsurf: Workspace Rules

```
// .windsurfrules (root)
// Frontend focus
@apps/web/
@packages/ui/

// Exclude noise
!node_modules
!.next
!dist
!/*.test.*
!coverage
```

Create workspace-specific overrides:

```
// apps/web/.windsurfrules
// When editing frontend, only frontend context needed
@apps/web/src/
@apps/web/pages/
@apps/web/components/
@packages/ui/

// Don't pull in backend
!apps/api/
```

Step 8: Monorepo Architecture Patterns and Context Config

Pattern 1: npm/pnpm Workspaces

```
root/
 packages/
   ui/
   utils/
   types/
 apps/
   web/
   api/
 package.json
```

Configuration:
```
@packages/ui/src/
@packages/utils/src/
@packages/types/src/
@apps/web/src/
!/node_modules
!/dist
```

Pattern 2: Turborepo

```
root/
 apps/
   web/
   api/
   docs/
 packages/
   config/
   eslint-config/
   typescript-config/
 turbo.json
```

Configuration:
```
@apps/web/src/
@apps/api/src/
@packages/config/
!/node_modules
!/.turbo
!/dist
!/.next
```

Pattern 3: Nx Workspace

```
root/
 apps/
   web/src/
   api/src/
 libs/
   ui/
   utils/
   shared-types/
 nx.json
```

Configuration:
```
@apps/web/src/
@libs/ui/src/
@libs/utils/src/
!/node_modules
!/dist
!/coverage
```

Pattern 4: Yarn Workspaces

```
root/
 workspaces/
   app/
   api/
   shared/
 package.json (with "workspaces" field)
```

Configuration:
```
@workspaces/app/
@workspaces/shared/
!/node_modules
!/dist
!/.yarn
```

Step 9: Test Your Configuration

Test 1: Verify includes work

```bash
In Cursor, open a file from the include list
Ask Cursor to analyze it
"Summarize what this component does"

If Cursor understands it, includes are working
```

Test 2: Verify excludes work

```bash
Ask about a file in the exclude list
"What's in my node_modules for this package?"

If Cursor says "I don't have access to that", excludes are working
```

Test 3: Check context token usage

In Cursor, hover over the @ symbol in chat:

```
@file:src/components/Button.tsx
     ↑ Shows token count for this file
```

Aim for total context <6,000 tokens to leave room for response.

Test 4: Verify monorepo awareness

```
Ask about cross-package dependencies
"How does apps/web import from packages/ui?"

If it explains the import path correctly, it understands monorepo structure
```

Step 10: Common Configuration Mistakes

Mistake 1: Too Broad Includes

```
Wrong: Includes entire root
@

Correct: Specific packages
@apps/web/
@packages/ui/
```

Broad includes waste tokens on irrelevant code.

Mistake 2: Forgetting Package Boundaries

```
Wrong: Imports between unrelated packages
@apps/web/
@apps/api/
Now AI might suggest using API routes in web, which breaks boundaries

Correct: Each workspace separate
@apps/web/
(api is separate in different editor window)
```

Mistake 3: Excluding Test Files Entirely

```
Tempting but wrong: Excludes all tests
!/*.test.ts
!/*.spec.ts

Better: Exclude only large test suites
!/e2e/
!/cypress/
But keep unit tests for understanding
```

Tests show expected behavior and provide implementation clues.

Mistake 4: Not Excluding Generated Files

```
Wrong: Includes generated code
@

Correct: Explicitly exclude generated
!/generated/
!/*.generated.ts
!/.next/
!/dist/
```

Generated files add noise without value.

Mistake 5: Version-Specific Lock Files Not Excluded

```
Add to excludes
!pnpm-lock.yaml
!package-lock.json
!yarn.lock
!npm-shrinkwrap.json
!Cargo.lock  # if Rust project
```

Lock files are huge and add no value to AI context.

Step 11: Context Configuration Cheat Sheet

Quick start for React + Node monorepo:

```
Include
@apps/web/src//*.{tsx,ts}
@apps/api/src//*.{ts}
@packages/types/
@packages/ui/

Exclude
!node_modules/
!dist/
!build/
!.next/
!*.test.*
!*.spec.*
```

For GraphQL/TypeScript backend:

```
Include
@apps/api/src/
@packages/schema/
@packages/database/

Exclude
!node_modules
!dist
!/*.test.ts
!*.graphql.ts (generated from schema)
```

For Design System Package:

```
Include
@packages/design-system/src/
@packages/design-system/stories/

Exclude
!node_modules
!dist
!/dist
!coverage
```

Step 12: Measuring Configuration Effectiveness

Track these metrics:

1. Completion Accuracy: % of AI suggestions that compile without changes
 - Target: >80%
 - If lower, broaden includes or narrow excludes

2. Response Time: Seconds until AI responds
 - Target: <5 seconds for chat
 - If slower, reduce context size with more excludes

3. Relevance: % of suggestions actually usable for your current task
 - Target: >70%
 - If lower, make includes more specific

Example measurement:

```
Week 1 (Default context):
- Completion accuracy: 65%
- Response time: 12s
- Relevance: 52%

After optimizing configuration:
- Completion accuracy: 88%
- Response time: 3s
- Relevance: 78%

= Major improvement in usability
```

Related Articles

- [Cursor Configuration Best Practices for Teams](/cursor-configuration-teams/)
- [Managing Multiple Monorepos with AI Assistants](/multiple-monorepos-ai/)
- [Context Window Management for Large Projects](/context-window-large-projects/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
