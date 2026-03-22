---
layout: default
title: "How to Use AI for Incident Response Automation"
description: "Automate incident triage, runbook execution, and post-mortems with Claude, PagerDuty webhooks, and Slack workflows for on-call engineering teams"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-use-ai-for-incident-response-automation/
categories: [guides]
tags: [ai-tools-compared]
reviewed: true
score: 8
intent-checked: true
voice-checked: true---

{% raw %}

Incident response automation with AI reduces mean time to resolution by handling the first 5-10 minutes of an incident automatically: triaging the alert, identifying affected services, running diagnostic commands, and posting a structured incident brief before the on-call engineer has opened their laptop. This guide covers a practical implementation using PagerDuty webhooks, Claude, and Slack.

## Architecture

```
PagerDuty Alert
      ↓
Webhook Handler
      ↓
Context Gatherer (Prometheus, logs, Kubernetes)
      ↓
Claude Triage
      ↓
Slack Incident Channel (auto-created)
      ↓
Runbook Bot (optional automated remediation)
```

## Webhook Handler

```python
# incident_responder/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import logging
from .triage import triage_incident
from .slack import create_incident_channel, post_triage_summary
from .context import gather_incident_context

app = FastAPI()
logger = logging.getLogger(__name__)

@app.post("/webhook/pagerduty")
async def pagerduty_webhook(request: Request):
    """Receive PagerDuty webhook and kick off automated triage."""
    payload = await request.json()

    for message in payload.get("messages", []):
        event_type = message.get("event", {}).get("type")
        incident = message.get("incident", {})

        if event_type == "incident.trigger":
            # Run triage asynchronously so webhook returns fast
            asyncio.create_task(handle_new_incident(incident))

    return JSONResponse({"status": "accepted"})

async def handle_new_incident(incident: dict):
    incident_id = incident.get("id")
    title = incident.get("title", "Unknown incident")
    severity = incident.get("urgency", "high")

    logger.info(f"Handling incident {incident_id}: {title}")

    try:
        # 1. Gather context from infrastructure
        context = await gather_incident_context(incident)

        # 2. AI triage
        triage = await triage_incident(incident, context)

        # 3. Create Slack channel and post summary
        channel = await create_incident_channel(incident_id, severity)
        await post_triage_summary(channel, triage, incident)

    except Exception as e:
        logger.error(f"Incident automation failed for {incident_id}: {e}")
        # Still create the channel but with minimal info
        channel = await create_incident_channel(incident_id, severity)
        await post_triage_summary(channel, {"error": str(e)}, incident)
```

## Context Gathering

```python
# incident_responder/context.py
import asyncio
import httpx
import subprocess
from datetime import datetime, timedelta

PROMETHEUS_URL = "http://prometheus:9090"
LOKI_URL = "http://loki:3100"

async def gather_incident_context(incident: dict) -> dict:
    """Gather relevant metrics and logs for the incident."""
    title = incident.get("title", "")
    affected_service = extract_service_name(title)

    tasks = [
        get_error_rate(affected_service),
        get_latency_metrics(affected_service),
        get_recent_logs(affected_service),
        get_recent_deploys(),
        get_kubernetes_status(affected_service),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    return {
        "service": affected_service,
        "error_rate": results[0] if not isinstance(results[0], Exception) else "unavailable",
        "latency": results[1] if not isinstance(results[1], Exception) else "unavailable",
        "logs": results[2] if not isinstance(results[2], Exception) else "unavailable",
        "recent_deploys": results[3] if not isinstance(results[3], Exception) else "unavailable",
        "k8s_status": results[4] if not isinstance(results[4], Exception) else "unavailable",
    }

def extract_service_name(title: str) -> str:
    """Extract service name from alert title like 'HighErrorRate - api-service'"""
    parts = title.split(" - ")
    return parts[-1].strip() if len(parts) > 1 else "unknown"

async def get_error_rate(service: str) -> str:
    async with httpx.AsyncClient(timeout=5.0) as http:
        resp = await http.get(f"{PROMETHEUS_URL}/api/v1/query", params={
            "query": f'sum(rate(http_requests_total{{job="{service}", status=~"5.."}}[5m]))'
                     f' / sum(rate(http_requests_total{{job="{service}"}}[5m]))'
        })
        data = resp.json()
        value = data.get("data", {}).get("result", [{}])
        if value:
            return f"{float(value[0].get('value', [0, '0'])[1]):.2%}"
        return "0.00%"

async def get_recent_logs(service: str, lines: int = 50) -> str:
    """Fetch recent error logs from Loki."""
    end_ns = int(datetime.utcnow().timestamp() * 1e9)
    start_ns = end_ns - int(timedelta(minutes=15).total_seconds() * 1e9)

    async with httpx.AsyncClient(timeout=10.0) as http:
        resp = await http.get(f"{LOKI_URL}/loki/api/v1/query_range", params={
            "query": f'{{job="{service}"}} |= "error" | logfmt',
            "start": start_ns,
            "end": end_ns,
            "limit": lines,
            "direction": "backward",
        })
        data = resp.json()
        streams = data.get("data", {}).get("result", [])
        if not streams:
            return "No error logs found in last 15 minutes"

        log_lines = []
        for stream in streams:
            for ts, line in stream.get("values", []):
                log_lines.append(line)

        return "\n".join(log_lines[:20])  # First 20 lines

async def get_recent_deploys() -> str:
    """Get recent deployments from kubectl."""
    try:
        result = subprocess.run(
            ["kubectl", "rollout", "history", "deployment", "--all-namespaces"],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout[:500] if result.returncode == 0 else "kubectl unavailable"
    except Exception as e:
        return f"kubectl error: {e}"

async def get_kubernetes_status(service: str) -> str:
    try:
        result = subprocess.run(
            ["kubectl", "get", "pods", "-l", f"app={service}", "-o", "wide"],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout[:500] if result.returncode == 0 else "no pods found"
    except Exception:
        return "kubectl unavailable"
```

## AI Triage

```python
# incident_responder/triage.py
import anthropic
import json

client = anthropic.Anthropic()

TRIAGE_SYSTEM = """You are an incident triage specialist.
Given an alert and infrastructure context, produce a structured triage brief.

Format your response as JSON with these keys:
{
  "likely_cause": "1-2 sentence hypothesis based on the data",
  "blast_radius": "What services/users are affected",
  "is_urgent": true/false,
  "urgency_reason": "Why it is or isn't urgent",
  "immediate_actions": ["action 1", "action 2", "action 3"],
  "related_to_deploy": true/false,
  "deploy_evidence": "Evidence linking to recent deploy, if any",
  "diagnostic_commands": ["command 1", "command 2"],
  "escalate_to": "team or person to escalate to if this isn't resolved in 15 min"
}"""

async def triage_incident(incident: dict, context: dict) -> dict:
    prompt = f"""
Incident: {incident.get('title')}
Severity: {incident.get('urgency')}
PagerDuty URL: {incident.get('html_url', 'N/A')}

Infrastructure Context:
- Affected service: {context.get('service')}
- Current error rate: {context.get('error_rate')}
- p95 latency: {context.get('latency')}
- Kubernetes pod status:
{context.get('k8s_status')}

Recent error logs (last 15 min):
{context.get('logs', '')[:1000]}

Recent deployments:
{context.get('recent_deploys', '')[:300]}

Triage this incident.
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=TRIAGE_SYSTEM,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        return json.loads(response.content[0].text)
    except json.JSONDecodeError:
        return {
            "likely_cause": response.content[0].text,
            "is_urgent": True,
            "immediate_actions": ["Review alert in PagerDuty", "Check service logs"],
        }
```

## Slack Integration

```python
# incident_responder/slack.py
import httpx
import os
from datetime import datetime

SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]

async def create_incident_channel(incident_id: str, severity: str) -> str:
    """Create a dedicated Slack channel for the incident."""
    date_str = datetime.utcnow().strftime("%Y%m%d")
    channel_name = f"inc-{date_str}-{incident_id[:8].lower()}"

    async with httpx.AsyncClient() as http:
        resp = await http.post(
            "https://slack.com/api/conversations.create",
            headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
            json={"name": channel_name, "is_private": False}
        )
        data = resp.json()
        return data.get("channel", {}).get("id", "")

async def post_triage_summary(channel_id: str, triage: dict, incident: dict):
    """Post the AI triage brief to the incident channel."""
    urgent_emoji = ":rotating_light:" if triage.get("is_urgent") else ":warning:"
    deploy_text = (
        f"\n:package: *Possibly deploy-related*: {triage.get('deploy_evidence', '')}"
        if triage.get("related_to_deploy") else ""
    )

    actions_text = "\n".join([
        f"{i+1}. {action}"
        for i, action in enumerate(triage.get("immediate_actions", []))
    ])

    commands_text = "\n".join([
        f"`{cmd}`" for cmd in triage.get("diagnostic_commands", [])
    ])

    message = {
        "channel": channel_id,
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{urgent_emoji} {incident.get('title', 'Incident')}",
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Likely Cause:*\n{triage.get('likely_cause', 'Unknown')}"},
                    {"type": "mrkdwn", "text": f"*Blast Radius:*\n{triage.get('blast_radius', 'Unknown')}"},
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Immediate Actions:*\n{actions_text}{deploy_text}"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Diagnostic Commands:*\n{commands_text}"
                }
            },
            {
                "type": "context",
                "elements": [{
                    "type": "mrkdwn",
                    "text": f"Escalate to: {triage.get('escalate_to', 'on-call team')} if not resolved in 15 min | <{incident.get('html_url', '#')}|PagerDuty>"
                }]
            }
        ]
    }

    async with httpx.AsyncClient() as http:
        await http.post(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
            json=message
        )
```

## Automated Post-Mortem Generation

After an incident resolves, generate a draft post-mortem:

```python
async def generate_postmortem(incident: dict, timeline: list, resolution: str) -> str:
    timeline_text = "\n".join([
        f"- {event['time']}: {event['description']}"
        for event in timeline
    ])

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        system="You write blameless post-mortems in the Google SRE style.",
        messages=[{
            "role": "user",
            "content": f"""
Write a post-mortem for this incident:

Title: {incident.get('title')}
Duration: {incident.get('duration_minutes')} minutes
Severity: {incident.get('urgency')}

Timeline:
{timeline_text}

Resolution:
{resolution}

Format:
## Summary
## Impact
## Root Cause
## Timeline
## What Went Well
## What Could Have Gone Better
## Action Items (specific, assigned, with deadlines)
"""
        }]
    )
    return response.content[0].text
```

## Deployment

```dockerfile
# Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "incident_responder.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

```yaml
# docker-compose.yml
services:
  incident-responder:
    build: .
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      SLACK_BOT_TOKEN: ${SLACK_BOT_TOKEN}
    ports:
      - "8080:8080"
```

## Related Reading

- [AI-Powered Incident Response Tools for DevOps Teams Compared](/ai-powered-incident-response-tools-for-devops-teams-compared/)
- [AI-Powered Monitoring and Alerting Setup Guide](/ai-powered-monitoring-and-alerting-setup/)
- [AI Tools for Monitoring Kubernetes Cluster Health](/ai-tools-for-monitoring-kubernetes-cluster-health-and-auto-r/)
---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

## Frequently Asked Questions

**How long does it take to use ai for incident response automation?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Will this work with my existing CI/CD pipeline?**

The core concepts apply across most CI/CD platforms, though specific syntax and configuration differ. You may need to adapt file paths, environment variable names, and trigger conditions to match your pipeline tool. The underlying workflow logic stays the same.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

