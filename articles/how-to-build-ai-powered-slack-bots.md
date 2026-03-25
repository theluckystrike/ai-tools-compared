---
layout: default
title: "How to Build AI-Powered Slack Bots"
description: "Build a Slack bot powered by Claude or GPT-4. slash commands, message events, context-aware threads, and production deployment with Python Bolt"
date: 2026-03-22
author: theluckystrike
permalink: how-to-build-ai-powered-slack-bots
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Slack bots backed by LLMs are the fastest path to getting AI into your team's workflow without forcing everyone to learn a new tool. This guide builds a production-ready bot with slash commands, thread-aware conversation history, and structured responses.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - Architecture

```
Slack → Bolt App (FastAPI) → Claude/GPT-4 → Slack Response
              ↓
        Thread History (Redis)
```

The Slack Bolt SDK handles the OAuth, event routing, and response timing. Your bot focuses on the AI layer.

Step 2 - Set Up

```bash
pip install slack-bolt anthropic redis fastapi uvicorn python-dotenv
```

Create a Slack app at api.slack.com:
- Add scopes: `app_mentions:read`, `channels:history`, `chat:write`, `commands`
- Enable Socket Mode for local development, or set a public Request URL for production
- Add slash commands: `/ask`, `/summarize`

```bash
.env
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...  # For Socket Mode
SLACK_SIGNING_SECRET=...
ANTHROPIC_API_KEY=...
REDIS_URL=redis://localhost:6379
```

Step 3 - Core Bot Implementation

```python
bot.py
import os
import json
from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import redis
from anthropic import Anthropic

load_dotenv()

app = App(token=os.environ["SLACK_BOT_TOKEN"])
claude = Anthropic()
r = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"))

SYSTEM_PROMPT = """You are a helpful assistant in a Slack workspace.
Rules:
- Be concise. Slack messages should be scannable.
- Use Slack markdown: *bold*, _italic_, `code`, ```code blocks```
- Use bullet points (•) for lists, not hyphens
- If asked about code, always put it in a code block
- If unsure, say so rather than guessing"""

def get_thread_history(channel_id: str, thread_ts: str, limit: int = 20) -> list[dict]:
    """Load conversation history from Redis cache."""
    key = f"thread:{channel_id}:{thread_ts}"
    cached = r.get(key)
    if cached:
        history = json.loads(cached)
        return history[-limit:]
    return []

def save_thread_history(
    channel_id: str,
    thread_ts: str,
    history: list[dict],
    ttl: int = 86400  # 24 hours
):
    key = f"thread:{channel_id}:{thread_ts}"
    r.setex(key, ttl, json.dumps(history[-50:]))  # Cap at 50 messages

def ask_claude(user_message: str, history: list[dict]) -> str:
    messages = history + [{"role": "user", "content": user_message}]
    response = claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages
    )
    return response.content[0].text

Handle @mentions in channels
@app.event("app_mention")
def handle_mention(event, say, client):
    channel_id = event["channel"]
    thread_ts = event.get("thread_ts", event["ts"])
    user_id = event["user"]
    text = event["text"]

    # Remove the bot mention from the text
    bot_id = client.auth_test()["user_id"]
    user_message = text.replace(f"<@{bot_id}>", "").strip()

    if not user_message:
        say(text="What can I help you with?", thread_ts=thread_ts)
        return

    # Load thread history for context
    history = get_thread_history(channel_id, thread_ts)

    # Show typing indicator
    client.chat_postEphemeral(
        channel=channel_id,
        user=user_id,
        thread_ts=thread_ts,
        text="Thinking..."
    )

    response_text = ask_claude(user_message, history)

    # Update history
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": response_text})
    save_thread_history(channel_id, thread_ts, history)

    say(text=response_text, thread_ts=thread_ts)

/ask slash command
@app.command("/ask")
def handle_ask(ack, command, respond):
    ack()  # Must acknowledge within 3 seconds

    question = command["text"].strip()
    if not question:
        respond(text="Usage: `/ask <your question>`")
        return

    response_text = ask_claude(question, [])

    respond({
        "response_type": "in_channel",  # Visible to everyone
        "blocks": [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Question:* {question}"}
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": response_text}
            }
        ]
    })
```

Step 4 - Slash Command: /summarize

A more complex command that fetches channel history from Slack and summarizes it:

```python
@app.command("/summarize")
def handle_summarize(ack, command, respond, client):
    ack()

    channel_id = command["channel_id"]
    args = command["text"].strip()
    message_count = 50  # Default

    if args.isdigit():
        message_count = min(int(args), 200)

    # Fetch channel history
    try:
        result = client.conversations_history(
            channel=channel_id,
            limit=message_count
        )
    except Exception as e:
        respond(text=f"Error fetching history: {e}")
        return

    messages = result.get("messages", [])
    if not messages:
        respond(text="No messages found in this channel.")
        return

    # Format messages for Claude
    formatted = []
    for msg in reversed(messages):  # Oldest first
        user = msg.get("user", "bot")
        text = msg.get("text", "")
        if text and not text.startswith("<"):  # Skip automated messages
            formatted.append(f"<@{user}>: {text}")

    conversation = "\n".join(formatted)

    summary_response = claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": f"""Summarize this Slack channel conversation.

Format:
• *Key topics discussed* (2-4 bullet points)
• *Decisions made* (if any)
• *Action items* (if any)
• *Open questions* (if any)

Keep it scannable. Skip small talk.

Conversation:
{conversation[:6000]}"""  # Token safety
        }]
    )

    summary = summary_response.content[0].text

    respond({
        "response_type": "ephemeral",  # Only visible to requester
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"Summary of last {len(formatted)} messages"
                }
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": summary}
            }
        ]
    })
```

Step 5 - Handling Slash Command Timeouts

Slack requires a response within 3 seconds. For slow AI calls, use the `respond` URL pattern:

```python
import threading

@app.command("/analyze")
def handle_analyze(ack, command, respond):
    ack(text="Analyzing... I'll reply in a moment.")  # Immediate ack

    # Do the slow work in a background thread
    def do_analysis():
        result = ask_claude(
            f"Analyze this and provide detailed feedback: {command['text']}",
            []
        )
        respond({
            "replace_original": True,
            "text": result
        })

    thread = threading.Thread(target=do_analysis)
    thread.start()
```

Step 6 - Run the Bot

```python
main.py
if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

For production, switch to HTTP mode:

```python
from slack_bolt.adapter.fastapi import SlackRequestHandler
from fastapi import FastAPI, Request

api = FastAPI()
handler = SlackRequestHandler(app)

@api.post("/slack/events")
async def events(req: Request):
    return await handler.handle(req)

uvicorn main:api --host 0.0.0.0 --port 8080
```

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:api", "--host", "0.0.0.0", "--port", "8080"]
```

Step 7 - Rate Limiting and Cost Control

```python
RATE_LIMIT_REQUESTS = 10   # Per user per hour
RATE_LIMIT_WINDOW = 3600   # Seconds

def check_rate_limit(user_id: str) -> bool:
    key = f"ratelimit:{user_id}"
    count = r.incr(key)
    if count == 1:
        r.expire(key, RATE_LIMIT_WINDOW)
    return count <= RATE_LIMIT_REQUESTS

In your handler:
if not check_rate_limit(event["user"]):
    say("You've hit the rate limit. Try again in an hour.", thread_ts=thread_ts)
    return
```

Choosing Between Claude and GPT-4 for Slack Bots

Both Claude and GPT-4 work well as Slack bot backends, but they have different strengths that matter in practice.

Claude (Anthropic) follows instructions with high fidelity. When you give it formatting rules. "use Slack markdown, keep responses scannable, don't use hyphens for lists". it tends to follow them consistently across long conversations. Claude also handles ambiguous multi-part questions gracefully without hallucinating confidence.

GPT-4 (OpenAI) is faster on short queries and has a larger environment of function-calling examples. If your bot needs to trigger external actions (create Jira ticket, look up a user in your database) via structured function calls, GPT-4's JSON mode can be slightly more predictable.

Practical recommendation - Use Claude for Q&A bots, knowledge-base assistants, and writing-heavy tasks. Use GPT-4 with function calling for action-oriented bots that orchestrate API calls.

Slack Block Kit for Richer Responses

Plain text responses work, but Block Kit lets you build interactive messages with buttons, dropdowns, and input modals. Here is a pattern for responses that include an action button:

```python
def respond_with_actions(respond, answer: str, question: str):
    respond({
        "response_type": "in_channel",
        "blocks": [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": answer}
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Thumbs Up"},
                        "action_id": "feedback_positive",
                        "value": question[:200]
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Thumbs Down"},
                        "action_id": "feedback_negative",
                        "style": "danger",
                        "value": question[:200]
                    }
                ]
            }
        ]
    })

@app.action("feedback_positive")
def handle_positive_feedback(ack, body):
    ack()
    # Log to your analytics system
    print(f"Positive feedback for: {body['actions'][0]['value']}")

@app.action("feedback_negative")
def handle_negative_feedback(ack, body, respond):
    ack()
    respond({"text": "Thanks for the feedback. What was missing or wrong?"})
```

Collecting feedback this way is the fastest route to improving your bot's system prompt. Negative feedback clusters will show you exactly which question types the AI is handling poorly.

Deployment Options Compared

| Option | Cost | Complexity | Best for |
|---|---|---|---|
| Socket Mode + local | Free | Low | Development only |
| Render / Railway | $5-10/mo | Low | Small teams |
| AWS Lambda + API Gateway | Pay-per-use | Medium | Sporadic traffic |
| Kubernetes (EKS/GKE) | $50+/mo | High | Enterprise scale |
| Fly.io | $3-15/mo | Low | Global latency |

For most teams, Fly.io or Railway offers the best developer experience for production bots. Both support persistent WebSocket connections for Socket Mode and can scale to zero when idle.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.

Bot not responding to mentions

Verify that `app_mentions:read` is in your bot's OAuth scopes and that Event Subscriptions are enabled in your Slack app settings. In Socket Mode, the `SLACK_APP_TOKEN` must start with `xapp-`, not `xoxb-`.

Redis connection errors in production

Use `redis://` for unencrypted connections and `rediss://` for TLS. Most managed Redis providers (Redis Cloud, Upstash) require TLS. Upstash's free tier works well for bots with under 10,000 commands per day.

Related Articles

- [How to Build Voice AI Apps with Claude](/how-to-build-voice-ai-apps-with-claude)
- [How to Use AI for Incident Response Automation](/how-to-use-ai-for-incident-response-automation/)
- [How to Build AI Pipelines with Prefect](/how-to-build-ai-pipelines-with-prefect)
- [How to Build AI-Powered CLI Tools 2026](/how-to-build-ai-powered-cli-tools-2026/)
- [How to Build AI Agents with Claude Agent SDK](/how-to-build-ai-agents-with-claude-agent-sdk/)
- [Best Onboarding Automation Workflow for Remote Companies](https://welikeremotestack.com/best-onboarding-automation-workflow-for-remote-companies-using-slack-bots-and-notion-templates/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
```
```
{% endraw %}
