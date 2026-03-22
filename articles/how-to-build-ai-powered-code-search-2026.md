---
layout: default
title: "How to Build AI-Powered Code Search 2026"
description: "Build a semantic code search tool using tree-sitter for parsing, OpenAI embeddings for indexing, and a FastAPI query interface with real Python and Go examples"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-ai-powered-code-search-2026/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

# How to Build AI-Powered Code Search 2026

Code search powered by embeddings finds functions by what they do, not just what they're named. A query like "parse JWT from Authorization header" returns relevant functions even if they're named `extractToken` or `getBearer`. This guide builds a complete code search pipeline using tree-sitter for AST parsing and OpenAI embeddings.

## Why AST Parsing Matters

Splitting code by lines misses logical boundaries. A function that spans 40 lines becomes multiple incomplete chunks. Tree-sitter parses source code into an AST, letting you extract functions and classes as complete semantic units.

## Step 1: Extract Code Units with Tree-sitter

```python
# extractor.py
from dataclasses import dataclass
from pathlib import Path
import tree_sitter_python as tspython
import tree_sitter_go as tsgo
import tree_sitter_typescript as tstypescript
from tree_sitter import Language, Parser

LANGUAGES = {
    ".py": Language(tspython.language()),
    ".go": Language(tsgo.language()),
    ".ts": Language(tstypescript.language_typescript()),
    ".tsx": Language(tstypescript.language_typescript()),
}

# tree-sitter queries to extract functions/methods
FUNCTION_QUERIES = {
    ".py": """
        (function_definition
            name: (identifier) @func.name
        ) @func.body
        (class_definition
            name: (identifier) @class.name
            body: (block) @class.body
        )
    """,
    ".go": """
        (function_declaration
            name: (identifier) @func.name
        ) @func.body
        (method_declaration
            name: (field_identifier) @func.name
        ) @func.body
    """,
    ".ts": """
        (function_declaration
            name: (identifier) @func.name
        ) @func.body
        (method_definition
            name: (property_identifier) @func.name
        ) @func.body
        (arrow_function) @func.body
    """,
}

@dataclass
class CodeUnit:
    file_path: str
    language: str
    name: str
    code: str
    start_line: int
    end_line: int

def extract_units(file_path: Path) -> list[CodeUnit]:
    ext = file_path.suffix
    if ext not in LANGUAGES:
        return []

    lang = LANGUAGES[ext]
    parser = Parser(lang)
    source = file_path.read_bytes()
    tree = parser.parse(source)

    query_str = FUNCTION_QUERIES.get(ext, "")
    if not query_str:
        return []

    query = lang.query(query_str)
    captures = query.captures(tree.root_node)

    units = []
    processed_nodes = set()

    for node, capture_name in captures:
        if capture_name not in ("func.body", "class.body"):
            continue
        if id(node) in processed_nodes:
            continue
        processed_nodes.add(id(node))

        # Find the name capture for this node
        name = "anonymous"
        for n, c in captures:
            if c in ("func.name", "class.name") and n.parent == node.parent:
                name = source[n.start_byte:n.end_byte].decode("utf-8")
                break

        code = source[node.start_byte:node.end_byte].decode("utf-8")

        # Skip very short units (< 3 lines) — likely not useful
        if code.count("\n") < 2:
            continue

        units.append(CodeUnit(
            file_path=str(file_path),
            language=ext.lstrip("."),
            name=name,
            code=code,
            start_line=node.start_point[0] + 1,
            end_line=node.end_point[0] + 1,
        ))

    return units
```

## Step 2: Index Code Units

```python
# indexer.py
import os
import asyncio
from pathlib import Path
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import text
from extractor import extract_units, CodeUnit

client = AsyncOpenAI()
engine = create_async_engine(os.environ["DATABASE_URL"])

def make_embedding_text(unit: CodeUnit) -> str:
    """Create a text representation for embedding."""
    # Include filename, function name, and code for richer embeddings
    return f"File: {Path(unit.file_path).name}\nFunction: {unit.name}\n\n{unit.code}"

async def index_repository(repo_path: str, extensions: list[str] = None):
    extensions = extensions or [".py", ".go", ".ts", ".tsx"]
    repo = Path(repo_path)

    all_units: list[CodeUnit] = []
    for ext in extensions:
        for file in repo.rglob(f"*{ext}"):
            # Skip vendor, node_modules, .git
            if any(p in file.parts for p in ["vendor", "node_modules", ".git", "__pycache__"]):
                continue
            all_units.extend(extract_units(file))

    print(f"Extracted {len(all_units)} code units")

    # Embed in batches
    batch_size = 50
    async with AsyncSession(engine) as session:
        for i in range(0, len(all_units), batch_size):
            batch = all_units[i : i + batch_size]
            texts = [make_embedding_text(u) for u in batch]

            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=texts,
            )

            for unit, emb in zip(batch, response.data):
                await session.execute(
                    text("""
                        INSERT INTO code_units
                            (file_path, language, name, code, start_line, end_line, embedding)
                        VALUES
                            (:file_path, :language, :name, :code, :start_line, :end_line, :embedding)
                        ON CONFLICT (file_path, name, start_line)
                        DO UPDATE SET code = EXCLUDED.code, embedding = EXCLUDED.embedding
                    """),
                    {
                        "file_path": unit.file_path,
                        "language": unit.language,
                        "name": unit.name,
                        "code": unit.code,
                        "start_line": unit.start_line,
                        "end_line": unit.end_line,
                        "embedding": emb.embedding,
                    }
                )

        await session.commit()
    print("Indexing complete")
```

## Step 3: Search API

```python
# search_api.py
from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from openai import AsyncOpenAI

app = FastAPI()
client = AsyncOpenAI()

class CodeSearchRequest(BaseModel):
    query: str
    language: str | None = None
    top_k: int = 10
    min_score: float = 0.6

class CodeSearchResult(BaseModel):
    file_path: str
    name: str
    language: str
    code: str
    start_line: int
    end_line: int
    score: float

@app.post("/search", response_model=list[CodeSearchResult])
async def search_code(req: CodeSearchRequest):
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=req.query,
    )
    embedding = response.data[0].embedding

    lang_filter = "AND language = :language" if req.language else ""

    async with AsyncSession(engine) as session:
        rows = await session.execute(
            text(f"""
                SELECT
                    file_path, name, language, code, start_line, end_line,
                    1 - (embedding <=> :embedding) AS score
                FROM code_units
                WHERE 1 - (embedding <=> :embedding) >= :min_score
                {lang_filter}
                ORDER BY embedding <=> :embedding
                LIMIT :top_k
            """),
            {
                "embedding": embedding,
                "min_score": req.min_score,
                "top_k": req.top_k,
                "language": req.language,
            }
        )

    return [
        CodeSearchResult(
            file_path=r.file_path,
            name=r.name,
            language=r.language,
            code=r.code,
            start_line=r.start_line,
            end_line=r.end_line,
            score=round(r.score, 4),
        )
        for r in rows.fetchall()
    ]
```

## CLI Interface

```python
# cli.py
import asyncio
import click
from rich.console import Console
from rich.syntax import Syntax
from rich.panel import Panel
import httpx

console = Console()

@click.command()
@click.argument("query")
@click.option("--lang", help="Filter by language (py, go, ts)")
@click.option("--top-k", default=5, help="Number of results")
@click.option("--url", default="http://localhost:8000", help="API URL")
def search(query: str, lang: str | None, top_k: int, url: str):
    """Search code semantically."""
    with httpx.Client() as client:
        response = client.post(f"{url}/search", json={
            "query": query,
            "language": lang,
            "top_k": top_k,
        })
        results = response.json()

    if not results:
        console.print("[yellow]No results found[/yellow]")
        return

    for i, result in enumerate(results, 1):
        score_pct = int(result["score"] * 100)
        header = f"[{i}] {result['name']} — {result['file_path']}:{result['start_line']} ({score_pct}% match)"
        syntax = Syntax(result["code"], result["language"],
                       theme="monokai", line_numbers=True,
                       start_line=result["start_line"])
        console.print(Panel(syntax, title=header, border_style="blue"))
```

## Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE code_units (
    id          BIGSERIAL PRIMARY KEY,
    file_path   TEXT NOT NULL,
    language    TEXT NOT NULL,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL,
    start_line  INT NOT NULL,
    end_line    INT NOT NULL,
    embedding   vector(1536),
    indexed_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (file_path, name, start_line)
);

CREATE INDEX ON code_units USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE INDEX ON code_units (language);
```

## Related Reading

- [How to Build Semantic Search with Embeddings](/ai-tools-compared/how-to-build-semantic-search-with-embeddings/)
- [How to Build AI Documentation Chatbots](/ai-tools-compared/how-to-build-ai-documentation-chatbots-2026/)
- [How to Build AI-Powered CLI Tools](/ai-tools-compared/how-to-build-ai-powered-cli-tools-2026/)

---

## Related Articles

- [How to Build an AI-Powered Code Linter](/ai-tools-compared/how-to-build-ai-powered-code-linter/)
- [How to Use AI Codebase Search to Find Relevant Code Before](/ai-tools-compared/how-to-use-ai-codebase-search-to-find-relevant-code-before-g/)
- [How to Structure Prompts for AI to Generate Idiomatic Code](/ai-tools-compared/how-to-structure-prompts-for-ai-to-generate-idiomatic-code-i/)
- [Claude Code vs ChatGPT Code Interpreter Comparison](/ai-tools-compared/claude-code-vs-chatgpt-code-interpreter-comparison/)
- [Best AI Tool for Software Engineers Code Review 2026](/ai-tools-compared/best-ai-tool-for-software-engineers-code-review-2026/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
