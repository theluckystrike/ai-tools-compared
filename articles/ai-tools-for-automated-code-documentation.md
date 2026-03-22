---
layout: default
title: "AI Tools for Automated Code Documentation"
description: "Compare Claude, GPT-4, and open-source tools for auto-generating code documentation — docstrings, API references, architecture docs, and inline comments"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-automated-code-documentation
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Code documentation has two failure modes: missing entirely, or present but wrong. AI tools solve the first problem well and are getting better at the second. This guide covers practical workflows for generating docstrings, API references, and architecture documentation at scale.

## Key Takeaways

- **AI tools solve the**: first problem well and are getting better at the second.
- **Topics covered**: approach 1: batch docstring generation, approach 2: architecture documentation from code, approach 3: api reference generation with mkdocs
- **Practical guidance included**: Step-by-step setup and configuration instructions
- **Use-case recommendations**: Specific guidance based on team size and requirements

## Approach 1: Batch Docstring Generation

The highest-ROI use case is adding docstrings to existing functions that have none. This script processes an entire module:

```python
# docstring_generator.py
import ast
import os
from pathlib import Path
from anthropic import Anthropic

client = Anthropic()

def find_undocumented_functions(source: str) -> list[dict]:
    """Find functions and methods that lack docstrings."""
    tree = ast.parse(source)
    source_lines = source.split("\n")
    undocumented = []

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        # Check if first statement is a docstring
        has_docstring = (
            node.body and
            isinstance(node.body[0], ast.Expr) and
            isinstance(node.body[0].value, ast.Constant) and
            isinstance(node.body[0].value.value, str)
        )

        if not has_docstring:
            func_source = "\n".join(
                source_lines[node.lineno - 1:node.end_lineno]
            )
            undocumented.append({
                "name": node.name,
                "lineno": node.lineno,
                "source": func_source,
                "is_async": isinstance(node, ast.AsyncFunctionDef)
            })

    return undocumented

def generate_docstring(func_info: dict, style: str = "google") -> str:
    """Generate a docstring for a function using Claude."""
    style_example = {
        "google": """Args:
            param (type): description

        Returns:
            type: description

        Raises:
            ErrorType: when condition""",
        "numpy": """Parameters
        ----------
        param : type
            description

        Returns
        -------
        type
            description""",
        "sphinx": """:param name: description
        :type name: type
        :returns: description
        :rtype: type"""
    }.get(style, "")

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": f"""Write a {style} style docstring for this Python function.

Rules:
- First line: concise summary (under 72 chars)
- Document all parameters with types (infer from annotations/usage)
- Document return value
- Document exceptions that can be raised
- Note any important side effects
- Do NOT describe the implementation — describe the contract

Return only the docstring content (without triple quotes), no explanation.

Function:
{func_info['source']}"""
        }]
    )

    return response.content[0].text.strip()

def add_docstrings_to_file(
    filepath: str,
    style: str = "google",
    dry_run: bool = True
) -> dict:
    """Add docstrings to all undocumented functions in a file."""
    source = Path(filepath).read_text()
    undocumented = find_undocumented_functions(source)

    if not undocumented:
        return {"file": filepath, "added": 0, "functions": []}

    additions = []
    for func in undocumented:
        docstring = generate_docstring(func, style)
        additions.append({
            "function": func["name"],
            "line": func["lineno"],
            "docstring": docstring
        })

    if not dry_run:
        # Insert docstrings into source (reverse order to preserve line numbers)
        lines = source.split("\n")
        for addition in sorted(additions, key=lambda x: x["line"], reverse=True):
            # Find the function def line and insert after it
            func_line_idx = addition["line"] - 1
            # Find indent of function body
            body_line = lines[func_line_idx + 1] if func_line_idx + 1 < len(lines) else ""
            indent = len(body_line) - len(body_line.lstrip())
            indent_str = " " * indent

            docstring_lines = [f'{indent_str}"""'] + \
                [f'{indent_str}{line}' for line in addition["docstring"].split("\n")] + \
                [f'{indent_str}"""', ""]

            # Insert after function signature
            insert_pos = func_line_idx + 1
            lines[insert_pos:insert_pos] = docstring_lines

        Path(filepath).write_text("\n".join(lines))

    return {"file": filepath, "added": len(additions), "functions": additions}

# Process entire module
def document_module(module_path: str, style: str = "google"):
    for py_file in Path(module_path).rglob("*.py"):
        if "test_" in py_file.name or "__pycache__" in str(py_file):
            continue
        result = add_docstrings_to_file(str(py_file), style, dry_run=False)
        if result["added"] > 0:
            print(f"Added {result['added']} docstrings to {py_file.name}")
```

## Approach 2: Architecture Documentation from Code

```python
def generate_architecture_doc(repo_path: str) -> str:
    """Generate architecture documentation by analyzing the codebase structure."""
    # Gather structure
    structure = {}
    for py_file in Path(repo_path).rglob("*.py"):
        if "__pycache__" in str(py_file):
            continue
        rel_path = py_file.relative_to(repo_path)
        try:
            source = py_file.read_text()
            tree = ast.parse(source)
            classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
            functions = [n.name for n in ast.walk(tree)
                        if isinstance(n, ast.FunctionDef) and n.col_offset == 0]
            structure[str(rel_path)] = {
                "classes": classes,
                "top_level_functions": functions[:5]
            }
        except Exception:
            pass

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Generate architecture documentation for this Python codebase.

File structure with classes and functions:
{json.dumps(structure, indent=2)[:5000]}

Write documentation covering:
1. **Overview**: What does this codebase do? (infer from names)
2. **Module Structure**: Purpose of each module/package
3. **Key Components**: Most important classes and their responsibilities
4. **Data Flow**: How data moves through the system (infer from module names)
5. **External Dependencies**: Any obvious external integrations

Format as markdown. Be concise — one paragraph per major component."""
        }]
    )
    return response.content[0].text

# Save to docs/
Path("docs/architecture.md").write_text(
    generate_architecture_doc("src/")
)
```

## Approach 3: API Reference Generation with MkDocs

```python
# generate_api_docs.py
def generate_mkdocs_page(module_path: str) -> str:
    """Generate a MkDocs-compatible markdown page for a Python module."""
    source = Path(module_path).read_text()
    module_name = Path(module_path).stem

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": f"""Generate MkDocs-compatible API documentation for this Python module.

Module: {module_name}

Format:
- Module-level description
- For each public class:
  - Class description
  - Constructor parameters table
  - Methods with parameters, return types, and brief descriptions
  - Code example
- For each public function:
  - Function signature
  - Description
  - Parameters table (Name | Type | Required | Description)
  - Returns section
  - Example usage

Use code blocks for examples. Mark internal methods (starting with _) as private.

Source:
{source[:6000]}"""
        }]
    )
    return response.content[0].text

# GitHub Action to regenerate on push
```

```yaml
# .github/workflows/docs.yml
name: Update API Docs

on:
  push:
    branches: [main]
    paths:
      - 'src/**/*.py'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate API docs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          pip install anthropic mkdocs mkdocs-material
          python scripts/generate_api_docs.py
          mkdocs build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site
```

## Approach 4: Inline Comment Quality Review

AI can also review existing documentation for accuracy:

```python
def review_documentation_accuracy(source_code: str) -> list[dict]:
    """Identify documentation that may be inaccurate or outdated."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""Review the documentation in this code for accuracy.

Look for:
1. Docstrings that don't match the function signature (wrong params, types)
2. Comments that describe what the code does but are no longer accurate
3. TODO comments that reference tickets or issues
4. Docstrings promising behavior the code doesn't implement

For each issue found:
FILE_LINE: approximate line number
ISSUE_TYPE: [wrong_params / outdated_behavior / missing_docs / todo_comment]
DESCRIPTION: What's wrong
SUGGESTION: How to fix

Source:
{source_code[:6000]}"""
        }]
    )
    return response.content[0].text

# Run on every PR as a documentation quality gate
```

## Tool Comparison

| Tool | Docstrings | API Ref | Architecture Docs | Accuracy Review |
|---|---|---|---|---|
| Claude (API) | Excellent, infers types | Full markdown | Yes | Yes |
| GPT-4 (API) | Good | Good | Basic | Partial |
| Sphinx autodoc | From existing docstrings | HTML output | No | No |
| pydoc-markdown | From existing docstrings | Markdown | No | No |
| Copilot (inline) | In-editor only | No batch | No | No |

The AI-based approaches (Claude and GPT-4) are the only ones that generate documentation where none exists. Tools like Sphinx require docstrings to already be present.

## Related Reading

- [AI Tools for Automated Code Documentation Generation](/ai-tools-compared/ai-tools-for-automated-code-documentation-generation-2026/)
- [Claude vs GPT-4 for Writing Documentation](/ai-tools-compared/claude-vs-gpt4-for-writing-documentation/)
- [AI Tools for Automated PR Description Generation](/ai-tools-compared/ai-tools-for-automated-pr-description-generation/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
