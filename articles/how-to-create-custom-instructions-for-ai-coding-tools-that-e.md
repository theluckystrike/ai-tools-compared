---
layout: default
title: "How to Create Custom Instructions for AI Coding Tools That"
description: "A practical guide to creating custom instructions for AI coding tools that enforce consistent naming conventions across your projects"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-create-custom-instructions-for-ai-coding-tools-that-e/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


Create custom instructions for AI coding tools by documenting your specific naming conventions (snake_case for variables, PascalCase for classes, SCREAMING_SNAKE_CASE for constants) and embedding them as persistent system-level directives. Custom instructions solve the problem of AI defaulting to training data patterns by ensuring the AI applies your exact conventions automatically across all generated code.

## Table of Contents

- [Why Custom Instructions Matter for Naming Conventions](#why-custom-instructions-matter-for-naming-conventions)
- [Creating Effective Custom Instructions](#creating-effective-custom-instructions)
- [Practical Examples Across Different Tools](#practical-examples-across-different-tools)
- [Naming Conventions](#naming-conventions)
- [Code Style](#code-style)
- [Naming Conventions](#naming-conventions)
- [Testing Your Instructions](#testing-your-instructions)
- [Advanced Techniques](#advanced-techniques)
- [Context-Specific Rules](#context-specific-rules)
- [Files in /src/models/](#files-in-srcmodels)
- [Files in /src/utils/](#files-in-srcutils)
- [Files in /tests/](#files-in-tests)
- [Maintaining Your Instructions](#maintaining-your-instructions)
- [Measuring Compliance and Iterating](#measuring-compliance-and-iterating)
- [Integration with Development Workflows](#integration-with-development-workflows)

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

### Building a Test Suite

Create a structured test suite that exercises all aspects of your naming rules. This gives you confidence that the AI will follow conventions across different scenarios:

```python
# Test file: test_naming_conventions.py
# AI should generate code following your custom instructions

class UserAuthenticationService:
    """Tests class naming (PascalCase)."""

    def __init__(self):
        self.is_authenticated = False
        self.user_session_timeout = 3600
        self.MAXIMUM_RETRY_ATTEMPTS = 3

    def validate_credentials(self, username: str, password: str) -> bool:
        """Function naming (snake_case with verb)."""
        is_valid_username = len(username) > 0
        is_valid_password = len(password) > 6
        return is_valid_username and is_valid_password

    def get_session_token(self) -> str:
        """Returns session token in snake_case."""
        return "token_12345"

# After AI generates this, check:
# - Class name uses PascalCase ✓
# - Method names use snake_case with verbs ✓
# - Boolean variables prefixed with is_ ✓
# - Constants use SCREAMING_SNAKE_CASE ✓
```

Run this test through your AI tool and verify every convention. If violations occur, ask the AI to regenerate with specific feedback. Over multiple iterations, the AI learns your project's exact preferences.

### Using Linters to Validate Output

Pair your custom instructions with automated linting to catch violations immediately:

```bash
# Install linting tools
pip install pylint flake8

# Run against AI-generated code
pylint test_naming_conventions.py
flake8 --select=E501,W503 test_naming_conventions.py
```

If the linter catches violations, don't just fix them manually—feed the linter output back to the AI: "The linter reports camelCase in line X. Please regenerate using snake_case." This creates a feedback loop that dramatically improves AI compliance over time.

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

### Handling Context-Aware Naming

Some codebases require different rules based on context. You might use snake_case for utility functions but PascalCase for factory classes. Document these exceptions explicitly:

```markdown
## Context-Specific Rules

### Data Layer
- Entity classes: PascalCase (User, Order, Product)
- Repository interfaces: I{EntityName}Repository (IUserRepository)
- Database field names: snake_case (user_id, created_at)

### API Layer
- Route handlers: {action}{Resource} PascalCase (GetUser, CreateOrder)
- Request DTOs: {Entity}Request (UserRequest, OrderRequest)
- Response DTOs: {Entity}Response (UserResponse, OrderResponse)

### Utility Functions
- Helper functions: snake_case (format_date, validate_email)
- Type guards: is_{type} (is_string, is_valid_date)
- Converters: to_{format} (to_json, to_xml)
```

When you have context-specific rules, include them in your custom instructions file so the AI understands when to apply each pattern. For tools like Claude Code that accept longer instructions, you can even include file path patterns:

```markdown
# Python Project Conventions

## Files in /src/models/
- Use PascalCase for class names: UserModel, OrderModel

## Files in /src/utils/
- Use snake_case for function names: format_timestamp, parse_config

## Files in /tests/
- Use test_{module_name}.py pattern
- Use test_{function_name} for test functions
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

## Measuring Compliance and Iterating

After implementing custom instructions, track how consistently the AI follows them over time. Create a simple compliance score by counting violations in generated code:

```python
# Track naming convention compliance
violations = {
    'camelCase_in_snake_case_position': 0,
    'missing_boolean_prefix': 0,
    'incorrect_constant_format': 0,
}

# Generate 10 code samples with the same AI tool
for i in range(10):
    # Prompt AI to generate code
    generated_code = ai_tool.generate(prompt)

    # Count violations
    if 'userId' in generated_code:
        violations['camelCase_in_snake_case_position'] += 1
    if 'active = True' in generated_code:
        violations['missing_boolean_prefix'] += 1

# If compliance < 90%, refine instructions
compliance_rate = (10 - sum(violations.values())) / 10 * 100
if compliance_rate < 90:
    print("Refine instructions—compliance is too low")
    # Iterate on instructions
```

Track this over weeks. A well-written instruction set should reach 95%+ compliance within a few iterations. If you're still seeing low compliance after multiple refinements, your instructions may be conflicting with the AI's training data, and you should simplify them to focus on the most critical rules.

## Integration with Development Workflows

### Adding to CI/CD Pipelines

Integrate naming convention checks into your continuous integration pipeline to catch violations before merging:

```yaml
# .github/workflows/naming-conventions.yml
name: Check Naming Conventions
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install pylint
        run: pip install pylint
      - name: Check naming conventions
        run: |
          pylint --disable=all --enable=invalid-name src/
          if [ $? -ne 0 ]; then
            echo "Naming convention violations found"
            exit 1
          fi
```

This automated check prevents AI-generated code with poor naming from entering your codebase. Team members see the failure immediately and can ask the AI to regenerate with correct conventions.

### Documentation for Team Onboarding

New team members need clear guidance on your naming conventions. Package your custom instructions into onboarding materials:

1. Create a `NAMING_CONVENTIONS.md` file in your repository root
2. Include examples for each rule
3. Explain the rationale behind each convention
4. Link to your AI tool's custom instructions file

This prevents knowledge silos where only experienced developers understand why certain conventions exist. When new team members ask "why is it this way?", you have documented answers.

### Using Instructions Across Teams

If multiple teams use the same AI tool, establish a shared instruction set library:

```
conventions/
├── python_backend.md
├── typescript_frontend.md
├── go_microservices.md
└── shared_patterns.md
```

Each file contains the complete instruction set for that tech stack. Store this in a shared wiki or documentation site. When team members discover improvements, they submit PRs to update the instructions.

## Frequently Asked Questions

**How long does it take to create custom instructions for ai coding tools that?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Can I adapt this for a different tech stack?**

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

## Related Articles

- [How to Create Custom Instructions for AI Tools to Generate](/how-to-create-custom-instructions-for-ai-tools-to-generate-y/)
- [ChatGPT Custom GPT Not Following Instructions](/chatgpt-custom-gpt-not-following-instructions/)
- [How to Set Up Custom Instructions for AI Tools to Match Your](/how-to-set-up-custom-instructions-for-ai-tools-to-match-your/)
- [How to Write ChatGPT Custom Instructions](/how-to-write-chatgpt-custom-instructions-for-consistent-api-design-suggestions/)
- [How to Write Custom Instructions for AI That Follow Your](/how-to-write-custom-instructions-for-ai-that-follow-your-teams-code-review-standards/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
