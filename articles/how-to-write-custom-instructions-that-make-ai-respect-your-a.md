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
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}
When integrating AI into your development workflow, understanding how to control API consumption becomes essential. Custom instructions let you define behavior boundaries that AI tools follow consistently. This guide shows you how to write custom instructions specifically designed to make AI respect your API rate limit patterns.


## Why Rate Limit Awareness Matters


API rate limits exist to prevent abuse and ensure service availability. When AI tools generate code without understanding your rate limits, they can trigger throttling errors, cause your application to fail, or consume more quota than intended. Writing custom instructions that explicitly define your rate limit constraints helps AI generate code that operates within those boundaries.


Most AI providers implement rate limits in different ways. OpenAI uses tokens-per-minute and requests-per-minute limits. Anthropic enforces tokens-per-minute constraints. Third-party APIs like GitHub, Stripe, and various SaaS platforms each have their own throttling mechanisms. Your custom instructions should reflect the specific limits of the APIs you use.


## Writing Effective Rate Limit Instructions


Effective custom instructions combine specificity with clarity. Instead of vague requests like "be careful with API calls," provide concrete numbers and patterns the AI can follow.


### Specify Exact Limits


Always state your rate limits in concrete terms:


```
My application has these constraints:
- OpenAI API: maximum 500 requests per minute
- Maximum 10 concurrent API calls at any time
- Daily budget of 100,000 tokens
- Implement exponential backoff when receiving 429 responses
```


This approach gives the AI clear boundaries to work within. When generating code, the AI will naturally incorporate batching, caching, and throttling mechanisms that respect these constraints.


### Define Error Handling Behavior


Include specific instructions for how to handle rate limit errors:


```
When receiving rate limit errors (HTTP 429), implement:
1. Exponential backoff starting at 1 second
2. Maximum 3 retry attempts
3. Circuit breaker pattern if failures exceed 5 in 60 seconds
4. Graceful degradation with cached responses when possible
```


The AI will then generate code with proper error handling rather than assuming successful responses.


### Request Optimized Patterns


Ask for specific optimization techniques that align with your rate limits:


```
Generate code that:
- Batches multiple operations into single API calls where supported
- Implements request deduplication to avoid redundant calls
- Uses streaming responses to reduce token consumption
- Caches responses locally with appropriate TTL values
```


## Practical Examples


### Example 1: OpenAI API Integration


Without custom instructions, an AI might generate code that makes individual calls for each item in a loop:


```python
# Inefficient approach the AI might default to
for item in items:
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": f"Process: {item}"}]
    )
    results.append(response.choices[0].message.content)
```


With proper custom instructions, the AI generates batching logic:


```python
# Optimized approach respecting rate limits
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


### Example 2: Multi-API Coordination


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

    async def call_api(self, api_name: str, func, *args, **kwargs):
        limit = self.limits[api_name]
        async with self.semaphores[api_name]:
            await self._wait_for_rate_limit(api_name, limit)
            result = await func(*args, **kwargs)
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


## Testing Your Custom Instructions


After writing custom instructions, verify they work as intended. Create test scenarios that stress your rate limits and observe whether the AI-generated code handles them correctly.


Run tests that simulate rate limit responses. Check whether exponential backoff activates properly. Verify that batching reduces the number of requests. Monitor your actual API usage to confirm the generated code respects your defined constraints.


## Refining Your Instructions


Custom instructions require iteration. Start with basic limits, generate code, then observe the results. Add more specific guidance based on gaps you discover. Common refinements include:


- Adding specific retry strategies for different error codes

- Defining fallback behavior when limits are reached

- Specifying logging requirements for debugging rate limit issues

- Including circuit breaker thresholds for sustained failures


The more context you provide about your specific environment and constraints, the more accurately the AI generates code that respects your rate limit patterns.


## Related Articles

- [How to Write Custom Instructions That Make AI Follow Your](/ai-tools-compared/how-to-write-custom-instructions-that-make-ai-follow-your-error-response-schema/)
- [Writing Custom Instructions That Make AI Follow Your Team's](/ai-tools-compared/writing-custom-instructions-that-make-ai-follow-your-teams-changelog-entry-format/)
- [How to Write ChatGPT Custom Instructions](/ai-tools-compared/how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/)
- [How to Write Custom Instructions for AI That Follow Your](/ai-tools-compared/how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/)
- [ChatGPT Custom GPT Not Following Instructions](/ai-tools-compared/chatgpt-custom-gpt-not-following-instructions/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
