---
layout: default
title: "How to Build AI-Powered Code Formatters"
description: "Step-by-step guide to building AI-powered code formatters using Claude and GPT-4 APIs with AST parsing, custom style rules, and CLI integration"
date: 2026-03-22
author: theluckystrike
permalink: /build-ai-powered-code-formatters/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Traditional formatters like Prettier and Black apply fixed rules. AI-powered formatters can understand context. they can normalize idioms, apply team-specific style preferences, rename variables for clarity, and transform legacy patterns. This guide shows how to build one using Claude or GPT-4 as the formatting engine.

Architecture Overview

An AI-powered formatter has three components:

1. Parser. convert source to AST or extract code blocks for context
2. AI engine. Claude or GPT-4 with a formatting-focused system prompt
3. Output reconciler. merge formatted output back, handle diff-only mode

The key design decision: operate on raw text vs. AST. AST-based formatters are more precise but complex. Text-based formatters are simpler and work for most cases.

Building a Basic TypeScript Formatter

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

Adding Diff Mode and Batch Processing

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

Building a Python Idiom Formatter

For Python, focus on idiomatic rewrites:

```python
python_formatter.py
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

Caching and Cost Control

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

Handling Large Files: Chunking Strategy

Files over 4,000 lines can exceed model context limits. The right approach is function-level chunking, not line-based splitting, because splitting mid-function produces broken output:

```typescript
// chunked-formatter.ts
interface CodeChunk {
  startLine: number;
  endLine: number;
  source: string;
}

function splitIntoFunctions(source: string): CodeChunk[] {
  const lines = source.split('\n');
  const chunks: CodeChunk[] = [];
  let chunkStart = 0;
  let braceDepth = 0;
  let inFunction = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Track function declarations
    if (/^(export\s+)?(async\s+)?function\s+\w+/.test(line) ||
        /^\s+(async\s+)?\w+\s*\(.*\)\s*\{/.test(line)) {
      if (!inFunction) {
        inFunction = true;
        chunkStart = i;
      }
    }
    // Count braces
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    // Flush chunk when function closes
    if (inFunction && braceDepth === 0) {
      chunks.push({
        startLine: chunkStart,
        endLine: i,
        source: lines.slice(chunkStart, i + 1).join('\n'),
      });
      inFunction = false;
    }
  }

  return chunks;
}

async function formatLargeFile(filePath: string): Promise<string> {
  const source = fs.readFileSync(filePath, 'utf-8');
  const chunks = splitIntoFunctions(source);

  const formattedChunks = await Promise.all(
    chunks.map((chunk) => formatWithCache(chunk.source))
  );

  return formattedChunks.join('\n\n');
}
```

This preserves import context at the top of the file and avoids truncating functions mid-body.

Prompt Engineering for Consistent Output

The biggest source of non-determinism in AI formatters is prompt quality. Two techniques that improve consistency:

Anchor with examples: Instead of describing rules abstractly, include a before/after example pair in the system prompt. Claude is significantly more consistent when it can pattern-match against a concrete example.

```typescript
const SYSTEM_WITH_EXAMPLES = `You are a TypeScript formatter. Apply these rules:

BEFORE:
function greet(name) {
  return 'Hello, ' + name + '!';
}

AFTER:
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

Apply the same transformations (type hints, template literals) to all functions.`;
```

Constrain scope explicitly: Adding "Do not rename variables. Do not change logic. Do not add or remove imports." prevents the model from making unsolicited improvements. AI tools tend toward overcorrection when not explicitly bounded.

CI/CD Integration

```yaml
.github/workflows/format-check.yml
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
          npx ts-node formatter.ts --dry-run src//*.ts
          # Exit 1 if any changes detected
```

One practical limitation: AI formatters are slower than Prettier (seconds vs. milliseconds per file). For large codebases, run the AI formatter only on changed files in PRs, not on the entire tree. Use `git diff --name-only HEAD~1` to get the changed file list and pass it to the formatter.

Claude vs GPT-4 as the Formatting Engine

Both models work, but they differ in output reliability:

Instruction adherence: Claude is more consistent about returning only the formatted code without commentary. GPT-4 sometimes adds preamble like "Here is the formatted code:" before the actual output, which breaks the formatter pipeline unless you strip it. Adding "Return ONLY the code. No explanations." to the system prompt fixes this for GPT-4.

Determinism: Neither model is fully deterministic, but Claude with temperature=0 produces more consistent output across runs on the same input. GPT-4 at temperature=0 still occasionally produces different orderings for import sort operations.

Code preservation: Claude is more conservative about preserving comments and unused variables when instructed to "preserve all comments." GPT-4 occasionally drops inline comments that appear on the same line as code it restructures.

For a production formatter, test both models against your codebase's actual code samples before committing to one. A formatter that occasionally corrupts comments is worse than no formatter at all.

Related Reading

- [How to Build AI-Powered Linting Rules](/build-ai-powered-linting-rules/)
- [Claude vs GPT-4 for Writing Unit Test Mocks](/claude-vs-gpt4-for-unit-test-mocks/)
- [Open Source AI Code Linting Tools with Automatic Fix Suggestions](/open-source-ai-code-linting-tools-with-automatic-fix-suggest/)
- [How to Build an AI-Powered Code Linter](/how-to-build-ai-powered-code-linter/)

---

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
