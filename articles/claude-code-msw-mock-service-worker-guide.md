---
layout: default
title: "Claude Code MSW Mock Service Worker Guide"
description: "Set up MSW with Claude Code for API mocking: request handlers, response factories, network error simulation, and browser/Node dual environments."
date: 2026-03-18
last_modified_at: 2026-03-18
author: theluckystrike
permalink: /claude-code-msw-mock-service-worker-guide/
categories: [guides]
tags: [ai-tools-compared, claude-code, msw, mock-service-worker, api-mocking, testing, development-tools, claude-ai]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Advanced Handler Patterns](#advanced-handler-patterns)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)
- [Comparison with Alternatives](#comparison-with-alternatives)
- [Troubleshooting](#troubleshooting)

Introduction

Mock Service Worker (MSW) is a powerful API mocking library that intercepts network requests at the service worker level. When combined with Claude Code, it creates a development environment where you can simulate API responses without relying on external servers. This guide walks you through setting up MSW with Claude Code and using it effectively in your development workflow.

MSW works by intercepting requests at the network level using service workers, making it indistinguishable from real network calls. This approach provides more realistic testing conditions compared to traditional mocking libraries that modify global fetch or XMLHttpRequest objects directly.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - Set Up MSW in Your Project

Before integrating with Claude Code, you need to add MSW to your project. The installation process differs slightly between JavaScript and TypeScript projects, but the core concepts remain the same.

Install MSW as a development dependency using your package manager:

```bash
npm install msw --save-dev
```

Initialize MSW to generate the service worker files:

```bash
npx msw init ./public --save
```

This command creates the necessary service worker files in your public directory. The initialization process sets up the interception layer that MSW uses to intercept and mock network requests.

Step 2 - Create Mock Handlers

MSW uses handlers to define how network requests should be mocked. These handlers intercept requests matching specific patterns and return custom responses. Create a dedicated handlers file to organize your mock definitions.

Define your first handler using the REST API syntax:

```javascript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ]);
  }),
  http.post('https://api.example.com/users', async ({ request }) => {
    const newUser = await request.json();
    return HttpResponse.json(newUser, { status: 201 });
  }),
];
```

Each handler specifies the HTTP method, URL pattern, and response. The request handler receives the actual request object, allowing you to access headers, body, and parameters for dynamic response generation.

Step 3 - Configure the Service Worker

To activate MSW in your application, you need to set up the service worker during application startup. Create a browser-specific setup file that initializes the service worker in development and testing environments.

Set up the MSW worker in your application entry point:

```javascript
async function enableMocking() {
  if (typeof window === 'undefined') {
    return;
  }

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
}

enableMocking().then(() => {
  console.log('MSW started successfully');
});
```

This setup ensures that MSW only activates in appropriate environments while passing through real requests in production. The `onUnhandledRequest: 'bypass'` option allows unmatched requests to proceed normally, preventing your application from breaking when testing against real APIs.

Step 4 - Use MSW with Claude Code

Claude Code can use MSW mocks to test API interactions without external dependencies. When working on features that involve API calls, you can define mock responses that simulate various scenarios including success cases, errors, and edge cases.

Request Claude Code to create mock scenarios:

```
Create handlers for a product catalog API that includes:
- GET /products (list all products)
- GET /products/:id (single product)
- POST /products (create product)
- Include pagination support
- Simulate network delays of 500ms
- Add error handling for 404 and 500 responses
```

Claude Code will generate appropriate handlers that you can integrate into your mock setup. This approach accelerates development by providing realistic API behavior without requiring a backend server.

Step 5 - Test Strategies with MSW

MSW excels at enabling deterministic testing scenarios. By controlling exactly what responses the API returns, you can test specific code paths that would otherwise be difficult to trigger.

Test error handling with structured error responses:

```javascript
http.get('https://api.example.com/protected-resource', () => {
  return HttpResponse.json(
    { error: 'Unauthorized', message: 'Invalid token' },
    { status: 401 }
  );
});
```

Test loading states by adding artificial delays:

```javascript
http.get('https://api.example.com/slow-endpoint', async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return HttpResponse.json({ data: 'delayed response' });
});
```

These patterns allow you to verify that your application handles various API conditions gracefully, improving overall reliability.

Step 6 - Organizing Mock Files

As your project grows, organizing mocks becomes essential. Create a structured approach that separates concerns and makes mocks easy to maintain.

Recommended file structure for larger projects:

```
src/
  mocks/
    browser.js          # Worker initialization
    handlers/
      index.js          # Re-exports all handlers
      users.js          # User-related endpoints
      products.js       # Product-related endpoints
      auth.js           # Authentication endpoints
    data/
      users.json        # Static mock data
      products.json     # Product data
```

This organization allows you to import only the handlers needed for specific test scenarios, keeping your test suites focused and fast.

Advanced Handler Patterns

MSW supports sophisticated matching patterns that go beyond simple URL and method matching. For example, you can match requests by headers, query parameters, or request body content:

```javascript
import { http, HttpResponse } from 'msw';

// Match by query parameter
http.get('https://api.example.com/search', ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (query?.length < 2) {
    return HttpResponse.json({
      error: 'Query must be at least 2 characters',
      results: []
    }, { status: 400 });
  }

  return HttpResponse.json({ results: [...] });
}),

// Match by request header
http.post('https://api.example.com/admin/users', ({ request }) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return HttpResponse.json({ success: true }, { status: 201 });
}),

// Match by request body
http.post('https://api.example.com/validate-email', async ({ request }) => {
  const body = await request.json();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email);

  return HttpResponse.json({ valid: isValid });
}),
```

These patterns enable you to test edge cases and error conditions that would be difficult to reproduce with a real API.

Step 7 - Debugging Mock Failures

When tests fail with MSW configured, Claude Code can help diagnose issues. Common problems include unmatched requests, incorrect response shapes, or timing issues.

Enable request logging to see what requests your application actually makes:

```javascript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  http.get('*', ({ request }) => {
    console.log('Unhandled request:', request.method, request.url);
    return HttpResponse.json({ error: 'Not mocked' }, { status: 404 });
  }),
];

const server = setupServer(...handlers);
```

The wildcard handler at the end catches any unmatched requests and logs them. This reveals whether your application is making requests you forgot to mock.

Step 8 - Integration with React Testing Library

MSW pairs exceptionally well with React Testing Library. Rather than mocking fetch directly, MSW intercepts at the service worker level, making tests more realistic:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import UserProfile from './UserProfile';

const server = setupServer(
  http.get('https://api.example.com/user/:id', () => {
    return HttpResponse.json({
      id: '123',
      name: 'Alice',
      email: 'alice@example.com'
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('displays user profile', async () => {
  render(<UserProfile userId="123" />);

  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});

test('handles loading state', async () => {
  server.use(
    http.get('https://api.example.com/user/:id', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return HttpResponse.json({ id: '123', name: 'Bob' });
    })
  );

  render(<UserProfile userId="123" />);
  expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
});
```

This approach tests your component's actual behavior without brittle implementation details.

Performance Considerations

MSW has minimal performance overhead, but handling thousands of requests in test suites can slow execution. Optimize by:

1. Using request handlers strategically - Only mock endpoints your test actually calls
2. Avoiding artificial delays - Remove `setTimeout` from handlers once development is complete
3. Resetting handlers between tests - `server.resetHandlers()` prevents state leakage
4. Using request scope handlers - Override global handlers for specific tests without affecting others:

```javascript
test('handles API errors', async () => {
  server.use(
    http.get('https://api.example.com/data', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
  );

  // Test error handling
});
```

Best Practices

When using MSW with Claude Code, follow these practices to maximize effectiveness. First, keep mocks close to the code they test by co-locating handler definitions with their corresponding test files. Second, use environment variables to toggle mocks on and off, ensuring you can switch between mocked and real APIs easily.

Third, version your mock definitions alongside your API contracts. When your backend team updates an endpoint, update the corresponding mock to reflect the change. Fourth, document mock behavior clearly so team members understand what responses to expect.

Finally, use MSW's request matching capabilities to create dynamic responses based on query parameters, headers, or request body content. This flexibility allows you to test complex scenarios without creating multiple handler variants.

Comparison with Alternatives

| Tool | Setup Complexity | Realism | Context-Aware |
|------|-----------------|---------|---------------|
| MSW | Moderate | Very High | Yes |
| Jest Mocks | Low | Medium | No |
| Sinon | Moderate | Medium | Yes |
| node-fetch-mock | Low | Medium | No |
| Vitest Mock | Low | Medium | No |

MSW stands out for its service-worker-level interception, making mocked requests indistinguishable from real network calls. This realism catches more bugs than traditional mocking approaches.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to complete this setup?

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

- [Claude Code Go Module Development Guide](/claude-code-go-module-development-guide/)
- [Claude Code Runbook Documentation Guide](/claude-code-runbook-documentation-guide/)
- [Claude Code Java Library Development Guide](/claude-code-java-library-development-guide/)
- [Claude Code for Node.js Profiling Workflow Tutorial](/claude-code-for-nodejs-profiling-workflow-tutorial/)
- [Claude Code vs Cursor for Backend Development](/claude-code-vs-cursor-for-backend-development/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
