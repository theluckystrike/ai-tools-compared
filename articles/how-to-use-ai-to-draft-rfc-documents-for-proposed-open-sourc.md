---
layout: default
title: "How to Use AI to Draft RFC Documents for Proposed Open."
description: "Learn practical methods for using AI tools to draft RFC documents for open source feature proposals, with examples and code snippets for developers in."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-use-ai-to-draft-rfc-documents-for-proposed-open-source-feature-changes/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

Artificial intelligence has become a valuable assistant for open source maintainers and contributors drafting Request for Comments (RFC) documents. When proposing new features to open source projects, a well-structured RFC helps reviewers understand your proposal, its rationale, and implementation details. AI tools can accelerate this process significantly.



## Understanding RFC Documents in Open Source Projects



RFC documents serve as formal proposals for changes to open source projects. Most large open source projects—including Kubernetes, Rust, and Django—have established RFC processes that require contributors to document their proposed changes before implementation begins.



A typical RFC includes several key sections: a summary of the proposed change, motivation for the change, detailed design, alternatives considered, and potential drawbacks. Writing these sections from scratch takes time, especially when you need to match the project's specific RFC template and conventions.



## Using AI to Structure Your RFC



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



## Drafting the Motivation Section



The motivation section explains why the proposed change matters. This is where AI can help you articulate the problem your feature solves.



Provide the AI with specific pain points you're experiencing:



```
The motivation for reversible migrations in our database migration tool:
- Developers currently must write rollback scripts manually
- Many teams skip writing rollbacks, making production rollbacks dangerous
- New contributors don't understand the expected rollback patterns
- Rollback scripts often become out of sync with forward migrations

Help me write a compelling motivation section that explains these problems with concrete examples.
```


AI can transform bullet points into flowing prose that clearly communicates the problem to reviewers.



## Generating Technical Design Details



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



## Creating Code Examples



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



## Documenting Alternatives and Drawbacks



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


## Refining the RFC for Your Project



Every open source project has specific conventions for RFCs. Review existing merged RFCs in your project to understand the expected format and tone. AI can adapt its output to match these conventions once you provide examples.



Provide the AI with the project's existing RFCs:



```
Here are three example RFCs from our project that were accepted. Notice the style, level of detail, and format. Please draft my new RFC following the same patterns:

[Provide examples from 2-3 existing RFCs]
```


This ensures your AI-generated draft matches project expectations.



## Best Practices for AI-Assisted RFC Writing



Getting good results from AI requires providing clear context and iterating on the output. Here are practical tips:



Provide complete context upfront. Include the RFC template, project background, and your specific feature requirements in the initial prompt. This reduces the need for multiple clarification rounds.



Review critically. AI generates plausible content that may contain inaccuracies, especially around technical details. Always verify the generated content matches your intended design.



Iterate incrementally. Generate sections one at a time rather than asking for a complete RFC in a single prompt. This allows you to refine each section before moving to the next.



Maintain your voice. Use AI to structure and draft, but add your own analysis and insights. The best RFCs reflect the author's deep understanding of the problem space.



## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
