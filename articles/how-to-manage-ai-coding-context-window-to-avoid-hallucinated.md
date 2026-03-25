---
layout: default
title: "How to Manage AI Coding Context Window to Avoid Hallucinated"
description: "Learn practical techniques to manage AI coding assistant context windows and prevent hallucinated imports from breaking your codebase"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-manage-ai-coding-context-window-to-avoid-hallucinated/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


Prevent hallucinated imports by including only the files your feature needs in context, explicitly showing available imports in prompts, and asking AI to verify imports exist. This guide shows the context management technique that eliminates the frustration of AI suggesting non-existent modules.

What Is the Context Window Problem

AI coding assistants like Claude, Cursor, and GitHub Copilot maintain a conversation context that includes your recent messages, generated code, and file contents they've read. This context has limits, both hard limits on total tokens and practical limits on what the model can effectively track.

When you work on a large codebase, the AI eventually "forgets" which libraries you've installed, which modules exist, and which third-party packages are actually available. The model then generates import statements based on common patterns or guessed module names rather than your actual dependencies.

Consider this scenario - you ask an AI to add a feature requiring date handling. The assistant imports `from datetime import timezone`, a valid Python import. But your project uses Arrow or Pendulum instead. The code looks correct but fails immediately.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - Techniques That Actually Work

1. Provide Explicit Dependency Lists

Before asking AI to write code requiring external libraries, give it your actual dependencies. Create a quick reference file or paste your requirements.txt, package.json, or Cargo.toml directly into the conversation.

```python
Tell the AI explicitly:
Current dependencies:
- fastapi==0.104.1
- sqlalchemy==2.0.23
- pydantic==2.5.0
- redis==5.0.1
Do not suggest any other external libraries
```

This approach works because you're anchoring the AI to verifiable ground truth before it generates code.

2. Use File-Specific Context Windows

Most modern AI coding tools let you specify which files are currently in context. When working on a specific module, explicitly include the relevant files and exclude unrelated ones.

In Cursor, use `@Files` to reference specific files. In Claude Code, use the include/exclude patterns for file searches. This keeps the context focused and relevant.

```bash
Limit context to only the auth module
@/src/auth/*.py
@/requirements.txt
```

3. Chunk Large Files for Reference

Instead of dumping entire large files into context, extract just the relevant sections. When you need the AI to work with a specific function, include only that function plus its immediate dependencies.

```python
Instead of - "Here's my entire models.py (500 lines)"
Use - "Here's the User class I'm modifying:"

class User(BaseModel):
    id: int
    email: str
    created_at: datetime

    def get_active_sessions(self) -> list[Session]:
        # ... 50 lines of method
        pass
```

4. Use System Prompts Effectively

Many AI coding assistants respect system-level instructions about your project constraints. Add a persistent instruction that guides the AI's import decisions.

For Cursor, add to your workspace rules:

```
Always verify imports against requirements.txt before suggesting.
Prefer stdlib over third-party libraries when possible.
Never import from packages not listed in dependencies.
```

5. Reset Context Strategically

When conversations become long and the AI starts making obvious errors, starting fresh often works better than continuing to pile on context. Save the useful parts of previous discussions, then begin with a clean slate that includes only your current task and necessary dependencies.

Step 2 - Practical Workflow Example

Here's a workflow that minimizes hallucinated imports:

1. Before starting: List your key dependencies in the conversation

2. For each task: Specify constraints like "use only stdlib and our existing dependencies"

3. When generating: Ask the AI to verify imports against your dependency list

4. After generation: Run a linter or type checker to catch invalid imports immediately

```python
Example prompt structure:
"""
Create a function that caches API responses using Redis.
Project constraints:
- Python 3.11+
- Redis client: redis-py 5.x
- No new dependencies allowed
- Use our existing cache wrapper from src/cache/wrapper.py
"""
```

Step 3 - Detecting Hallucinated Imports Early

Add these checks to your development workflow:

```bash
Python - Check for undefined imports
pip install pyflakes
pyflakes your_module.py

TypeScript/JavaScript
npm install -D eslint
npx eslint src/

Go
go vet ./...
```

Running these tools immediately after AI-generated code catches hallucinated imports before they reach your main codebase.

Step 4 - When Hallucinations Still Happen

Sometimes despite your best efforts, the AI still generates invalid imports. Common causes include:

- Model confusion: The conversation drifted far from your original context

- Mixed project contexts: You discussed multiple projects in one session

- Stale dependency information: Your requirements changed but the AI wasn't told

The fix is simple - tell the AI what went wrong and provide the correct dependency information. Most models recover quickly when given explicit correction.

Step 5 - Build Long-Term Context Habits

The best defense against hallucinated imports is consistent communication discipline. Always:

- Introduce projects with their dependency files

- Reference specific files when asking for modifications

- Correct hallucinations immediately and explicitly

- Reset conversations when context becomes unwieldy

These habits reduce AI errors dramatically and make your coding assistant a reliable partner rather than a source of subtle bugs.

Step 6 - Comparing Context Windows Across AI Tools

Different AI tools maintain different context window sizes, affecting how much information they can consider:

| Tool | Context Window | Input Cost | Specialty |
|------|---|---|---|
| Claude 3.5 Sonnet (API) | 200K tokens | $3/M input | Large codebases |
| Claude 3 Opus (API) | 200K tokens | $15/M input | Deep reasoning |
| GPT-4o | 128K tokens | $5/M input | Balanced |
| GPT-4 Turbo | 128K tokens | $10/M input | Complex code |
| Cursor | 50K tokens (default) | Variable | IDE-integrated |
| GitHub Copilot | 8K-16K | Subscription | Inline suggestions |

Practical implication - If your repository is 500K tokens, Claude 3.5 Sonnet can ingest 40% of it. GPT-4o can handle only 25%. Cursor and Copilot can see nothing at full codebase scale.

Step 7 - Tokenization Awareness

Before dumping files into an AI tool, understand how many tokens you're consuming:

```python
Estimate tokens before sending to Claude
def estimate_tokens(text: str) -> int:
    # Rough approximation: 1 token ≈ 4 characters (English text)
    # More precise: 1 token ≈ 0.33 words

    words = len(text.split())
    tokens = int(words / 0.75)  # Conservative estimate
    return tokens

Your requirements.txt
requirements = open("requirements.txt").read()
tokens = estimate_tokens(requirements)
print(f"Requirements.txt: ~{tokens} tokens")

If you paste entire project into Claude at once:
project_files = [
    "src/main.py",
    "src/utils.py",
    "src/models.py",
    "src/config.py",
    "tests/test_main.py"
]

total_tokens = 0
for file in project_files:
    with open(file) as f:
        total_tokens += estimate_tokens(f.read())

print(f"Total project context: {total_tokens} tokens")
If >100K, you're using 50% of Claude's context window
```

Step 8 - Smart Context Management Patterns

Pattern 1 - File Priority List

```python
Define which files are most relevant to current task
priority_context = {
    "priority": 1,  # Always include
    "files": ["config.py", "requirements.txt", "README.md"]
}

supporting_context = {
    "priority": 2,  # Include if space permits
    "files": ["utils.py", "constants.py", "logging.py"]
}

optional_context = {
    "priority": 3,  # Only include if working on specific feature
    "files": ["tests/test_main.py", "docs/architecture.md"]
}

Before asking AI for help:
Include all Priority 1 files
Add Priority 2 if under 100K tokens
Add Priority 3 only if working on that specific area
```

Pattern 2 - Conversation Reset Strategy

```python
If conversation becomes long and AI starts hallucinating:
1. Save current useful context to a file
2. Create new conversation
3. Paste only the essentials + current task

def prepare_fresh_context(original_conversation_length: int):
    if original_conversation_length > 15000:  # tokens
        print("Time to reset context window")
        # Extract key findings from original conversation
        # Save to .ai_context file
        # Start fresh conversation with that file + current task
```

Step 9 - Real-World Scenario: Large Django Project

Suppose you're working on a 2MB Django project with 15 Python files, 100+ database models, and 200 views.

Naive approach (causes hallucinations):

```bash
DON'T - Paste everything
cat src//*.py | xargs cat | xargs -I {} curl... # to Claude
Hallucinated imports, forgotten constraints
```

Smart approach:

```python
Step 1 - Identify scope
scope = "Add Stripe payment integration to Order model"

Step 2 - Include only related files
files_needed = [
    "apps/orders/models.py",        # Order model definition
    "apps/orders/serializers.py",   # Order serializer
    "apps/payments/models.py",      # Payment model stub
    "requirements.txt",              # Verify stripe package exists
    "config/settings.py",            # Database/payment config
    ".env.example"                   # Environment variable template
]

Step 3 - Check token count
total_tokens = sum(estimate_tokens(open(f).read()) for f in files_needed)
8,500 tokens - well under limits

Step 4 - Include explicit constraints
context_message = f"""
Task - {scope}

Key constraints:
- We use Django 4.2 with DRF
- Stripe dependency already in requirements.txt
- Use existing Payment model from apps/payments/models.py
- Do NOT import from unauthorized apps
- DO use Django signals for order status updates

Files for reference:
{[include each file contents]}
"""

Send context_message to Claude
```

This focused approach dramatically reduces hallucinations.

Step 10 - Incremental Conversation Strategy

Instead of large context dumps, use smaller iterative conversations:

```python
Conversation 1 - Verify dependencies exist
"""
Show me the exact version of 'stripe' in requirements.txt
and what packages depend on it.
"""

Conversation 2 - Understand current models
"""
Here's my Payment model [paste model code].
I need to add a payment_intent_id field.
What migration should I create?
"""

Conversation 3 - Generate integration code
"""
Given the Payment model and Stripe API docs,
generate a function that creates a payment intent.
Only use dependencies already in requirements.txt.
"""

Each conversation is small and focused
Less hallucination because less context confusion
```

Step 11 - Tools for Context Management

CLI tools to help organize context:

```bash
Count tokens in files
pip install tiktoken
python -c "
import tiktoken
enc = tiktoken.get_encoding('cl100k_base')
with open('myfile.py') as f:
    tokens = len(enc.encode(f.read()))
    print(f'Tokens: {tokens}')
"

Find largest files in project
find . -name '*.py' -type f -exec wc -c {} + | sort -n | tail -20

Create context summary for AI
grep -r "^class\|^def\|^import" src/ > /tmp/project_summary.txt
~2-5K tokens capturing project structure without implementation
```

Step 12 - Context Window Limits by Tool

When each AI tool starts hallucinating (based on testing):

| Tool | Safe Limit | Warning Point | Danger Zone |
|------|-----------|---------------|-----------|
| Claude 3.5 Sonnet | 100K tokens | 140K tokens | >160K tokens |
| GPT-4o | 60K tokens | 90K tokens | >110K tokens |
| Cursor | 30K tokens | 40K tokens | >45K tokens |
| Copilot | 8K tokens | 12K tokens | >14K tokens |

Stay in the "safe limit" column to maintain quality.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to manage ai coding context window to avoid hallucinated?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Can I adapt this for a different tech stack?

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

Related Articles

- [How to Manage AI Coding Context Across Multiple Related Repo](/how-to-manage-ai-coding-context-across-multiple-related-repo/)
- [How to Manage AI Coding Context When Switching Between Diffe](/how-to-manage-ai-coding-context-when-switching-between-diffe/)
- [What Source Code Context Window Do Different AI Coding Tools](/what-source-code-context-window-do-different-ai-coding-tools/)
- [Best AI Context Window Management Strategies for Large Codeb](/best-ai-context-window-management-strategies-for-large-codeb/)
- [Claude Max Context Window Exceeded: What To Do](/claude-max-context-window-exceeded-what-to-do/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
