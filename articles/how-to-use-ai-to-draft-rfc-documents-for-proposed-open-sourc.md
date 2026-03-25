---
layout: default
title: "How to Use AI to Draft RFC Documents for Proposed Open"
description: "Artificial intelligence has become a valuable assistant for open source maintainers and contributors drafting Request for Comments (RFC) documents. When"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-use-ai-to-draft-rfc-documents-for-proposed-open-source-feature-changes/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---
---
layout: default
title: "How to Use AI to Draft RFC Documents for Proposed Open"
description: "Artificial intelligence has become a valuable assistant for open source maintainers and contributors drafting Request for Comments (RFC) documents. When"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-use-ai-to-draft-rfc-documents-for-proposed-open-source-feature-changes/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Artificial intelligence has become a valuable assistant for open source maintainers and contributors drafting Request for Comments (RFC) documents. When proposing new features to open source projects, a well-structured RFC helps reviewers understand your proposal, its rationale, and implementation details. AI tools can accelerate this process significantly.


- Start by explaining the: project and its RFC template requirements: ``` I need to write an RFC for an open source project that uses the following RFC template: 1.
- Most large open source projects: including Kubernetes, Rust, and Django, have established RFC processes that require contributors to document their proposed changes before implementation begins.
- "Migration path needs more: detail for existing users" Prompt to AI - "Based on this RFC feedback, help me expand the following sections: 1.
- Artificial intelligence has become: a valuable assistant for open source maintainers and contributors drafting Request for Comments (RFC) documents.
- When proposing new features: to open source projects, a well-structured RFC helps reviewers understand your proposal, its rationale, and implementation details.
- To get the best results: provide the AI with context about the project, its existing RFC process, and specific details about your proposed feature.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - Understand RFC Documents in Open Source Projects

RFC documents serve as formal proposals for changes to open source projects. Most large open source projects, including Kubernetes, Rust, and Django, have established RFC processes that require contributors to document their proposed changes before implementation begins.

A typical RFC includes several key sections: a summary of the proposed change, motivation for the change, detailed design, alternatives considered, and potential drawbacks. Writing these sections from scratch takes time, especially when you need to match the project's specific RFC template and conventions.

Step 2 - Use AI to Structure Your RFC

AI tools excel at generating structured content based on your requirements. To get the best results, provide the AI with context about the project, its existing RFC process, and specific details about your proposed feature.

Start by explaining the project and its RFC template requirements:

```
I need to write an RFC for an open source project that uses the following RFC template:
1. Summary
2. Motivation
3. Detailed Design
4. Alternatives Considered
5. Drawbacks
6. Unresolved Questions

The project is a Python CLI tool for managing database migrations. I want to propose adding support for reversible migrations that can automatically generate both forward and backward migration scripts.

Please draft the RFC document following this template, focusing on a feature that allows developers to mark migrations as reversible and automatically generate rollback scripts.
```

The AI will generate a structured draft that you can then refine with specific implementation details.

Step 3 - Drafting the Motivation Section

The motivation section explains why the proposed change matters. This is where AI can help you articulate the problem your feature solves.

Provide the AI with specific problems you're experiencing:

```
The motivation for reversible migrations in our database migration tool:
- Developers currently must write rollback scripts manually
- Many teams skip writing rollbacks, making production rollbacks dangerous
- New contributors don't understand the expected rollback patterns
- Rollback scripts often become out of sync with forward migrations

Help me write a compelling motivation section that explains these problems with concrete examples.
```

AI can transform bullet points into flowing prose that clearly communicates the problem to reviewers.

Step 4 - Generate Technical Design Details

The detailed design section requires precise technical explanation. Here, AI serves as a collaborative partner rather than a complete solution generator. You provide the technical constraints and requirements, and AI helps structure the explanation.

```
I need help writing the detailed design section for reversible migrations. Here are the technical constraints:

1. The migration format is SQL files in a migrations/ directory
2. Each migration has an up.sql and optional down.sql file
3. We want to add a metadata table tracking migration reversibility
4. The CLI should detect reversible migrations automatically based on the presence of a _reversible marker
5. Rollback should use transactions to ensure atomicity

Please help me structure the detailed design section with these components:
- Database schema changes
- CLI command changes
- File naming conventions
- Error handling for failed rollbacks
```

This approach uses AI's strength in organizing technical information while you provide the domain-specific constraints.

Step 5 - Create Code Examples

Including working code examples strengthens any RFC. AI can generate example implementations, API signatures, or CLI output that demonstrates your proposed feature.

For the reversible migrations RFC, you might ask:

```
Generate example CLI output showing how a developer would use the new reversible migration feature. Include:
1. The command to create a new reversible migration
2. The generated migration files structure
3. The command to run a reversible migration
4. The automatic rollback command
5. Error output when rollback fails
```

AI can produce realistic CLI output that helps reviewers visualize the feature in action.

Step 6 - Documenting Alternatives and Drawbacks

Strong RFCs acknowledge alternatives and drawbacks. This demonstrates you've thought through the design thoroughly. AI can help brainstorm alternatives you might not have considered.

```
For the reversible migrations feature, what alternative approaches should we consider?
- Using a migration framework that handles reversibility automatically
- Requiring all migrations to be reversible by default
- Using a different file naming convention
- Storing rollback SQL in a separate database table instead of files
- Using a version control approach where rollbacks are generated on-demand

For each alternative, explain why it wouldn't work as well as the proposed approach.
```

Similarly, AI can help identify potential drawbacks:

```
What are the potential drawbacks of implementing automatic reversible migrations?
Consider:
- Performance implications of tracking reversibility metadata
- Edge cases where automatic rollback might not work correctly
- Developer confusion about what makes a migration "reversible"
- Database-specific SQL that might not have a clear reversal
- Breaking changes where no meaningful rollback is possible
```

Step 7 - Refining the RFC for Your Project

Every open source project has specific conventions for RFCs. Review existing merged RFCs in your project to understand the expected format and tone. AI can adapt its output to match these conventions once you provide examples.

Provide the AI with the project's existing RFCs:

```
Here are three example RFCs from our project that were accepted. Notice the style, level of detail, and format. Please draft my new RFC following the same patterns:

[Provide examples from 2-3 existing RFCs]
```

This ensures your AI-generated draft matches project expectations.

Step 8 - Real RFC Examples and Patterns

Study existing RFCs from major projects to understand tone and structure:

```markdown
RFC Example - Rust RFC 2019-12
Step 9 - Title: Stabilize the Async/Await Syntax

Motivation
Current closure-based approach requires understanding advanced type system
features. Async/await syntax makes asynchronous code feel natural.

Detailed Design
- Add `async` keyword to function definitions
- Add `await` postfix operator for future execution
- Error handling through standard Result type
- Cancellation via drop semantics

Alternatives Considered
1. Macro-based approach (deemed too complex)
2. Generators + yield (insufficient for error handling)
3. Callback-based API (original approach, poor ergonomics)

Drawbacks
- Compiler complexity increases
- New surface area for potential bugs
- Learning curve for developers unfamiliar with futures
```

When you provide AI tools with 2-3 examples of accepted RFCs, the quality of generated output improves dramatically.

Step 10 - RFC Template for Common Patterns

Create project-specific templates that AI tools can use:

```markdown
RFC Template for {PROJECT_NAME}

Step 11 - Motivation
Why do we need this change? What problems does it solve? Include specific
use cases that motivate the change. Quantify impact where possible.

Detailed Design
The core of the RFC. Include:
- New API signatures or configuration format
- Database schema changes if applicable
- Behavioral changes to existing features
- Migration path for existing users

Include code examples showing before/after.

Step 12 - Alternatives Considered
List other approaches and explain why they're insufficient compared to
the proposed design. Demonstrate that the proposed approach is optimal.

Step 13 - Drawbacks and Limitations
Be honest about trade-offs. What functionality might this remove?
What performance implications exist? What future constraints does this
introduce?

Step 14 - Unresolved Questions
What aspects remain unclear? What aspects might need further discussion
during implementation?

Step 15 - Implementation Timeline
Estimate effort and timeline. Break into phases if complex.
- Phase 1: Core implementation (~2 weeks)
- Phase 2: Documentation (~1 week)
- Phase 3: Testing and feedback (~1 week)
```

Using a consistent template across all RFCs accelerates both writing and review.

Step 16 - AI Tool Recommendations for RFC Writing

Claude Code - Best for complete RFC generation from requirements. Excels at writing motivation sections that articulate problems clearly.

GitHub Copilot - Good for filling in code examples and API signatures once you've drafted motivation and design sections.

Cursor - Excellent for iterative RFC refinement through conversation. If you have a rough draft, Cursor's chat interface helps you strengthen weak sections.

GPT-4 - Good at alternative analysis. Provide your main proposal, and ask GPT-4 to generate compelling alternatives you may not have considered.

Step 17 - Converting RFC Feedback to Implementation

Once your RFC is accepted, AI tools help convert feedback into refined specifications:

```
RFC Feedback received:
1. "Unclear how this handles edge case X"
2. "Performance implications not addressed"
3. "Migration path needs more detail for existing users"

Prompt to AI:
"Based on this RFC feedback, help me expand the following sections:

1. Edge case handling for X (add 3 specific code examples)
2. Performance analysis section (benchmark comparisons with current approach)
3. Detailed migration guide (step-by-step for users with existing setup)

Maintain the same technical tone and depth as the original RFC."
```

The AI generates expanded sections that directly address reviewer concerns.

Best Practices for AI-Assisted RFC Writing

Getting good results from AI requires providing clear context and iterating on the output. Here are practical tips:

Provide complete context upfront. Include the RFC template, project background, and your specific feature requirements in the initial prompt. This reduces the need for multiple clarification rounds.

Review critically. AI generates plausible content that may contain inaccuracies, especially around technical details. Always verify the generated content matches your intended design.

Iterate incrementally. Generate sections one at a time rather than asking for a complete RFC in a single prompt. This allows you to refine each section before moving to the next.

Maintain your voice. Use AI to structure and draft, but add your own analysis and insights. The best RFCs reflect the author's deep understanding of the problem space.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to use ai to draft rfc documents for proposed open?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Can I adapt this for a different tech stack?

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

Related Articles

- [How to Use AI to Draft Open Source Foundation Membership App](/how-to-use-ai-to-draft-open-source-foundation-membership-app/)
- [Best AI Assistant for Writing Open Source Roadmap Documents](/best-ai-assistant-for-writing-open-source-roadmap-documents-from-issue-milestone-data/)
- [How to Use AI to Help SRE Teams Draft Root Cause Analysis](/how-to-use-ai-to-help-sre-teams-draft-root-cause-analysis-do/)
- [Best AI for Product Managers Creating User Persona Documents](/best-ai-for-product-managers-creating-user-persona-documents/)
- [How to Use AI to Create Milestone Planning Documents](/how-to-use-ai-to-create-milestone-planning-documents-from-is/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
