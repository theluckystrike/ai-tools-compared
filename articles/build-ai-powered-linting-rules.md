---
layout: default
title: "How to Build AI-Powered Linting Rules"
description: "Build custom ESLint and Pylint rules powered by Claude and GPT-4 that enforce team conventions, detect anti-patterns, and auto-suggest fixes with AST analysis"
date: 2026-03-22
author: theluckystrike
permalink: /build-ai-powered-linting-rules/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Standard linters enforce syntax and style. AI-powered linting rules can detect semantic anti-patterns, enforce team-specific conventions, and generate natural language explanations for violations. This guide covers two approaches: using AI to generate custom ESLint rules, and building an AI linting layer that runs alongside standard linters.

Approach 1 - AI-Generated ESLint Rules

ESLint rules operate on the AST (Abstract Syntax Tree). Writing them from scratch requires deep ESLint API knowledge. AI tools can generate the rule code from a plain English description.

Prompt to Claude:

```
Write an ESLint rule called "no-direct-env-access" that:
- Disallows direct process.env.VARIABLE_NAME access outside of config files
- Allows process.env access in files matching: config.ts, config.js, *.config.ts, env.ts
- Requires environment variables to be accessed through a config module instead
- Provides an auto-fix suggestion showing how to move the access to a config module
- Works with ESLint 8+ flat config format
```

Claude's ESLint rule:

```javascript
// rules/no-direct-env-access.js
'use strict';

const ALLOWED_FILE_PATTERNS = [
  /config\.(ts|js|mjs)$/,
  /\.config\.(ts|js|mjs)$/,
  /env\.(ts|js|mjs)$/,
  /environment\.(ts|js|mjs)$/,
];

/ @type {import('eslint').Rule.RuleModule} */
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

Flat config registration:

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

Writing Rules for React-Specific Patterns

The same approach works for React-specific conventions. Here is a rule that catches direct DOM manipulation inside React components. a common mistake in teams migrating from jQuery or vanilla JS:

```javascript
// rules/no-direct-dom-in-react.js
'use strict';

const DOM_ACCESS_METHODS = new Set([
  'getElementById', 'querySelector', 'querySelectorAll',
  'getElementsByClassName', 'getElementsByTagName',
]);

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct DOM manipulation inside React components',
    },
    messages: {
      noDomAccess: 'Avoid {{method}}() in React components. Use useRef() or state instead.',
    },
  },

  create(context) {
    let insideComponent = false;

    return {
      // Detect function components
      'FunctionDeclaration, ArrowFunctionExpression'(node) {
        const returnType = node.returnType?.typeAnnotation;
        const returnsJSX = returnType?.typeName?.name === 'JSX.Element' ||
                           returnType?.typeName?.name === 'ReactElement';
        if (returnsJSX) insideComponent = true;
      },
      'FunctionDeclaration:exit, ArrowFunctionExpression:exit'() {
        insideComponent = false;
      },

      CallExpression(node) {
        if (!insideComponent) return;
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'document' &&
          DOM_ACCESS_METHODS.has(callee.property.name)
        ) {
          context.report({
            node,
            messageId: 'noDomAccess',
            data: { method: callee.property.name },
          });
        }
      },
    };
  },
};
```

Approach 2 - AI Linting Layer

An AI linting layer runs after standard linters and catches semantic issues that AST-based rules can't detect:

```python
ai_linter.py
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
        lines.append(f"  {severity} line {line} [{rule}]: {desc}")
        if fix := f.get("fix"):
            lines.append(f"    Fix: {fix}")
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

Example AI linting output:

```
AI Lint - src/api/users.js
  ERROR line 34 [sql_injection_risk]: String interpolation in SQL query via user input
    Fix - Use parameterized query: db.query('SELECT * FROM users WHERE id = $1', [userId])
  WARNING line 67 [unhandled_rejection]: Promise-returning function called without await or .catch()
    Fix - Add await or .catch((err) => logger.error(err)) to sendEmail() call
  WARNING line 89 [n_plus_one_query]: Loop contains a database query. fetches N queries for N items
    Fix - Fetch all items in one query using WHERE id IN (...) before the loop
```

Feeding Existing Linter Output to the AI

The `existing_lint_output` parameter lets you chain standard linters with the AI layer. Run ESLint first, pass its output to the AI, and instruct the AI not to repeat what ESLint already found. This avoids duplication and focuses the AI on genuinely semantic issues:

```python
def lint_file_with_chain(file_path: str) -> list[dict]:
    """Run ESLint first, then pass output to AI linter."""
    import subprocess

    # Run ESLint
    result = subprocess.run(
        ['npx', 'eslint', '--format', 'compact', file_path],
        capture_output=True, text=True
    )
    eslint_output = result.stdout.strip()

    # AI layer with ESLint context
    return run_ai_lint(file_path, existing_lint_output=eslint_output)
```

GPT-4 for Rule Generation

GPT-4 generates ESLint rules with similar quality to Claude. The main difference: Claude is more likely to include `hasSuggestions: true` and the `suggest` property (auto-fix suggestions without auto-applying), which is the correct ESLint 8+ pattern. GPT-4 often generates rules with `fixable: 'code'` that auto-apply changes, which is more aggressive.

For Python, both tools generate `pylint` plugin rules and `flake8` extensions, but Claude more consistently generates the correct `check_node` method signature for pylint.

Generating Pylint Checkers

For Python codebases, here is the equivalent approach for pylint:

```python
checkers/no_print_statements.py
"""Pylint checker: disallow print() calls in production code."""
from pylint.checkers import BaseChecker
from pylint.interfaces import IAstroidChecker
import astroid


class NoPrintStatementChecker(BaseChecker):
    __implements__ = IAstroidChecker

    name = 'no-print-statements'
    msgs = {
        'W9001': (
            'print() call found. use logging instead',
            'no-print-statement',
            'Use the logging module instead of print() for production output.',
        ),
    }
    options = (
        (
            'allow-print-in-tests',
            {
                'default': True,
                'type': 'yn',
                'metavar': '<y or n>',
                'help': 'Allow print() calls in test files (test_*.py)',
            },
        ),
    )

    def visit_call(self, node: astroid.Call) -> None:
        if isinstance(node.func, astroid.Name) and node.func.name == 'print':
            filename = node.root().file or ''
            if self.config.allow_print_in_tests and 'test_' in filename:
                return
            self.add_message('no-print-statement', node=node)


def register(linter):
    linter.register_checker(NoPrintStatementChecker(linter))
```

Claude generates this with the correct `visit_call` AST visitor method and the `register()` function required by pylint's plugin system. GPT-4 sometimes uses `visit_expr` or other incorrect visitor names.

CI Integration

```yaml
.github/workflows/ai-lint.yml
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

Cost Control in CI

AI linting on every PR can accumulate costs quickly. A few strategies to manage this:

- File size limit. Skip AI lint for files over 500 lines; the context window cost grows and the signal-to-noise ratio drops
- Changed lines only. Pass only the git diff hunks to the AI rather than the full file
- Caching. Hash the file content and cache the AI lint result; re-use the cached result if the file hasn't changed since the last run
- Severity threshold. Only block PRs on `error` severity findings; treat `warning` as informational

```python
Cost-aware wrapper
import hashlib
import json
from pathlib import Path

CACHE_DIR = Path(".ai-lint-cache")
CACHE_DIR.mkdir(exist_ok=True)

def cached_ai_lint(file_path: str) -> list[dict]:
    content = Path(file_path).read_bytes()
    file_hash = hashlib.sha256(content).hexdigest()[:16]
    cache_file = CACHE_DIR / f"{file_hash}.json"

    if cache_file.exists():
        return json.loads(cache_file.read_text())

    findings = run_ai_lint(file_path)
    cache_file.write_text(json.dumps(findings))
    return findings
```

Related Reading

- [How to Build AI-Powered Code Formatters](/build-ai-powered-code-formatters/)
- [Open Source AI Code Linting Tools with Automatic Fix Suggestions](/open-source-ai-code-linting-tools-with-automatic-fix-suggest/)
- [Claude vs ChatGPT for Building Custom ESLint Rules for React](/claude-vs-chatgpt-for-building-custom-eslint-rules-for-react/)

---

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
