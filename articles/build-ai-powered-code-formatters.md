---
layout: default
title: "How to Build AI-Powered Code Formatters"
description: "Step-by-step guide to building AI-powered code formatters using Claude and GPT-4 APIs with AST parsing, custom style rules, and CLI integration"
date: 2026-03-22
author: theluckystrike
permalink: /build-ai-powered-code-formatters/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Traditional formatters like Prettier and Black apply fixed rules. AI-powered formatters can understand context — they can normalize idioms, apply team-specific style preferences, rename variables for clarity, and transform legacy patterns. This guide shows how to build one using Claude or GPT-4 as the formatting engine.

## Architecture Overview

An AI-powered formatter has three components:

1. **Parser** — convert source to AST or extract code blocks for context
2. **AI engine** — Claude or GPT-4 with a formatting-focused system prompt
3. **Output reconciler** — merge formatted output back, handle diff-only mode

The key design decision: operate on raw text vs. AST. AST-based formatters are more precise but complex. Text-based formatters are simpler and work for most cases.

## Building a Basic TypeScript Formatter

Start with a TypeScript formatter that enforces team conventions beyond what Prettier handles:

```typescript
// formatter.ts
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const client = new Anthropic();

const FORMATTING_SYSTEM_PROMPT = `You are a TypeScript code formatter. When given TypeScript code, you:

1. Convert var to const/let appropriately
2. Replace .then()/.catch() chains with async/await
3. Add explicit return types to functions missing them
4. Replace string concatenation with template literals
5. Convert traditional function expressions to arrow functions where appropriate
6. Add trailing commas in multiline arrays and objects
7. Sort imports: node built-ins first, then external packages, then internal

Return ONLY the formatted code. No explanations. No markdown code fences.
Preserve all comments. Do not change logic or variable names.`;

async function formatTypeScript(sourceCode: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8096,
    system: FORMATTING_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Format this TypeScript code:\n\n${sourceCode}`,
      },
    ],
  });

  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textContent.text;
}

async function formatFile(filePath: string, dryRun = false): Promise<void> {
  const source = fs.readFileSync(filePath, 'utf-8');
  const formatted = await formatTypeScript(source);

  if (dryRun) {
    console.log(`--- ${filePath} (formatted) ---`);
    console.log(formatted);
    return;
  }

  fs.writeFileSync(filePath, formatted, 'utf-8');
  console.log(`Formatted: ${filePath}`);
}

// CLI entry point
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const files = args.filter((a) => !a.startsWith('--'));

for (const file of files) {
  await formatFile(file, dryRun);
}
```

## Adding Diff Mode and Batch Processing

For CI integration, you need diff output instead of in-place rewrites:

```typescript
// diff-formatter.ts
import { diffLines } from 'diff';

interface FormatResult {
  file: string;
  changed: boolean;
  diff?: string;
  formatted?: string;
}

async function formatWithDiff(filePath: string): Promise<FormatResult> {
  const original = fs.readFileSync(filePath, 'utf-8');
  const formatted = await formatTypeScript(original);

  if (original === formatted) {
    return { file: filePath, changed: false };
  }

  const diff = diffLines(original, formatted)
    .map((part) => {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      return part.value
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => `${prefix} ${line}`)
        .join('\n');
    })
    .join('\n');

  return { file: filePath, changed: true, diff, formatted };
}

// Batch process with concurrency limit
async function formatDirectory(
  dir: string,
  options: { fix: boolean; concurrency: number } = { fix: false, concurrency: 3 }
): Promise<void> {
  const files = fs
    .readdirSync(dir, { recursive: true })
    .filter((f): f is string => typeof f === 'string')
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .map((f) => path.join(dir, f));

  // Process in chunks to avoid rate limits
  for (let i = 0; i < files.length; i += options.concurrency) {
    const chunk = files.slice(i, i + options.concurrency);
    const results = await Promise.all(chunk.map((f) => formatWithDiff(f)));

    for (const result of results) {
      if (result.changed) {
        console.log(`\nChanges in ${result.file}:`);
        console.log(result.diff);

        if (options.fix && result.formatted) {
          fs.writeFileSync(result.file, result.formatted, 'utf-8');
        }
      }
    }
  }
}
```

## Building a Python Idiom Formatter

For Python, focus on idiomatic rewrites:

```python
# python_formatter.py
import anthropic
import sys
from pathlib import Path

PYTHON_FORMAT_PROMPT = """You are a Python code formatter that enforces idiomatic Python.
Apply these transformations:

1. Replace %s formatting with f-strings
2. Replace manual list building loops with list comprehensions where appropriate
3. Use `pathlib.Path` instead of `os.path` joins
4. Replace `dict.has_key(k)` with `k in dict`
5. Use `enumerate()` instead of `range(len(...))`
6. Replace `type(x) == int` with `isinstance(x, int)`
7. Add type hints to function signatures that lack them (infer from usage)

Return ONLY the formatted code. No markdown fences. Preserve all comments and docstrings."""


def format_python(source: str) -> str:
    client = anthropic.Anthropic()

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8096,
        system=PYTHON_FORMAT_PROMPT,
        messages=[
            {"role": "user", "content": f"Format this Python code:\n\n{source}"}
        ],
    )

    return message.content[0].text


def process_file(path: Path, fix: bool = False) -> bool:
    """Returns True if changes were made."""
    original = path.read_text()
    formatted = format_python(original)

    if original == formatted:
        return False

    if fix:
        path.write_text(formatted)
        print(f"Fixed: {path}")
    else:
        print(f"Would change: {path}")

    return True


if __name__ == "__main__":
    fix_mode = "--fix" in sys.argv
    paths = [Path(p) for p in sys.argv[1:] if not p.startswith("--")]

    changed = sum(process_file(p, fix=fix_mode) for p in paths)
    print(f"\n{changed} file(s) {'fixed' if fix_mode else 'need formatting'}.")
    sys.exit(0 if changed == 0 or fix_mode else 1)
```

## Caching and Cost Control

AI formatting is expensive at scale. Add a content hash cache:

```typescript
// cached-formatter.ts
import * as crypto from 'crypto';

const CACHE_FILE = '.formatter-cache.json';

function loadCache(): Record<string, string> {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  }
  return {};
}

function saveCache(cache: Record<string, string>): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function formatWithCache(source: string): Promise<string> {
  const cache = loadCache();
  const hash = crypto.createHash('sha256').update(source).digest('hex');

  if (cache[hash]) {
    return cache[hash];
  }

  const formatted = await formatTypeScript(source);
  cache[hash] = formatted;
  saveCache(cache);

  return formatted;
}
```

Add `.formatter-cache.json` to `.gitignore`. This reduces API calls by 80-90% on repeated runs.

## CI/CD Integration

```yaml
# .github/workflows/format-check.yml
name: AI Format Check
on: [pull_request]

jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - name: Check formatting
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx ts-node formatter.ts --dry-run src/**/*.ts
          # Exit 1 if any changes detected
```

## Related Reading

- [How to Build AI-Powered Linting Rules](/ai-tools-compared/build-ai-powered-linting-rules/)
- [Claude vs GPT-4 for Writing Unit Test Mocks](/ai-tools-compared/claude-vs-gpt4-for-unit-test-mocks/)
- [Open Source AI Code Linting Tools with Automatic Fix Suggestions](/ai-tools-compared/open-source-ai-code-linting-tools-with-automatic-fix-suggest/)
- [How to Build an AI-Powered Code Linter](/ai-tools-compared/how-to-build-ai-powered-code-linter/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
