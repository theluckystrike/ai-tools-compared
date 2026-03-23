---
layout: default
title: "How to Build AI-Powered Error Classifiers 2026"
description: "Build an error classification pipeline using embeddings and few-shot learning to automatically categorize application errors, assign severity, and route alerts"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-ai-powered-error-classifiers-2026/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, troubleshooting, artificial-intelligence]
---

{% raw %}

How to Build AI-Powered Error Classifiers 2026

Error classifiers automatically categorize application errors, assign severity levels, and route them to the right team. without requiring manual rules for every error type. This guide builds a two-stage classifier: embedding-based similarity search for known errors, LLM fallback for novel ones.

Architecture

```
Error log entry
    ↓
Normalize (strip timestamps, IDs, stack traces)
    ↓
Embed normalized error
    ↓
Similarity search against labeled examples
    ↓
Score > 0.85? → Use cached classification
    ↓ (novel error)
LLM classification with few-shot examples
    ↓
Store labeled result for future similarity hits
```

Step 1: Error Normalization

Raw errors contain noise that breaks similarity. unique IDs, timestamps, and memory addresses change per occurrence.

```python
normalizer.py
import re
from dataclasses import dataclass

@dataclass
class NormalizedError:
    original: str
    normalized: str
    fingerprint: str

def normalize_error(error_text: str) -> NormalizedError:
    text = error_text

    # Remove timestamps
    text = re.sub(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?', '<TIMESTAMP>', text)

    # Remove UUIDs
    text = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<UUID>', text, flags=re.IGNORECASE)

    # Remove hex addresses
    text = re.sub(r'0x[0-9a-fA-F]+', '<ADDR>', text)

    # Remove numeric IDs in paths (e.g., /users/12345)
    text = re.sub(r'(?<=/)\d+(?=[/\s,]|$)', '<ID>', text)

    # Normalize line numbers in stack traces
    text = re.sub(r'(line\s+)\d+', r'\1<LINE>', text, flags=re.IGNORECASE)
    text = re.sub(r':\d+\)', ':<LINE>)', text)

    # Remove IP addresses
    text = re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '<IP>', text)

    # Collapse repeated whitespace
    text = ' '.join(text.split())

    # Create a deterministic fingerprint (first 200 chars of normalized)
    fingerprint = text[:200].strip()

    return NormalizedError(
        original=error_text,
        normalized=text,
        fingerprint=fingerprint,
    )
```

Step 2: Embedding-Based Similarity Classifier

```python
classifier.py
from dataclasses import dataclass
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

client = AsyncOpenAI()

@dataclass
class ErrorClassification:
    category: str          # e.g., "database_timeout", "auth_failure"
    severity: str          # critical, high, medium, low
    team: str              # platform, backend, frontend
    confidence: float
    similar_error_id: int | None
    explanation: str

CATEGORIES = {
    "database_timeout": {"severity": "critical", "team": "platform"},
    "connection_refused": {"severity": "high", "team": "platform"},
    "auth_failure": {"severity": "medium", "team": "backend"},
    "validation_error": {"severity": "low", "team": "backend"},
    "not_found": {"severity": "low", "team": "backend"},
    "rate_limit_exceeded": {"severity": "medium", "team": "platform"},
    "out_of_memory": {"severity": "critical", "team": "platform"},
    "unknown": {"severity": "medium", "team": "backend"},
}

async def classify_by_similarity(
    normalized_error: str,
    session: AsyncSession,
    threshold: float = 0.85,
) -> ErrorClassification | None:
    """Find similar known errors and return their classification."""
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=normalized_error,
    )
    embedding = response.data[0].embedding

    result = await session.execute(
        text("""
            SELECT id, category, severity, team, normalized_error,
                   1 - (embedding <=> :embedding) AS similarity
            FROM error_examples
            WHERE 1 - (embedding <=> :embedding) >= :threshold
            ORDER BY embedding <=> :embedding
            LIMIT 1
        """),
        {"embedding": embedding, "threshold": threshold}
    )
    row = result.fetchone()

    if not row:
        return None

    return ErrorClassification(
        category=row.category,
        severity=row.severity,
        team=row.team,
        confidence=round(row.similarity, 3),
        similar_error_id=row.id,
        explanation=f"Matched known error (similarity: {row.similarity:.1%})",
    )
```

Step 3: LLM Fallback Classifier

```python
llm_classifier.py
import json
from openai import AsyncOpenAI
from normalizer import NormalizedError

client = AsyncOpenAI()

FEW_SHOT_EXAMPLES = [
    {
        "error": "FATAL: connection pool exhausted after 30s waiting for connection",
        "category": "database_timeout",
        "severity": "critical",
        "team": "platform",
        "reasoning": "Connection pool exhaustion is a database availability issue"
    },
    {
        "error": "InvalidCredentialsException: Bearer token validation failed for user <UUID>",
        "category": "auth_failure",
        "severity": "medium",
        "team": "backend",
        "reasoning": "Token validation failure is an authentication issue"
    },
    {
        "error": "ValidationError: email must be a valid email address at field 'email'",
        "category": "validation_error",
        "severity": "low",
        "team": "backend",
        "reasoning": "User input validation error, not a system failure"
    },
]

SYSTEM_PROMPT = """Classify application errors into categories.
Return a JSON object with: category, severity, team, reasoning.

Categories:
- database_timeout: DB connection or query timeout
- connection_refused: Cannot connect to a service
- auth_failure: Authentication or authorization failure
- validation_error: Input validation failure
- not_found: Resource does not exist
- rate_limit_exceeded: Rate limiting triggered
- out_of_memory: OOM or heap exhaustion
- unknown: Cannot determine

Severity: critical (service down), high (degraded), medium (single user), low (minor)
Team: platform (infra/DB), backend (app code), frontend (UI/auth)"""

async def classify_with_llm(error: NormalizedError) -> ErrorClassification:
    few_shot_context = "\n".join([
        f"Error: {ex['error']}\nResult: {json.dumps({'category': ex['category'], 'severity': ex['severity'], 'team': ex['team']})}"
        for ex in FEW_SHOT_EXAMPLES
    ])

    prompt = f"{few_shot_context}\n\nError: {error.normalized}\nResult:"

    response = await client.chat.completions.create(
        model="gpt-4o-mini",  # fast and cheap for classification
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0,
        max_tokens=200,
    )

    result = json.loads(response.choices[0].message.content)

    category = result.get("category", "unknown")
    defaults = CATEGORIES.get(category, CATEGORIES["unknown"])

    return ErrorClassification(
        category=category,
        severity=result.get("severity", defaults["severity"]),
        team=result.get("team", defaults["team"]),
        confidence=0.7,  # LLM classifications get lower initial confidence
        similar_error_id=None,
        explanation=result.get("reasoning", "LLM classification"),
    )
```

Step 4: Full Pipeline

```python
pipeline.py
async def classify_error(
    error_text: str,
    session: AsyncSession,
    store_result: bool = True,
) -> ErrorClassification:
    norm = normalize_error(error_text)

    # Try similarity search first (fast, cheap)
    classification = await classify_by_similarity(norm.normalized, session)

    if classification is None:
        # Fall back to LLM (slower, costs tokens)
        classification = await classify_with_llm(norm)

        if store_result and classification.category != "unknown":
            # Store for future similarity hits
            embedding_response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=norm.normalized,
            )
            await session.execute(
                text("""
                    INSERT INTO error_examples
                        (normalized_error, category, severity, team, embedding, source)
                    VALUES (:normalized, :category, :severity, :team, :embedding, 'llm')
                """),
                {
                    "normalized": norm.normalized,
                    "category": classification.category,
                    "severity": classification.severity,
                    "team": classification.team,
                    "embedding": embedding_response.data[0].embedding,
                }
            )
            await session.commit()

    return classification
```

Step 5: Database Schema

You need pgvector installed on PostgreSQL to store and query embeddings efficiently.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE error_examples (
    id              BIGSERIAL PRIMARY KEY,
    normalized_error TEXT NOT NULL,
    category        TEXT NOT NULL,
    severity        TEXT NOT NULL,
    team            TEXT NOT NULL,
    embedding       vector(1536),
    source          TEXT DEFAULT 'manual',  -- 'manual' or 'llm'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for fast approximate nearest-neighbor search
CREATE INDEX ON error_examples USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 20);

-- Index for category-level queries
CREATE INDEX ON error_examples (category);
```

Seed the table with a handful of hand-labeled examples before deploying. 5-10 per category is enough to bootstrap the similarity path.

Step 6: Routing Alerts

Once you have a classification, route it to the right destination:

```python
router.py
import httpx

SLACK_CHANNELS = {
    "platform": "#platform-alerts",
    "backend": "#backend-alerts",
    "frontend": "#frontend-alerts",
}

PAGERDUTY_ROUTING = {
    "critical": "platform-oncall",
    "high": "backend-oncall",
}

async def route_classification(
    error_text: str,
    classification: ErrorClassification,
    slack_webhook: str,
) -> None:
    channel = SLACK_CHANNELS.get(classification.team, "#general-alerts")
    severity_emoji = {
        "critical": ":red_circle:",
        "high": ":orange_circle:",
        "medium": ":yellow_circle:",
        "low": ":white_circle:",
    }.get(classification.severity, ":white_circle:")

    message = {
        "channel": channel,
        "text": (
            f"{severity_emoji} *{classification.category.upper()}* "
            f"[{classification.severity}]. {classification.explanation}\n"
            f"```{error_text[:300]}```"
        ),
    }

    async with httpx.AsyncClient() as client:
        await client.post(slack_webhook, json=message)

    # Page on-call for critical/high
    if classification.severity in PAGERDUTY_ROUTING:
        routing_key = PAGERDUTY_ROUTING[classification.severity]
        await trigger_pagerduty(routing_key, classification, error_text)
```

Evaluation

After a few hundred classifications, measure accuracy on a held-out test set:

```python
from sklearn.metrics import classification_report

def evaluate_classifier(test_cases: list[dict]) -> None:
    true_labels = [t["category"] for t in test_cases]
    pred_labels = [t["predicted_category"] for t in test_cases]
    print(classification_report(true_labels, pred_labels))
```

Target accuracy: >90% on seen error types (similarity path), >75% on novel errors (LLM path). The similarity database grows over time, shifting more classifications to the fast path.

Tuning the Similarity Threshold

The `threshold=0.85` default is conservative. Lower it if you find the LLM is being invoked too often for errors that look similar to known ones. Raise it if you see the similarity path making incorrect matches for errors that only superficially resemble labeled examples.

A good workflow: run a batch of 500 recent production errors through both paths independently, compare disagreements, and adjust the threshold to minimize disagreements on clearly similar pairs.

Cost Profile

At scale, keeping LLM calls rare is the main cost lever:

| Path | Latency | Cost per call | When triggered |
|---|---|---|---|
| Similarity (embedding only) | ~50ms | ~$0.00002 | Known error classes |
| LLM fallback (gpt-4o-mini) | ~300ms | ~$0.0002 | Novel errors |
| LLM fallback (gpt-4o) | ~800ms | ~$0.002 | High-stakes classification |

After the first week of operation, most production errors route through the similarity path. The LLM path handles new error types introduced by deployments, which are relatively rare once a service stabilizes.

Related Reading

- [How to Build Semantic Search with Embeddings](/how-to-build-semantic-search-with-embeddings/)
- [AI-Powered Observability Configuration Tools](/ai-powered-observability-configuration-tools-2026/)
- [How to Build AI-Powered CLI Tools](/how-to-build-ai-powered-cli-tools-2026/)
- [How to Build AI-Powered Code Formatters](/build-ai-powered-code-formatters/)

---

Related Articles

- [Best AI Tools for Go Error Wrapping and Sentinel Error](/best-ai-tools-for-go-error-wrapping-and-sentinel-error-patte/)
- [Best AI Tools for Writing Idiomatic Rust Error Handling](/best-ai-tools-for-writing-idiomatic-rust-error-handling-with/)
- [Ideogram vs Midjourney for Text in Images Compared](/ideogram-vs-midjourney-for-text-in-images-compared/)
- [Copilot vs Cursor for Writing Rust Error Handling](/copilot-vs-cursor-for-writing-rust-error-handling-with-custo/)
- [Claude Code API Error Handling Standards](/claude-code-api-error-handling-standards/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
