---
layout: default
title: "How to Build Custom AI Dev Tools with LangGraph"
description: "Build stateful AI developer tools using LangGraph: code agents, multi-step debuggers, and review pipelines with real Python examples and graph architecture"
date: 2026-03-21
author: theluckystrike
permalink: /how-to-build-ai-dev-tools-with-langgraph/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

LangGraph lets you build AI workflows that maintain state across multiple steps, loop until conditions are met, and route to different agents based on intermediate results. For developer tools, this means you can build a code agent that writes code, runs tests, reads the failure output, fixes the code, and loops until tests pass — without hardcoding the number of steps.

## Why LangGraph for Dev Tools

Simple LLM calls work for one-shot tasks. Multi-step developer workflows need:
- **State persistence**: remember what files were modified, what errors occurred
- **Conditional branching**: route to a fixer if tests fail, to a reviewer if they pass
- **Loops with exit conditions**: retry until tests pass or after N attempts
- **Tool calling with tracking**: know which tools were called and what they returned

## Installation

```bash
pip install langgraph langchain-anthropic langchain-core
```

## Example: Test-Driven Code Agent

This agent writes code to pass a test suite, runs the tests, reads failures, and iterates:

```python
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
import subprocess

class CodeAgentState(TypedDict):
    task: str
    test_file: str
    code_file: str
    current_code: str
    test_output: str
    iterations: int
    max_iterations: int
    messages: List
    status: str  # 'writing' | 'testing' | 'fixing' | 'done' | 'failed'

model = ChatAnthropic(model="claude-sonnet-4-5")

def write_initial_code(state: CodeAgentState) -> dict:
    test_content = open(state['test_file']).read()
    response = model.invoke([
        HumanMessage(content=f"""Write Python code to pass these tests.
Task: {state['task']}
Tests:
```python
{test_content}
```
Return only the implementation code, no tests, no explanation.""")
    ])

    code = response.content
    if '```python' in code:
        code = code.split('```python')[1].split('```')[0].strip()

    with open(state['code_file'], 'w') as f:
        f.write(code)

    return {'current_code': code, 'status': 'testing', 'iterations': 0, 'messages': state['messages'] + [response]}

def run_tests(state: CodeAgentState) -> dict:
    result = subprocess.run(
        ['python', '-m', 'pytest', state['test_file'], '-v', '--tb=short'],
        capture_output=True, text=True
    )
    return {
        'test_output': result.stdout + result.stderr,
        'status': 'done' if result.returncode == 0 else 'fixing'
    }

def fix_code(state: CodeAgentState) -> dict:
    response = model.invoke([
        HumanMessage(content=f"""Fix this Python code to pass the failing tests.

Current implementation:
```python
{state['current_code']}
```

Test failure output:
```
{state['test_output']}
```
Return only the corrected implementation code.""")
    ])

    code = response.content
    if '```python' in code:
        code = code.split('```python')[1].split('```')[0].strip()

    with open(state['code_file'], 'w') as f:
        f.write(code)

    return {
        'current_code': code,
        'status': 'testing',
        'iterations': state['iterations'] + 1,
        'messages': state['messages'] + [response]
    }

def should_continue(state: CodeAgentState) -> str:
    if state['status'] == 'done':
        return 'done'
    if state['status'] == 'fixing':
        if state['iterations'] >= state['max_iterations']:
            return 'failed'
        return 'fix'
    return 'test'

# Build the graph
builder = StateGraph(CodeAgentState)
builder.add_node('write', write_initial_code)
builder.add_node('test', run_tests)
builder.add_node('fix', fix_code)

builder.set_entry_point('write')
builder.add_edge('write', 'test')
builder.add_conditional_edges('test', should_continue, {'done': END, 'fix': 'fix', 'failed': END})
builder.add_edge('fix', 'test')

graph = builder.compile()

result = graph.invoke({
    'task': 'Implement a binary search function that handles edge cases',
    'test_file': 'tests/test_binary_search.py',
    'code_file': 'src/binary_search.py',
    'current_code': '', 'test_output': '',
    'iterations': 0, 'max_iterations': 3,
    'messages': [], 'status': 'writing'
})

print(f"Status: {result['status']}, Iterations: {result['iterations']}")
```

## Example: Multi-Stage Code Review Pipeline

Route code through different reviewers in parallel:

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, List

class ReviewState(TypedDict):
    file_path: str
    code: str
    file_type: str
    security_issues: List[str]
    performance_issues: List[str]
    final_verdict: str

def classify_file(state: ReviewState) -> dict:
    ext = state['file_path'].split('.')[-1]
    type_map = {'py': 'python', 'ts': 'typescript', 'js': 'javascript', 'go': 'go'}
    return {'file_type': type_map.get(ext, 'unknown')}

def security_review(state: ReviewState) -> dict:
    response = model.invoke([HumanMessage(
        content=f"Review this {state['file_type']} code for security issues only. "
                f"List each issue as a bullet point. If none, say 'No issues'.\n\n{state['code']}"
    )])
    issues = [l.strip() for l in response.content.split('\n') if l.strip().startswith('-')]
    return {'security_issues': issues}

def performance_review(state: ReviewState) -> dict:
    response = model.invoke([HumanMessage(
        content=f"Review this code for performance issues only.\n\n{state['code']}"
    )])
    issues = [l.strip() for l in response.content.split('\n') if l.strip().startswith('-')]
    return {'performance_issues': issues}

def synthesize_verdict(state: ReviewState) -> dict:
    all_issues = state['security_issues'] + state['performance_issues']
    if not all_issues:
        verdict = 'APPROVE: No issues found'
    elif any('critical' in i.lower() or 'injection' in i.lower() for i in state['security_issues']):
        verdict = 'BLOCK: Critical security issue requires immediate fix'
    elif len(all_issues) > 5:
        verdict = 'REQUEST_CHANGES: Multiple issues found'
    else:
        verdict = 'COMMENT: Minor issues, can merge with fixes'
    return {'final_verdict': verdict}

builder = StateGraph(ReviewState)
builder.add_node('classify', classify_file)
builder.add_node('security', security_review)
builder.add_node('performance', performance_review)
builder.add_node('verdict', synthesize_verdict)

builder.set_entry_point('classify')
builder.add_edge('classify', 'security')
builder.add_edge('classify', 'performance')
builder.add_edge('security', 'verdict')
builder.add_edge('performance', 'verdict')
builder.add_edge('verdict', END)
```

## Persisting State Between Runs

LangGraph supports checkpointing to resume long-running agent tasks:

```python
from langgraph.checkpoint.sqlite import SqliteSaver

checkpointer = SqliteSaver.from_conn_string("agent_state.db")
graph = builder.compile(checkpointer=checkpointer)

config = {"configurable": {"thread_id": "pr-review-1234"}}
result = graph.invoke(initial_state, config=config)

# Resume from where it stopped
graph.invoke(None, config=config)
```

This is useful for long-running tasks like refactoring an entire repository — you can pause, inspect the state, and resume without starting over.

## When to Use LangGraph vs Simple Prompts

Use LangGraph when your workflow has more than 2 sequential LLM calls, conditional branching, retry loops, or multiple specialized agents. Use simple LLM calls for one-shot tasks or when latency is critical (graph overhead adds ~50ms).

## Related Reading

- [How to Build an AI-Powered Code Linter](/ai-tools-compared/how-to-build-ai-powered-code-linter/)
- [How to Build an AI Code Review Bot](/ai-tools-compared/how-to-build-ai-code-review-bot/)
- [Prompt Engineering Patterns for Code Generation](/ai-tools-compared/prompt-engineering-patterns-for-code-generation/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
