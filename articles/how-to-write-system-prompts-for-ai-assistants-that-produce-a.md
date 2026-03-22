---
layout: default
title: "How to Write System Prompts for AI Assistants That Produce"
description: "A practical guide for developers on crafting system prompts that generate semantic, accessible HTML markup"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-write-system-prompts-for-ai-assistants-that-produce-a/
categories: [guides]
tags: [ai-tools-compared, prompts, accessibility, artificial-intelligence]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


AI assistants can generate HTML output, but without proper system prompts, the markup often lacks semantic structure, proper ARIA attributes, or keyboard accessibility. This guide shows you how to write system prompts that consistently produce accessible, standards-compliant HTML.


## Why Accessible HTML Matters for AI Output


When an AI assistant generates HTML fragments for your application, that code becomes part of your user interface. If the output lacks proper heading hierarchy, missing alt text on images, or no keyboard navigation support, you inherit accessibility violations that affect real users. Rather than fixing generated code manually, you can embed accessibility requirements directly into your system prompts.

WCAG 2.1 AA is the benchmark most organizations target. It covers perceivability (text alternatives, adaptable content, distinguishable presentation), operability (keyboard access, timing, navigation), understandability (readable text, predictable behavior, input assistance), and robustness (compatibility with assistive technologies). AI-generated HTML that does not meet these criteria can expose your organization to legal risk and—more importantly—exclude users who rely on screen readers, keyboard navigation, or other assistive tools.


## Core Principles for System Prompts


Effective system prompts for accessible HTML follow three principles: specificity, constraint specification, and example inclusion.


### Be Specific About Standards


Your system prompt should explicitly reference accessibility standards. Vague instructions like "make it accessible" produce inconsistent results. Instead, name specific standards and provide concrete rules.


A weak prompt:

```
Generate HTML for a product card component.
```


A strong prompt:

```
Generate HTML for a product card component. All markup must be semantic HTML5. Use the <article> element for the card container. Include proper heading hierarchy with <h3> for the product title. Any images must include descriptive alt attributes. Ensure all interactive elements are keyboard accessible.
```


The difference is measurable. The weak prompt produces a div-heavy layout with no ARIA attributes and a generic img tag. The strong prompt produces an article element, a headed hierarchy, and alt text that describes the product.


### Specify Constraints Explicitly


HTML generation often fails on constraints that seem obvious to developers but are ambiguous to AI models. List your requirements as explicit rules.


```
Your output must follow these rules:
1. All <button> elements must include visible, descriptive text or aria-label
2. Form inputs must always include associated <label> elements
3. Links must have meaningful text, never "click here" or "read more"
4. Use <nav> for navigation regions, <main> for primary content, <footer> for footer
5. Any element hidden from screen readers must use aria-hidden="true"
```


### Include Negative Constraints


Positive rules tell the model what to do. Negative constraints tell it what to avoid. Both matter. AI models trained on large codebases have encountered countless examples of inaccessible patterns—placeholder-as-label, onclick on divs, decorative images without empty alt text. Explicitly banning these patterns reduces their occurrence in output.


## Practical System Prompt Examples


Here are three system prompts you can adapt for different use cases.


### Example 1: Form Components


```
You generate HTML form components. Follow these accessibility requirements:

- All form fields must use explicit <label for="..."> elements linked via the for attribute
- Error messages must use aria-describedby to associate with inputs
- Required fields must include aria-required="true"
- Use fieldset and legend for grouped controls like radio buttons
- Generate ARIA live regions for dynamic error messages
- Tab order must follow visual layout

Return only the HTML markup with inline comments explaining accessibility decisions.
```


### Example 2: Data Tables


```
Generate HTML tables with proper accessibility structure:

- Use <caption> as the first child of <table> for table description
- Use <th> with scope attribute for header cells
- For complex tables, use headers and id attributes
- Never use tables for layout
- Include summary attribute on <table> for screen readers
- Ensure proper td/th relationships for cell association

Output semantic markup only, no CSS classes.
```


### Example 3: Modal Dialogs


```
Generate accessible modal dialog HTML:

- Use <dialog> element as the modal container
- Include autofocus on the modal container when opened
- Trap focus within the modal when active
- Include role="dialog" and aria-modal="true" on the dialog element
- The dialog must have an accessible name via aria-label or aria-labelledby
- Include a close button with aria-label="Close"
- Ensure the modal can be closed with Escape key

Return clean, semantic HTML5 markup.
```


## Writing Prompts for Specific AI Tools


System prompt behavior varies across tools. Understanding these differences helps you write prompts that work reliably.

**Claude (via API or Claude.ai Projects):** Claude responds well to structured rules lists with numbered constraints. Use the Projects feature to store your accessibility system prompt persistently, so it applies to every conversation without re-pasting.

**ChatGPT (via Custom GPTs or API):** OpenAI's system prompt field in the API behaves consistently. Custom GPTs allow you to embed instructions in the configuration interface. For HTML generation tasks, including a brief example of desired output in the system prompt significantly improves consistency.

**GitHub Copilot Chat:** Copilot Chat does not have a traditional system prompt mechanism, but you can prepend a rules block to your chat messages. Saving a snippet with your accessibility rules makes this repeatable.

**Cursor AI:** Use the `.cursorrules` file to define persistent instructions. For HTML generation, add a dedicated section specifying semantic requirements. Cursor applies these rules to every generation in the project.

The underlying principle is the same across tools: persistent, explicit, structured rules outperform ad hoc prompting.


## Combining Prompts with Output Validation


System prompts guide generation, but you should validate output automatically. Consider adding a post-processing step that checks for common accessibility issues.


A simple validation approach checks for these patterns:


```javascript
function validateAccessibleHTML(html) {
  const issues = [];

  // Check for missing alt text
  if (html.includes('<img') && !html.includes('alt=')) {
    issues.push('Images missing alt attributes');
  }

  // Check for missing labels
  if (html.includes('<input') && !html.includes('<label')) {
    issues.push('Form inputs missing label elements');
  }

  // Check for empty links
  const emptyLinks = html.match(/<a[^>]*>\s*<\/a>/g);
  if (emptyLinks) {
    issues.push('Found empty links with no accessible text');
  }

  // Check for div-based buttons
  if (html.match(/<div[^>]*onclick/i)) {
    issues.push('Interactive div elements found — use button instead');
  }

  return issues;
}
```

For production workflows, replace this manual check with an established library. `axe-core` can run in Node.js and validate HTML strings programmatically. `html-validate` offers a ruleset specifically aligned with WCAG. Running either after AI generation catches issues before they reach your codebase.


## Testing Generated Output


After implementing your system prompt, verify the output with accessibility tools:


1. Use the WAVE evaluator or axe DevTools to scan generated pages

2. Test keyboard navigation manually—can you tab through all interactive elements?

3. Use a screen reader to experience the content as users would; NVDA (Windows, free), JAWS (Windows, paid), and VoiceOver (macOS/iOS, built-in) are the most widely used

4. Check color contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)

5. Run Lighthouse in Chrome DevTools and aim for an Accessibility score above 90


## Common Pitfalls to Avoid


Several patterns consistently produce inaccessible HTML:


- Using `<div>` and `<span>` for interactive elements instead of `<button>` or `<a>`

- Relying solely on color to convey information

- Missing form labels because placeholder text exists

- Creating content that requires mouse interaction

- Using generic link text like "here" or "read more"

- Generating images with missing or empty alt text when images are informative


Add these as explicit exclusions in your system prompts:


```
Never do the following:
- Use <div onclick=""> for interactive elements
- Use placeholder as a substitute for labels
- Create links with non-descriptive text
- Use <img> without alt attribute
- Rely on color alone to convey meaning
- Skip heading levels (e.g., jump from h1 to h3)
```


## Putting It All Together


A complete system prompt for accessible HTML might look like:


```
You generate HTML components that meet WCAG 2.1 AA accessibility standards.

Requirements:
1. Use semantic HTML5 elements appropriately (header, nav, main, article, section, footer)
2. All images must include alt text describing their content or function
3. Form elements must have associated <label> elements
4. Interactive elements must be keyboard accessible
5. Use ARIA attributes only when semantic HTML is insufficient
6. Headings must follow proper hierarchy (h1 → h2 → h3, no skipping levels)
7. Links must have descriptive, unique text

Exclusions:
- Never use empty alt="" unless the image is decorative
- Never use div for buttons or links
- Never omit required ARIA attributes on interactive widgets

Output only the HTML markup without additional explanation.
```

Treat this prompt as a living document. As your projects evolve—adding new component types, adopting new frameworks, or responding to audit findings—update the prompt to reflect new requirements. Version-control your system prompts alongside your code so changes are traceable and reversible.


## Frequently Asked Questions


**How long does it take to write system prompts for accessible HTML generation?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your accessibility standards documented before starting saves significant time.


**What are the most common mistakes to avoid?**

The most frequent issues are vague constraints ("make it accessible"), not testing generated output with real tools, and skipping negative constraints. Follow the steps in order, verify each generation works before moving on, and check axe or WAVE to confirm compliance.


**Do I need prior experience to follow this guide?**

Basic familiarity with HTML and WCAG guidelines is helpful but not strictly required. Each step is explained with context. If you get stuck, the MDN Web Docs accessibility section and the official WCAG 2.1 specification cover fundamentals that fill in knowledge gaps.


**Can I adapt this for a different tech stack?**

Yes, the underlying concepts transfer to other stacks. For React, you would adapt these HTML patterns to JSX—for example, `htmlFor` instead of `for` on label elements. For Vue, the same semantic principles apply within template blocks. The accessibility requirements are framework-agnostic.


**Where can I get help if I run into issues?**

Start with the official WCAG 2.1 documentation and the axe-core GitHub repository. The WebAIM community forum and the A11y Project Slack are active resources for accessibility-specific questions. For prompt engineering issues, Anthropic's and OpenAI's developer documentation cover system prompt behavior in detail.


## Related Articles

- [How to Write System Prompts for AI Coding Assistants Project](/ai-tools-compared/how-to-write-system-prompts-for-ai-coding-assistants-project/)
- [Writing Effective System Prompts for AI Coding Assistants](/ai-tools-compared/writing-effective-system-prompts-for-ai-coding-assistants-th/)
- [How to Create Custom System Prompts for AI That Match Your](/ai-tools-compared/how-to-create-custom-system-prompts-for-ai-that-match-your-d/)
- [How to Migrate ChatGPT System Prompts](/ai-tools-compared/migrate-chatgpt-system-prompts-to-claude-system-prompt-forma/)
- [Migrate ChatGPT System Prompts](/ai-tools-compared/migrate-chatgpt-system-prompts-to-claude-system-prompt-format/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
