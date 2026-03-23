---
layout: default
title: "How to Build Custom AI Dev Tools with LangGraph"
description: "Build stateful AI developer tools using LangGraph: code agents, multi-step debuggers, and review pipelines with real Python examples and graph architecture"
date: 2026-03-21
author: theluckystrike
permalink: /how-to-build-ai-dev-tools-with-langgraph/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---
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

LangGraph lets you build AI workflows that maintain state across multiple steps, loop until conditions are met, and route to different agents based on intermediate results. For developer tools, this means you can build a code agent that writes code, runs tests, reads the failure output, fixes the code, and loops until tests pass. without hardcoding the number of steps.

Key Takeaways

- Use simple LLM calls: for one-shot tasks or when latency is critical (graph overhead adds ~50ms).
- Use streaming for long: tasks. LangGraph supports streaming intermediate state.
- Will this work with: my existing CI/CD pipeline? The core concepts apply across most CI/CD platforms, though specific syntax and configuration differ.
- Use simpler tools for: linear agent chains or one-shot tasks.
- Monitor token usage per: node. Track which nodes consume the most tokens and optimize their prompts.
- What are the most: common mistakes to avoid? The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully.

Why LangGraph for Dev Tools

Simple LLM calls work for one-shot tasks. Multi-step developer workflows need:
- State persistence: remember what files were modified, what errors occurred
- Conditional branching: route to a fixer if tests fail, to a reviewer if they pass
- Loops with exit conditions: retry until tests pass or after N attempts
- Tool calling with tracking: know which tools were called and what they returned

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1: Install ation

```bash
pip install langgraph langchain-anthropic langchain-core
```

Step 2: Example: Test-Driven Code Agent

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

Build the graph
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

Step 3: Example: Multi-Stage Code Review Pipeline

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

Step 4: Persisting State Between Runs

LangGraph supports checkpointing to resume long-running agent tasks:

```python
from langgraph.checkpoint.sqlite import SqliteSaver

checkpointer = SqliteSaver.from_conn_string("agent_state.db")
graph = builder.compile(checkpointer=checkpointer)

config = {"configurable": {"thread_id": "pr-review-1234"}}
result = graph.invoke(initial_state, config=config)

Resume from where it stopped
graph.invoke(None, config=config)
```

This is useful for long-running tasks like refactoring an entire repository. you can pause, inspect the state, and resume without starting over.

When to Use LangGraph vs Simple Prompts

Use LangGraph when your workflow has more than 2 sequential LLM calls, conditional branching, retry loops, or multiple specialized agents. Use simple LLM calls for one-shot tasks or when latency is critical (graph overhead adds ~50ms).

Step 5: Error Handling and Observability

Production LangGraph workflows need proper error handling and logging:

```python
import logging

logger = logging.getLogger('langgraph_agent')

def safe_node(func):
    def wrapper(state):
        try:
            result = func(state)
            logger.info(f"Node {func.__name__} completed", extra={
                'node': func.__name__,
                'iteration': state.get('iterations', 0)
            })
            return result
        except Exception as e:
            logger.error(f"Node {func.__name__} failed: {e}", exc_info=True)
            return {'status': 'failed', 'error': str(e)}
    return wrapper
```

LangGraph vs Alternatives Comparison

| Feature | LangGraph | CrewAI | AutoGen | Custom Code |
|---------|-----------|--------|---------|-------------|
| State management | Built-in | Limited | Session-based | Manual |
| Conditional routing | Native | Agent delegation | Conversation flow | If/else |
| Checkpointing | SQLite, Postgres | None | None | Manual |
| Parallel execution | Graph edges | Sequential | Round-robin | asyncio |
| Learning curve | Moderate | Low | Low | Depends |
| Debugging | LangSmith integration | Print statements | Logging | Custom |

Choose LangGraph when your workflow needs state persistence, conditional branching, or retry loops. Use simpler tools for linear agent chains or one-shot tasks.

Production Deployment Tips

1. Set hard iteration limits. Always cap the number of retry loops to prevent runaway costs.
2. Cache LLM responses. If the same code appears in multiple runs, cache the AI output by content hash.
3. Use streaming for long tasks. LangGraph supports streaming intermediate state.
4. Monitor token usage per node. Track which nodes consume the most tokens and optimize their prompts.
5. Test with deterministic mocks. Replace LLM calls with recorded responses during unit testing.

Step 6: Example: Automated Documentation Generator

Build a graph that reads source code, generates documentation, validates it against the code, and iterates:

```python
from typing import TypedDict, List
from langgraph.graph import StateGraph, END

class DocGenState(TypedDict):
    source_files: List[str]
    current_file: str
    generated_docs: str
    validation_errors: List[str]
    iteration: int

def read_source(state: DocGenState) -> dict:
    with open(state['current_file']) as f:
        code = f.read()
    response = model.invoke([HumanMessage(
        content=f"Generate detailed docstrings for all functions. "
                f"Include parameters, return types, and usage examples.\n\n{code}"
    )])
    return {'generated_docs': response.content}

def validate_docs(state: DocGenState) -> dict:
    response = model.invoke([HumanMessage(
        content=f"Validate these docs against the source code. "
                f"List any inaccuracies or missing parameters.\n\n"
                f"Source:\n{open(state['current_file']).read()}\n\n"
                f"Docs:\n{state['generated_docs']}"
    )])
    errors = [l for l in response.content.split('\n') if l.strip().startswith('-')]
    return {'validation_errors': errors, 'iteration': state['iteration'] + 1}

def should_retry(state: DocGenState) -> str:
    if not state['validation_errors'] or state['iteration'] >= 2:
        return 'done'
    return 'regenerate'
```

This pattern works for any task where AI output needs verification against a ground truth.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Related Reading

- [How to Build an AI-Powered Code Linter](/how-to-build-ai-powered-code-linter/)
- [How to Build an AI Code Review Bot](/how-to-build-ai-code-review-bot/)
- [Prompt Engineering Patterns for Code Generation](/prompt-engineering-patterns-for-code-generation/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

Frequently Asked Questions

How long does it take to build custom ai dev tools with langgraph?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Will this work with my existing CI/CD pipeline?

The core concepts apply across most CI/CD platforms, though specific syntax and configuration differ. You may need to adapt file paths, environment variable names, and trigger conditions to match your pipeline tool. The underlying workflow logic stays the same.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

{% endraw %}
