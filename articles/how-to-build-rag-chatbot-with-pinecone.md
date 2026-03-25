---
layout: default
title: "How to Build a RAG Chatbot with Pinecone"
description: "Step-by-step guide to building a retrieval-augmented generation chatbot using Pinecone vector DB, Claude or OpenAI, and FastAPI with working code"
date: 2026-03-22
author: theluckystrike
permalink: how-to-build-rag-chatbot-with-pinecone
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Retrieval-augmented generation solves the context window problem: instead of cramming your entire knowledge base into a prompt, you fetch only the relevant chunks at query time. Pinecone makes this fast at scale. This guide builds a working RAG chatbot from scratch. document ingestion, vector search, and a streaming FastAPI endpoint.

Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step 1 - Document Ingestion](#step-1-document-ingestion)
- [Step 2 - Retrieval](#step-2-retrieval)
- [Step 3 - Generation with Claude](#step-3-generation-with-claude)
- [Step 4 - FastAPI Endpoint](#step-4-fastapi-endpoint)
- [Common Failure Modes](#common-failure-modes)
- [Chunk Strategy by Document Type](#chunk-strategy-by-document-type)
- [Multi-Tenant Isolation with Namespaces](#multi-tenant-isolation-with-namespaces)
- [Re-Ranking Retrieved Chunks](#re-ranking-retrieved-chunks)
- [Related Reading](#related-reading)

Architecture Overview

```
Documents → Chunker → Embedder → Pinecone Index
                                        ↓
User Query → Embedder → Pinecone Search → Top-K Chunks
                                        ↓
              System Prompt + Chunks + Query → LLM → Response
```

Three moving parts - ingestion pipeline, retrieval, and generation. Each has failure modes worth understanding.

Prerequisites

```bash
pip install pinecone-client openai anthropic fastapi uvicorn \
            langchain-text-splitters tiktoken python-dotenv
```

```bash
.env
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=rag-docs
OPENAI_API_KEY=your_openai_key      # for embeddings
ANTHROPIC_API_KEY=your_anthropic_key # for generation
```

Step 1 - Document Ingestion

```python
ingest.py
import os
import hashlib
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
oai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

INDEX_NAME = os.environ["PINECONE_INDEX_NAME"]
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM = 1536

def get_or_create_index():
    existing = [idx.name for idx in pc.list_indexes()]
    if INDEX_NAME not in existing:
        pc.create_index(
            name=INDEX_NAME,
            dimension=EMBED_DIM,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
    return pc.Index(INDEX_NAME)

def chunk_document(text: str, source: str) -> list[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=512,
        chunk_overlap=64,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = splitter.split_text(text)

    return [
        {
            "text": chunk,
            "source": source,
            "chunk_index": i,
            "chunk_id": hashlib.md5(f"{source}:{i}:{chunk[:50]}".encode()).hexdigest()
        }
        for i, chunk in enumerate(chunks)
    ]

def embed_batch(texts: list[str]) -> list[list[float]]:
    response = oai.embeddings.create(
        model=EMBED_MODEL,
        input=texts
    )
    return [item.embedding for item in response.data]

def ingest_documents(docs: list[dict]):
    """
    docs: list of {"text": str, "source": str}
    """
    index = get_or_create_index()
    all_chunks = []

    for doc in docs:
        chunks = chunk_document(doc["text"], doc["source"])
        all_chunks.extend(chunks)

    # Embed in batches of 100 (OpenAI limit)
    batch_size = 100
    vectors = []

    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i + batch_size]
        texts = [c["text"] for c in batch]
        embeddings = embed_batch(texts)

        for chunk, embedding in zip(batch, embeddings):
            vectors.append({
                "id": chunk["chunk_id"],
                "values": embedding,
                "metadata": {
                    "text": chunk["text"],
                    "source": chunk["source"],
                    "chunk_index": chunk["chunk_index"]
                }
            })

    # Upsert in batches of 100
    for i in range(0, len(vectors), 100):
        index.upsert(vectors=vectors[i:i + 100])

    print(f"Ingested {len(vectors)} chunks from {len(docs)} documents")

Example usage
if __name__ == "__main__":
    sample_docs = [
        {
            "text": Path("docs/api-reference.md").read_text(),
            "source": "api-reference.md"
        },
        {
            "text": Path("docs/deployment-guide.md").read_text(),
            "source": "deployment-guide.md"
        }
    ]
    ingest_documents(sample_docs)
```

Step 2 - Retrieval

```python
retrieval.py
import os
from pinecone import Pinecone
from openai import OpenAI

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
oai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

def retrieve_context(
    query: str,
    top_k: int = 5,
    score_threshold: float = 0.70
) -> list[dict]:
    index = pc.Index(os.environ["PINECONE_INDEX_NAME"])

    # Embed the query
    query_embedding = oai.embeddings.create(
        model="text-embedding-3-small",
        input=[query]
    ).data[0].embedding

    # Search
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )

    # Filter by score threshold and deduplicate by source chunk
    seen_chunks = set()
    contexts = []

    for match in results.matches:
        if match.score < score_threshold:
            continue

        chunk_key = f"{match.metadata['source']}:{match.metadata['chunk_index']}"
        if chunk_key in seen_chunks:
            continue

        seen_chunks.add(chunk_key)
        contexts.append({
            "text": match.metadata["text"],
            "source": match.metadata["source"],
            "score": round(match.score, 3)
        })

    return contexts

def format_context_block(contexts: list[dict]) -> str:
    if not contexts:
        return "No relevant context found."

    parts = []
    for i, ctx in enumerate(contexts, 1):
        parts.append(
            f"[{i}] Source: {ctx['source']} (relevance: {ctx['score']})\n"
            f"{ctx['text']}"
        )
    return "\n\n---\n\n".join(parts)
```

Step 3 - Generation with Claude

```python
generation.py
import os
from anthropic import Anthropic
from retrieval import retrieve_context, format_context_block

client = Anthropic()

SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on
provided documentation. Follow these rules:

1. Answer only from the provided context. If the context doesn't contain the
   answer, say "I don't have information about that in the documentation."
2. Cite your sources using [1], [2] notation when referencing specific content.
3. Be concise. Prefer bullet points for lists of steps.
4. If the user asks for code, provide complete, runnable examples."""

def generate_answer(
    query: str,
    conversation_history: list[dict] = None
) -> dict:
    contexts = retrieve_context(query, top_k=5)
    context_block = format_context_block(contexts)

    messages = conversation_history or []
    messages.append({
        "role": "user",
        "content": f"""Context from documentation:

{context_block}

---

Question - {query}"""
    })

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages
    )

    answer = response.content[0].text

    # Add assistant response to history (without context for future turns)
    messages.append({"role": "assistant", "content": answer})
    # Clean history: replace the user message with just the query
    messages[-2] = {"role": "user", "content": query}

    return {
        "answer": answer,
        "sources": [c["source"] for c in contexts],
        "context_used": len(contexts),
        "history": messages
    }
```

Step 4 - FastAPI Endpoint

```python
api.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json
from generation import generate_answer
from anthropic import Anthropic

app = FastAPI(title="RAG Chatbot API")
client = Anthropic()

In-memory session store (use Redis in production)
sessions: dict[str, list[dict]] = {}

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    session_id: str

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    history = sessions.get(req.session_id, [])

    try:
        result = generate_answer(req.message, history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    sessions[req.session_id] = result["history"][-20:]  # Keep last 10 turns

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=req.session_id
    )

@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    sessions.pop(session_id, None)
    return {"cleared": session_id}

@app.get("/health")
async def health():
    return {"status": "ok"}

Run with - uvicorn api:app --reload
```

Common Failure Modes

Low retrieval relevance (score < 0.7 consistently)

Your chunks are too large. Drop `chunk_size` from 512 to 256. Large chunks dilute the embedding signal. Also check that your documents are prose. code-heavy docs need a different chunking strategy.

Hallucination despite good retrieval

The system prompt's "answer only from context" instruction works ~90% of the time. For higher reliability, add a verification step:

```python
def verify_grounded(answer: str, contexts: list[dict]) -> bool:
    context_text = " ".join(c["text"] for c in contexts)
    # Simple heuristic: check if key entities from answer appear in context
    # For production: use a separate LLM call to verify
    return len(answer) < 50 or any(
        word in context_text
        for word in answer.split()
        if len(word) > 6
    )
```

Rate limits on ingestion

OpenAI's embedding API allows 1M tokens/minute on tier 2. For large document sets, add exponential backoff:

```python
import time
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def embed_batch_with_retry(texts: list[str]) -> list[list[float]]:
    return embed_batch(texts)
```

Chunk Strategy by Document Type

Not all documents chunk the same way. Using 512-token fixed-size chunks works fine for prose documentation but breaks poorly for structured content.

API reference docs - Split by endpoint or method. A chunk should contain one complete endpoint description. mixing two endpoint descriptions into one chunk dilutes the embedding for both.

Markdown with headers - Use `RecursiveCharacterTextSplitter` with `"\n## "` as a high-priority separator. This keeps H2 sections together, which typically represent coherent concepts.

Code-heavy docs - Add a custom splitter that respects code fence boundaries. A chunk that cuts across a code block mid-function will embed poorly and retrieve inaccurately.

```python
CODE_AWARE_SEPARATORS = [
    "\n```\n", # code block end
 "\n## ", # H2 section break
 "\n### ", # H3 section break
 "\n\n", # paragraph break
 "\n",
 ". ",
 " ",
 ""
]

splitter = RecursiveCharacterTextSplitter(
 chunk_size=400,
 chunk_overlap=50,
 separators=CODE_AWARE_SEPARATORS,
 keep_separator=True
)
```

Multi-Tenant Isolation with Namespaces

If you're serving multiple customers or projects from one Pinecone index, use namespace isolation rather than separate indexes. Namespaces are free and keep your index count manageable.

```python
def ingest_for_tenant(docs: list[dict], tenant_id: str):
 index = get_or_create_index()
 # ... chunk and embed as before ...
 index.upsert(vectors=vectors, namespace=tenant_id)

def retrieve_for_tenant(
 query: str,
 tenant_id: str,
 top_k: int = 5
) -> list[dict]:
 index = pc.Index(os.environ["PINECONE_INDEX_NAME"])
 query_embedding = embed_query(query)
 results = index.query(
 vector=query_embedding,
 top_k=top_k,
 include_metadata=True,
 namespace=tenant_id # isolates results to this tenant
 )
 return [m.metadata for m in results.matches if m.score >= 0.70]
```

This pattern lets you offer per-customer knowledge bases without provisioning separate indexes or worrying about data leakage between tenants.

Re-Ranking Retrieved Chunks

Cosine similarity ranking is fast but imperfect. A cross-encoder re-ranker improves relevance by scoring each candidate chunk against the full query. computationally heavier, but worth it for precision-sensitive use cases.

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(query: str, candidates: list[dict]) -> list[dict]:
 pairs = [(query, c["text"]) for c in candidates]
 scores = reranker.predict(pairs)
 ranked = sorted(
 zip(candidates, scores),
 key=lambda x: x[1],
 reverse=True
 )
 return [item for item, _ in ranked]
```

Run the initial Pinecone search with `top_k=20`, then re-rank and pass only the top 5 to the LLM. This maintains Pinecone's speed advantage while improving the final answer quality significantly.

Related Articles

- [How to Build a RAG Pipeline with LangChain 2026](/how-to-build-a-rag-pipeline-with-langchain-2026/)
- [How to Build AI Pipelines with Prefect](/how-to-build-ai-pipelines-with-prefect)
- [How to Build Semantic Search with Embeddings](/how-to-build-semantic-search-with-embeddings/)
- [How to Build Voice AI Apps with Claude](/how-to-build-voice-ai-apps-with-claude)
- [ChatGPT vs Custom Chatbot for Business: A Developer Guide](/chatgpt-vs-custom-chatbot-for-business/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
