---

layout: default
title: "How to Configure Cursor AI Rules for Consistent CSS and."
description: "A practical guide to setting up Cursor AI rules that enforce consistent CSS and Tailwind class ordering across your codebase."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-configure-cursor-ai-rules-for-consistent-css-and-tail/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
---

Cursor AI, the AI-powered code editor built on VS Code, offers powerful customization through its Rules feature. These rules let you define coding standards that the AI follows when generating or editing code. Configuring rules for consistent CSS and Tailwind class ordering helps maintain a clean, readable codebase and speeds up code reviews.

## Why Class Ordering Matters

When working with Tailwind CSS, class consistency becomes crucial as projects grow. A well-organized class attribute follows a logical pattern—structure first, then sizing, then typography, then colors, then interactive states. Without enforced ordering, developers end up with inconsistent class strings that make code harder to read and diffs harder to review.

Consider these two equivalent class strings:

```html
<!-- Inconsistent ordering -->
<button class="bg-blue-500 hover:bg-blue-700 px-4 text-white font-bold py-2 rounded">
  Click Me
</button>

<!-- Consistent ordering -->
<button class="py-2 px-4 rounded font-bold text-white bg-blue-500 hover:bg-blue-700">
  Click Me
</button>
```

The second example follows a clear pattern: layout, sizing, visual, typography, interactive states. This consistency makes your codebase more maintainable.

## Setting Up Cursor AI Rules

Cursor AI uses a `.cursorrules` file in your project root to define custom behavior. You can also configure rules through the Cursor Settings under AI Rules.

### Creating Your Rules File

Create a `.cursorrules` file in your project root with the following structure:

```
# Project: Your Project Name
# Purpose: Define CSS and Tailwind class ordering standards

## Tailwind CSS Class Ordering
When writing Tailwind CSS classes, always order them in the following sequence:
1. Layout (flex, grid, block, inline, etc.)
2. Positioning (relative, absolute, fixed, sticky)
3. Spacing (m-, p-, gap-, space-)
4. Sizing (w-, h-, min-w-, max-w-, etc.)
5. Visual (bg-, border-, rounded-, shadow-, opacity-)
6. Typography (text-, font-, leading-, tracking-)
7. Interactive (hover:, focus:, active:, disabled:)
8. Responsive prefixes (sm:, md:, lg:, etc.)

## CSS Property Ordering
When writing plain CSS, follow the box-model order:
1. Display and layout (display, position, float, clear)
2. Box model (width, height, margin, padding, box-sizing)
3. Visual (background, border, border-radius, box-shadow)
4. Typography (font, line-height, color, text-)
5. Animation and transition (animation, transition, transform)
6. States (:hover, :focus, :active, :disabled)

## Formatting Guidelines
- Always use kebab-case for class names
- Keep related classes grouped together
- Break long class strings onto multiple lines for readability
- Use Prettier or a similar formatter for final formatting
```

### Configuring Through Cursor Settings

Alternatively, access AI Rules through Cursor Settings:

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Navigate to AI Rules
3. Add a new rule with your ordering preferences
4. Enable the rule for all files or specific file types

The settings approach works well if you want rules to apply across multiple projects without复制粘贴 the same `.cursorrules` file.

## Practical Examples

### Example 1: Button Component

A well-ordered Tailwind button using your rules:

```html
<button class="
  relative
  inline-flex
  items-center
  justify-center
  px-6
  py-3
  text-sm
  font-semibold
  text-white
  bg-indigo-600
  rounded-lg
  shadow-md
  hover:bg-indigo-700
  focus:outline-none
  focus:ring-2
  focus:ring-indigo-500
  focus:ring-offset-2
  transition-colors
  duration-200
">
  Get Started
</button>
```

The classes flow logically: positioning → layout → spacing → typography → colors → visual effects → interactive states → animation.

### Example 2: Card Component

```html
<div class="
  flex
  flex-col
  w-full
  max-w-sm
  p-6
  bg-white
  border border-gray-200
  rounded-xl
  shadow-sm
  hover:shadow-lg
  transition-shadow
  duration-300
">
  <h3 class="text-lg font-semibold text-gray-900">
    Card Title
  </h3>
  <p class="mt-2 text-gray-600">
    Card description goes here.
  </p>
</div>
```

### Example 3: Input Field with States

```html
<input
  type="email"
  class="
    block
    w-full
    px-4
    py-2
    text-gray-900
    bg-white
    border border-gray-300
    rounded-lg
    placeholder-gray-400
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
    focus:border-transparent
    disabled:bg-gray-100
    disabled:cursor-not-allowed
  "
  placeholder="Enter your email"
/>
```

## Automating Class Sorting

While Cursor AI rules help the AI generate consistent classes, you might also want to use automated sorting tools:

### Using prettier-plugin-tailwindcss

Install the Prettier plugin for automatic class sorting:

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

Add Prettier config to your `package.json`:

```json
{
  "prettier": {
    "plugins": ["prettier-plugin-tailwindcss"]
  }
}
```

Run Prettier on your files:

```bash
npx prettier --write "**/*.html"
npx prettier --write "**/*.jsx" "**/*.tsx"
```

The plugin automatically sorts classes according to Tailwind's recommended ordering, which aligns well with the Cursor AI rules you configure.

### Using tailwindcss-classes-sorter

For non-Prettier workflows:

```bash
npm install -D tailwindcss-classes-sorter
```

Create a script in your `package.json`:

```json
{
  "scripts": {
    "sort:classes": "tailwind-classes-sorter --config ./tailwind.config.js"
  }
}
```

## Testing Your Configuration

After setting up Cursor AI rules, test them by:

1. Creating a new component and prompting Cursor AI to generate it
2. Checking that generated classes follow your defined order
3. Asking Cursor AI to refactor existing inconsistent classes
4. Reviewing code reviews to ensure consistency is maintained

You can prompt Cursor AI specifically:

> "Generate a responsive navigation component using Tailwind CSS. Follow our class ordering convention: layout → positioning → spacing → sizing → visual → typography → interactive states."

## Common Issues and Solutions

### Rule Conflicts

If Cursor AI ignores your rules, check for conflicting settings in `.cursorrules` and Cursor Settings. Remove duplicates and ensure rules are properly formatted.

### Complex Class Strings

For complex components with many classes, use line breaks to maintain readability. Cursor AI understands multi-line class attributes and will maintain your formatting.

### Responsive Classes

Group responsive prefixes together and keep them in ascending order (sm before md before lg):

```html
<div class="
  grid
  grid-cols-1
  gap-4
  sm:grid-cols-2
  sm:gap-6
  md:grid-cols-3
  md:gap-8
">
```

## Conclusion

Configuring Cursor AI rules for consistent CSS and Tailwind class ordering creates a more maintainable codebase. The initial setup takes only a few minutes but pays dividends in code readability and reduced code review friction. Combine Cursor AI rules with automated sorting tools like prettier-plugin-tailwindcss for maximum consistency.

Remember to share your rules file with team members through your version control system. Consistent class ordering becomes even more valuable in collaborative projects where multiple developers contribute to the same codebase.


## Related Reading

- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
