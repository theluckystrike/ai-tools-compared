---
layout: default
title: "AI-Powered Database Performance Tuning Tools"
description: "Compare AI tools for PostgreSQL and MySQL performance tuning — query analysis, index recommendations, EXPLAIN plan interpretation, and slow query fixes"
date: 2026-03-22
author: theluckystrike
permalink: ai-powered-database-performance-tuning
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Database performance tuning requires reading query plans, understanding statistics, and knowing which indexes help and which hurt. This is historically expert-only territory — but AI tools have gotten good enough to replace a lot of that expertise for the 80% case. This guide covers practical AI-assisted tuning for PostgreSQL and MySQL.

## Key Takeaways

- **This is historically expert-only territory**: but AI tools have gotten good enough to replace a lot of that expertise for the 80% case.
- **ROOT_CAUSE**: The primary reason this query is slow (1 sentence)
2.
- **Topics covered**: the core workflow, extracting slow queries, ai query plan interpretation
- **Practical guidance included**: Step-by-step setup and configuration instructions

## The Core Workflow

```
Identify slow queries (pg_stat_statements / slow query log)
          ↓
Run EXPLAIN ANALYZE
          ↓
AI interpretation → Index recommendations → Query rewrite suggestions
          ↓
Measure improvement (before/after latency)
```

## Extracting Slow Queries

```python
# query_harvester.py
import psycopg2
import json
from anthropic import Anthropic

client = Anthropic()

def get_slow_queries(conn_string: str, min_mean_ms: float = 100) -> list[dict]:
    """Get the top slow queries from pg_stat_statements."""
    with psycopg2.connect(conn_string) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    query,
                    calls,
                    round(mean_exec_time::numeric, 2) AS mean_ms,
                    round(total_exec_time::numeric, 2) AS total_ms,
                    round(stddev_exec_time::numeric, 2) AS stddev_ms,
                    rows,
                    shared_blks_hit,
                    shared_blks_read,
                    round(100.0 * shared_blks_hit /
                        NULLIF(shared_blks_hit + shared_blks_read, 0), 1
                    ) AS cache_hit_pct
                FROM pg_stat_statements
                WHERE mean_exec_time > %s
                ORDER BY mean_exec_time DESC
                LIMIT 20
            """, (min_mean_ms,))

            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]

def get_explain_plan(conn_string: str, query: str) -> str:
    """Get the EXPLAIN ANALYZE output for a query."""
    # Replace parameter placeholders for analysis
    safe_query = query.replace("$1", "'placeholder'").replace("$2", "'placeholder2'")

    with psycopg2.connect(conn_string) as conn:
        conn.set_session(readonly=True)
        with conn.cursor() as cur:
            cur.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) {safe_query}")
            rows = cur.fetchall()
    return "\n".join(row[0] for row in rows)
```

## AI Query Plan Interpretation

```python
def interpret_query_plan(
    query: str,
    explain_output: str,
    query_stats: dict
) -> str:
    """Have Claude interpret an EXPLAIN ANALYZE output and suggest improvements."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""You are a PostgreSQL performance expert. Analyze this slow query.

Query statistics:
- Mean execution: {query_stats.get('mean_ms')}ms
- Calls: {query_stats.get('calls')}
- Cache hit rate: {query_stats.get('cache_hit_pct')}%
- Rows returned: {query_stats.get('rows', 0) / max(query_stats.get('calls', 1), 1):.1f} avg

SQL:
{query}

EXPLAIN ANALYZE output:
{explain_output}

Provide:
1. ROOT_CAUSE: The primary reason this query is slow (1 sentence)
2. INDEX_SUGGESTIONS: Exact CREATE INDEX statements to add (if applicable)
3. QUERY_REWRITE: Improved SQL if the query structure is inefficient
4. QUICK_WINS: Changes that can be made without schema changes
5. EXPECTED_IMPROVEMENT: Estimated speedup if suggestions are applied"""
        }]
    )
    return response.content[0].text

def batch_analyze_slow_queries(conn_string: str) -> list[dict]:
    """Analyze all slow queries and generate a tuning report."""
    slow_queries = get_slow_queries(conn_string, min_mean_ms=100)
    results = []

    for query_stat in slow_queries[:10]:  # Top 10
        query = query_stat["query"]

        try:
            explain = get_explain_plan(conn_string, query)
        except Exception as e:
            explain = f"Could not EXPLAIN: {e}"

        analysis = interpret_query_plan(query, explain, query_stat)
        results.append({
            "query": query[:200],
            "mean_ms": query_stat["mean_ms"],
            "calls": query_stat["calls"],
            "analysis": analysis
        })

    return results
```

## Index Recommendation Engine

```python
def recommend_indexes(
    conn_string: str,
    table_name: str
) -> str:
    """Analyze a table and recommend missing indexes."""
    with psycopg2.connect(conn_string) as conn:
        with conn.cursor() as cur:
            # Get table structure
            cur.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))
            columns = cur.fetchall()

            # Get existing indexes
            cur.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = %s
            """, (table_name,))
            indexes = cur.fetchall()

            # Get table size
            cur.execute("""
                SELECT pg_size_pretty(pg_total_relation_size(%s))
            """, (table_name,))
            size = cur.fetchone()[0]

            # Get sequential scan stats (high seq_scan with low idx_scan = missing index)
            cur.execute("""
                SELECT seq_scan, idx_scan, n_live_tup
                FROM pg_stat_user_tables
                WHERE relname = %s
            """, (table_name,))
            stats = cur.fetchone()

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1200,
        messages=[{
            "role": "user",
            "content": f"""Recommend indexes for this PostgreSQL table.

Table: {table_name}
Size: {size}
Columns: {json.dumps([{"name": c[0], "type": c[1], "nullable": c[2]} for c in columns], indent=2)}

Existing indexes:
{json.dumps([{"name": i[0], "def": i[1]} for i in indexes], indent=2)}

Scan statistics:
- Sequential scans: {stats[0] if stats else 'unknown'}
- Index scans: {stats[1] if stats else 'unknown'}
- Live rows: {stats[2] if stats else 'unknown'}

Based on column types and naming patterns (foreign keys, timestamps, status fields):
1. List indexes that are likely missing
2. Provide exact CREATE INDEX CONCURRENTLY statements
3. Flag any existing indexes that might be redundant
4. Note if the seq_scan:idx_scan ratio suggests a missing index"""
        }]
    )
    return response.content[0].text
```

## Query Rewrite Examples

AI tools are particularly good at rewriting anti-patterns. Give Claude these and it consistently fixes them:

```python
REWRITE_EXAMPLES = """
-- Anti-pattern 1: SELECT * with unnecessary columns
SELECT * FROM orders WHERE user_id = $1;

-- Anti-pattern 2: LIKE with leading wildcard (full table scan)
SELECT * FROM products WHERE name LIKE '%bluetooth%';

-- Anti-pattern 3: Non-sargable predicate
SELECT * FROM orders WHERE YEAR(created_at) = 2026;

-- Anti-pattern 4: Correlated subquery in SELECT
SELECT
    o.id,
    (SELECT COUNT(*) FROM items WHERE items.order_id = o.id) AS item_count
FROM orders o;

-- Anti-pattern 5: IN with large subquery
SELECT * FROM users WHERE id IN (
    SELECT user_id FROM orders WHERE status = 'pending'
);
"""

def rewrite_anti_patterns(sql_batch: str) -> str:
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Rewrite these SQL queries to fix common performance anti-patterns.
For each query, show the original and the rewrite with a one-line explanation.

{sql_batch}

Rules:
- Prefer EXISTS over IN for subqueries
- Use specific columns instead of SELECT *
- Replace non-sargable predicates with index-friendly equivalents
- Convert correlated subqueries to JOINs where possible
- Use CTEs for readability when joins get complex"""
        }]
    )
    return response.content[0].text
```

## Automated Slow Query Report

```python
def generate_tuning_report(conn_string: str, output_path: str = "db_tuning_report.md"):
    """Generate a full database performance report."""
    analyses = batch_analyze_slow_queries(conn_string)

    with open(output_path, "w") as f:
        f.write("# Database Performance Tuning Report\n\n")
        f.write(f"Generated: {__import__('datetime').date.today()}\n\n")

        for i, item in enumerate(analyses, 1):
            f.write(f"## Query #{i} — {item['mean_ms']}ms avg ({item['calls']} calls)\n\n")
            f.write(f"```sql\n{item['query']}\n```\n\n")
            f.write(item["analysis"])
            f.write("\n\n---\n\n")

    print(f"Report written to {output_path}")

if __name__ == "__main__":
    import os
    generate_tuning_report(os.environ["DATABASE_URL"])
```

## Tool Comparison

| Tool | Query Analysis | Index Recs | Plan Interpretation | Cost |
|---|---|---|---|---|
| Claude (API) | Excellent | Yes, with context | Full narrative | ~$0.02/query |
| GPT-4 | Good | Yes | Good | ~$0.03/query |
| PgHero | Visual only | Basic | No | Free/paid |
| pganalyze | Automated | Good | Limited | $149+/mo |
| OtterTune | ML-based | Yes | No narrative | $400+/mo |

Claude's advantage is explaining *why* a query is slow in plain language — useful for developers who aren't database experts.

## Related Reading

- [Best AI Tools for SQL Query Optimization](/ai-tools-compared/best-ai-tools-for-sql-query-optimization-and-database-performance/)
- [How to Use AI for Log Anomaly Detection](/ai-tools-compared/how-to-use-ai-for-log-anomaly-detection/)
- [AI Tools for Automated Schema Validation](/ai-tools-compared/ai-tools-for-automated-schema-validation/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
