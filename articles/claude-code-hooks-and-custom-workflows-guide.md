---
layout: default
title: "Claude Code Hooks and Custom Workflows Guide"
description: "Master Claude Code hooks — PreToolUse, PostToolUse, Stop, and Notification hooks with real examples for linting, logging, testing, and custom automation"
date: 2026-03-22
author: theluckystrike
permalink: claude-code-hooks-and-custom-workflows-guide
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Claude Code hooks let you intercept and react to agent actions at runtime — before and after tool calls, when the agent stops, and when it needs to notify you. They're the mechanism for adding guardrails, logging, automated testing, and custom integrations without modifying Claude's core behavior.

This guide covers all four hook types with practical implementations.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Hook Types Overview

| Hook | Fires When | Can Block? | Use Cases |
|---|---|---|---|
| `PreToolUse` | Before any tool executes | Yes (exit code 2) | Lint before edit, confirm destructive ops |
| `PostToolUse` | After any tool completes | No | Run tests, log changes, trigger CI |
| `Stop` | Agent finishes task | No | Notify, commit, deploy |
| `Notification` | Agent needs attention | No | Desktop alerts, Slack pings |

Hooks are configured in `~/.claude/settings.json` or `.claude/settings.json` (project-level).

### Step 2: Configuration Format

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/bash-guard.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /usr/local/bin/post_edit_hook.py"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/on_stop.sh"
          }
        ]
      }
    ]
  }
}
```

Hooks receive a JSON payload on stdin describing the tool call. For `PreToolUse`, exit code `2` blocks the tool and feeds your stdout back to Claude as a rejection message.

### Step 3: Hook 1: Pre-Bash Guard (Blocks Dangerous Commands)

```bash
#!/bin/bash
# /usr/local/bin/bash-guard.sh
# Blocks dangerous shell commands before Claude executes them

set -euo pipefail

# Read the tool input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('tool_input', {}).get('command', ''))
")

# Patterns that require confirmation or are always blocked
BLOCKED_PATTERNS=(
    "rm -rf /"
    "rm -rf ~"
    "dd if="
    "> /dev/sda"
    "mkfs"
    "curl.*| bash"
    "wget.*| sh"
)

WARN_PATTERNS=(
    "git push.*--force"
    "git reset --hard"
    "DROP TABLE"
    "TRUNCATE"
    "kubectl delete"
)

# Check blocked patterns (hard stop)
for pattern in "${BLOCKED_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qi "$pattern"; then
        echo "BLOCKED: Command matches dangerous pattern: '$pattern'"
        echo "Command was: $COMMAND"
        exit 2  # Exit code 2 = block tool, send message to Claude
    fi
done

# Check warn patterns (log but allow)
for pattern in "${WARN_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qi "$pattern"; then
        echo "WARNING: Potentially destructive command detected: $COMMAND" >> /tmp/claude_audit.log
        # Don't exit 2 here — just log it
    fi
done

exit 0
```

### Step 4: Hook 2: Post-Edit Auto-Lint and Format

```python
#!/usr/bin/env python3
# /usr/local/bin/post_edit_hook.py
# Runs linters and formatters after Claude edits files

import sys
import json
import subprocess
import os
from pathlib import Path

def get_file_path(tool_input: dict) -> str | None:
    return tool_input.get("file_path") or tool_input.get("path")

def run_formatter(file_path: str) -> tuple[bool, str]:
    """Run the appropriate formatter for the file type."""
    ext = Path(file_path).suffix.lower()
    formatters = {
        ".py": ["ruff", "format", "--quiet", file_path],
        ".ts": ["prettier", "--write", "--quiet", file_path],
        ".tsx": ["prettier", "--write", "--quiet", file_path],
        ".js": ["prettier", "--write", "--quiet", file_path],
        ".go": ["gofmt", "-w", file_path],
        ".rs": ["rustfmt", "--quiet", file_path],
    }
    cmd = formatters.get(ext)
    if not cmd:
        return True, ""

    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0, result.stderr

def run_linter(file_path: str) -> tuple[bool, str]:
    """Run the appropriate linter."""
    ext = Path(file_path).suffix.lower()
    linters = {
        ".py": ["ruff", "check", "--quiet", file_path],
        ".ts": ["eslint", "--quiet", file_path],
        ".tsx": ["eslint", "--quiet", file_path],
        ".go": ["go", "vet", file_path],
    }
    cmd = linters.get(ext)
    if not cmd:
        return True, ""

    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0, result.stdout + result.stderr

def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    # Only run on file write/edit operations
    if tool_name not in ("Write", "Edit", "NotebookEdit"):
        sys.exit(0)

    file_path = get_file_path(tool_input)
    if not file_path or not Path(file_path).exists():
        sys.exit(0)

    # Run formatter
    fmt_ok, fmt_err = run_formatter(file_path)
    if not fmt_ok:
        print(f"[hook] Formatter warning for {file_path}: {fmt_err}", file=sys.stderr)

    # Run linter
    lint_ok, lint_output = run_linter(file_path)
    if not lint_ok:
        # Log lint errors — PostToolUse can't block but can log
        print(f"[hook] Lint issues in {file_path}:", file=sys.stderr)
        print(lint_output, file=sys.stderr)

        # Write lint errors to a file Claude can read in next turn
        with open("/tmp/claude_lint_errors.txt", "a") as f:
            f.write(f"=== {file_path} ===\n{lint_output}\n")

if __name__ == "__main__":
    main()
```

### Step 5: Hook 3: Post-Edit Auto-Test Runner

```python
#!/usr/bin/env python3
# /usr/local/bin/run_related_tests.py
# Finds and runs tests related to the file Claude just edited

import sys
import json
import subprocess
from pathlib import Path
import re

def find_related_test_files(source_path: str) -> list[str]:
    """Find test files that test a given source file."""
    p = Path(source_path)
    candidates = []

    # Python: tests/test_<module>.py or tests/<module>_test.py
    if p.suffix == ".py":
        name = p.stem
        candidates = [
            f"tests/test_{name}.py",
            f"tests/{name}_test.py",
            f"test_{name}.py",
        ]

    # Go: <file>_test.go in same directory
    elif p.suffix == ".go" and not p.stem.endswith("_test"):
        candidates = [str(p.parent / f"{p.stem}_test.go")]

    # TypeScript/JavaScript
    elif p.suffix in (".ts", ".tsx", ".js"):
        name = p.stem
        candidates = [
            f"{p.parent}/{name}.test{p.suffix}",
            f"{p.parent}/{name}.spec{p.suffix}",
            f"__tests__/{name}{p.suffix}",
        ]

    return [c for c in candidates if Path(c).exists()]

def run_tests(test_files: list[str], source_file: str) -> dict:
    if not test_files:
        return {"ran": False, "reason": "no related test files found"}

    # Determine test runner from project
    if Path("pytest.ini").exists() or Path("pyproject.toml").exists():
        cmd = ["pytest", "--tb=short", "-q"] + test_files
    elif Path("package.json").exists():
        cmd = ["npx", "jest", "--passWithNoTests"] + test_files
    elif source_file.endswith(".go"):
        cmd = ["go", "test", "./..."]
    else:
        return {"ran": False, "reason": "unknown test runner"}

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    return {
        "ran": True,
        "passed": result.returncode == 0,
        "output": result.stdout[-2000:],  # Last 2000 chars
        "test_files": test_files
    }

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    file_path = (data.get("tool_input", {}).get("file_path") or
                 data.get("tool_input", {}).get("path", ""))

    if not file_path:
        sys.exit(0)

    test_files = find_related_test_files(file_path)
    result = run_tests(test_files, file_path)

    if result["ran"]:
        status = "PASSED" if result["passed"] else "FAILED"
        print(f"[hook] Tests {status} for {Path(file_path).name}")
        if not result["passed"]:
            # Write failures to temp file for Claude to pick up
            with open("/tmp/claude_test_failures.txt", "w") as f:
                f.write(result["output"])
            print(result["output"])

if __name__ == "__main__":
    main()
```

### Step 6: Hook 4: Stop Hook — Auto-Commit on Completion

```bash
#!/bin/bash
# /usr/local/bin/on_stop.sh
# Auto-commit changes when Claude finishes a task

set -euo pipefail

INPUT=$(cat)
TASK_SUMMARY=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# The stop hook receives the final message
print(data.get('message', 'Claude Code changes')[:80])
" 2>/dev/null || echo "Claude Code changes")

# Only commit if there are changes
if git diff --quiet && git diff --cached --quiet; then
    echo "[hook] No changes to commit"
    exit 0
fi

# Stage all changes (you may want to be more selective)
git add -A

# Commit with a summary from the task
git commit -m "auto: ${TASK_SUMMARY}" \
    -m "Co-Authored-By: claude-code[bot] <noreply@anthropic.com>"

echo "[hook] Committed changes: ${TASK_SUMMARY}"
```

### Step 7: Hook 5: Notification Hook — Desktop and Slack Alerts

```python
#!/usr/bin/env python3
# /usr/local/bin/notify_hook.py

import sys
import json
import subprocess
import os
import platform

def send_desktop_notification(title: str, message: str):
    system = platform.system()
    if system == "Darwin":
        subprocess.run([
            "osascript", "-e",
            f'display notification "{message}" with title "{title}"'
        ])
    elif system == "Linux":
        subprocess.run(["notify-send", title, message])

def send_slack_notification(message: str):
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook:
        return
    import urllib.request
    req = urllib.request.Request(
        webhook,
        data=json.dumps({"text": f":robot_face: Claude Code: {message}"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req, timeout=5)

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    message = data.get("message", "Needs your attention")
    send_desktop_notification("Claude Code", message[:100])

    # Only Slack for important messages
    if any(word in message.lower() for word in ["error", "failed", "blocked", "need"]):
        send_slack_notification(message[:200])

if __name__ == "__main__":
    main()
```

### Step 8: Complete .claude/settings.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{"type": "command", "command": "/usr/local/bin/bash-guard.sh"}]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {"type": "command", "command": "python3 /usr/local/bin/post_edit_hook.py"},
          {"type": "command", "command": "python3 /usr/local/bin/run_related_tests.py"}
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [{"type": "command", "command": "/usr/local/bin/on_stop.sh"}]
      }
    ],
    "Notification": [
      {
        "hooks": [{"type": "command", "command": "python3 /usr/local/bin/notify_hook.py"}]
      }
    ]
  }
}
```

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Related Articles

- [Best AI for Writing Jest Tests for React Custom Hooks](/ai-tools-compared/best-ai-for-writing-jest-tests-for-react-custom-hooks-with-c/)
- [Claude Code Go Module Development Guide](/ai-tools-compared/claude-code-go-module-development-guide/)
- [Claude Code Tool Use Loop Not Terminating](/ai-tools-compared/claude-code-tool-use-loop-not-terminating-fix/)
- [Claude Code Developer Portal Setup Guide](/ai-tools-compared/claude-code-developer-portal-setup-guide/)
- [AI Pair Programming Tools Comparison 2026: Claude Code](/ai-tools-compared/ai-pair-programming-tools-comparison-2026/)
- [Claude Code for Faker.js Test Data Workflow Guide](https://theluckystrike.github.io/remote-work-tools/claude-code-for-faker-js-test-data-workflow-guide/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
