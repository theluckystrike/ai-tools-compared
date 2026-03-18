---

layout: default
title: "How to Use AI to Create Data Quality Scorecards from dbt Test Results"
description: "Learn how to leverage AI to transform dbt test results into actionable data quality scorecards. Practical examples and code snippets for developers."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-use-ai-to-create-data-quality-scorecards-from-dbt-tes/
categories: [guides]
tags: [dbt, data-quality, ai]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---

{% raw %}
# How to Use AI to Create Data Quality Scorecards from dbt Test Results

Data quality is the backbone of reliable analytics. When you run dbt tests, you generate valuable information about your data's health—but transforming those raw test results into meaningful scorecards requires additional effort. AI can help you automate this process, turning complex test outputs into clear, actionable metrics that your team can monitor and improve over time.

This guide shows you how to use AI to create data quality scorecards from dbt test results. You'll learn practical approaches for parsing test outputs, generating insights, and building automated reporting systems.

## Understanding dbt Test Results

dbt provides several built-in tests: `unique`, `not_null`, `accepted_values`, `relationships`, and `foreign_key`. When you run `dbt test`, these tests produce JSON or CSV output that includes test status, timing information, and failure details.

Here's a typical dbt test result in JSON format:

```json
{
  "results": [
    {
      "unique_id": "test.unique.orders.order_id",
      "status": "pass",
      " timings": [
        {
          "name": "execute",
          "elapsed_time": 0.152
        }
      ],
      "message": null
    },
    {
      "unique_id": "test.not_null.customers.email",
      "status": "fail",
      " timings": [
        {
          "name": "execute",
          "elapsed_time": 0.089
        }
      ],
      "message": "1 out of 15420 rows failed"
    }
  ]
}
```

The challenge is aggregating these individual test results into meaningful quality scores that stakeholders can understand at a glance.

## Building Your AI-Powered Scorecard System

### Step 1: Collect and Normalize Test Results

First, run your dbt tests and capture the output. Use the `--output json` flag to get machine-readable results:

```bash
dbt test --output json > results.json
```

Load and normalize these results in Python:

```python
import json
from datetime import datetime

def load_dbt_results(filepath):
    with open(filepath) as f:
        data = json.load(f)
    
    normalized = []
    for result in data.get('results', []):
        normalized.append({
            'test_name': result['unique_id'],
            'model': result['unique_id'].split('.')[2],
            'test_type': result['unique_id'].split('.')[1],
            'status': result['status'],
            'elapsed_time': result['timings'][0]['elapsed_time'],
            'message': result.get('message', ''),
            'timestamp': datetime.now().isoformat()
        })
    
    return normalized
```

### Step 2: Calculate Quality Metrics

With normalized data, you can now calculate aggregate metrics. This is where AI adds value by identifying patterns and generating insights:

```python
def calculate_quality_score(results):
    total = len(results)
    passed = sum(1 for r in results if r['status'] == 'pass')
    failed = sum(1 for r in results if r['status'] == 'fail')
    
    score = (passed / total * 100) if total > 0 else 0
    
    return {
        'total_tests': total,
        'passed': passed,
        'failed': failed,
        'quality_score': round(score, 2),
        'pass_rate': f"{score:.1f}%"
    }
```

### Step 3: Generate AI Insights

Now use an AI model to analyze the test results and generate actionable insights:

```python
def generate_ai_insights(results, metrics):
    # Group failures by model for analysis
    failures = [r for r in results if r['status'] == 'fail']
    failure_by_model = {}
    
    for failure in failures:
        model = failure['model']
        if model not in failure_by_model:
            failure_by_model[model] = []
        failure_by_model[model].append(failure)
    
    # Build prompt for AI analysis
    prompt = f"""Analyze these dbt test failures and provide actionable insights:
    
    Quality Score: {metrics['quality_score']}%
    Failed Tests: {metrics['failed']}
    
    Failures by Model:
    {json.dumps(failure_by_model, indent=2)}
    
    Provide:
    1. Root cause patterns
    2. Priority recommendations
    3. Suggested next steps"""
    
    # Call your preferred AI model here
    # response = ai_model.generate(prompt)
    return prompt  # In production, return AI response
```

### Step 4: Create the Scorecard Output

Combine everything into a usable scorecard format:

```python
def create_scorecard(results_path):
    results = load_dbt_results(results_path)
    metrics = calculate_quality_score(results)
    insights = generate_ai_insights(results, metrics)
    
    scorecard = {
        'generated_at': datetime.now().isoformat(),
        'metrics': metrics,
        'insights': insights,
        'models': group_by_model(results)
    }
    
    return scorecard

def group_by_model(results):
    models = {}
    for r in results:
        model = r['model']
        if model not in models:
            models[model] = {'tests': [], 'score': 0}
        models[model]['tests'].append(r)
    
    # Calculate per-model scores
    for model, data in models.items():
        total = len(data['tests'])
        passed = sum(1 for t in data['tests'] if t['status'] == 'pass')
        data['score'] = round((passed / total * 100), 2) if total > 0 else 0
    
    return models
```

## Automating Your Pipeline

Integrate this scorecard into your dbt workflow by adding a post-hook in your `dbt_project.yml`:

```yaml
models:
  my_project:
    +post-hook:
      - "python scripts/generate_scorecard.py"
```

You can also schedule daily or weekly runs and send results to Slack or email:

```bash
# Daily scorecard generation
0 9 * * * cd /path/to/project && dbt test --output json && python scripts/generate_scorecard.py
```

## Interpreting Your Scorecard

When reviewing your scorecard, focus on these key indicators:

- **Overall Quality Score**: A percentage that represents your data's health. Aim for 95%+ in production environments.
- **Failed Test Count**: Absolute numbers help you prioritize debugging efforts.
- **Model-Level Scores**: Identify which models need the most attention.
- **Trend Over Time**: Track scores daily or weekly to detect degradation early.

Use the AI-generated insights to move beyond simple pass/fail reporting. Instead of just knowing that tests failed, you'll understand why they failed and what actions to take.

## Conclusion

Transforming dbt test results into data quality scorecards doesn't have to be manual. By combining dbt's built-in testing with AI analysis, you can create automated, actionable reporting that helps your team maintain high data quality standards.

Start small: run your tests, capture the JSON output, and build a simple scorecard. Then layer in AI insights as you refine your approach. The goal is continuous improvement in your data quality metrics.

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
