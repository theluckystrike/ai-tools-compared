---
layout: default
title: "How to Use AI for Automated Code Migration"
description: "Practical guide to AI-assisted code migration: framework upgrades, language ports, and API breaking changes. Includes batch migration scripts and validation patterns."
date: 2026-03-21
author: theluckystrike
permalink: /how-to-use-ai-for-automated-code-migration/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Code migration is one of the most time-intensive engineering tasks — and one where AI provides the clearest ROI. Migrating 200 files from one pattern to another is mechanical work that takes weeks manually. With AI-assisted automation, the same migration takes hours. This guide covers practical approaches to three migration types: framework/library upgrades, language ports, and API breaking changes.

## Migration Type 1: Library Upgrade with Breaking Changes

Example: Migrating from React Router v5 to v6 (useHistory to useNavigate, Switch to Routes, etc.)

```python
import anthropic
from pathlib import Path

client = anthropic.Anthropic()

MIGRATION_PROMPT = """You are migrating React Router v5 code to v6.
Apply ONLY these transformations:
1. Replace useHistory() with useNavigate()
2. Replace history.push('/path') with navigate('/path')
3. Replace history.replace('/path') with navigate('/path', { replace: true })
4. Replace <Switch> with <Routes>
5. Add element prop to <Route>: <Route path="x" component={Y}/> -> <Route path="x" element={<Y />}/>
6. Remove <Redirect> and replace with <Navigate to="..."/>

Rules:
- Only modify React Router imports and usage
- Do not change component logic
- If the code has no React Router usage, return it unchanged
- Preserve all formatting and whitespace

Return ONLY the transformed code, no explanation."""

def migrate_file(filepath: str) -> tuple[str, bool]:
    with open(filepath) as f:
        original = f.read()

    if "react-router" not in original:
        return original, False

    response = client.messages.create(
        model="claude-haiku-3-5",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": f"{MIGRATION_PROMPT}\n\nFile to migrate:\n```jsx\n{original}\n```"
            }
        ]
    )

    migrated = response.content[0].text
    if migrated.startswith("```"):
        migrated = "\n".join(migrated.split("\n")[1:-1])

    changed = migrated.strip() != original.strip()
    return migrated, changed

src_dir = Path("./src")
files = list(src_dir.rglob("*.tsx")) + list(src_dir.rglob("*.jsx"))
results = {"changed": [], "unchanged": [], "errors": []}

for filepath in files:
    try:
        migrated_content, was_changed = migrate_file(str(filepath))
        if was_changed:
            staging_path = Path("./migration-staging") / filepath.relative_to("./src")
            staging_path.parent.mkdir(parents=True, exist_ok=True)
            staging_path.write_text(migrated_content)
            results["changed"].append(str(filepath))
        else:
            results["unchanged"].append(str(filepath))
    except Exception as e:
        results["errors"].append({"file": str(filepath), "error": str(e)})

print(f"Changed: {len(results['changed'])} files")
```

Always stage, validate, then apply. Never write AI-migrated code directly over source files without a validation step.

## Migration Type 2: Language Port (Python 2 to Python 3)

For large codebases, use the Anthropic Batch API to process hundreds of files concurrently at 50% cost:

```python
import anthropic
import json
from pathlib import Path

client = anthropic.Anthropic()

PYTHON_23_MIGRATION_PROMPT = """Migrate this Python 2 code to Python 3.8+.
Apply ALL of these transformations:
1. print statements -> print() function calls
2. unicode() -> str(), basestring -> str
3. except ExceptionType, e: -> except ExceptionType as e:
4. dict.has_key(k) -> k in dict
5. dict.iteritems() -> dict.items(), dict.itervalues() -> dict.values()
6. xrange() -> range()
7. raw_input() -> input()
8. Remove __future__ imports

Return ONLY the migrated Python 3 code."""

python_files = list(Path("./legacy_app").rglob("*.py"))
batch_requests = []

for i, filepath in enumerate(python_files):
    with open(filepath, encoding="latin-1") as f:
        content = f.read()

    batch_requests.append({
        "custom_id": f"file-{i}",
        "params": {
            "model": "claude-haiku-3-5",
            "max_tokens": 8192,
            "messages": [
                {"role": "user", "content": f"{PYTHON_23_MIGRATION_PROMPT}\n\n```python\n{content}\n```"}
            ],
        }
    })

batch = client.beta.messages.batches.create(requests=batch_requests)
print(f"Batch submitted: {batch.id}")
print(f"Processing {len(batch_requests)} files at 50% API cost")
```

## Migration Type 3: Internal API Breaking Changes

When you rename a method or change a signature, every call site needs updating.

```python
def build_api_migration_prompt(old_signature: str, new_signature: str, changelog: str) -> str:
    return f"""You are updating call sites to use a new API.

OLD API:
{old_signature}

NEW API:
{new_signature}

MIGRATION NOTES:
{changelog}

Transform any code that calls the old API to use the new API.
If the file doesn't use this API, return it unchanged.
Preserve all formatting. Return only the transformed code."""

OLD_API = """
def send_notification(user_id: int, message: str, channel: str = "email") -> bool
"""

NEW_API = """
async def notify_user(
    message: str,
    user_id: int,
    channels: list[str] = ["email"],
    priority: str = "normal"
) -> NotificationResult
"""

CHANGELOG = """
- Function renamed from send_notification to notify_user
- Now async - all callers must await it
- Parameters reordered: message is now first, user_id second
- 'channel' renamed to 'channels' and is now a list
- Return type changed from bool to NotificationResult
"""

import subprocess
result = subprocess.run(
    ["grep", "-rl", "send_notification", "./app"],
    capture_output=True, text=True
)
affected_files = result.stdout.strip().split("\n")
```

## Validation After AI Migration

```python
import ast
import subprocess

def validate_python_syntax(filepath: str) -> bool:
    try:
        with open(filepath) as f:
            ast.parse(f.read())
        return True
    except SyntaxError as e:
        print(f"Syntax error in {filepath}: {e}")
        return False

def validate_typescript(directory: str) -> list[str]:
    result = subprocess.run(
        ["npx", "tsc", "--noEmit", "--project", f"{directory}/tsconfig.json"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return result.stdout.split("\n")
    return []
```

The standard migration workflow:
1. Run migration script into staging directory
2. Syntax validation (fast, catches obvious failures)
3. Type check (catches semantic issues)
4. Run existing test suite (catches behavioral regressions)
5. Human review of files flagged by any check
6. Apply staging to source

## What AI Migration Gets Wrong

**Multi-line destructuring:** An AI might correctly identify `useHistory()` but miss:

```javascript
const { push, replace } = useHistory();
// Needs: const navigate = useNavigate();
// Then: push('/path') -> navigate('/path')
```

**Dynamic usage:** `const method = condition ? history.push : history.replace` — transformation depends on runtime logic.

**Test files:** Often use the old API in mock setups with different patterns than production code.

Flag these categories for manual review rather than trusting automated migration.

## Related Reading

- [Best AI Tools for Code Migration Between Languages 2026](/best-ai-tools-for-code-migration-between-languages-2026/)
- [Best AI Tools for Code Migration Python 2 to 3 Java 8 to 21](/best-ai-tools-for-code-migration-python-2-to-3-java-8-to-21-guide/)
- [AI Code Completion for Java Jakarta EE Migration from Javax](/ai-code-completion-for-java-jakarta-ee-migration-from-javax-/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
