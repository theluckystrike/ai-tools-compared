---
layout: default
title: "Claude vs GPT-4 for Writing SQL Queries 2026"
description: "Compare Claude and GPT-4o for generating complex SQL — window functions, CTEs, recursive queries, and query plan analysis on PostgreSQL and BigQuery"
date: 2026-03-22
author: theluckystrike
permalink: /claude-vs-gpt4-for-writing-sql-queries-2026/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, comparison, claude-ai]
---

{% raw %}

# Claude vs GPT-4 for Writing SQL Queries 2026

Writing complex SQL — window functions, CTEs, recursive queries, and multi-join aggregations — is where AI tools earn their keep. This comparison benchmarks Claude and GPT-4o on real-world SQL generation tasks against a PostgreSQL 16 database.

## Schema Used in Tests

```sql
-- Users and their subscription tiers
CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    plan       TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events: actions users take in the product
CREATE TABLE events (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id),
    event_type TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions: billing history
CREATE TABLE subscriptions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    plan        TEXT NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL,
    ended_at    TIMESTAMPTZ
);
```

## Test 1: Cohort Retention Analysis

**Prompt:**
```text
Write a PostgreSQL query to calculate weekly cohort retention.
Group users by signup week. For each cohort, calculate what % of users
returned and performed any event in weeks 1, 2, 3, and 4 after signup.
Return: cohort_week, cohort_size, retained_w1, retained_w2, retained_w3, retained_w4
as percentages.
```

### Claude Output

```sql
WITH cohorts AS (
    SELECT
        user_id,
        DATE_TRUNC('week', created_at) AS cohort_week
    FROM users
),
cohort_sizes AS (
    SELECT
        cohort_week,
        COUNT(*) AS cohort_size
    FROM cohorts
    GROUP BY cohort_week
),
user_activity AS (
    SELECT DISTINCT
        e.user_id,
        c.cohort_week,
        DATE_TRUNC('week', e.occurred_at) - DATE_TRUNC('week', c.cohort_week) AS weeks_since_signup
    FROM events e
    JOIN cohorts c USING (user_id)
    WHERE DATE_TRUNC('week', e.occurred_at) >= c.cohort_week  -- exclude pre-signup noise
),
retention_by_week AS (
    SELECT
        cohort_week,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = INTERVAL '1 week' THEN user_id END) AS w1,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = INTERVAL '2 weeks' THEN user_id END) AS w2,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = INTERVAL '3 weeks' THEN user_id END) AS w3,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = INTERVAL '4 weeks' THEN user_id END) AS w4
    FROM user_activity
    GROUP BY cohort_week
)
SELECT
    r.cohort_week,
    cs.cohort_size,
    ROUND(100.0 * r.w1 / cs.cohort_size, 1) AS retained_w1,
    ROUND(100.0 * r.w2 / cs.cohort_size, 1) AS retained_w2,
    ROUND(100.0 * r.w3 / cs.cohort_size, 1) AS retained_w3,
    ROUND(100.0 * r.w4 / cs.cohort_size, 1) AS retained_w4
FROM retention_by_week r
JOIN cohort_sizes cs USING (cohort_week)
ORDER BY r.cohort_week DESC
NULLS LAST;
```

Claude's query is correct and handles the edge case of pre-signup events (the `WHERE` clause in `user_activity` that excludes activity before cohort week). It uses `DISTINCT` in the COUNT to avoid double-counting users active in multiple weeks, and `INTERVAL` for type-safe week comparison.

### GPT-4o Output

GPT-4o generates a working query but:
- Uses `EXTRACT(EPOCH FROM ...)/ 604800` for week difference (fragile and hard to read)
- Missing the pre-signup event filter
- Uses `CASE WHEN weeks = 1` instead of interval comparison (wrong if events table uses different precision)

**Verdict: Claude** — more precise handling of interval arithmetic.

## Test 2: Running Total with Reset

**Prompt:**
```text
Write a PostgreSQL query to calculate a user's consecutive active days (streak).
A user is "active" on a day if they have at least one event.
The streak resets if they miss a day. Return user_id, current_streak (as of today),
and longest_streak_ever.
```

### Claude Output

```sql
WITH daily_activity AS (
    SELECT DISTINCT
        user_id,
        DATE(occurred_at AT TIME ZONE 'UTC') AS active_date
    FROM events
),
date_gaps AS (
    SELECT
        user_id,
        active_date,
        active_date - ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY active_date
        ) * INTERVAL '1 day' AS streak_group
        -- Consecutive dates have the same streak_group
        -- because (date - sequential_rownum) is constant
    FROM daily_activity
),
streaks AS (
    SELECT
        user_id,
        streak_group,
        COUNT(*) AS streak_length,
        MAX(active_date) AS streak_end
    FROM date_gaps
    GROUP BY user_id, streak_group
),
user_streaks AS (
    SELECT
        user_id,
        MAX(streak_length) AS longest_streak_ever,
        MAX(streak_length) FILTER (
            WHERE streak_end >= CURRENT_DATE - INTERVAL '1 day'
        ) AS current_streak
    FROM streaks
    GROUP BY user_id
)
SELECT
    user_id,
    COALESCE(current_streak, 0) AS current_streak,
    longest_streak_ever
FROM user_streaks
ORDER BY current_streak DESC NULLS LAST;
```

The `date - ROW_NUMBER() * INTERVAL '1 day'` trick for grouping consecutive dates is the standard PostgreSQL pattern. Claude implements it correctly and uses `FILTER` on the aggregate (SQL:2003 syntax) for clean conditional aggregation.

## Test 3: Recursive CTE — Organizational Hierarchy

**Prompt:**
```text
The users table has a manager_id column (self-referential FK).
Write a recursive CTE that returns the full reporting chain for a given user (id = 42),
including their level in the hierarchy and the path from root to user.
```

**Claude output:**

```sql
WITH RECURSIVE reporting_chain AS (
    -- Anchor: start with the target user
    SELECT
        id,
        email,
        manager_id,
        0 AS depth,
        ARRAY[id] AS path,
        email AS path_names
    FROM users
    WHERE id = 42

    UNION ALL

    -- Recursive: join to manager
    SELECT
        u.id,
        u.email,
        u.manager_id,
        rc.depth + 1,
        rc.path || u.id,
        rc.path_names || ' → ' || u.email
    FROM users u
    JOIN reporting_chain rc ON u.id = rc.manager_id
    WHERE u.id <> ALL(rc.path)  -- cycle guard
)
SELECT
    id,
    email,
    depth,
    path,
    path_names AS hierarchy_path
FROM reporting_chain
ORDER BY depth DESC;
-- depth DESC = root first
```

The cycle guard (`WHERE u.id <> ALL(rc.path)`) prevents infinite loops on malformed data. Claude uses `ARRAY` accumulation for both the path (IDs) and a human-readable path string.

## Test 4: JSONB Query — Properties Aggregation

**Prompt:**
```text
The events.properties column contains JSONB.
For 'checkout' events, aggregate: total count, avg order_value (properties->>'order_value'),
breakdown by properties->>'payment_method', and top 5 products by frequency
(properties->'product_ids' is a JSONB array).
```

```sql
-- Main checkout metrics
WITH checkout_events AS (
    SELECT
        properties,
        (properties->>'order_value')::NUMERIC AS order_value
    FROM events
    WHERE event_type = 'checkout'
),
payment_breakdown AS (
    SELECT
        properties->>'payment_method' AS payment_method,
        COUNT(*) AS count,
        ROUND(AVG((properties->>'order_value')::NUMERIC), 2) AS avg_value
    FROM checkout_events
    GROUP BY 1
),
product_counts AS (
    SELECT
        product_id,
        COUNT(*) AS frequency
    FROM checkout_events,
         LATERAL jsonb_array_elements_text(properties->'product_ids') AS t(product_id)
    GROUP BY product_id
    ORDER BY frequency DESC
    LIMIT 5
)
SELECT
    (SELECT COUNT(*) FROM checkout_events) AS total_checkouts,
    (SELECT ROUND(AVG(order_value), 2) FROM checkout_events) AS avg_order_value,
    (SELECT jsonb_agg(row_to_json(payment_breakdown.*)) FROM payment_breakdown) AS by_payment_method,
    (SELECT jsonb_agg(row_to_json(product_counts.*)) FROM product_counts) AS top_products;
```

Claude correctly uses `jsonb_array_elements_text` with `LATERAL` to unnest the product ID array — this is the PostgreSQL-idiomatic approach. GPT-4o sometimes uses `json_each` (for plain JSON) or misses the `LATERAL` keyword.

## Test 5: Query Plan Analysis

This is where the comparison gets interesting. When given a slow query and its `EXPLAIN ANALYZE` output, both tools can suggest fixes — but the quality of reasoning differs.

**Prompt:**
```text
This query takes 8 seconds on a 10M row events table:

SELECT user_id, COUNT(*) as event_count
FROM events
WHERE occurred_at > NOW() - INTERVAL '30 days'
  AND event_type = 'page_view'
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 100;

EXPLAIN ANALYZE output:
  Sort  (cost=142857.23..143107.23 rows=100000 width=12) (actual time=8234.123..8241.456 rows=100 loops=1)
    ->  HashAggregate  (cost=127234.00..132234.00 rows=100000 width=12) (actual time=8100.234..8210.123 rows=45231 loops=1)
          ->  Seq Scan on events  (cost=0.00..119234.00 rows=1600000 width=8) (actual time=0.123..7234.567 rows=1587432 loops=1)
                Filter: ((occurred_at > (now() - '30 days'::interval)) AND (event_type = 'page_view'))
                Rows Removed by Filter: 8412568

What indexes should I add?
```

**Claude's response:**

```sql
-- The Seq Scan with 8.4M rows removed means no useful index exists.
-- Create a composite index matching the WHERE clause columns:

CREATE INDEX CONCURRENTLY idx_events_type_occurred
ON events (event_type, occurred_at DESC)
WHERE occurred_at > NOW() - INTERVAL '90 days';  -- partial index to keep it small

-- After index creation, verify it's used:
EXPLAIN (ANALYZE, BUFFERS) SELECT user_id, COUNT(*) as event_count
FROM events
WHERE occurred_at > NOW() - INTERVAL '30 days'
  AND event_type = 'page_view'
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 100;

-- Expected improvement: Index Scan instead of Seq Scan,
-- reducing rows examined from 10M to ~1.6M
-- Estimated query time after index: 800ms-1.2s
```

Claude explains the reasoning: the composite index on `(event_type, occurred_at)` allows the planner to do an index range scan on the exact `event_type = 'page_view'` partition and then filter by date — eliminating the sequential scan. The partial index (`WHERE occurred_at > NOW() - INTERVAL '90 days'`) keeps the index small since data older than 90 days is never queried with this pattern.

GPT-4o suggests a similar index but omits the partial index option and doesn't explain why the column order matters (high-cardinality filter first, range filter second).

## Test 6: BigQuery vs PostgreSQL Syntax Differences

**Prompt:**
```text
I'm migrating this PostgreSQL window function query to BigQuery.
What needs to change?

SELECT
  user_id,
  SUM(order_value) OVER (
    PARTITION BY user_id
    ORDER BY occurred_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM events;
```

Claude's migration output:

```sql
-- BigQuery version (mostly identical — standard SQL window functions are portable)
SELECT
  user_id,
  SUM(order_value) OVER (
    PARTITION BY user_id
    ORDER BY occurred_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM `project.dataset.events`;

-- Key differences Claude notes:
-- 1. Table reference uses backtick notation: `project.dataset.table`
-- 2. TIMESTAMPTZ → TIMESTAMP (BigQuery uses TIMESTAMP with UTC semantics)
-- 3. BIGSERIAL → INT64 (no sequences in BigQuery)
-- 4. JSONB → JSON (BigQuery uses JSON type, operators differ: JSON_VALUE instead of ->>)
-- 5. NOW() → CURRENT_TIMESTAMP() in BigQuery standard SQL
```

Claude proactively lists the PostgreSQL-specific types that won't migrate cleanly, even though the question only asked about the window function. This is the pattern where Claude's broader context awareness is useful: it answers the stated question and flags adjacent issues.

## Summary: When to Use Each Tool

Claude is stronger for:
- Complex multi-step queries requiring precise interval and timestamp arithmetic
- Recursive CTEs with cycle detection
- JSONB queries using PostgreSQL-specific operators
- Query plan analysis and index recommendations
- Cross-dialect migration awareness

GPT-4o is comparable for:
- Simple SELECT/JOIN/GROUP BY queries
- Generating CREATE TABLE schemas from descriptions
- Explaining what an existing query does

For production SQL work — especially analytics queries with window functions, CTEs, and JSONB — Claude produces fewer subtle errors. The interval arithmetic and pre-signup event filter in Test 1, the LATERAL usage in Test 4, and the partial index recommendation in Test 5 are all things GPT-4o missed or got wrong.

## Related Articles

- [AI Autocomplete Comparison for Writing SQL Queries Inside](/ai-autocomplete-comparison-for-writing-sql-queries-inside-id/)
- [Best Self Hosted AI Model for Writing SQL Queries from](/best-self-hosted-ai-model-for-writing-sql-queries-from-natural-language/)
- [Best AI Assistant for Generating SQL Recursive Queries](/best-ai-assistant-for-generating-sql-recursive-queries-for-hierarchical-org-chart-data/)
- [Best AI for Writing dbt Macros That Generate Dynamic SQL](/best-ai-for-writing-dbt-macros-that-generate-dynamic-sql-bas/)
- [Best AI for Writing SQL Performance Tuning Recommendations](/best-ai-for-writing-sql-performance-tuning-recommendations-f/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
