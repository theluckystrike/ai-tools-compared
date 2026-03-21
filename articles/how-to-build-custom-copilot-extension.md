---
layout: default
title: "How to Build a Custom GitHub Copilot Extension"
description: "Step-by-step guide to building a GitHub Copilot Extension using the Copilot Extensions API, with authentication, streaming responses, and real deployment examples"
date: 2026-03-21
author: theluckystrike
permalink: /how-to-build-custom-copilot-extension/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

GitHub Copilot Extensions let you build custom agents that appear as `@your-agent` in Copilot Chat. Users can invoke your extension directly from their editor or github.com, and you handle the conversation with your own backend. This guide covers the full build: registering the app, handling authentication, streaming responses, and deploying.

## What Copilot Extensions Can Do

A Copilot Extension is a GitHub App that receives conversation messages and returns streaming SSE responses in the OpenAI chat completions format. Use cases include:

- `@docs` — Answer questions from your internal documentation
- `@jira` — Create and update tickets from the chat interface
- `@runbook` — Execute runbooks or check system status
- `@review` — Apply custom code review rules beyond what Copilot knows

## Prerequisites

- GitHub account with Copilot access (Individual, Business, or Enterprise)
- A public HTTPS endpoint (or ngrok for development)
- Node.js 20+

## Step 1: Register the GitHub App

1. Go to Settings > Developer settings > GitHub Apps > New GitHub App
2. Set the callback URL and webhook URL to your endpoint
3. Under Permissions, enable "Copilot Chat" (read)
4. Under "Copilot" section, set Agent URL to `https://your-domain.com/agent`
5. Install the app on your account or organization

Save the App ID, Client ID, and generate a Private Key (PEM file).

## Step 2: Build the Agent Server

```javascript
// server.js
import express from 'express';
import { createNodeMiddleware, createAppAuth } from '@octokit/app';
import { verifyAndParseRequest, createAckEvent, createTextEvent, createDoneEvent } from '@copilot-extensions/preview-sdk';

const app = express();
app.use(express.raw({ type: 'application/json' }));

app.post('/agent', async (req, res) => {
  // Verify the request is from GitHub
  const { isValidRequest, payload } = await verifyAndParseRequest(
    req.body,
    req.headers['github-public-key-identifier'],
    req.headers['github-public-key-signature'],
    { token: req.headers['x-github-token'] }
  );

  if (!isValidRequest) {
    res.status(401).send('Unauthorized');
    return;
  }

  // Set up SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  // Acknowledge immediately (required within 500ms)
  res.write(createAckEvent());

  const messages = payload.messages;
  const lastMessage = messages[messages.length - 1].content;

  // Your custom logic here
  const responseText = await generateResponse(lastMessage, messages, payload.copilot_thread_id);

  // Stream response tokens
  const words = responseText.split(' ');
  for (const word of words) {
    res.write(createTextEvent(word + ' '));
    await new Promise(r => setTimeout(r, 20)); // simulate streaming
  }

  res.write(createDoneEvent());
  res.end();
});

app.listen(3000, () => console.log('Extension running on :3000'));
```

The `verifyAndParseRequest` call validates the request signature using GitHub's public key. Skip this and you risk accepting forged requests.

## Step 3: Implement Response Logic

Replace the simple `generateResponse` with your actual logic. Here's an example that queries internal docs:

```javascript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateResponse(userMessage, conversationHistory, threadId) {
  // Fetch relevant docs based on the user's question
  const relevantDocs = await searchInternalDocs(userMessage);

  // Build system prompt with retrieved context
  const systemPrompt = `You are a helpful assistant for our engineering team.
Answer questions based on the following internal documentation:

${relevantDocs.map(doc => `## ${doc.title}\n${doc.content}`).join('\n\n')}

If the documentation doesn't cover the question, say so clearly.`;

  // Convert Copilot message history to Anthropic format
  const messages = conversationHistory
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages
  });

  return response.content[0].text;
}

async function searchInternalDocs(query) {
  // Replace with your actual doc search: vector DB, Elasticsearch, etc.
  // This example uses a simple in-memory search
  const docs = await loadDocs();
  return docs
    .filter(doc => doc.content.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);
}
```

## Step 4: Handle Streaming Properly

For better user experience, stream tokens as they arrive from the LLM:

```javascript
import { createTextEvent, createDoneEvent } from '@copilot-extensions/preview-sdk';

async function streamResponse(res, userMessage, conversationHistory) {
  const anthropic = new Anthropic();

  const stream = anthropic.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: conversationHistory.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      res.write(createTextEvent(event.delta.text));
    }
  }

  res.write(createDoneEvent());
  res.end();
}
```

## Step 5: Reference Files from the Editor

When users `@mention` files in Copilot Chat, those files are included in the payload. Access them:

```javascript
function extractFileContext(messages) {
  const references = [];

  for (const message of messages) {
    if (message.copilot_references) {
      for (const ref of message.copilot_references) {
        if (ref.type === 'github.file') {
          references.push({
            path: ref.data.path,
            content: ref.data.content,
            repo: ref.data.repo
          });
        }
      }
    }
  }

  return references;
}

// In your handler:
const files = extractFileContext(payload.messages);
const fileContext = files.map(f => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n');
```

## Step 6: Local Development with ngrok

```bash
# Install ngrok
brew install ngrok

# Start your server
node server.js

# In another terminal, expose it
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update your GitHub App's Agent URL to https://abc123.ngrok.io/agent
```

## Testing the Extension

Once deployed and installed, invoke your extension in VS Code Copilot Chat:

```
@your-extension-name How do I set up the dev environment?
@your-extension-name @workspace Explain what this function does
```

The `@workspace` reference passes your current open files as context.

## Deployment Checklist

Before publishing your extension:

- Verify signature validation is working (test with invalid signatures)
- Add rate limiting (GitHub limits to 100 requests/min per user by default)
- Handle errors gracefully — return a text event with the error message rather than closing the connection
- Set `GITHUB_WEBHOOK_SECRET` for webhook event verification
- Add request logging with thread IDs for debugging conversations

```javascript
// Rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.headers['x-github-token'] || req.ip
});

app.use('/agent', limiter);
```


## Related Articles

- [Best Practices for Writing GitHub Copilot Custom Instruction](/ai-tools-compared/best-practices-for-writing-github-copilot-custom-instruction/)
- [Best AI Tools for Writing GitHub Actions Matrix Build Strate](/ai-tools-compared/best-ai-tools-for-writing-github-actions-matrix-build-strate/)
- [How to Build Custom AI Coding Workflows with MCP Server](/ai-tools-compared/how-to-build-custom-ai-coding-workflows-with-mcp-server-inte/)
- [Completely Free Alternatives to GitHub Copilot That Actually](/ai-tools-compared/completely-free-alternatives-to-github-copilot-that-actually/)
- [Continue Dev vs GitHub Copilot: Open Source Comparison](/ai-tools-compared/continue-dev-vs-github-copilot-open-source-comparison/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
