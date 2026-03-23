---
layout: default
title: "How to Use AI to Create Changelog Entries Grouped"
description: "Learn practical methods for using AI to generate well-organized changelog entries that separate breaking changes from new features. Includes code"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-use-ai-to-create-changelog-entries-grouped-by-breakin/
categories: [guides]
tags: [ai-tools-compared, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


{% raw %}

Creating changelogs that clearly separate breaking changes from new features is essential for maintaining good developer experience. When done well, users can quickly assess the impact of an update and plan their upgrade path. When done poorly, important breaking changes get lost in a sea of feature descriptions, leading to production issues after upgrades.


AI tools can significantly accelerate this process, but getting high-quality results requires understanding how to structure your inputs and prompts effectively.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: The Problem with Manual Changelog Creation


Writing changelogs manually involves reviewing every commit, pull request, and diff to identify what changed, categorize the changes, and write clear descriptions. This becomes increasingly time-consuming as projects grow. Teams often either skip detailed changelogs entirely or spend hours piecing them together at release time.


The challenge is particularly acute when you need to distinguish between:

- **Breaking changes** that require users to modify their code

- **New features** that add functionality without affecting existing behavior

- **Bug fixes** that resolve issues without changing APIs

- **Performance improvements** that affect internal behavior but not external interfaces


### Step 2: What a High-Quality AI-Generated Changelog Looks Like


Before examining the how, it helps to know what you are aiming for. A well-structured changelog entry produced with AI assistance should look like this:


```
### Step 3: v2.4.0 — 2026-03-20

### Breaking Changes

- **`authenticate()` now requires `scope` parameter** — The `scope` argument is no longer optional. Callers that omit it will receive a 400 error. Migration: add `scope="read"` (or your required scopes) to all `authenticate()` calls.

- **Removed `legacyMode` config option** — This option was deprecated in v2.2.0 and has now been removed. Remove `legacyMode` from your configuration file before upgrading.

### New Features

- Added `batch_process()` method for processing up to 1,000 records in a single API call, reducing overhead for bulk operations.
- New `--dry-run` flag for the CLI allows validating configuration without executing changes.

### Bug Fixes

- Fixed a race condition in the retry handler that caused duplicate requests under high concurrency.
- Corrected pagination behavior when `limit` exceeded the total record count.

### Performance

- Reduced memory allocation in the parser by 40% for inputs larger than 1MB.
```

This structure gives users exactly what they need: a clear signal about what requires action before upgrading, followed by what they gain, followed by what got fixed.


### Step 4: Use AI to Analyze Git History


The most effective approach starts with feeding your AI tool the right context. Begin by generating a clean summary of changes using Git commands:


```bash
# Get a concise summary of changes between tags
git log --pretty=format:"%h - %s (%an)" v1.2.0..v1.3.0

# Get diff stats for overview
git diff --stat v1.2.0..v1.3.0

# Get detailed changes for a specific file
git diff v1.2.0..v1.3.0 -- src/api/
```


Pass this output to your AI tool with a clear prompt:


```
Analyze the following git commit history and diff. Create a changelog entry for version 1.3.0 that:

1. Lists all breaking changes first, clearly explaining what changed and what action users need to take
2. Lists new features with brief descriptions
3. Lists bug fixes
4. Lists any performance improvements

Use clear, concise language suitable for developer documentation.
```


### Step 5: Prompt Templates for Different Scenarios


### Template 1: From Commit Messages


```
Given these commit messages, create a changelog grouped by breaking changes, features, fixes, and improvements:
---
{{COMMIT_MESSAGES}}
---

Format each entry as:
- **Breaking**: [description] - [migration step]
- **Features**: [description]
- **Fixes**: [description]
- **Improvements**: [description]
```

### Template 2: From PR Descriptions

```
Review these pull request descriptions and titles, then generate a changelog organized by:
1. Breaking Changes (if any)
2. New Features
3. Bug Fixes
4. Improvements

Focus on user-facing changes only. Skip internal refactoring unless it affects the public API.

{{PR_LIST}}
```

### Template 3: From Diff Output

```
Analyze this diff output and categorize each change as breaking, feature, fix, or improvement.
For breaking changes, include a migration note.

{{DIFF_OUTPUT}}
```

### Step 6: Handling Breaking Changes Specifically

Breaking changes require special attention because they directly impact users upgrading from previous versions. When prompting AI for breaking changes, be explicit about what you need:

```
Review these changes and identify anything that:
- Removes or changes a function signature
- Changes expected return values
- Removes configuration options
- Changes default behavior in ways existing code depends on
- Requires database migrations

For each breaking change found, provide:
1. A clear description of what changed
2. A code example showing before/after
3. A migration step users can follow
```

AI models are generally good at identifying obvious API signature changes but can miss subtle behavioral changes -- for example, a function that still accepts the same arguments but now validates them more strictly. Always have a human review the breaking changes section before publishing.

### Step 7: Automate the Workflow

For teams releasing frequently, consider setting up a semi-automated workflow:

1. Generate diff: Create a diff file between versions

2. AI first draft: Use AI to create an initial categorization

3. Human review: Verify accuracy, especially for breaking changes

4. Refine and publish: Adjust wording and publish to your changelog location

Here's a simple script that combines Git with AI:

```bash
#!/bin/bash
OLD_TAG=$1
NEW_TAG=$2

# Get changes
CHANGES=$(git log --pretty=format:"%h - %s%n%b" $OLD_TAG..$NEW_TAG)

# Send to AI (example with OpenAI)
curl -s https://api.openai.com/v1/chat/completions \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json" \
 -d '{
 "model": "gpt-4",
 "messages": [{
 "role": "user",
 "content": "Create a changelog from these commits, grouped by breaking changes, features, fixes, and improvements:\n\n'"$CHANGES"'"
 }]
 }' | jq -r '.choices[0].message.content'
```

### Step 8: Integrate AI Changelog Generation into CI/CD

The most scalable approach runs changelog generation automatically as part of your release pipeline. A Python script can pull commits between two tags, send them to an AI API with a structured prompt, and output a draft changelog. Invoke this script from a GitHub Actions workflow on tag push, with the output committed back to your CHANGELOG.md or posted as a GitHub Release draft for human review before publishing. The key is to keep human review mandatory for the breaking changes section -- automation handles the tedious extraction work, humans verify accuracy before the release goes public.

## Best Practices for AI-Generated Changelogs

Regardless of how you generate the content, follow these principles:

**Always verify breaking changes** -- AI can miss subtle breaking changes or flag non-breaking changes as breaking. Have a human review critical sections, especially for libraries with large user bases where a missed breaking change can cause widespread disruption.

**Be specific about versions** -- Include version numbers in your prompts so the AI knows which release it's documenting. This prevents generic descriptions that could apply to any release.

**Provide project context** -- Include information about your project's domain and conventions you follow for changelog entries. A changelog for a database driver needs different language than one for a frontend component library.

**Iterate on prompts** -- If the first output isn't quite right, refine your prompt with specific instructions about what's missing or incorrect. A short second prompt ("The breaking changes section is correct, but the features section is too vague -- rewrite it with more specific descriptions") often fixes issues faster than regenerating from scratch.

**Keep entries concise** -- For each item, aim for one to two sentences. Links to detailed documentation or migration guides can provide additional context without bloating the changelog itself.

### Step 9: Common Pitfalls to Avoid

When using AI for changelog generation, watch for these issues:

- **Over-categorization** -- AI sometimes creates too many categories, making the changelog hard to scan. Stick to four sections: Breaking Changes, New Features, Bug Fixes, and Performance (or Improvements). Merge anything that doesn't fit cleanly.

- **Missing context in breaking change descriptions** -- A breaking change entry that says "Updated authentication" tells users nothing actionable. Your prompt should explicitly require migration steps for every breaking change.

- **Inconsistent formatting** -- Review for consistent tense (past tense is conventional: "Added", "Fixed", "Removed"), capitalization, and punctuation before publishing.

- **False positives in breaking detection** -- AI may flag internal refactoring as breaking changes if your commit messages are not descriptive. Improve commit message quality to get better AI outputs: use conventional commits format (`feat:`, `fix:`, `BREAKING CHANGE:`) to give the AI clear signals.

- **Hallucinated details** -- AI occasionally invents specific details like function names or parameter values that were not actually changed. Cross-reference every specific claim against the actual diff before publishing.

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Frequently Asked Questions

**Which AI model produces the best changelogs?**
Claude and GPT-4o both perform well. Claude tends to write more precise technical prose, while GPT-4o is better at following complex formatting instructions. Either works well if your prompt is clear. For automated pipelines, Claude's API is straightforward to integrate and produces consistent structured output.

**Should I use AI to generate changelogs for open source projects?**
Yes, with human review. Open source changelogs have a direct impact on adoption and trust. Use AI to draft the changelog, then have a maintainer review every entry for accuracy before tagging the release. Never publish an AI-generated changelog for a breaking release without manual verification of the breaking changes section.

**How do I handle merge commits in changelog generation?**
Exclude merge commits from your input using `git log --no-merges`. They add noise without useful content. If you use squash merging (where PR titles become commit messages), your input quality will be higher and AI outputs will be more accurate.

**Can AI generate migration guides as well as changelog entries?**
Yes. Use a separate prompt specifically for migration guides, providing the breaking changes section as input and asking the AI to expand each item into a step-by-step upgrade guide with before/after code examples.

**What commit message format gives AI the best results?**
Conventional commits format (`feat:`, `fix:`, `docs:`, `BREAKING CHANGE:`) gives AI the clearest signal because the category is explicit. The AI doesn't need to infer whether "Update authentication flow" is a feature or a breaking change -- if the commit is marked `BREAKING CHANGE: Update authentication flow`, the categorization is unambiguous.

## Related Articles

- [AI Tools for Creating Automated Release Changelog](/ai-tools-for-creating-automated-release-changelog-from-conve/)
- [AI Coding Tools for Automating Changelog Generation from](/ai-coding-tools-for-automating-changelog-generation-from-con/)
- [How to Use AI to Write Commit Message Guidelines](/how-to-use-ai-to-write-commit-message-guidelines-for-open-source-projects/)
- [Writing Custom Instructions That Make AI Follow Your Team's](/writing-custom-instructions-that-make-ai-follow-your-teams-changelog-entry-format/)
- [AI Tools for Automated Changelog Generation 2026](/ai-tools-for-automated-changelog-generation-2026/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
