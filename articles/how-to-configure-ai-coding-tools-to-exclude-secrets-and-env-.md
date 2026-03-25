---
layout: default
title: "How to Configure AI Coding Tools to Exclude Secrets and Env"
description: "A practical guide for developers on configuring AI coding assistants like GitHub Copilot, Cursor, and Claude to exclude sensitive files from training"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-configure-ai-coding-tools-to-exclude-secrets-and-env-/
categories: [guides, security]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---


AI coding tools have become integral to modern development workflows, offering intelligent code suggestions, autocomplete, and even full-file generation. However, these tools need access to your codebase to function effectively, and that access can inadvertently expose sensitive information. Configuring your AI assistant to exclude secrets and environment files is essential for maintaining security while enjoying the productivity benefits of AI-powered development.


This guide covers configuration methods for major AI coding tools, practical patterns for organizing sensitive files, and verification steps to ensure your secrets remain protected.


- Most AI coding platforms: have policies against using customer code for training, but configuration errors or overly broad context settings can still lead to unintended exposure.
- What are the most: common mistakes to avoid? The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully.
- This guide covers why: exclude secrets from ai tools, the risk in concrete terms, configuring github copilot, with specific setup instructions
- Setup and configuration: Step-by-step instructions included for each tool discussed

Why Exclude Secrets from AI Tools


AI coding assistants analyze your code to provide relevant suggestions. When they index or read environment files containing API keys, database credentials, or authentication tokens, those secrets may be transmitted to external servers for processing. Even when using local-first tools, the risk of accidental inclusion in training data or context windows creates potential exposure.


Most AI coding platforms have policies against using customer code for training, but configuration errors or overly broad context settings can still lead to unintended exposure. The simplest solution is ensuring your sensitive files are explicitly excluded from AI tool access.


Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - The Risk in Concrete Terms


Before exploring configuration, it helps to understand exactly what exposure looks like. AI coding tools typically index your workspace in one of three ways:

- Context window inclusion: The tool reads nearby files and open tabs to generate relevant suggestions. If `.env` is open in your editor, its contents become part of the AI's context.
- Workspace indexing: Some tools like Cursor index your entire project directory for semantic search. Any file not excluded is fair game.
- Snippet telemetry: Some tools send anonymized code snippets for model improvement. Configuration options generally let you opt out, but defaults vary.

The most common real-world incident is a developer asking an AI assistant to "help me debug this API call" while the `.env` file is open, resulting in the API key appearing verbatim in a code suggestion that then gets committed to version control.


Step 2 - Configure GitHub Copilot


GitHub Copilot respects your repository's `.gitignore` file by default, but additional configuration provides stronger guarantees.


Using .gitignore Effectively


Ensure your `.gitignore` contains the following entries:


```gitignore
Environment files
.env
.env.local
.env.*.local
.env.development
.env.production
.env.test

Secrets and credentials
*.pem
*.key
credentials.json
secrets.yaml
config/secrets.yml
```


Copilot automatically ignores files tracked in `.gitignore` when generating suggestions. However, files already committed to git history remain accessible. If you've previously committed secrets, rotate them immediately and consider using git history rewriting tools like BFG Repo-Cleaner.


Copilotignore for Broader Control


Create a `.github/copilot-include` and `.github/copilot-exclude` file in your repository root for more granular control:


```gitignore
.github/copilot-include
src//*

.github/copilot-exclude
.env*
/secrets/
/credentials/
```


These files tell Copilot exactly which files to consider or ignore, independent of git tracking.


Organization-Level Policies


GitHub Enterprise customers can enforce Copilot exclusions at the organization level through the GitHub admin console. Navigate to Organization Settings > Copilot > Content exclusion and add patterns that apply to all repositories under the organization. This approach enforces baseline security across all developer machines without relying on per-repository configuration.


Step 3 - Configure Cursor AI


Cursor, built on VS Code, offers workspace-specific settings that control which files the AI can access.


Workspace Configuration


Create or edit `.cursor/rules` in your project root to define exclusion patterns:


```
Cursor workspace rules
@workspace .cursor/rules
```


Then create `.cursor/rules/default.mdc` with your exclusions:


```---
version: 1
rules:
 - type: file_pattern
 pattern: "/.env*"
 action: exclude
 - type: file_pattern
 pattern: "/secrets/"
 action: exclude
 - type: file_pattern
 pattern: "/*.pem"
 action: exclude
```

Using VS Code Settings

Cursor respects VS Code settings. Add these to your `.vscode/settings.json`:

```json
{
 "cursor.exclude": {
 "/.{env,env.*,credentials,secrets,*.pem,*.key}": true
 },
 "files.exclude": {
 "/.env*": true,
 "/secrets": true
 }
}
```

This prevents Cursor's AI from reading excluded files while maintaining normal file operations.

Disabling Cursor's Codebase Indexing for Sensitive Directories

Cursor's codebase indexing feature scans your entire project to enable semantic search. To exclude directories from the index, open Cursor Settings > Features > Codebase Indexing and add ignore patterns. Any directory matching these patterns will not be indexed, providing an additional layer of protection independent of the rules file.

Step 4 - Configure Claude Code (Anthropic)

Claude Code provides explicit controls for file access through its configuration system.

Using CLAUDE.md for Project Rules

Create a `CLAUDE.md` file in your project root to instruct Claude about file exclusions:

```markdown
Project Guidelines

Step 5 - Excluded Files
Do not read or analyze the following files:
- .env* files
- /secrets/ directory
- /credentials/ directory
- *.pem, *.key files
- config/secrets.*

Step 6 - Context Rules
- Never include environment variables in code suggestions
- Avoid suggesting patterns that require hardcoded secrets
- Recommend environment variable patterns instead of hardcoded values
```

Claude Code Local Rules

For system-wide exclusions, edit your Claude Code configuration:

```bash
Edit global config
claude config set --global excludePatterns "[\"/.env*\", \"/secrets/\", \"/*.pem\"]"
```

This ensures all projects using Claude Code automatically exclude sensitive patterns.

Step 7 - Configure Windsurf and Codeium

Windsurf (formerly Codeium) offers workspace-level context controls through its settings panel. Open Windsurf Settings > AI Context and configure the ignore list:

```
.env
.env.*
/secrets
/credentials
/*.pem
/*.key
*serviceAccountKey*
```

Codeium also respects a `.codeiumignore` file at the project root, following the same syntax as `.gitignore`. This file takes precedence over workspace settings for per-repository control.

Best Practices for Secret Management

Beyond configuring AI tools, adopting secret management practices provides defense in depth.

Environment File Structure

Use a `.env.example` file that contains only placeholder values:

```bash
.env.example (safe to commit)
DATABASE_URL=postgres://user:password@localhost:5432/db
API_KEY=your_api_key_here
```

Your actual `.env` file stays in `.gitignore`. Team members copy the example and fill in their own values locally.

Dedicated Secrets Directory

Consider a structured approach for larger projects:

```
config/
 development.env
 production.env
 secrets/ # Add to .gitignore
  api-keys.env
  database-creds.env
```

This separation makes it easier to apply broad exclusion patterns while keeping configuration organized.

Using Secret Management Services

For production systems, integrate dedicated secret management:

```python
Instead of reading .env directly
import os
from secretmanager import get_secret

Recommended pattern
api_key = get_secret("production-api-key")
```

Tools like AWS Secrets Manager, HashiCorp Vault, or Doppler provide APIs that your code uses at runtime, eliminating the need for env files in your codebase entirely.

Step 8 - Pre-Commit Hooks as a Safety Net

Even with AI tools properly configured, a pre-commit hook provides a final line of defense before secrets reach version control. Tools like `git-secrets` and `detect-secrets` can catch accidental commits:

```bash
Install git-secrets
brew install git-secrets

Configure it for your repo
cd your-project
git secrets --install
git secrets --register-aws

Add custom patterns
git secrets --add 'PRIVATE_KEY'
git secrets --add 'sk-[a-zA-Z0-9]{32,}'
```

The `detect-secrets` tool from Yelp takes a different approach, creating a baseline file of known false positives so the scanner remains accurate over time:

```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
Commit the baseline, then add to pre-commit hooks
```

These tools run before every commit and reject pushes that contain strings matching secret patterns. They complement AI tool exclusions rather than replacing them. the AI configuration prevents inadvertent context exposure, while the pre-commit hooks catch any residual secrets that end up in code.

Step 9 - Verification and Testing

After configuring your AI tools, verify the exclusions work correctly.

Testing Copilot Exclusions

Open a file containing a secret and attempt a Copilot suggestion. If properly excluded, Copilot should not reference the secret value in its suggestions.

Testing Claude Exclusions

Ask Claude to read a forbidden file:

```
Read the contents of .env
```

Claude should respond that the file is excluded per project rules.

Regular Audits

Periodically review your configuration:

1. Check that `.gitignore` includes all secret file patterns

2. Verify AI tool configuration files exist and are current

3. Scan your repository for accidentally committed secrets using tools like git-secrets or TruffleHog

Scanning Git History for Leaked Secrets

If your project has been running for some time, it is worth scanning the entire commit history for previously leaked secrets, not just the current working tree:

```bash
TruffleHog scans entire git history
trufflehog git file://. --only-verified

gitleaks is another reliable option
gitleaks detect --source . --log-opts="--all"
```

Rotate any secrets discovered in history immediately, then remove them using BFG Repo-Cleaner or `git filter-repo` before the next push.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to configure ai coding tools to exclude secrets and env?

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

- [Best Way to Configure AI Coding Tools to Follow Your Databas](/best-way-to-configure-ai-coding-tools-to-follow-your-databas/)
- [Configure AI Coding Tools](/how-to-configure-ai-coding-tools-to-respect-your-teams-branc/)
- [AI Tools for Automated Secrets Rotation and Vault Management](/ai-tools-for-automated-secrets-rotation-and-vault-management/)
- [Best Way to Configure Claude Code to Understand Your Interna](/best-way-to-configure-claude-code-to-understand-your-interna/)
- [Best Way to Configure CursorRules for Python FastAPI Project](/best-way-to-configure-cursorrules-for-python-fastapi-project/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
