---
layout: default
title: "How to Create Custom Instructions for AI Coding Tools That E"
description: "A practical guide to creating custom instructions for AI coding tools that enforce consistent naming conventions across your projects"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-create-custom-instructions-for-ai-coding-tools-that-e/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---
Create custom instructions for AI coding tools by documenting your specific naming conventions (snake_case for variables, PascalCase for classes, SCREAMING_SNAKE_CASE for constants) and embedding them as persistent system-level directives. Custom instructions solve the problem of AI defaulting to training data patterns by ensuring the AI applies your exact conventions automatically across all generated code.



## Why Custom Instructions Matter for Naming Conventions



Naming conventions are the backbone of maintainable codebases. They make code readable, help developers predict naming patterns, and enable tooling like autocomplete and refactoring to work effectively. When an AI coding tool ignores your conventions, you spend time manually correcting names or, worse, leave inconsistencies that confuse future developers.



Custom instructions solve this problem by embedding your preferences directly into the AI's behavior. Instead of repeatedly specifying "use snake_case for variables" in every prompt, you define it once as a persistent instruction. The AI then applies these conventions automatically across all generated code.



## Creating Effective Custom Instructions



The most effective custom instructions are specific, actionable, and cover the full scope of your naming requirements. Here is a practical framework for building them.



### Step 1: Document Your Naming Conventions



Before writing instructions, formalize your conventions. For a Python project using snake_case, your rules might include:



- Variables and functions: snake_case (e.g., `user_name`, `calculate_total`)

- Classes: PascalCase (e.g., `UserAccount`, `PaymentProcessor`)

- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)

- Files: snake_case with descriptive names (e.g., `user_authentication.py`)



### Step 2: Write Clear, Direct Instructions



AI models respond well to explicit rules formatted as requirements. Here is an example instruction set for enforcing naming conventions:



```
Always use snake_case for variable names and function names.
Always use PascalCase for class names.
Always use SCREAMING_SNAKE_CASE for constants.
File names must be lowercase with underscores.
Prefix boolean variables with 'is_', 'has_', or 'should_'.
```


### Step 3: Add Contextual Rules



Beyond basic patterns, include domain-specific rules that matter for your project:



```
Use descriptive, full words in names—avoid single letters except loop counters.
For React components, use PascalCase and include the component type in the name (e.g., UserCard, ProductList).
For database-related code, use singular nouns for table names and prefix related functions (e.g., get_user, create_user).
```


## Practical Examples Across Different Tools



### GitHub Copilot



Copilot respects instructions placed in a `.github/copilot-instructions.md` file at the repository root or in a dedicated `docs/` folder. Here is how to structure it:



```markdown
# Coding Conventions

## Naming Conventions
- Use snake_case for all variables and function names
- Use PascalCase for class names and React components
- Use SCREAMING_SNAKE_CASE for constants
- Prefix boolean variables with 'is_', 'has_', or 'should_'

## Code Style
- Prefer explicit return types for functions
- Use type hints for all function parameters and return values
- Keep functions under 30 lines
```


### Cursor



Cursor allows custom instructions through its Rules feature. You can set these in Settings > General > Rules for AI Behavior. A practical configuration looks like this:



```
When generating code, always follow these naming rules:
- Variables: snake_case (user_name, order_total)
- Functions: snake_case with verbs (get_user_data, calculate_discount)
- Classes: PascalCase (UserService, OrderHandler)
- Interfaces: PascalCase with 'I' prefix (IUserRepository)
- Constants: SCREAMING_SNAKE_CASE (API_BASE_URL)

For API endpoints, use RESTful naming:
- GET /users - get_all_users()
- GET /users/:id - get_user_by_id(id)
- POST /users - create_user(data)
- PUT /users/:id - update_user(id, data)
- DELETE /users/:id - delete_user(id)
```


### Claude Code (and Claude API-based tools)



For Claude Code or similar CLI tools, create a `CLAUDE.md` file in your project root:



```markdown
# Project Rules

## Naming Conventions

### Variables and Functions
- Use snake_case: `user_profile`, `calculate_shipping_cost`
- Function names should describe the action: `fetch_user_data`, `validate_input`

### Classes and Types
- Use PascalCase: `UserAccount`, `PaymentProcessor`
- Interfaces should not use I prefix; use descriptive names instead

### Files
- Use kebab-case for file names: `user-service.ts`, `api-client.js`
- Component files should include the type: `UserCard.vue`, `ProductList.tsx`

### Database
- Use singular table names: `user`, `order`, `product`
- Foreign keys follow pattern: `user_id`, `order_id`
```


## Testing Your Instructions



After setting up custom instructions, verify they work correctly by prompting the AI to generate sample code. Create a test file and ask the AI to populate it with various code structures:



1. Create a simple class with methods

2. Define several variables including booleans and constants

3. Write a function that returns a specific type

4. Generate an API endpoint handler



Review the output carefully. If you find violations, refine your instructions to be more specific. Common issues include:



- The AI uses camelCase instead of snake_case—add an explicit example

- Boolean prefixes are ignored—specify them in a separate rule

- File names are inconsistent—add a reminder at the end of your instructions



## Advanced Techniques



### Project-Specific Overrides



If different parts of your project require different conventions, use conditional instructions:



```
For test files, use descriptive names with _test suffix:
- test_user_authentication.py
- test_payment_processing.py

For configuration files, use all caps for environment variables:
DATABASE_URL, API_KEY, MAX_CONNECTIONS
```


### Combining with Code Review



Custom instructions work best when paired with automated linting. Configure ESLint, Pylint, or your preferred linter to catch naming violations:



```javascript
// .eslintrc.js example for naming rules
module.exports = {
  rules: {
    'camelcase': ['error', { properties: 'never' }],
    'new-cap': ['error', { capIsNew: false }],
    'no-underscore-dangle': ['error', { allow: ['_id', '_private'] }]
  }
};
```


When the AI generates code that violates your conventions, the linter catches it, creating a feedback loop that helps the AI learn from its mistakes over time.



## Maintaining Your Instructions



Naming conventions evolve as projects grow. Schedule periodic reviews of your custom instructions to ensure they remain relevant:



- Add new rules when you introduce new patterns

- Remove outdated rules that no longer apply

- Update examples to reflect current best practices

- Document the reasoning behind complex rules



Share your instructions with team members so everyone benefits from consistent AI-generated code. When developers understand why certain conventions exist, they are more likely to follow them manually and provide feedback on the instructions themselves.









## Related Reading

- [How to Create Custom Instructions for AI Tools to Generate](/ai-tools-compared/how-to-create-custom-instructions-for-ai-tools-to-generate-y/)
- [ChatGPT Custom GPT Not Following Instructions](/ai-tools-compared/chatgpt-custom-gpt-not-following-instructions/)
- [How to Set Up Custom Instructions for AI Tools to Match Your](/ai-tools-compared/how-to-set-up-custom-instructions-for-ai-tools-to-match-your/)
- [How to Write ChatGPT Custom Instructions](/ai-tools-compared/how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/)
- [How to Write Custom Instructions for AI That Follow Your](/ai-tools-compared/how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
