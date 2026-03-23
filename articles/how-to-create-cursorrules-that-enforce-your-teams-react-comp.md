---
layout: default
title: "How to Create .cursorrules That Enforce Your Teams React"
description: "Learn how to write Cursorules that enforce consistent React component composition patterns across your team. Practical examples and code snippets included"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-create-cursorrules-that-enforce-your-teams-react-comp/
categories: [guides]
tags: [ai-tools-compared, react, cursorrules, ai-tools]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Cursorules are a powerful way to codify your team's React component composition patterns. When configured correctly, they ensure that AI coding assistants generate consistent, maintainable components that align with your architecture. This guide walks you through creating effective Cursorules specifically designed for enforcing React component composition patterns across your team.

Table of Contents

- [Why Component Composition Patterns Matter](#why-component-composition-patterns-matter)
- [Prerequisites](#prerequisites)
- [Overview](#overview)
- [Troubleshooting](#troubleshooting)

Why Component Composition Patterns Matter

React's composition model gives developers flexibility in how they structure components. However, this flexibility can lead to inconsistency when multiple team members work on the same codebase. Without clear guidelines, you might encounter prop drilling, inconsistent component hierarchies, or mixed patterns for handling shared state.

Cursorules solve this problem by providing AI assistants with explicit instructions about your team's preferred patterns. When an AI understands your composition conventions, it generates code that fits into your existing architecture.

The problem compounds as teams grow. A five-person team might handle inconsistency informally through code reviews. A twenty-person team cannot. When developers on different squads build features in parallel, diverging patterns create merge conflicts, confuse new hires, and slow down refactoring efforts. Cursorules act as a standing policy document that every AI-assisted session respects automatically, without requiring reviewers to catch every deviation.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1: Defining Your Component Composition Rules

Before writing Cursorules, document your team's composition patterns. Consider these questions:

- How do you handle prop drilling versus context?

- What naming conventions do you use for compound components?

- When do you prefer render props over hooks?

- How do you structure component exports?

Once you have clear answers, translate them into Cursorules that AI assistants can follow.

A practical exercise: audit five recent components your team wrote and identify the patterns they share. If three out of five use compound components with Context for internal state, that is your preferred pattern. If naming conventions drift across those five, that inconsistency is exactly what Cursorules can lock down.

Step 2: Create Effective Cursorules

Here is an example of Cursorules designed to enforce compound component patterns:

```
Cursorules for React Component Composition

Step 3: Compound Component Patterns

When creating components that need to share state between parent and children, use compound component patterns:

1. Use a parent component that manages state with React Context
2. Export child components as static properties of the parent
3. Use implicit state passing through Context

Example structure:
- ButtonGroup (parent, manages selected state)
- ButtonGroup.Button (child component)
- ButtonGroup.ButtonProps (optional, for TypeScript)

Step 4: Prop Naming Conventions

- Use 'children' for content slots, never 'content' or 'body'
- Prefix callback props with 'on' (onClick, onChange)
- Use 'is' or 'has' prefix for boolean props (isDisabled, hasError)
- Prefix internal props with underscore (_internalState)

Step 5: Component File Organization

Each component should follow this structure:
1. Type definitions (if TypeScript)
2. Context creation
3. Child component definitions
4. Parent component with composition
5. Named exports

Step 6: Forbidden Patterns

- Never use props.children for component logic
- Avoid passing components as props (use compound components instead)
- Don't create HOCs - prefer custom hooks
```

Step 7: Enforcing Container-Presenter Pattern

Many teams adopt the container-presenter pattern for separating logic from presentation. Here is how to encode this in Cursorules:

```
Step 8: Container-Presenter Separation

When building features, separate concerns using containers and presenters:

Container responsibilities:
- Manage state and side effects
- Handle data fetching
- Pass raw data and callbacks to presenter

Presenter responsibilities:
- Receive data as props
- Handle UI logic only
- Be purely presentational when possible

// Container
function UserListContainer() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  return <UserListPresenter users={users} />;
}

// Presenter
function UserListPresenter({ users }) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

This pattern pairs well with testing strategies. Presenters are trivial to unit test because they are pure functions of their props. Containers can be tested separately using mocked data fetching. When Cursor generates code following this rule, your test coverage naturally improves alongside consistency.

Step 9: Handling Component Composition in Custom Hooks

Custom hooks have become the preferred way to share logic in React applications. Your Cursorules should specify how AI assistants should create and use hooks:

```
Step 10: Custom Hooks Guidelines

1. Always prefix hook names with 'use' (useAuth, useFetch)
2. Return arrays for tuple-like data, objects for named properties
3. Document dependencies in comments when using useEffect
4. Handle loading and error states consistently

Example return pattern:
const { data, loading, error, refetch } = useUserData(userId);
```

An important nuance: hooks that manage a single value with a setter should return a tuple, like `useState` itself. Hooks that return multiple named properties should return an object. This distinction prevents destructuring confusion and makes call sites readable at a glance. Include this distinction explicitly in your Cursorules so the AI applies the right return shape automatically.

Step 11: Structuring TypeScript Interfaces for Consistency

Teams using TypeScript benefit from encoding interface conventions in Cursorules. Without explicit guidance, AI assistants may generate redundant interfaces, misplace type definitions, or use inconsistent naming patterns across components.

Add a section like this to your Cursorules:

```
Step 12: TypeScript Interface Conventions

- Define component prop interfaces immediately above the component they describe
- Name prop interfaces as {ComponentName}Props (e.g., ButtonProps, ModalProps)
- Separate complex types into a dedicated Types.ts file if they are shared
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, and primitive aliases

Step 13: Generic Component Patterns

When writing generic components, constrain type parameters:
- Prefer <T extends object> over unconstrained <T>
- Document generic parameters in JSDoc when the constraint is non-obvious
```

This prevents a common AI antipattern where Cursor generates a `type Props = {}` at the bottom of a file, inconsistent with where other interfaces live.

Step 14: Test Your Cursorules

After writing your Cursorules, test them by generating sample components. Ask your AI assistant to create a component following your rules, then verify:

- Does it use compound components correctly?

- Are naming conventions followed?

- Is the file organization consistent?

- Are forbidden patterns avoided?

Iterate on your Cursorules based on what the AI generates versus what you expect.

A systematic testing approach: create a checklist with one item per rule in your Cursorules file. After generating a test component, walk through the checklist item by item. Rules that the AI violates need either more specific wording or concrete examples. Rules the AI follows consistently can be marked stable. Treat Cursorules like code: they need testing and revision.

Step 15: Sharing Cursorules Across Your Team

Place your Cursorules file in your project root as `.cursorrules` or `.cursor/rules`. Ensure every team member uses the same file by:

- Adding it to version control

- Documenting the location in your contribution guidelines

- Reviewing it during onboarding new developers

Regular updates to your Cursorules should follow your standard code review process.

Consider treating Cursorules changes the same way you treat changes to your ESLint configuration. Both define coding standards; both warrant a PR, a short discussion, and explicit team sign-off. When a new pattern emerges organically in your codebase, a Cursorules update formalizes it and propagates it to every subsequent AI-assisted session automatically.

Step 16: Example: Complete Cursorules File

```
Project React Composition Guidelines

Overview

This file defines our team's React component composition patterns.
All AI-generated code should follow these guidelines.

Step 17: Component Types

Presentational Components
- Focus on UI only
- Receive data and callbacks as props
- No side effects or state (use useMemo/useCallback for optimization)
- Export as named exports

Container Components
- Handle data fetching and state management
- Pass data to presentational components
- May use custom hooks internally

Compound Components
- Use React Context for internal state
- Export child components as static properties
- <Modal><Modal.Header /><Modal.Body /><Modal.Footer /></Modal>

Step 18: Props Pattern

```tsx
interface ButtonProps {

 variant?: 'primary' | 'secondary' | 'danger';

 size?: 'sm' | 'md' | 'lg';

 isDisabled?: boolean;

 onClick?: () => void;

 children: React.ReactNode;

}

```

Step 19: Import Order

1. React imports
2. External libraries
3. Internal imports (absolute paths)
4. Relative imports
5. Type imports

Step 20: File Naming

- Components: PascalCase (UserProfile.tsx)
- Hooks: camelCase with use prefix (useAuth.ts)
- Utilities: camelCase (formatDate.ts)
- Types: PascalCase (UserTypes.ts)
```

Step 21: Keeping Cursorules Lean and Effective

One pitfall is writing Cursorules that are too long. If your rules file exceeds 200 lines, the AI assistant may weight early rules more heavily than later ones, or fail to apply all rules simultaneously. Keep each rule concise and actionable.

Prefer concrete examples over abstract descriptions. Instead of writing "use appropriate naming conventions," write "name boolean props with `is` or `has` prefix: `isDisabled`, `hasError`, `isLoading`." The more specific the instruction, the more reliably Cursor applies it.

Review your Cursorules quarterly. As React itself evolves. new hooks, new patterns, new best practices. your rules should evolve alongside it. A Cursorules file that references patterns from two years ago may actively guide the AI toward outdated approaches.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to create .cursorrules that enforce your teams react?

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

- [Create CursorRules That Enforce Your Team's Git Commit](/how-to-create-cursorrules-that-enforce-your-teams-git-commit/)
- [Create CursorRules That Teach Cursor Your Team's State](/how-to-create-cursorrules-that-teach-cursor-your-teams-state/)
- [Writing Effective CursorRules for React TypeScript Projects](/writing-effective-cursorrules-for-react-typescript-projects-/)
- [How to Use AI to Help Devrel Teams Create Video Tutorial Scr](/how-to-use-ai-to-help-devrel-teams-create-video-tutorial-scr/)
- [How to Use AI to Help Sre Teams Create on Call Handoff Docum](/how-to-use-ai-to-help-sre-teams-create-on-call-handoff-docum/)
- [Best Tools for Remote React Native Teams Coordinating iOS](https://welikeremotestack.com/best-tools-for-remote-react-native-teams-coordinating-ios-an/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
