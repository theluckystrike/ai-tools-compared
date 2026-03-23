---
layout: default
title: "How to Get AI Code Suggestions That Follow Your Project"
description: "Learn practical methods to make AI code completion tools respect your project's naming conventions. Configuration tips, code examples, and strategies for"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-get-ai-code-suggestions-that-follow-your-project-naming-conventions/
categories: [guides]
tags: [ai-tools-compared, tools, productivity, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


AI tools follow your naming conventions when you include examples in your codebase context and explicitly mention conventions in prompts. This guide shows which tool configurations, context inclusions, and prompt phrasings actually enforce your naming standards versus producing generic names.

AI code completion tools have transformed how developers write code, but one persistent challenge remains: getting these tools to respect your project's specific naming conventions. Whether you use snake_case, camelCase, PascalCase, or custom prefixes, training your AI assistant to match your codebase conventions saves significant editing time and maintains code consistency across your team.

## Table of Contents

- [Why Naming Conventions Matter for AI Suggestions](#why-naming-conventions-matter-for-ai-suggestions)
- [Prerequisites](#prerequisites)
- [Measuring Naming Convention Compliance](#measuring-naming-convention-compliance)
- [Troubleshooting](#troubleshooting)

## Why Naming Conventions Matter for AI Suggestions

AI code models trained on vast datasets develop their own preferences for variable naming, function names, and class names. When these preferences clash with your project standards, you face constant manual corrections. A function named `calculate_user_order_total` in your snake_case Python project becomes `calculateUserOrderTotal` when Copilot suggests it—exactly backwards for Python's PEP 8 guidelines.

This mismatch creates friction in several ways. You waste time refactoring AI suggestions, team code reviews surface style inconsistencies, and new team members receive mixed signals about naming standards. The solution involves configuring your AI tools to learn from your existing codebase.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Configure GitHub Copilot for Your Conventions

GitHub Copilot offers several configuration options that influence its suggestions. The most effective approach combines editor settings with context awareness.

Create or modify your `.vscode/settings.json` if using VS Code:

```json
{
  "editor.tabSize": 4,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.py": "python",
    "*.js": "javascript"
  }
}
```

Beyond editor settings, Copilot learns from your codebase through open file context. Keep relevant files open while coding—Copilot analyzes patterns in your currently open files and generates suggestions that match those patterns. For consistent naming, maintain a reference file with example function and variable declarations that demonstrate your conventions.

GitHub Copilot also respects language server protocols. If your project uses a linter or formatter configured for specific conventions, Copilot observes these settings when generating code.

### Step 2: Training Cursor to Match Your Style

Cursor, built on VS Code, provides more direct control over AI behavior through its Rules feature. Create a `.cursorrules` file in your project root to establish naming guidelines:

```
Follow these naming conventions:
- Use snake_case for variables and functions in Python
- Use camelCase for variables and functions in JavaScript
- Use PascalCase for React components
- Prefix boolean variables with "is_", "has_", or "should_"
- Use descriptive names that exceed three characters
- Avoid single-letter variables except in loops
```

When Cursor's AI reads this file, it incorporates your conventions into suggestions across all coding sessions. This file can be version-controlled and shared with team members, ensuring everyone receives consistent suggestions.

Test the effectiveness by starting a new function. With proper configuration, typing:

```python
def get_user_account_status(user_id):
    # Cursor will suggest completions matching your snake_case convention
```

Yields suggestions that respect the snake_case pattern rather than defaulting to camelCase.

### Step 3: Use Project Context for Better Suggestions

All major AI coding assistants benefit from project context. The more relevant code the tool can analyze, the better its suggestions align with your patterns.

Create convention example files that serve dual purposes: documentation and AI training. A file named `naming_conventions.py` might contain:

```python
# Naming convention examples for this project
# Variables: snake_case
user_name = "example"
order_total = 149.99
is_active = True

# Functions: snake_case with verb_prefix
def get_user_by_id(user_id):
    pass

def calculate_order_total(order_items):
    pass

def validate_user_input(user_input):
    pass

# Classes: PascalCase
class UserAccount:
    pass

class OrderProcessor:
    pass

# Constants: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_SECONDS = 30
```

Reference this file in your documentation and keep it accessible. AI tools that index your project will incorporate these patterns into their suggestions.

### Step 4: Use Codeium with Custom Dictionaries

Codeium's enterprise features include custom dictionary support, allowing teams to define approved terminology and naming patterns. Configure these through your team's Codeium dashboard.

For individual developers, Codeium learns from your editing patterns. When you consistently accept or reject certain suggestion styles, the tool adjusts its future recommendations. This feedback loop requires patience but produces results over time.

### Step 5: Tabnine's Contextual Learning

Tabnine offers both local and cloud modes, with the local option providing enhanced privacy for proprietary codebases. Its Pro and Enterprise tiers support team-wide configuration files that define coding standards.

Create a `tabnine.toml` file in your project:

```toml
[language.python]
naming_convention = "snake_case"
max_identifier_length = 40

[language.javascript]
naming_convention = "camelCase"
```

Tabnine reads these settings and generates suggestions aligned with your specified conventions. This approach works particularly well for teams enforcing standardized naming across multiple projects.

### Step 6: Strategies for Consistent Results

Beyond tool configuration, adopt practices that improve AI suggestion quality:

**Keep related files open.** Most AI assistants analyze currently open files for context. When working on a new module, keep similar existing modules visible to establish naming pattern context.

**Use comments as guides.** Prefix your code with comments describing the naming approach:

```python
# Using snake_case convention for this module
def process_user_data(user_data):
    # AI recognizes the convention from the comment
```

**Accept and refine.** When AI suggestions match your conventions, accept them. This positive reinforcement strengthens the association between your patterns and the tool's outputs.

**Provide feedback.** Most tools include mechanisms to report incorrect suggestions. Use these features to improve both your experience and future model versions.

### Step 7: Measuring Improvement

Track your naming convention compliance over time using linter reports. If your project uses flake8 for Python or ESLint for JavaScript, run these tools regularly and monitor naming-related warnings. A decreasing trend indicates your AI configuration successfully aligns with project standards.

You can also time your coding sessions. With properly configured AI suggestions, you should spend less time refactoring variable names and more time writing functional code.

### Step 8: Language-Specific Naming Configuration

Different languages have different conventions. Set up AI tools correctly for each:

```
Python (.cursorrules):
- Variable names: snake_case (max 30 chars)
- Functions: snake_case with action verb prefix
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Private methods: _leading_underscore
- Example: get_user_orders(), UserAccount, MAX_RETRIES

JavaScript (.cursorrules):
- Variable/function: camelCase
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- React components: PascalCase
- Boolean variables: is_*, has_*, should_* prefix
- Example: fetchUserOrders(), UserAccount, MAX_RETRIES

Go (.cursorrules):
- Exported: PascalCase
- Unexported: camelCase
- Package names: lowercase single word
- Interfaces: Reader, Writer pattern
- Example: GetUserOrders(), userRepository, Reader

Rust (.cursorrules):
- Variables: snake_case
- Functions: snake_case
- Structs/Enums: PascalCase
- Constants: UPPER_SNAKE_CASE
- Module names: snake_case
- Example: get_user_orders(), UserAccount, MAX_RETRIES
```

Store language-specific rules files in your repository and reference them in team documentation.

### Step 9: Progressive Enforcement: Feedback Loop Training

AI tools improve through positive feedback loops:

```
Week 1: AI learns your conventions
- Accept 90% of correctly named suggestions
- Reject/refactor incorrectly named ones
- Keep track of which suggestions you fix

Week 2: Improvement phase
- AI adjusts based on feedback
- Acceptance rate should increase to 95%
- Continue documenting non-compliant suggestions

Week 3: Optimization
- Configure tool settings based on Week 1-2 patterns
- Create convention documentation from collected fixes
- Share with team
```

This approach trains AI tools through practice, similar to human learning.

### Step 10: Team Standardization with Shared Configuration

Multi-developer teams benefit from centralized convention enforcement:

```
Repository structure:
.cursorrules              # Cursor-specific rules
.github/
  copilot-instructions.md # GitHub Copilot instructions
vscode-settings.json      # VS Code extension settings
naming-conventions.md     # Human-readable reference

.cursorrules content:
Your project uses: camelCase for JavaScript, snake_case for Python
Function prefixes: get*, set*, is*, has*, should*
Class names: PascalCase with business domain prefix
Examples:
  getUserOrders() - correct
  GetUserOrders() - wrong
  user_orders = [] - wrong for JavaScript
```

Distributing these configurations ensures all developers receive consistent suggestions.

## Measuring Naming Convention Compliance

Track actual compliance using linting tools and AI feedback:

```bash
# Python - check snake_case compliance
flake8 --select=N801,N802,N803 src/

# JavaScript - ESLint naming
eslint --rule '{camelcase: error}' src/

# Measure monthly compliance
eslint src/ --format json | jq '.[] | select(.messages[].rule == "camelcase")' | wc -l
```

Generate compliance reports monthly showing improvement from AI suggestion refinement.

### Step 11: Handling Edge Cases and Exceptions

Some names require exceptions to standard conventions. Document these:

```
Naming Exceptions:

1. Acronyms: HTTP, REST, API (all caps, even in camelCase)
   - validateHTTPRequest() ✓
   - validateHttpRequest() ✗

2. Project/Product names: specific external names preserved
   - connectToSlackAPI() ✓
   - connectToSlackApi() ✗

3. Single-letter variables: acceptable in specific contexts
   - for (let i = 0; i < items.length; i++) ✓
   - let i = getUserById(...) ✗

4. Database/API field names: preserve exact names from external systems
   - const { user_id } = response // API returns snake_case
   - const userId = response.user_id // Map to camelCase locally
```

Communicate these exceptions clearly so AI tools (and humans) understand the boundaries.

### Step 12: Onboarding New Team Members with AI Configuration

New developers should receive pre-configured AI tools matching the team's conventions:

```
Developer onboarding checklist:

1. Clone repository
2. Install AI tool (Cursor, Copilot, etc.)
3. Copy .cursorrules from repo to home directory
4. Verify AI suggestions match conventions
5. Run linter to establish baseline compliance
6. Review naming-conventions.md
7. Ask AI: "What naming conventions should I follow in this project?"

Expected result: AI immediately suggests code following established conventions
```

This reduces onboarding friction and ensures consistency from day one.

### Step 13: Customizing AI Behavior Per File Type

Advanced configuration targets specific file patterns:

```toml
# tabnine.toml example
[file_patterns."*.py"]
naming_convention = "snake_case"
max_identifier_length = 40

[file_patterns."*.ts"]
naming_convention = "camelCase"
max_identifier_length = 35

[file_patterns."*.rs"]
naming_convention = "snake_case"
max_identifier_length = 50

[file_patterns."*.test.ts"]
naming_convention = "camelCase"
# Test functions often longer, allow more descriptive names
max_identifier_length = 60
```

File-based configuration adapts AI suggestions to context-specific requirements.

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Frequently Asked Questions

**How long does it take to get ai code suggestions that follow your project?**

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

- [How to Get Better AI Autocomplete Suggestions by Structuring](/how-to-get-better-ai-autocomplete-suggestions-by-structuring/)
- [Cheapest Way to Get AI Code Completion in Vim 2026](/cheapest-way-to-get-ai-code-completion-in-vim-2026/)
- [How Context Window Size Affects AI Code Suggestions](/how-context-window-size-affects-ai-code-suggestions-in-different-idess/)
- [Configure Claude Code](/how-to-configure-claude-code-to-follow-your-teams-feature-fl/)
- [What Code Snippets Get Logged in AI Coding Tool Provider Aud](/what-code-snippets-get-logged-in-ai-coding-tool-provider-aud/)
- [AI Project Status Generator for Remote Teams Pulling](https://welikeremotestack.com/ai-project-status-generator-for-remote-teams-pulling-data-fr/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
