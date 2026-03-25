---
layout: default
title: "Writing Effective CursorRules for React TypeScript Projects"
description: "A practical guide to creating CursorRules that handle React TypeScript component patterns, custom hooks, and state management effectively"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /writing-effective-cursorrules-for-react-typescript-projects-/
categories: [guides]
tags: [ai-tools-compared, tools]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---
{% raw %}

Write CursorRules for React TypeScript projects by specifying TypeScript configuration (strict mode, jsx setting, module resolution), React hook rules (exhaustiveDeps warnings), and component patterns (functional/arrow function preference). These rules ensure Cursor AI generates code following your team's established conventions for component composition, prop typing, hook patterns, and state management approaches.

Table of Contents

- [Why CursorRules Matter for React TypeScript](#why-cursorrules-matter-for-react-typescript)
- [Setting Up Basic React TypeScript Rules](#setting-up-basic-react-typescript-rules)
- [Component Pattern Rules](#component-pattern-rules)
- [Custom Hooks Patterns](#custom-hooks-patterns)
- [State Management Conventions](#state-management-conventions)
- [Import Organization](#import-organization)
- [Testing Considerations](#testing-considerations)
- [Putting It All Together - A Complete CursorRules Template](#putting-it-all-together-a-complete-cursorrules-template)
- [TypeScript](#typescript)
- [Components](#components)
- [Hooks](#hooks)
- [State Management](#state-management)
- [Imports](#imports)
- [Testing](#testing)

Why CursorRules Matter for React TypeScript

When working with React and TypeScript, projects often develop unique patterns around component composition, prop typing, and state management. Without explicit guidance, AI assistants may generate code that conflicts with your established conventions. CursorRules solve this by providing persistent context about your project's specific requirements.

A well-structured CursorRules file acts as documentation and enforcement mechanism simultaneously. It tells your AI assistant how to structure components, which patterns to follow, and what to avoid. Unlike one-off comments or prompt preambles, CursorRules persist across every file you open and every generation you trigger, making them genuinely effective at enforcing consistency.

For React TypeScript projects in particular, this matters because the surface area of valid code is large. You can write a React component as a function declaration, an arrow function, a class component, or using `React.memo`. TypeScript props can use `interface`, `type`, or inline annotations. State management can use `useState`, `useReducer`, Zustand, Redux, Jotai, or Recoil. CursorRules let you narrow this space to what your team actually uses.

Setting Up Basic React TypeScript Rules

Start with project-specific configuration details that affect every file:

```yaml
.cursorrules
{
  "typescript": {
    "strict": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  },
  "react": {
    "hooks": {
      "rulesOfHooks": "enforce",
      "exhaustiveDeps": "warn"
    },
    "componentPatterns": ["functional", "arrow-function"]
  }
}
```

This establishes the foundation. Next, address component structure specifically.

The `moduleResolution - "bundler"` setting matches the default for Vite and other modern bundlers. If your project uses `node16` or `nodenext` (common in Node.js libraries), update this value accordingly. Cursor will use these settings to infer path resolution behavior when generating imports.

Component Pattern Rules

React TypeScript projects benefit from consistent component patterns. Define how components should be written, including file organization, naming conventions, and typing approaches.

Functional Components with Explicit Props

For projects using explicit prop interfaces:

```typescript
// Define props interface outside component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// Component uses spread for additional props
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

Your CursorRules should specify whether components use interfaces or types, inline styles versus CSS modules, and naming conventions for props. A common rule to include:

```
Component props must use TypeScript interface (not type alias) unless the props require union or intersection types.
Props interface names must follow the pattern ComponentNameProps.
Export named exports, not default exports, for all components.
```

Consistent naming makes codebase navigation faster and eliminates debates about conventions during code review.

Handling Compound Components

Compound components require special consideration in your rules. These patterns where a parent component manages state while child components render content need explicit guidance:

```typescript
// Tabs.tsx - Parent manages state
interface TabsProps {
  defaultIndex?: number;
  children: React.ReactNode;
  onChange?: (index: number) => void;
}

export function Tabs({ defaultIndex = 0, children, onChange }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const contextValue = { activeIndex, onTabClick: (i: number) => {
    setActiveIndex(i);
    onChange?.(i);
  }};

  return (
    <TabsContext.Provider value={contextValue}>
      {children}
    </TabsContext.Provider>
  );
}

// Tab.tsx - Child consumes context
function Tab({ index, children }: { index: number; children: React.ReactNode }) {
  const { activeIndex, onTabClick } = useContext(TabsContext);
  const isActive = activeIndex === index;

  return (
    <button
      className={isActive ? 'active' : ''}
      onClick={() => onTabClick(index)}
    >
      {children}
    </button>
  );
}
```

Specify that compound components should use Context for state sharing, with clear separation between parent and child files.

Custom Hooks Patterns

Custom hooks deserve their own section in CursorRules. Define naming conventions, return types, and error handling approaches:

```typescript
// useFetch.ts
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    setState(prev => ({ ...prev, loading: true }));

    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => {
        if (error.name !== 'AbortError') {
          setState({ data: null, loading: false, error });
        }
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
```

Rules should specify that hooks must start with "use", handle cleanup properly, and always return tuples or objects with consistent shapes. Include guidance on where to place hooks in your project directory:

```
Custom hooks go in src/hooks/. Each hook lives in its own file named useHookName.ts.
Hooks that fetch data must handle loading, error, and data states.
Hooks must clean up effects (abort controllers, event listeners, timers) in the useEffect return function.
Never call a hook conditionally. enforce React's rules of hooks.
```

State Management Conventions

For projects using different state management solutions, include specific rules for each:

React Context for Global State

```typescript
// AuthContext.tsx
interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (credentials: LoginCredentials) => {
    const response = await api.login(credentials);
    setUser(response.user);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook with runtime check
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

Specify that context should always include a custom hook with runtime validation, typed values properly, and include proper cleanup where needed.

Zustand Store Conventions

If your project uses Zustand, your CursorRules should specify the store file structure and typing pattern:

```typescript
// stores/userStore.ts
import { create } from 'zustand';

interface UserState {
  users: User[];
  selectedUserId: string | null;
  fetchUsers: () => Promise<void>;
  selectUser: (id: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUserId: null,
  fetchUsers: async () => {
    const data = await api.getUsers();
    set({ users: data });
  },
  selectUser: (id) => set({ selectedUserId: id }),
}));
```

Add a rule specifying that Zustand stores are named `useEntityStore`, live in `src/stores/`, and that selectors are extracted into separate hooks to avoid unnecessary re-renders.

Import Organization

Consistent import ordering improves readability and reduces merge conflicts:

```typescript
// 1. React imports
import React, { useState, useEffect, useCallback } from 'react';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

// 3. Internal components
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

// 4. Custom hooks
import { useDebounce } from '@/hooks/useDebounce';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// 5. Types
import type { User } from '@/types';

// 6. Utilities and constants
import { API_ENDPOINTS } from '@/constants';
import { formatDate } from '@/utils';

// 7. Styles
import styles from './UserProfile.module.css';
```

Define the exact import order and enforce separation between type and value imports. Note that tools like `eslint-plugin-import` and `@typescript-eslint/consistent-type-imports` can enforce import ordering automatically, reference these in your CursorRules so Cursor generates code that will pass your linter on the first attempt.

Testing Considerations

CursorRules should also address testing patterns. Specify your testing library (Vitest vs Jest, React Testing Library vs Enzyme) and the coverage expectations:

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button onClick={() => {}}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Button onClick={() => {}} disabled>
        Click me
      </Button>
    );
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

Specify testing library preferences, mock patterns, and what should be tested versus skipped. A useful rule:

```
Tests use Vitest and React Testing Library. Test files colocate with components (Button.test.tsx next to Button.tsx).
Use vi.fn() for mocks, not jest.fn(). Use screen queries, not container queries.
Test user behavior, not implementation details. Do not test internal state directly.
```

Putting It All Together - A Complete CursorRules Template

Here is a complete starting template for a React TypeScript project using Vite, Zustand, and React Query:

```
React TypeScript Project Rules

TypeScript
- strict: true, no implicit any
- Use interface for component props, type for unions and utility types
- Prefer unknown over any when typing external data

Components
- Functional components only, no class components
- Named exports only, no default exports
- Props interface named ComponentNameProps
- File named ComponentName.tsx in src/components/

Hooks
- Custom hooks in src/hooks/useHookName.ts
- Always handle loading, error, data states in data fetching hooks
- Clean up all side effects

State Management
- Local state: useState or useReducer
- Global state: Zustand stores in src/stores/
- Server state: React Query (useQuery, useMutation)

Imports
- Group: React, external libs, internal components, hooks, types, utils, styles
- Use type imports for type-only imports

Testing
- Vitest + React Testing Library
- Test files colocate with source files
- No testing implementation details
```

Frequently Asked Questions

Who is this article written for?

This article is written for developers building React TypeScript applications who want Cursor AI to generate code that matches their team's established patterns, rather than generic boilerplate.

How current is the information in this article?

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Check Cursor's changelog for the latest `.cursorrules` capabilities, as the format and supported options change across versions.

Does Cursor offer a free tier?

Most major tools offer some form of free tier or trial period. Check Cursor's current pricing page for the latest free tier details, as these change frequently. Free tiers typically have usage limits that work for evaluation but may not be sufficient for daily professional use.

How do I get started quickly?

Copy the complete CursorRules template from this article into a `.cursorrules` file at your project root. Open a component file, trigger a generation, and see how it changes the output. Refine the rules based on what Cursor gets wrong in that first generation.

What is the learning curve like?

CursorRules are plain text, there is no special syntax to learn beyond what your project already uses. The main challenge is identifying which rules matter most for your codebase. Start with component patterns and import ordering, then add state management and testing rules once those are working.

Related Articles

- [Writing CursorRules for Golang Projects with Specific](/writing-cursorrules-for-golang-projects-with-specific-concur/)
- [How to Create .cursorrules That Enforce Your Teams React](/how-to-create-cursorrules-that-enforce-your-teams-react-comp/)
- [AI Coding Assistant Comparison for React Component](/ai-coding-assistant-comparison-for-react-component-generatio/)
- [Cursor vs Windsurf for React Development 2026](/cursor-vs-windsurf-for-react-development-2026/)
- [Create CursorRules That Teach Cursor Your Team's State](/how-to-create-cursorrules-that-teach-cursor-your-teams-state/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
