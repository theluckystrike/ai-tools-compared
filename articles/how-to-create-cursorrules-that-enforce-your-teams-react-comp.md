---

layout: default
title: "How to Create Cursorules That Enforce Your Teams React Component Composition Patterns"
description:"Learn how to write Cursorules that enforce consistent React component composition patterns across your team. Practical examples and code snippets included."
date: 2026-03-16
author: "AI Tools Compared"
permalink: /how-to-create-cursorrules-that-enforce-your-teams-react-comp/
categories: [guides]
tags: [react, cursorrules, ai-tools]
reviewed: true
score: 8
intent-checked: false
voice-checked: true
voice-checked: false
---



{% raw %}

Cursorules are a powerful way to codify your team's React component composition patterns. When configured correctly, they ensure that AI coding assistants generate consistent, maintainable components that align with your architecture. This guide walks you through creating effective Cursorules specifically designed for enforcing React component composition patterns across your team.



## Why Component Composition Patterns Matter



React's composition model gives developers flexibility in how they structure components. However, this flexibility can lead to inconsistency when multiple team members work on the same codebase. Without clear guidelines, you might encounter prop drilling, inconsistent component hierarchies, or mixed patterns for handling shared state.



Cursorules solve this problem by providing AI assistants with explicit instructions about your team's preferred patterns. When an AI understands your composition conventions, it generates code that fits into your existing architecture.



## Defining Your Component Composition Rules



Before writing Cursorules, document your team's composition patterns. Consider these questions:



- How do you handle prop drilling versus context?

- What naming conventions do you use for compound components?

- When do you prefer render props over hooks?

- How do you structure component exports?



Once you have clear answers, translate them into Cursorules that AI assistants can follow.



## Creating Effective Cursorules



Here is an example of Cursorules designed to enforce compound component patterns:



```
# Cursorules for React Component Composition

## Compound Component Patterns

When creating components that need to share state between parent and children, use compound component patterns:

1. Use a parent component that manages state with React Context
2. Export child components as static properties of the parent
3. Use implicit state passing through Context

Example structure:
- ButtonGroup (parent, manages selected state)
- ButtonGroup.Button (child component)
- ButtonGroup.ButtonProps (optional, for TypeScript)

## Prop Naming Conventions

- Use 'children' for content slots, never 'content' or 'body'
- Prefix callback props with 'on' (onClick, onChange)
- Use 'is' or 'has' prefix for boolean props (isDisabled, hasError)
- Prefix internal props with underscore (_internalState)

## Component File Organization

Each component should follow this structure:
1. Type definitions (if TypeScript)
2. Context creation
3. Child component definitions
4. Parent component with composition
5. Named exports

## Forbidden Patterns

- Never use props.children for component logic
- Avoid passing components as props (use compound components instead)
- Don't create HOCs - prefer custom hooks
```


## Enforcing Container-Presenter Pattern



Many teams adopt the container-presenter pattern for separating logic from presentation. Here is how to encode this in Cursorules:



```
## Container-Presenter Separation

When building features, separate concerns using containers and presenters:

Container responsibilities:
- Manage state and side effects
- Handle data fetching
- Pass raw data and callbacks to presenter

Presenter responsibilities:
- Receive data as props
- Handle UI logic only
- Be purely presentational when possible

Example:
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


## Handling Component Composition in Custom Hooks



Custom hooks have become the preferred way to share logic in React applications. Your Cursorules should specify how AI assistants should create and use hooks:



```
## Custom Hooks Guidelines

1. Always prefix hook names with 'use' (useAuth, useFetch)
2. Return arrays for tuple-like data, objects for named properties
3. Document dependencies in comments when using useEffect
4. Handle loading and error states consistently

Example return pattern:
const { data, loading, error, refetch } = useUserData(userId);
```


## Testing Your Cursorules



After writing your Cursorules, test them by generating sample components. Ask your AI assistant to create a component following your rules, then verify:



- Does it use compound components correctly?

- Are naming conventions followed?

- Is the file organization consistent?

- Are forbidden patterns avoided?



Iterate on your Cursorules based on what the AI generates versus what you expect.



## Sharing Cursorules Across Your Team



Place your Cursorules file in your project root as `.cursorrules` or `.cursor/rules`. Ensure every team member uses the same file by:



- Adding it to version control

- Documenting the location in your contribution guidelines

- Reviewing it during onboarding new developers



Regular updates to your Cursorules should follow your standard code review process.



## Example: Complete Cursorules File



```
# Project React Composition Guidelines

## Overview

This file defines our team's React component composition patterns.
All AI-generated code should follow these guidelines.

## Component Types

### Presentational Components
- Focus on UI only
- Receive data and callbacks as props
- No side effects or state (use useMemo/useCallback for optimization)
- Export as named exports

### Container Components
- Handle data fetching and state management
- Pass data to presentational components
- May use custom hooks internally

### Compound Components
- Use React Context for internal state
- Export child components as static properties
- Example: <Modal><Modal.Header /><Modal.Body /><Modal.Footer /></Modal>

## Props Pattern

```tsx
interface ButtonProps {

 variant?: 'primary' | 'secondary' | 'danger';

 size?: 'sm' | 'md' | 'lg';

 isDisabled?: boolean;

 onClick?: () => void;

 children: React.ReactNode;

}

```

## Import Order

1. React imports
2. External libraries
3. Internal imports (absolute paths)
4. Relative imports
5. Type imports

## File Naming

- Components: PascalCase (UserProfile.tsx)
- Hooks: camelCase with use prefix (useAuth.ts)
- Utilities: camelCase (formatDate.ts)
- Types: PascalCase (UserTypes.ts)
```


## Related Reading

- [Best AI Tools for Developers in 2026](/best-ai-tools-for-developers-2026/)
- [AI Tools Comparison Guide](/ai-tools-comparison-guide/)
- [AI Tools Hub](/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
