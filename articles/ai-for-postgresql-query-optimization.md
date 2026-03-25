---
layout: default
title: "How to Use AI for PostgreSQL Query Optimization"
description: "Learn how Claude, GPT-4, and Copilot help you optimize slow PostgreSQL queries using EXPLAIN ANALYZE, index hints, and rewrite suggestions"
date: 2026-03-22
author: theluckystrike
permalink: /ai-for-postgresql-query-optimization/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

PostgreSQL query optimization is one of those tasks where AI tools earn their keep fast. A slow query plan, a missing index, a correlated subquery eating CPU. AI assistants can spot these patterns and suggest fixes in seconds. This guide shows how to use Claude, GPT-4, and GitHub Copilot to tune real Postgres queries, interpret EXPLAIN output, and redesign schemas when needed.

Why AI Accelerates Postgres Tuning

Manual query optimization requires you to read EXPLAIN ANALYZE output, understand planner decisions, know index types, and recognize anti-patterns. AI tools compress that feedback loop. You paste the query + plan, and get actionable rewrites instead of spending 20 minutes reading docs.

The three main use cases:

1. EXPLAIN ANALYZE interpretation. translate planner output into plain English
2. Query rewrites. replace correlated subqueries, CTEs with poor estimates, or sequential scans
3. Index recommendations. suggest which indexes to create, when to use partial or covering indexes

Setting Up the Workflow

Before pasting to an AI tool, gather the full context:

```sql
-- Run this to get full query plan with timing
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.created_at, c.email, COUNT(oi.id) as item_count
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'pending'
  AND o.created_at > NOW() - INTERVAL '7 days'
GROUP BY o.id, o.created_at, c.email
ORDER BY o.created_at DESC
LIMIT 50;

-- Also collect table stats
SELECT schemaname, tablename, n_live_tup, n_dead_tup,
       last_vacuum, last_autovacuum, last_analyze
FROM pg_stat_user_tables
WHERE tablename IN ('orders', 'customers', 'order_items');

-- And existing indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('orders', 'customers', 'order_items');
```

Paste all three outputs together when prompting. The more context, the more accurate the suggestion.

Claude for Query Analysis

Claude handles long EXPLAIN ANALYZE output well and gives structured responses. A good prompt:

```
I have a slow PostgreSQL query (taking 2.3s). Here's the query, the EXPLAIN ANALYZE output,
and the existing indexes. Identify the bottleneck and suggest specific fixes.

[paste query]
[paste EXPLAIN ANALYZE]
[paste indexes]

PostgreSQL version - 16. Table has 8M rows in orders, 2M in customers, 40M in order_items.
```

Claude's typical response identifies:

- Which node in the plan is the bottleneck (e.g., `Hash Join` spilling to disk, `Seq Scan` on a large table)
- Why the planner chose that path (bad statistics, no index, low selectivity estimate)
- A concrete rewrite or index DDL

Sample output Claude generates:

```sql
-- Claude's suggested composite index
CREATE INDEX CONCURRENTLY idx_orders_status_created
ON orders (status, created_at DESC)
WHERE status = 'pending';

-- And the rewritten query using the index hint pattern
SELECT o.id, o.created_at, c.email, COUNT(oi.id) as item_count
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'pending'
  AND o.created_at > NOW() - INTERVAL '7 days'
GROUP BY o.id, o.created_at, c.email
ORDER BY o.created_at DESC
LIMIT 50;

-- Claude also suggests updating statistics if estimates are off
ANALYZE orders;
```

Claude will also flag if a partial index won't help because the planner's row estimate is wrong, and suggest `SET enable_seqscan = off` to verify if an index would actually be used.

GPT-4 for Rewriting Correlated Subqueries

GPT-4 is strong at pattern recognition. It excels at spotting N+1 subqueries and replacing them with set-based rewrites.

Before (slow correlated subquery):

```sql
-- This runs the subquery once per row in customers
SELECT c.id, c.email,
  (SELECT SUM(o.total) FROM orders o WHERE o.customer_id = c.id
   AND o.created_at > NOW() - INTERVAL '30 days') as monthly_spend
FROM customers c
WHERE c.tier = 'premium';
```

GPT-4 rewrite:

```sql
-- Lateral join or aggregation subquery pushed down
SELECT c.id, c.email, COALESCE(ms.monthly_spend, 0) as monthly_spend
FROM customers c
LEFT JOIN LATERAL (
  SELECT SUM(o.total) as monthly_spend
  FROM orders o
  WHERE o.customer_id = c.id
    AND o.created_at > NOW() - INTERVAL '30 days'
) ms ON true
WHERE c.tier = 'premium';

-- GPT-4 also offers the CTE version with materialization control
WITH monthly_spend AS NOT MATERIALIZED (
  SELECT customer_id, SUM(total) as monthly_spend
  FROM orders
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY customer_id
)
SELECT c.id, c.email, COALESCE(ms.monthly_spend, 0) as monthly_spend
FROM customers c
LEFT JOIN monthly_spend ms ON ms.customer_id = c.id
WHERE c.tier = 'premium';
```

GPT-4 explains the tradeoff between `LATERAL` and the CTE approach, noting that `NOT MATERIALIZED` (Postgres 12+) lets the planner inline the CTE rather than materializing it separately.

GitHub Copilot for Inline Index Design

Copilot's strength is in-editor suggestions while you're writing migrations. It recognizes patterns from surrounding code.

In a migration file:

```sql
-- When you type this comment, Copilot completes the index:
-- Index for order lookup by customer with status filter
-- Copilot suggests:
CREATE INDEX idx_orders_customer_status
ON orders (customer_id, status)
INCLUDE (total, created_at);
```

The `INCLUDE` clause suggestion is notable. Copilot often adds covering columns based on what it sees in nearby SELECT statements. Not always correct, but a strong starting point.

For `pg_stat_statements` analysis, Copilot can generate the diagnostic query:

```sql
-- Copilot auto-completes from "-- top slow queries by total time"
SELECT query,
       calls,
       round(total_exec_time::numeric, 2) as total_ms,
       round(mean_exec_time::numeric, 2) as mean_ms,
       round(stddev_exec_time::numeric, 2) as stddev_ms,
       rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;
```

Comparing Output Quality

| Task | Claude | GPT-4 | Copilot |
|---|---|---|---|
| EXPLAIN ANALYZE reading | Excellent. node-by-node breakdown | Good. identifies key nodes | Weak. no context |
| Correlated subquery rewrite | Strong | Excellent | Moderate (in-file only) |
| Index DDL suggestions | Strong, includes CONCURRENTLY | Strong | Good with INCLUDE columns |
| Statistics/vacuum advice | Yes | Sometimes | No |
| Schema redesign | Good for normalized schemas | Good | No |

Handling Bloated CTEs

A common anti-pattern - CTEs used as optimization fences (pre-Postgres 12 behavior that many devs still write):

```sql
-- Old pattern. Postgres 12+ doesn't materialize by default, but many devs still use it
WITH expensive_cte AS (
  SELECT customer_id, AVG(total) as avg_order
  FROM orders
  WHERE created_at > '2025-01-01'
  GROUP BY customer_id
)
SELECT c.email, e.avg_order
FROM customers c
JOIN expensive_cte e ON e.customer_id = c.id
WHERE e.avg_order > 500;
```

Prompt Claude - "Is this CTE being materialized? How do I verify, and should I use NOT MATERIALIZED or inline it?"

Claude explains - in Postgres 12+, CTEs without side effects are not materialized by default unless they're referenced more than once. It suggests adding `EXPLAIN` to verify, and shows how to force inlining with `NOT MATERIALIZED` if needed, or force materialization with `MATERIALIZED` when the CTE result is used multiple times and re-computation would be expensive.

Real Workflow - Paste EXPLAIN, Get Fix

The fastest workflow:

1. Run `EXPLAIN (ANALYZE, BUFFERS) <query>` in psql
2. Copy the full output
3. Open Claude or ChatGPT
4. Use this template:

```
PostgreSQL 16. Table sizes - orders=8M rows, order_items=40M rows.
The following query takes 4.2 seconds. EXPLAIN ANALYZE output:

[paste here]

Existing indexes on orders - [paste]
Existing indexes on order_items - [paste]

Tell me - (1) what the bottleneck is, (2) what index to create, (3) any query rewrites.
```

Claude typically returns a diagnosis in under 30 seconds and includes copy-paste DDL.

Automating Query Optimization with a CI Pipeline

Build a system that catches slow queries before production:

```python
#!/usr/bin/env python3
query_optimizer_ci.py. Find slow queries and get fixes

import psycopg2
import anthropic
import json
import sys

def find_slow_queries(conn) -> list:
    """Get slowest queries from pg_stat_statements."""
    cur = conn.cursor()
    cur.execute("""
        SELECT query, calls, total_exec_time, mean_exec_time, max_exec_time, rows
        FROM pg_stat_statements
        WHERE mean_exec_time > 100  -- queries taking >100ms on average
        AND query NOT LIKE '%pg_stat%'
        ORDER BY total_exec_time DESC
        LIMIT 10
    """)
    return [dict(zip([d[0] for d in cur.description], row)) for row in cur.fetchall()]

def get_query_plan(conn, query: str) -> str:
    """Get EXPLAIN ANALYZE for a query."""
    cur = conn.cursor()
    try:
        # Clean up the query for EXPLAIN (remove parameterized values)
        explain_query = f"EXPLAIN (ANALYZE, BUFFERS) {query}"
        cur.execute(explain_query)
        return "\n".join([row[0] for row in cur.fetchall()])
    except Exception as e:
        return f"Error: {e}"

def optimize_with_claude(query: str, plan: str) -> str:
    """Use Claude to suggest optimizations."""
    client = anthropic.Anthropic()

    prompt = f"""PostgreSQL Slow Query Analysis

Query:
{query}

EXPLAIN ANALYZE Output:
{plan}

Provide:
1. What is the bottleneck in this query plan?
2. Suggest 3 specific fixes (indexes, rewrites, statistics updates)
3. Include exact DDL statements I can run
4. Estimate performance improvement for each fix
5. Which fix should I implement first?"""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    return message.content[0].text

if __name__ == "__main__":
    # Connect to Postgres
    conn = psycopg2.connect(
        host="localhost",
        database="mydb",
        user="postgres"
    )

    slow_queries = find_slow_queries(conn)

    for i, q in enumerate(slow_queries, 1):
        print(f"\n=== Slow Query #{i} ===")
        print(f"Average time: {q['mean_exec_time']:.2f}ms")
        print(f"Total time spent: {q['total_exec_time']:.0f}ms")
        print(f"Call count: {q['calls']}")
        print(f"\nQuery:\n{q['query'][:200]}...\n")

        plan = get_query_plan(conn, q['query'])
        analysis = optimize_with_claude(q['query'], plan)
        print(f"Claude's Analysis:\n{analysis}")

        if i >= 3:  # Limit to top 3 in CI
            break

    conn.close()
```

Run this in CI/CD after tests pass:

```yaml
.github/workflows/query-optimization.yml
name: Query Performance Check
on: [pull_request]

jobs:
  check-queries:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres

    steps:
      - uses: actions/checkout@v4

      - name: Setup database
        run: |
          # Import schema and migrations
          psql -h localhost -U postgres -d postgres -f schema.sql
          # Run test suite to populate pg_stat_statements
          npm run test:db

      - name: Find slow queries
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: python3 query_optimizer_ci.py > /tmp/analysis.md

      - name: Comment on PR
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const analysis = fs.readFileSync('/tmp/analysis.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Query Performance Analysis\n' + analysis
            });
```

Query Optimization Decision Tree

Claude can generate a decision tree for your specific database:

```
Start with an EXPLAIN ANALYZE output. For each node:

1. Is it a "Seq Scan" on a table > 1M rows?
   → Yes - Do you have an index on the filter column?
      → No: Create index. Estimate: 10-100x faster
      → Yes - Is the index being used? (check EXPLAIN with index hint)
   → No: Continue to next node

2. Is it a "Hash Join" with high memory usage?
   → Yes - Is work_mem too small?
      → Increase work_mem for this query
      → Or optimize the subquery to reduce cardinality
   → No: Continue

3. Is there a "CTE" or subquery showing "Filter - (rows removed)"?
   → Yes: Filter is happening after joining
      → Move the filter to the subquery WHERE clause
      → Estimate: 2-5x faster
   → No: Continue

4. Are estimates far off from actual rows?
   → Yes: Statistics are stale
      → Run ANALYZE table_name
      → Consider auto_explain to log slow queries
   → No: Query is optimized
```

Production Query Monitoring

Use AI to continuously monitor and fix slow queries in production:

```python
monitor_production_queries.py. Daily report of slow queries

import subprocess
import anthropic
from datetime import datetime, timedelta

def get_slow_queries_since(hours: int = 24) -> str:
    """Query slow log from last N hours."""
    result = subprocess.run([
        "psql", "-h", "prod-db.example.com",
        "-U", "monitor", "-d", "mydb",
        "-c", f"""
        SELECT query, calls, total_exec_time, mean_exec_time
        FROM pg_stat_statements
        WHERE query_start > now() - interval '{hours} hours'
        AND mean_exec_time > 500
        ORDER BY total_exec_time DESC
        LIMIT 5
        """
    ], capture_output=True, text=True)
    return result.stdout

def send_daily_report():
    """Generate and send daily optimization report."""
    client = anthropic.Anthropic()
    slow_queries = get_slow_queries_since(24)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Production Slow Query Report for {datetime.now().date()}

{slow_queries}

Provide a priority-ordered list of:
1. What queries need attention (worst first)
2. One-sentence diagnosis for each
3. Estimated fix complexity (easy/medium/hard)
4. If this is a repeat issue, note it

Keep this brief for email (max 200 words)."""
        }]
    )

    # Send via email
    report = message.content[0].text
    subprocess.run(["mail", "-s", "Daily DB Query Report", "team@example.com"],
                   input=report.encode())

Run daily
send_daily_report()
```

Schedule with cron:

```bash
Every morning at 8 AM
0 8 * * * /usr/bin/python3 /opt/monitor_production_queries.py
```

Query Tuning Patterns by Problem Type

Claude recognizes these patterns:

| Pattern | Symptom | Solution | Time Savings |
|---------|---------|----------|--------------|
| N+1 subquery | SELECT with correlated subquery | Convert to JOIN or LATERAL | 10-100x |
| Seq Scan on large table | Plan shows full table scan | Add index on filter column | 10-50x |
| Wrong join order | Planner joins large table first | Reorder joins or use hints | 2-10x |
| Bloated CTE | CTE materializes huge intermediate result | Add WHERE clause to CTE | 5-20x |
| Missing statistics | Cardinality estimates way off | Run ANALYZE | 2-5x |
| Unnecessary sorting | ORDER BY on unindexed column | Add index or use LIMIT | 2-20x |

Related Articles

- [Best AI Tools for SQL Query Optimization and Database](/best-ai-tools-for-sql-query-optimization-and-database-performance/)
- [AI Tools for Database Performance Optimization Query](/ai-tools-for-database-performance-optimization-query-analysis/)
- [AI-Powered Database Query Optimization Tools 2026](/ai-powered-database-query-optimization-tools/)
- [Best AI Assistant for SQL Query Optimization](/best-ai-assistant-for-sql-query-optimization/)
- [AI Tools for Debugging Postgres Query Planner Choosing](/ai-tools-for-debugging-postgres-query-planner-choosing-wrong/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
