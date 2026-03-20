---

layout: default
title: "Writing Effective CursorRules for React TypeScript."
description: "A practical guide to creating CursorRules that handle React TypeScript component patterns, custom hooks, and state management effectively."
date: 2026-03-16
author: theluckystrike
permalink: /writing-effective-cursorrules-for-react-typescript-projects-/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
---

CursorRules files help AI assistants understand your project's conventions, tooling, and coding standards. For React TypeScript projects, well-crafted rules can dramatically improve code quality, consistency, and reduce repetitive feedback. This guide covers how to write effective CursorRules that handle specific component patterns, custom hooks, and state management approaches.

## Why CursorRules Matter for React TypeScript

When working with React and TypeScript, projects often develop unique patterns around component composition, prop typing, and state management. Without explicit guidance, AI assistants may generate code that conflicts with your established conventions. CursorRules solve this by providing persistent context about your project's specific requirements.

A well-structured CursorRules file acts as documentation and enforcement mechanism simultaneously. It tells your AI assistant how to structure components, which patterns to follow, and what to avoid.

## Setting Up Basic React TypeScript Rules

Start with project-specific configuration details that affect every file:

```yaml
# .cursorrules
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

## Component Pattern Rules

React TypeScript projects benefit from consistent component patterns. Define how components should be written, including file organization, naming conventions, and typing approaches.

### Functional Components with Explicit Props

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

Your CursorRules should specify whether components use interfaces or types, inline styles versus CSS modules, and naming conventions for props.

### Handling Compound Components

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

## Custom Hooks Patterns

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

Rules should specify that hooks must start with "use", handle cleanup properly, and always return tuples or objects with consistent shapes.

## State Management Conventions

For projects using different state management solutions, include specific rules for each:

### React Context for Global State

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

## Import Organization

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

Define the exact import order and enforce separation between type and value imports.

## Testing Considerations

CursorRules should also address testing patterns:

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

Specify testing library preferences, mock patterns, and what should be tested versus skipped.

## Wrapping Up

Effective CursorRules for React TypeScript projects require attention to component patterns, hook conventions, state management, import organization, and testing approaches. Start with these fundamentals and expand as your project evolves. The investment in well-documented rules pays dividends through consistent code quality and reduced cognitive overhead when collaborating with AI assistants.

Remember to review and update CursorRules periodically as your project patterns mature and new conventions emerge.


## Related Reading

- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
