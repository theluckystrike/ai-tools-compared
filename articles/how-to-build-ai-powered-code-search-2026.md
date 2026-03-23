---
layout: default
title: "How to Build AI-Powered Code Search 2026"
description: "Build a semantic code search tool using tree-sitter for parsing, OpenAI embeddings for indexing, and a FastAPI query interface with real Python and Go examples"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-ai-powered-code-search-2026/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

How to Build AI-Powered Code Search 2026

Code search powered by embeddings finds functions by what they do, not just what they're named. A query like "parse JWT from Authorization header" returns relevant functions even if they're named `extractToken` or `getBearer`. This guide builds a complete code search pipeline using tree-sitter for AST parsing and OpenAI embeddings.

Why AST Parsing Matters

Splitting code by lines misses logical boundaries. A function that spans 40 lines becomes multiple incomplete chunks. Tree-sitter parses source code into an AST, letting you extract functions and classes as complete semantic units.

Step 1: Extract Code Units with Tree-sitter

```python
extractor.py
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

tree-sitter queries to extract functions/methods
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

        # Skip very short units (< 3 lines). likely not useful
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

Step 2: Index Code Units

```python
indexer.py
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

Step 3: Search API

```python
search_api.py
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

CLI Interface

```python
cli.py
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
        header = f"[{i}] {result['name']}. {result['file_path']}:{result['start_line']} ({score_pct}% match)"
        syntax = Syntax(result["code"], result["language"],
                       theme="monokai", line_numbers=True,
                       start_line=result["start_line"])
        console.print(Panel(syntax, title=header, border_style="blue"))
```

Database Schema

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

Keeping the Index Fresh

A static index goes stale as soon as developers push new code. The simplest incremental update strategy is a file-hash cache: store a SHA-256 of each indexed file and skip re-embedding files that have not changed.

```python
incremental_indexer.py
import hashlib
from pathlib import Path

def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

async def index_incremental(repo_path: str, session: AsyncSession) -> dict:
    """Re-index only files that have changed since last run."""
    repo = Path(repo_path)
    stats = {"indexed": 0, "skipped": 0, "deleted": 0}

    # Load stored hashes
    rows = await session.execute(text("SELECT DISTINCT file_path, file_hash FROM code_units"))
    stored = {r.file_path: r.file_hash for r in rows}

    current_files = set()
    for ext in [".py", ".go", ".ts", ".tsx"]:
        for file in repo.rglob(f"*{ext}"):
            if any(p in file.parts for p in ["vendor", "node_modules", ".git"]):
                continue
            current_files.add(str(file))

            h = file_hash(file)
            if stored.get(str(file)) == h:
                stats["skipped"] += 1
                continue

            # File is new or changed. delete old units and re-index
            await session.execute(
                text("DELETE FROM code_units WHERE file_path = :path"),
                {"path": str(file)}
            )
            units = extract_units(file)
            await embed_and_store(units, h, session)
            stats["indexed"] += 1

    # Remove units for deleted files
    for path in set(stored.keys()) - current_files:
        await session.execute(
            text("DELETE FROM code_units WHERE file_path = :path"),
            {"path": path}
        )
        stats["deleted"] += 1

    await session.commit()
    return stats
```

Run this on a git post-commit hook or as a CI step after every merge to main. For repositories with 10,000+ functions, incremental indexing completes in seconds rather than minutes.

Tuning Embedding Quality

The default `make_embedding_text` function concatenates the filename, function name, and full source code. For better retrieval on specific query types, consider augmenting the text with docstrings and inferred purpose:

```python
def make_embedding_text_enriched(unit: CodeUnit) -> str:
    lines = unit.code.split("\n")

    # Extract docstring if present (Python)
    docstring = ""
    if unit.language == "py":
        in_doc = False
        doc_lines = []
        for line in lines[1:6]:  # check first 5 lines after def
            stripped = line.strip()
            if stripped.startswith('"""') or stripped.startswith("'''"):
                in_doc = not in_doc
                doc_lines.append(stripped.strip('"""').strip("'''"))
            elif in_doc:
                doc_lines.append(stripped)
        docstring = " ".join(doc_lines).strip()

    parts = [
        f"File: {Path(unit.file_path).name}",
        f"Function: {unit.name}",
    ]
    if docstring:
        parts.append(f"Description: {docstring}")
    parts.append(unit.code)

    return "\n".join(parts)
```

The enriched format improves recall for natural-language queries against well-documented codebases. For undocumented code, the plain format performs comparably since the model infers semantics from the code itself.

Performance at Scale

For repositories with more than 50,000 code units, the IVFFlat index becomes critical. The `lists` parameter controls the trade-off between index build time, query speed, and recall:

| Repository size | Recommended lists | Approximate query time |
|---|---|---|
| < 10,000 units | 20 | < 10ms |
| 10,000, 100,000 units | 100 | 10, 30ms |
| > 100,000 units | 200, 500 | 30, 80ms |

After inserting a large batch of new embeddings, run `VACUUM ANALYZE code_units` to refresh statistics and ensure the index planner uses the vector index rather than a sequential scan.

Related Reading

- [How to Build Semantic Search with Embeddings](/how-to-build-semantic-search-with-embeddings/)
- [How to Build AI Documentation Chatbots](/how-to-build-ai-documentation-chatbots-2026/)
- [How to Build AI-Powered CLI Tools](/how-to-build-ai-powered-cli-tools-2026/)
- [How to Build AI-Powered Code Formatters](/build-ai-powered-code-formatters/)

---

Related Articles

- [How to Build an AI-Powered Code Linter](/how-to-build-ai-powered-code-linter/)
- [How to Use AI Codebase Search to Find Relevant Code Before](/how-to-use-ai-codebase-search-to-find-relevant-code-before-g/)
- [How to Structure Prompts for AI to Generate Idiomatic Code](/how-to-structure-prompts-for-ai-to-generate-idiomatic-code-i/)
- [Claude Code vs ChatGPT Code Interpreter Comparison](/claude-code-vs-chatgpt-code-interpreter-comparison/)
- [Best AI Tool for Software Engineers Code Review 2026](/best-ai-tool-for-software-engineers-code-review-2026/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
