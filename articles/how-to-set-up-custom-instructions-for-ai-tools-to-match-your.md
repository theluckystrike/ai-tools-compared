---
layout: default
title: "How to Set Up Custom Instructions for AI Tools to Match"
description: "A practical guide for developers on configuring AI coding assistants with custom instructions that enforce your team's linting rules, code style, and"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-set-up-custom-instructions-for-ai-tools-to-match-your/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---
---
layout: default
title: "How to Set Up Custom Instructions for AI Tools to Match"
description: "A practical guide for developers on configuring AI coding assistants with custom instructions that enforce your team's linting rules, code style, and"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-set-up-custom-instructions-for-ai-tools-to-match-your/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---


When AI coding assistants generate code that violates your team's linting rules, you waste time manually fixing formatting issues, import order, or naming convention violations. Setting up custom instructions that align AI output with your linting configuration eliminates these repetitive corrections and keeps your codebase consistent across all contributions, whether written by humans or AI.

Key Takeaways

- Most teams see it: improve from 50–60% (AI output passing lint without changes) to 85–95% after one round of instruction refinement based on the patterns that keep failing.
- The difference between "follow: our coding standards" and listing the actual rule names is the difference between a 40% reduction in lint violations and a 95% reduction.
- Consider a team that: uses ESLint with the Airbnb configuration and a custom rule requiring specific import ordering.
- Create a test prompt: ```
Generate a React TypeScript component that fetches user data from /api/users/:id and displays the name and email.
- What are the most: common mistakes to avoid? The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully.

Why Linting Rules Need AI Configuration

Your ESLint, Prettier, or Ruff configuration defines code standards that your team enforces through CI checks and editor integrations. However, AI assistants don't automatically read these configuration files or follow their rules unless you explicitly instruct them to do so. Without custom instructions, AI-generated code often requires extensive post-processing to pass your linting checks.

Consider a team that uses ESLint with the Airbnb configuration and a custom rule requiring specific import ordering. An AI assistant unaware of these requirements might generate imports in the wrong order, forcing developers to manually sort them before committing. By configuring your AI tool with these exact specifications, generated code arrives ready to merge without modification.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1: What to Include in Your Custom Instructions

Effective AI instructions for coding style are specific, not abstract. The difference between "follow our coding standards" and listing the actual rule names is the difference between a 40% reduction in lint violations and a 95% reduction.

The most impactful categories to document are:

- Import ordering rules. these are almost always violated without explicit instruction
- Naming conventions. camelCase vs snake_case, interface naming prefixes, enum casing
- Error handling patterns. custom error classes, required logging, propagation rules
- Null/undefined handling. whether optional chaining is preferred, how to handle nullable API fields
- Test structure. file naming, describe/it conventions, mocking patterns
- Maximum line length and function length. frequently ignored by AI without explicit limits

Document these as concrete rules with examples, not general principles. AI assistants respond much better to "use named exports; never use default exports except for page components" than to "follow our export conventions."

Step 2: Set Up Custom Instructions in Popular AI Tools

Claude Code (and Claude Desktop)

Claude Code respects instructions stored in `CLAUDE.md` files within your project. Create this file in your repository root to define linting and formatting rules:

```
Project Linting Rules

Step 3: ESLint Configuration
This project uses ESLint with the following rules enforced in CI:
- No unused variables (no-unused-vars: error)
- Prefer const over let (no-var: error)
- Enforce import order: built-in → external → relative
- Maximum line length: 100 characters

Step 4: Prettier Configuration
- Use single quotes for strings
- Trailing commas: es5
- Print width: 100
- Tab width: 2 spaces

Step 5: Import Patterns
All imports must use named exports where available. Import ordering:
1. Node.js built-in (path, fs, etc.)
2. External packages (React, lodash, etc.)
3. Relative imports (./, ../)

Step 6: TypeScript Specific
- Strict mode enabled
- No any types allowed
- Interface over type for public APIs
```

Claude Code will read `CLAUDE.md` automatically when you open a project directory. You can also add a `.claude/` subdirectory with multiple instruction files for different subsystems. for example, `.claude/api-conventions.md` and `.claude/test-patterns.md`.

GitHub Copilot

GitHub Copilot uses `.github/copilot-instructions.md` or workspace-level instructions configured through GitHub settings. Add your linting requirements there:

```
Follow these linting rules for all generated code:
- Use ESLint error-level rules as blocking constraints
- Prefer functional components over class components in React
- Use async/await over .then() chains
- Import order: built-in → external → relative, sorted alphabetically within groups
- No console.log statements, use the configured logger
- Maximum function length: 50 lines
```

Copilot reads `copilot-instructions.md` automatically for any repository that has it. The file is shared across your entire team through version control, which means instruction updates roll out to every developer the next time they pull.

Cursor

Cursor respects `.cursorrules` files and custom rules in settings. Create a `.cursorrules` file in your project root:

```
[Rules]
- ESLint is configured with strict rules, generated code must pass CI
- Prettier formatting is enforced, use 2 spaces, single quotes
- Import order: Node built-in → external packages → relative paths
- No magic numbers, use named constants from config files
- TypeScript strict mode is enabled, explicit types required

[Patterns]
- Error handling: use custom error classes, never generic Error
- API responses: always wrap in standardized response envelope
- Testing: use given-when-then structure, one assertion per test
```

Cursor also supports project-level rules in its Settings panel (Cmd+Shift+P → "Cursor Settings → Rules for AI"). The `.cursorrules` file takes precedence for project-specific overrides.

JetBrains IDEs (IntelliJ, WebStorm)

JetBrains AI Assistant uses the IDE's custom scratch files and editor inspections. Configure linting awareness through `.editorconfig` and ensure AI settings reference your project's ESLint/Prettier configuration:

```
Root=true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true

[*.{js,ts,jsx,tsx}]
max_line_length = 100

[*.{json,yml,yaml}]
indent_size = 2
```

JetBrains AI Assistant also supports a "System Prompt" field under Settings → Tools → AI Assistant. Paste your linting rules there in addition to the `.editorconfig`, since the AI Assistant reads the system prompt but doesn't automatically parse ESLint config files.

Windsurf (Codeium)

Windsurf reads instructions from `.windsurfrules` in your project root, following the same pattern as Cursor. For teams already using `.cursorrules`, create a symlink:

```bash
ln -s .cursorrules .windsurfrules
```

This keeps a single source of truth for AI instructions across both editors.

Step 7: Connecting AI Instructions to Your Actual Configuration

The most effective approach ties AI instructions directly to your actual linting files. Reference specific rules and show concrete examples from your configuration.

For ESLint, extract and include the actual rule names:

```
Step 8: ESLint Rules to Enforce
- no-console: error (use logger.info/warn/error instead)
- no-unused-vars: error
- import/order: error (groups: [builtin, external, internal])
- @typescript-eslint/no-explicit-any: error
- prettier/prettier: error

Step 9: Example Valid Import Block
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api';
import { User } from '@/types';
```

For Prettier, specify exact settings:

```
Step 10: Prettier Settings (from .prettierrc)
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true
}
```

You can automate this: write a script that reads your actual `.eslintrc.json` and `.prettierrc` and generates the AI instruction text. Run it as part of your CI pipeline whenever linting config changes, then commit the updated instruction file. This keeps AI instructions in sync with the actual enforced rules without manual maintenance.

Step 11: Test Your AI Configuration

After setting up custom instructions, verify they work by asking the AI to generate a small code snippet. Check the output against your linting rules.

Create a test prompt:

```
Generate a React TypeScript component that fetches user data from /api/users/:id and displays the name and email. Include proper error handling.
```

Then run ESLint on the output:

```bash
npm run lint -- --fix src/test-component.tsx
```

If fixes are applied automatically, your instructions need refinement. The goal is zero output changes when running lint with the `--fix` flag.

Track your lint pass rate over two weeks. Most teams see it improve from 50–60% (AI output passing lint without changes) to 85–95% after one round of instruction refinement based on the patterns that keep failing.

Step 12: Centralizing Team Rules

For teams with multiple projects sharing similar standards, consider creating a shared configuration package. This package contains your linting rules, and both your AI instructions and project configs reference it.

Structure:

```
packages/eslint-config-team/
 index.js          # Main ESLint config
 README.md         # Documentation
 ai-instructions.md  # Copy-paste for AI config files
```

Update your AI instructions to reference this shared documentation:

```
This project extends @yourteam/eslint-config. See
../packages/eslint-config-team/ai-instructions.md for
detailed rules and examples.
```

Step 13: Maintaining Consistency

Review and update your AI instructions when you update your linting configuration. Treat AI instructions as version-controlled documentation that evolves with your project standards.

Set a calendar reminder to audit AI-generated code monthly. Track which linting rules frequently appear as violations in AI output, then add explicit examples to your instructions. Over time, your instructions become precise enough that AI output requires zero manual corrections.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to set up custom instructions for ai tools to match?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Can I adapt this for a different tech stack?

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes. For Python projects using Ruff, paste your `ruff.toml` rule selection directly into the instruction file. Ruff rule codes like `E501` (line too long) or `I001` (import sort) are self-explanatory to any capable LLM.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

Related Articles

- [How to Create Custom System Prompts for AI That Match Your](/how-to-create-custom-system-prompts-for-ai-that-match-your-d/)
- [How to Set Up Model Context Protocol Server for Custom Proje](/how-to-set-up-model-context-protocol-server-for-custom-proje/)
- [ChatGPT Custom GPT Not Following Instructions](/chatgpt-custom-gpt-not-following-instructions/)
- [How to Create Custom Instructions for AI Coding Tools That E](/how-to-create-custom-instructions-for-ai-coding-tools-that-e/)
- [How to Create Custom Instructions for AI Tools to Generate](/how-to-create-custom-instructions-for-ai-tools-to-generate-y/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
