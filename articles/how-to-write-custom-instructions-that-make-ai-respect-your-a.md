---
layout: default
title: "How to Write Custom Instructions That Make AI Respect Your"
description: "Learn to write effective custom instructions that help AI tools respect your API rate limits. Practical examples and code snippets for developers"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-write-custom-instructions-that-make-ai-respect-your-api-rate-limit-patterns/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

When integrating AI into your development workflow, understanding how to control API consumption becomes essential. Custom instructions let you define behavior boundaries that AI tools follow consistently. This guide shows you how to write custom instructions specifically designed to make AI respect your API rate limit patterns.

Table of Contents

- [Why Rate Limit Awareness Matters](#why-rate-limit-awareness-matters)
- [Prerequisites](#prerequisites)
- [Practical Examples](#practical-examples)
- [Troubleshooting](#troubleshooting)

Why Rate Limit Awareness Matters

API rate limits exist to prevent abuse and ensure service availability. When AI tools generate code without understanding your rate limits, they can trigger throttling errors, cause your application to fail, or consume more quota than intended. Writing custom instructions that explicitly define your rate limit constraints helps AI generate code that operates within those boundaries.

Most AI providers implement rate limits in different ways. OpenAI uses tokens-per-minute and requests-per-minute limits. Anthropic enforces tokens-per-minute constraints. Third-party APIs like GitHub, Stripe, and various SaaS platforms each have their own throttling mechanisms. Your custom instructions should reflect the specific limits of the APIs you use.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1: Writing Effective Rate Limit Instructions

Effective custom instructions combine specificity with clarity. Instead of vague requests like "be careful with API calls," provide concrete numbers and patterns the AI can follow.

Specify Exact Limits

Always state your rate limits in concrete terms:

```
My application has these constraints:
- OpenAI API: maximum 500 requests per minute
- Maximum 10 concurrent API calls at any time
- Daily budget of 100,000 tokens
- Implement exponential backoff when receiving 429 responses
```

This approach gives the AI clear boundaries to work within. When generating code, the AI will naturally incorporate batching, caching, and throttling mechanisms that respect these constraints.

Define Error Handling Behavior

Include specific instructions for how to handle rate limit errors:

```
When receiving rate limit errors (HTTP 429), implement:
1. Exponential backoff starting at 1 second
2. Maximum 3 retry attempts
3. Circuit breaker pattern if failures exceed 5 in 60 seconds
4. Graceful degradation with cached responses when possible
```

The AI will then generate code with proper error handling rather than assuming successful responses.

Request Optimized Patterns

Ask for specific optimization techniques that align with your rate limits:

```
Generate code that:
- Batches multiple operations into single API calls where supported
- Implements request deduplication to avoid redundant calls
- Uses streaming responses to reduce token consumption
- Caches responses locally with appropriate TTL values
```

Practical Examples

Example 1: OpenAI API Integration

Without custom instructions, an AI might generate code that makes individual calls for each item in a loop:

```python
Inefficient approach the AI might default to
for item in items:
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": f"Process: {item}"}]
    )
    results.append(response.choices[0].message.content)
```

With proper custom instructions, the AI generates batching logic:

```python
Optimized approach respecting rate limits
from collections import defaultdict
import time

class RateLimitedClient:
    def __init__(self, client, max_rpm=500, max_tpm=150000):
        self.client = client
        self.max_rpm = max_rpm
        self.max_tpm = max_tpm
        self.request_timestamps = []
        self.token_budget = max_tpm

    def chat(self, messages, max_tokens=1000):
        # Check rate limit window
        now = time.time()
        self.request_timestamps = [
            ts for ts in self.request_timestamps if now - ts < 60
        ]

        if len(self.request_timestamps) >= self.max_rpm:
            wait_time = 60 - (now - self.request_timestamps[0])
            time.sleep(wait_time)
            self.request_timestamps = []

        # Track tokens
        estimated_tokens = sum(len(m["content"].split()) for m in messages)
        estimated_tokens += max_tokens

        if self.token_budget < estimated_tokens:
            self.token_budget = self.max_tpm
            time.sleep(60)

        self.token_budget -= estimated_tokens
        self.request_timestamps.append(now)

        return self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=max_tokens
        )
```

Example 2: Multi-API Coordination

When your application calls multiple APIs, custom instructions help coordinate usage:

```
My application calls three APIs simultaneously:
- API A: 100 requests/minute, 50,000 tokens/minute
- API B: 200 requests/minute
- API C: 60 requests/minute, 10 concurrent maximum

Generate code that:
- Uses async/await with semaphore limiting for concurrent calls
- Implements priority queue to distribute load evenly
- Monitors individual API usage and throttles proactively
```

The resulting code implements proper coordination:

```python
import asyncio
from dataclasses import dataclass
from typing import Dict
import time

@dataclass
class APILimit:
    requests_per_minute: int
    tokens_per_minute: int = None
    concurrent_max: int = 10

class MultiAPICoordinator:
    def __init__(self, limits: Dict[str, APILimit]):
        self.limits = limits
        self.semaphores = {
            name: asyncio.Semaphore(limit.concurrent_max)
            for name, limit in limits.items()
        }
        self.request_history: Dict[str, list] = {
            name: [] for name in limits.keys()
        }

    async def call_api(self, api_name: str, func, *args, kwargs):
        limit = self.limits[api_name]
        async with self.semaphores[api_name]:
            await self._wait_for_rate_limit(api_name, limit)
            result = await func(*args, kwargs)
            self.request_history[api_name].append(time.time())
            return result

    async def _wait_for_rate_limit(self, api_name: str, limit: APILimit):
        now = time.time()
        self.request_history[api_name] = [
            ts for ts in self.request_history[api_name]
            if now - ts < 60
        ]

        if len(self.request_history[api_name]) >= limit.requests_per_minute:
            wait = 60 - (now - self.request_history[api_name][0])
            await asyncio.sleep(wait)
```

Step 2: Writing Instructions for Specific AI Tools

Custom instruction placement varies by tool. Knowing where and how to register them ensures they take effect consistently.

ChatGPT (Custom Instructions): Navigate to Settings > Personalization > Custom Instructions. Add rate limit context in the "What would you like ChatGPT to know about you?" field. Use concrete limits and preferred patterns:

```
I work with APIs that have strict rate limits. Always implement exponential
backoff for 429 errors, prefer batch calls over loops, and add token estimation
before making LLM calls. My typical limits: OpenAI 500 RPM, GitHub 5000/hour.
```

Claude (System Prompts via API): Pass your constraints as a system prompt when calling the API. System prompts are ideal for persistent technical requirements that should apply across all interactions in a session:

```
You are a code assistant. The application uses the following rate limits:
- Primary LLM API: 1000 RPM, 100K TPM
- Database API: 200 RPS with connection pool of 20
Always generate code that tracks request counts, implements backoff, and avoids
unbounded loops over paginated API results.
```

Cursor (Rules for AI): Add rate limit rules to `.cursorrules` in your project root. These apply automatically to all AI interactions within the project:

```
Rate limit rules:
- Never generate for-loops that call external APIs without throttling
- Always wrap API clients in a rate-limiting decorator or class
- Default to async patterns with semaphores for concurrent API calls
- Include retry logic with jitter in all API integration code
```

GitHub Copilot: Use workspace-level comments at the top of key files, or add a `AGENTS.md` / `COPILOT.md` in the repo with guidelines. Copilot reads surrounding context, so comments near function definitions also influence suggestions.

Step 3: Structuring Instructions for Reliability

The way you structure instructions affects how consistently AI follows them. These patterns produce the most reliable results:

Numbered constraints beat prose. Instead of describing behavior in paragraphs, enumerate each constraint as a numbered or bulleted item. AI tools parse lists more reliably than embedded requirements.

Include the "why" for critical limits. Explaining the reason behind a constraint improves adherence: "Maximum 10 concurrent calls. our API plan enforces this and violations result in 24-hour suspensions." The context signals importance.

Specify the anti-pattern explicitly. Tell the AI what not to do alongside what to do. "Never call the API inside a forEach or map without a throttle wrapper" is more actionable than "use throttling."

Request error code awareness. Different status codes require different handling. Specify each:

```
Handle these error codes specifically:
- 429: Exponential backoff, max 3 retries
- 503: Retry after 30 seconds, then fail
- 401: Refresh credentials, retry once
- 400: Log and skip. do not retry
```

Step 4: Test Your Custom Instructions

After writing custom instructions, verify they work as intended. Create test scenarios that stress your rate limits and observe whether the AI-generated code handles them correctly.

Run tests that simulate rate limit responses. Check whether exponential backoff activates properly. Verify that batching reduces the number of requests. Monitor your actual API usage to confirm the generated code respects your defined constraints.

A simple test harness for verifying generated rate limit code:

```python
import unittest
from unittest.mock import AsyncMock, patch
import asyncio

class TestRateLimitCompliance(unittest.IsolatedAsyncioTestCase):
    async def test_respects_concurrent_limit(self):
        coordinator = MultiAPICoordinator({
            'test_api': APILimit(requests_per_minute=60, concurrent_max=5)
        })
        active = []
        peak = [0]

        async def mock_call():
            active.append(1)
            peak[0] = max(peak[0], len(active))
            await asyncio.sleep(0.01)
            active.pop()

        tasks = [
            coordinator.call_api('test_api', mock_call)
            for _ in range(20)
        ]
        await asyncio.gather(*tasks)
        self.assertLessEqual(peak[0], 5)
```

Step 5: Refining Your Instructions

Custom instructions require iteration. Start with basic limits, generate code, then observe the results. Add more specific guidance based on gaps you discover. Common refinements include:

- Adding specific retry strategies for different error codes

- Defining fallback behavior when limits are reached

- Specifying logging requirements for debugging rate limit issues

- Including circuit breaker thresholds for sustained failures

The more context you provide about your specific environment and constraints, the more accurately the AI generates code that respects your rate limit patterns.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to write custom instructions that make ai respect your?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Can I adapt this for a different tech stack?

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

Related Articles

- [How to Write Custom Instructions for AI That Follow Your](/how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/)
- [How to Write Custom Instructions That Make AI Follow Your](/how-to-write-custom-instructions-that-make-ai-follow-your-error-response-schema/)
- [How to Write ChatGPT Custom Instructions](/how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/)
- [How to Create Custom Instructions for AI Coding Tools That](/how-to-create-custom-instructions-for-ai-coding-tools-that-e/)
- [How to Set Up Custom Instructions for AI Tools to Match](/how-to-set-up-custom-instructions-for-ai-tools-to-match-your/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
