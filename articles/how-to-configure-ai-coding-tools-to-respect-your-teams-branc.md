---

layout: default
title: "How to Configure AI Coding Tools to Respect Your Team's Branch Naming Conventions"
description: "A practical guide for developers on configuring AI coding assistants to follow your team's branch naming conventions. Code examples and configuration tips included."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-configure-ai-coding-tools-to-respect-your-teams-branc/
categories: [guides]
tags: [configuration, workflow]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

When AI coding assistants generate code, commit messages, or pull requests, they often create branch names that don't align with your team's conventions. This misalignment causes friction during code reviews, breaks automated tooling, and forces developers to manually rename branches before merging. Configuring your AI tools to respect your team's branch naming conventions eliminates this friction and keeps your Git workflow consistent.



This guide covers practical methods for teaching AI coding tools—including GitHub Copilot, Cursor, Claude Code, and Windsurf—to generate branch names that match your team's standards.



## Why Branch Naming Conventions Matter



Most teams establish branch naming conventions for good reason. A consistent pattern like `feature/user-authentication` or `fix/payment-processing-error` makes it easy to identify what a branch contains without examining its commits. Convention-aware branches integrate with CI/CD pipelines, GitHub Actions workflows, and project management tools that parse branch names automatically.



When AI tools ignore these conventions, you spend time renaming branches or explaining to teammates why their automated scripts failed. Teaching your AI assistant about your conventions once saves repeated manual corrections.



## Configuring Cursor with Branch Rules



Cursor uses a `.cursorrules` file to define project-specific behaviors. Add branch naming guidelines to this file to ensure generated branches follow your conventions.



Create or update your `.cursorrules` file in the project root:



```
## Branch Naming Conventions

Our team uses the following branch prefixes:
- `feature/` for new features (e.g., feature/add-payment-gateway)
- `fix/` for bug fixes (e.g., fix/login-redirect-error)
- `refactor/` for code refactoring (e.g., refactor/auth-service-cleanup)
- `docs/` for documentation changes

When creating branches, always:
1. Use lowercase letters, numbers, and hyphens only
2. Start with the appropriate prefix
3. Keep the description concise (2-4 words)
4. Include a ticket number if applicable (e.g., feature/PROJ-123-user-dashboard)

Example: When implementing user profile editing, create `feature/user-profile-edit` not `new-user-profile功能`.
```


Cursor reads this configuration and applies it when generating branch names. The AI learns to match your prefix patterns and avoids special characters that cause Git issues.



## Claude Code Configuration



Claude Code respects instructions in `CLAUDE.md` files within your project. Add branch naming requirements to this file for team-wide consistency.



Create a `CLAUDE.md` file with these guidelines:



```
# Project Conventions

## Git Branch Naming

Our team follows these branch naming rules:

| Type | Prefix | Example |
|------|--------|---------|
| Feature | `feature/` | feature/add-search-filter |
| Bug Fix | `fix/` | fix/cart-total-calculation |
| Hotfix | `hotfix/` | hotfix/payment-api-timeout |
| Release | `release/` | release/v2.0.0 |

Rules:
- Use lowercase only
- Separate words with hyphens
- Maximum 50 characters
- Include ticket reference when available
- Never use spaces or special characters

When I ask you to create a branch, apply these rules automatically.
```


Place this file in your repository root. Claude Code checks for `CLAUDE.md` on each session and applies the conventions when generating branch names.



## GitHub Copilot Custom Instructions



GitHub Copilot supports workspace-specific custom instructions through VS Code settings. Configure branch naming behavior in your workspace settings.



Add this to your `.vscode/settings.json`:



```json
{
  "github.copilot.advanced": {
    "branchNaming": {
      "prefixes": {
        "feature": "feature",
        "fix": "fix",
        "refactor": "refactor",
        "docs": "docs",
        "test": "test"
      },
      "lowercase": true,
      "hyphenSeparator": true,
      "maxLength": 50
    }
  }
}
```


Copilot uses these settings when suggesting branch names through Git commands or pull request descriptions. This approach works team-wide if you commit the settings file to your repository.



## Windsurf Rules Configuration



Windsurf uses a `rules.md` file for project-specific instructions. Update your rules to include branch naming requirements.



Add a `rules.md` file to your project root:



```
# Windsurf Project Rules

## Branch Naming Standard

Format: `<type>/<short-description>`

Types:
- `feature/` - New functionality
- `fix/` - Bug corrections  
- `hotfix/` - Urgent production fixes
- `refactor/` - Code improvements
- `docs/` - Documentation only

Requirements:
- All lowercase
- Hyphens between words
- No ticket numbers in branch name (use commit messages instead)
- Maximum 40 characters for branch name

Example transformations:
- "add user login" → feature/user-login
- "fix the cart bug" → fix/cart-calculation
- "update API docs" → docs/api-v2-reference
```


Windsurf reads this file and applies the rules when generating any branch-related output.



## Practical Example: From Request to Branch



Here's how these configurations work in practice. When you ask your AI assistant:



> "Create a branch for adding user authentication"



Without configuration, the AI might generate:

- `add-user-authentication`

- `user-auth-feature`

- `new-auth-system`



With proper configuration, the AI generates:

- `feature/user-authentication`



The consistent prefix helps your team quickly identify branch purpose during standups, code reviews, and when browsing your Git history.



## Testing Your Configuration



After setting up branch naming rules, verify they work by requesting a branch name:



1. Ask your AI: "What branch name would you suggest for adding a payment processing feature?"

2. Check that it uses the correct prefix (`feature/`)

3. Verify lowercase and hyphen usage

4. Confirm the description is concise



If the response doesn't match your conventions, add more explicit examples to your configuration file. AI tools learn from demonstration, so showing correct examples accelerates compliance.



## Team-Wide Enforcement



To ensure consistency across your entire team:



1. Commit configuration files to your repository

2. Include branch rules in onboarding documentation

3. Add a pre-commit hook that validates branch names

4. Document exceptions in your team wiki



A simple pre-commit hook in `.git/hooks/pre-commit` can validate branch names:



```bash
#!/bin/bash
branch=$(git symbolic-ref --short HEAD)
regex='^(feature|fix|hotfix|refactor|docs|test)/[a-z0-9-]+$'

if ! [[ $branch =~ $regex ]]; then
    echo "Branch name '$branch' does not match conventions."
    echo "Use format: type/description (e.g., feature/user-login)"
    exit 1
fi
```


This catches misnamed branches before they're pushed, complementing your AI configuration.



## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [How to Configure Claude Code to Follow Your Team's Feature Flag Naming Conventions](/ai-tools-compared/how-to-configure-claude-code-to-follow-your-teams-feature-fl/)
- [Writing Custom Instructions That Make AI Follow Your Team's Changelog Entry Format](/ai-tools-compared/writing-custom-instructions-that-make-ai-follow-your-teams-changelog-entry-format/)
- [How to Create Custom Instructions for AI Coding Tools That Enforce Naming Conventions](/ai-tools-compared/how-to-create-custom-instructions-for-ai-coding-tools-that-e/)

Built by

Built by theluckystrike — More at [zovo.one](https://zovo.one)
