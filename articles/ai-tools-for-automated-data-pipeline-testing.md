---
layout: default
title: "AI Tools for Automated Data Pipeline Testing"
description: "Use Claude and open-source AI tools to generate data quality tests, validate pipeline outputs, and auto-write dbt tests and Great Expectations suites"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-automated-data-pipeline-testing
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Data pipeline failures are quiet — you don't get a stack trace, you get wrong numbers in a dashboard three days later. Automated testing is the fix, but writing data quality tests is tedious. AI tools can generate test suites from sample data, SQL schemas, and business rules in minutes instead of hours.

This guide covers three approaches: AI-generated dbt tests, Great Expectations suite generation, and LLM-based anomaly checks on pipeline outputs.

## Key Takeaways

- **At least 2 custom**: relationship tests if foreign keys are apparent 3.
- **At least 1 custom**: SQL test for business rule validation 4.
- **NULL_CHANGES**: Have null rates changed significantly (>5% absolute change)?
4.
- **Column-level tests**: not_null, unique, accepted_values (based on actual values in sample)
2.

## Approach 1: AI-Generated dbt Tests

dbt's built-in tests (`not_null`, `unique`, `accepted_values`) cover basics. The hard part is writing custom SQL tests for business rules. Claude handles this well.

```python
# generate_dbt_tests.py
from anthropic import Anthropic
import yaml
from pathlib import Path

client = Anthropic()

def generate_dbt_tests(model_sql: str, model_name: str, sample_data: list[dict]) -> dict:
    """Generate dbt test YAML for a model given its SQL and sample data."""
    sample_json = str(sample_data[:10])

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Generate comprehensive dbt tests for this model.

Model name: {model_name}
Sample data (10 rows): {sample_json}

Model SQL:
{model_sql}

Generate YAML with:
1. Column-level tests: not_null, unique, accepted_values (based on actual values in sample)
2. At least 2 custom relationship tests if foreign keys are apparent
3. At least 1 custom SQL test for business rule validation
4. Source freshness tests if there's a created_at/updated_at column

Return valid dbt YAML schema format only."""
        }]
    )

    # Parse and validate the YAML
    yaml_text = response.content[0].text
    if yaml_text.startswith("```"):
        yaml_text = "\n".join(yaml_text.split("\n")[1:-1])

    return yaml.safe_load(yaml_text)

# Example usage
model_sql = """
SELECT
    order_id,
    user_id,
    status,
    total_amount,
    currency,
    created_at,
    shipped_at
FROM {{ source('ecommerce', 'orders') }}
WHERE created_at >= '2024-01-01'
"""

sample_data = [
    {"order_id": "ord_001", "user_id": "usr_123", "status": "shipped",
     "total_amount": 4999, "currency": "USD", "created_at": "2026-01-15",
     "shipped_at": "2026-01-17"},
    {"order_id": "ord_002", "user_id": "usr_456", "status": "pending",
     "total_amount": 1299, "currency": "USD", "created_at": "2026-01-16",
     "shipped_at": None},
]

tests = generate_dbt_tests(model_sql, "orders", sample_data)
print(yaml.dump(tests, default_flow_style=False))
```

**Generated dbt YAML:**

```yaml
version: 2

models:
  - name: orders
    columns:
      - name: order_id
        tests:
          - not_null
          - unique

      - name: user_id
        tests:
          - not_null
          - relationships:
              to: ref('users')
              field: user_id

      - name: status
        tests:
          - not_null
          - accepted_values:
              values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

      - name: total_amount
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"

      - name: currency
        tests:
          - not_null
          - accepted_values:
              values: ['USD', 'EUR', 'GBP']

      - name: created_at
        tests:
          - not_null

    tests:
      # Business rule: shipped orders must have a shipped_at date
      - dbt_utils.expression_is_true:
          expression: "status != 'shipped' OR shipped_at IS NOT NULL"
          name: shipped_orders_have_shipped_at

      # Business rule: shipped_at cannot be before created_at
      - dbt_utils.expression_is_true:
          expression: "shipped_at IS NULL OR shipped_at >= created_at"
          name: shipped_at_not_before_created_at

    freshness:
      warn_after: {count: 6, period: hour}
      error_after: {count: 24, period: hour}
```

## Approach 2: Great Expectations Suite Generation

Great Expectations needs a test suite for each dataset. Generating one manually takes hours. AI can generate it from a sample DataFrame:

```python
# generate_ge_suite.py
import pandas as pd
import json
from anthropic import Anthropic

client = Anthropic()

def profile_dataframe(df: pd.DataFrame) -> dict:
    """Generate a statistical profile for AI to analyze."""
    profile = {}
    for col in df.columns:
        col_profile = {
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isna().sum()),
            "null_pct": round(df[col].isna().mean() * 100, 1),
            "unique_count": int(df[col].nunique()),
        }

        if df[col].dtype in ["int64", "float64"]:
            col_profile.update({
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": round(float(df[col].mean()), 2),
                "p5": float(df[col].quantile(0.05)),
                "p95": float(df[col].quantile(0.95)),
            })
        elif df[col].dtype == "object":
            col_profile["sample_values"] = df[col].dropna().unique()[:10].tolist()

        profile[col] = col_profile

    return profile

def generate_ge_expectations(df: pd.DataFrame, dataset_name: str) -> list[dict]:
    """Generate Great Expectations expectations for a DataFrame."""
    profile = profile_dataframe(df)
    row_count = len(df)

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2500,
        messages=[{
            "role": "user",
            "content": f"""Generate Great Expectations expectations for this dataset.

Dataset: {dataset_name}
Row count: {row_count}
Column profiles:
{json.dumps(profile, indent=2, default=str)}

Return a JSON array of expectation objects using Great Expectations API format.
Include:
- expect_column_values_to_not_be_null for non-null columns
- expect_column_values_to_be_between for numeric columns (use p5/p95 with buffer)
- expect_column_values_to_be_in_set for low-cardinality string columns
- expect_column_to_exist for all columns
- expect_table_row_count_to_be_between (50% to 200% of current count)

Return only valid JSON, no explanation."""
        }]
    )

    text = response.content[0].text
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:-1])

    return json.loads(text)

def save_ge_suite(expectations: list[dict], suite_name: str, output_dir: str = "great_expectations/expectations"):
    """Save expectations to a GE suite file."""
    suite = {
        "data_asset_type": None,
        "expectation_suite_name": suite_name,
        "expectations": expectations,
        "meta": {"great_expectations_version": "0.18.0"}
    }
    output_path = f"{output_dir}/{suite_name}.json"
    with open(output_path, "w") as f:
        json.dump(suite, f, indent=2)
    print(f"Saved {len(expectations)} expectations to {output_path}")
```

## Approach 3: LLM-Based Output Anomaly Detection

For pipelines where the data structure changes between runs, use Claude to analyze output distributions:

```python
# pipeline_output_checker.py
from anthropic import Anthropic
import pandas as pd
import json

client = Anthropic()

def compare_pipeline_runs(
    current_df: pd.DataFrame,
    baseline_df: pd.DataFrame,
    pipeline_name: str
) -> dict:
    """Use Claude to identify significant differences between two pipeline outputs."""
    def summarize_df(df: pd.DataFrame) -> dict:
        return {
            "row_count": len(df),
            "columns": list(df.columns),
            "numeric_stats": df.describe().round(2).to_dict(),
            "null_counts": df.isna().sum().to_dict(),
        }

    current_summary = summarize_df(current_df)
    baseline_summary = summarize_df(baseline_df)

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Compare these two pipeline run outputs and identify anomalies.

Pipeline: {pipeline_name}

Baseline run:
{json.dumps(baseline_summary, indent=2)}

Current run:
{json.dumps(current_summary, indent=2)}

Identify:
1. ROW_COUNT_CHANGE: Is the change in row count expected or suspicious?
2. DISTRIBUTION_SHIFTS: Are any numeric distributions significantly different?
3. NULL_CHANGES: Have null rates changed significantly (>5% absolute change)?
4. MISSING_COLUMNS: Any columns present in baseline but missing from current?
5. VERDICT: [PASS / WARN / FAIL] — should this pipeline output be trusted?

Be specific with numbers."""
        }]
    )

    text = response.content[0].text

    # Parse verdict
    verdict = "WARN"
    if "VERDICT: PASS" in text:
        verdict = "PASS"
    elif "VERDICT: FAIL" in text:
        verdict = "FAIL"

    return {
        "verdict": verdict,
        "analysis": text,
        "pipeline": pipeline_name
    }
```

## CI Integration for dbt

```yaml
# .github/workflows/dbt-test-gen.yml
name: Generate dbt Tests

on:
  pull_request:
    paths:
      - 'models/**/*.sql'

jobs:
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup dbt
        run: pip install dbt-postgres anthropic pyyaml

      - name: Generate tests for new models
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          DBT_PROFILES_DIR: .
        run: |
          python scripts/generate_dbt_tests.py \
            --models-dir models/ \
            --output-dir models/ \
            --only-missing-tests

      - name: Run generated tests
        run: dbt test --select state:modified+
```

## Tool Comparison

| Tool | dbt Tests | GE Suite | Distribution Checks | Custom Rules |
|---|---|---|---|---|
| Claude (API) | Excellent | Excellent | Via code | Natural language |
| GPT-4 | Good | Good | Via code | Natural language |
| dbt-osmosis | Auto-docs only | No | No | No |
| re_data | Anomaly detection | No | Yes | Limited |
| Elementary | Monitoring | No | Yes | No |

## Related Reading

- [Best AI Tools for Data Pipeline Debugging](/ai-tools-compared/best-ai-tools-for-data-pipeline-debugging-2026/)
- [AI Tools for Automated Schema Validation](/ai-tools-compared/ai-tools-for-automated-schema-validation/)
- [How to Build AI Pipelines with Prefect](/ai-tools-compared/how-to-build-ai-pipelines-with-prefect/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
