---
layout: default
title: "How to Migrate Copilot Chat History and Context to Cursor AI"
description: "A practical guide for developers moving from GitHub Copilot to Cursor AI, covering chat history migration, context transfer, and configuration steps"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /migrate-copilot-chat-history-and-context-to-cursor-ai-guide/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


To migrate Copilot chat history to Cursor AI, export the JSON conversation files from `~/Library/Application Support/Visual Studio Code/User/GlobalStorage/github.copilot-chat/`, parse them into a context document, and place the result in your project root where Cursor indexes it automatically. There is no direct import path between the two tools, so the migration involves extracting, reformatting, and recreating context through Cursor's `.cursorrules` and `@`-mention system.


## Why Migrate to Cursor AI


Cursor AI builds on VS Code with integrated AI capabilities that differ from Copilot's approach. While Copilot provides inline suggestions and chat within GitHub's ecosystem, Cursor offers a fully integrated AI assistant that understands your entire codebase. Many developers find Cursor's contextual awareness more powerful for complex refactoring tasks and multi-file operations.


The migration involves three main areas: exporting your Copilot conversation history, transferring project-specific context, and configuring Cursor to match your workflow preferences.


## Understanding What You Are Actually Migrating


Before diving into the mechanics, it helps to be clear about what "migrating Copilot history" actually means in practice. There are three distinct categories of value stored in Copilot's history:

1. **Conversation transcripts** — The raw back-and-forth text between you and the AI. These are rarely useful to replay verbatim, but they contain decisions and explanations.
2. **Project-specific context** — Architecture decisions, naming conventions, and constraints that came up in conversations and shaped how the codebase evolved.
3. **Reusable prompts** — Patterns you found yourself repeating, such as "generate a Jest test for this function following our existing test style."

Only the second and third categories are worth migrating in a structured way. Conversation transcripts are useful as a reference archive, but trying to inject raw chat history into Cursor's context window just creates noise. Focus the migration effort on extracting the durable knowledge.


## Exporting Copilot Chat History


GitHub Copilot stores chat conversations locally on your machine. The exact location depends on your operating system and Copilot version. Here's how to locate and export your data.


### Finding Copilot Data on macOS


Your Copilot history lives in application support folders. Open Terminal and navigate to the correct directory:


```bash
cd ~/Library/Application\ Support/Visual\ Studio\ Code/User/GlobalStorage/github.copilot-chat/
ls -la
```


You'll find conversation files stored as JSON. Each file represents a chat session with timestamps. Copy these files to a backup location:


```bash
mkdir ~/copilot-migration
cp -r ~/Library/Application\ Support/Visual\ Studio\ Code/User/GlobalStorage/github.copilot-chat/* ~/copilot-migration/
```


### Finding Copilot Data on Windows


Windows users can find Copilot data in a similar location:


```bash
%APPDATA%\Code\User\GlobalStorage\github.copilot-chat\
```


Use File Explorer to navigate there and copy the contents to your migration folder.


### Exporting via GitHub API


For a more structured export, use GitHub's API to retrieve Copilot usage data:


```bash
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/copilot/usage
```


This provides usage statistics but not individual chat messages. For complete conversation history, the local files remain your primary source.


## Reading and Parsing Copilot Conversations


Copilot stores conversations as JSON files. Here's a Node.js script to extract and format your chat history:


```javascript
const fs = require('fs');
const path = require('path');

function extractConversations(sourceDir, outputFile) {
  const files = fs.readdirSync(sourceDir);
  const conversations = [];

  files.forEach(file => {
    if (file.endsWith('.json')) {
      const content = fs.readFileSync(path.join(sourceDir, file), 'utf8');
      const data = JSON.parse(content);

      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach(msg => {
          conversations.push({
            timestamp: msg.timestamp || file,
            role: msg.role,
            content: msg.content
          });
        });
      }
    }
  });

  // Sort by timestamp
  conversations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  fs.writeFileSync(outputFile, JSON.stringify(conversations, null, 2));
  console.log(`Exported ${conversations.length} messages to ${outputFile}`);
}

extractConversations('./copilot-migration', './cursor-import.json');
```


Run this script to create a portable file containing your conversation history:


```bash
node parse-copilot-history.js
```


## Importing Context into Cursor


Cursor handles context differently than Copilot. Instead of storing conversation history as standalone files, Cursor integrates context directly into your project workspace. Here's how to transfer your valuable project knowledge.


### Creating a Context Reference Document


Generate a document that captures important context from your Copilot conversations:


```javascript
function generateContextDocument(conversations, outputPath) {
  const importantTopics = conversations
    .filter(c => c.content.length > 200) // Filter for substantial discussions
    .map(c => `# ${c.timestamp}\n\n${c.content}\n`)
    .join('\n---\n\n');

  const content = `# Project Context\n\nExtracted from Copilot conversations.\n\n${importantTopics}`;

  fs.writeFileSync(outputPath, content);
  console.log('Context document created successfully');
}
```


Save this as `PROJECT_CONTEXT.md` in your project root. Cursor automatically indexes Markdown files, making this context available to its AI.


### Using Cursor's Context Features


Cursor provides several ways to provide context:


1. @-mentions: Type `@` in the chat to reference files, folders, or documentation

2. Ctrl+K inline editing: Select code and press `Ctrl+K` for AI-assisted modifications

3. Chat context: Cursor automatically includes relevant open files in conversations


For each significant Copilot conversation, manually recreate the context in Cursor by referencing the relevant files and explaining the project-specific requirements.


## Configuring Cursor for Your Workflow


After transferring history, configure Cursor to match your preferences.


### Setting Up Keyboard Shortcuts


Cursor uses many VS Code shortcuts but adds AI-specific ones. Check your keybindings:


```json
{
  "keybindings": [
    {
      "key": "cmd+shift+l",
      "command": "cursor.chat.new"
    },
    {
      "key": "cmd+shift+space",
      "command": "cursor.inlineSuggest.accept"
    }
  ]
}
```


### Adjusting AI Parameters


Cursor's settings allow fine-tuning AI behavior. Access settings via `Cmd+,` and search for "Cursor AI":


- Temperature: Lower values (0.2-0.4) for consistent, predictable code; higher for creative solutions

- Max tokens: Increase for longer conversations

- Context window: Adjust based on your project's complexity


## Migrating Custom Copilot Extensions


If you use Copilot extensions or custom prompts, recreate them in Cursor. Cursor supports custom instructions through:


1. Project rules: Create `.cursorrules` file in your project root

2. Workspace instructions: Add instructions in Cursor settings under "AI Instructions"


Example `.cursorrules` file:


```
You are working on a React TypeScript project.
- Always use functional components
- Prefer hooks over class components
- Include PropTypes or TypeScript interfaces
- Follow the component structure: components/, hooks/, utils/
```


## Copilot vs Cursor: Feature Comparison


Understanding the differences helps you know what to reconfigure after migration:


| Feature | GitHub Copilot | Cursor AI |
|---------|---------------|-----------|
| Inline code completion | Yes | Yes |
| Chat interface | Yes (VS Code sidebar) | Yes (integrated panel) |
| Multi-file awareness | Limited | Strong (Composer mode) |
| Codebase indexing | No | Yes (auto-indexed) |
| Custom instructions | Copilot instructions file | `.cursorrules` |
| Model selection | GPT-4o (fixed) | Claude, GPT-4o, others |
| GitHub integration | Native | Via extensions |
| Price | $10/mo individual | $20/mo Pro |


The most important difference for context migration is codebase indexing. Cursor's automatic codebase index means you do not need to manually feed file contents into every conversation — Cursor already knows your project structure. This changes how you write prompts: instead of pasting function signatures to provide context, you reference them with `@filename` and Cursor retrieves the content.


## Best Practices for the Transition


Migrating to a new AI assistant requires adjustment. Follow these recommendations:


Start fresh but reference the past: Don't try to import every conversation. Focus on transferring high-value context about architecture decisions and complex problem solutions.


Rebuild context gradually: As you work in Cursor, naturally rebuild context through file references and project-specific instructions.


Use version control: Commit your context documents to Git so teammates benefit from the accumulated knowledge.


Test before abandoning: Keep Copilot accessible for a week while you adjust to Cursor. Both tools can coexist during the transition.


Invest in your `.cursorrules` file: This is the highest-use configuration step in the migration. A well-written rules file prevents Cursor from making suggestions that contradict your project conventions, reducing the cognitive load of reviewing AI output during the adjustment period.


## Validating the Migration


After completing the migration steps, run a structured validation to confirm Cursor is providing equivalent or better assistance compared to your Copilot setup.


A practical validation checklist:

- Open a file you worked on heavily with Copilot and ask Cursor to explain the function at the cursor position. Confirm it uses correct project terminology without needing extra prompting.
- Trigger a multi-file refactor (rename a shared utility function) and compare how Cursor handles cross-file updates versus how Copilot handled similar tasks.
- Ask Cursor a project-specific question that relies on your `.cursorrules` context and confirm the response respects your stated conventions.
- Test escalating complexity: start with single-function completion, then a new feature request, then an architectural question. Each tier should benefit from the codebase index.


Track your time-to-first-useful-suggestion during the first week. Most developers find Cursor's first-day performance roughly equivalent to Copilot's, with quality improving noticeably by day 3–5 as the codebase index refines and you learn how to frame prompts for Cursor's model selection. The transition cost is real but short-lived — typically under a week before Cursor's codebase awareness begins paying dividends on complex tasks where Copilot's limited context window was previously a bottleneck.


## Related Articles

- [How to Use AI Chat History Effectively for Iterating on Code](/ai-tools-compared/how-to-use-ai-chat-history-effectively-for-iterating-on-code/)
- [Copilot Inline Chat vs Cursor Inline Chat: Which Understands](/ai-tools-compared/copilot-inline-chat-vs-cursor-inline-chat-which-understands-/)
- [How to Transfer Copilot Inline Chat Shortcuts](/ai-tools-compared/transfer-copilot-inline-chat-shortcuts-to-cursor-inline-edit/)
- [Migrate GitHub Copilot Workspace Setup to Cursor Background](/ai-tools-compared/migrate-github-copilot-workspace-setup-to-cursor-background-/)
- [How to Migrate VSCode Copilot Keybindings](/ai-tools-compared/migrate-vscode-copilot-keybindings-to-cursor-ai-editor-2026/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
