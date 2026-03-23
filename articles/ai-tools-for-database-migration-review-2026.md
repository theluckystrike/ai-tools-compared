---
layout: default
title: "AI Tools for Database Migration Review 2026"
description: "Use Claude to review Alembic, Flyway, and Liquibase migrations before production. catching table locks, missing rollbacks, and data loss risks"
date: 2026-03-22
author: theluckystrike
permalink: /ai-tools-for-database-migration-review-2026/
categories: [guides]
tags: [ai-tools-compared, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Migration review is where AI provides measurable value: it reads migration code faster than humans, knows the failure modes for each database engine, and can flag risks that only appear in specific scenarios (large table, concurrent access, replication lag). This guide shows how to build an automated migration review pipeline using Claude.

The Review Pipeline

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

Migration Review Service

```python
review_service/main.py
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

    verdict_emoji = {"PASS": "", "WARN": "", "FAIL": ""}
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
            sev_emoji = {"CRITICAL": "", "WARNING": "", "INFO": ""}[sev]
            line_ref = f" (line {finding['line']})" if finding.get("line") else ""
            comment_lines.append(f"{sev_emoji} {sev}{line_ref}: {finding['finding']}")
            comment_lines.append(f"   → {finding['recommendation']}")
            comment_lines.append("")

    comment_lines.append("---")
    comment_lines.append("_Review by AI migration reviewer. always verify before applying to production_")

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

Example Review Output

For this migration:

```python
alembic/versions/abc123_add_index.py
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
  "summary": "Index creation will cause brief table lock. use CONCURRENTLY for production safety."
}
```

GitHub Actions Integration

```yaml
.github/workflows/migration-review.yml
name: Migration Review
on:
  pull_request:
    paths:
      - '/migrations/'
      - '/alembic/'
      - '/*migration*.sql'
      - '/*migration*.py'

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
            echo "Migration review failed. fix critical issues before merging"
            exit 1
          fi
```

Testing the Review Service Locally

```python
test_review.py
import asyncio
from review_service.main import review_migration

Dangerous migration
dangerous = """
def upgrade():
    op.execute("UPDATE users SET status = 'active'")
    op.add_column('orders', sa.Column('total', sa.Float(), nullable=False))

def downgrade():
    pass
"""

Safe migration
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

Tool Comparison: AI Models for Migration Review

Not every AI model performs equally well on migration analysis. it understands the difference between `ALTER TABLE ... ADD COLUMN` (lock-free in PostgreSQL 11+) versus `ALTER TABLE ... ADD COLUMN NOT NULL DEFAULT expr` (full table rewrite in PostgreSQL 10 and below), and surfaces these distinctions correctly in its findings.

Extending the Review for Flyway and Liquibase

The same review service works with Flyway SQL migrations and Liquibase XML changesets. Update the file pattern matching in `get_migration_files()` to include the relevant paths:

```python
if any(pat in filename for pat in [
    "migrations/", "alembic/", "db/migrate/",
    "flyway/", "V__", "R__",  # Flyway versioned and repeatable migrations
    "liquibase/", "changelog/",  # Liquibase changesets
]) and any(filename.endswith(ext) for ext in [".sql", ".py", ".xml", ".yaml"]):
```

For Liquibase YAML changesets, include the format in the review prompt so Claude knows to look for `runOnChange`, `failOnError`, and `preConditions` blocks, which carry their own risk surface.

Deployment Considerations

Run the review service behind an internal load balancer, not on the public internet. Migration content often contains table names, column names, and business logic that should stay within your network perimeter. Use mTLS or a shared secret header for authentication between GitHub Actions and the review endpoint. Keep API keys for the Claude API in a secrets manager (AWS Secrets Manager or HashiCorp Vault), not in environment variables baked into Docker images.

For teams running many PRs simultaneously, add a queue (Redis or SQS) in front of the review worker to avoid overwhelming the Anthropic API rate limits. The `claude-opus-4-6` model allows 5 requests per minute on the default tier; batch small migrations into a single prompt to stay within that limit during peak CI hours.

Related Articles

- [AI Tools for Database Schema Migration Review 2026](/ai-tools-for-database-schema-migration-review-2026/)
- [AI Tools for Automated Migration Testing 2026](/ai-tools-for-automated-migration-testing-2026/)
- [Best AI Tools for Database Schema Migration Review 2026](/best-ai-tools-for-database-schema-migration-review-2026/)
- [AI Tools for Writing pytest Tests for Alembic Database](/ai-tools-for-writing-pytest-tests-for-alembic-database-migra/)
- [AI Tools for Writing Database Migration Rollback Scripts](/ai-tools-for-writing-database-migration-rollback-scripts-2026/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)

Frequently Asked Questions

Is this product worth the price?

Value depends on your usage frequency and specific needs. If you use this product daily for core tasks, the cost usually pays for itself through time savings. For occasional use, consider whether a free alternative covers enough of your needs.

What are the main drawbacks of this product?

No tool is perfect. Common limitations include pricing for advanced features, learning curve for power features, and occasional performance issues during peak usage. Weigh these against the specific benefits that matter most to your workflow.

How does this product compare to its closest competitor?

The best competitor depends on which features matter most to you. For some users, a simpler or cheaper alternative works fine. For others, this product's specific strengths justify the investment. Try both before committing to an annual plan.

Does this product have good customer support?

Support quality varies by plan tier. Free and basic plans typically get community forum support and documentation. Paid plans usually include email support with faster response times. Enterprise plans often include dedicated support contacts.

Can I migrate away from this product if I decide to switch?

Check the export options before committing. Most tools let you export your data, but the format and completeness of exports vary. Test the export process early so you are not locked in if your needs change later.
{% endraw %}
