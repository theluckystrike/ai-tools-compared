---
layout: default
title: "How to Use the Claude API for Automated Code Review"
description: "Build automated code review with the Claude API. Python integration, GitHub PR webhooks, review prompt engineering, and structured output parsing"
date: 2026-03-20
last_modified_at: 2026-03-20
author: theluckystrike
permalink: /how-to-use-claude-api-for-automated-code-review/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, claude-ai, api]
---

{% raw %}

The Claude API can review pull request diffs and post structured feedback as GitHub comments. The key engineering decisions are: what context to send (diff only vs diff + surrounding file context), how to structure the review prompt to get actionable output, and how to parse the response into per-line GitHub review comments. This guide builds a working PR reviewer from scratch.

## Key Takeaways

- **Asking for free-form feedback**: produces noise.
- **Your goal is to catch bugs**: security issues, and violations of best practices.
- **What are the most**: common mistakes to avoid? The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully.
- **Consider a security review**: if your application handles sensitive user data.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Install Dependencies and Set Up Authentication

```bash
pip install anthropic pygithub python-dotenv

# .env file
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
```

### Step 2: Fetch the PR Diff

```python
# review_bot.py
import os
from github import Github
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

anthropic = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
gh = Github(os.environ["GITHUB_TOKEN"])

def get_pr_diff(repo_name: str, pr_number: int) -> dict:
    """Fetch PR diff with file context."""
    repo = gh.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    files = []
    for f in pr.get_files():
        files.append({
            "filename": f.filename,
            "status": f.status,    # added, modified, removed
            "additions": f.additions,
            "deletions": f.deletions,
            "patch": f.patch or "",  # The unified diff
        })

    return {
        "title": pr.title,
        "body": pr.body or "",
        "base_branch": pr.base.ref,
        "head_branch": pr.head.ref,
        "files": files,
    }
```

### Step 3: Design the Review Prompt

The prompt structure determines review quality. Asking for free-form feedback produces noise. Asking for structured output with file/line references produces actionable comments:

```python
SYSTEM_PROMPT = """You are a senior software engineer performing a code review.
Your goal is to catch bugs, security issues, and violations of best practices.

Review guidelines:
- Flag bugs and logic errors (SEVERITY: critical)
- Flag security vulnerabilities (SEVERITY: critical)
- Flag performance issues that matter at scale (SEVERITY: warning)
- Flag code clarity issues that will cause future bugs (SEVERITY: warning)
- Skip style preferences unless they affect readability significantly
- Skip observations that are already obvious from the diff description

Output format — respond with a JSON object:
{
  "summary": "1-2 sentence overall assessment",
  "verdict": "approve" | "request_changes" | "comment",
  "issues": [
    {
      "filename": "path/to/file.py",
      "line": 42,
      "severity": "critical" | "warning" | "info",
      "category": "bug" | "security" | "performance" | "clarity",
      "comment": "Specific, actionable description of the issue",
      "suggestion": "What to do instead (optional)"
    }
  ]
}

If the code is clean, return an empty issues array and verdict "approve"."""

def build_review_prompt(pr_data: dict) -> str:
    """Build the user message with PR context."""
    files_text = ""
    for f in pr_data["files"]:
        if not f["patch"]:
            continue
        files_text += f"\n### {f['filename']} ({f['status']})\n"
        files_text += f"```diff\n{f['patch']}\n```\n"

    return f"""PR Title: {pr_data['title']}
PR Description: {pr_data['body'][:500] if pr_data['body'] else 'None'}
Base branch: {pr_data['base_branch']}

Changed files:
{files_text}

Review this pull request for bugs, security issues, and significant problems."""
```

### Step 4: Call the Claude API

```python
import json

def review_pull_request(repo_name: str, pr_number: int) -> dict:
    """Run AI review and return structured results."""
    pr_data = get_pr_diff(repo_name, pr_number)

    # Skip trivial PRs (docs-only, small typos)
    total_changes = sum(f["additions"] + f["deletions"] for f in pr_data["files"])
    if total_changes < 5:
        return {"summary": "Trivial change, skipping AI review.", "verdict": "approve", "issues": []}

    response = anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": build_review_prompt(pr_data)}
        ]
    )

    # Parse structured JSON response
    text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
 text = "\n".join(text.split("\n")[1:-1])

 try:
 return json.loads(text)
 except json.JSONDecodeError:
 # Fallback: return as plain comment if JSON parsing fails
 return {
 "summary": text,
 "verdict": "comment",
 "issues": []
 }
```

### Step 5: Post Review Comments to GitHub

```python
def post_github_review(repo_name: str, pr_number: int, review: dict) -> None:
 """Post the AI review as a GitHub PR review with inline comments."""
 repo = gh.get_repo(repo_name)
 pr = repo.get_pull(pr_number)

 # Build inline comments (requires commit SHA for position mapping)
 # Simpler approach: post review-level comment + file-level comments
 comments_text = ""
 critical_count = sum(1 for i in review["issues"] if i["severity"] == "critical")
 warning_count = sum(1 for i in review["issues"] if i["severity"] == "warning")

 if review["issues"]:
 comments_text = "\n\n### Issues Found\n\n"
 for issue in review["issues"]:
 severity_icon = "🔴" if issue["severity"] == "critical" else "🟡"
 comments_text += f"**{severity_icon} {issue['severity'].upper()} — {issue['category']}**\n"
 comments_text += f"`{issue['filename']}` line {issue['line']}\n"
 comments_text += f"{issue['comment']}\n"
 if issue.get("suggestion"):
 comments_text += f"*Suggestion: {issue['suggestion']}*\n"
 comments_text += "\n"

 body = f"""## AI Code Review

{review['summary']}

**Summary:** {critical_count} critical, {warning_count} warnings
{comments_text}---
*Reviewed by Claude claude-sonnet-4-6. This is automated analysis — use judgment.*"""

 # Map verdict to GitHub event type
 event_map = {
 "approve": "APPROVE",
 "request_changes": "REQUEST_CHANGES",
 "comment": "COMMENT"
 }

 pr.create_review(
 body=body,
 event=event_map.get(review["verdict"], "COMMENT")
 )
 print(f"Posted review: {review['verdict']} ({critical_count} critical issues)")
```

### Step 6: GitHub Actions Webhook Integration

Trigger the reviewer automatically on every PR:

```yaml
# .github/workflows/ai-code-review.yml
name: AI Code Review

on:
 pull_request:
 types: [opened, synchronize]
 # Skip draft PRs
 workflow_dispatch:

jobs:
 review:
 runs-on: ubuntu-latest
 # Don't run on draft PRs
 if: github.event.pull_request.draft == false
 permissions:
 pull-requests: write
 contents: read

 steps:
 - uses: actions/checkout@v4

 - name: Set up Python
 uses: actions/setup-python@v5
 with:
 python-version: '3.12'

 - name: Install dependencies
 run: pip install anthropic pygithub python-dotenv

 - name: Run AI review
 env:
ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
REPO_NAME: ${{ github.repository }}
PR_NUMBER: ${{ github.event.pull_request.number }}
 run: |
 python -c "
 import os
 from review_bot import review_pull_request, post_github_review
 repo = os.environ['REPO_NAME']
 pr_num = int(os.environ['PR_NUMBER'])
 review = review_pull_request(repo, pr_num)
 post_github_review(repo, pr_num, review)
 "
```

### Step 7: Add File Context Beyond the Diff

For better accuracy on complex changes, send the full file alongside the diff:

```python
def get_file_content(repo_name: str, filename: str, ref: str) -> str:
 """Get full file content at a given ref."""
 repo = gh.get_repo(repo_name)
 try:
 content = repo.get_contents(filename, ref=ref)
 return content.decoded_content.decode("utf-8")
 except Exception:
 return ""

def build_enhanced_review_prompt(pr_data: dict, repo_name: str, head_sha: str) -> str:
 """Build prompt with full file context for critical files."""
 files_text = ""
 for f in pr_data["files"]:
 if not f["patch"]:
 continue
 files_text += f"\n### {f['filename']} (diff)\n```diff\n{f['patch']}\n```\n"

 # For Python/TypeScript files under 200 lines, include full content
 if f["filename"].endswith((".py", ".ts", ".js")) and f["additions"] < 200:
 full_content = get_file_content(repo_name, f["filename"], head_sha)
 if full_content and len(full_content.split("\n")) < 200:
 files_text += f"\n### {f['filename']} (full file after changes)\n"
 files_text += f"```\n{full_content}\n```\n"

 return f"""PR: {pr_data['title']}

{files_text}

Review for bugs, security vulnerabilities, and critical issues only."""
```

### Step 8: Control Cost and Rate Limits

```python
import time

MAX_DIFF_TOKENS = 50_000 # Roughly 200KB of diff text

def truncate_diff(pr_data: dict, max_chars: int = MAX_DIFF_TOKENS * 4) -> dict:
 """Truncate very large diffs to stay within token budget."""
 total_chars = sum(len(f["patch"]) for f in pr_data["files"])

 if total_chars <= max_chars:
 return pr_data

 # Keep the largest changed files, truncate the rest
 sorted_files = sorted(pr_data["files"], key=lambda f: len(f["patch"]), reverse=True)
 truncated = []
 chars_used = 0

 for f in sorted_files:
 if chars_used + len(f["patch"]) > max_chars:
 f = {**f, "patch": f["patch"][:max_chars - chars_used] + "\n... [truncated]"}
 truncated.append(f)
 chars_used += len(f["patch"])
 if chars_used >= max_chars:
 break

 return {**pr_data, "files": truncated}
```

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Frequently Asked Questions

**How long does it take to use the claude api for automated code review?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Is this approach secure enough for production?**

The patterns shown here follow standard practices, but production deployments need additional hardening. Add rate limiting, input validation, proper secret management, and monitoring before going live. Consider a security review if your application handles sensitive user data.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

## Related Articles

- [AI Tools for Automated API Documentation from Code Comments](/ai-tools-for-automated-api-documentation-from-code-comments/)
- [Claude Code API Backward Compatibility Guide](/claude-code-api-backward-compatibility-guide/)
- [Claude Code API Client TypeScript Guide: Build Type-Safe](/claude-code-api-client-typescript-guide/)
- [Claude Code API Error Handling Standards](/claude-code-api-error-handling-standards/)
- [Claude Code API Snapshot Testing Guide](/claude-code-api-snapshot-testing-guide/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
