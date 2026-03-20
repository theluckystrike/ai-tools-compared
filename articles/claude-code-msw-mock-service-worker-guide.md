---

layout: default
title: "Claude Code MSW Mock Service Worker Guide"
description: "A guide to using MSW (Mock Service Worker) with Claude Code for API mocking in development workflows. Learn setup, configuration, and best practices for effective testing."
date: 2026-03-18
author: "AI Tools Compared"
permalink: /claude-code-msw-mock-service-worker-guide/
categories: [guides]
tags: [claude-code, msw, mock-service-worker, api-mocking, testing, development-tools]
reviewed: true
score: 8
intent-checked: false
voice-checked: true
voice-checked: false
---



{% raw %}

## Introduction



Mock Service Worker (MSW) is a powerful API mocking library that intercepts network requests at the service worker level. When combined with Claude Code, it creates a development environment where you can simulate API responses without relying on external servers. This guide walks you through setting up MSW with Claude Code and using it effectively in your development workflow.



MSW works by intercepting requests at the network level using service workers, making it indistinguishable from real network calls. This approach provides more realistic testing conditions compared to traditional mocking libraries that modify global fetch or XMLHttpRequest objects directly.



## Setting Up MSW in Your Project



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



## Creating Mock Handlers



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



## Configuring the Service Worker



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



## Using MSW with Claude Code



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



## Testing Strategies with MSW



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


These patterns allow you to verify that your application handles various API conditions gracefully, improving overall robustness.



## Organizing Mock Files



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



## Best Practices



When using MSW with Claude Code, follow these practices to maximize effectiveness. First, keep mocks close to the code they test by co-locating handler definitions with their corresponding test files. Second, use environment variables to toggle mocks on and off, ensuring you can switch between mocked and real APIs easily.



Third, version your mock definitions alongside your API contracts. When your backend team updates an endpoint, update the corresponding mock to reflect the change. Fourth, document mock behavior clearly so team members understand what responses to expect.



Finally, use MSW's request matching capabilities to create dynamic responses based on query parameters, headers, or request body content. This flexibility allows you to test complex scenarios without creating multiple handler variants.


## Related Reading

- [Best AI Tools for Developers in 2026](/best-ai-tools-for-developers-2026/)
- [AI Tools Comparison Guide](/ai-tools-comparison-guide/)
- [AI Tools Hub](/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
