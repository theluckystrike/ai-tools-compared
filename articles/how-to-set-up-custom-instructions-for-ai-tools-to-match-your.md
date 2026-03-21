---
layout: default
title: "How to Set Up Custom Instructions for AI Tools to Match Your"
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


When AI coding assistants generate code that violates your team's linting rules, you waste time manually fixing formatting issues, import order, or naming convention violations. Setting up custom instructions that align AI output with your linting configuration eliminates these repetitive corrections and keeps your codebase consistent across all contributions—whether written by humans or AI.


## Why Linting Rules Need AI Configuration


Your ESLint, Prettier, or Ruff configuration defines code standards that your team enforces through CI checks and editor integrations. However, AI assistants don't automatically read these configuration files or follow their rules unless you explicitly instruct them to do so. Without custom instructions, AI-generated code often requires extensive post-processing to pass your linting checks.


Consider a team that uses ESLint with the Airbnb configuration and a custom rule requiring specific import ordering. An AI assistant unaware of these requirements might generate imports in the wrong order, forcing developers to manually sort them before committing. By configuring your AI tool with these exact specifications, generated code arrives ready to merge without modification.


## Setting Up Custom Instructions in Popular AI Tools


### Claude Code (and Claude Desktop)


Claude Code respects instructions stored in `CLAUDE.md` files within your project. Create this file in your repository root to define linting and formatting rules:


```
# Project Linting Rules

## ESLint Configuration
This project uses ESLint with the following rules enforced in CI:
- No unused variables (no-unused-vars: error)
- Prefer const over let (no-var: error)
- Enforce import order: built-in → external → relative
- Maximum line length: 100 characters

## Prettier Configuration
- Use single quotes for strings
- Trailing commas: es5
- Print width: 100
- Tab width: 2 spaces

## Import Patterns
All imports must use named exports where available. Import ordering:
1. Node.js built-in (path, fs, etc.)
2. External packages (React, lodash, etc.)
3. Relative imports (./, ../)

## TypeScript Specific
- Strict mode enabled
- No any types allowed
- Interface over type for public APIs
```


### GitHub Copilot


GitHub Copilot uses `.github/copilot-instructions.md` or workspace-level instructions configured through GitHub settings. Add your linting requirements there:


```
Follow these linting rules for all generated code:
- Use ESLint error-level rules as blocking constraints
- Prefer functional components over class components in React
- Use async/await over .then() chains
- Import order: built-in → external → relative, sorted alphabetically within groups
- No console.log statements—use the configured logger
- Maximum function length: 50 lines
```


### Cursor


Cursor respects `.cursorrules` files and custom rules in settings. Create a `.cursorrules` file in your project root:


```
[Rules]
- ESLint is configured with strict rules—generated code must pass CI
- Prettier formatting is enforced—use 2 spaces, single quotes
- Import order: Node built-in → external packages → relative paths
- No magic numbers—use named constants from config files
- TypeScript strict mode is enabled—explicit types required

[Patterns]
- Error handling: use custom error classes, never generic Error
- API responses: always wrap in standardized response envelope
- Testing: use given-when-then structure, one assertion per test
```


### JetBrains IDEs (IntelliJ, WebStorm)


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


## Connecting AI Instructions to Your Actual Configuration


The most effective approach ties AI instructions directly to your actual linting files. Reference specific rules and show concrete examples from your configuration.


For ESLint, extract and include the actual rule names:


```
## ESLint Rules to Enforce
- no-console: error (use logger.info/warn/error instead)
- no-unused-vars: error
- import/order: error (groups: [builtin, external, internal])
- @typescript-eslint/no-explicit-any: error
- prettier/prettier: error

## Example Valid Import Block
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api';
import { User } from '@/types';
```


For Prettier, specify exact settings:


```
## Prettier Settings (from .prettierrc)
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true
}
```


## Testing Your AI Configuration


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


## Centralizing Team Rules


For teams with multiple projects sharing similar standards, consider creating a shared configuration package. This package contains your linting rules, and both your AI instructions and project configs reference it.


Structure:


```
packages/eslint-config-team/
├── index.js          # Main ESLint config
├── README.md         # Documentation
└── ai-instructions.md  # Copy-paste for AI config files
```


Update your AI instructions to reference this shared documentation:


```
This project extends @yourteam/eslint-config. See
../packages/eslint-config-team/ai-instructions.md for
detailed rules and examples.
```


## Maintaining Consistency


Review and update your AI instructions when you update your linting configuration. Treat AI instructions as version-controlled documentation that evolves with your project standards.


Set a calendar reminder to audit AI-generated code monthly. Track which linting rules frequently appear as violations in AI output, then add explicit examples to your instructions. Over time, your instructions become enough that AI output requires zero manual corrections.


## Related Articles

- [How to Create Custom System Prompts for AI That Match Your](/ai-tools-compared/how-to-create-custom-system-prompts-for-ai-that-match-your-d/)
- [How to Set Up Model Context Protocol Server for Custom Proje](/ai-tools-compared/how-to-set-up-model-context-protocol-server-for-custom-proje/)
- [ChatGPT Custom GPT Not Following Instructions](/ai-tools-compared/chatgpt-custom-gpt-not-following-instructions/)
- [How to Create Custom Instructions for AI Coding Tools That E](/ai-tools-compared/how-to-create-custom-instructions-for-ai-coding-tools-that-e/)
- [How to Create Custom Instructions for AI Tools to Generate](/ai-tools-compared/how-to-create-custom-instructions-for-ai-tools-to-generate-y/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
