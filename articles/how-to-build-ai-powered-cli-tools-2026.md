---
layout: default
title: "How to Build AI-Powered CLI Tools 2026"
description: "Build CLI tools with embedded AI using Python, Claude API, and Click. streaming output, tool use, context management, and packaging as a standalone binary"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-ai-powered-cli-tools-2026/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

AI-powered CLI tools are useful for developer workflows: generating code from specs, summarizing logs, reviewing diffs, or automating repetitive tasks. This guide covers building a production-quality AI CLI with Python, Click, and the Anthropic SDK. including streaming output, tool use, conversation context management, and packaging.

Project Structure

```
ai-cli/
 src/
    aicli/
        __init__.py
        cli.py          # Click commands
        client.py       # Anthropic client wrapper
        tools.py        # Tool definitions for function calling
        context.py      # Conversation history management
 pyproject.toml
 tests/
```

The `src` layout (as opposed to a flat layout) avoids import path issues when running tests and makes packaging with `hatchling` or `setuptools` straightforward. Keep the Anthropic client isolated in `client.py` so commands in `cli.py` stay focused on user-facing logic.

The Core Client

```python
src/aicli/client.py
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
        """Non-streaming complete. returns full response."""
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

Use `stream_response` for interactive commands where the user is watching output. Use `complete` for commands that pipe output to another tool or write to a file. streaming to a pipe is harmless but adds complexity without benefit.

Streaming CLI Output

```python
src/aicli/cli.py
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

The `--no-markdown` flag is important for commands used in shell pipelines. When the output is piped to `grep`, `jq`, or another tool, Rich markdown rendering adds ANSI escape codes that break downstream processing. Check `sys.stdout.isatty()` if you want to auto-detect pipes:

```python
Auto-detect whether to render markdown
if markdown and sys.stdout.isatty():
 # render with Rich
else:
 # plain text output
```

Conversation Context Management

For multi-turn conversations, you need to manage history without exceeding the context window:

```python
src/aicli/context.py
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

Saving history to a JSON file lets sessions persist across invocations. Store the file in a per-project location (`.aicli-session.json` in the current directory) so different projects have separate contexts, or in `~/.aicli/sessions/` with a project hash for global sessions.

Adding Tool Use (Function Calling)

Tool use lets the CLI perform actions on behalf of the model. reading files, running shell commands, or querying APIs:

```python
src/aicli/tools.py
import subprocess
from pathlib import Path

TOOLS = [
 {
 "name": "read_file",
 "description": "Read the contents of a file",
 "input_schema": {
 "type": "object",
 "properties": {
 "path": {"type": "string", "description": "File path to read"}
 },
 "required": ["path"]
 }
 },
 {
 "name": "run_command",
 "description": "Run a shell command and return stdout",
 "input_schema": {
 "type": "object",
 "properties": {
 "command": {"type": "string", "description": "Shell command to run"}
 },
 "required": ["command"]
 }
 }
]

def execute_tool(name: str, input: dict) -> str:
 if name == "read_file":
 return Path(input["path"]).read_text()
 elif name == "run_command":
 result = subprocess.run(
 input["command"], shell=True, capture_output=True, text=True, timeout=30
 )
 return result.stdout + result.stderr
 return f"Unknown tool: {name}"
```

The tool loop in `client.py` handles tool use responses:

```python
def complete_with_tools(self, prompt: str, system: str = "") -> str:
 messages = [{"role": "user", "content": prompt}]

 while True:
 response = self.client.messages.create(
 model=self.model,
 max_tokens=self.max_tokens,
 system=system,
 tools=TOOLS,
 messages=messages,
 )

 if response.stop_reason == "end_turn":
 # Extract text from response
 for block in response.content:
 if hasattr(block, "text"):
 return block.text
 return ""

 if response.stop_reason == "tool_use":
 # Add assistant response to history
 messages.append({"role": "assistant", "content": response.content})

 # Execute each tool call
 tool_results = []
 for block in response.content:
 if block.type == "tool_use":
 result = execute_tool(block.name, block.input)
 tool_results.append({
 "type": "tool_result",
 "tool_use_id": block.id,
 "content": result,
 })

 messages.append({"role": "user", "content": tool_results})
```

Tool use is powerful but adds latency. each tool call requires a round trip to the API. Use it for commands where the model needs to reason about actual file contents or command output, not for commands where you can provide the context upfront.

Packaging as a Binary

```toml
pyproject.toml
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

Install globally with `pipx install .` for an isolated binary available as `aicli` in PATH. Use `pyinstaller` to build a self-contained binary with no Python dependency:

```bash
pip install pyinstaller
pyinstaller --onefile --name aicli src/aicli/cli.py

dist/aicli. a standalone executable, no Python required
```

PyInstaller binaries are larger (30-80MB for a Python CLI with dependencies) but require no setup on target machines. For internal tools, `pipx` is simpler. For distribution to non-Python users, PyInstaller is the right choice.

Distribution via Homebrew

```ruby
Formula/aicli.rb
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

For a Homebrew tap, generate the resource hashes with `brew extract` or `poet` (a tool that generates Homebrew resource blocks from PyPI packages). Keep the formula in a `homebrew-tap` repository under your GitHub organization and users install with `brew install yourorg/tap/aicli`.

Testing AI CLI Commands

Testing CLI tools that call the Anthropic API requires mocking the client:

```python
tests/test_cli.py
import pytest
from click.testing import CliRunner
from unittest.mock import patch, MagicMock
from aicli.cli import cli

@pytest.fixture
def runner():
 return CliRunner()

def test_ask_command(runner):
 mock_stream = MagicMock()
 mock_stream.__enter__ = MagicMock(return_value=mock_stream)
 mock_stream.__exit__ = MagicMock(return_value=False)
 mock_stream.text_stream = iter(["Hello", ", ", "world!"])

 with patch("aicli.client.anthropic.Anthropic") as mock_anthropic:
 mock_anthropic.return_value.messages.stream.return_value = mock_stream
 result = runner.invoke(cli, ["ask", "test prompt", "--no-markdown"])

 assert result.exit_code == 0
 assert "Hello, world!" in result.output

def test_ask_with_file(runner, tmp_path):
 test_file = tmp_path / "test.py"
 test_file.write_text("def hello(): pass")

 with patch("aicli.client.anthropic.Anthropic") as mock_anthropic:
 mock_client = MagicMock()
 mock_anthropic.return_value = mock_client
 mock_client.messages.stream.return_value.__enter__ = MagicMock(
 return_value=MagicMock(text_stream=iter(["response"]))
 )
 mock_client.messages.stream.return_value.__exit__ = MagicMock(return_value=False)

 result = runner.invoke(cli, ["ask", "explain this", "-f", str(test_file), "--no-markdown"])

 # Verify the file content was included in the prompt
 call_args = mock_client.messages.stream.call_args
 assert "hello" in str(call_args)
```

Keep tests focused on CLI behavior (argument parsing, output format, exit codes) rather than AI response quality. Mock the Anthropic client to avoid API costs in CI and ensure deterministic test results.

Related Reading

- [Best AI Tools for Go CLI Tool Development](/best-ai-tools-for-go-cli-tool-development-with-cobra-viper-2/)
- [How to Build AI-Powered Code Search](/how-to-build-ai-powered-code-search-2026/)
- [How to Build AI-Powered Error Classifiers](/how-to-build-ai-powered-error-classifiers-2026/)
- [How to Build an AI-Powered Code Linter](/how-to-build-ai-powered-code-linter/)

Related Articles

- [Best AI Tools for Generating OpenAPI Specs](/best-ai-tools-for-generating-openapi-specs/)
- [AI-Powered API Gateway Configuration Tools 2026](/ai-powered-api-gateway-configuration-tools-2026/)
- [AI Tools for Writing pytest Tests for Click or Typer CLI](/ai-tools-for-writing-pytest-tests-for-click-or-typer-cli-com/)
- [How to Create Custom System Prompt for ChatGPT API That](/how-to-create-custom-system-prompt-for-chatgpt-api-that-enfo/)
- [AI Tools for Creating System Context Diagrams Using C4](/ai-tools-for-creating-system-context-diagrams-using-c4-model/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
