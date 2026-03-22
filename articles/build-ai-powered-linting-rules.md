---
layout: default
title: "How to Build AI-Powered Linting Rules"
description: "Build custom ESLint and Pylint rules powered by Claude and GPT-4 that enforce team conventions, detect anti-patterns, and auto-suggest fixes with AST analysis"
date: 2026-03-22
author: theluckystrike
permalink: /build-ai-powered-linting-rules/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Standard linters enforce syntax and style. AI-powered linting rules can detect semantic anti-patterns, enforce team-specific conventions, and generate natural language explanations for violations. This guide covers two approaches: using AI to generate custom ESLint rules, and building an AI linting layer that runs alongside standard linters.

## Approach 1: AI-Generated ESLint Rules

ESLint rules operate on the AST (Abstract Syntax Tree). Writing them from scratch requires deep ESLint API knowledge. AI tools can generate the rule code from a plain English description.

**Prompt to Claude:**

```
Write an ESLint rule called "no-direct-env-access" that:
- Disallows direct process.env.VARIABLE_NAME access outside of config files
- Allows process.env access in files matching: config.ts, config.js, *.config.ts, env.ts
- Requires environment variables to be accessed through a config module instead
- Provides an auto-fix suggestion showing how to move the access to a config module
- Works with ESLint 8+ flat config format
```

**Claude's ESLint rule:**

```javascript
// rules/no-direct-env-access.js
'use strict';

const ALLOWED_FILE_PATTERNS = [
  /config\.(ts|js|mjs)$/,
  /\.config\.(ts|js|mjs)$/,
  /env\.(ts|js|mjs)$/,
  /environment\.(ts|js|mjs)$/,
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow direct process.env access outside config files',
      category: 'Best Practices',
      recommended: false,
      url: 'https://your-team-docs/lint-rules/no-direct-env-access',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          configModule: {
            type: 'string',
            default: '@/config',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      directEnvAccess:
        "Avoid accessing process.env.{{name}} directly. Import from config module instead.",
      suggestion: "Move to config module: import { {{varName}} } from '{{configModule}}'",
    },
  },

  create(context) {
    const filename = context.getFilename();
    const isAllowedFile = ALLOWED_FILE_PATTERNS.some((pattern) => pattern.test(filename));

    if (isAllowedFile) return {};

    const configModule = context.options[0]?.configModule ?? '@/config';

    return {
      MemberExpression(node) {
        // Detect: process.env.VARIABLE_NAME
        if (
          node.object.type === 'MemberExpression' &&
          node.object.object.type === 'Identifier' &&
          node.object.object.name === 'process' &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'env' &&
          node.property.type === 'Identifier'
        ) {
          const envVarName = node.property.name;
          // Convert ENV_VAR_NAME to camelCase for config module suggestion
          const camelCaseName = envVarName
            .toLowerCase()
            .replace(/_([a-z])/g, (_, char) => char.toUpperCase());

          context.report({
            node,
            messageId: 'directEnvAccess',
            data: { name: envVarName },
            suggest: [
              {
                messageId: 'suggestion',
                data: { varName: camelCaseName, configModule },
                fix(fixer) {
                  // Replace process.env.DATABASE_URL with config.databaseUrl
                  return fixer.replaceText(node, `config.${camelCaseName}`);
                },
              },
            ],
          });
        }
      },
    };
  },
};
```

**Flat config registration:**

```javascript
// eslint.config.js
import noDirectEnvAccess from './rules/no-direct-env-access.js';

export default [
  {
    plugins: {
      'team-rules': {
        rules: {
          'no-direct-env-access': noDirectEnvAccess,
        },
      },
    },
    rules: {
      'team-rules/no-direct-env-access': ['error', { configModule: '@/config' }],
    },
  },
];
```

## Approach 2: AI Linting Layer

An AI linting layer runs after standard linters and catches semantic issues that AST-based rules can't detect:

```python
# ai_linter.py
import anthropic
import json
import subprocess
import sys
from pathlib import Path

client = anthropic.Anthropic()

LINTING_SYSTEM = """You are a senior code reviewer acting as an AI linting tool.
Analyze the provided code for:

1. Security vulnerabilities (SQL injection, XSS, hardcoded secrets, unsafe eval)
2. Performance anti-patterns (N+1 queries, unnecessary re-renders, unbounded loops)
3. Error handling gaps (unhandled promise rejections, missing try/catch on async ops)
4. Memory leak patterns (event listeners not removed, timers not cleared)
5. Team convention violations (from context provided)

For each issue:
- Provide file:line reference
- Severity: error | warning | info
- Short rule name (snake_case)
- One-sentence description
- Code fix suggestion

Return JSON array of findings. Return empty array [] if no issues found.
Do NOT report issues already caught by ESLint/Pylint."""


def run_ai_lint(file_path: str, existing_lint_output: str = "") -> list[dict]:
    """Run AI linting on a file."""
    source = Path(file_path).read_text()

    context = f"Existing linter found: {existing_lint_output}" if existing_lint_output else ""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        system=LINTING_SYSTEM,
        messages=[{
            "role": "user",
            "content": f"File: {file_path}\n{context}\n\nCode:\n{source}"
        }]
    )

    response = message.content[0].text
    if "```json" in response:
 response = response.split("```json")[1].split("```")[0]

 try:
 return json.loads(response.strip())
 except json.JSONDecodeError:
 return []


def format_findings(findings: list[dict], file_path: str) -> str:
 if not findings:
 return ""

 lines = [f"\nAI Lint: {file_path}"]
 for f in findings:
 severity = f.get("severity", "warning").upper()
 line = f.get("line", "?")
 rule = f.get("rule", "unknown")
 desc = f.get("description", "")
 lines.append(f" {severity} line {line} [{rule}]: {desc}")
 if fix := f.get("fix"):
 lines.append(f" Fix: {fix}")
 return "\n".join(lines)


if __name__ == "__main__":
 files = sys.argv[1:]
 total_issues = 0
 for f in files:
 findings = run_ai_lint(f)
 if findings:
 print(format_findings(findings, f))
 total_issues += len([x for x in findings if x.get("severity") == "error"])

 sys.exit(1 if total_issues > 0 else 0)
```

**Example AI linting output:**

```
AI Lint: src/api/users.js
 ERROR line 34 [sql_injection_risk]: String interpolation in SQL query via user input
 Fix: Use parameterized query: db.query('SELECT * FROM users WHERE id = $1', [userId])
 WARNING line 67 [unhandled_rejection]: Promise-returning function called without await or .catch()
 Fix: Add await or .catch((err) => logger.error(err)) to sendEmail() call
 WARNING line 89 [n_plus_one_query]: Loop contains a database query — fetches N queries for N items
 Fix: Fetch all items in one query using WHERE id IN (...) before the loop
```

## GPT-4 for Rule Generation

GPT-4 generates ESLint rules with similar quality to Claude. The main difference: Claude is more likely to include `hasSuggestions: true` and the `suggest` property (auto-fix suggestions without auto-applying), which is the correct ESLint 8+ pattern. GPT-4 often generates rules with `fixable: 'code'` that auto-apply changes, which is more aggressive.

For Python, both tools generate `pylint` plugin rules and `flake8` extensions, but Claude more consistently generates the correct `check_node` method signature for pylint.

## CI Integration

```yaml
# .github/workflows/ai-lint.yml
name: AI Lint Check
on: [pull_request]

jobs:
 ai-lint:
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v4
 - run: pip install anthropic
 - name: Run AI linter on changed files
 env:
 ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
 run: |
 # Get changed files
 git diff --name-only origin/main...HEAD | grep -E '\.(js|ts|py)$' > changed_files.txt
 if [ -s changed_files.txt ]; then
 python ai_linter.py $(cat changed_files.txt)
 fi
```

## Related Reading

- [How to Build AI-Powered Code Formatters](/ai-tools-compared/build-ai-powered-code-formatters/)
- [Open Source AI Code Linting Tools with Automatic Fix Suggestions](/ai-tools-compared/open-source-ai-code-linting-tools-with-automatic-fix-suggest/)
- [Claude vs ChatGPT for Building Custom ESLint Rules for React](/ai-tools-compared/claude-vs-chatgpt-for-building-custom-eslint-rules-for-react/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
