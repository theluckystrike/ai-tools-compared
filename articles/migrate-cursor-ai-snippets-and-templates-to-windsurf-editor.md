---
layout: default
title: "How to Migrate Cursor AI Snippets and Templates"
description: "A practical guide for developers moving their custom snippets and templates from Cursor AI to WindSurf. Includes code examples and step-by-step"
date: 2026-03-16
last_modified_at: 2026-03-22
author: theluckystrike
permalink: /migrate-cursor-ai-snippets-and-templates-to-windsurf-editor/
reviewed: true
score: 9
categories: [guides]
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---
---
layout: default
title: "How to Migrate Cursor AI Snippets and Templates"
description: "A practical guide for developers moving their custom snippets and templates from Cursor AI to WindSurf. Includes code examples and step-by-step"
date: 2026-03-16
last_modified_at: 2026-03-22
author: theluckystrike
permalink: /migrate-cursor-ai-snippets-and-templates-to-windsurf-editor/
reviewed: true
score: 9
categories: [guides]
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Developers who have invested time building custom snippets and templates in Cursor AI often face a challenge when trying to move to WindSurf. While both editors share roots in Visual Studio Code, their approaches to custom AI-assisted content differ in ways that affect how you transfer your workflows. This guide walks through the practical steps of migrating your Cursor snippets and templates to WindSurf, with working code examples you can apply immediately.

Key Takeaways

- On Windows: check `%APPDATA%\Cursor\User\snippets\`.
- On macOS: they're typically stored in `~/Library/Application Support/Cursor/User/snippets/` or `~/.cursor/extensions/`.
- On macOS: this is `~/Library/Application Support/WindSurf/User/snippets/`.
- WindSurf, developed by Codeium, takes a different approach: it uses a combination of VS Code's native snippet system and its own AI context files.
- WindSurf uses the `scope`: field to define where the snippet applies, and the JSON format requires careful attention to commas between properties.
- WindSurf uses a different: mechanism called `windrules` for project-specific AI behavior.

Understanding the Difference Between Cursor and WindSurf

Cursor stores user snippets in a JSON format within its configuration directory. These snippets appear as AI-completable options when you type trigger words or invoke the AI completion feature. WindSurf, developed by Codeium, takes a different approach, it uses a combination of VS Code's native snippet system and its own AI context files.

Before migrating, locate your Cursor snippet files. On macOS, they're typically stored in `~/Library/Application Support/Cursor/User/snippets/` or `~/.cursor/extensions/`. On Windows, check `%APPDATA%\Cursor\User\snippets\`. You'll find JSON files containing your custom snippets and template definitions.

Exporting Your Cursor Snippets

Start by gathering all your Cursor snippets. Create a backup directory and copy the relevant files:

```bash
mkdir ~/cursor-migration-backup
cp -r ~/.cursor/User/snippets/* ~/cursor-migration-backup/ 2>/dev/null
Also check for template files
find ~/.cursor -name "*.cursortemplate" -o -name "*template*.json" 2>/dev/null | xargs -I {} cp {} ~/cursor-migration-backup/
```

Open each JSON file and examine its structure. Cursor snippets typically follow this pattern:

```json
{
  "react-component-basic": {
    "prefix": "rccb",
    "body": [
      "import React from 'react';",
      "",
      "export const ${1:ComponentName} = (props) => {",
      "  return (",
      "    <div>",
      "      {$1}",
      "    </div>",
      "  );",
      "};"
    ],
    "description": "Basic React functional component"
  }
}
```

Note the use of tabstops ( `$1`, `$2` ) for cursor positioning after expansion.

Converting to WindSurf Format

WindSurf supports VS Code-compatible snippets directly. The primary conversion involves transforming your Cursor JSON snippets into VS Code's snippet format, which WindSurf recognizes automatically.

Create a new snippet file in WindSurf's configuration directory. On macOS, this is `~/Library/Application Support/WindSurf/User/snippets/`. On Windows, check `%APPDATA%\WindSurf\User\snippets\`. Create a folder named after your programming language:

```bash
mkdir -p ~/Library/Application Support/WindSurf/User/snippets/javascript
```

Now create your snippet file with the `.code-snippets` extension:

```json
{
  "React Functional Component": {
    "prefix": "rccb",
    "body": [
      "import React from 'react';",
      "",
      "export const ${1:ComponentName} = (props) => {",
      "  return (",
      "    <div>",
      "      $1",
      "    </div>",
      "  );",
      "};"
    ],
    "description": "Basic React functional component",
    "scope": "javascript,typescript,typescriptreact"
  }
}
```

The structure closely mirrors Cursor's format, with a few key differences. WindSurf uses the `scope` field to define where the snippet applies, and the JSON format requires careful attention to commas between properties.

Migrating AI Prompt Templates

If you've created custom AI prompt templates in Cursor, these require more attention. Cursor stores prompt templates in a separate configuration file, typically named `cursorrules` or stored in the `.cursorrules` file at your project root. WindSurf uses a different mechanism called `windrules` for project-specific AI behavior.

Extract your Cursor rules:

```bash
Find and copy your cursorrules files
find ~ -name ".cursorrules" -o -name "cursorrules.json" 2>/dev/null
```

Create a corresponding `windrules` file in your project root. The format differs significantly, Cursor uses a more verbose JSON structure while Windurf prefers a simpler YAML-like format:

```yaml
windrules
version: "1.0"
context:
  - type: "file"
    pattern: "/*.{ts,tsx}"
  - type: "directory"
    path: "./src"

ai_behavior:
  max_tokens: 4096
  temperature: 0.7

custom_prompts:
  code_review: |
    Review the following code for potential bugs and improvements.
    Focus on:
    - Security vulnerabilities
    - Performance issues
    - Code readability

    {{code}}

  generate_tests: |
    Generate unit tests for the following function.
    Use the testing framework established in the project.

    {{code}}
```

Handling Tab Completion Differences

Cursor's Tab completion behaves slightly differently from WindSurf's. In Cursor, pressing Tab accepts the entire suggestion instantly. WindSurf uses a two-step process, you preview the suggestion, then press Tab to accept. Adjust your snippet trigger prefixes to account for this:

```json
{
  "Quick Console Log": {
    "prefix": "cl",
    "body": [
      "console.log('$1:', $1);"
    ],
    "description": "Quick console log with label",
    "scope": "javascript,typescript"
  }
}
```

Batch Migration Script

For developers with extensive snippet collections, create a migration script:

```python
#!/usr/bin/env python3
import json
import os
import shutil

def migrate_cursor_snippets(cursor_snippets_dir, windsnap_user_dir):
    os.makedirs(windsnap_user_dir, exist_ok=True)

    for filename in os.listdir(cursor_snippets_dir):
        if filename.endswith('.json'):
            with open(os.path.join(cursor_snippets_dir, filename), 'r') as f:
                snippets = json.load(f)

            # Transform and save in WindSurf format
            output_filename = filename.replace('.json', '.code-snippets')
            output_path = os.path.join(windsnap_user_dir, output_filename)

            with open(output_path, 'w') as f:
                json.dump(snippets, f, indent=2)

            print(f"Migrated: {filename} -> {output_filename}")

if __name__ == "__main__":
    cursor_dir = os.path.expanduser("~/.cursor/User/snippets")
    windsnap_dir = os.path.expanduser("~/Library/Application Support/WindSurf/User/snippets")

    if os.path.exists(cursor_dir):
        migrate_cursor_snippets(cursor_dir, windsnap_dir)
        print("Migration complete!")
    else:
        print("Cursor snippets directory not found")
```

Run this script after installing WindSurf to batch-convert your snippet collection.

Feature Comparison: Cursor vs WindSurf Snippets

Understanding which features translate directly and which require manual adjustment helps you prioritize migration effort:

| Feature | Cursor | WindSurf | Migration Effort |
|---|---|---|---|
| Basic snippet JSON format | `.json` in User/snippets | `.code-snippets` in User/snippets | Low. rename extension |
| Tabstops (`$1`, `$2`) | Supported | Supported | None |
| Placeholder labels (`${1:name}`) | Supported | Supported | None |
| `scope` field for file types | Not required | Required for scoping | Low. add field |
| AI rules file | `.cursorrules` | `.windrules` | Medium. reformat |
| AI context injection | Via rules file | Via rules file + Cascade | Medium |
| Editor-wide AI shortcuts | Cmd+K / Cmd+L | Cmd+I (Cascade) | Manual remapping |

Items marked Low can be handled by the batch migration script above. Items marked Medium require manual review of your `.cursorrules` content and rewriting in WindSurf's preferred YAML structure.

Migrating Workspace-Level Snippets

Beyond user-level snippets, Cursor supports workspace-specific snippets stored inside your project's `.vscode/` directory. WindSurf reads the same directory, so these snippets often migrate without any changes. Verify by opening WindSurf in your project root and triggering the snippet prefix in a relevant file.

If workspace snippets fail to appear, check that the `.code-snippets` file is present in `.vscode/` and that its `scope` field matches the file type you are editing. WindSurf enforces scope more strictly than Cursor in some configurations.

For teams sharing snippets across multiple developers via version control, move your workspace snippets into `.vscode/` and commit them to the repository. Both editors will pick them up automatically, making the transition gradual rather than a hard cutover.

Translating Cursor Composer Prompts to WindSurf Cascade

Cursor's Composer is a multi-file AI editing interface. Developers who use Composer heavily often have refined prompt patterns saved in notes or documentation, these need to be adapted for WindSurf's Cascade interface, which operates similarly but with different context controls.

Key differences to account for when translating prompts:

Context scope. In Cursor Composer, you use `@file` and `@folder` mentions to add context. In WindSurf Cascade, context is controlled through the windrules file or by highlighting code before opening Cascade. Explicitly referencing file paths in your prompt text still works in both tools.

Multi-step instructions. Cascade handles sequential instructions well when you number them clearly. If your Cursor Composer prompts use implicit ordering ("first do X, then Y"), make the order explicit in WindSurf to avoid step-skipping.

Refactoring prompts. Cursor Composer allows you to apply changes across multiple files in a single session. WindSurf Cascade supports the same capability, open the relevant files in tabs before starting a Cascade session, and they become available in context automatically.

A Cursor Composer prompt like:

```
Refactor @services/auth.ts and @middleware/validate.ts to use the new
UserSession type defined in @types/session.ts. Update all call sites.
```

Translates to this Cascade prompt:

```
Refactor services/auth.ts and middleware/validate.ts to use the new
UserSession type defined in types/session.ts. Update all call sites
in both files and any imports that reference the old type.
```

The @ syntax is optional in Cascade if the files are already open in your editor workspace. The explicit file path reference serves the same purpose.

Verifying Your Migration

After migration, restart WindSurf and test each snippet by typing its prefix. Check that tabstops work correctly and that the `scope` settings apply to the right file types. Open the Command Palette (Cmd+Shift+P) and search for "Snippets" to see all loaded user snippets.

Compare the output with your original Cursor setup. If certain snippets don't appear, check that the JSON syntax is valid, missing commas or malformed structures cause silent failures.

Maintaining Both Editors

Many developers use both Cursor and WindSurf during transition periods. Create a sync script that copies your snippets to both editors:

```bash
#!/bin/bash
SNIPPETS_DIR="$HOME/Library/Application Support/WindSurf/User/snippets"
CURSOR_SNIPPETS="$HOME/.cursor/User/snippets"

Sync from Cursor to WindSurf
rsync -av --include='*/' --include='*.json' --exclude='*' "$CURSOR_SNIPPETS/" "$SNIPPETS_DIR/"

Rename to code-snippets
for file in "$SNIPPETS_DIR"/*.json; do
    mv "$file" "${file%.json}.code-snippets"
done

echo "Snippets synchronized"
```

This approach keeps both editors in sync while you evaluate WindSurf's capabilities.

Frequently Asked Questions

How long does it take to migrate cursor ai snippets and templates?

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

- [How to Migrate VSCode Copilot Keybindings](/migrate-vscode-copilot-keybindings-to-cursor-ai-editor-2026/)
- [How to Migrate Cursor Rules File](/migrate-cursor-rules-file-to-windsurf-rules-format-guide/)
- [Migrate Windsurf AI Rules to Cursor Dot Cursor Rules Format](/migrate-windsurf-ai-rules-to-cursor-dot-cursor-rules-format/)
- [How to Move Copilot Suggested Code Patterns to Cursor](/how-to-move-copilot-suggested-code-patterns-to-cursor-snippets/)
- [How to Transfer Cursor Editor Theme and Layout](/transfer-cursor-editor-theme-and-layout-to-vscode-with-copil/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
