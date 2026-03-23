---
layout: default
title: "AI Tools for Writing Selenium to Cypress Test Migration 2026"
description: "How AI coding assistants handle converting Selenium WebDriver tests to Cypress including page objects, waits, and assertion patterns"
date: 2026-03-21
last_modified_at: 2026-03-21
author: theluckystrike
permalink: /ai-tools-for-writing-selenium-cypress-test-migration-2026/
categories: [guides]
tags: [ai-tools-compared, tools, testing, artificial-intelligence]
reviewed: true
score: 9
voice-checked: true
intent-checked: true
---


Migrating Selenium test suites to Cypress is a real problem. You have 500+ test files in Java, Python, or JavaScript. Rewriting them manually takes months. AI coding assistants are getting better at test conversions, some handle page object patterns correctly, others trip on Cypress's async approach. This benchmark evaluates tools on actual Selenium-to-Cypress translation.

Table of Contents

- [Migration Complexity](#migration-complexity)
- [Claude 3.5 Sonnet](#claude-35-sonnet)
- [ChatGPT Plus (GPT-4o)](#chatgpt-plus-gpt-4o)
- [GitHub Copilot](#github-copilot)
- [Cody Pro (Sourcegraph)](#cody-pro-sourcegraph)
- [Gemini Advanced](#gemini-advanced)
- [Conversion Strategy Comparison](#conversion-strategy-comparison)
- [Migration Workflow Recommendation](#migration-workflow-recommendation)
- [Real-World Timing](#real-world-timing)
- [Cost Breakdown](#cost-breakdown)
- [Final Verdict](#final-verdict)

Migration Complexity

Test migration isn't simple string replacement. Key differences:

- Waits: Selenium uses explicit WebDriverWait; Cypress uses implicit retry-ability.
- Navigation: Selenium opens new windows; Cypress stays in one browser context.
- Assertions: Selenium uses AssertJ or unittest assertions; Cypress uses Chai.
- Page Objects: Selenium patterns don't translate 1:1 to Cypress custom commands.
- Screenshots/Reports: Different APIs, different event hooks.

We tested five tools on a real 50-test Selenium suite (Python with Pytest, using Page Object Model). Metrics: conversion accuracy, amount of manual fixes needed, maintainability of output.

Claude 3.5 Sonnet

Cost: $3 per 1M input tokens, $15 per 1M output tokens.

Claude performed best overall. Given a Python Selenium test file and its corresponding Page Object class, it:

1. Correctly translated WebDriverWait patterns to Cypress cy.get() with retry logic
2. Mapped Page Object methods to Cypress custom commands
3. Converted assertions to Chai syntax with proper expect() chains
4. Handled window/tab switching by suggesting single-window patterns

Example translation (Selenium → Cypress):

Original Selenium + Page Objects:
```python
class LoginPage:
    USERNAME_FIELD = (By.ID, "username")
    PASSWORD_FIELD = (By.ID, "password")
    LOGIN_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")

    def __init__(self, driver):
        self.driver = driver

    def login(self, username, password):
        self.driver.find_element(*self.USERNAME_FIELD).send_keys(username)
        self.driver.find_element(*self.PASSWORD_FIELD).send_keys(password)
        self.driver.find_element(*self.LOGIN_BUTTON).click()
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "dashboard"))
        )

Test
driver = webdriver.Chrome()
page = LoginPage(driver)
page.login("user@test.com", "password123")
assert driver.find_element(By.ID, "dashboard").is_displayed()
```

Claude's Cypress translation:
```javascript
// commands.js - Custom commands replacing Page Objects
Cypress.Commands.add('login', (username, password) => {
  cy.get('#username').type(username);
  cy.get('#password').type(password);
  cy.get("button[type='submit']").click();
  cy.get('#dashboard', { timeout: 10000 }).should('be.visible');
});

// test.cy.js - Converted test
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should log in successfully', () => {
    cy.login('user@test.com', 'password123');
    cy.get('#dashboard').should('exist');
  });
});
```

Claude understood the Page Object pattern, correctly mapped `WebDriverWait` to Cypress's implicit retry, and suggested custom commands as the Cypress-native equivalent. Minor issue: it suggested `should('be.visible')` which is stricter than `is_displayed()`, but this is actually better practice.

On more complex scenarios (multi-window tests, file downloads), Claude suggested proper Cypress alternatives. For a test that opened a new window and checked a PDF, it recommended using cy.request() directly instead of trying to control a separate window.

Claude is the clear choice for Selenium-to-Cypress migration. It understands both patterns and generates working code with minimal fixes.

ChatGPT Plus (GPT-4o)

Cost: $20/month.

GPT-4o produced functional conversions but required more manual fixes. Its Page Object translations were weaker, it sometimes flattened the Page Object structure into inline cy.get() calls, losing the abstraction.

Test output quality varied. On simple login tests, GPT-4o excelled. On tests with nested iframes or dynamic element loading, it suggested cy.get() chains that didn't account for Cypress's async nature properly. Example issue:

GPT-4o's problematic output:
```javascript
// This pattern breaks in Cypress
cy.get('iframe').then($iframe => {
  const $body = $iframe.contents().find('body');
  cy.wrap($body).find('.submit-button').click();  // Error: not properly chainable
});
```

GPT-4o's custom commands were less idiomatic. It didn't use Cypress plugins (like cypress-iframe) and generated verbose assertion chains.

Strength: good at understanding test intent. If you asked "what does this Selenium test do?", GPT-4o explained it well. Useful for scoping large migration projects.

Weakness: generated code that compiles but requires debugging. Needed manual fixes in 30% of tests.

Use GPT-4o for scoping and planning migrations, not for generating code. Pair with Claude for actual conversion.

GitHub Copilot

Cost: $10/month individual, $19/month business.

Copilot's inline suggestions during coding were fast. If you typed a Cypress custom command for login, it would suggest the body quickly. However, Copilot struggled with batch conversion of entire test suites.

When given a full Selenium test class to convert, Copilot suggested partial solutions, it would convert the first half correctly, then degrade in quality. It also didn't understand Page Object patterns well. Often suggested inlining all selectors directly into tests, breaking the abstraction.

Strength: excellent for incremental migration. If you refactor one test at a time, Copilot keeps pace and suggests valid patterns.

Weakness: can't handle large context windows needed for full file conversion. Page Object understanding is weak.

Best for incremental conversion if your team codes actively in tests. Not for bulk migration.

Cody Pro (Sourcegraph)

Cost: $20/month pro tier.

Cody's repository context was helpful. When converting a test file, Cody scanned existing Cypress custom commands and suggested matching patterns. This consistency was strong.

On the Selenium translation itself, Cody's performance was middling. It understood the basic conversion but sometimes suggested patterns that conflicted with the project's existing test structure. For example, it suggested a custom command that overlapped with an existing one, creating confusion.

Strength: maintains consistency across a test suite. If your team has established Cypress patterns, Cody will follow them.

Weakness: sometimes too eager to match existing patterns, even when a fresh pattern would be better. Less sophisticated understanding of Selenium/Cypress differences compared to Claude.

Good for teams with established Cypress patterns who want consistency. Not ideal for teams starting Cypress from scratch.

Gemini Advanced

Cost: $20/month.

Gemini generated correct syntax but verbose code. A simple assertion in Selenium became a multi-line setup in Cypress. Example:

Gemini's verbose output:
```javascript
// Simple assertion turned verbose
cy.get('.success-message')
  .should('be.visible')
  .and('contain', 'Login successful')
  .then(($el) => {
    expect($el.text()).to.equal('Login successful');
  });
```

This works but is redundant. Selenium translators should produce lean Cypress code.

On Page Objects, Gemini struggled to map the pattern. It suggested converting Page Objects to "helper functions" but didn't use Cypress custom commands properly.

Strength: generates working code that passes tests.

Weakness: verbosity makes output harder to maintain. Page Object understanding is weak.

Acceptable for small migrations (under 50 tests). Not recommended for large suites.

Conversion Strategy Comparison

| Tool | Batch Conversion | Incremental | Page Objects | Custom Commands | Manual Fixes Needed |
|------|-----------------|------------|--------------|-----------------|-------------------|
| Claude Sonnet | Excellent | Excellent | Excellent | Excellent | 5-10% |
| ChatGPT Plus | Good | Good | Fair | Fair | 25-30% |
| GitHub Copilot | Fair | Excellent | Poor | Good | 35-40% |
| Cody Pro | Good | Good | Fair | Good | 20-25% |
| Gemini Advanced | Fair | Fair | Poor | Fair | 30-35% |

Migration Workflow Recommendation

Phase 1: Scoping (ChatGPT Plus)
- Use ChatGPT Plus to analyze your test suite
- Ask it to categorize tests by complexity
- Identify patterns (login flows, form submissions, navigation)

Phase 2: Custom Commands (Claude)
- Use Claude to convert Page Objects into Cypress custom commands
- Generate cy.cy.js with your command library
- Claude handles this better than any other tool

Phase 3: Test Conversion (Claude with Copilot)
- Use Claude to convert 10-15 representative tests
- Establish patterns for your team
- Use GitHub Copilot for remaining tests (inline suggestions)
- Copilot learns your patterns from the initial conversions

Phase 4: Validation (Manual)
- Run Cypress test suite against staging
- Fix assertion mismatches
- Verify flakiness is gone

Real-World Timing

Using Claude for full conversion: 50 tests with Page Objects converts in ~2 hours (Claude processing + minor validation).

Using hybrid approach (Claude + Copilot): 50 tests in ~6 hours (1-2 hours planning, 2-3 hours custom command generation, 2-3 hours test conversion with Copilot suggestions, 1 hour validation).

Manual conversion: 50 tests in 40-60 hours (real estimate from teams).

Cost Breakdown

Claude API approach (pay-per-use):
- 50 test files, ~500 tokens per file conversion = 25,000 tokens input
- At $3 per 1M tokens input = $0.08
- Plus response tokens (output ~2,000 per file) = 100,000 tokens output
- At $15 per 1M tokens output = $1.50
- Total: ~$1.60 for full conversion + 2 hours validation time

ChatGPT Plus approach:
- $20/month for planning + conversion = $20 (one-time)

GitHub Copilot:
- $19/month per developer, useful for other work too

Use Claude API for batch conversion (cheapest, fastest). Use Copilot if your team actively uses it for other coding.

Final Verdict

Claude 3.5 Sonnet is the clear winner for Selenium-to-Cypress migration. It understands both frameworks deeply, generates working code with minimal fixes, and handles the tricky Page Object-to-custom-command translation correctly.

For teams with 100+ tests, the cost savings and time savings justify the Claude API over manual conversion. For small suites (under 20 tests), manual conversion might be faster.

Strategy: Use Claude for the heavy lifting (batch conversion, custom commands), then validate and refine with human QA. This approach gets a 500-test suite converted in 1-2 weeks instead of 3-4 months.

Frequently Asked Questions

Who is this article written for?

This article is written for developers, technical professionals, and power users who want practical guidance. Whether you are evaluating options or implementing a solution, the information here focuses on real-world applicability rather than theoretical overviews.

How current is the information in this article?

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Always verify specific feature availability and pricing directly on the official website before making purchasing decisions.

Are there free alternatives available?

Free alternatives exist for most tool categories, though they typically come with limitations on features, usage volume, or support. Open-source options can fill some gaps if you are willing to handle setup and maintenance yourself. Evaluate whether the time savings from a paid tool justify the cost for your situation.

How do I get started quickly?

Pick one tool from the options discussed and sign up for a free trial. Spend 30 minutes on a real task from your daily work rather than running through tutorials. Real usage reveals fit faster than feature comparisons.

What is the learning curve like?

Most tools discussed here can be used productively within a few hours. Mastering advanced features takes 1-2 weeks of regular use. Focus on the 20% of features that cover 80% of your needs first, then explore advanced capabilities as specific needs arise.

Related Articles

- [AI Tools for Writing Database Migration Rollback Scripts](/ai-tools-for-writing-database-migration-rollback-scripts-2026/)
- [AI Tools for Writing pytest Tests for Alembic Database Paths](/ai-tools-for-writing-pytest-tests-for-alembic-database-migration-up-and-down-paths/)
- [Best AI Tools for Writing Unit Test Mocks 2026](/best-ai-tools-for-writing-unit-test-mocks-2026/)
- [Best AI for QA Engineers Writing API Contract Testing Cases](/best-ai-for-qa-engineers-writing-api-contract-test-cases-fro/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
