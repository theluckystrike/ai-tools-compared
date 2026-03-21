---
layout: default
title: "How to Use AI to Generate Playwright Network Interception"
description: "Learn how to use AI tools to automatically generate Playwright network interception tests that verify your application's behavior when network connectivity is"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-use-ai-to-generate-playwright-network-interception-te/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
voice-checked: true
intent-checked: true
---


{% raw %}

Testing your application's behavior when network connectivity fails is critical for delivering reliable user experiences. Users frequently encounter offline scenarios—whether they're in airplane mode, experiencing spotty connections, or navigating areas with no service. Playwright's network interception capabilities combined with AI-assisted test generation make this testing approach accessible and efficient. This guide covers everything from the basics of route interception through advanced patterns like request throttling, conditional mocking, and service worker interactions.



## Understanding Network Interception in Playwright



Playwright provides powerful APIs to intercept, modify, and mock network requests. The `page.route()` method allows you to intercept requests before they reach the network, while `page.on('request')` and `page.on('response')` listeners enable monitoring of all HTTP traffic. For offline testing specifically, you can block specific domains, abort requests, or serve cached responses.



The core mechanism involves using route patterns to match URLs and either fulfill them with custom responses or abort them entirely. This approach simulates various network failure scenarios without requiring actual network conditions.

Playwright's routing system processes interceptors in LIFO order—the last registered route handler wins for a matching request. This means you can layer route handlers and override specific patterns without dismantling broader interceptors. Understanding this ordering matters when your tests mix global setup (blocking analytics) with test-specific overrides (simulating a 503 on the search endpoint).



## Why Offline Testing Deserves Attention



Applications that fail gracefully during network outages preserve user trust and data integrity. Consider a user filling out a long form who loses connection mid-session—the application should save their progress locally and provide clear feedback. Similarly, offline-first applications like Progressive Web Apps rely heavily on proper handling of network interruptions.

The economic cost of poor offline handling is concrete. A shopping cart that silently discards locally stored items when sync fails leads to abandoned sessions that never recover. A document editor that shows a cryptic error instead of "Saved locally, will sync when reconnected" loses user confidence permanently. Automated network interception tests enforce these contracts before a single user encounters them.

Without automated tests covering these scenarios, developers often discover issues only through manual testing or, worse, from user reports. Network interception tests automate this validation, ensuring consistent behavior across code changes.



## Generating Tests with AI Assistance



AI coding assistants can accelerate network interception test creation by understanding your application's structure and generating appropriate test cases. The process involves providing context about your application's network dependencies and specifying the offline scenarios you want to test.

When prompting an AI assistant, include specifics about which API endpoints your application calls, how it handles errors, and what user-facing messages or UI states should appear when requests fail. This context helps the AI generate more accurate and relevant test code. Sharing your OpenAPI spec or a curl session log in the prompt gives the AI enough signal to choose realistic HTTP status codes and response bodies—not just generic 500s.



### Basic Offline Test Structure



A fundamental offline test intercepts network requests and simulates failure:



```javascript
import { test, expect } from '@playwright/test';

test('displays offline message when network request fails', async ({ page }) => {
  // Block all network requests to simulate offline state
  await page.route('**/*', async (route) => {
    await route.abort('failed');
  });

  await page.goto('/dashboard');

  // Verify offline indicator appears
  await expect(page.locator('.offline-banner')).toBeVisible();
  await expect(page.locator('.offline-banner')).toContainText('No internet connection');
});
```


This test blocks all requests, navigates to a page, and verifies the application displays appropriate feedback. The `route.abort('failed')` method simulates a network-level failure distinct from an HTTP error—the browser never receives a response at all, which is what truly offline conditions produce.



### Testing Specific API Endpoints



For more granular control, intercept only specific endpoints while allowing others to proceed normally:



```javascript
test('handles API failure gracefully', async ({ page }) => {
  // Intercept only the user profile API
  await page.route('**/api/user/profile', async (route) => {
    await route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    });
  });

  await page.goto('/settings');

  // Application should show error state
  await expect(page.locator('[data-testid="profile-error"]')).toBeVisible();
  await expect(page.locator('.retry-button')).toBeEnabled();
});
```


This approach tests how your application handles specific API failures while maintaining normal functionality for other requests. Keeping unrelated requests live—analytics, CDN assets, third-party widgets—means your test environment stays closer to production and catches integration edge cases that full blocking would hide.



## Handling Different Failure Types



Network interception supports various failure scenarios beyond simple aborts. You can simulate timeouts, serve stale cached data, or return custom error responses. Each failure type exercises a different code path in your application, so covering all of them meaningfully expands your test surface.



### Timeout Simulation



```javascript
await page.route('**/api/search', async (route) => {
  // Simulate slow network or unresponsive server
  await new Promise(resolve => setTimeout(resolve, 30000));
  await route.continue();
});
```

For timeout tests, pair the delayed route with Playwright's `page.setDefaultTimeout()` override so individual assertions don't fail before the UI has time to render a loading spinner or timeout message. A more production-realistic pattern is to abort after a configurable delay rather than letting the route dangle:

```javascript
await page.route('**/api/search', async (route) => {
  await new Promise(resolve => setTimeout(resolve, 8000));
  await route.abort('timedout');
});
```

This triggers the browser's network timeout path rather than a server-side one, exercising frontend timeout handling like retry prompts or graceful degradation to cached results.



### Cached Response Fallback



```javascript
const cachedData = { users: [{ id: 1, name: 'Cached User' }] };

await page.route('**/api/users', async (route) => {
  // Serve cached data when network fails
  await route.fulfill({
    status: 200,
    body: JSON.stringify(cachedData),
    headers: { 'X-From-Cache': 'true' }
  });
});
```

Testing stale-while-revalidate patterns requires verifying the UI differentiates cached content from live content. Check that staleness indicators appear, that cache timestamps update correctly, and that background refresh attempts happen after the cached render completes.



### Bandwidth Throttling



Playwright does not expose a direct throttle API, but the Chrome DevTools Protocol provides it through the `cdpSession`:

```javascript
test('shows progress indicator on slow connection', async ({ page, context }) => {
  const client = await context.newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 50 * 1024 / 8,  // 50 Kbps
    uploadThroughput: 20 * 1024 / 8,
    latency: 500
  });

  await page.goto('/heavy-dashboard');
  await expect(page.locator('.loading-progress')).toBeVisible();
  await expect(page.locator('.loading-progress')).toBeHidden({ timeout: 30000 });
});
```

This is an area where AI assistants add real value—most developers don't know the CDP API surface. Prompting Claude Code or Cursor with "simulate 3G-like conditions in Playwright" produces this pattern reliably.



## Practical Example: E-Commerce Cart Offline Handling



Consider an e-commerce application where users add items to their cart. Testing offline scenarios ensures purchases aren't lost when connectivity drops:



```javascript
test('preserves cart items during network interruption', async ({ page }) => {
  // Add item to cart while online
  await page.goto('/product/123');
  await page.click('.add-to-cart');
  await expect(page.locator('.cart-count')).toHaveText('1');

  // Simulate network failure
  await page.route('**/api/cart/**', async (route) => {
    await route.abort('failed');
  });

  // User should still see cart items
  await page.click('.cart-icon');
  await expect(page.locator('.cart-item')).toBeVisible();
  await expect(page.locator('.offline-indicator')).toBeVisible();

  // Verify items persist in local storage
  const localCart = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('cart'))
  );
  expect(localCart.items).toHaveLength(1);
});
```


This test validates that the application maintains cart state locally even when API calls fail. Extend it further by simulating reconnection and verifying the sync queue drains correctly:

```javascript
  // Restore connectivity and trigger sync
  await page.unrouteAll();
  await page.click('.sync-now-button');

  // Confirm the cart was persisted server-side
  const serverCart = await page.evaluate(async () => {
    const res = await fetch('/api/cart/current');
    return res.json();
  });
  expect(serverCart.items).toHaveLength(1);
```



## Best Practices for AI-Generated Network Tests



When using AI to generate these tests, the quality of the prompt determines the quality of the test. Vague requests produce generic scaffolding; specific requests produce production-ready tests.

Provide the AI with your application's API contract or documentation. Understanding which endpoints exist and their expected behavior helps generate more accurate interception logic. An OpenAPI YAML snippet pasted into the prompt context is worth more than a paragraph of prose describing the API.

Specify the exact error handling behavior your application implements. Different apps handle network failures differently—some show toast notifications, others display full-page errors, and some retry automatically. Telling the AI which behavior is expected means the generated assertions target the right elements.

Include assertions for both the negative case (offline state) and the positive case (successful request). This ensures your application behaves correctly in all conditions. A test that only checks the error banner doesn't verify the happy path still works after the route is cleared.

Test the recovery flow by simulating a network restoration after failure:



```javascript
test('recovers gracefully when network returns', async ({ page }) => {
  // Start offline
  await page.route('**/api/sync', async (route) => {
    await route.abort('failed');
  });

  await page.goto('/');
  await expect(page.locator('.sync-status')).toContainText('Offline');

  // Restore network
  await page.unrouteAll();

  // Trigger sync
  await page.click('.sync-button');
  await expect(page.locator('.sync-status')).toContainText('Synced');
});
```

Keep route handlers stateless where possible. If a test needs to allow the first request through and block subsequent ones, track the count with a closure variable rather than mutating shared state between tests—Playwright tests run in isolation but route handlers can leak if registered on the browser context rather than the page.



## Common Pitfalls to Avoid



Overly broad interception can mask real issues. Rather than blocking all requests, target specific endpoints that your application actually depends on. This provides more realistic test coverage and avoids accidentally preventing the page from loading its own JavaScript bundles, which turns a network resilience test into a blank-page test.

Failing to test the recovery path leaves a gap in your test suite. Users don't stay offline forever—ensure your application handles reconnection gracefully. The `page.unrouteAll()` method clears all handlers registered on the page, providing a clean slate for the recovery phase.

Ignoring timeout scenarios misses important UX considerations. A request that hangs indefinitely creates frustration; proper timeout handling improves perceived performance. Add explicit `waitFor` timeouts in assertions when testing timeout recovery so the test fails with a clear message rather than a generic timeout error from Playwright's default deadline.

Forgetting service workers is a common gap in offline test suites. If your app registers a service worker, network interception at the page level may not exercise service worker fetch handlers. Use `context.route()` to intercept at the browser context level, which runs before the service worker, or inject a fetch mock inside the service worker's scope using `page.addInitScript()`.








## Related Articles

- [How to Use AI to Generate Kubernetes Network Policies Correc](/ai-tools-compared/how-to-use-ai-to-generate-kubernetes-network-policies-correc/)
- [How to Use AI to Generate Playwright Authentication Flow Tes](/ai-tools-compared/how-to-use-ai-to-generate-playwright-authentication-flow-tes/)
- [How to Use AI to Generate Playwright Keyboard Navigation Tes](/ai-tools-compared/how-to-use-ai-to-generate-playwright-keyboard-navigation-tes/)
- [How to Use AI to Generate Playwright Tests for Iframe and](/ai-tools-compared/how-to-use-ai-to-generate-playwright-tests-for-iframe-and-cross-origin-content/)
- [Best AI Tool for Network Engineers: Runbook Writing Guide](/ai-tools-compared/best-ai-tool-for-network-engineers-runbook-writing/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
