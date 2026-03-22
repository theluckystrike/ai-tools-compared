---
layout: default
title: "How to Build AI-Powered CLI Tools 2026"
description: "Build CLI tools with embedded AI using Python, Claude API, and Click — streaming output, tool use, context management, and packaging as a standalone binary"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-ai-powered-cli-tools-2026/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

# How to Build AI-Powered CLI Tools 2026

AI-powered CLI tools are useful for developer workflows: generating code from specs, summarizing logs, reviewing diffs, or automating repetitive tasks. This guide covers building a production-quality AI CLI with Python, Click, and the Anthropic SDK.

## Project Structure

```
ai-cli/
├── src/
│   └── aicli/
│       ├── __init__.py
│       ├── cli.py          # Click commands
│       ├── client.py       # Anthropic client wrapper
│       ├── tools.py        # Tool definitions for function calling
│       └── context.py      # Conversation history management
├── pyproject.toml
└── tests/
```

## The Core Client

```python
# src/aicli/client.py
import os
import sys
from typing import Iterator
import anthropic

class AIClient:
    def __init__(self, model: str = "claude-opus-4-6"):
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.model = model
        self.max_tokens = 4096

    def stream_response(
        self,
        prompt: str,
        system: str = "",
        history: list[dict] | None = None,
    ) -> Iterator[str]:
        """Stream a response token by token."""
        messages = list(history or [])
        messages.append({"role": "user", "content": prompt})

        with self.client.messages.stream(
            model=self.model,
            max_tokens=self.max_tokens,
            system=system,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield text

    def complete(
        self,
        prompt: str,
        system: str = "",
        history: list[dict] | None = None,
    ) -> str:
        """Non-streaming complete — returns full response."""
        messages = list(history or [])
        messages.append({"role": "user", "content": prompt})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=system,
            messages=messages,
        )
        return response.content[0].text
```

## Streaming CLI Output

```python
# src/aicli/cli.py
import sys
import click
from pathlib import Path
from rich.console import Console
from rich.markdown import Markdown
from rich.live import Live
from .client import AIClient
from .context import ConversationContext

console = Console()
client = AIClient()

@click.group()
@click.version_option()
def cli():
    """AI-powered developer CLI tool."""
    pass

@cli.command()
@click.argument("prompt")
@click.option("--file", "-f", type=click.Path(exists=True),
              help="Include file content as context")
@click.option("--markdown/--no-markdown", default=True,
              help="Render output as markdown")
@click.option("--model", "-m", default="claude-opus-4-6",
              help="Model to use")
def ask(prompt: str, file: str | None, markdown: bool, model: str):
    """Ask a one-shot question."""
    context = ""
    if file:
        path = Path(file)
        content = path.read_text()
        context = f"\n\nFile: {path.name}\n```\n{content}\n```"

    full_prompt = prompt + context
    client.model = model

    if markdown:
        accumulated = ""
        with Live(console=console, refresh_per_second=15) as live:
            for chunk in client.stream_response(full_prompt):
                accumulated += chunk
                live.update(Markdown(accumulated))
    else:
        for chunk in client.stream_response(full_prompt):
            print(chunk, end="", flush=True)
        print()

@cli.command()
@click.argument("file", type=click.Path(exists=True))
def review(file: str):
    """Review a code file for issues."""
    path = Path(file)
    content = path.read_text()
    ext = path.suffix.lstrip(".")

    system = (
        "You are a senior engineer doing a code review. "
        "Be specific and actionable. Point out bugs, security issues, "
        "and style problems. No praise."
    )
    prompt = f"Review this {ext} code:\n\n```{ext}\n{content}\n```"

    accumulated = ""
    with Live(console=console, refresh_per_second=15) as live:
        for chunk in client.stream_response(prompt, system=system):
            accumulated += chunk
            live.update(Markdown(accumulated))

@cli.command()
@click.argument("prompt")
@click.option("--output", "-o", type=click.Path(),
              help="Write output to file")
@click.option("--lang", "-l", default="python",
              help="Programming language")
def generate(prompt: str, output: str | None, lang: str):
    """Generate code from a description."""
    system = (
        f"Generate {lang} code. Return only the code block, no explanation. "
        "Include all necessary imports."
    )

    result = client.complete(prompt, system=system)

    # Extract code from markdown code block if present
    if "```" in result:
        lines = result.split("\n")
        in_block = False
        code_lines = []
        for line in lines:
            if line.startswith("```") and not in_block:
                in_block = True
                continue
            elif line.startswith("```") and in_block:
                break
            elif in_block:
                code_lines.append(line)
        result = "\n".join(code_lines)

    if output:
        Path(output).write_text(result)
        console.print(f"[green]Written to {output}[/green]")
    else:
        console.print(Markdown(f"```{lang}\n{result}\n```"))
```

## Conversation Context Management

For multi-turn conversations, you need to manage history without exceeding the context window:

```python
# src/aicli/context.py
import json
from pathlib import Path
from dataclasses import dataclass, asdict, field

@dataclass
class ConversationContext:
    history: list[dict] = field(default_factory=list)
    max_turns: int = 20

    def add_turn(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        # Keep last N turns to avoid token overflow
        if len(self.history) > self.max_turns * 2:
            # Always keep system context if present; trim oldest turns
            self.history = self.history[-(self.max_turns * 2):]

    def save(self, path: Path):
        path.write_text(json.dumps(self.history, indent=2))

    @classmethod
    def load(cls, path: Path) -> "ConversationContext":
        if not path.exists():
            return cls()
        data = json.loads(path.read_text())
        return cls(history=data)

    def clear(self):
        self.history.clear()


@cli.command()
@click.option("--session", "-s", default=".aicli-session.json",
              help="Session file for conversation history")
def chat(session: str):
    """Interactive multi-turn chat with history."""
    session_path = Path(session)
    ctx = ConversationContext.load(session_path)

    console.print("[bold blue]AI Chat[/bold blue] (Ctrl+C to exit, /clear to reset)\n")

    system = "You are a helpful developer assistant. Be concise and practical."

    try:
        while True:
            prompt = console.input("[bold green]You:[/bold green] ").strip()
            if not prompt:
                continue
            if prompt == "/clear":
                ctx.clear()
                console.print("[yellow]Context cleared[/yellow]")
                continue

            console.print("[bold blue]AI:[/bold blue] ", end="")
            accumulated = ""
            for chunk in client.stream_response(prompt, system=system,
                                                history=ctx.history):
                print(chunk, end="", flush=True)
                accumulated += chunk

            print()
            ctx.add_turn("user", prompt)
            ctx.add_turn("assistant", accumulated)
            ctx.save(session_path)

    except KeyboardInterrupt:
        console.print("\n[yellow]Bye[/yellow]")
```

## Packaging as a Binary

```toml
# pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "aicli"
version = "0.1.0"
dependencies = [
    "anthropic>=0.40.0",
    "click>=8.1",
    "rich>=13.0",
]

[project.scripts]
aicli = "aicli.cli:cli"
```

Install globally with `pipx install .` for an isolated binary available as `aicli` in PATH. Use `pyinstaller` to build a self-contained binary with no Python dependency.

## Distribution via Homebrew

```ruby
# Formula/aicli.rb
class Aicli < Formula
  include Language::Python::Virtualenv

  desc "AI-powered developer CLI"
  homepage "https://github.com/example/aicli"
  url "https://github.com/example/aicli/archive/v0.1.0.tar.gz"

  resource "anthropic" do
    url "https://files.pythonhosted.org/packages/anthropic-0.40.0.tar.gz"
  end

  def install
    virtualenv_install_with_resources
  end
end
```

## Related Reading

- [Best AI Tools for Go CLI Tool Development](/ai-tools-compared/best-ai-tools-for-go-cli-tool-development-with-cobra-viper-2/)
- [How to Build AI-Powered Code Search](/ai-tools-compared/how-to-build-ai-powered-code-search-2026/)
- [How to Build AI-Powered Error Classifiers](/ai-tools-compared/how-to-build-ai-powered-error-classifiers-2026/)

- [How to Build an AI-Powered Code Linter](/ai-tools-compared/how-to-build-ai-powered-code-linter/)
---

## Related Articles

- [Best AI Tools for Generating OpenAPI Specs](/ai-tools-compared/best-ai-tools-for-generating-openapi-specs/)
- [AI-Powered API Gateway Configuration Tools 2026](/ai-tools-compared/ai-powered-api-gateway-configuration-tools-2026/)
- [AI Tools for Writing pytest Tests for Click or Typer CLI](/ai-tools-compared/ai-tools-for-writing-pytest-tests-for-click-or-typer-cli-com/)
- [How to Create Custom System Prompt for ChatGPT API That](/ai-tools-compared/how-to-create-custom-system-prompt-for-chatgpt-api-that-enfo/)
- [AI Tools for Creating System Context Diagrams Using C4](/ai-tools-compared/ai-tools-for-creating-system-context-diagrams-using-c4-model/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
