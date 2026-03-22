---
layout: default
title: "How to Use AI for Prometheus Alert Tuning"
description: "Use Claude and GPT-4 to tune Prometheus alerting rules — reduce false positives, generate alert expressions from SLOs, and automate runbook generation"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-prometheus-alert-tuning
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Alert fatigue kills on-call effectiveness. The average engineering team has hundreds of Prometheus alerts, 30-60% of which fire as false positives. AI tools can analyze your alerting rules, identify structural problems, and generate better expressions with appropriate thresholds and inhibition rules.

## Key Takeaways

- **The average engineering team**: has hundreds of Prometheus alerts, 30-60% of which fire as false positives.
- **Missing inhibition**: Cascade alerts where one root cause fires 10 alerts
3.
- **RECOMMENDED_THRESHOLD**: Value and why
2.
- **PROMQL_EXPRESSION**: Ready-to-use alert expression
4.
- **AI tools can analyze your alerting rules**: identify structural problems, and generate better expressions with appropriate thresholds and inhibition rules.
- **Inhibition rules to suppress**: ticket alerts when pager fires Use these labels: severity=page|ticket, team=[team from config] Include runbook_url in annotations.

## The Three Alert Problems AI Solves

1. **Threshold tuning**: Alerts firing at wrong thresholds based on intuition, not data
2. **Missing inhibition**: Cascade alerts where one root cause fires 10 alerts
3. **Poor PromQL**: Expressions that fire on transient spikes instead of sustained issues

## Approach 1: AI-Assisted Alert Review

Feed your existing alerting rules to Claude for a quality review:

```python
# alert_reviewer.py
import yaml
from pathlib import Path
from anthropic import Anthropic

client = Anthropic()

def review_alerting_rules(rules_file: str) -> str:
    """Review Prometheus alerting rules for common issues."""
    rules = Path(rules_file).read_text()

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": f"""You are a Prometheus and SRE expert. Review these alerting rules
for quality issues.

For each problematic alert, provide:
ALERT: [alert name]
ISSUE: [what's wrong]
SEVERITY: [Critical/High/Medium/Low]
FIX: [corrected PromQL expression or configuration]

Check for:
1. Missing `for` clauses (fires on single spikes)
2. Missing `job` or `service` label filters (fires across all services)
3. Threshold too sensitive (minor spikes trigger)
4. Threshold too lax (real issues missed)
5. Missing inhibition rules for cascading alerts
6. Complex PromQL that could be simplified
7. Missing `summary` and `description` annotations
8. Duplicate or redundant alerts covering same condition

Rules file:
{rules[:5000]}"""
        }]
    )
    return response.content[0].text

# Review all rules files
for rules_file in Path("alerts/").glob("*.yaml"):
    print(f"\n=== Reviewing {rules_file.name} ===")
    review = review_alerting_rules(str(rules_file))
    print(review)
```

## Approach 2: Generate Alerts from SLOs

The most reliable alerts come from SLOs. Claude can generate correct multi-window burn rate alerts:

```python
def generate_slo_alerts(slo_config: dict) -> str:
    """Generate Prometheus alerting rules from SLO definition."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2500,
        messages=[{
            "role": "user",
            "content": f"""Generate Prometheus alerting rules implementing multi-window
multi-burn-rate SLO alerts for this service.

SLO Configuration:
{yaml.dump(slo_config, default_flow_style=False)}

Generate:
1. Error budget burn rate alerts (page and ticket severity)
   - 1h + 5m windows (fast burn: 14.4x budget)
   - 6h + 30m windows (slow burn: 6x budget)
   - 24h + 2h windows (slow burn: 3x budget)
2. Availability alert
3. Latency alert at the defined SLO threshold
4. Inhibition rules to suppress ticket alerts when pager fires

Use these labels: severity=page|ticket, team=[team from config]
Include runbook_url in annotations.

Return valid Prometheus YAML rules format."""
        }]
    )
    return response.content[0].text

# Example SLO configuration
payment_slo = {
    "service": "payment-service",
    "team": "payments",
    "slos": {
        "availability": {
            "target": 0.999,  # 99.9%
            "window": "30d"
        },
        "latency": {
            "p99_target_ms": 500,
            "window": "30d"
        }
    },
    "metric_labels": {
        "job": "payment-service",
        "namespace": "production"
    },
    "runbook_base_url": "https://wiki.example.com/runbooks/payments"
}

rules_yaml = generate_slo_alerts(payment_slo)
print(rules_yaml)
```

**Generated output (excerpt):**

```yaml
groups:
  - name: payment-service-slo
    rules:
      # Fast burn: consumes 5% of monthly error budget in 1 hour
      - alert: PaymentServiceHighErrorBudgetBurn
        expr: |
          (
            sum(rate(http_requests_total{job="payment-service",namespace="production",code=~"5.."}[1h]))
            / sum(rate(http_requests_total{job="payment-service",namespace="production"}[1h]))
          ) > (14.4 * (1 - 0.999))
          and
          (
            sum(rate(http_requests_total{job="payment-service",namespace="production",code=~"5.."}[5m]))
            / sum(rate(http_requests_total{job="payment-service",namespace="production"}[5m]))
          ) > (14.4 * (1 - 0.999))
        for: 2m
        labels:
          severity: page
          team: payments
          service: payment-service
        annotations:
          summary: "Payment service burning error budget at 14.4x rate"
          description: "Error rate {{ humanizePercentage $value }} exceeds 14.4x burn rate. At this rate, the 30d error budget will be exhausted in ~2 hours."
          runbook_url: "https://wiki.example.com/runbooks/payments/high-error-rate"

      # Slow burn: ticket-level alert
      - alert: PaymentServiceElevatedErrorBudgetBurn
        expr: |
          (
            sum(rate(http_requests_total{job="payment-service",namespace="production",code=~"5.."}[6h]))
            / sum(rate(http_requests_total{job="payment-service",namespace="production"}[6h]))
          ) > (6 * (1 - 0.999))
          and
          (
            sum(rate(http_requests_total{job="payment-service",namespace="production",code=~"5.."}[30m]))
            / sum(rate(http_requests_total{job="payment-service",namespace="production"}[30m]))
          ) > (6 * (1 - 0.999))
        for: 15m
        labels:
          severity: ticket
          team: payments
          service: payment-service
        annotations:
          summary: "Payment service sustained elevated error rate"
          description: "Error rate {{ humanizePercentage $value }} exceeds 6x burn rate for 15 minutes."
          runbook_url: "https://wiki.example.com/runbooks/payments/high-error-rate"

  - name: payment-service-inhibition
    rules: []

inhibit_rules:
  # Suppress ticket-level alerts when pager fires
  - source_match:
      alertname: PaymentServiceHighErrorBudgetBurn
      severity: page
    target_match:
      alertname: PaymentServiceElevatedErrorBudgetBurn
      severity: ticket
    equal: [service, namespace]
```

## Approach 3: Threshold Tuning from Historical Data

```python
def recommend_thresholds(
    metric_name: str,
    historical_stats: dict,
    desired_false_positive_rate: float = 0.01
) -> str:
    """Recommend alert thresholds based on historical data."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Recommend Prometheus alert thresholds for {metric_name}.

Historical statistics (90 days):
{yaml.dump(historical_stats, default_flow_style=False)}

Target: false positive rate below {desired_false_positive_rate * 100}%
(i.e., alert should fire on real issues, not normal variation)

Provide:
1. RECOMMENDED_THRESHOLD: Value and why
2. FOR_DURATION: How long metric must exceed threshold before alerting
3. PROMQL_EXPRESSION: Ready-to-use alert expression
4. EXPECTED_FP_RATE: Estimated false positive rate with this threshold
5. TRADEOFF: What incident severity this threshold might miss"""
        }]
    )
    return response.content[0].text

# Example: tune CPU alert threshold
cpu_stats = {
    "mean": 42.3,
    "p50": 40.1,
    "p90": 61.2,
    "p95": 68.4,
    "p99": 78.1,
    "max": 94.2,
    "incident_cpu_levels": [82, 87, 91],  # CPU at time of past incidents
    "false_positive_threshold": 75,         # Current threshold causing false positives
    "false_positive_frequency": "3x per week"
}

recommendation = recommend_thresholds("CPU utilization", cpu_stats)
print(recommendation)
```

## Approach 4: Auto-Generate Runbooks

```python
def generate_runbook(alert_config: dict, service_info: dict) -> str:
    """Generate an on-call runbook for a Prometheus alert."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Write an on-call runbook for this Prometheus alert.

Alert: {yaml.dump(alert_config, default_flow_style=False)}
Service: {yaml.dump(service_info, default_flow_style=False)}

Format:
## [Alert Name]

**Severity**: [from alert]
**Summary**: [one line]

### What This Alert Means
[2-3 sentences explaining what's happening]

### Initial Triage (2 minutes)
[3-5 specific commands to run first]

### Common Causes
[Ordered list: most common first]

### Remediation Steps
[Per cause, what to do]

### Escalation
When to escalate and to whom

Use specific kubectl/aws/curl commands. Reference actual metric names."""
        }]
    )
    return response.content[0].text
```

## Related Reading

- [AI Tools for Generating Prometheus Alerting Rules](/ai-tools-compared/ai-tools-for-generating-prometheus-alerting-rules-2026/)
- [How to Use AI for Log Anomaly Detection](/ai-tools-compared/how-to-use-ai-for-log-anomaly-detection/)
- [How to Use AI for Chaos Engineering](/ai-tools-compared/how-to-use-ai-for-chaos-engineering/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
