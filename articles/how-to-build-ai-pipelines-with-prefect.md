---
layout: default
title: "How to Build AI Pipelines with Prefect"
description: "Build production AI data pipelines using Prefect — orchestrate LLM calls, embeddings, RAG ingestion, and model evaluation with retry logic and observability"
date: 2026-03-22
author: theluckystrike
permalink: how-to-build-ai-pipelines-with-prefect
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Running LLM calls in a script works until it doesn't — an API rate limit drops a batch halfway through, a timeout leaves data in an inconsistent state, or you can't tell which step failed. Prefect solves these problems for AI pipelines: retry policies, state persistence, observability, and scheduling that survives process restarts.

## Why Prefect for AI Pipelines

Three AI-specific reasons:
- **Retry on rate limits**: Automatically retry Anthropic/OpenAI calls with exponential backoff
- **Partial completion**: Prefect tasks cache results, so a failed pipeline resumes from where it stopped
- **Concurrency control**: Limit parallel LLM calls without writing a semaphore

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Set Up

```bash
pip install prefect anthropic openai pinecone-client
prefect server start  # Local server, or use Prefect Cloud
```

### Step 2: Pipeline 1: Document Ingestion for RAG

```python
# ingestion_pipeline.py
import asyncio
from pathlib import Path
from typing import Optional
import hashlib
import json

from prefect import flow, task, get_run_logger
from prefect.tasks import task_input_hash
from prefect.concurrency.sync import concurrency
from datetime import timedelta

from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec
from anthropic import Anthropic

oai = OpenAI()
pc = Pinecone()
claude = Anthropic()

@task(
    retries=3,
    retry_delay_seconds=[10, 30, 60],  # Exponential-ish backoff
    cache_key_fn=task_input_hash,
    cache_expiration=timedelta(hours=24)
)
def load_document(file_path: str) -> dict:
    """Load and hash a document. Cached to avoid re-reading."""
    logger = get_run_logger()
    path = Path(file_path)
    text = path.read_text()
    doc_hash = hashlib.md5(text.encode()).hexdigest()
    logger.info(f"Loaded {path.name} ({len(text)} chars, hash={doc_hash[:8]})")
    return {"path": str(path), "text": text, "hash": doc_hash, "name": path.name}

@task(
    retries=3,
    retry_delay_seconds=[5, 15, 30],
    cache_key_fn=task_input_hash,
    cache_expiration=timedelta(days=7)
)
def chunk_document(doc: dict, chunk_size: int = 512, overlap: int = 64) -> list[dict]:
    """Split document into overlapping chunks."""
    text = doc["text"]
    chunks = []
    start = 0
    chunk_idx = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        # Avoid splitting mid-sentence
        if end < len(text):
            last_period = text.rfind(".", start, end)
            if last_period > start + chunk_size // 2:
                end = last_period + 1

        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append({
                "text": chunk_text,
                "source": doc["name"],
                "chunk_index": chunk_idx,
                "id": f"{doc['hash']}:{chunk_idx}"
            })
            chunk_idx += 1
        start = end - overlap

    return chunks

@task(
    retries=5,
    retry_delay_seconds=[2, 5, 10, 30, 60]
)
def embed_chunks(chunks: list[dict]) -> list[dict]:
    """Embed chunks using OpenAI. Rate-limited via Prefect concurrency."""
    logger = get_run_logger()

    # Use Prefect concurrency to limit parallel embedding calls
    with concurrency("openai-embeddings", occupy=1):
        texts = [c["text"] for c in chunks]
        response = oai.embeddings.create(
            model="text-embedding-3-small",
            input=texts
        )
        embeddings = [item.embedding for item in response.data]

    logger.info(f"Embedded {len(chunks)} chunks")

    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding

    return chunks

@task(retries=3, retry_delay_seconds=[5, 15, 30])
def upsert_to_pinecone(chunks: list[dict], index_name: str) -> int:
    """Upsert embedded chunks to Pinecone."""
    logger = get_run_logger()
    index = pc.Index(index_name)

    vectors = [
        {
            "id": chunk["id"],
            "values": chunk["embedding"],
            "metadata": {
                "text": chunk["text"],
                "source": chunk["source"],
                "chunk_index": chunk["chunk_index"]
            }
        }
        for chunk in chunks
    ]

    # Upsert in batches
    batch_size = 100
    upserted = 0
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)
        upserted += len(batch)

    logger.info(f"Upserted {upserted} vectors to {index_name}")
    return upserted

@flow(name="document-ingestion", log_prints=True)
def ingest_documents(
    file_paths: list[str],
    index_name: str,
    chunk_size: int = 512
):
    """Main ingestion flow — processes documents in parallel."""
    docs = [load_document(fp) for fp in file_paths]

    # Process all docs concurrently
    all_chunks = []
    chunk_futures = [
        chunk_document.submit(doc, chunk_size=chunk_size)
        for doc in docs
    ]
    for future in chunk_futures:
        all_chunks.extend(future.result())

    print(f"Total chunks: {len(all_chunks)}")

    # Embed in batches of 100 (concurrently, limited by Prefect concurrency)
    batch_size = 100
    embed_futures = []
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i + batch_size]
        embed_futures.append(embed_chunks.submit(batch))

    embedded = []
    for future in embed_futures:
        embedded.extend(future.result())

    # Upsert to Pinecone
    total_upserted = upsert_to_pinecone(embedded, index_name)
    print(f"Ingestion complete: {total_upserted} vectors stored")
    return total_upserted
```

### Step 3: Pipeline 2: LLM Batch Processing with Evaluation

```python
# evaluation_pipeline.py
from prefect import flow, task
from prefect.artifacts import create_markdown_artifact
import json
import statistics

@task(
    retries=3,
    retry_delay_seconds=[5, 15, 30],
    cache_key_fn=task_input_hash,
    cache_expiration=timedelta(hours=2)
)
def process_with_claude(prompt: str, item_id: str) -> dict:
    """Process a single item through Claude. Cached to avoid re-runs."""
    response = claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )
    return {
        "id": item_id,
        "response": response.content[0].text,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens
    }

@task
def evaluate_response(result: dict, expected_pattern: str = None) -> dict:
    """Score a response using Claude as judge."""
    if not expected_pattern:
        return {**result, "score": None}

    judge_response = claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": f"""Rate this response 1-5 for quality.
Expected pattern: {expected_pattern}
Response: {result['response']}
Return only a JSON object: {{"score": N, "reason": "..."}}"""
        }]
    )

    try:
        evaluation = json.loads(judge_response.content[0].text)
    except json.JSONDecodeError:
        evaluation = {"score": 3, "reason": "parse error"}

    return {**result, **evaluation}

@task
def generate_report(evaluations: list[dict]) -> str:
    """Generate a markdown report of the batch evaluation."""
    scores = [e.get("score") for e in evaluations if e.get("score")]
    total_input = sum(e.get("input_tokens", 0) for e in evaluations)
    total_output = sum(e.get("output_tokens", 0) for e in evaluations)

    report = f"""# Batch Evaluation Report

# schedule_pipeline.py
from prefect.deployments import Deployment
from prefect.server.schemas.schedules import CronSchedule

# Deploy the ingestion pipeline to run daily at 2am
deployment = Deployment.build_from_flow(
    flow=ingest_documents,
    name="nightly-ingestion",
    parameters={
        "file_paths": ["/data/docs/*.md"],
        "index_name": "production-docs",
        "chunk_size": 512
    },
    schedule=CronSchedule(cron="0 2 * * *", timezone="UTC"),
    work_queue_name="default"
)

if __name__ == "__main__":
    deployment.apply()
    print("Deployment created. Run: prefect worker start --pool default")
```

### Step 6: Concurrency Limits (Rate Limit Management)

```python
# prefect_concurrency_limits.py
from prefect import serve
from prefect.concurrency.sync import concurrency

# Create concurrency limits via CLI:
# prefect concurrency-limit create openai-embeddings 5
# prefect concurrency-limit create anthropic-api 10

@task
def rate_limited_claude_call(prompt: str) -> str:
    """Call Claude with enforced concurrency limit."""
    with concurrency("anthropic-api", occupy=1):
        response = claude.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
    return response.content[0].text
```

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Related Articles

- [How to Build Voice AI Apps with Claude](/how-to-build-voice-ai-apps-with-claude)
- [How to Use AI to Create Data Pipeline Orchestration Configs](/how-to-use-ai-to-create-data-pipeline-orchestration-configs-/)
- [Prefect vs Dagster for AI Workflows](/prefect-vs-dagster-ai-workflows/)
- [How to Use AI to Generate Terraform Import Blocks](/how-to-use-ai-to-generate-terraform-import-blocks-for-existi/)
- [How to Use AI to Resolve Python Import Circular Dependency](/how-to-use-ai-to-resolve-python-import-circular-dependency-e/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
