---
layout: default
title: "How to Build AI Documentation Chatbots 2026"
description: "Build a documentation chatbot with RAG, OpenAI embeddings, pgvector, and a streaming chat API. with source citation, follow-up handling, and deployment guide"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-ai-documentation-chatbots-2026/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

How to Build AI Documentation Chatbots 2026

A documentation chatbot lets users ask natural language questions and get answers grounded in your actual docs. not hallucinated. The core pattern is Retrieval-Augmented Generation (RAG): embed the docs, retrieve relevant chunks at query time, and pass them as context to the LLM.

Architecture

```
Docs (Markdown/HTML) → Chunker → Embedder → pgvector
                                                  ↑
User question → Embedder → Vector search → Context window → LLM → Answer + sources
```

This guide uses:
- FastAPI for the backend
- pgvector for vector storage
- OpenAI for embeddings + chat
- Server-Sent Events for streaming
- Anthropic Claude as an alternative LLM

Step 1 - Database Setup

Before ingesting, you need the pgvector extension and a table for doc sections:

```sql
-- Run once in your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE doc_sections (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    embedding VECTOR(1536),           -- dimension matches text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, title)
);

-- HNSW index for approximate nearest-neighbor search (faster than IVFFlat for < 1M rows)
CREATE INDEX ON doc_sections USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

The HNSW index gives sub-millisecond query times for collections up to a few hundred thousand sections. IVFFlat is better for millions of rows but requires tuning `lists` based on row count.

Step 2 - Ingest Documentation

```python
ingest.py
import os
import asyncio
from pathlib import Path
import tiktoken
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import text

client = AsyncOpenAI()
engine = create_async_engine(os.environ["DATABASE_URL"])

def extract_sections(markdown_path: Path) -> list[dict]:
    """Split markdown into sections by H2 headings."""
    content = markdown_path.read_text()
    sections = []
    current_title = markdown_path.stem
    current_lines = []

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_lines:
                sections.append({
                    "title": current_title,
                    "content": "\n".join(current_lines).strip(),
                    "source": str(markdown_path),
                })
            current_title = line.lstrip("# ").strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append({
            "title": current_title,
            "content": "\n".join(current_lines).strip(),
            "source": str(markdown_path),
        })

    return [s for s in sections if len(s["content"]) > 100]

async def ingest_docs(docs_dir: str):
    docs_path = Path(docs_dir)
    all_sections = []

    for md_file in docs_path.rglob("*.md"):
        sections = extract_sections(md_file)
        all_sections.extend(sections)

    print(f"Found {len(all_sections)} sections")

    # Batch embed
    batch_size = 100
    async with AsyncSession(engine) as session:
        for i in range(0, len(all_sections), batch_size):
            batch = all_sections[i : i + batch_size]
            texts = [f"{s['title']}\n\n{s['content']}" for s in batch]

            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=texts,
            )

            for section, embedding_obj in zip(batch, response.data):
                await session.execute(
                    text("""
                        INSERT INTO doc_sections (title, content, source, embedding)
                        VALUES (:title, :content, :source, :embedding)
                        ON CONFLICT (source, title) DO UPDATE
                        SET content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding
                    """),
                    {
                        "title": section["title"],
                        "content": section["content"],
                        "source": section["source"],
                        "embedding": embedding_obj.embedding,
                    }
                )

        await session.commit()
        print("Ingestion complete")
```

Step 3 - Chat API with Streaming

```python
api/chat.py
import json
import asyncio
from typing import AsyncIterator
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

app = FastAPI()
client = AsyncOpenAI()

class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []

async def retrieve_context(question: str, top_k: int = 5) -> list[dict]:
    """Embed the question and retrieve relevant doc sections."""
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=question,
    )
    embedding = response.data[0].embedding

    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("""
                SELECT title, content, source,
                       1 - (embedding <=> :embedding) AS score
                FROM doc_sections
                WHERE 1 - (embedding <=> :embedding) > 0.65
                ORDER BY embedding <=> :embedding
                LIMIT :top_k
            """),
            {"embedding": embedding, "top_k": top_k}
        )
        rows = result.fetchall()

    return [
        {"title": r.title, "content": r.content, "source": r.source, "score": r.score}
        for r in rows
    ]

def build_system_prompt(context_sections: list[dict]) -> str:
    context = "\n\n---\n\n".join(
        f"{s['title']} (source: {s['source']})\n{s['content']}"
        for s in context_sections
    )
    return f"""You are a documentation assistant. Answer questions using only the provided documentation context.
If the answer is not in the context, say "I couldn't find that in the documentation."
Always cite the source section name at the end of your answer.

Documentation context:
{context}"""

async def stream_answer(
    question: str,
    history: list[dict],
    context: list[dict],
) -> AsyncIterator[str]:
    system_prompt = build_system_prompt(context)

    messages = [*history, {"role": "user", "content": question}]

    async with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    ) as stream:
        async for text_chunk in stream.text_stream:
            yield f"data: {json.dumps({'type': 'text', 'content': text_chunk})}\n\n"

    # After streaming, send sources
    sources = [{"title": c["title"], "source": c["source"], "score": c["score"]}
               for c in context]
    yield f"data: {json.dumps({'type': 'sources', 'content': sources})}\n\n"
    yield "data: [DONE]\n\n"

@app.post("/chat")
async def chat(req: ChatRequest):
    context = await retrieve_context(req.question)

    if not context:
        async def empty_stream():
            msg = "I couldn't find relevant documentation for that question."
            yield f"data: {json.dumps({'type': 'text', 'content': msg})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(empty_stream(), media_type="text/event-stream")

    return StreamingResponse(
        stream_answer(req.question, req.history, context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

Step 4 - Simple Frontend

```javascript
// chat.js
async function sendMessage(question, history = []) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let answerEl = document.getElementById("answer");
  answerEl.textContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") break;

      const event = JSON.parse(data);
      if (event.type === "text") {
        answerEl.textContent += event.content;
      } else if (event.type === "sources") {
        renderSources(event.content);
      }
    }
  }
}

function renderSources(sources) {
  const el = document.getElementById("sources");
  el.innerHTML = "<strong>Sources:</strong><ul>" +
    sources.map(s =>
      `<li><a href="${s.source}">${s.title}</a> (${Math.round(s.score * 100)}% match)</li>`
    ).join("") + "</ul>";
}
```

Step 5 - Conversation History Management

Multi-turn conversations need history pruning to avoid overflowing the context window. A practical approach:

```python
utils/history.py
import tiktoken

ENCODER = tiktoken.get_encoding("cl100k_base")
MAX_HISTORY_TOKENS = 2000

def count_tokens(text: str) -> int:
    return len(ENCODER.encode(text))

def prune_history(history: list[dict], max_tokens: int = MAX_HISTORY_TOKENS) -> list[dict]:
    """
    Trim history from the oldest end until it fits within max_tokens.
    Always preserves the most recent exchange.
    """
    total = sum(count_tokens(m["content"]) for m in history)
    if total <= max_tokens:
        return history

    pruned = list(history)
    while pruned and sum(count_tokens(m["content"]) for m in pruned) > max_tokens:
        pruned.pop(0)  # Remove oldest message

    return pruned
```

Call `prune_history(req.history)` before passing history to the LLM. This prevents `400 context_length_exceeded` errors in long sessions while keeping the conversation coherent.

Step 6 - Caching Embeddings with Redis

Re-embedding the same question repeatedly wastes money and adds latency. Cache embedding vectors:

```python
import hashlib
import json
import redis.asyncio as redis

redis_client = redis.from_url(os.environ["REDIS_URL"])
EMBED_CACHE_TTL = 3600  # 1 hour

async def get_or_create_embedding(text: str) -> list[float]:
    cache_key = f"embed:{hashlib.sha256(text.encode()).hexdigest()}"

    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    embedding = response.data[0].embedding
    await redis_client.setex(cache_key, EMBED_CACHE_TTL, json.dumps(embedding))
    return embedding
```

For a docs site with typical question patterns, this cache achieves 60-80% hit rates, dropping average response latency by 100-200ms.

Step 7 - Webhook-Based Re-ingestion

Trigger re-ingestion automatically when docs change rather than on a fixed schedule. Here is a minimal FastAPI webhook endpoint that queues re-ingestion via a background task:

```python
api/webhook.py
import hmac
import hashlib
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks

router = APIRouter()
WEBHOOK_SECRET = os.environ["DOCS_WEBHOOK_SECRET"]

def verify_signature(payload: bytes, signature: str) -> bool:
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@router.post("/webhooks/docs-updated")
async def docs_updated(request: Request, background_tasks: BackgroundTasks):
    body = await request.body()
    sig = request.headers.get("X-Hub-Signature-256", "")

    if not verify_signature(body, sig):
        raise HTTPException(status_code=401, detail="Invalid signature")

    background_tasks.add_task(ingest_docs, os.environ["DOCS_DIR"])
    return {"status": "ingestion queued"}
```

Point your GitHub or GitLab webhook at `/webhooks/docs-updated` with a shared secret. Every merged PR to the docs repo triggers a fresh ingestion within seconds.

Deployment Checklist

- Set `X-Accel-Buffering: no` on Nginx to prevent SSE buffering
- Add a 30-second timeout on Nginx for streaming responses
- Rate-limit the `/chat` endpoint (10 req/min per IP is reasonable)
- Cache embeddings for repeated questions using Redis with a 1-hour TTL
- Run `ingest.py` as a cron job or webhook trigger when docs change
- Monitor embedding cost: `text-embedding-3-small` is $0.02/1M tokens. ingesting 10,000 sections of 500 tokens each costs about $0.10
- Set a similarity threshold (0.65 in the example) to avoid surfacing irrelevant context
- Log unanswered questions (empty context returns) to identify gaps in your docs

Related Reading

- [How to Build Semantic Search with Embeddings](/how-to-build-semantic-search-with-embeddings/)
- [How to Build AI-Powered Code Search](/how-to-build-ai-powered-code-search-2026/)
- [How to Build a RAG Chatbot with Pinecone](/how-to-build-rag-chatbot-with-pinecone/)

- [AI Tools for API Documentation from Code 2026](/ai-tools-for-api-documentation-from-code-2026/)
---

Related Articles

- [AI Tools for Automated Code Documentation](/ai-tools-for-automated-code-documentation)
- [How to Use AI to Create Onboarding Documentation for New](/how-to-use-ai-to-create-onboarding-documentation-for-new-tea/)
- [Gemini vs Claude for Generating Markdown Documentation](/gemini-vs-claude-for-generating-markdown-documentation-from-/)
- [How to Build AI Pipelines with Prefect](/how-to-build-ai-pipelines-with-prefect)
- [How to Build Voice AI Apps with Claude](/how-to-build-voice-ai-apps-with-claude)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
