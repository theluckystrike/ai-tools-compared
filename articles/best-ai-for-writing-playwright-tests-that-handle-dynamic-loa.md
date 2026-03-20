---

layout: default
title: "Best AI for Writing Playwright Tests That Handle Dynamic."
description:"A practical guide to AI tools that generate Playwright tests for dynamic loading and lazy-loaded elements. Code examples and real-world testing scenarios."
date: 2026-03-16
author: theluckystrike
permalink: /best-ai-for-writing-playwright-tests-that-handle-dynamic-loa/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

{%- include why-choose-ai-playwright-tests.html -%}



Testing web applications with dynamic loading and lazy-loaded elements requires specific strategies. This guide evaluates which AI tools excel at generating Playwright tests that handle these common but tricky scenarios.



## The Challenge with Dynamic Loading in Playwright



Modern web applications frequently use lazy loading to improve initial page load times. Images load as they enter the viewport, content populates via infinite scroll, and components render only when needed. These patterns create challenges for automated testing:



- Elements don't exist in the DOM immediately

- Waiting strategies must account for network requests and DOM mutations

- Traditional `page.click()` calls fail when targets haven't loaded yet

- Race conditions between actions and dynamic content updates cause flaky tests



Playwright provides waiting mechanisms, but writing correct wait logic requires experience. AI coding assistants can generate these patterns automatically, saving significant debugging time.



## What Makes AI Good at This Specific Task



Not all AI coding assistants handle dynamic loading equally well. The best tools share several characteristics:



1. **Context awareness of Playwright's waiting API** — They know when to use `waitForSelector`, `waitForLoadState`, or custom condition functions

2. **Pattern recognition for lazy loading** — They identify common lazy loading implementations (intersection observer, infinite scroll, skeleton loaders)

3. **Error recovery suggestions** — When tests fail, they provide fixes specific to timing issues

4. **Support for modern JavaScript frameworks** — React, Vue, and Angular each handle dynamic content differently



## Top AI Tools for This Use Case



### GitHub Copilot



Copilot integrates directly into VS Code and other IDEs. For Playwright tests, it suggests appropriate waiting strategies based on context. When you start typing a click handler for a lazily-loaded button, Copilot often suggests adding a wait condition:



```javascript
// Copilot might suggest:
await page.waitForSelector('.lazy-loaded-button', { state: 'visible' });
await page.click('.lazy-loaded-button');
```


Copilot works best when you provide clear comments describing what you're testing. For dynamic content, include details like "wait for the card grid to load" or "handle the loading spinner before proceeding."



### Cursor



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


### Claude Code (Anthropic)



Claude Code handles complex test scenarios with strong reasoning about timing issues. It particularly excels at generating assertions for dynamic content:



```javascript
// Claude might suggest this comprehensive approach:
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



## Practical Testing Patterns



Regardless of which AI tool you choose, certain patterns consistently work well for dynamic loading scenarios.



### Waiting for Network Idle



When pages make API calls to populate content:



```javascript
await page.goto('/data-table');
await page.waitForLoadState('networkidle');
const rows = await page.locator('tbody tr').count();
expect(rows).toBeGreaterThan(0);
```


### Waiting for Element Visibility



For elements that appear after user interaction:



```javascript
await page.click('.open-modal');
await page.waitForSelector('.modal-content', { state: 'visible' });
await expect(page.locator('.modal-title')).toContainText('Confirm Action');
```


### Handling Infinite Scroll



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


### Waiting for Custom Conditions



For complex scenarios where built-in waits aren't enough:



```javascript
await page.waitForFunction(() => {
  const element = document.querySelector('.dynamic-content');
  return element && element.textContent.includes('Loaded');
});
```


## Recommendations by Use Case



**New Playwright project** — Start with GitHub Copilot for its IDE integration and broad language support. Its suggestions work well for standard patterns.



**Complex single-page applications** — Cursor provides better context awareness for frameworks like React with heavy dynamic content.



**Learning and understanding** — Claude Code offers more detailed explanations, making it valuable for developers still learning Playwright's waiting mechanisms.



**Mixed team environments** — All three tools work well in teams, though Copilot's ubiquity makes it the default choice for many organizations.



## Limitations to Consider



AI-generated tests require review. Common issues include:



- Overly broad selectors that match unintended elements

- Timeouts that work on fast machines but fail in CI

- Missing cleanup for test data created during execution

- Assumptions about element state that don't hold in all scenarios



Always review generated tests and adjust timeouts based on your actual application performance.



## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [AI Tools for Writing Playwright Tests That Verify.](/ai-tools-compared/ai-tools-for-writing-playwright-tests-that-verify-responsive/)
- [AI Tools for Writing Playwright Tests That Verify Accessibility WCAG Compliance Automatically](/ai-tools-compared/ai-tools-for-writing-playwright-tests-that-verify-accessibil/)
- [AI Tools for Writing Playwright Tests That Verify Toast.](/ai-tools-compared/ai-tools-for-writing-playwright-tests-that-verify-toast-noti/)

Built by

Built by theluckystrike — More at [zovo.one](https://zovo.one)
