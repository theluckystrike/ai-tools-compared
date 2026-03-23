---
layout: default
title: "Transfer ChatGPT Custom GPTs to Claude Projects"
description: "A practical guide for developers and power users to migrate Custom GPTs from ChatGPT to Claude Projects, with code examples and migration strategies"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /transfer-chatgpt-custom-gpts-to-claude-projects-step-by-step/
categories: [guides]
tags: [ai-tools-compared, tools, claude-ai, chatgpt]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


To transfer Custom GPTs to Claude Projects, export your GPT's system prompt, knowledge files, and conversation starters, then recreate them as Claude Project resources in Claude.ai or as a CLAUDE.md file for Claude Code. The process has five steps: export the GPT configuration, organize your files locally, rebuild in Claude Projects, recreate conversation starters as prompt templates, and test for behavior parity. There is no direct migration tool, so each component must be extracted and reconstructed manually.

Table of Contents

- [Understanding What You Are Migrating](#understanding-what-you-are-migrating)
- [Step 1: Export Your Custom GPT Configuration](#step-1-export-your-custom-gpt-configuration)
- [Step 2: Organize Your Resources](#step-2-organize-your-resources)
- [Step 3: Recreate in Claude Projects](#step-3-recreate-in-claude-projects)
- [Instructions](#instructions)
- [Capabilities](#capabilities)
- [Knowledge](#knowledge)
- [Step 4: Preserve Conversation Starters](#step-4-preserve-conversation-starters)
- [Step 5: Test and Iterate](#step-5-test-and-iterate)
- [Translating GPT Capabilities to Claude Equivalents](#translating-gpt-capabilities-to-claude-equivalents)
- [Adapting System Prompts for Claude](#adapting-system-prompts-for-claude)
- [Automating the Process for Multiple GPTs](#automating-the-process-for-multiple-gpts)
- [Instructions](#instructions)
- [Knowledge](#knowledge)
- [Evaluating Behavior Parity After Migration](#evaluating-behavior-parity-after-migration)

Understanding What You Are Migrating

ChatGPT Custom GPTs store several components: the system prompt, user instructions, conversation starters, and optional uploaded files (knowledge base). Claude Projects work differently, instead of a packaged "GPT," you create project contexts by adding instructions, files, and specifications directly in Claude.ai or through Claude Code projects. The migration involves extracting each component from your GPT and recreating it as a project resource.

Before starting, identify which GPTs you want to transfer and their purpose. Not every GPT needs migration; focus on those containing valuable custom instructions, specialized knowledge, or workflows you rely on frequently.

Step 1: Export Your Custom GPT Configuration

ChatGPT does not provide a one-click export for Custom GPTs, so you need to manually extract the configuration. Open your Custom GPT in the ChatGPT interface and note the following details:

System Instructions: This is the core prompt defining your GPT's behavior. Copy this text exactly as written. Look for the "Instructions" or "Configure" section in the GPT editor.

Knowledge Files: Any documents, PDFs, or text files you uploaded become part of the GPT's knowledge base. Download these individually from the GPT configuration page. If you have many files, you may need to access them through your ChatGPT account's data storage.

Conversation Starters: These are the example prompts shown when users start a new conversation with your GPT. Note these down as you may want to recreate them as project-specific shortcuts.

Capabilities: Check which capabilities your GPT uses, web browsing, image generation, or code interpreter. Claude Projects have different capability sets, so note these for reference.

For developers comfortable with the ChatGPT API, you can also retrieve GPT configurations programmatically:

```python
import openai

client = openai.OpenAI(api_key="your-api-key")

List your GPTs
gpts = client.beta.assistants.list(limit=100)

for gpt in gpts.data:
    print(f"GPT ID: {gpt.id}")
    print(f"Name: {gpt.name}")
    print(f"Instructions: {gpt.instructions[:200]}...")
    print("---")
```

This approach works if you have converted your Custom GPTs to Assistants API format, which gives you programmatic access to instructions and file IDs.

Step 2: Organize Your Resources

Create a local folder structure to hold your extracted resources:

```
my-gpt-migration/
 gpt-name-1/
    instructions.md
    knowledge/
       file1.txt
       file2.pdf
    conversation-starters.md
 gpt-name-2/
     ...
```

This organization mirrors how Claude Projects work, you can reference local files directly when working with Claude Code. Having a clean folder structure makes the recreation process much smoother.

Step 3: Recreate in Claude Projects

With your resources organized, you can now build equivalent functionality in Claude Projects. There are two primary approaches:

Using Claude.ai Projects

1. Create a new Project in Claude.ai

2. Add your GPT's instructions as the project context. Paste the full system prompt into the project description or instructions field.

3. Upload the knowledge files you downloaded from ChatGPT. Claude.ai Projects support file uploads that Claude can reference during conversations.

4. Test the project by asking questions that should trigger the behaviors from your original GPT.

Using Claude Code (CLI)

For developers who prefer working locally, Claude Code offers project-based contexts. Create a CLAUDE.md file in your project folder:

```markdown
Project Context

You are [GPT Name], a specialized assistant that [core purpose].

Instructions

[Paste your full GPT instructions here]

Capabilities

- [List capabilities]
- [Be specific about behavior]

Knowledge

This project has access to files in the ./knowledge/ directory.
```

Then reference your knowledge files in the `./knowledge/` folder. When you run Claude Code in that directory, it automatically loads the context:

```bash
cd my-project
claude
```

The CLI reads CLAUDE.md and makes your knowledge files available during conversations.

Step 4: Preserve Conversation Starters

ChatGPT conversation starters are quick-prompt templates. In Claude Projects, you can recreate these as reusable prompts. Create a `prompts/` folder with markdown files for each starter:

```
prompts/
 analyze-code.md
 debug-issue.md
 explain-concept.md
```

When starting a new conversation, copy the relevant prompt template into your message. Alternatively, in Claude Code, you can create shell aliases:

```bash
Add to your .bashrc or .zshrc
alias claude-analyze="claude -p 'Analyze the following code for issues:'"
```

Step 5: Test and Iterate

After recreating your GPT as a Claude Project, thorough testing reveals gaps between the original behavior and the new implementation. Ask the same questions you would ask your Custom GPT and compare responses. Common adjustments include:

- Tweaking instructions: Claude interprets prompts differently than ChatGPT. You may need to rephrase certain instructions for optimal results.

- Adjusting file references: Ensure Claude can access all knowledge files. Use absolute paths when working locally.

- Capability mapping: If your GPT used DALL-E image generation, note that Claude uses different image capabilities. Check Claude's current feature set for equivalent functionality.

Translating GPT Capabilities to Claude Equivalents

ChatGPT Custom GPTs support specific capabilities that have direct (or approximate) equivalents in Claude:

| ChatGPT Capability | Claude Equivalent | Notes |
|-------------------|-------------------|-------|
| Web browsing | Claude.ai web search | Available in claude.ai; not in API by default |
| DALL-E image generation | No direct equivalent | Claude can describe images; use separate image API |
| Code interpreter / data analysis | Claude code execution (beta) | Available via API tool_use |
| Knowledge base files | Project files (claude.ai) or local files (Claude Code) | Max file sizes differ |
| Custom actions (API calls) | Tool use / function calling | Requires more explicit schema definition |
| Conversation starters | Saved prompt templates | Manual recreation required |

When your GPT relied heavily on DALL-E for image generation, plan to either keep that workflow in ChatGPT or integrate a separate image generation service (Flux, Midjourney API) alongside Claude.

Adapting System Prompts for Claude

Claude interprets system prompts differently from ChatGPT. Prompts that worked in ChatGPT often need three types of adjustments:

Remove ChatGPT-specific language. Phrases like "As a GPT" or "your GPT tools" can confuse Claude. Replace them with direct behavioral descriptions.

Be explicit about refusals. GPTs often have fine-tuned behavior for specific refusal patterns. With Claude, state your rules as positive instructions: "Only answer questions about Python development" rather than relying on implicit training.

Restructure with XML tags for long prompts. Claude handles structured prompts well:

```xml
<system_context>
You are a specialized code review assistant focused on Python best practices.
</system_context>

<capabilities>
- Review Python code for PEP 8 compliance
- Identify security vulnerabilities in web frameworks
- Suggest performance improvements for database queries
</capabilities>

<constraints>
- Do not generate complete rewrites; provide targeted feedback only
- Always explain the "why" behind each suggestion
- Flag critical security issues with [CRITICAL] prefix
</constraints>

<output_format>
Structure responses as: Issue | Severity | Recommendation | Example Fix
</output_format>
```

This structure tends to produce more consistent behavior in Claude than the free-form instruction style common in ChatGPT GPTs.

Automating the Process for Multiple GPTs

If you manage multiple Custom GPTs, consider building a migration script:

```python
import os
import json

def create_claude_project(gpt_name, instructions_file, knowledge_folder):
    """Create a Claude Project structure from exported GPT data."""
    project_folder = f"./claude-projects/{gpt_name}"
    os.makedirs(project_folder, exist_ok=True)

    # Create CLAUDE.md from instructions
    with open(instructions_file, 'r') as f:
        instructions = f.read()

    claude_md = f"""# {gpt_name}

Instructions
{instructions}

Knowledge
Knowledge files are stored in ./knowledge/
"""

    with open(f"{project_folder}/CLAUDE.md", 'w') as f:
        f.write(claude_md)

    # Copy knowledge files
    knowledge_dest = f"{project_folder}/knowledge"
    os.makedirs(knowledge_dest, exist_ok=True)

    for filename in os.listdir(knowledge_folder):
        src = os.path.join(knowledge_folder, filename)
        if os.path.isfile(src):
            dst = os.path.join(knowledge_dest, filename)
            os.system(f"cp '{src}' '{dst}'")

    print(f"Created Claude Project: {gpt_name}")

Usage
create_claude_project(
    gpt_name="my-code-assistant",
    instructions_file="./my-gpt-migration/gpt-name-1/instructions.md",
    knowledge_folder="./my-gpt-migration/gpt-name-1/knowledge"
)
```

This script automates the folder creation and file copying, letting you focus on refining the instructions rather than repetitive setup tasks.

Evaluating Behavior Parity After Migration

Once your Claude Project is running, use a systematic test to compare its behavior against the original GPT. Create a test matrix of 10, 20 representative prompts covering:

- Core use case queries (the primary reason you built the GPT)
- Edge case inputs that the GPT handled well
- Inputs the GPT correctly declined or redirected
- Prompts that test knowledge file recall

Score each on a 1, 3 scale (1 = wrong/off, 2 = close, 3 = equivalent or better). A score of 2.5+ indicates a successful migration. Items scoring 1 usually point to missing instructions or knowledge context that needs to be re-added.

Frequently Asked Questions

Who is this article written for?

This article is written for developers, technical professionals, and power users who want practical guidance. Whether you are evaluating options or implementing a solution, the information here focuses on real-world applicability rather than theoretical overviews.

How current is the information in this article?

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Always verify specific feature availability and pricing directly on the official website before making purchasing decisions.

Does ChatGPT offer a free tier?

Most major tools offer some form of free tier or trial period. Check ChatGPT's current pricing page for the latest free tier details, as these change frequently. Free tiers typically have usage limits that work for evaluation but may not be sufficient for daily professional use.

How do I get started quickly?

Pick one tool from the options discussed and sign up for a free trial. Spend 30 minutes on a real task from your daily work rather than running through tutorials. Real usage reveals fit faster than feature comparisons.

What is the learning curve like?

Most tools discussed here can be used productively within a few hours. Mastering advanced features takes 1-2 weeks of regular use. Focus on the 20% of features that cover 80% of your needs first, then explore advanced capabilities as specific needs arise.

Related Articles

- [How to Migrate ChatGPT Plugins](/migrate-chatgpt-plugins-to-custom-gpts-step-by-step-2026/)
- [How to Transfer Claude Project Knowledge to ChatGPT Custom](/how-to-transfer-claude-project-knowledge-to-chatgpt-custom-g/)
- [How to Transfer Claude Project Knowledge to ChatGPT Custom (2)](/how-to-transfer-claude-project-knowledge-to-chatgpt-custom-gpt/)
- [ChatGPT Plugins Replacement Custom Gpts Pricing](/chatgpt-plugins-replacement-custom-gpts-pricing-for-developers/)
- [Do ChatGPT Plus Memory and Custom GPTs Count Toward](/chatgpt-plus-memory-and-custom-gpts-count-toward-usage-limit/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
