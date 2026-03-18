---

layout: default
title: "How to Create CursorRules That Teach Cursor Your Team's State Management Patterns"
description: "A practical guide to writing CursorRules that teach Cursor your team's state management patterns. Code examples and real-world patterns for React, Vue, and Redux projects."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-create-cursorrules-that-teach-cursor-your-teams-state/
categories: [guides]
tags: [cursor, ai-tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---

{% raw %}
{%- include why-choose-cursorrules-state-management.html -%}

CursorRules offer a powerful way to communicate your team's state management patterns to Cursor. When configured correctly, these rules guide the AI to generate code that aligns with your existing architecture, whether you use React Context, Redux Toolkit, Vue's Composition API, or Zustand. This guide shows you how to write effective CursorRules that capture your team's specific patterns.

## Why State Management Patterns Matter in CursorRules

Every team develops unique approaches to handling application state. Some prefer centralized stores with Redux Toolkit, others favor distributed patterns with React hooks, and some use Zustand for its simplicity. When Cursor generates new components or modifies existing code, it needs to understand these patterns to produce consistent results.

CursorRules act as a persistent instruction set that Cursor references when working on your codebase. Unlike general-purpose prompts, team-specific rules encode conventions that make your codebase cohesive. The key is specificity—vague instructions produce generic code, while detailed patterns produce code that feels like it was written by a team member.

## Writing Effective State Management CursorRules

Effective CursorRules follow a structured approach: define the pattern, show concrete examples, and specify any constraints. Here's a framework you can adapt:

```markdown
# State Management Patterns

## Our Redux Toolkit Setup
- We use Redux Toolkit with createSlice for all global state
- Slices live in /src/store/slices/
- Each slice includes: name, initialState, reducers, and async thunks
- Selectors are created with createSelector and stored in /src/store/selectors/

## Component State Patterns
- Local state uses useState with explicit type annotations
- useState is preferred over useReducer unless complex state transitions exist
- Form state uses controlled components with onChange handlers

## State Access in Components
- Always import selectors from /src/store/selectors/
- Use useSelector and useDispatch hooks from react-redux
- Never access store state directly—always use selectors
```

This structure gives Cursor clear guidance on where state lives, how it's organized, and how components should interact with it.

## Pattern Examples for Different Frameworks

### React Context Pattern

If your team uses React Context for state management, include specific guidance about Context providers and custom hooks:

```markdown
## React Context Patterns
- Global UI state lives in /src/context/
- Each context has a Provider component and useContext hook
- Custom hooks wrap useContext with proper TypeScript types
- Context values are memoized with useMemo to prevent unnecessary re-renders

Example context structure:
/src/context/
  ThemeContext.tsx      # Theme provider and useTheme hook
  AuthContext.tsx       # Auth provider and useAuth hook
  NotificationContext.tsx  # Toast notifications
```

### Zustand Pattern

Zustand offers a simpler alternative to Redux. Your CursorRules should reflect its minimal approach:

```markdown
## Zustand Store Pattern
- All stores use create from zustand
- Stores include TypeScript interfaces for state and actions
- Slices pattern not required—single store per domain
- Actions are defined as functions within the store

Example store:
/src/stores/
  useUserStore.ts       # User authentication state
  useCartStore.ts       # Shopping cart state
  useUIStore.ts         # UI visibility and modals
```

### Redux Toolkit with createAsyncThunk

For teams using Redux Toolkit with async operations, specify how to handle API calls:

```markdown
## Async State with Redux Toolkit
- Use createAsyncThunk for all API calls
- Handle loading, success, and failure states in extraReducers
- Use useQuery from RTK Query for server-state when possible
- Normalize API responses using createEntityAdapter for large lists
```

## Integrating Rules with Project Structure

CursorRules work best when they reference your actual directory structure. Include a section that maps patterns to file locations:

```markdown
## File Organization

State-related files follow these locations:

| Pattern Type | Directory |
|-------------|-----------|
| Redux slices | /src/store/slices/ |
| Redux selectors | /src/store/selectors/ |
| React Context | /src/context/ |
| Zustand stores | /src/stores/ |
| API services | /src/services/ |
| Custom hooks | /src/hooks/ |

When creating new state, check if a pattern already exists in these directories.
```

This mapping helps Cursor place new files in the correct locations and understand relationships between different state management approaches.

## Testing State Management Code

Include guidance on how your team tests state logic:

```markdown
## Testing State Management
- Redux slices: test reducers in isolation with jest
- Custom hooks: test with @testing-library/react-hooks
- Integration: test connected components with mocked store
- Async thunks: use redux-saga-test-plan or waitFor from @testing-library
```

## Common Mistakes to Avoid

When writing CursorRules for state management, avoid these pitfalls:

1. **Being too generic**: "Use state management" tells Cursor nothing. Instead, specify "Use Redux Toolkit with createSlice for global state."

2. **Missing examples**: Abstract descriptions confuse AI models. Show actual code patterns from your codebase.

3. **Ignoring TypeScript**: If your project uses TypeScript (and it should), include type definitions in your rules.

4. **No constraints**: Specify what NOT to do. "Don't use useState for global data" prevents common mistakes.

## Updating Rules as Patterns Evolve

Your state management approach will evolve. Set up a process to keep CursorRules current:

- Review rules during code reviews when state patterns change
- Add new patterns when introducing libraries or approaches
- Remove deprecated patterns that your team no longer uses
- Test new developers' code generation against rules

## Conclusion

CursorRules transform Cursor from a generic coding assistant into a team-aware collaborator. By documenting your state management patterns—Redux Toolkit slices, React Context providers, Zustand stores, or any combination—you ensure generated code matches your architecture. The investment in writing comprehensive rules pays dividends in code consistency and faster onboarding.

Start with one pattern your team uses frequently, write detailed rules, and expand as you identify more opportunities. Your future self and new team members will thank you.

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
