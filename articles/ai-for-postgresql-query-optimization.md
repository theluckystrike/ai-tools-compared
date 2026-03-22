---
layout: default
title: "How to Use AI for PostgreSQL Query Optimization"
description: "Learn how Claude, GPT-4, and Copilot help you optimize slow PostgreSQL queries using EXPLAIN ANALYZE, index hints, and rewrite suggestions"
date: 2026-03-22
author: theluckystrike
permalink: /ai-for-postgresql-query-optimization/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

PostgreSQL query optimization is one of those tasks where AI tools earn their keep fast. A slow query plan, a missing index, a correlated subquery eating CPU — AI assistants can spot these patterns and suggest fixes in seconds. This guide shows how to use Claude, GPT-4, and GitHub Copilot to tune real Postgres queries, interpret EXPLAIN output, and redesign schemas when needed.

## Why AI Accelerates Postgres Tuning

Manual query optimization requires you to read EXPLAIN ANALYZE output, understand planner decisions, know index types, and recognize anti-patterns. AI tools compress that feedback loop. You paste the query + plan, and get actionable rewrites instead of spending 20 minutes reading docs.

The three main use cases:

1. **EXPLAIN ANALYZE interpretation** — translate planner output into plain English
2. **Query rewrites** — replace correlated subqueries, CTEs with poor estimates, or sequential scans
3. **Index recommendations** — suggest which indexes to create, when to use partial or covering indexes

## Setting Up the Workflow

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

## Claude for Query Analysis

Claude handles long EXPLAIN ANALYZE output well and gives structured responses. A good prompt:

```
I have a slow PostgreSQL query (taking 2.3s). Here's the query, the EXPLAIN ANALYZE output,
and the existing indexes. Identify the bottleneck and suggest specific fixes.

[paste query]
[paste EXPLAIN ANALYZE]
[paste indexes]

PostgreSQL version: 16. Table has 8M rows in orders, 2M in customers, 40M in order_items.
```

Claude's typical response identifies:

- Which node in the plan is the bottleneck (e.g., `Hash Join` spilling to disk, `Seq Scan` on a large table)
- Why the planner chose that path (bad statistics, no index, low selectivity estimate)
- A concrete rewrite or index DDL

**Sample output Claude generates:**

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

## GPT-4 for Rewriting Correlated Subqueries

GPT-4 is strong at pattern recognition. It excels at spotting N+1 subqueries and replacing them with set-based rewrites.

**Before (slow correlated subquery):**

```sql
-- This runs the subquery once per row in customers
SELECT c.id, c.email,
  (SELECT SUM(o.total) FROM orders o WHERE o.customer_id = c.id
   AND o.created_at > NOW() - INTERVAL '30 days') as monthly_spend
FROM customers c
WHERE c.tier = 'premium';
```

**GPT-4 rewrite:**

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

## GitHub Copilot for Inline Index Design

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

The `INCLUDE` clause suggestion is notable — Copilot often adds covering columns based on what it sees in nearby SELECT statements. Not always correct, but a strong starting point.

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

## Comparing Output Quality

| Task | Claude | GPT-4 | Copilot |
|---|---|---|---|
| EXPLAIN ANALYZE reading | Excellent — node-by-node breakdown | Good — identifies key nodes | Weak — no context |
| Correlated subquery rewrite | Strong | Excellent | Moderate (in-file only) |
| Index DDL suggestions | Strong, includes CONCURRENTLY | Strong | Good with INCLUDE columns |
| Statistics/vacuum advice | Yes | Sometimes | No |
| Schema redesign | Good for normalized schemas | Good | No |

## Handling Bloated CTEs

A common anti-pattern: CTEs used as optimization fences (pre-Postgres 12 behavior that many devs still write):

```sql
-- Old pattern — Postgres 12+ doesn't materialize by default, but many devs still use it
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

Prompt Claude: "Is this CTE being materialized? How do I verify, and should I use NOT MATERIALIZED or inline it?"

Claude explains: in Postgres 12+, CTEs without side effects are not materialized by default unless they're referenced more than once. It suggests adding `EXPLAIN` to verify, and shows how to force inlining with `NOT MATERIALIZED` if needed, or force materialization with `MATERIALIZED` when the CTE result is used multiple times and re-computation would be expensive.

## Real Workflow: Paste EXPLAIN, Get Fix

The fastest workflow:

1. Run `EXPLAIN (ANALYZE, BUFFERS) <query>` in psql
2. Copy the full output
3. Open Claude or ChatGPT
4. Use this template:

```
PostgreSQL 16. Table sizes: orders=8M rows, order_items=40M rows.
The following query takes 4.2 seconds. EXPLAIN ANALYZE output:

[paste here]

Existing indexes on orders: [paste]
Existing indexes on order_items: [paste]

Tell me: (1) what the bottleneck is, (2) what index to create, (3) any query rewrites.
```

Claude typically returns a diagnosis in under 30 seconds and includes copy-paste DDL.

## Related Articles

- [Best AI Tools for SQL Query Optimization and Database](/ai-tools-compared/best-ai-tools-for-sql-query-optimization-and-database-performance/)
- [AI Tools for Database Performance Optimization Query](/ai-tools-compared/ai-tools-for-database-performance-optimization-query-analysis/)
- [AI-Powered Database Query Optimization Tools 2026](/ai-tools-compared/ai-powered-database-query-optimization-tools/)
- [Best AI Assistant for SQL Query Optimization](/ai-tools-compared/best-ai-assistant-for-sql-query-optimization/)
- [AI Tools for Debugging Postgres Query Planner Choosing](/ai-tools-compared/ai-tools-for-debugging-postgres-query-planner-choosing-wrong/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
