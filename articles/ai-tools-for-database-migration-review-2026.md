---
layout: default
title: "AI Tools for Database Migration Review 2026"
description: "Use Claude to review Alembic, Flyway, and Liquibase migrations before production — catching table locks, missing rollbacks, and data loss risks"
date: 2026-03-22
author: theluckystrike
permalink: /ai-tools-for-database-migration-review-2026/
categories: [guides]
tags: [ai-tools-compared]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---

{% raw %}

Migration review is where AI provides measurable value: it reads migration code faster than humans, knows the failure modes for each database engine, and can flag risks that only appear in specific scenarios (large table, concurrent access, replication lag). This guide shows how to build an automated migration review pipeline using Claude.

## The Review Pipeline

```
Developer pushes migration → CI triggers review webhook
      ↓
Migration files extracted from git diff
      ↓
Claude reviews each migration
      ↓
Review posted as PR comment (pass/fail/warn)
      ↓
Merge blocked if any Critical findings
```

## Migration Review Service

```python
# review_service/main.py
from fastapi import FastAPI, Request
import anthropic
import httpx
import base64
import os

app = FastAPI()
client = anthropic.Anthropic()

GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]

REVIEW_SYSTEM = """You are a database reliability engineer reviewing database migrations.
You understand PostgreSQL, MySQL, and SQLite migration patterns and their failure modes.

For each migration, identify:
1. CRITICAL: Will cause downtime or data loss
2. WARNING: Risk under specific conditions (high load, large table, replication)
3. INFO: Style or best practice suggestions

Format your review as JSON:
{
  "verdict": "PASS" | "WARN" | "FAIL",
  "findings": [
    {
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "line": <line number or null>,
      "finding": "Description of the issue",
      "recommendation": "What to do instead"
    }
  ],
  "summary": "One sentence overall assessment"
}"""

REVIEW_CHECKLIST = """
Review this migration for:

CRITICAL (must fix):
- ALTER TABLE on large tables without CONCURRENTLY or non-blocking DDL
- DROP COLUMN or DROP TABLE with no data validation first
- Truncating tables
- NOT NULL constraint added without default or multi-step approach
- Foreign key constraint without NOT VALID deferment on large tables
- DELETE without WHERE clause
- UPDATE that affects all rows without batching

WARNING (consider carefully):
- Index creation without CONCURRENTLY
- Column type changes (may require rewrite)
- Renaming columns without migration period
- Missing downgrade/rollback implementation
- Long-running transactions that could block other operations
- Adding index on already-indexed column

INFO (best practices):
- No comment explaining the business reason
- Hardcoded values instead of parameterized
- Not using IF EXISTS / IF NOT EXISTS
"""

async def get_migration_files(pr_number: int, repo: str) -> list[dict]:
    """Get changed migration files from a GitHub PR."""
    async with httpx.AsyncClient() as http:
        resp = await http.get(
            f"https://api.github.com/repos/{repo}/pulls/{pr_number}/files",
            headers={"Authorization": f"token {GITHUB_TOKEN}"}
        )
        files = resp.json()

    migration_files = []
    for file in files:
        filename = file["filename"]
        # Match common migration file patterns
        if any(pat in filename for pat in [
            "migrations/", "alembic/", "flyway/", "liquibase/",
            "_migration.", "migrate_"
        ]) and any(filename.endswith(ext) for ext in [".sql", ".py", ".xml"]):
            migration_files.append({
                "filename": filename,
                "status": file["status"],  # added, modified, removed
                "patch": file.get("patch", ""),
                "raw_url": file.get("raw_url", ""),
            })

    return migration_files

async def fetch_file_content(raw_url: str) -> str:
    async with httpx.AsyncClient() as http:
        resp = await http.get(
            raw_url,
            headers={"Authorization": f"token {GITHUB_TOKEN}"}
        )
        return resp.text

async def review_migration(filename: str, content: str, db_type: str = "postgresql") -> dict:
    prompt = f"""
Database type: {db_type}
Migration file: {filename}

{REVIEW_CHECKLIST}

Migration content:
```
{content}
```
"""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        system=REVIEW_SYSTEM,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    try:
        return json.loads(response.content[0].text)
    except json.JSONDecodeError:
        return {
            "verdict": "WARN",
            "findings": [{
                "severity": "WARNING",
                "line": None,
                "finding": "Review response could not be parsed",
                "recommendation": "Review manually"
            }],
            "summary": response.content[0].text[:200]
        }

async def post_pr_comment(repo: str, pr_number: int, comment: str):
    async with httpx.AsyncClient() as http:
        await http.post(
            f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments",
            headers={"Authorization": f"token {GITHUB_TOKEN}"},
            json={"body": comment}
        )

def format_review_comment(reviews: list[dict]) -> str:
    """Format all migration reviews as a GitHub PR comment."""
    overall_verdict = "PASS"
    for review in reviews:
        if review["result"]["verdict"] == "FAIL":
            overall_verdict = "FAIL"
            break
        if review["result"]["verdict"] == "WARN" and overall_verdict == "PASS":
            overall_verdict = "WARN"

    verdict_emoji = {"PASS": "✅", "WARN": "⚠️", "FAIL": "❌"}
    comment_lines = [
        f"## Database Migration Review {verdict_emoji[overall_verdict]} {overall_verdict}",
        "",
    ]

    for review in reviews:
        result = review["result"]
        filename = review["filename"]
        file_emoji = verdict_emoji[result["verdict"]]

        comment_lines.append(f"### {file_emoji} `{filename}`")
        comment_lines.append(f"_{result.get('summary', '')}_")
        comment_lines.append("")

        for finding in result.get("findings", []):
            sev = finding["severity"]
            sev_emoji = {"CRITICAL": "🔴", "WARNING": "🟡", "INFO": "🔵"}[sev]
            line_ref = f" (line {finding['line']})" if finding.get("line") else ""
            comment_lines.append(f"{sev_emoji} **{sev}**{line_ref}: {finding['finding']}")
            comment_lines.append(f"   → {finding['recommendation']}")
            comment_lines.append("")

    comment_lines.append("---")
    comment_lines.append("_Review by AI migration reviewer — always verify before applying to production_")

    return "\n".join(comment_lines)

@app.post("/review")
async def review_pr(request: Request):
    body = await request.json()

    # Support both GitHub Actions webhook and direct API call
    repo = body.get("repo")
    pr_number = body.get("pr_number")
    db_type = body.get("db_type", "postgresql")

    migration_files = await get_migration_files(pr_number, repo)

    if not migration_files:
        return {"status": "skipped", "reason": "no migration files in PR"}

    reviews = []
    for mf in migration_files:
        content = await fetch_file_content(mf["raw_url"])
        result = await review_migration(mf["filename"], content, db_type)
        reviews.append({"filename": mf["filename"], "result": result})

    comment = format_review_comment(reviews)
    await post_pr_comment(repo, pr_number, comment)

    overall = "FAIL" if any(r["result"]["verdict"] == "FAIL" for r in reviews) else "PASS"
    return {"status": "reviewed", "verdict": overall, "file_count": len(reviews)}
```

## Example Review Output

For this migration:

```python
# alembic/versions/abc123_add_index.py
def upgrade():
    op.create_index(
        'ix_orders_customer_id',
        'orders',
        ['customer_id']
    )

def downgrade():
    op.drop_index('ix_orders_customer_id', table_name='orders')
```

Claude returns:

```json
{
  "verdict": "WARN",
  "findings": [
    {
      "severity": "WARNING",
      "line": 3,
      "finding": "op.create_index() does not use CONCURRENTLY by default. On PostgreSQL, this will acquire an AccessExclusiveLock on the orders table, blocking all reads and writes until the index is built.",
      "recommendation": "Use op.create_index(..., postgresql_concurrently=True) and configure the migration to run outside a transaction (add @op.get_context().autocommit_block() or set transaction=False in the migration)."
    },
    {
      "severity": "INFO",
      "line": null,
      "finding": "No comment explaining why this index is needed.",
      "recommendation": "Add a docstring explaining the query pattern this index supports."
    }
  ],
  "summary": "Index creation will cause brief table lock — use CONCURRENTLY for production safety."
}
```

## GitHub Actions Integration

```yaml
# .github/workflows/migration-review.yml
name: Migration Review
on:
  pull_request:
    paths:
      - '**/migrations/**'
      - '**/alembic/**'
      - '**/*migration*.sql'
      - '**/*migration*.py'

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Review migrations
        run: |
          curl -X POST https://review-service.internal/review \
            -H "Content-Type: application/json" \
            -d '{
              "repo": "${{ github.repository }}",
              "pr_number": ${{ github.event.number }},
              "db_type": "postgresql"
            }'
      - name: Check verdict
        run: |
          VERDICT=$(curl -s https://review-service.internal/verdict/${{ github.event.number }})
          if [ "$VERDICT" = "FAIL" ]; then
            echo "Migration review failed — fix critical issues before merging"
            exit 1
          fi
```

## Testing the Review Service Locally

```python
# test_review.py
import asyncio
from review_service.main import review_migration

# Dangerous migration
dangerous = """
def upgrade():
    op.execute("UPDATE users SET status = 'active'")
    op.add_column('orders', sa.Column('total', sa.Float(), nullable=False))

def downgrade():
    pass
"""

# Safe migration
safe = """
def upgrade():
    op.add_column(
        'users',
        sa.Column('preferences', postgresql.JSONB(), nullable=True)
    )

def downgrade():
    op.drop_column('users', 'preferences')
"""

async def main():
    print("=== Dangerous migration ===")
    result = await review_migration("test_migration.py", dangerous)
    print(result)

    print("\n=== Safe migration ===")
    result = await review_migration("test_migration.py", safe)
    print(result)

asyncio.run(main())
```

## Related Reading

- [Best AI Tools for Writing Database Migrations](/best-ai-tools-for-writing-database-migrations/)
- [AI Tools for Writing Pytest Tests for Alembic Database Migration Paths](/ai-tools-for-writing-pytest-tests-for-alembic-database-migration-up-and-down-paths/)
- [AI Powered Database Migration Tools Comparison](/ai-powered-database-migration-tools-comparison/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
