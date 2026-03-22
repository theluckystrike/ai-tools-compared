---
layout: default
title: "How to Build Semantic Search with Embeddings"
description: "Step-by-step guide to building semantic search using OpenAI embeddings, pgvector, and a FastAPI backend — with chunking, indexing, and query code"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-semantic-search-with-embeddings/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

# How to Build Semantic Search with Embeddings

Semantic search finds results by meaning, not keyword match. A query for "server crash" returns documents about "application outage" and "process died" — things a LIKE query would miss. This guide builds a complete semantic search pipeline: embedding generation, vector storage in Postgres with pgvector, and a FastAPI query endpoint.

## Architecture

```
Documents → Chunker → Embedding Model → pgvector (Postgres)
                                              ↑
User query → Embedding Model → cosine similarity search
```

The key components:
- **Embedding model**: OpenAI `text-embedding-3-small` (1536 dims, fast, cheap)
- **Vector store**: pgvector extension on Postgres
- **API**: FastAPI with async SQLAlchemy

## Step 1: Set Up pgvector

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
    id          BIGSERIAL PRIMARY KEY,
    source_id   TEXT NOT NULL,
    chunk_index INT  NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(1536),
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_id, chunk_index)
);

-- IVFFlat index for approximate nearest neighbor search
-- lists = sqrt(row_count) is a good starting point
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Full-text index for hybrid search fallback
CREATE INDEX ON documents USING gin(to_tsvector('english', content));
```

The `ivfflat` index trades some recall for speed. For exact search (smaller datasets), use `CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)` — HNSW has better recall but slower build time.

## Step 2: Document Chunking

Chunking strategy matters more than the embedding model. Too large = noisy vectors. Too small = lost context.

```python
# chunker.py
from dataclasses import dataclass
import tiktoken

@dataclass
class Chunk:
    content: str
    chunk_index: int
    token_count: int

def chunk_text(
    text: str,
    max_tokens: int = 512,
    overlap_tokens: int = 64,
    model: str = "text-embedding-3-small",
) -> list[Chunk]:
    enc = tiktoken.encoding_for_model(model)
    tokens = enc.encode(text)

    chunks: list[Chunk] = []
    start = 0
    idx = 0

    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk_tokens = tokens[start:end]
        content = enc.decode(chunk_tokens)
        chunks.append(Chunk(
            content=content,
            chunk_index=idx,
            token_count=len(chunk_tokens),
        ))
        idx += 1
        start = end - overlap_tokens  # sliding window with overlap

    return chunks
```

The 64-token overlap prevents sentences from being split across chunks with no context on either side.

## Step 3: Embedding Generation and Indexing

```python
# indexer.py
import asyncio
import hashlib
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import text
from chunker import chunk_text

client = AsyncOpenAI()
engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/semantic_db")

async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed up to 2048 texts in one API call."""
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
        encoding_format="float",
    )
    return [item.embedding for item in response.data]

async def index_document(source_id: str, content: str) -> int:
    chunks = chunk_text(content)
    texts = [c.content for c in chunks]

    # Batch embed (max 2048 per call)
    embeddings = []
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        embeddings.extend(await embed_batch(batch))

    async with AsyncSession(engine) as session:
        for chunk, embedding in zip(chunks, embeddings):
            await session.execute(
                text("""
                    INSERT INTO documents (source_id, chunk_index, content, embedding)
                    VALUES (:source_id, :chunk_index, :content, :embedding)
                    ON CONFLICT (source_id, chunk_index)
                    DO UPDATE SET content = EXCLUDED.content,
                                  embedding = EXCLUDED.embedding
                """),
                {
                    "source_id": source_id,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "embedding": embedding,
                }
            )
        await session.commit()

    return len(chunks)
```

## Step 4: Query API

```python
# api.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

app = FastAPI()

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    top_k: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0.7, ge=0.0, le=1.0)

class SearchResult(BaseModel):
    source_id: str
    chunk_index: int
    content: str
    score: float
    metadata: dict

@app.post("/search", response_model=list[SearchResult])
async def search(req: SearchRequest):
    # Embed the query
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=req.query,
    )
    query_embedding = response.data[0].embedding

    async with AsyncSession(engine) as session:
        rows = await session.execute(
            text("""
                SELECT
                    source_id,
                    chunk_index,
                    content,
                    metadata,
                    1 - (embedding <=> :embedding) AS score
                FROM documents
                WHERE 1 - (embedding <=> :embedding) >= :min_score
                ORDER BY embedding <=> :embedding
                LIMIT :top_k
            """),
            {
                "embedding": query_embedding,
                "min_score": req.min_score,
                "top_k": req.top_k,
            }
        )
        results = rows.fetchall()

    if not results:
        return []

    return [
        SearchResult(
            source_id=row.source_id,
            chunk_index=row.chunk_index,
            content=row.content,
            score=round(row.score, 4),
            metadata=row.metadata or {},
        )
        for row in results
    ]
```

The `<=>` operator is pgvector's cosine distance. `1 - distance = similarity`, so 0.7 minimum score means 70% semantic similarity.

## Hybrid Search

For production, combine semantic search with BM25 (full-text) and rerank:

```sql
-- Hybrid search: semantic + full-text with RRF fusion
WITH semantic AS (
    SELECT id, 1 - (embedding <=> :embedding) AS sem_score,
           ROW_NUMBER() OVER (ORDER BY embedding <=> :embedding) AS sem_rank
    FROM documents
    ORDER BY embedding <=> :embedding
    LIMIT 50
),
fulltext AS (
    SELECT id,
           ts_rank(to_tsvector('english', content), plainto_tsquery('english', :query)) AS ft_score,
           ROW_NUMBER() OVER (
               ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', :query)) DESC
           ) AS ft_rank
    FROM documents
    WHERE to_tsvector('english', content) @@ plainto_tsquery('english', :query)
    LIMIT 50
)
SELECT d.source_id, d.content,
       COALESCE(1.0 / (60 + s.sem_rank), 0) + COALESCE(1.0 / (60 + f.ft_rank), 0) AS rrf_score
FROM documents d
LEFT JOIN semantic s ON d.id = s.id
LEFT JOIN fulltext f ON d.id = f.id
WHERE s.id IS NOT NULL OR f.id IS NOT NULL
ORDER BY rrf_score DESC
LIMIT :top_k;
```

RRF (Reciprocal Rank Fusion) with k=60 is a well-tested method for combining ranked lists without needing to tune weights.

## Performance Notes

- At 1M rows, IVFFlat with `lists=1000` queries in ~20ms on an 8-core server
- Embedding a single query with `text-embedding-3-small` takes ~50ms
- Batch indexing: 1000 chunks/minute is a safe rate without hitting OpenAI rate limits
- Consider `pgvector`'s HNSW index if you need consistent <10ms query latency

## Related Reading

- [How to Build AI-Powered Code Search](/ai-tools-compared/how-to-build-ai-powered-code-search-2026/)
- [How to Build AI Documentation Chatbots](/ai-tools-compared/how-to-build-ai-documentation-chatbots-2026/)
- [How to Build AI-Powered Error Classifiers](/ai-tools-compared/how-to-build-ai-powered-error-classifiers-2026/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
