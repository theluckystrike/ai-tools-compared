---
layout: default
title: "How to Use AI for Git Workflow Automation"
description: "Automate git workflows with AI: commit message generation, branch naming, PR descriptions, merge conflict resolution, and git hook integration with real"
date: 2026-03-21
author: theluckystrike
permalink: /how-to-use-ai-for-git-workflow-automation/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, workflow, artificial-intelligence, automation]
---

{% raw %}

Git workflow tasks are repetitive, context-dependent, and time-consuming when done manually. Writing commit messages that actually explain the "why", describing PRs completely, and naming branches consistently are tasks AI handles well. This guide covers specific automation workflows with working code.

## AI-Powered Commit Messages

The most common git automation task: generating commit messages from staged diffs.

```bash
#!/bin/bash
# scripts/ai-commit.sh — generate commit message from staged diff

DIFF=$(git diff --staged)

if [ -z "$DIFF" ]; then
  echo "No staged changes. Use 'git add' first."
  exit 1
fi

# Count approximate token size (rough: 4 chars per token)
DIFF_SIZE=${#DIFF}
if [ $DIFF_SIZE -gt 40000 ]; then
  echo "Diff too large for AI ($DIFF_SIZE chars). Summarizing changed files only."
  DIFF=$(git diff --staged --stat)
fi

MESSAGE=$(python3 - "$DIFF" <<'PYTHON'
import sys
import anthropic

diff = sys.argv[1]
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=256,
    messages=[{
        "role": "user",
        "content": f"""Write a git commit message for this diff.

Rules:
- First line: imperative mood, max 72 chars, no period (e.g. "Add user authentication")
- Blank line after subject
- Body: explain WHY this change was made (not what — the diff shows that)
- Body lines: max 72 chars
- No generic messages like "Update files" or "Fix bug"
- If it's a bug fix, describe what was broken
- If it's a feature, describe the user-facing change

Diff:
{diff}

Output only the commit message, no explanation."""
    }]
)
print(response.content[0].text.strip())
PYTHON
)

echo "Generated message:"
echo "---"
echo "$MESSAGE"
echo "---"

read -p "Use this message? [Y/n/e(edit)] " choice
case $choice in
  n|N) exit 0 ;;
  e|E)
    echo "$MESSAGE" > /tmp/commit_msg.txt
    ${EDITOR:-vim} /tmp/commit_msg.txt
    git commit -F /tmp/commit_msg.txt
    ;;
  *)
    git commit -m "$MESSAGE"
    ;;
esac
```

Add an alias to `~/.gitconfig`:
```
[alias]
  aic = !bash ~/scripts/ai-commit.sh
```

Now `git aic` generates a commit message, shows it for review, and commits on confirmation.

## PR Description Generator

```python
#!/usr/bin/env python3
# scripts/generate-pr.py — generate PR title and description from branch diff

import subprocess
import sys
import anthropic

def get_branch_info():
    branch = subprocess.check_output(['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
                                     text=True).strip()
    base = 'main'

    # Get commits since branching from main
    commits = subprocess.check_output(
        ['git', 'log', f'{base}...HEAD', '--oneline'],
        text=True
    ).strip()

    # Get the diff
    diff_stat = subprocess.check_output(
        ['git', 'diff', f'{base}...HEAD', '--stat'],
        text=True
    ).strip()

    # Get full diff (truncated for large PRs)
    diff = subprocess.check_output(
        ['git', 'diff', f'{base}...HEAD', '--unified=2'],
        text=True
    )[:15000]  # Max 15K chars

    return {
        'branch': branch,
        'commits': commits,
        'diff_stat': diff_stat,
        'diff': diff
    }

def generate_pr_description(info: dict) -> str:
    client = anthropic.Anthropic()

    response = client.messages.create(
        model='claude-sonnet-4-5',
        max_tokens=1024,
        messages=[{
            'role': 'user',
            'content': f"""Generate a GitHub pull request title and description.

Branch: {info['branch']}

Commits:
{info['commits']}

Files changed:
{info['diff_stat']}

Code diff (sample):
{info['diff'][:8000]}

Output format:
TITLE: <concise title under 72 chars>

## What changed
<2-4 bullet points describing the changes>

## Why
<1-2 sentences on the motivation/problem solved>

## Testing
<how to verify this works>

## Notes for reviewer
<anything specific to check or context that helps review>"""
        }]
    )

    return response.content[0].text

info = get_branch_info()
description = generate_pr_description(info)
print(description)

# Optionally: create the PR with gh CLI
if '--create' in sys.argv:
    lines = description.strip().split('\n')
    title = lines[0].replace('TITLE: ', '').strip()
    body = '\n'.join(lines[2:])

    subprocess.run([
        'gh', 'pr', 'create',
        '--title', title,
        '--body', body
    ])
```

## AI Git Hook: Pre-Push Code Review

Run a lightweight AI check before pushing to catch obvious issues:

```bash
#!/bin/bash
# .git/hooks/pre-push — AI review before push
# Make executable: chmod +x .git/hooks/pre-push

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Skip for main branch (handled by CI)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  exit 0
fi

# Get diff against main
DIFF=$(git diff main...HEAD --unified=2 2>/dev/null || git diff HEAD~1 --unified=2)

if [ -z "$DIFF" ]; then
  exit 0
fi

echo "Running AI pre-push check..."

ISSUES=$(python3 - "$DIFF" <<'PYTHON'
import sys
import anthropic

diff = sys.argv[1]
if len(diff) > 20000:
    diff = diff[:20000]

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=512,
    messages=[{
        "role": "user",
        "content": f"""Quick pre-push review. Check ONLY for:
1. Accidentally committed debug code (console.log, print("debug"), pdb.set_trace())
2. Hardcoded secrets (API keys, passwords, tokens in string literals)
3. TODO comments with critical notes (e.g. "TODO: fix before merging")

If you find any of these, list them briefly.
If you find nothing, output only: "CLEAN"

Diff:
{diff}"""
    }]
)
print(response.content[0].text.strip())
PYTHON
)

if [ "$ISSUES" = "CLEAN" ]; then
  echo "Pre-push check: clean"
  exit 0
else
  echo "Pre-push check found potential issues:"
  echo "$ISSUES"
  echo ""
  read -p "Push anyway? [y/N] " choice
  if [ "$choice" != "y" ] && [ "$choice" != "Y" ]; then
    exit 1
  fi
fi
```

This hook costs under $0.002 per push and catches the most common "oops before merge" mistakes.

## Branch Naming from Issue Titles

```python
#!/usr/bin/env python3
# scripts/branch-from-issue.py <github-issue-url>

import sys
import subprocess
import anthropic
import re
from urllib.request import urlopen, Request
import json
import os

def get_issue_title(url: str) -> str:
    # Parse owner/repo/issue_number from URL
    match = re.match(r'https://github.com/([^/]+)/([^/]+)/issues/(\d+)', url)
    if not match:
        return None

    owner, repo, number = match.groups()

    headers = {}
    if token := os.getenv('GITHUB_TOKEN'):
        headers['Authorization'] = f'Bearer {token}'

    req = Request(
        f'https://api.github.com/repos/{owner}/{repo}/issues/{number}',
        headers=headers
    )
    data = json.loads(urlopen(req).read())
    return data.get('title', '')

def generate_branch_name(title: str, issue_number: str) -> str:
    client = anthropic.Anthropic()
    response = client.messages.create(
        model='claude-haiku-4-5',
        max_tokens=64,
        messages=[{
            'role': 'user',
            'content': f"""Convert this issue title to a git branch name.

Issue #{issue_number}: {title}

Rules:
- Format: feature/123-short-description OR fix/123-short-description OR chore/123-description
- Use 'fix' for bug reports, 'feature' for new functionality, 'chore' for maintenance
- Max 60 chars total
- Use hyphens, lowercase only, no special chars
- Keep only essential words (remove articles, prepositions)

Output only the branch name, nothing else."""
        }]
    )
    return response.content[0].text.strip()

if len(sys.argv) < 2:
    print("Usage: branch-from-issue.py <github-issue-url>")
    sys.exit(1)

url = sys.argv[1]
title = get_issue_title(url)
if not title:
    print("Could not fetch issue")
    sys.exit(1)

issue_number = url.split('/')[-1]
branch_name = generate_branch_name(title, issue_number)

print(f"Creating branch: {branch_name}")
subprocess.run(['git', 'checkout', '-b', branch_name])
```

## Merge Conflict Assistant

When `git merge` produces conflicts, get AI help understanding them:

```bash
#!/bin/bash
# scripts/resolve-conflict.sh <conflicted-file>

FILE=$1
if [ -z "$FILE" ]; then
  # Find all conflicted files
  FILES=$(git diff --name-only --diff-filter=U)
  echo "Conflicted files:"
  echo "$FILES"
  echo ""
  echo "Usage: resolve-conflict.sh <filename>"
  exit 0
fi

CONTENT=$(cat "$FILE")

python3 - "$FILE" "$CONTENT" <<'PYTHON'
import sys
import anthropic

filepath = sys.argv[1]
content = sys.argv[2]

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": f"""Help resolve this git merge conflict.

File: {filepath}

Conflicted content:
{content}

For each conflict block (<<<<<<< ... =======  ... >>>>>>>):
1. Explain what each version is doing
2. Recommend which version to keep, or how to merge them
3. Show the resolved code

Be specific about WHY you recommend the resolution you suggest."""
    }]
)
print(response.content[0].text)
PYTHON
```

## Related Reading

- [AI Git Commit Message Generators Compared](/ai-tools-compared/ai-git-commit-message-generators-compared/)
- [AI Tools for Automated Changelog Generation 2026](/ai-tools-compared/ai-tools-for-automated-changelog-generation-2026/)
- [How to Build an AI Code Review Bot](/ai-tools-compared/how-to-build-ai-code-review-bot/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
