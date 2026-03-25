---
layout: default
title: "How to Use AI for Incident Response Automation"
description: "Automate incident triage, runbook execution, and post-mortems with Claude, PagerDuty webhooks, and Slack workflows for on-call engineering teams"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-use-ai-for-incident-response-automation/
categories: [guides]
tags: [ai-tools-compared, artificial-intelligence, automation]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---
{% raw %}

The Incident Response Automation Stack

A practical AI-assisted incident response setup connects four things: a monitoring source (PagerDuty, Datadog, or CloudWatch), a webhook receiver, an AI model to triage and propose actions, and a communication channel (Slack or Teams) for human review.

The goal is not full automation of resolution. it's reducing the time from "alert fired" to "engineer understands what's broken and what to try first."

---

Step 1 - Receive PagerDuty Webhooks

Set up a lightweight receiver that forwards incident payloads to your triage function:

```python
triage_server.py. Flask webhook receiver
from flask import Flask, request, jsonify
import hmac, hashlib, os
from triage import analyze_incident

app = Flask(__name__)
PD_SIGNATURE_SECRET = os.environ["PD_SIGNATURE_SECRET"]

def verify_pagerduty_signature(payload: bytes, signature: str) -> bool:
    expected = hmac.new(
        PD_SIGNATURE_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"v1={expected}", signature)

@app.route("/webhook/pagerduty", methods=["POST"])
def pagerduty_webhook():
    sig = request.headers.get("X-PagerDuty-Signature", "")
    if not verify_pagerduty_signature(request.data, sig):
        return jsonify({"error": "invalid signature"}), 401

    for event in request.json.get("messages", []):
        if event["event"] == "incident.trigger":
            analyze_incident(event["incident"])

    return jsonify({"status": "ok"}), 200
```

---

Step 2 - AI Triage with Claude

The triage function sends incident details to Claude and returns a structured response with severity assessment, likely root cause hypotheses, and suggested runbook steps:

```python
triage.py
import anthropic
import json

client = anthropic.Anthropic()

TRIAGE_PROMPT = """You are an on-call incident responder. Analyze this incident and return JSON with:
- severity: critical/high/medium/low
- likely_causes: list of 3 probable root causes in order of likelihood
- immediate_steps: list of 3-5 runbook actions to investigate first
- escalation_needed: boolean
- summary: one-sentence plain-English description for the Slack message

Incident data:
{incident_json}
"""

def analyze_incident(incident: dict) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": TRIAGE_PROMPT.format(
                incident_json=json.dumps(incident, indent=2)
            )
        }]
    )
    # Claude returns JSON inside a code block. parse it
    content = response.content[0].text
    return json.loads(content.strip("```json\n").strip("```"))
```

---

Step 3 - Post Triage to Slack

Send the AI triage result as a formatted Slack message with action buttons for acknowledgment:

```python
slack_notify.py
import os
from slack_sdk import WebClient

slack = WebClient(token=os.environ["SLACK_BOT_TOKEN"])

def post_triage_result(incident: dict, triage: dict):
    severity_emoji = {
        "critical": ":rotating_light:",
        "high": ":warning:",
        "medium": ":large_yellow_circle:",
        "low": ":large_green_circle:"
    }.get(triage["severity"], ":white_circle:")

    steps_text = "\n".join(
        f"{i+1}. {step}" for i, step in enumerate(triage["immediate_steps"])
    )
    causes_text = "\n".join(
        f"• {cause}" for cause in triage["likely_causes"]
    )

    slack.chat_postMessage(
        channel="#incidents",
        blocks=[
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{severity_emoji} Incident - {incident['title']}"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*AI Summary:* {triage['summary']}\n\n"
                            f"*Severity:* {triage['severity'].upper()}\n\n"
                            f"*Likely Causes:*\n{causes_text}\n\n"
                            f"*Immediate Steps:*\n{steps_text}"
                }
            }
        ]
    )
```

---

Step 4 - Automated Post-Mortem Drafts

After an incident is resolved, Claude can draft the post-mortem from the incident timeline:

```python
def draft_postmortem(incident: dict, timeline: list[dict]) -> str:
    timeline_text = "\n".join(
        f"- {e['timestamp']}: {e['description']}" for e in timeline
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": f"""Draft a blameless post-mortem for this incident.
Include - Summary, Timeline, Root Cause, Contributing Factors, Impact, and Action Items.

Incident - {incident['title']}
Duration - {incident['duration_minutes']} minutes
Timeline:
{timeline_text}
"""
        }]
    )
    return response.content[0].text
```

---

Integrating with Datadog and CloudWatch

PagerDuty is one trigger source, but many teams use Datadog or CloudWatch directly. The same pattern applies. receive the alert webhook, enrich it with AI triage, post to Slack.

Datadog webhook handler:

```python
datadog_webhook.py
from flask import Flask, request, jsonify
import hashlib, hmac, os
from triage import analyze_incident

app = Flask(__name__)
DD_SECRET = os.environ.get("DD_WEBHOOK_SECRET", "")

@app.route("/webhook/datadog", methods=["POST"])
def datadog_webhook():
    # Verify Datadog webhook signature
    sig = request.headers.get("X-Datadog-Signature", "")
    expected = hmac.new(DD_SECRET.encode(), request.data, hashlib.sha256).hexdigest()
    if DD_SECRET and not hmac.compare_digest(sig, expected):
        return jsonify({"error": "invalid signature"}), 401

    payload = request.json
    # Datadog alert structure differs from PagerDuty
    incident = {
        "title": payload.get("title", "Datadog Alert"),
        "description": payload.get("body", ""),
        "alert_type": payload.get("alert_type", ""),  # error, warning, info
        "tags": payload.get("tags", []),
        "hostname": payload.get("hostname", ""),
        "metrics": payload.get("metric", ""),
        "threshold": payload.get("alert_threshold", ""),
        "current_value": payload.get("current_avg", ""),
    }
    analyze_incident(incident)
    return jsonify({"status": "ok"}), 200
```

CloudWatch SNS → Lambda → Slack:

```python
lambda_function.py (AWS Lambda)
import json, boto3, os
import anthropic

def handler(event, context):
    # SNS wraps the CloudWatch alarm in an SNS message
    sns_message = json.loads(event["Records"][0]["Sns"]["Message"])

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": f"""CloudWatch alarm fired. Provide a 3-sentence summary for on-call engineers:
what likely caused this, what to check first, and whether it needs immediate human response.

Alarm - {sns_message.get('AlarmName')}
Description - {sns_message.get('AlarmDescription')}
State - {sns_message.get('NewStateValue')} (was {sns_message.get('OldStateValue')})
Reason - {sns_message.get('NewStateReason')}
"""
        }]
    )

    # Post to Slack
    import urllib.request
    message = response.content[0].text
    slack_payload = json.dumps({
        "text": f":bell: *CloudWatch Alert - {sns_message.get('AlarmName')}*\n\n{message}"
    }).encode()
    req = urllib.request.Request(
        os.environ["SLACK_WEBHOOK_URL"],
        data=slack_payload,
        headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req)
    return {"statusCode": 200}
```

This Lambda runs in under a second, costs fractions of a cent per invocation, and delivers AI-enriched alerts to Slack before a human even looks at the PagerDuty notification.

---

Built by theluckystrike. More at [zovo.one](https://zovo.one)

Frequently Asked Questions

How long does it take to use ai for incident response automation?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Will this work with my existing CI/CD pipeline?

The core concepts apply across most CI/CD platforms, though specific syntax and configuration differ. You may need to adapt file paths, environment variable names, and trigger conditions to match your pipeline tool. The underlying workflow logic stays the same.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.
{% endraw %}