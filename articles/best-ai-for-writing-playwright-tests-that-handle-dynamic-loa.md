---
layout: default
title: "Best AI for Writing Playwright Tests That Handle Dynamic"
description: "A practical guide to AI tools that generate Playwright tests for dynamic loading and lazy-loaded elements. Code examples and real-world testing scenarios"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /best-ai-for-writing-playwright-tests-that-handle-dynamic-loa/
categories: [guides]
tags: [ai-tools-compared, tools, best-of, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Testing web applications with dynamic loading and lazy-loaded elements requires specific strategies. This guide evaluates which AI tools excel at generating Playwright tests that handle these common but tricky scenarios.

Table of Contents

- [The Challenge with Dynamic Loading in Playwright](#the-challenge-with-dynamic-loading-in-playwright)
- [What Makes AI Good at This Specific Task](#what-makes-ai-good-at-this-specific-task)
- [Top AI Tools for This Use Case](#top-ai-tools-for-this-use-case)
- [AI Tool Comparison at a Glance](#ai-tool-comparison-at-a-glance)
- [Practical Testing Patterns](#practical-testing-patterns)
- [Step-by-Step Workflow: Using AI to Write a Dynamic Loading Test](#step-by-step-workflow-using-ai-to-write-a-dynamic-loading-test)
- [Handling Intersection Observer-Based Lazy Loading](#handling-intersection-observer-based-lazy-loading)
- [Common Pitfalls and How AI Tools Help Avoid Them](#common-pitfalls-and-how-ai-tools-help-avoid-them)
- [Pro Tips for Getting Better AI Output](#pro-tips-for-getting-better-ai-output)
- [Recommendations by Use Case](#recommendations-by-use-case)
- [Limitations to Consider](#limitations-to-consider)

The Challenge with Dynamic Loading in Playwright

Modern web applications frequently use lazy loading to improve initial page load times. Images load as they enter the viewport, content populates via infinite scroll, and components render only when needed. These patterns create challenges for automated testing:

- Elements don't exist in the DOM immediately

- Waiting strategies must account for network requests and DOM mutations

- Traditional `page.click()` calls fail when targets haven't loaded yet

- Race conditions between actions and dynamic content updates cause flaky tests

Playwright provides waiting mechanisms, but writing correct wait logic requires experience. AI coding assistants can generate these patterns automatically, saving significant debugging time.

What Makes AI Good at This Specific Task

Not all AI coding assistants handle dynamic loading equally well. The best tools share several characteristics:

1. Context awareness of Playwright's waiting API. They know when to use `waitForSelector`, `waitForLoadState`, or custom condition functions

2. Pattern recognition for lazy loading. They identify common lazy loading implementations (intersection observer, infinite scroll, skeleton loaders)

3. Error recovery suggestions. When tests fail, they provide fixes specific to timing issues

4. Support for modern JavaScript frameworks. React, Vue, and Angular each handle dynamic content differently

Top AI Tools for This Use Case

GitHub Copilot

Copilot integrates directly into VS Code and other IDEs. For Playwright tests, it suggests appropriate waiting strategies based on context. When you start typing a click handler for a lazily-loaded button, Copilot often suggests adding a wait condition:

```javascript
// Copilot might suggest:
await page.waitForSelector('.lazy-loaded-button', { state: 'visible' });
await page.click('.lazy-loaded-button');
```

Copilot works best when you provide clear comments describing what you're testing. For dynamic content, include details like "wait for the card grid to load" or "handle the loading spinner before proceeding."

Cursor

Cursor's AI features include more aggressive context understanding. It can analyze your existing test files and project structure to generate more accurate waits. Cursor excels at:

- Suggesting `waitForResponse` when tests involve API calls

- Generating custom waiting functions for complex loading sequences

- Identifying when to use `networkidle` versus `domcontentloaded`

```javascript
// Cursor might generate this pattern:
await page.waitForResponse(response =>
  response.url().includes('/api/products') &&
  response.status() === 200
);
await expect(page.locator('.product-card')).toHaveCount(greaterThan(0));
```

Claude Code (Anthropic)

Claude Code handles complex test scenarios with strong reasoning about timing issues. It particularly excels at generating assertions for dynamic content:

```javascript
// Claude might suggest this full approach:
await page.goto('/dashboard');

// Wait for skeleton to disappear (loading complete)
await page.waitForSelector('.skeleton-loader', { state: 'hidden' });

// Wait for actual content
await expect(page.locator('.dashboard-content')).toBeVisible({ timeout: 10000 });

// For infinite scroll, handle pagination
const loadMoreButton = page.locator('.load-more');
while (await loadMoreButton.isVisible()) {
  await loadMoreButton.click();
  await page.waitForTimeout(500); // Allow new content to render
}
```

Claude Code also provides good explanations of why certain wait strategies are needed, helping developers learn best practices.

AI Tool Comparison at a Glance

| Feature | GitHub Copilot | Cursor | Claude Code |
|---|---|---|---|
| IDE integration | Native VS Code / JetBrains | Native in Cursor editor | CLI + VS Code extension |
| Dynamic wait suggestions | Good for common patterns | Excellent with project context | Excellent with reasoning |
| Framework awareness | Broad (React, Vue, Angular) | Context-driven | Strong reasoning on any stack |
| Explanation quality | Minimal inline comments | Moderate | Detailed explanations |
| Best for | Standard patterns, large teams | SPA-heavy projects | Learning and complex flows |
| Subscription cost | $10–19/month | $20/month | Pay-per-use / Pro plan |

Practical Testing Patterns

Regardless of which AI tool you choose, certain patterns consistently work well for dynamic loading scenarios.

Waiting for Network Idle

When pages make API calls to populate content:

```javascript
await page.goto('/data-table');
await page.waitForLoadState('networkidle');
const rows = await page.locator('tbody tr').count();
expect(rows).toBeGreaterThan(0);
```

Waiting for Element Visibility

For elements that appear after user interaction:

```javascript
await page.click('.open-modal');
await page.waitForSelector('.modal-content', { state: 'visible' });
await expect(page.locator('.modal-title')).toContainText('Confirm Action');
```

Handling Infinite Scroll

A common pattern requiring multiple waits:

```javascript
async function scrollToLoadAllItems() {
  const initialCount = await page.locator('.item').count();

  while (true) {
    await page.locator('.load-more').click();
    await page.waitForTimeout(1000);

    const newCount = await page.locator('.item').count();
    if (newCount === initialCount) break;
  }
}
```

Waiting for Custom Conditions

For complex scenarios where built-in waits aren't enough:

```javascript
await page.waitForFunction(() => {
  const element = document.querySelector('.dynamic-content');
  return element && element.textContent.includes('Loaded');
});
```

Step-by-Step Workflow: Using AI to Write a Dynamic Loading Test

Here is a repeatable workflow for getting quality dynamic-load tests from any AI tool.

Step 1. Describe the loading pattern clearly. AI tools perform best when you explain the mechanism: "The page uses an IntersectionObserver to load product cards as the user scrolls. The first batch of 12 cards loads immediately; additional batches of 12 load as the user reaches the bottom."

Step 2. Provide the HTML structure. Paste a snippet of the relevant HTML or component code into the prompt. AI tools that can see the actual class names and data attributes generate more accurate selectors.

Step 3. Specify the assertion goal. Tell the AI exactly what you want to verify: "Assert that at least 36 product cards are visible after three scroll cycles."

Step 4. Ask for error handling. Prompt the AI to add a timeout guard: "Add a maximum of 10 scroll attempts so the test fails cleanly if content never loads."

Step 5. Request a helper function. For reusable scroll logic, ask the AI to extract the waiting into a utility function your whole test suite can import.

A complete prompt to Claude Code might look like this:

```
Write a Playwright test that:
1. Navigates to /products
2. Waits for the initial 12 product cards to load (class: .product-card)
3. Scrolls to the bottom and waits for the next 12 cards
4. Repeats until 36 cards are visible or 10 scroll attempts are exhausted
5. Asserts exactly 36 cards are visible
6. Extracts the scroll-and-wait logic into a helper function
```

The resulting test is production-ready and handles the edge case of a slow network connection.

Handling Intersection Observer-Based Lazy Loading

Intersection observer lazy loading is one of the trickiest patterns for Playwright because no button is clicked. the browser automatically triggers loads as elements enter the viewport. The correct approach is to scroll the page programmatically and then wait for the DOM to update:

```javascript
async function triggerLazyLoad(page, targetCount) {
  let previousCount = 0;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const currentCount = await page.locator('.lazy-image').count();
    if (currentCount >= targetCount) break;
    if (currentCount === previousCount) break; // No new content loaded

    previousCount = currentCount;
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(800); // Give IntersectionObserver time to fire
    attempts++;
  }

  return await page.locator('.lazy-image').count();
}

test('loads at least 20 images via lazy loading', async ({ page }) => {
  await page.goto('/gallery');
  await page.waitForLoadState('domcontentloaded');

  const loadedCount = await triggerLazyLoad(page, 20);
  expect(loadedCount).toBeGreaterThanOrEqual(20);
});
```

Claude Code generates this pattern reliably when you describe the intersection observer mechanism. GitHub Copilot usually suggests the scroll logic but may omit the early-exit guard that prevents infinite loops.

Common Pitfalls and How AI Tools Help Avoid Them

Hardcoded timeouts. Using `page.waitForTimeout(2000)` is fragile. AI tools increasingly suggest replacing these with event-driven waits. Claude Code in particular will flag hardcoded waits and suggest `waitForSelector` or `waitForResponse` instead.

Overly broad selectors. `div.container > div` matches too many elements. AI tools with project context (Cursor) generate more specific locators by reading your component files.

Missing `networkidle` after navigation. Many developers forget that `page.goto()` resolves on `domcontentloaded` by default, not after API calls complete. All three tools suggest adding `waitForLoadState('networkidle')` when you describe an API-driven page.

No cleanup after test data creation. If your test creates database records, forgetting to delete them causes contamination. Claude Code often adds cleanup steps when you describe tests that write data.

CI timeout mismatches. Tests that pass locally on a fast machine fail in CI because timeouts are too short. A useful AI prompt: "Review these timeouts assuming a CI environment with 50% slower network than local dev."

Pro Tips for Getting Better AI Output

- Show don't just tell: Paste the actual error message from a failing test. AI tools diagnose flaky tests far more accurately when they see the stack trace.

- Use role-based locators: Ask AI tools to prefer `page.getByRole()` and `page.getByText()` over CSS selectors. These locators are more resilient to markup changes.

- Request retry logic: For particularly flaky interactions, ask for exponential backoff retry wrappers around the most fragile assertions.

- Ask for TypeScript types: If your project uses TypeScript, specify this so the AI generates properly typed helper functions.

- Chain prompts iteratively: Generate the basic test first, then ask the AI to add error handling, then ask it to add logging, rather than trying to get everything in one prompt.

Recommendations by Use Case

New Playwright project. Start with GitHub Copilot for its IDE integration and broad language support. Its suggestions work well for standard patterns.

Complex single-page applications. Cursor provides better context awareness for frameworks like React with heavy dynamic content.

Learning and understanding. Claude Code offers more detailed explanations, making it valuable for developers still learning Playwright's waiting mechanisms.

Mixed team environments. All three tools work well in teams, though Copilot's ubiquity makes it the default choice for many organizations.

Frequently Asked Questions

Q: Why does my AI-generated Playwright test pass locally but fail in CI?
A: CI environments have slower network connections and lower CPU allocation. Increase timeout values and replace hardcoded `waitForTimeout` calls with deterministic waits like `waitForSelector` or `waitForResponse`. Ask your AI tool: "Audit this test for timeouts that may be too short in a slow CI environment."

Q: Can AI tools handle tests for server-side rendered pages that hydrate dynamically?
A: Yes, but you need to describe the hydration pattern explicitly. Tell the AI that the page renders HTML server-side and then React (or Vue) hydrates the components. The correct wait is usually `waitForFunction` checking for a hydration-complete signal in the DOM.

Q: Which AI tool handles shadow DOM best for dynamic content?
A: Claude Code handles shadow DOM reasoning most reliably when you describe the shadow root structure. Playwright's `locator.piercing()` option and `page.locator('css=your-element >> css=inner-element')` patterns are correctly generated when you specify "the content is inside a shadow DOM."

Q: How do I test infinite scroll without a "load more" button?
A: Scroll-triggered loading requires programmatic scrolling. Provide the AI with the scroll container selector and target item count. Ask for a helper function that scrolls, waits for DOM changes, and repeats until the target is met or a maximum iteration count is exceeded.

Q: Do AI tools generate Playwright tests in TypeScript or JavaScript?
A: All three tools default to JavaScript unless you specify TypeScript. Add "use TypeScript with strict mode" to your prompt or include a TypeScript example in your prompt for the AI to match the style.

Limitations to Consider

AI-generated tests require review. Common issues include:

- Overly broad selectors that match unintended elements

- Timeouts that work on fast machines but fail in CI

- Missing cleanup for test data created during execution

- Assumptions about element state that don't hold in all scenarios

Always review generated tests and adjust timeouts based on your actual application performance.

Related Articles

- [Best AI Tools for Writing Playwright Tests 2026](/best-ai-tools-for-writing-playwright-tests-2026/)
- [Best AI Tools for Writing Playwright E2E Tests 2026](/best-ai-tools-for-writing-playwright-e2e-tests-2026/)
- [Which AI Is Better for Writing Playwright End-to-End Tests](/which-ai-is-better-for-writing-playwright-end-to-end-tests-2/)
- [AI Tools for Writing Playwright Tests That Verify Accessibil](/ai-tools-for-writing-playwright-tests-that-verify-accessibil/)
- [AI Tools for Writing Playwright Tests That Verify Responsive](/ai-tools-for-writing-playwright-tests-that-verify-responsive/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
