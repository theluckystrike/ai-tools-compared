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
score: 8
intent-checked: true
voice-checked: true---
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
score: 8
intent-checked: true
voice-checked: true---


Monorepos require explicit context configuration to prevent AI from hallucinating about unrelated packages. This guide shows how to set up AI tools to include only relevant workspace paths, package dependencies, and type definitions while excluding irrelevant codebases.

When working with large monorepo projects, AI coding assistants often struggle to provide relevant suggestions because they attempt to process the entire repository. Configuring context includes and excludes allows you to direct the AI's attention to the specific packages and directories that matter for your current task. This results in more accurate completions, better-informed responses, and faster interactions.

## Key Takeaways

- **The most direct method**: uses the `.cursorrules` file in your project root.
- **When working with large**: monorepo projects, AI coding assistants often struggle to provide relevant suggestions because they attempt to process the entire repository.
- **This results in more**: accurate completions, better-informed responses, and faster interactions.
- **Third**: the AI may suggest solutions using the wrong package or framework because it doesn't know which part of the monorepo you're actually working in.
- **Consider including focused test**: files rather than excluding all tests.
- **What are the most**: common mistakes to avoid? The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully.

## Why Monorepos Challenge AI Context

Monorepos contain multiple projects, packages, or services within a single repository. A typical monorepo might include a frontend application, backend API, shared utilities, design system components, and documentation. When you ask an AI coding assistant for help, it attempts to build context from files across the entire repository, which introduces several problems.

First, irrelevant files dilute the context. If you're working on a React component but the AI is processing Python backend code, the relevant signals get buried in noise. Second, token limits mean that processing everything leaves less room for the actual code you care about. Third, the AI may suggest solutions using the wrong package or framework because it doesn't know which part of the monorepo you're actually working in.

Configuring includes and excludes solves these issues by telling the AI exactly which parts of the repository to consider.

## Configuring Cursor for Monorepo Context

Cursor, an AI-powered code editor based on VS Code, provides several ways to control context scope. The most direct method uses the `.cursorrules` file in your project root.

Create a `.cursorrules` file with explicit include and exclude patterns:

```
# Focus on the frontend React application
@frontend/src/**
@frontend/src/**/*.tsx
@frontend/src/**/*.ts

# Include shared types but exclude node_modules
@shared/types/**
!node_modules/**
!dist/**
!build/**
```

The `@` symbol tells Cursor to include these paths in context. The `!` prefix excludes specific patterns. This approach works well when you have clearly separated package directories.

For more granular control, Cursor supports workspace-specific settings. Create a `.cursor` folder with context configuration files for different parts of your monorepo. Each file can specify which directories to include when working within that workspace context.

## Configuring Claude Code (Claude CLI) Context

Claude Code, Anthropic's CLI tool for AI-assisted development, uses `.claude` directory for project settings. Create a `settings.local.yml` file to configure context behavior.

For a Turborepo-style monorepo with Next.js frontend and Node.js backend:

```yaml
context:
  includes:
    - apps/web/src/**
    - apps/web/pages/**
    - apps/web/components/**
    - packages/ui/**
    - packages/utils/**
  excludes:
    - "**/node_modules/**"
    - "**/.next/**"
    - "**/dist/**"
    - "**/build/**"
    - "**/*.test.ts"
    - "**/*.spec.ts"
```

This configuration tells Claude Code to focus on your Next.js application and shared packages while ignoring dependencies, build outputs, and test files that would consume context tokens without adding value.

You can also use the `--context` flag when starting a Claude Code session to temporarily override these settings:

```bash
claude --context "packages/api/**" "Review the auth middleware"
```

## Configuring GitHub Copilot Context

GitHub Copilot integrates directly into GitHub's ecosystem and offers context configuration through `.github/copilot-includes.md` and `.github/copilot-excludes.md` files in your repository root.

Create `copilot-includes.md` to specify priority files:

```markdown
<!-- copilot-includes.md -->
apps/api/src/**/*.js
apps/api/src/**/*.ts
packages/auth/**/*.ts
packages/config/**/*.js
```

Create `copilot-excludes.md` for files to ignore:

```markdown
<!-- copilot-excludes.md -->
**/node_modules/**
**/dist/**
**/build/**
**/__pycache__/**
**/.venv/**
*.log
.env.local
```

Copilot processes files listed in the includes file first, then considers other relevant files while respecting the excludes list. This ranking system ensures your primary focus areas get priority in context building.

## Configuring Windshow's Windsurf

Windsurf, another AI code editor, uses a `.windsurfrules` file for context configuration. The syntax combines includes and excludes in a single file:

```
# Primary focus: React frontend
@apps/web/src/**
@apps/web/components/**

# Shared utilities
@packages/shared/**

# Exclude dependencies and builds
!node_modules
!.next
!dist
!build
!*.lock
```

Windsurf also supports workspace-specific rules. Create a `.windsurf` directory with separate rule files for different projects within your monorepo. This allows context switching based on which workspace you're currently editing.

## Pattern Matching for Monorepo Structures

Understanding glob patterns helps you create precise configurations. Here are practical patterns for common monorepo structures.

For npm workspaces with packages in `packages/` and apps in `apps/`:

```
# Include all packages but exclude specific types
@packages/**
@apps/frontend/**
@apps/admin-panel/**

# Exclude common non-source directories
!**/node_modules/**
!**/dist/**
!**/coverage/**
```

For Turborepo with multiple apps and packages:

```
# Target specific app
@apps/nextjs/**
@packages/ui/**

# Exclude test files from primary context
!**/*.test.ts
!**/*.test.js
!**/*.spec.ts
```

For pnpm workspaces with scattered packages:

```
# Include by package type
@features/auth/**
@features/payments/**
@features/reporting/**

# Exclude generated files
!**/schema.graphql
!**/*.pb.ts
```

## Optimizing Context for Better Results

After configuring includes and excludes, verify that your settings produce the desired behavior. Test by asking your AI assistant to explain or modify code in different parts of your monorepo. The responses should focus on the relevant directories without pulling in unrelated code.

Monitor token usage when working with large files. Even with includes configured, very large files can consume your entire context window. Consider splitting oversized files or using additional excludes for files over a certain size threshold.

Keep your configuration files in version control so team members benefit from optimized context settings. Document the rationale behind include/exclude choices, especially for monorepos with unconventional structures.

## Common Mistakes to Avoid

A frequent error is being too broad with includes. Including `@**` or entire root directories defeats the purpose of context configuration. Be specific about which packages or apps matter for your workflow.

Another mistake is excluding test files entirely. While tests consume context tokens, they provide valuable context for understanding how code should behave. Consider including focused test files rather than excluding all tests.

Forgetting to exclude generated files is another common oversight. Files in `dist/`, `build/`, `.next/`, and similar directories should always be excluded since they contain compiled output, not source code.

Finally, configuration files left at the root may not apply to nested projects. If your monorepo has independent sub-projects, consider adding localized configuration files to those directories for more precise control.

Properly configured context includes and excludes transform AI assistance from a generic tool into a focused collaborator that understands exactly which part of your monorepo you're working in and provides relevant, accurate guidance accordingly.

## Frequently Asked Questions

**How long does it take to configure ai context includes and excludes?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Can I adapt this for a different tech stack?**

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

## Related Articles

- [Claude Projects Feature Which Plan Tier Includes It Explaine](/ai-tools-compared/claude-projects-feature-which-plan-tier-includes-it-explaine/)
- [Best Way to Configure AI Coding Tools to Follow Your Databas](/ai-tools-compared/best-way-to-configure-ai-coding-tools-to-follow-your-databas/)
- [Best Way to Configure Claude Code to Understand Your Interna](/ai-tools-compared/best-way-to-configure-claude-code-to-understand-your-interna/)
- [Best Way to Configure CursorRules for Python FastAPI Project](/ai-tools-compared/best-way-to-configure-cursorrules-for-python-fastapi-project/)
- [How to Configure AI Coding Tools to Exclude Secrets and](/ai-tools-compared/how-to-configure-ai-coding-tools-to-exclude-secrets-and-env-/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
