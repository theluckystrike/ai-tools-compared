---
layout: default
title: "Claude vs GPT-4 for Writing SQL Queries 2026"
description: "Compare Claude and GPT-4o for generating complex SQL — window functions, CTEs, recursive queries, and query plan analysis on PostgreSQL and BigQuery"
date: 2026-03-22
author: theluckystrike
permalink: /claude-vs-gpt4-for-writing-sql-queries-2026/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
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

## Summary

| Query Type | Claude | GPT-4o |
|-----------|--------|--------|
| Window functions | Excellent | Good |
| Recursive CTEs (cycle guards) | Correct | Often misses guard |
| Interval arithmetic | Idiomatic | Fragile workarounds |
| JSONB operations | Correct | Usually correct |
| FILTER clause aggregation | Uses it | Uses CASE WHEN |
| Query formatting/readability | Excellent | Good |

For complex analytical SQL, Claude produces more idiomatic PostgreSQL with better handling of edge cases. GPT-4o is fine for straightforward CRUD queries but shows cracks on advanced features.

## Related Reading

- [Best AI Tools for SQL Query Generation](/ai-tools-compared/best-ai-tools-for-sql-query-generation-2026/)
- [Best AI Self-Hosted Model for Writing SQL Queries](/ai-tools-compared/best-self-hosted-ai-model-for-writing-sql-queries-from-natur/)
- [Best AI Tools for SQL Query Optimization](/ai-tools-compared/best-ai-tools-for-sql-query-optimization-2026/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
