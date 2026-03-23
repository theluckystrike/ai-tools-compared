---
layout: default
title: "How to Migrate Cursor Rules File"
description: "A practical guide for developers on migrating Cursor rules files to Windsurf's rules format, with code examples and step-by-step instructions"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /migrate-cursor-rules-file-to-windsurf-rules-format-guide/
categories: [guides]
tags: [ai-tools-compared, tools]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


If you have been using Cursor's custom rules configuration and want to switch to Windsurf, you need to understand how to translate your existing rules. Both tools use rule-based systems to customize AI behavior, but they have different file formats and structures. This guide walks you through the migration process with practical examples.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1: Understand Cursor Rules and Windsurf Rules

Cursor uses a rules system that allows you to define custom instructions, coding standards, and behavior patterns for its AI assistant. These rules typically live in configuration files within your project or in Cursor's settings. The rules control how the AI responds to prompts, what code styles to follow, and which frameworks or libraries to prioritize.

Windsurf, developed by Codeium, implements its own rules engine with a slightly different structure. While both systems aim to achieve similar goals, Windsurf uses YAML-based configuration with specific sections for different rule types. Understanding these differences is the first step toward successful migration.

Step 2: Locating Your Cursor Rules Files

Before migrating, locate all your Cursor rules files. They typically appear in these locations:

- Project-level: `.cursor/rules/` directory in your project root
- Workspace-level: Stored in Cursor's settings under the rules section
- Custom rule files you have created manually

Review each file and note the types of rules you have defined. Common rule categories include code style preferences, framework-specific guidelines, testing requirements, and documentation standards.

Step 3: Format Differences at a Glance

Before looking at conversion, understanding the structural differences saves time.

| Aspect | Cursor | Windsurf |
|---|---|---|
| Primary format | Markdown-style plain text | YAML |
| File location | `.cursor/rules/*.md` or `.cursorrules` | `.windsurfrules` |
| Instruction style | Free-form prose and bullet points | Structured key-value pairs |
| Framework rules | Inline text descriptions | Nested YAML sections |
| Conditional logic | Not supported natively | Supported via `conditions:` |
| Code examples | Inline markdown | Referenced external files |

The key insight is that Cursor rules are intentionally informal. they read like instructions written to a human. Windsurf rules are more structured, resembling a configuration file. This means migration involves converting prose instructions into discrete YAML keys.

Step 4: Converting Cursor Rules to Windsurf Format

Basic Rule Structure Conversion

Cursor rules often look like this:

```
Example Cursor rule
[Code Style]
- Use TypeScript for all new files
- Prefer functional components in React
- Use camelCase for variables and functions

[Testing]
- Write Jest tests for all utility functions
- Minimum 80% code coverage required

[Documentation]
- Use JSDoc for all public functions
- Include examples in docstrings
```

For Windsurf, you need to restructure this into YAML format. Here is the equivalent Windsurf configuration:

```yaml
rules:
  code_style:
    typescript: true
    react_preference: functional
    naming_convention: camelCase

  testing:
    framework: jest
    min_coverage: 80

  documentation:
    use_jsdoc: true
    include_examples: true
```

Handling Complex Rule Transformations

Some Cursor rules require more complex transformations. Consider a Cursor rule that specifies file organization:

```
[File Organization]
- Keep components in src/components
- Put utilities in src/utils
- Store types in src/types
- Group related files by feature
```

In Windsurf, this becomes:

```yaml
rules:
  file_organization:
    paths:
      components: src/components
      utils: src/utils
      types: src/types
    grouping_strategy: feature_based
```

Framework-Specific Rules Migration

If your Cursor rules include framework-specific instructions, Windsurf handles these through its own framework detection and customization system:

```yaml
rules:
  frameworks:
    react:
      hooks:
        - useState
        - useEffect
        - useCallback
        - useMemo
      patterns:
        - composition
        - custom_hooks
    nextjs:
      app_router: true
      server_components: preferred
```

Step 5: Step-by-Step Migration Process

Follow these steps to migrate your rules:

1. Export your Cursor rules: Open Cursor settings and navigate to the rules section. Export all custom rules you have created or modified.

2. Categorize each rule: Group your rules by type. code style, testing, documentation, file organization, or framework-specific.

3. Create Windsurf config file: In your project root, create or edit the Windsurf configuration file (typically `.windsurfrules` or defined in Windsurf settings).

4. Convert each rule category: Use the conversion examples above as templates. Adjust values to match your original intent.

5. Test the migrated rules: Start Windsurf and verify that your rules are being applied correctly. Make adjustments as needed.

Step 6: Common Migration Challenges

Inline Code Examples

Cursor rules often include inline code examples. Windsurf handles these differently. you may need to reference external files or adjust how examples are specified:

```yaml
rules:
  code_examples:
    preferred_patterns:
      - file: patterns/react-hooks.ts
        description: "Custom hook pattern"
      - file: patterns/error-handling.ts
        description: "Error handling pattern"
```

Conditional Rules

If your Cursor rules include conditional logic, Windsurf's YAML structure may require restructuring:

```yaml
rules:
  environment_aware:
    conditions:
      - when: "project.typescript"
        apply:
          strict_mode: true
      - when: "project.react"
        apply:
          component_structure: functional
```

Prose Instructions That Cannot Be Directly Mapped

Some Cursor rules are inherently conversational and do not map cleanly to YAML keys. For example:

```
When writing API route handlers, always validate request body shape
using Zod before processing. Return 422 with a descriptive error
message if validation fails.
```

Windsurf handles this through a `behavior:` or `custom_instructions:` block as free-form text:

```yaml
rules:
  custom_instructions: |
    When writing API route handlers, always validate request body shape
    using Zod before processing. Return 422 with a descriptive error
    message if validation fails.
```

Keep prose instructions concise. Windsurf's AI interprets them similarly to how Cursor does, but overly long instructions can produce inconsistent results.

Step 7: Work with Global vs. Project-Level Rules

Both Cursor and Windsurf support two scopes of rules: global (applied to all projects) and project-level (applied only to the current project).

Cursor: Global rules live in Cursor's settings UI. Project rules live in `.cursor/rules/` or `.cursorrules` at the project root.

Windsurf: Global rules are configured in Windsurf's preferences. Project rules go in `.windsurfrules` at the project root.

When migrating, identify which of your Cursor rules are project-specific versus team-wide conventions. Project-specific rules go into `.windsurfrules`. Team-wide conventions should be set globally in Windsurf preferences or committed to a shared configuration repository.

Step 8: Verify Your Migration

After converting your rules, verify they work correctly in Windsurf:

- Create a new file and check if code style rules apply
- Run your test suite to confirm testing rules are followed
- Generate documentation to ensure docstring requirements are met
- Ask Windsurf to explain its understanding of your rules

If something does not work as expected, check the Windsurf documentation for the latest configuration options, as both tools regularly update their rules systems.

A useful verification prompt to give Windsurf after setting up your rules: "Summarize the rules you have for this project in bullet points." This confirms Windsurf has parsed your `.windsurfrules` file correctly and is applying the right constraints.

Step 9: Keeping Rules Synchronized During Transition

If your team is gradually migrating from Cursor to Windsurf and some members still use Cursor, maintaining both rule files during the transition period is practical. Keep `.cursorrules` and `.windsurfrules` in sync manually, or write a simple script that reads your canonical rule source and generates both formats.

```bash
#!/bin/bash
generate both rule files from a shared source
Not a production-ready script. adapt to your actual rule format
echo "Generating Cursor rules from shared source..."
your conversion logic here

echo "Generating Windsurf rules from shared source..."
your conversion logic here
```

Committing both files to your repository ensures all team members get the correct AI behavior regardless of which editor they use.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

Do Windsurf rules update automatically when I change `.windsurfrules`?

Windsurf typically picks up changes to `.windsurfrules` without requiring a restart, but a session refresh may be needed for complex rule changes to take effect.

Can I import my Cursor rules directly into Windsurf without manual conversion?

As of 2026, there is no automated import tool. The conversion is manual. However, if you use AI assistance to help with the conversion. paste your `.cursorrules` into Claude or ChatGPT and ask it to convert to Windsurf YAML format. the process takes minutes rather than hours.

What happens if my `.windsurfrules` has a YAML syntax error?

Windsurf typically logs an error and falls back to default behavior. Check Windsurf's output panel or logs for parsing errors after editing your rules file.

Are Windsurf rules shared with Codeium's servers?

Review Codeium's privacy policy for current details. Project-level rules in `.windsurfrules` are read locally. Whether rule content is transmitted as part of context depends on how Windsurf sends prompts to its backend.

Related Articles

- [Migrate Windsurf AI Rules to Cursor Dot Cursor Rules Format](/migrate-windsurf-ai-rules-to-cursor-dot-cursor-rules-format/)
- [Migrating Copilot Custom Instructions to Cursor Rules.](/migrating-copilot-custom-instructions-to-cursor-rules-file-f/)
- [How to Migrate Cursor AI Snippets and Templates](/migrate-cursor-ai-snippets-and-templates-to-windsurf-editor/)
- [Windsurf Cascade vs Cursor Composer: Multi-File AI Editing](/windsurf-cascade-vs-cursor-composer-multi-file-ai-editing-co/)
- [Migrate ChatGPT System Prompts](/migrate-chatgpt-system-prompts-to-claude-system-prompt-format/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
