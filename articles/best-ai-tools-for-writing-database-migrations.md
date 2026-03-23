---
layout: default
title: "Best AI Tools for Writing Database Migrations"
description: "Compare Claude and Copilot for generating Alembic, Flyway, and Liquibase migrations with correct rollback logic, index strategies, and zero-downtime patterns"
date: 2026-03-22
author: theluckystrike
permalink: /best-ai-tools-for-writing-database-migrations/
categories: [guides]
tags: [ai-tools-compared, best-of, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Database migrations are high-risk operations. A poorly written migration with no rollback path, missing index, or table lock on a large table can cause production outages. AI tools vary significantly in their ability to generate safe, production-ready migrations. the difference between a model that adds a column and one that understands table locks, zero-downtime strategies, and rollback requirements.

What Separates Good Migration Generation

Before comparing tools, define what a production-quality migration requires:

- `upgrade()` and `downgrade()` both implemented and tested
- Large table modifications use non-blocking DDL where available (PostgreSQL `NOT VALID` for constraints)
- New non-nullable columns get a default value or are added in multiple steps
- Index creation uses `CREATE INDEX CONCURRENTLY` on PostgreSQL
- Correct column type mappings (not using `TEXT` where `VARCHAR(255)` is appropriate)
- No implicit table locks on tables with millions of rows

Test 1: Adding a Non-Nullable Column with Alembic

This is a classic danger zone: adding a NOT NULL column requires all existing rows to have a value, which causes a full table rewrite without careful handling.

Prompt:

```
Generate an Alembic migration to add a 'notification_preferences' JSONB column
to the 'users' table (PostgreSQL, ~5 million rows).
The column should be NOT NULL with a default of empty JSON object {}.
Existing rows should be backfilled. Do not lock the table.
Include both upgrade() and downgrade().
```

Claude's output:

```python
"""Add notification_preferences to users

Revision ID: a1b2c3d4e5f6
Revises: prev_revision
Create Date: 2026-03-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Step 1: Add column as NULLABLE with default
    # This avoids a full table rewrite on PostgreSQL
    op.add_column(
        'users',
        sa.Column(
            'notification_preferences',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default='{}',
        )
    )

    # Step 2: Backfill in batches to avoid long transactions
    conn = op.get_bind()
    conn.execute(sa.text("""
        DO $$
        DECLARE
            batch_size INT := 10000;
            last_id BIGINT := 0;
            max_id BIGINT;
        BEGIN
            SELECT MAX(id) INTO max_id FROM users;

            WHILE last_id < max_id LOOP
                UPDATE users
                SET notification_preferences = '{}'::jsonb
                WHERE id > last_id
                  AND id <= last_id + batch_size
                  AND notification_preferences IS NULL;

                last_id := last_id + batch_size;
                PERFORM pg_sleep(0.01);  -- small delay to avoid I/O saturation
            END LOOP;
        END $$;
    """))

    # Step 3: Set NOT NULL constraint (uses NOT VALID to avoid full scan)
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN notification_preferences SET NOT NULL
    """)


def downgrade():
    op.drop_column('users', 'notification_preferences')
```

Claude correctly identifies the three-step pattern (add nullable → backfill → set NOT NULL) and uses batch updates with sleep to avoid I/O pressure. It also notes `NOT VALID` as an option for check constraints (though NOT NULL doesn't use it).

Copilot's output for the same prompt:

```python
def upgrade():
    op.add_column(
        'users',
        sa.Column(
            'notification_preferences',
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb")
        )
    )

def downgrade():
    op.drop_column('users', 'notification_preferences')
```

Copilot's version adds the column as NOT NULL immediately. On PostgreSQL 11+, a column with a constant default value doesn't trigger a table rewrite. but it does still acquire an AccessExclusiveLock for the ALTER TABLE, which blocks all reads and writes for the duration. On a 5M row table, this is seconds to minutes depending on load. Copilot doesn't warn about this.

Test 2: Adding an Index to a Large Table

Prompt:

```
Generate an Alembic migration to add an index on users.email for a PostgreSQL
table with 8 million rows. The index must not block reads or writes during creation.
```

Claude:

```python
def upgrade():
    # CREATE INDEX CONCURRENTLY builds the index without locking the table
    # This cannot run inside a transaction, so we disable autocommit
    op.execute('COMMIT')  # End the implicit transaction
    op.execute(
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_email ON users (email)'
    )

def downgrade():
    op.execute('COMMIT')
    op.execute('DROP INDEX CONCURRENTLY IF EXISTS ix_users_email')
```

Important note Claude adds:

```
Alembic wraps migrations in transactions by default.
CREATE INDEX CONCURRENTLY cannot run inside a transaction.
Add to your migration:

    def upgrade():
        # ...

And configure the migration to disable transaction wrapping:
```

```python
In your migration file header:
This migration requires transaction=False
Add to env.py: context.configure(..., transaction_per_migration=False)
Or use: with op.get_context().autocommit_block():
```

Copilot generates a standard `op.create_index()` call, which does not use `CONCURRENTLY` by default and will lock the table.

Test 3: Flyway Migration (Java/PostgreSQL)

```sql
-- V3__add_soft_delete_to_orders.sql
-- Generated by Claude

-- Add deleted_at column (nullable. NULL means not deleted)
ALTER TABLE orders
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for filtering non-deleted records efficiently
-- Uses partial index (only indexes non-deleted rows, much smaller)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_active
    ON orders (customer_id, created_at)
    WHERE deleted_at IS NULL;

-- NOTE: Flyway does not support CONCURRENTLY inside transactions by default.
-- Either use Flyway's outOfOrder or a separate migration file for the index.
-- See: https://flywaydb.org/documentation/database/postgresql#concurrent-index
```

```sql
-- Undo migration (Flyway Undo. requires Team license)
-- V3__add_soft_delete_to_orders.undo.sql
DROP INDEX IF EXISTS idx_orders_active;
ALTER TABLE orders DROP COLUMN IF EXISTS deleted_at;
```

Claude adds the Flyway CONCURRENTLY caveat. a detail that would otherwise cause a surprise production failure.

Test 4: Liquibase Multi-Step Column Rename

Column renaming with zero downtime requires multiple deploy cycles:

```
Generate a Liquibase changeSet to rename 'user_name' to 'display_name'
in the users table, using a zero-downtime multi-phase approach.
The app will have old and new code running simultaneously during deploy.
```

Claude generates a three-phase plan:

```xml
<!-- Phase 1: Add new column, sync via trigger -->
<changeSet id="rename-username-phase1" author="migration">
    <!-- Add new column -->
    <addColumn tableName="users">
        <column name="display_name" type="VARCHAR(100)"/>
    </addColumn>

    <!-- Copy existing data -->
    <sql>UPDATE users SET display_name = user_name WHERE display_name IS NULL</sql>

    <!-- Create trigger to keep columns in sync during dual-write period -->
    <sql>
        CREATE OR REPLACE FUNCTION sync_display_name()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' OR NEW.user_name IS DISTINCT FROM OLD.user_name THEN
                NEW.display_name := NEW.user_name;
            END IF;
            IF TG_OP = 'INSERT' OR NEW.display_name IS DISTINCT FROM OLD.display_name THEN
                NEW.user_name := NEW.display_name;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER sync_user_display_name
        BEFORE INSERT OR UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION sync_display_name();
    </sql>
</changeSet>

<!-- Phase 2 (next deploy): Drop trigger after all app code uses display_name -->
<changeSet id="rename-username-phase2" author="migration">
    <sql>DROP TRIGGER IF EXISTS sync_user_display_name ON users</sql>
    <sql>DROP FUNCTION IF EXISTS sync_display_name()</sql>
</changeSet>

<!-- Phase 3 (deploy after that): Drop old column -->
<changeSet id="rename-username-phase3" author="migration">
    <dropColumn tableName="users" columnName="user_name"/>
</changeSet>
```

This is exactly correct zero-downtime rename strategy. No other AI tool generated all three phases on first pass.

Migration Review Checklist (Ask Claude to Verify)

```
Review this migration against this checklist:
- [ ] Does downgrade() restore the database to pre-upgrade state exactly?
- [ ] Will any ALTER TABLE statement lock the table on PostgreSQL?
- [ ] Are indexes created CONCURRENTLY where the table has >100k rows?
- [ ] Are new NOT NULL columns added in multiple steps with backfill?
- [ ] Is there a risk of deadlock if two migration runners execute simultaneously?
- [ ] Does the migration work correctly if run twice (idempotent)?

Migration:
[paste migration]
```

Related Articles

- [AI Tools for Automated Migration Testing 2026](/ai-tools-for-automated-migration-testing-2026/)
- [Best AI Tools for Database Schema Migration Review 2026](/best-ai-tools-for-database-schema-migration-review-2026/)
- [Best AI Tools for Writing SQL Migrations in 2026](/articles/best-ai-tools-for-writing-sql-migrations-2026/)
- [AI Tools for Writing pytest Tests for Alembic Database](/ai-tools-for-writing-pytest-tests-for-alembic-database-migra/)
- [AI Tools for Database Schema Migration Review 2026](/ai-tools-for-database-schema-migration-review-2026/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)

Frequently Asked Questions

Are free AI tools good enough for ai tools for writing database migrations?

Free tiers work for basic tasks and evaluation, but paid plans typically offer higher rate limits, better models, and features needed for professional work. Start with free options to find what works for your workflow, then upgrade when you hit limitations.

How do I evaluate which tool fits my workflow?

Run a practical test: take a real task from your daily work and try it with 2-3 tools. Compare output quality, speed, and how naturally each tool fits your process. A week-long trial with actual work gives better signal than feature comparison charts.

Do these tools work offline?

Most AI-powered tools require an internet connection since they run models on remote servers. A few offer local model options with reduced capability. If offline access matters to you, check each tool's documentation for local or self-hosted options.

Can AI tools handle complex database queries safely?

AI tools generate queries well for common patterns, but always test generated queries on a staging database first. Complex joins, subqueries, and performance-sensitive operations need human review. Never run AI-generated queries directly against production data without testing.

Should I switch tools if something better comes out?

Switching costs are real: learning curves, workflow disruption, and data migration all take time. Only switch if the new tool solves a specific problem you experience regularly. Marginal improvements rarely justify the transition overhead.
{% endraw %}
