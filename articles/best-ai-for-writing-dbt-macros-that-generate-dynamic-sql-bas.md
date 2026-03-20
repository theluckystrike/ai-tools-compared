---
layout: default
title: "Best AI for Writing dbt Macros That Generate Dynamic SQL."
description:"Compare AI coding assistants for writing dbt macros that generate dynamic SQL from configuration. Practical examples, code quality comparison, and."
date: 2026-03-16
author: theluckystrike
permalink: /best-ai-for-writing-dbt-macros-that-generate-dynamic-sql-bas/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

{%- include why-choose-ai-dbt-macros.html -%}



Writing dbt macros that generate dynamic SQL based on configuration requires understanding both Jinja2 templating and SQL generation patterns. The best AI coding assistants in 2026 can significantly speed up this process by understanding your dbt project's structure, generating reusable macro templates, and handling complex conditional logic. This guide compares the top AI tools for this specific use case.



## What Makes dbt Macro Generation Effective



Effective dbt macro generation involves several key capabilities that AI tools must demonstrate. First, the tool must understand Jinja2 syntax including loops, conditionals, and macros. Second, it should generate SQL that performs well and follows best practices. Third, it needs to handle configuration-driven logic where macro behavior changes based on variables passed in.



When choosing an AI assistant for dbt macro work, prioritize tools that understand dbt's specific functions like `ref()`, `source()`, and `config()`. The best tools recognize common patterns like dynamic column selection, pivot/unpivot operations, and incremental model logic.



## Comparing Top AI Tools for dbt Macro Writing



### Claude Code ( Anthropic )



Claude Code has emerged as a top choice for dbt macro development in 2026. Its large context window allows it to understand your entire dbt project structure, including existing macros, models, and schema files. When generating macros, Claude Code often produces more modular, reusable code compared to other tools.



**Strengths:**

- Large context window understands full dbt project structure

- Generates highly modular and reusable macro code

- Excellent at handling complex conditional logic

- Strong understanding of SQL best practices



**Limitations:**

- Requires API calls or subscription for full access

- May occasionally generate Jinja syntax that needs minor adjustments



### Cursor AI



Cursor AI provides excellent IDE integration for dbt macro development. Its ability to index your dbt project allows it to reference existing macros and understand your project's conventions. The multi-file editing capability is particularly useful when you need to create multiple related macros.



**Strengths:**

- Project-aware context understanding

- Multi-file editing for creating related macros

- Fast inline suggestions

- Good integration with dbt CLI



**Limitations:**

- Context limits may affect very large projects

- Sometimes generates less reusable code patterns



### GitHub Copilot



GitHub Copilot works well for straightforward dbt macro generation but struggles with more complex configuration-driven scenarios. It provides good suggestions for common patterns but may require more iteration for unusual use cases.



**Strengths:**

- Fast suggestions for common patterns

- Works in multiple editors including VS Code and JetBrains

- Good for simple, repetitive macro tasks



**Limitations:**

- Limited context understanding of complex dbt projects

- May generate less optimal SQL patterns



## Practical Examples



### Example 1: Dynamic Column Selection Macro



A common dbt use case involves generating SQL that selects columns dynamically based on configuration:



```sql
{% macro select_dynamic_columns(table_name, column_config) %}
    {% set column_list = [] %}
    {% for col in column_config %}
        {% if col.enabled %}
            {% do column_list.append(col.name) %}
        {% endif %}
    {% endfor %}
    
    SELECT 
        {{ column_list | join(', ') }}
    FROM {{ ref(table_name) }}
{% endmacro %}
```


Claude Code consistently generates cleaner Jinja loops and conditionals for this type of macro. It also suggests adding type handling and null checks that Copilot often misses.



### Example 2: Configuration-Driven Table Creation



When creating tables based on configuration YAML:



```sql
{% macro create_audit_table(source_name, audit_config) %}
    {% set audit_columns = [
        {'name': 'id', 'type': 'uuid', 'primary_key': true},
        {'name': 'created_at', 'type': 'timestamp', 'nullable': false}
    ] %}
    
    {% if audit_config.include_user %}
        {% do audit_columns.append({'name': 'user_id', 'type': 'uuid'}) %}
    {% endif %}
    
    CREATE OR REPLACE TABLE {{ target_schema }}.{{ source_name }}_audit (
        {% for col in audit_columns %}
            {{ col.name }} {{ col.type }}
            {% if col.primary_key %} PRIMARY KEY{% endif %}
            {% if not col.nullable %} NOT NULL{% endif %}
            {% if not loop.last %},{% endif %}
        {% endfor %}
    );
{% endmacro %}
```


For this pattern, Claude Code's suggestions for handling the comma placement between columns and managing the loop logic are particularly accurate. Cursor AI also performs well but may require more manual adjustments to the generated code.



### Example 3: Incremental Model with Dynamic Partitions



Configuration-driven incremental logic:



```sql
{% macro incremental_upsert(model_name, partition_config) %}
    {% set partition_column = partition_config.column | default('created_at') %}
    {% set lookback_days = partition_config.lookback_days | default(7) %}
    
    {{ config(
        materialized='incremental',
        unique_key=partition_config.unique_key
    ) }}
    
    WITH source_data AS (
        SELECT *
        FROM {{ ref(model_name) }}
        {% if is_incremental() %}
        WHERE {{ partition_column }} >= 
            DATE_SUB(CURRENT_DATE(), INTERVAL {{ lookback_days }} DAY)
        {% endif %}
    )
    
    SELECT * FROM source_data
{% endmacro %}
```


All three tools handle this pattern reasonably well, though Claude Code tends to suggest better handling of the `is_incremental()` context and proper use of dbt's `config()` macro.



## Recommendations



For data engineers working extensively with dbt, **Claude Code** provides the best balance of code quality, project understanding, and generation accuracy. Its ability to maintain context across multiple files and understand project conventions makes it particularly valuable for larger dbt projects with complex macro libraries.



**Cursor AI** is an excellent choice if you prefer working within a dedicated IDE with strong project indexing. Its multi-file editing capabilities shine when you need to create interconnected macro sets.



**GitHub Copilot** remains suitable for simpler macro tasks and teams already invested in the GitHub ecosystem. For straightforward, pattern-based macro generation, it provides acceptable results with minimal setup.



The right choice depends on your project complexity, team setup, and workflow preferences. Testing each tool with your actual dbt macros will give you the best indication of which fits your specific needs.





## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [Best AI for Writing Playwright Tests That Handle Dynamic.](/ai-tools-compared/best-ai-for-writing-playwright-tests-that-handle-dynamic-loa/)
- [Writing Claude.md Files That Teach AI Your Project Testing Conventions and Patterns](/ai-tools-compared/writing-claude-md-files-that-teach-ai-your-project-testing-conventions-and-patterns/)
- [AI Autocomplete Comparison for Writing SQL Queries.](/ai-tools-compared/ai-autocomplete-comparison-for-writing-sql-queries-inside-id/)

Built by

Built by theluckystrike — More at [zovo.one](https://zovo.one)
