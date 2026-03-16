---

layout: default
title: "How to Migrate Copilot Chat History and Context to Cursor AI"
description: "A practical guide for developers moving from GitHub Copilot to Cursor AI, covering chat history migration, context transfer, and configuration steps."
date: 2026-03-16
author: theluckystrike
permalink: /migrate-copilot-chat-history-and-context-to-cursor-ai-guide/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
intent-checked: true
---

To migrate Copilot chat history to Cursor AI, export the JSON conversation files from `~/Library/Application Support/Visual Studio Code/User/GlobalStorage/github.copilot-chat/`, parse them into a context document, and place the result in your project root where Cursor indexes it automatically. There is no direct import path between the two tools, so the migration involves extracting, reformatting, and recreating context through Cursor's `.cursorrules` and `@`-mention system.

## Why Migrate to Cursor AI

Cursor AI builds on VS Code with integrated AI capabilities that differ from Copilot's approach. While Copilot provides inline suggestions and chat within GitHub's ecosystem, Cursor offers a fully integrated AI assistant that understands your entire codebase. Many developers find Cursor's contextual awareness more powerful for complex refactoring tasks and multi-file operations.

The migration involves three main areas: exporting your Copilot conversation history, transferring project-specific context, and configuring Cursor to match your workflow preferences.

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

1. **@-mentions**: Type `@` in the chat to reference files, folders, or documentation
2. **Ctrl+K inline editing**: Select code and press `Ctrl+K` for AI-assisted modifications
3. **Chat context**: Cursor automatically includes relevant open files in conversations

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

- **Temperature**: Lower values (0.2-0.4) for consistent, predictable code; higher for creative solutions
- **Max tokens**: Increase for longer conversations
- **Context window**: Adjust based on your project's complexity

## Migrating Custom Copilot Extensions

If you use Copilot extensions or custom prompts, recreate them in Cursor. Cursor supports custom instructions through:

1. **Project rules**: Create `.cursorrules` file in your project root
2. **Workspace instructions**: Add instructions in Cursor settings under "AI Instructions"

Example `.cursorrules` file:

```
You are working on a React TypeScript project.
- Always use functional components
- Prefer hooks over class components
- Include PropTypes or TypeScript interfaces
- Follow the component structure: components/, hooks/, utils/
```

## Best Practices for the Transition

Migrating to a new AI assistant requires adjustment. Follow these recommendations:

**Start fresh but reference the past**: Don't try to import every conversation. Focus on transferring high-value context about architecture decisions and complex problem solutions.

**Rebuild context gradually**: As you work in Cursor, naturally rebuild context through file references and project-specific instructions.

**Use version control**: Commit your context documents to Git so teammates benefit from the accumulated knowledge.

**Test before abandoning**: Keep Copilot accessible for a week while you adjust to Cursor. Both tools can coexist during the transition.

## Summary

Migrating Copilot chat history to Cursor involves locating local Copilot data, parsing conversation files, and recreating context within Cursor's integrated approach. The process requires manual effort because the tools use fundamentally different architectures, but the outcome provides a more cohesive AI-assisted development experience.

Key steps include: backing up Copilot's local data, parsing JSON files into readable format, creating context documents for Cursor to index, and configuring Cursor settings to match your workflow. The investment pays off through improved code awareness and streamlined AI interactions.


## Related Reading

- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
