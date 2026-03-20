---

layout: default
title: "Best Way to Configure AI Coding Tools to Follow Your."
description:"Learn how to configure AI coding assistants like GitHub Copilot, Cursor, and Zed to respect your database naming conventions. Practical configuration."
date: 2026-03-16
author: theluckystrike
permalink: /best-way-to-configure-ai-coding-tools-to-follow-your-databas/
categories: [guides]
tags: [tools, ai, configuration]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

{%- include why-choose-ai-naming-conventions.html -%}



AI coding assistants can dramatically accelerate your development workflow, but they often generate code that conflicts with your established database naming conventions. When your team uses snake_case for table columns but the AI outputs camelCase, you spend more time correcting suggestions than you save. This guide shows you how to configure major AI coding tools to respect your specific naming patterns.



## Why Naming Convention Configuration Matters



Database naming conventions vary widely across organizations. Some teams prefer snake_case (`user_id`, `created_at`), others use PascalCase (`UserId`, `CreatedAt`), and some adopt prefixed conventions (`tbl_users`, `col_user_id`). When AI tools ignore these patterns, you receive code suggestions that violate your database schema, leading to runtime errors, inconsistent codebases, and frustrated developers.



Configuring your AI tools to understand your conventions eliminates friction. The best approach involves a combination of prompt engineering, configuration files, and custom instructions that your AI assistant can reference across sessions.



## Configuring GitHub Copilot



GitHub Copilot supports several methods for enforcing naming conventions. The most effective approach uses `.github/copilot-instructions.md` at the repository root.



Create a file called `.github/copilot-instructions.md` in your project root:



```markdown
# Code Style Guidelines

## Database Naming Conventions
- Use snake_case for all database tables and columns: `user_id`, `order_items`, `created_at`
- Use snake_case for foreign key references: `customer_id`, `product_id`
- Model class names should use PascalCase: `User`, `OrderItem`
- Always pluralize table names: `users`, `orders`, `order_items`

## ORM Conventions
- When generating SQL or ORM code, match the exact column names from the database schema
- Do not convert snake_case to camelCase automatically
- Include all timestamp fields: `created_at`, `updated_at` with TIMESTAMP type
```


Copilot reads this file automatically and incorporates these rules into its suggestions. For more granular control, you can add inline annotations in your code files:



```python
# copilot: infer database_naming_style="snake_case"
class User:
    def __init__(self, user_id: int, first_name: str, last_name: str):
        # Copilot will now use snake_case for all database references
        pass
```


## Configuring Cursor



Cursor offers a dedicated `.cursorrules` file that provides project-specific instructions. This file supports more sophisticated configuration than Copilot's approach.



Create `.cursorrules` in your project root:



```
## Database Naming Conventions

When writing code that interacts with databases:
- Table names: snake_case, plural (users, order_items, inventory_counts)
- Column names: snake_case (user_id, created_at, is_active)
- Primary keys: always use `id`
- Foreign keys: {table_name}_id (user_id, order_id, product_id)
- Boolean columns: prefix with `is_`, `has_`, or `can_` (is_active, has_permission)

## Code Generation Rules

For ORM models:
- Use exact column names from database schema
- Maintain snake_case in all SQL queries
- Include type hints matching database column types
- Add docstrings referencing the source table and columns
```


Cursor applies these rules more consistently than other tools because it treats the `.cursorrules` file as a primary context source. You can verify the configuration is working by typing a comment like `# Create a query to fetch all active users` and observing whether the generated SQL uses `is_active` (snake_case) instead of `isActive`.



## Configuring Zed



Zed uses a similar approach with `.zed/rules.md` or inline configuration. The tool reads rules from this file and applies them across all AI interactions.



Create `.zed/rules.md`:



```markdown
# Database Configuration

## Naming Patterns
- Database tables: snake_case, plural
- Database columns: snake_case
- Primary keys: `id`
- Foreign keys: `{singular_table_name}_id`

## SQL Generation
- Write all SQL in lowercase keywords
- Use double quotes for identifiers: SELECT "user_id" FROM "users"
- Avoid converting column names to camelCase
```


Zed also supports workspace-level configuration for team-wide enforcement. Edit `settings.json` in your Zed workspace:



```json
{
  "ai": {
    "prompt_preferences": {
      "naming_convention": "snake_case",
      "table_naming": "plural",
      "force_schema_names": true
    }
  }
}
```


## Using EditorConfig for Additional Enforcement



Beyond AI-specific configuration, EditorConfig helps maintain consistency across all generated code. Add an `.editorconfig` file to your project root:



```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.sql]
indent_size = 4

[*.{js,ts,py,java}]
max_line_length = 100
```


While EditorConfig doesn't directly control AI output, it establishes formatting expectations that AI tools increasingly recognize and respect.



## Verification and Testing



After configuring your AI tools, verify the settings work correctly. Create a test file and ask your AI assistant to generate a simple database interaction:



```sql
-- Ask: Create a function that inserts a new user record
-- Expected: Uses user_id, created_at, updated_at in snake_case
```


If the AI still generates incorrect naming, refine your configuration files. Common issues include:

- Conflicting instructions across multiple config files

- Vague terminology (use "always use snake_case" instead of "prefer snake_case")

- Missing explicit mention of both tables and columns



## Best Practices for Team Adoption



Share your configuration files through version control so all team members benefit from consistent AI behavior. Include the configuration files in your project's README or contributing guide. Review the AI-generated code during pull request reviews to catch any convention violations early.



Updating conventions requires coordination. When your team changes naming standards, update all configuration files simultaneously and communicate the change to every developer on the team.



---





## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [Configuring AI Coding Tools to Follow Your Teams.](/ai-tools-compared/configuring-ai-coding-tools-to-follow-your-teams-dependency-/)
- [How to Configure AI Coding Tools to Respect Your Team's Branch Naming Conventions](/ai-tools-compared/how-to-configure-ai-coding-tools-to-respect-your-teams-branc/)
- [Best Practices for AI Coding Tool Project Configuration.](/ai-tools-compared/best-practices-for-ai-coding-tool-project-configuration-in-l/)

Built by

Built by theluckystrike — More at [zovo.one](https://zovo.one)
