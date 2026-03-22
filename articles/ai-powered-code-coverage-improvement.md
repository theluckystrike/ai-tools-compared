---
layout: default
title: "AI-Powered Code Coverage Improvement Tools"
description: "How to use Claude, Copilot, and open-source AI tools to identify coverage gaps and auto-generate tests that increase line and branch coverage"
date: 2026-03-22
author: theluckystrike
permalink: ai-powered-code-coverage-improvement
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Coverage reports tell you what's untested but not why or how to fix it. AI tools bridge that gap — they read your source code, analyze existing tests, and generate targeted tests for uncovered branches. This guide covers practical workflows using Claude, GitHub Copilot, and CodiumAI's cover-agent.

## Key Takeaways

- **The function currently has**: {int(gap['coverage'] * 100)}% coverage.
- **Use descriptive test names**: that explain the scenario 4.
- **Prompt**: `/tests Write tests for the uncovered branches highlighted in red`

Copilot reads the active file, uses coverage annotations from the editor, and generates inline tests.
- **This guide covers the coverage problem**: approach 1: claude for targeted gap analysis, example output, with specific setup instructions

## The Coverage Problem

Low coverage is rarely random. It clusters in three places:
- Error handling branches (`except`, `catch`, edge cases)
- Complex conditionals with many combinations
- Recently added code with no accompanying tests

AI tools are particularly good at the first two. They can enumerate all branches in a function and generate a test for each one — something that takes a human 30 minutes per function.

## Approach 1: Claude for Targeted Gap Analysis

Use `coverage.py` to generate a JSON report, then pipe uncovered lines to Claude:

```bash
# Run tests with coverage
pytest --cov=src --cov-report=json --cov-report=term-missing

# coverage.json is generated in the working directory
```

```python
# scripts/ai_coverage_gap.py
"""
Reads coverage.json, finds uncovered functions, and uses Claude
to generate missing test cases.
"""
import json
import os
import ast
from pathlib import Path
from anthropic import Anthropic

client = Anthropic()

def load_coverage_report(path: str = "coverage.json") -> dict:
    with open(path) as f:
        return json.load(f)

def find_uncovered_functions(
    coverage_data: dict,
    threshold: float = 0.80
) -> list[dict]:
    """Return functions with coverage below threshold."""
    gaps = []

    for filepath, file_data in coverage_data["files"].items():
        if "test_" in filepath or "/tests/" in filepath:
            continue

        missing_lines = set(file_data.get("missing_lines", []))
        if not missing_lines:
            continue

        # Parse AST to find function boundaries
        try:
            source = Path(filepath).read_text()
            tree = ast.parse(source)
        except Exception:
            continue

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue

            func_lines = set(range(node.lineno, node.end_lineno + 1))
            uncovered = func_lines & missing_lines
            coverage_pct = 1 - len(uncovered) / len(func_lines) if func_lines else 1.0

            if coverage_pct < threshold:
                # Extract function source
                source_lines = source.split("\n")
                func_source = "\n".join(
                    source_lines[node.lineno - 1:node.end_lineno]
                )
                gaps.append({
                    "file": filepath,
                    "function": node.name,
                    "coverage": round(coverage_pct, 2),
                    "missing_lines": sorted(uncovered),
                    "source": func_source
                })

    return sorted(gaps, key=lambda x: x["coverage"])

def generate_tests_for_function(gap: dict) -> str:
    """Ask Claude to write tests for an uncovered function."""
    prompt = f"""Write pytest test cases for this Python function.
The function currently has {int(gap['coverage'] * 100)}% coverage.
Missing lines: {gap['missing_lines']}

Focus on:
1. The uncovered branches (error cases, edge inputs, boundary values)
2. Each test should test one specific scenario
3. Use descriptive test names that explain the scenario
4. Include any necessary fixtures or mocks as inline setup

Function from {gap['file']}:
```python
{gap['source']}
```

Return only the test code, no explanation. Start with imports."""

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text

def main():
    coverage_data = load_coverage_report()
    gaps = find_uncovered_functions(coverage_data, threshold=0.80)

    print(f"Found {len(gaps)} functions below 80% coverage\n")

    for gap in gaps[:5]:  # Process top 5 worst-covered functions
        print(f"Generating tests for {gap['function']} in {gap['file']}")
        print(f"  Current coverage: {int(gap['coverage'] * 100)}%")
        print(f"  Missing lines: {gap['missing_lines']}\n")

        test_code = generate_tests_for_function(gap)

        # Write to test file
        test_filename = f"tests/ai_generated/test_{gap['function']}.py"
        Path("tests/ai_generated").mkdir(exist_ok=True)
        with open(test_filename, "w") as f:
            f.write(f"# AI-generated tests for {gap['function']}\n")
            f.write(f"# Source: {gap['file']}\n\n")
            f.write(test_code)

        print(f"  Written to {test_filename}\n")

if __name__ == "__main__":
    main()
```

## Example Output

Given this function with low coverage:

```python
# src/payment_processor.py
def process_refund(transaction_id: str, amount: float, reason: str) -> dict:
    if not transaction_id:
        raise ValueError("transaction_id is required")

    if amount <= 0:
        raise ValueError(f"Refund amount must be positive, got {amount}")

    if amount > MAX_REFUND_AMOUNT:
        raise RefundLimitExceeded(f"Amount {amount} exceeds limit {MAX_REFUND_AMOUNT}")

    transaction = db.get_transaction(transaction_id)
    if transaction is None:
        raise TransactionNotFound(transaction_id)

    if transaction.status == "refunded":
        return {"status": "already_refunded", "transaction_id": transaction_id}

    result = payment_gateway.refund(transaction_id, amount)
    db.update_transaction(transaction_id, status="refunded", refund_amount=amount)
    audit_log.write(event="refund", transaction_id=transaction_id, reason=reason)

    return {"status": "success", "refund_id": result.refund_id}
```

Claude generates:

```python
# AI-generated tests for process_refund
import pytest
from unittest.mock import patch, MagicMock
from src.payment_processor import process_refund, RefundLimitExceeded, TransactionNotFound

class TestProcessRefund:
    def test_raises_when_transaction_id_empty(self):
        with pytest.raises(ValueError, match="transaction_id is required"):
            process_refund("", 50.0, "customer request")

    def test_raises_when_amount_zero(self):
        with pytest.raises(ValueError, match="must be positive"):
            process_refund("txn_123", 0, "test")

    def test_raises_when_amount_negative(self):
        with pytest.raises(ValueError, match="must be positive"):
            process_refund("txn_123", -10.0, "test")

    def test_raises_when_amount_exceeds_limit(self):
        with pytest.raises(RefundLimitExceeded):
            process_refund("txn_123", 999999.0, "large refund")

    def test_raises_when_transaction_not_found(self):
        with patch("src.payment_processor.db") as mock_db:
            mock_db.get_transaction.return_value = None
            with pytest.raises(TransactionNotFound):
                process_refund("txn_missing", 50.0, "test")

    def test_returns_already_refunded_for_duplicate(self):
        with patch("src.payment_processor.db") as mock_db:
            mock_txn = MagicMock()
            mock_txn.status = "refunded"
            mock_db.get_transaction.return_value = mock_txn
            result = process_refund("txn_123", 50.0, "duplicate")
            assert result["status"] == "already_refunded"

    def test_successful_refund_returns_refund_id(self):
        with patch("src.payment_processor.db") as mock_db, \
             patch("src.payment_processor.payment_gateway") as mock_gw, \
             patch("src.payment_processor.audit_log"):
            mock_txn = MagicMock()
            mock_txn.status = "completed"
            mock_db.get_transaction.return_value = mock_txn
            mock_gw.refund.return_value = MagicMock(refund_id="ref_abc")
            result = process_refund("txn_123", 50.0, "customer request")
            assert result["status"] == "success"
            assert result["refund_id"] == "ref_abc"
```

Claude correctly identified all 7 branches and wrote a test for each one.

## Approach 2: GitHub Copilot Chat for Coverage

In VS Code with the coverage gutters extension showing red lines:

1. Select the uncovered function
2. Open Copilot Chat: `Cmd+I`
3. Prompt: `/tests Write tests for the uncovered branches highlighted in red`

Copilot reads the active file, uses coverage annotations from the editor, and generates inline tests. No CLI setup required.

**Copilot strengths:** Faster for one-off coverage gaps. Integrates with the editor's coverage visualization.

**Copilot weaknesses:** Can't batch-process an entire codebase. No programmatic output — you have to copy-paste.

## Approach 3: CodiumAI cover-agent (OSS)

```bash
pip install cover-agent

cover-agent \
  --source-file-path "src/payment_processor.py" \
  --test-file-path "tests/test_payment_processor.py" \
  --code-coverage-report-path "coverage.xml" \
  --test-command "pytest tests/test_payment_processor.py --cov=src --cov-report=xml" \
  --coverage-type cobertura \
  --desired-coverage 90 \
  --max-iterations 3 \
  --model "claude-opus-4-6"
```

cover-agent runs an iterative loop: generate tests → run them → check coverage → repeat until target is reached or max iterations hit. It handles import errors and fixture issues automatically in subsequent iterations.

## Coverage Impact Comparison

| Tool | Setup Time | Batch Processing | Coverage Accuracy | Cost |
|---|---|---|---|---|
| Claude (script) | 20 min | Yes (unlimited) | High | ~$0.05/function |
| Copilot Chat | Zero | No (manual) | Medium | Included |
| cover-agent | 10 min | Yes (per file) | High (iterative) | API cost |
| CodiumAI PR-Agent | 30 min | Yes (per PR) | Medium | Free tier |

## Integration in CI

Add a coverage gate that triggers AI test generation when coverage drops:

```yaml
# .github/workflows/coverage.yml
- name: Check coverage threshold
  run: |
    COVERAGE=$(python -c "import json; d=json.load(open('coverage.json')); print(int(d['totals']['percent_covered']))")
    echo "Coverage: ${COVERAGE}%"
    if [ "$COVERAGE" -lt "80" ]; then
      echo "coverage_gap=true" >> $GITHUB_OUTPUT
    fi

- name: Generate missing tests
  if: steps.coverage.outputs.coverage_gap == 'true'
  run: python scripts/ai_coverage_gap.py
```

## Related Reading

- [Claude Code Coverage Reporting Setup Guide](/ai-tools-compared/claude-code-coverage-reporting-setup-guide/)
- [AI Tools for Automated PR Description Generation](/ai-tools-compared/ai-tools-for-automated-pr-description-generation/)
- [Best AI Tools for Writing Playwright Tests](/ai-tools-compared/best-ai-tools-for-writing-playwright-tests-2026/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
