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
  
  return issues;
}
```


## Testing Generated Output



After implementing your system prompt, verify the output with accessibility tools:



1. Use the WAVE evaluator or axe DevTools to scan generated pages

2. Test keyboard navigation manually—can you tab through all interactive elements?

3. Use a screen reader to experience the content as users would

4. Check color contrast ratios meet WCAG AA standards (4.5:1 for normal text)



## Common Pitfalls to Avoid



Several patterns consistently produce inaccessible HTML:



- Using <div> and <span> for interactive elements instead of <button> or <a>

- Relying solely on color to convey information

- Missing form labels because placeholder text exists

- Creating content that requires mouse interaction

- Using generic link text like "here" or "read more"



Add these as explicit exclusions in your system prompts:



```
Never do the following:
- Use <div onclick=""> for interactive elements
- Use placeholder as a substitute for labels
- Create links with non-descriptive text
- Use <img> without alt attribute
- Rely on color alone to convey meaning
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






## Related Articles

- [How to Write System Prompts for AI Coding Assistants Project](/ai-tools-compared/how-to-write-system-prompts-for-ai-coding-assistants-project/)
- [Writing Effective System Prompts for AI Coding Assistants](/ai-tools-compared/writing-effective-system-prompts-for-ai-coding-assistants-th/)
- [How to Create Custom System Prompts for AI That Match Your](/ai-tools-compared/how-to-create-custom-system-prompts-for-ai-that-match-your-d/)
- [How to Migrate ChatGPT System Prompts](/ai-tools-compared/migrate-chatgpt-system-prompts-to-claude-system-prompt-forma/)
- [Migrate ChatGPT System Prompts](/ai-tools-compared/migrate-chatgpt-system-prompts-to-claude-system-prompt-format/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
