---
layout: default
title: "How to Use AI to Generate Realistic Test Data for Postgres"
description: "Learn how to use AI tools to create production-like test data for PostgreSQL database seeding, with practical examples and code snippets."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-use-ai-to-generate-realistic-test-data-for-postgres-d/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---
Use AI tools to generate realistic test data for PostgreSQL by providing your schema definitions and specifying realistic distributions and constraints. AI assistants understand database relationships and generate seed data with plausible email formats, logical date sequences, proper foreign key relationships, and realistic data volumes—revealing issues that synthetic or random data often misses.



This guide shows you how to use AI to generate realistic test data for Postgres database seeding, with concrete examples you can apply immediately.



## Why Realistic Test Data Matters



Production-like test data reveals issues that synthetic or random data often misses. When your test data reflects actual usage patterns—real names, plausible email addresses, logical date sequences, and proper foreign key relationships—your testing becomes more meaningful. Queries behave as they would in production, edge cases surface naturally, and your application handles realistic data volumes more accurately.



Randomly generated data frequently fails to capture these nuances. You might create email addresses without valid formats, generate future dates that should be past dates, or produce orphaned records that violate database constraints.



## Using AI to Generate Seed Data



AI coding assistants excel at understanding your schema and generating appropriate seed data. The process involves three core steps:



1. **Provide your schema** — Share your table definitions with the AI

2. **Specify data requirements** — Define realistic distributions and constraints

3. **Generate and refine** — Review the output and iterate as needed



### Example: Generating an Users Table



Consider a typical users table with multiple column types:



```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'user'
);
```


When prompting an AI tool, include your schema and specify realistic patterns:



> "Generate INSERT statements for 500 users in PostgreSQL. Use these requirements:

> - Usernames should be realistic alphanumeric strings, 6-12 characters

> - Emails should match format firstname.lastname@example.com

> - Full names should be diverse and realistic

> - created_at should span the last 2 years with reasonable distribution

> - is_active should be true for ~90% of records

> - role distribution: user (80%), moderator (15%), admin (5%)"



The AI produces INSERT statements like:



```sql
INSERT INTO users (username, email, full_name, created_at, is_active, role) VALUES
('jasonm', 'jason.morgan@example.com', 'Jason Morgan', '2024-03-15 10:23:00', true, 'user'),
('sarahk', 'sarah.king@example.com', 'Sarah King', '2024-06-22 14:45:00', true, 'moderator'),
('mikew', 'mike.wells@example.com', 'Mike Wells', '2025-01-08 09:12:00', false, 'user'),
('admin_j', 'admin.johnson@example.com', 'Amanda Johnson', '2024-01-03 08:00:00', true, 'admin');
```


### Handling Related Tables



Realistic data requires proper relationships across multiple tables. If you have an orders table referencing users, the AI can generate consistent data:



```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```


Prompt the AI to maintain referential integrity:



> "Generate 1000 orders with these constraints:

> - user_id references existing users (1-500)

> - total between 9.99 and 500.00 with higher values less common

> - status: pending (20%), processing (30%), shipped (35%), delivered (15%)

> - ordered_at should be after the user's created_at date

> - Distribution should show increasing volume over time"



## Advanced Techniques



### Faker Libraries with AI Enhancement



Combine AI with established libraries like Python's Faker for additional control:



```python
import random
from faker import Faker

fake = Faker()

# Generate 1000 users with AI-refined distributions
users = []
admin_count = int(1000 * 0.05)  # 5% admins
mod_count = int(1000 * 0.15)    # 15% moderators
user_count = 1000 - admin_count - mod_count

for i in range(admin_count):
    users.append({
        'username': f"admin_{fake.user_name()}",
        'email': f"admin.{i}@example.com",
        'role': 'admin',
        'is_active': True
    })

# ... generate remaining roles with appropriate patterns
```


### Generating JSON and Nested Data



PostgreSQL's JSONB columns require special handling:



```sql
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    preferences JSONB NOT NULL DEFAULT '{}',
    metadata JSONB
);
```


AI can generate realistic nested JSON structures:



```sql
INSERT INTO user_profiles (user_id, preferences, metadata) VALUES
(1, '{"theme": "dark", "notifications": true, "language": "en"}', 
     '{"device": "mobile", "last_login": "2025-02-20", "ip_country": "US"}'),
(2, '{"theme": "light", "notifications": false, "language": "es"}',
     '{"device": "desktop", "last_login": "2025-02-19", "ip_country": "MX"}');
```


### Bulk Generation with SQL Functions



For larger datasets, create custom PostgreSQL functions:



```sql
CREATE OR REPLACE FUNCTION generate_test_users(count INT)
RETURNS void AS $$
DECLARE
    i INT;
BEGIN
    FOR i IN 1..count LOOP
        INSERT INTO users (username, email, full_name, is_active, role)
        VALUES (
            'user_' || i,
            'user_' || i || '@testexample.com',
            'Test User ' || i,
            random() > 0.1,
            CASE floor(random() * 4)::int
                WHEN 0 THEN 'user'
                WHEN 1 THEN 'user'
                WHEN 2 THEN 'moderator'
                ELSE 'admin'
            END
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```


Execute with `SELECT generate_test_users(1000);` for instant bulk insertion.



## Best Practices



**Start small and iterate.** Generate 10-50 rows first to verify patterns before scaling to thousands. Check that foreign keys resolve correctly and data distributions match your expectations.



**Maintain consistency across runs.** Store your generation prompts or seed scripts in version control. This ensures reproducible test environments and helps team members regenerate identical datasets.



**Consider data privacy.** Even for testing, avoid using real customer data. AI-generated data eliminates GDPR and CCPA compliance concerns while still providing realistic patterns.



**Validate before testing.** Add CHECK constraints to your schema to catch invalid data early:



```sql
ALTER TABLE orders ADD CONSTRAINT valid_total CHECK (total > 0);
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('user', 'moderator', 'admin'));
```


## Automating Seed Generation



Integrate AI-generated seeds into your workflow by saving prompts as reusable scripts:



```bash
# Generate fresh seed data
cat << 'EOF' | claude -p "Generate PostgreSQL INSERT statements"
Table: users (id, username, email, full_name, created_at, is_active, role)
Generate 200 rows with realistic data following these specifications:
[your detailed requirements here]
EOF
```


Commit generated seed files alongside your application code. This creates self-contained, reproducible test environments that any team member can rebuild instantly.



Realistic test data transforms your development and testing process. AI makes generating this data efficient while maintaining the quality and variety your applications encounter in production.





## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [AI Tools for Creating Realistic Test Datasets That.](/ai-tools-compared/ai-tools-for-creating-realistic-test-datasets-that-preserve-/)
- [How to Use AI to Generate Timezone Edge Case Test Data](/ai-tools-compared/how-to-use-ai-to-generate-timezone-edge-case-test-data/)
- [Best AI Assistant for Creating Test Data Factories with.](/ai-tools-compared/best-ai-assistant-for-creating-test-data-factories-with-real/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
