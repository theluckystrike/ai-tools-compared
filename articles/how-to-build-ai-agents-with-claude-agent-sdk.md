---
layout: default
title: "How to Build AI Agents with Claude Agent SDK"
description: "Step-by-step guide to building production AI agents using the Claude Agent SDK, covering tool use, multi-turn loops, and real deployment patterns"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-ai-agents-with-claude-agent-sdk/
categories: [guides]
tags: [ai-tools-compared, artificial-intelligence, claude-ai, sdk]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

The Claude Agent SDK gives you a structured way to build agents that call tools, maintain conversation state, and hand off between sub-agents. Unlike raw API calls, the SDK handles the agentic loop — the back-and-forth between model responses and tool execution — so your code focuses on what the agent should do, not how to manage message history.

This guide walks through installation, a basic single-agent setup, tool definitions, multi-turn loops, and a realistic deployment pattern using sub-agents.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Install ation and Project Setup

```bash
pip install anthropic
# or with extras for async support
pip install "anthropic[async]"
```

Create a project layout:

```
my-agent/
├── agent.py
├── tools.py
├── main.py
└── .env
```

Set your API key in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 2: Defining Tools

The SDK uses JSON Schema to describe tools. Each tool needs a `name`, `description`, and `input_schema`. Precise descriptions matter more than you might expect — the model reads them to decide when to call the tool.

```python
# tools.py
import subprocess
import json

TOOLS = [
    {
        "name": "run_shell",
        "description": (
            "Run a shell command and return stdout + stderr. "
            "Use for file operations, git commands, and inspecting system state. "
            "Do not use for long-running processes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to execute"
                },
                "cwd": {
                    "type": "string",
                    "description": "Working directory for the command (optional)"
                }
            },
            "required": ["command"]
        }
    },
    {
        "name": "read_file",
        "description": "Read the contents of a file at the given path.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Absolute or relative file path"
                }
            },
            "required": ["path"]
        }
    }
]

def run_shell(command: str, cwd: str = None) -> str:
    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
        cwd=cwd
    )
    output = result.stdout
    if result.returncode != 0:
        output += f"\nSTDERR: {result.stderr}"
    return output or "(no output)"

def read_file(path: str) -> str:
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        return f"ERROR: file not found: {path}"
    except Exception as e:
        return f"ERROR: {e}"

def dispatch_tool(name: str, inputs: dict) -> str:
    if name == "run_shell":
        return run_shell(**inputs)
    elif name == "read_file":
        return read_file(**inputs)
    else:
        return f"ERROR: unknown tool {name}"
```

### Step 3: The Agentic Loop

The core pattern is a while loop that sends messages, checks for tool calls in the response, executes them, appends results, and repeats until the model returns a final text response with no pending tool calls.

```python
# agent.py
import anthropic
from tools import TOOLS, dispatch_tool

client = anthropic.Anthropic()

SYSTEM = """You are a senior software engineer. You have access to shell commands
and file reading tools. Be direct and efficient. When you're done, summarize
what you did in 2-3 sentences."""

def run_agent(task: str, max_turns: int = 20) -> str:
    messages = [{"role": "user", "content": task}]
    turn = 0

    while turn < max_turns:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=SYSTEM,
            tools=TOOLS,
            messages=messages
        )

        # Append assistant response to history
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            # Extract the final text block
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text
            return "(no text in final response)"

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = dispatch_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            messages.append({"role": "user", "content": tool_results})
            turn += 1
        else:
            break

    return f"Agent stopped after {max_turns} turns without completing."
```

### Step 4: Run the Agent

```python
# main.py
import os
from dotenv import load_dotenv
from agent import run_agent

load_dotenv()

task = """
Check the current directory structure, then read the file named 'config.json'
if it exists. Tell me what environment the app is configured for and whether
the debug flag is enabled.
"""

result = run_agent(task)
print(result)
```

Run it:

```bash
python main.py
```

### Step 5: Adding a Sub-Agent Pattern

For complex tasks, split work across specialized sub-agents. A coordinator agent decomposes the goal and spawns sub-agents with narrower scopes.

```python
# coordinator.py
import anthropic
from tools import TOOLS, dispatch_tool

client = anthropic.Anthropic()

def run_sub_agent(task: str, system: str, tools: list, max_turns: int = 10) -> str:
    """Generic sub-agent runner with its own isolated context."""
    messages = [{"role": "user", "content": task}]
    turn = 0

    while turn < max_turns:
        response = client.messages.create(
            model="claude-sonnet-4-6",  # cheaper model for sub-tasks
            max_tokens=2048,
            system=system,
            tools=tools,
            messages=messages
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text
            return ""

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = dispatch_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })
            messages.append({"role": "user", "content": tool_results})
            turn += 1

    return f"Sub-agent timed out after {max_turns} turns."


def coordinate(goal: str) -> str:
    """
    Coordinator uses Opus to plan; sub-agents use Sonnet to execute.
    Results are collected and summarized.
    """
    # Step 1: coordinator plans
    planner = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system="You are a task planner. Break the goal into 2-3 discrete sub-tasks. Return JSON: {\"tasks\": [\"task1\", \"task2\"]}",
        messages=[{"role": "user", "content": goal}]
    )
    import json
    plan_text = planner.content[0].text
    try:
        plan = json.loads(plan_text)
        sub_tasks = plan["tasks"]
    except Exception:
        sub_tasks = [goal]

    # Step 2: run each sub-task
    results = []
    sub_system = "You are a specialized executor. Complete the task using available tools."
    for sub_task in sub_tasks:
        result = run_sub_agent(sub_task, sub_system, TOOLS)
        results.append(f"Task: {sub_task}\nResult: {result}")

    # Step 3: synthesize
    synthesis = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system="Synthesize these sub-agent results into a coherent summary.",
        messages=[{"role": "user", "content": "\n\n".join(results)}]
    )
    return synthesis.content[0].text
```

### Step 6: Streaming Responses

For user-facing agents, stream output so users see progress in real time:

```python
def run_agent_streaming(task: str):
    messages = [{"role": "user", "content": task}]

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=SYSTEM,
        tools=TOOLS,
        messages=messages
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)

    # Note: streaming doesn't directly return tool_use blocks mid-stream.
    # For agentic loops with streaming, collect the final message then
    # handle tool calls from stream.get_final_message().
    final = stream.get_final_message()
    return final
```

### Step 7: Error Handling and Retries

Production agents need retry logic around API calls and tool failures:

```python
import time
from anthropic import RateLimitError, APIStatusError

def safe_api_call(fn, retries=3, backoff=2.0):
    for attempt in range(retries):
        try:
            return fn()
        except RateLimitError:
            if attempt < retries - 1:
                time.sleep(backoff * (2 ** attempt))
            else:
                raise
        except APIStatusError as e:
            if e.status_code >= 500 and attempt < retries - 1:
                time.sleep(backoff)
            else:
                raise
```

Wrap your `client.messages.create(...)` calls inside `safe_api_call(lambda: ...)`.

### Step 8: Token Budget Management

Long agentic loops accumulate tokens fast. Track usage and bail out before hitting limits:

```python
MAX_INPUT_TOKENS = 150_000  # leave headroom under 200k context

total_input = 0

# Inside the loop, after each response:
total_input += response.usage.input_tokens
if total_input > MAX_INPUT_TOKENS:
    return "Agent terminated: approaching context limit. Partial result: ..."
```

### Step 9: Deploy as a FastAPI Service

```python
# server.py
from fastapi import FastAPI
from pydantic import BaseModel
from agent import run_agent

app = FastAPI()

class AgentRequest(BaseModel):
    task: str
    max_turns: int = 20

@app.post("/run")
def run(req: AgentRequest):
    result = run_agent(req.task, req.max_turns)
    return {"result": result}
```

Run with:

```bash
uvicorn server:app --host 0.0.0.0 --port 8080
```

Call it:

```bash
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -d '{"task": "List the 5 largest files in /tmp"}'
```

### Step 10: Key Decisions When Building Agents

**Model selection**: Use Opus for planning and final synthesis; use Sonnet for sub-task execution. This cuts costs by 4-5x on long pipelines without meaningful quality loss on well-scoped tasks.

**Tool granularity**: Prefer fewer, broader tools over many narrow ones. A single `run_shell` tool beats 10 separate tools for ls, cat, git, etc. The model composes commands naturally.

**System prompt length**: Keep system prompts under 500 words. Long prompts dilute attention and slow the model's tool-use decisions. Put task-specific context in the user message instead.

**Max turns**: Set it low in development (5-8) to catch infinite loops early. Raise it only after validating the agent completes typical tasks within budget.

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Related Articles

- [How to Build Custom MCP Servers for Claude](/how-to-build-custom-mcp-servers-for-claude)
- [Claude Code SDK Testing Workflow Guide](/claude-code-sdk-testing-workflow-guide/)
- [Claude Code API Client TypeScript Guide: Build Type-Safe](/claude-code-api-client-typescript-guide/)
- [How to Use the Claude API for Automated Code Review](/how-to-use-claude-api-for-automated-code-review/)
- [Best AI Tools for Support Agent Assist](/best-ai-tools-for-support-agent-assist/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)

## Frequently Asked Questions

**How long does it take to build ai agents with claude agent sdk?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Will this work with my existing CI/CD pipeline?**

The core concepts apply across most CI/CD platforms, though specific syntax and configuration differ. You may need to adapt file paths, environment variable names, and trigger conditions to match your pipeline tool. The underlying workflow logic stays the same.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.
{% endraw %}
