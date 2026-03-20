---
layout: default
title: "How to Configure AI Coding Tools to Exclude Secrets and."
description: "A practical guide for developers on configuring AI coding assistants like GitHub Copilot, Cursor, and Claude to exclude sensitive files from training."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-configure-ai-coding-tools-to-exclude-secrets-and-env-/
categories: [guides, security]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


AI coding tools have become integral to modern development workflows, offering intelligent code suggestions, autocomplete, and even full-file generation. However, these tools need access to your codebase to function effectively, and that access can inadvertently expose sensitive information. Configuring your AI assistant to exclude secrets and environment files is essential for maintaining security while enjoying the productivity benefits of AI-powered development.



This guide covers configuration methods for major AI coding tools, practical patterns for organizing sensitive files, and verification steps to ensure your secrets remain protected.



## Why Exclude Secrets from AI Tools



AI coding assistants analyze your code to provide relevant suggestions. When they index or read environment files containing API keys, database credentials, or authentication tokens, those secrets may be transmitted to external servers for processing. Even when using local-first tools, the risk of accidental inclusion in training data or context windows creates potential exposure.



Most AI coding platforms have policies against using customer code for training, but configuration errors or overly broad context settings can still lead to unintended exposure. The simplest solution is ensuring your sensitive files are explicitly excluded from AI tool access.



## Configuring GitHub Copilot



GitHub Copilot respects your repository's `.gitignore` file by default, but additional configuration provides stronger guarantees.



### Using .gitignore Effectively



Ensure your `.gitignore` contains the following entries:



```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.development
.env.production
.env.test

# Secrets and credentials
*.pem
*.key
credentials.json
secrets.yaml
config/secrets.yml
```


Copilot automatically ignores files tracked in `.gitignore` when generating suggestions. However, files already committed to git history remain accessible. If you've previously committed secrets, rotate them immediately and consider using git history rewriting tools like BFG Repo-Cleaner.



### Copilotignore for Broader Control



Create a `.github/copilot-include` and `.github/copilot-exclude` file in your repository root for more granular control:



```gitignore
# .github/copilot-include
src/**/*

# .github/copilot-exclude
.env*
**/secrets/**
**/credentials/**
```


These files tell Copilot exactly which files to consider or ignore, independent of git tracking.



## Configuring Cursor AI



Cursor, built on VS Code, offers workspace-specific settings that control which files the AI can access.



### Workspace Configuration



Create or edit `.cursor/rules` in your project root to define exclusion patterns:



```
# Cursor workspace rules
@workspace .cursor/rules
```


Then create `.cursor/rules/default.mdc` with your exclusions:



```
---
version: 1
rules:
  - type: file_pattern
    pattern: "**/.env*"
    action: exclude
  - type: file_pattern
    pattern: "**/secrets/**"
    action: exclude
  - type: file_pattern
    pattern: "**/*.pem"
    action: exclude
```


### Using VS Code Settings



Cursor respects VS Code settings. Add these to your `.vscode/settings.json`:



```json
{
  "cursor.exclude": {
    "**/.{env,env.*,credentials,secrets,*.pem,*.key}": true
  },
  "files.exclude": {
    "**/.env*": true,
    "**/secrets": true
  }
}
```


This prevents Cursor's AI from reading excluded files while maintaining normal file operations.



## Configuring Claude Code (Anthropic)



Claude Code provides explicit controls for file access through its configuration system.



### Using CLAUDE.md for Project Rules



Create a `CLAUDE.md` file in your project root to instruct Claude about file exclusions:



```markdown
# Project Guidelines

## Excluded Files
Do not read or analyze the following files:
- .env* files
- **/secrets/** directory
- **/credentials/** directory
- *.pem, *.key files
- config/secrets.*

## Context Rules
- Never include environment variables in code suggestions
- Avoid suggesting patterns that require hardcoded secrets
- Recommend environment variable patterns instead of hardcoded values
```


### Claude Code Local Rules



For system-wide exclusions, edit your Claude Code configuration:



```bash
# Edit global config
claude config set --global excludePatterns "[\"**/.env*\", \"**/secrets/**\", \"**/*.pem\"]"
```


This ensures all projects using Claude Code automatically exclude sensitive patterns.



## Best Practices for Secret Management



Beyond configuring AI tools, adopting secret management practices provides defense in depth.



### Environment File Structure



Use a `.env.example` file that contains only placeholder values:



```bash
# .env.example (safe to commit)
DATABASE_URL=postgres://user:password@localhost:5432/db
API_KEY=your_api_key_here
```


Your actual `.env` file stays in `.gitignore`. Team members copy the example and fill in their own values locally.



### Dedicated Secrets Directory



Consider a structured approach for larger projects:



```
config/
├── development.env
├── production.env
└── secrets/          # Add to .gitignore
    ├── api-keys.env
    └── database-creds.env
```


This separation makes it easier to apply broad exclusion patterns while keeping configuration organized.



### Using Secret Management Services



For production systems, integrate dedicated secret management:



```python
# Instead of reading .env directly
import os
from secretmanager import get_secret

# Recommended pattern
api_key = get_secret("production-api-key")
```


Tools like AWS Secrets Manager, HashiCorp Vault, or Doppler provide APIs that your code uses at runtime, eliminating the need for env files in your codebase entirely.



## Verification and Testing



After configuring your AI tools, verify the exclusions work correctly.



### Testing Copilot Exclusions



Open a file containing a secret and attempt a Copilot suggestion. If properly excluded, Copilot should not reference the secret value in its suggestions.



### Testing Claude Exclusions



Ask Claude to read a forbidden file:



```
Read the contents of .env
```


Claude should respond that the file is excluded per project rules.



### Regular Audits



Periodically review your configuration:



1. Check that `.gitignore` includes all secret file patterns

2. Verify AI tool configuration files exist and are current

3. Scan your repository for accidentally committed secrets using tools like git-secrets or TruffleHog



## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
