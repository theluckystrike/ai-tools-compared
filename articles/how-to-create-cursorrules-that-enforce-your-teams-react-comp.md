---
layout: default
title: "How to Create Cursorrules That Enforce Your Teams React Component Composition Patterns"
description: "A practical guide to creating Cursorrules that enforce your team's React component composition patterns. Real examples and implementation strategies."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-create-cursorrules-that-enforce-your-teams-react-comp/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---

{% raw %}
{%- include why-choose-cursorrules.html -%}

Cursorrules is a powerful configuration system that helps AI coding assistants understand and respect your team's coding conventions. When working with React projects, you can create specific rules that enforce consistent component composition patterns across your entire codebase. This guide shows you how to create effective Cursorrules that keep your team aligned on React architecture.

## Why Cursorrules Matter for React Projects

React's flexibility is both a blessing and a curse. Every developer has their own style for composing components, which leads to inconsistent codebases over time. Cursorrules let you define explicit guidelines that the AI assistant follows when generating or modifying code.

Without clear rules, you might end up with some files using compound components while others prefer render props, and still others using hooks exclusively. This inconsistency makes maintenance difficult and increases the learning curve for new team members.

## Setting Up Basic Cursorrules for React

Create a `.cursorrules` file in your project root. This file contains JSON or YAML configuration that Cursorrules reads before generating code. Here is a basic configuration that enforces composition patterns:

```json
{
  "react": {
    "componentStructure": "composition-over-inheritance",
    "hooks": {
      "preferred": ["useState", "useEffect", "useContext", "useReducer"],
      "customHooks": "extract-reusable-logic"
    },
    "patterns": {
      "stateManagement": "prefer-context-or-reducer-for-global",
      "propsDrilling": "avoid-with-composition",
      "renderPerformance": "memo-when-needed"
    }
  }
}
```

This configuration tells the AI to favor composition over inheritance, prefer specific React hooks, and avoid prop drilling through smart component composition.

## Enforcing Component Composition Patterns

Your team likely has specific patterns for how components should be composed together. Here is how to encode those patterns in Cursorrules:

```json
{
  "react": {
    "composition": {
      "container-presentational": {
        "description": "Separate data-fetching logic from UI rendering",
        "structure": "Container components handle state, presentational components render"
      },
      "compound-components": {
        "description": "Related components that share implicit state",
        "example": "Tabs, Select, Menu components should use compound pattern"
      },
      "render-props": {
        "when": "share-complex-logic-without-higher-order-components"
      }
    }
  }
}
```

When Cursorrules understands these patterns, it can suggest appropriate component structures based on what you are building. For example, when you ask it to create a tab component, it will suggest the compound components pattern automatically.

## Defining Props and TypeScript Conventions

Consistent props definitions make React code more maintainable. Your Cursorrules should specify exactly how props should be typed:

```json
{
  "react": {
    "props": {
      "typescript": {
        "use": "interface-over-type",
        "naming": "PascalCase with Props suffix",
        "examples": [
          "interface ButtonProps { ... }",
          "interface UserCardProps { ... }"
        ]
      },
      "defaults": {
        "use": "defaultProps-or-default-parameters",
        "avoid": "mixing-approaches"
      }
    }
  }
}
```

This ensures every component in your codebase follows the same props definition conventions, making it easier to read and contribute to each other's code.

## Enforcing File Organization

Component composition works best when files are organized consistently. Add file structure rules to your Cursorrules:

```json
{
  "react": {
    "fileOrganization": {
      "components": "src/components/{ComponentName}/{ComponentName}.tsx",
      "hooks": "src/hooks/{hookName}.ts",
      "types": "src/types/{FeatureName}.ts",
      "index": "use-index-file-for-barrel-exports"
    }
  }
}
```

These rules help the AI generate code in the correct locations and import paths, reducing the manual reorganization needed after code generation.

## Example: Complete Cursorrules Configuration

Here is a comprehensive example that combines all the patterns:

```json
{
  "version": "1.0",
  "react": {
    "componentStructure": "composition-over-inheritance",
    "hooks": {
      "preferred": ["useState", "useEffect", "useContext", "useReducer", "useMemo", "useCallback"],
      "rules": {
        "fetching": "use-react-query-or-swr",
        "forms": "use-react-hook-form",
        "state": "useReducer-for-complex-useState"
      }
    },
    "patterns": {
      "small-components": "extract-when-over-150-lines",
      "reusable-logic": "custom-hook",
      "context": "split-contexts-by-feature"
    },
    "typescript": {
      "strict": true,
      "props": "interface-with-Props-suffix"
    }
  },
  "imports": {
    "order": ["react", "external", "internal-relative", "internal-absolute"],
    "avoid": "default-exports"
  }
}
```

## Testing Your Cursorrules

After creating your Cursorrules file, test it by asking the AI to generate several components. Check if the generated code follows your established patterns. Look for:

- Consistent props interfaces
- Proper file organization
- Appropriate use of hooks
- Correct composition patterns

If something does not match, adjust your rules and test again. Iterating on your Cursorrules configuration helps you find the right balance between guidance and flexibility.

## Conclusion

Cursorrules transforms your AI coding assistant from a generic code generator into a team-specific pair programmer. By defining clear component composition patterns, props conventions, and file organization rules, you ensure consistency across your React codebase. Start with basic rules and refine them as your team identifies additional patterns worth standardizing.

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
