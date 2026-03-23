---
layout: default
title: "AI Tools for Creating Realistic Test Datasets That Preserve"
description: "Generate test datasets with valid foreign keys using AI. Referential integrity, realistic distributions, and PII-safe synthetic data generation."
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /ai-tools-for-creating-realistic-test-datasets-that-preserve-/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---
{% raw %}

Claude and ChatGPT can generate realistic test data that maintains database referential integrity by analyzing your schema and understanding foreign key constraints. These AI tools synthesize data that respects relationships between tables, maintaining consistency across orders, users, and products while avoiding the privacy concerns of copying production data and the errors of manual script generation.

## Table of Contents

- [Why Referential Integrity Matters in Test Data](#why-referential-integrity-matters-in-test-data)
- [Popular AI Tools for Test Data Generation](#popular-ai-tools-for-test-data-generation)
- [Implementing AI-Generated Test Data in Your Workflow](#implementing-ai-generated-test-data-in-your-workflow)
- [Advanced Considerations](#advanced-considerations)
- [Automating Test Data Refresh in CI/CD](#automating-test-data-refresh-in-cicd)
- [Choosing the Right Tool](#choosing-the-right-tool)
- [Database-Specific Generation Patterns](#database-specific-generation-patterns)
- [Advanced: Temporal Data and Distributions](#advanced-temporal-data-and-distributions)
- [Performance Tuning for Large Datasets](#performance-tuning-for-large-datasets)
- [Testing Against Generated Data](#testing-against-generated-data)

## Why Referential Integrity Matters in Test Data

When your application relies on related database tables, test data must reflect real-world relationships. An user table links to orders, which connect to products and payment records. If your test dataset contains an order referencing a non-existent user, your tests will fail with integrity errors rather than revealing actual application bugs.

Traditional approaches like copying production data raise privacy concerns, while manual script generation proves time-consuming and error-prone. AI tools address both problems by synthesizing realistic data that respects your schema constraints.

## Popular AI Tools for Test Data Generation

### 1. GenerateData

This open-source tool uses customizable templates to produce data matching your schema. You define field types and constraints, and the tool generates corresponding values that maintain relationships across tables.

```python
# Example: Configuring GenerateData for related tables
config = {
    "users": {
        "id": {"type": "autoincrement"},
        "email": {"type": "email"},
        "country_id": {"type": "foreign_key", "table": "countries"}
    },
    "orders": {
        "id": {"type": "autoincrement"},
        "user_id": {"type": "foreign_key", "table": "users"},
        "product_id": {"type": "foreign_key", "table": "products"}
    }
}
```

GenerateData handles the complexity of ensuring foreign keys point to valid records in referenced tables.

### 2. Mockaroo

Mockaroo provides a visual interface for defining data schemas with AI-assisted suggestions. Its relationship modeling feature lets you establish parent-child connections between datasets.

Key capabilities include:

- REST API for programmatic data generation

- Custom formats using Ruby-like expressions

- Download as SQL, JSON, CSV, or XML

```sql
-- Mockaroo can generate SQL with proper foreign keys
INSERT INTO orders (user_id, total, created_at) VALUES
(1, 99.99, '2026-01-15'),
(1, 149.50, '2026-02-20'),
(2, 75.00, '2026-03-01');
```

### 3. Datributa

This tool specializes in maintaining referential integrity across complex schemas. It analyzes your existing database structure and generates related data automatically.

### 4. Using Claude or ChatGPT Directly

For teams that prefer prompting a LLM rather than configuring a dedicated tool, Claude and ChatGPT can generate insert scripts when you paste your schema definition. A well-structured prompt like "Here is my PostgreSQL schema. Generate 50 users, 200 orders, and 500 order_items with valid foreign key relationships, realistic names, and US-format addresses" produces usable SQL output in seconds. The AI infers cardinality, respects NOT NULL constraints, and keeps timestamps logically ordered across related records.

## Implementing AI-Generated Test Data in Your Workflow

Integrating these tools requires understanding your data model and testing requirements. Follow this practical approach:

**Step 1: Export Your Schema**

Document your database structure including primary keys, foreign keys, and constraint rules:

```sql
-- Extract schema information from PostgreSQL
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

**Step 2: Configure Your Data Generator**

Map your schema to the tool's configuration format. Specify relationship types and constraint boundaries:

```yaml
# Example: Tool configuration for a typical e-commerce schema
relationships:
  - parent: users
    child: orders
    field: user_id
    cascade: true
  - parent: products
    child: order_items
    field: product_id
    min_records: 5
    max_records: 50
```

**Step 3: Generate and Validate**

Run the generation and verify integrity before using the data:

```python
# Validation script example
def validate_referential_integrity(cursor):
    queries = [
        "SELECT COUNT(*) FROM orders WHERE user_id NOT IN (SELECT id FROM users)",
        "SELECT COUNT(*) FROM order_items WHERE order_id NOT IN (SELECT id FROM orders)"
    ]

    for query in queries:
        cursor.execute(query)
        orphan_count = cursor.fetchone()[0]
        if orphan_count > 0:
            raise ValueError(f"Found {orphan_count} orphaned records")

    return True
```

## Advanced Considerations

For complex scenarios, consider these factors:

Cyclic Relationships: Some databases contain circular references (A references B, B references A). Choose tools that handle these gracefully or split generation into multiple phases.

Temporal Consistency: If your application tracks historical data, ensure generated records respect date boundaries. An order created in 2025 shouldn't reference a product added in 2026.

Data Distribution: Realistic test data reflects actual usage patterns. Configure your tool to match distribution curves—some users place many orders, most place few:

```python
# Weighted random generation for realistic distribution
import random

def weighted_user_id(users):
    weights = [user.order_count for user in users]
    return random.choices(users, weights=weights)[0].id
```

## Automating Test Data Refresh in CI/CD

Test datasets go stale when your schema evolves. Integrating data generation into your CI/CD pipeline ensures tests always run against data that matches the current schema. Here is a pattern that works well with GitHub Actions:

```yaml
# .github/workflows/test-data.yml
name: Refresh Test Data
on:
  push:
    paths:
      - 'migrations/**'
jobs:
  refresh-test-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Apply migrations
        run: python manage.py migrate
      - name: Generate fresh test data
        run: python scripts/generate_test_data.py --rows 500
      - name: Validate integrity
        run: python scripts/validate_integrity.py
```

Triggering refresh on migration changes catches the most common source of stale test data: schema evolution that leaves existing fixtures pointing to the wrong column types or missing required fields.

## Choosing the Right Tool

Consider these factors when selecting a solution:

| Factor | GenerateData | Mockaroo | Datributa | LLM (Claude/ChatGPT) |
|--------|-------------|----------|-----------|----------------------|
| Schema Complexity | Moderate | Moderate | High | High (with full schema) |
| Volume (rows) | Millions | Hundreds of thousands | Millions | Thousands per prompt |
| API Access | Yes | Yes | Yes | Via API |
| Integrity Handling | Manual config | Visual + config | Automated | Prompt-driven |
| Privacy Compliance | Fully synthetic | Fully synthetic | Fully synthetic | Fully synthetic |
| Cost | Free (OSS) | Freemium | Paid | Pay-per-use |

For most projects, starting with Mockaroo's free tier provides adequate capabilities. Larger projects or those requiring strict integrity might benefit from Datributa or enterprise solutions. Teams already using Claude or ChatGPT in their workflow often find direct LLM generation fast enough for moderate dataset sizes, especially during early development when schemas are still changing.

## Frequently Asked Questions

**Can I use AI-generated test data in GDPR-regulated environments?**
Yes. Fully synthetic data generated by these tools contains no personal information derived from real individuals, so it falls outside GDPR's scope for personal data. However, verify that your tool does not use any production records as a seed for generation — if it samples real data to inform distributions, that sampling step itself may require compliance review.

**How do I handle sequences and auto-increment IDs across multiple generated tables?**
Most tools let you define the starting value and step size for auto-increment fields. When generating multiple tables in sequence, generate parent tables first, then reference their ID ranges when configuring child tables. For LLM-generated scripts, explicitly state the ID ranges in your prompt: "Generate users with IDs 1-100, then generate orders with user_id values drawn from that range."

**What is the best approach for schemas with hundreds of tables?**
Break the schema into domain clusters — for example, user management, product catalog, and order fulfillment — and generate data for each cluster independently. Combine the outputs and run integrity validation across clusters before loading. Datributa handles large schemas best because it analyzes the full schema graph before generating any rows.

**How often should test datasets be refreshed?**
Refresh whenever your schema changes through migrations. Stale fixtures are one of the most common causes of false-positive test passes — the test succeeds against old data structures while the application code assumes a new column exists. Automating refresh as part of your migration workflow, as shown in the CI/CD section above, eliminates this class of error entirely.

## Database-Specific Generation Patterns

Different databases have different constraints. Here's how to generate data respecting these:

### PostgreSQL with Referential Integrity

```sql
-- Generate users first
INSERT INTO users (id, email, name, created_at)
SELECT
    gen_random_uuid() as id,
    'user' || row_number() OVER () || '@example.com' as email,
    'User ' || row_number() OVER () as name,
    now() - (random() * interval '365 days') as created_at
FROM generate_series(1, 1000);

-- Generate orders referencing users
INSERT INTO orders (id, user_id, total, status, created_at)
SELECT
    gen_random_uuid() as id,
    (ARRAY(SELECT id FROM users))[ceil(random() * (SELECT count(*) FROM users))] as user_id,
    (random() * 1000)::numeric(10,2) as total,
    (ARRAY['pending', 'completed', 'cancelled'])[ceil(random() * 3)] as status,
    now() - (random() * interval '30 days') as created_at
FROM generate_series(1, 5000);
```

### MySQL with Foreign Key Preservation

```sql
-- Populate dimension tables first
INSERT INTO customers (id, name, email, country_id)
SELECT id, CONCAT('Customer_', id), CONCAT('cust', id, '@test.local'), FLOOR(1 + RAND()*50)
FROM (
    SELECT @row:=@row+1 as id
    FROM information_schema.tables t1, information_schema.tables t2, (SELECT @row:=0) init
    LIMIT 1000
) numbered
WHERE id <= 1000;

-- Populate fact tables with foreign keys
INSERT INTO transactions (id, customer_id, amount, transaction_date)
SELECT UUID(), c.id, ROUND(RAND() * 10000, 2), DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY)
FROM customers c
CROSS JOIN (SELECT @i:=@i+1 FROM (SELECT @i:=0) init LIMIT 5000) seq;
```

### MongoDB (Document-Oriented)

```javascript
db.users.insertMany([
  {
    _id: ObjectId(),
    email: `user${i}@example.com`,
    orders: [
      {
        orderId: ObjectId(),
        amount: Math.random() * 1000,
        date: new Date()
      }
    ]
  }
  for (let i = 1; i <= 1000; i++)
]);
```

## Advanced: Temporal Data and Distributions

For realistic data, match real-world distributions:

```python
import numpy as np
from datetime import datetime, timedelta

def generate_realistic_order_distribution(n_users, n_orders):
    """Generate orders with realistic user behavior patterns."""

    # Most users place few orders, some place many (power law)
    orders_per_user = np.random.pareto(1.5, n_users) + 1
    orders_per_user = orders_per_user.astype(int)

    # Scale to exact order count needed
    scale_factor = n_orders / orders_per_user.sum()
    orders_per_user = (orders_per_user * scale_factor).astype(int)

    data = []
    order_id = 1

    for user_id, count in enumerate(orders_per_user, 1):
        # Orders spread across random date range
        base_date = datetime.now() - timedelta(days=365)

        for _ in range(count):
            days_offset = np.random.exponential(30)  # Exponential: recent orders more common
            order_date = base_date + timedelta(days=days_offset)

            data.append({
                'order_id': order_id,
                'user_id': user_id,
                'total': np.random.lognormal(4, 1.5),  # Log-normal for realistic prices
                'date': order_date
            })
            order_id += 1

    return data
```

## Performance Tuning for Large Datasets

When generating millions of records, optimize for speed:

```sql
-- Disable indexes during insertion
ALTER TABLE orders DISABLE KEYS;

-- Use multi-row INSERT for speed
INSERT INTO orders (user_id, total, created_at) VALUES
(1, 99.99, NOW()),
(2, 149.50, NOW()),
(3, 75.00, NOW()),
... (10,000 rows per INSERT)

-- Re-enable and rebuild indexes
ALTER TABLE orders ENABLE KEYS;
ANALYZE TABLE orders;
```

For programmatic generation:

```python
# Batch commits for speed
batch_size = 5000

for i in range(0, total_records, batch_size):
    batch_data = generate_batch(i, min(i + batch_size, total_records))

    with transaction():
        for record in batch_data:
            db.session.add(record)

    db.session.commit()
    print(f"Inserted {i + batch_size} records")
```

## Testing Against Generated Data

Verify your generated data meets requirements:

```python
def validate_test_data(connection):
    """Validate referential integrity and data quality."""

    cursor = connection.cursor()

    # Check for orphaned records
    cursor.execute("""
        SELECT COUNT(*) FROM orders o
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id)
    """)
    orphans = cursor.fetchone()[0]
    assert orphans == 0, f"Found {orphans} orphaned order records"

    # Check data distribution
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM orders")
    order_count = cursor.fetchone()[0]

    # Verify ratios are reasonable
    assert order_count / user_count >= 3, "Insufficient orders per user"
    assert order_count / user_count <= 20, "Too many orders per user"

    print(f"✓ Data validation passed: {user_count} users, {order_count} orders")
```

## Related Articles

- [How to Use AI to Generate Realistic Test Data for Postgres](/how-to-use-ai-to-generate-realistic-test-data-for-postgres-d/)
- [AI Tools for Creating Test Data Generators That Respect](/ai-tools-for-creating-test-data-generators-that-respect-busi/)
- [AI Tools for Creating Test Data Snapshots for Database](/ai-tools-for-creating-test-data-snapshots-for-database-rollback-between-test-runs/)
- [Best AI Assistant for Creating Test Data Factories with Real](/best-ai-assistant-for-creating-test-data-factories-with-real/)
- [AI Tools for Automated Test Data Generation 2026](/ai-tools-for-automated-test-data-generation-2026/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
