---
layout: default
title: "How to Build a RAG Pipeline with LangChain 2026"
description: "Step-by-step guide to building a production RAG pipeline with LangChain, including chunking strategies, vector stores, retrieval tuning, and evaluation methods"
date: 2026-03-21
author: theluckystrike
permalink: /how-to-build-a-rag-pipeline-with-langchain-2026/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Retrieval-Augmented Generation (RAG) lets you ground LLM responses in your own documents. LangChain remains the most widely adopted framework for wiring together the components — loaders, splitters, embeddings, vector stores, and retrievers. This guide walks through building a production-quality RAG pipeline from scratch with real code, covering the decisions that actually affect answer quality.

## What a RAG Pipeline Does

A RAG pipeline has three stages:

1. **Indexing** — Load documents, split into chunks, embed them, store in a vector database.
2. **Retrieval** — Given a user query, embed it and find the most semantically similar chunks.
3. **Generation** — Pass the retrieved chunks as context to an LLM and return its response.

The bottleneck in most broken RAG systems is retrieval quality, not the LLM. If the wrong chunks come back, no amount of prompt tuning fixes the answer.

## Install Dependencies

```bash
pip install langchain langchain-openai langchain-community \
    langchain-chroma chromadb tiktoken pypdf sentence-transformers
```

For a local embedding model instead of OpenAI, use `sentence-transformers`. For production vector storage, swap Chroma for Pinecone, Weaviate, or pgvector.

## Step 1: Load and Split Documents

Chunking strategy is the highest-leverage decision in RAG. Chunks too large dilute signal; chunks too small lose context.

```python
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Load a directory of PDFs
loader = DirectoryLoader("./docs", glob="**/*.pdf", loader_cls=PyPDFLoader)
raw_docs = loader.load()

# RecursiveCharacterTextSplitter tries paragraph -> sentence -> word boundaries
splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,       # tokens, not characters — tune for your model's context
    chunk_overlap=64,     # overlap prevents context loss at chunk boundaries
    length_function=len,
    add_start_index=True, # stores character offset in metadata for citations
)

docs = splitter.split_documents(raw_docs)
print(f"Split {len(raw_docs)} documents into {len(docs)} chunks")
```

**Chunk size guidance:**
- 256–512 tokens: good for factual Q&A, dense technical docs
- 512–1024 tokens: better for narrative text, legal documents
- Parent-child chunking (small retrieval chunk, large context chunk) often beats both

## Step 2: Embed and Store

```python
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Build the vector store from documents
# Chroma persists to disk by default when you give it a directory
vectorstore = Chroma.from_documents(
    documents=docs,
    embedding=embeddings,
    persist_directory="./chroma_db",
    collection_name="my_docs",
)

print(f"Indexed {vectorstore._collection.count()} chunks")
```

For subsequent runs, load the existing store rather than re-indexing:

```python
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings,
    collection_name="my_docs",
)
```

## Step 3: Build the Retriever

The default retriever returns the top-k chunks by cosine similarity. For better recall, use MMR (Maximum Marginal Relevance) to trade off relevance against diversity.

```python
# Basic similarity retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 6},
)

# MMR retriever — reduces redundant chunks in results
retriever_mmr = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 6, "fetch_k": 20, "lambda_mult": 0.5},
)
```

`fetch_k` controls how many candidates are fetched before MMR reranks them. `lambda_mult` ranges from 0 (max diversity) to 1 (max relevance).

## Step 4: Wire the Chain

```python
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

prompt_template = """You are an assistant answering questions based on the provided context.
If the answer is not in the context, say "I don't have enough information to answer that."

Context:
{context}

Question: {question}

Answer:"""

PROMPT = PromptTemplate(
    template=prompt_template,
    input_variables=["context", "question"],
)

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",   # "stuff" = all chunks in one prompt; use "map_reduce" for many chunks
    retriever=retriever_mmr,
    return_source_documents=True,
    chain_type_kwargs={"prompt": PROMPT},
)

result = qa_chain.invoke({"query": "What are the key risks identified in Q3?"})
print(result["result"])
for doc in result["source_documents"]:
    print(f"  Source: {doc.metadata.get('source')} page {doc.metadata.get('page')}")
```

## Step 5: Add a Reranker for Better Precision

Embedding-based retrieval has high recall but mediocre precision. A cross-encoder reranker scores (query, chunk) pairs directly and dramatically improves the top results.

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain.retrievers.document_compressors import CrossEncoderReranker

# Cross-encoders run locally — no API cost
cross_encoder = HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-v2-m3")
reranker = CrossEncoderReranker(model=cross_encoder, top_n=3)

compression_retriever = ContextualCompressionRetriever(
    base_compressor=reranker,
    base_retriever=retriever_mmr,  # fetch 6, rerank to top 3
)
```

This two-stage approach (bi-encoder fetch + cross-encoder rerank) is the standard production pattern and typically improves answer quality by 10–20% over embedding-only retrieval.

## Evaluating RAG Quality

Don't guess — measure. The key metrics are:

| Metric | What It Measures | Tool |
|---|---|---|
| Context Precision | Are retrieved chunks actually relevant? | RAGAS |
| Context Recall | Do retrieved chunks contain the answer? | RAGAS |
| Answer Faithfulness | Does the answer stick to the context? | RAGAS |
| Answer Relevancy | Does the answer address the question? | RAGAS |

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from datasets import Dataset

# Build evaluation dataset
eval_data = {
    "question": ["What are the Q3 key risks?"],
    "answer": [result["result"]],
    "contexts": [[d.page_content for d in result["source_documents"]]],
    "ground_truth": ["The key risks identified in Q3 are..."],  # from human-labeled set
}
dataset = Dataset.from_dict(eval_data)

scores = evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_precision, context_recall])
print(scores)
```

Run this on 50–100 question/answer pairs before deploying. A faithfulness score below 0.8 means the model is hallucinating outside the retrieved context.

## Common Production Issues

**Chunks lack enough context** — The answer spans multiple chunks that never get retrieved together. Fix: increase chunk overlap or use parent-document retrieval.

**Wrong chunks returned for ambiguous queries** — Add a query rewriting step that expands or clarifies the user's question before embedding.

**Costs blow up at scale** — Cache embedding results by content hash. Use `text-embedding-3-small` instead of `large` unless you measure a quality difference on your specific data.

**Stale index** — Add a metadata `last_modified` field and re-index only changed documents using a document hash comparison loop before each indexing run.

## Related Reading

- [AI Tools for Automated API Documentation from Code Comments](/ai-tools-for-automated-api-documentation-from-code-comments/)
- [AI Pair Programming Tools Comparison 2026](/ai-pair-programming-tools-comparison-2026/)
- [ChatGPT vs Claude for Writing API Documentation](/chatgpt-vs-claude-for-writing-api-documentation/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
