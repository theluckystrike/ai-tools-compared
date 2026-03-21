---
layout: default
title: "Best Practices for Writing GitHub Copilot Custom Instruction"
description: "A practical guide for developers on writing effective GitHub Copilot custom instructions in VSCode settings. Learn how to configure Copilot to match"
date: 2026-03-16
author: theluckystrike
permalink: /best-practices-for-writing-github-copilot-custom-instruction/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, best-of]
---


{% raw %}

GitHub Copilot Custom Instructions transform how developers interact with AI-assisted coding. Rather than accepting generic suggestions, you can configure Copilot to understand your project's conventions, coding preferences, and team standards. This guide covers practical strategies for writing custom instructions that genuinely improve your development workflow.



## Understanding Copilot Custom Instructions



GitHub Copilot reads custom instructions from your VSCode settings file (`settings.json`). These instructions act as persistent context that Copilot considers when generating code suggestions. Unlike inline comments that apply to a single session, custom instructions remain active across all your coding sessions within that workspace.



To access custom instructions, open VSCode settings and navigate to GitHub Copilot > Chat, or directly edit your `.vscode/settings.json` file. The key setting is `github.copilot.chat.instructions`, where you define your custom guidelines.



## Structuring Your Custom Instructions



Effective custom instructions follow a clear structure. Group related rules together and use consistent formatting. A well-organized instruction file helps Copilot understand and apply your guidelines accurately.



### Define Your Code Style Preferences



Start by specifying your team's coding conventions. This includes indentation, naming patterns, and language-specific preferences.



```json
{
  "github.copilot.chat.instructions": [
    "# Code Style Guidelines",
    "- Use 2 spaces for indentation",
    "- Use const by default, reserve let for mutable variables",
    "- Avoid var declarations",
    "- Use meaningful variable names (minimum 3 characters)",
    "- Prefer single quotes for JavaScript strings"
  ]
}
```


These style guidelines ensure Copilot generates code that matches your existing codebase. When working on a JavaScript project with specific conventions, stating these preferences eliminates the need to manually correct generated code.



### Specify Documentation Requirements



Documentation standards vary across teams and projects. Your custom instructions should clearly state what Copilot should include when generating code.



```json
{
  "github.copilot.chat.instructions": [
    "# Documentation Standards",
    "- Add JSDoc comments for all exported functions",
    "- Document function parameters with @param and @returns",
    "- Include type annotations in TypeScript files",
    "- Add inline comments for complex logic (complexity > 5)",
    "- Write descriptive commit messages following conventional commits format"
  ]
}
```


By defining documentation requirements upfront, you receive fully documented code that meets team standards without additional prompting.



### Set Testing Expectations



Testing requirements often get overlooked in custom instructions. Including testing guidelines ensures Copilot generates testable code and suggests appropriate tests.



```json
{
  "github.copilot.chat.instructions": [
    "# Testing Requirements",
    "- Write unit tests for all exported functions",
    "- Use Jest syntax for JavaScript/TypeScript projects",
    "- Include both positive and negative test cases",
    "- Mock external dependencies in tests",
    "- Name test files with .test.ts or .spec.ts convention"
  ]
}
```


## Language-Specific Configuration



Different programming languages require different approaches. Creating language-specific instructions helps Copilot generate more accurate code.



```json
{
  "github.copilot.chat.instructions": [
    "# Python Conventions",
    "- Use snake_case for function and variable names",
    "- Use PascalCase for class names",
    "- Follow PEP 8 style guide",
    "- Add type hints to function signatures",
    "- Use list/dict comprehensions when appropriate",
    "- Prefer f-strings over .format() or % formatting",
    "",
    "# TypeScript Conventions",
    "- Enable strict mode in TypeScript config",
    "- Use interfaces over types for object shapes",
    "- Prefer explicit return types for functions",
    "- Use readonly for immutable arrays and objects"
  ]
}
```


## Project-Specific Context



Custom instructions become powerful when they reflect your specific project structure and patterns. Include details about your architecture and commonly used patterns.



```json
{
  "github.copilot.chat.instructions": [
    "# Project Architecture",
    "- Follow the repository structure: src/features/*, src/shared/*, src/api/*",
    "- Use feature-based folder organization",
    "- Place shared utilities in src/shared/utils/",
    "- API calls go through services in src/api/",
    "- Use the repository pattern for database operations",
    "- Implement error handling with custom error classes"
  ]
}
```


## Practical Examples



Let us examine how these instructions work in practice. Consider a scenario where you need an utility function. Without custom instructions, Copilot might generate something basic. With properly configured instructions, it produces production-ready code.



**Before (generic output):**

```typescript
function getUser(id) {
  return fetch('/api/users/' + id).then(res => res.json());
}
```


**After (with custom instructions applied):**

```typescript
/**
 * Fetches a user by their unique identifier.
 * @param id - The user's unique identifier
 * @returns A promise resolving to the user object
 * @throws {ApiError} When the user is not found
 */
async function getUserById(id: string): Promise<User> {
  const response = await fetch(`/api/users/${encodeURIComponent(id)}`);
  
  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch user: ${response.statusText}`,
      response.status
    );
  }
  
  return response.json();
}
```


The difference stems from clear documentation requirements and architecture guidelines in the custom instructions.



## Iteration and Refinement



Writing effective custom instructions requires iteration. Start with broad guidelines and refine based on Copilot's responses. Track which suggestions work well and adjust accordingly.



Maintain a separate reference document for your instructions. This makes it easier to share configurations across projects or team members. Update these instructions when team standards evolve.



## Common Mistakes to Avoid



Several pitfalls reduce the effectiveness of custom instructions. Avoid writing overly long instructions that become difficult to maintain. Remove conflicting or redundant rules that confuse Copilot's interpretation.



Do not include instructions that conflict with your project's linter or formatter rules. Copilot should complement your existing tools, not contradict them. Ensure your instructions align with your CI/CD pipeline checks.



## Sharing Configuration Across Teams



Team environments benefit from shared custom instruction files. Store your configuration in a repository-accessible location and reference it in each developer's settings. This ensures consistency across the entire team.



Use version control for your instruction files. Track changes and review modifications just like code. This practice maintains historical context and helps knowledge transfer.



## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [Writing Custom Instructions That Make AI Follow Your Team's Changelog Entry Format](/ai-tools-compared/writing-custom-instructions-that-make-ai-follow-your-teams-changelog-entry-format/)
- [How to Use Copilot for Writing CI CD Pipelines in GitHub.](/ai-tools-compared/how-to-use-copilot-for-writing-ci-cd-pipelines-in-github-act/)
- [Best Practices for Writing Cursorrules File That.](/ai-tools-compared/best-practices-for-writing-cursorrules-file-that-improves-co/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
