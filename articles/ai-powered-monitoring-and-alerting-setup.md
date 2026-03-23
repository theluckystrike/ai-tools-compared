---
layout: default
title: "AI-Powered Monitoring and Alerting Setup Guide"
description: "Set up AI-assisted monitoring with Prometheus, Grafana, and Claude for alert triage, anomaly explanation, and automated runbook generation"
date: 2026-03-22
author: theluckystrike
permalink: /ai-powered-monitoring-and-alerting-setup/
categories: [guides]
tags: [ai-tools-compared, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Traditional monitoring generates alerts; AI-augmented monitoring explains them. The difference matters at 3 AM when an engineer needs to know not just that p95 latency spiked but why, which services are affected downstream, and what the recovery steps are. This guide walks through a practical setup using Prometheus, Grafana, and Claude for alert triage and runbook automation.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Architecture Overview

```
[Services] → [Prometheus] → [AlertManager] → [Alert Webhook]
                                                     ↓
                                              [Triage Service]
                                                     ↓
                                              [Claude API]
                                                     ↓
                                          [Enriched Alert → Slack]
```

The triage service intercepts AlertManager webhooks, fetches relevant metrics from Prometheus, and sends an enriched context bundle to Claude for analysis before paging the on-call engineer.

### Step 2: Prometheus Setup with Key Recording Rules

```yaml
# prometheus/recording-rules.yml
groups:
  - name: service_slos
    interval: 30s
    rules:
      # 5-minute error rate per service
      - record: job:http_errors:rate5m
        expr: |
          sum by (job) (
            rate(http_requests_total{status=~"5.."}[5m])
          ) /
          sum by (job) (
            rate(http_requests_total[5m])
          )

      # p95 latency per service
      - record: job:http_request_duration_p95:5m
        expr: |
          histogram_quantile(0.95,
            sum by (job, le) (
              rate(http_request_duration_seconds_bucket[5m])
            )
          )

  - name: alerts
    rules:
      - alert: HighErrorRate
        expr: job:http_errors:rate5m > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
          runbook: "https://runbooks.internal/high-error-rate"

      - alert: HighLatency
        expr: job:http_request_duration_p95:5m > 0.5
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High p95 latency on {{ $labels.job }}"
          description: "p95 latency is {{ $value | humanizeDuration }}"
```

### Step 3: AlertManager Webhook Configuration

```yaml
# alertmanager/config.yml
route:
  group_by: ['alertname', 'job']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: ai-triage

receivers:
  - name: ai-triage
    webhook_configs:
      - url: 'http://triage-service:8080/alert'
        send_resolved: true
        http_config:
          bearer_token: '${TRIAGE_SERVICE_TOKEN}'
```

### Step 4: The AI Triage Service

```python
# triage_service.py
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
import anthropic
import httpx
import json
from datetime import datetime, timedelta

app = FastAPI()
client = anthropic.Anthropic()
PROMETHEUS_URL = "http://prometheus:9090"

class PrometheusClient:
    async def query_range(self, query: str, minutes: int = 30) -> dict:
        end = datetime.utcnow()
        start = end - timedelta(minutes=minutes)
        async with httpx.AsyncClient() as http:
            resp = await http.get(f"{PROMETHEUS_URL}/api/v1/query_range", params={
                "query": query,
                "start": start.isoformat() + "Z",
                "end": end.isoformat() + "Z",
                "step": "30s",
            })
            return resp.json()

    async def query(self, query: str) -> dict:
        async with httpx.AsyncClient() as http:
            resp = await http.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
            return resp.json()

prom = PrometheusClient()

async def gather_context(alert: dict) -> dict:
    """Fetch relevant metrics around the time of the alert."""
    job = alert.get("labels", {}).get("job", "unknown")
    context = {}

    # Error rate trend (last 30 min)
    context["error_rate_trend"] = await prom.query_range(
        f'job:http_errors:rate5m{{job="{job}"}}'
    )

    # p95 latency trend
    context["latency_p95_trend"] = await prom.query_range(
        f'job:http_request_duration_p95:5m{{job="{job}"}}'
    )

    # Request rate (to detect traffic spikes)
    context["request_rate"] = await prom.query_range(
        f'sum(rate(http_requests_total{{job="{job}"}}[5m]))'
    )

    # Current error breakdown by status code
    context["error_breakdown"] = await prom.query(
        f'sum by (status) (rate(http_requests_total{{job="{job}", status=~"[45].."}}[5m]))'
    )

    # Dependent services — check if they're also degraded
    context["upstream_errors"] = await prom.query(
        'job:http_errors:rate5m > 0.01'
    )

    return context

def format_context_for_claude(alert: dict, context: dict) -> str:
    """Convert raw Prometheus data into a readable context bundle."""
    return f"""
ALERT FIRED: {alert.get('annotations', {}).get('summary', 'Unknown alert')}
Severity: {alert.get('labels', {}).get('severity', 'unknown')}
Service: {alert.get('labels', {}).get('job', 'unknown')}
Alert description: {alert.get('annotations', {}).get('description', 'N/A')}

METRIC CONTEXT (last 30 minutes):
Error rate trend: {json.dumps(context.get('error_rate_trend', {}).get('data', {}), indent=2)[:500]}
p95 Latency trend: {json.dumps(context.get('latency_p95_trend', {}).get('data', {}), indent=2)[:500]}
Request rate: {json.dumps(context.get('request_rate', {}).get('data', {}), indent=2)[:300]}
Error breakdown by status: {json.dumps(context.get('error_breakdown', {}).get('data', {}), indent=2)[:300]}
Other degraded services: {json.dumps(context.get('upstream_errors', {}).get('data', {}), indent=2)[:300]}
"""

async def triage_with_claude(alert: dict, context: dict) -> str:
    prompt = format_context_for_claude(alert, context)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system="""You are an on-call triage assistant. When given an alert and metric context,
provide a concise analysis in this format:
1. LIKELY CAUSE (1-2 sentences)
2. BLAST RADIUS (what's affected)
3. IMMEDIATE ACTIONS (numbered, specific commands if possible)
4. IS THIS URGENT? (Yes/No with reason)

Be specific. Avoid vague suggestions like "check the logs".""",
        messages=[{
            "role": "user",
            "content": f"Triage this alert:\n\n{prompt}"
        }]
    )
    return response.content[0].text

@app.post("/alert")
async def receive_alert(request: Request):
    body = await request.json()
    alerts = body.get("alerts", [])

    for alert in alerts:
        if alert.get("status") == "resolved":
            continue  # Skip resolved alerts for now

        context = await gather_context(alert)
        analysis = await triage_with_claude(alert, context)

        # Post to Slack (or your notification system)
        await notify_slack(alert, analysis)

    return {"status": "processed", "count": len(alerts)}

async def notify_slack(alert: dict, analysis: str):
    slack_webhook = "https://hooks.slack.com/services/..."
    message = {
        "text": f":rotating_light: *{alert['annotations']['summary']}*",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":rotating_light: *{alert['annotations']['summary']}*\n{alert['annotations'].get('description', '')}"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*AI Triage:*\n```{analysis}```"
                }
            }
        ]
    }
    async with httpx.AsyncClient() as http:
        await http.post(slack_webhook, json=message)
```

### Step 5: Automated Runbook Generation

Use Claude to generate runbooks from historical incidents:

```python
# scripts/generate-runbook.py
import anthropic

client = anthropic.Anthropic()

def generate_runbook(alert_name: str, historical_incidents: list) -> str:
    incidents_text = "\n\n".join([
        f"Incident {i+1} ({inc['date']}):\n"
        f"Duration: {inc['duration']}\n"
        f"Root cause: {inc['root_cause']}\n"
        f"Resolution: {inc['resolution']}\n"
        f"Commands used: {inc.get('commands', 'N/A')}"
        for i, inc in enumerate(historical_incidents)
    ])

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        system="You write incident runbooks for on-call engineers. Be specific and operational.",
        messages=[{
            "role": "user",
            "content": f"""
Generate a runbook for the alert: {alert_name}

Based on these historical incidents:

{incidents_text}

Format the runbook as:
## Overview
### Step 6: When This Fires
### Step 7: Diagnostic Steps (numbered, with specific commands)
### Step 8: Common Root Causes
### Step 9: Resolution Steps by Root Cause
### Step 10: Escalation Path
### Step 11: Prevention
"""
        }]
    )
    return response.content[0].text

# Example
incidents = [
    {
        "date": "2026-02-15",
        "duration": "22 minutes",
        "root_cause": "Memory leak in connection pool after deploy",
        "resolution": "Rolled back deployment, restarted service",
        "commands": "kubectl rollout undo deployment/api-service; kubectl rollout status deployment/api-service"
    },
    {
        "date": "2026-01-08",
        "duration": "8 minutes",
        "root_cause": "Downstream payment service returning 503",
        "resolution": "Identified via dependency graph, payment team restarted their service",
        "commands": "kubectl logs -l app=payment-service --tail=100"
    }
]

runbook = generate_runbook("HighErrorRate", incidents)
print(runbook)
```

### Step 12: Grafana Dashboard with AI Annotations

```python
# scripts/annotate-dashboard.py
# Adds AI-generated explanations as Grafana annotations at anomaly points

import httpx
import anthropic
from datetime import datetime

client = anthropic.Anthropic()
GRAFANA_URL = "http://grafana:3000"
GRAFANA_API_KEY = "your-api-key"

async def detect_and_explain_anomalies(
    metric_data: list,
    service: str
) -> list:
    """
    Takes time series data, asks Claude to identify anomalies,
    returns annotation-ready objects.
    """
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": f"""
Analyze this time series for {service} error rate (timestamp, value pairs):
{metric_data[:50]}  # sample first 50 points

Identify up to 3 anomaly points (sudden spikes, sustained elevation, or drops).
For each, return JSON: {{"timestamp": "ISO8601", "explanation": "brief cause hypothesis"}}
Return only the JSON array, no other text.
"""
        }]
    )

    import json
    try:
        anomalies = json.loads(response.content[0].text)
    except json.JSONDecodeError:
        return []

    return anomalies

async def post_grafana_annotation(timestamp: str, text: str, dashboard_id: int):
    ts_ms = int(datetime.fromisoformat(timestamp).timestamp() * 1000)
    async with httpx.AsyncClient() as http:
        await http.post(
            f"{GRAFANA_URL}/api/annotations",
            headers={"Authorization": f"Bearer {GRAFANA_API_KEY}"},
            json={
                "dashboardId": dashboard_id,
                "time": ts_ms,
                "text": f"[AI] {text}",
                "tags": ["ai-annotation"]
            }
        )
```

### Step 13: Deploy ment

```bash
# docker-compose.yml excerpt
version: '3.8'
services:
  triage-service:
    build: ./triage_service
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      TRIAGE_SERVICE_TOKEN: ${TRIAGE_SERVICE_TOKEN}
    ports:
      - "8080:8080"
    depends_on:
      - prometheus
```

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Related Articles

- [How to Use AI for Writing Prometheus Alerting Rules](/how-to-use-ai-for-writing-prometheus-alerting-rules-effectively/)
- [AI Tools for Generating Prometheus Alerting Rules (2026)](/ai-tools-for-generating-prometheus-alerting-rules-2026/)
- [How to Set Up Model Context Protocol for Feeding Monitoring](/how-to-set-up-model-context-protocol-for-feeding-monitoring-/)
- [How to Use AI for Writing Effective Prometheus Recording](/how-to-use-ai-for-writing-effective-prometheus-recording-rul/)
- [How to Use AI for Incident Response Automation](/how-to-use-ai-for-incident-response-automation/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)

## Frequently Asked Questions

**How long does it take to guide?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Will this work with my existing CI/CD pipeline?**

The core concepts apply across most CI/CD platforms, though specific syntax and configuration differ. You may need to adapt file paths, environment variable names, and trigger conditions to match your pipeline tool. The underlying workflow logic stays the same.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.
{% endraw %}
