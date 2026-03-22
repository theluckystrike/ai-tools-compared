---
layout: default
title: "How to Use Claude for Svelte Development"
description: "A practical guide to using Claude for Svelte 5 component authoring, state management, and debugging with real prompts and code examples"
date: 2026-03-22
author: theluckystrike
permalink: /claude-for-svelte-development-guide-2026/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

# How to Use Claude for Svelte Development

Claude handles Svelte well because it understands the compiler-first model, the reactivity system, and the shift from Svelte 4 to Svelte 5 runes. This guide covers practical workflows for component authoring, state management, and debugging.

## Why Svelte + Claude Works

Svelte is unusual among frontend frameworks — reactivity is a compile-time transform, not a runtime. That means AI tools need to understand what `$state`, `$derived`, and `$effect` actually compile into, not just pattern-match on React or Vue syntax.

Claude has solid Svelte 5 coverage. It defaults to runes syntax when you ask for "modern Svelte", knows the difference between `$props()` and the old `export let`, and understands that `$effect` is not `useEffect`.

## Setting Up Your Prompt Context

Start every session with a context block:

```text
You are helping me build a Svelte 5 application using TypeScript.
Use runes syntax ($state, $derived, $effect, $props).
Do not use Svelte 4 patterns like reactive statements ($ labels) or export let.
Tailwind CSS is available.
SvelteKit is the router — use load functions for data fetching.
```

This prevents Claude from mixing Svelte 4 and 5 syntax, which is the most common failure mode.

## Component Authoring

### Basic Stateful Component

**Prompt:**
```text
Create a Svelte 5 pagination component. Props: totalItems (number), pageSize (number, default 20).
Derive currentPage, totalPages, and a visible page range. Emit a "pageChange" event.
Use Tailwind for styling.
```

**Claude output:**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ pageChange: number }>();

  const {
    totalItems,
    pageSize = 20,
  }: { totalItems: number; pageSize?: number } = $props();

  let currentPage = $state(1);

  const totalPages = $derived(Math.ceil(totalItems / pageSize));

  const pageRange = $derived(() => {
    const range: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  });

  function goTo(page: number) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    dispatch('pageChange', page);
  }
</script>

<nav class="flex items-center gap-1">
  <button
    onclick={() => goTo(currentPage - 1)}
    disabled={currentPage === 1}
    class="px-3 py-1 rounded border disabled:opacity-40"
  >
    Prev
  </button>

  {#each pageRange as page}
    <button
      onclick={() => goTo(page)}
      class="px-3 py-1 rounded border {page === currentPage ? 'bg-blue-600 text-white' : ''}"
    >
      {page}
    </button>
  {/each}

  <button
    onclick={() => goTo(currentPage + 1)}
    disabled={currentPage === totalPages}
    class="px-3 py-1 rounded border disabled:opacity-40"
  >
    Next
  </button>
</nav>
```

This is correct Svelte 5 — `$props()`, `$state`, `$derived`. The `createEventDispatcher` usage is still valid in Svelte 5 alongside the new callback props pattern.

### Using Callback Props Instead of Events

Svelte 5 introduced a cleaner alternative to `createEventDispatcher` — callback props. Claude produces both patterns correctly when you specify which you want:

**Prompt:**
```text
Rewrite the pagination component to use callback props instead of createEventDispatcher.
onPageChange should be an optional prop.
```

**Claude output:**

```svelte
<script lang="ts">
  const {
    totalItems,
    pageSize = 20,
    onPageChange,
  }: {
    totalItems: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
  } = $props();

  let currentPage = $state(1);
  const totalPages = $derived(Math.ceil(totalItems / pageSize));

  function goTo(page: number) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    onPageChange?.(page);
  }
</script>
```

Callback props are the idiomatic Svelte 5 pattern for components that need to communicate upward. They compose better with TypeScript and do not require the dispatcher import.

## SvelteKit Data Loading

Claude handles SvelteKit `load` functions cleanly when you give it the full context.

**Prompt:**
```text
Write a SvelteKit +page.server.ts load function that fetches paginated posts from a REST API.
Accept a "page" query parameter (default 1). Return posts array and totalCount.
Handle 404 and 500 errors using SvelteKit error() helper.
```

**Output:**

```typescript
// src/routes/posts/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const page = Number(url.searchParams.get('page') ?? '1');

  if (isNaN(page) || page < 1) {
    throw error(400, 'Invalid page parameter');
  }

  const res = await fetch(`https://api.example.com/posts?page=${page}&limit=20`);

  if (res.status === 404) {
    throw error(404, 'Posts not found');
  }

  if (!res.ok) {
    throw error(500, `API error: ${res.status}`);
  }

  const data = await res.json() as {
    posts: Post[];
    totalCount: number;
  };

  return {
    posts: data.posts,
    totalCount: data.totalCount,
    currentPage: page,
  };
};

interface Post {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}
```

### Combining Server and Client Load Functions

For pages that need both server-side data and client-side reactivity, use `+page.server.ts` alongside `+page.ts`. Claude handles this split correctly:

**Prompt:**
```text
I have a +page.server.ts that returns posts. I need a +page.ts that adds client-side
filtering by category. The category filter should come from a URL param and be reactive.
```

Claude will produce a `+page.ts` that reads from `$page.url.searchParams` and returns a derived `filteredPosts` array — keeping server data cached while re-filtering on the client as the URL changes.

## Debugging with Claude

For reactive bugs, paste the component and describe the symptom:

**Prompt:**
```text
This Svelte 5 component has a bug: the filteredItems list doesn't update when searchQuery changes.
Here's the component: [paste code]
```

Claude will spot missing `$derived` wrappers, incorrect `$effect` dependencies, or cases where you're mutating a `$state` array instead of reassigning it.

Common patterns Claude catches:
- `items.push(x)` instead of `items = [...items, x]` (arrays need reassignment for reactivity)
- Using `$effect` for derived values instead of `$derived`
- Forgetting `.svelte.ts` extension for runes in non-component files

### Debugging Reactive Loops

Reactive cycles (`$effect` writing to a variable it also reads) are subtle and produce cryptic warnings. Claude identifies them well:

**Prompt:**
```text
My component logs "maximum update depth exceeded" in the browser console.
Here is the offending $effect:

$effect(() => {
  if (items.length > 0) {
    selectedIndex = 0;
    items = items.filter(item => item.active);
  }
});
```

Claude will immediately identify that `items` is both read and written inside the same `$effect`, creating a cycle. The fix is to derive `activeItems` with `$derived` and use a separate effect only for the side effect of updating `selectedIndex`.

## Store Alternatives with Runes

Claude can help you replace `writable` stores with rune-based modules:

**Prompt:**
```text
Replace this writable store pattern with a Svelte 5 runes module that can be imported into components:
import { writable } from 'svelte/store';
export const count = writable(0);
```

Claude produces a `count.svelte.ts` module using `$state` and exported getter/setter functions — the idiomatic Svelte 5 approach.

### Shared Application State

For more complex shared state (a shopping cart, auth session, or form wizard), Claude generates a full runes-based state module:

**Prompt:**
```text
Create a cart.svelte.ts module that manages a shopping cart.
Needs: addItem, removeItem, clearCart functions and a derived totalPrice.
Items have id, name, price, quantity.
```

**Claude output:**

```typescript
// src/lib/cart.svelte.ts
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

let items = $state<CartItem[]>([]);

export const totalPrice = $derived(
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

export function addItem(item: Omit<CartItem, 'quantity'>) {
  const existing = items.find(i => i.id === item.id);
  if (existing) {
    items = items.map(i =>
      i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
    );
  } else {
    items = [...items, { ...item, quantity: 1 }];
  }
}

export function removeItem(id: string) {
  items = items.filter(i => i.id !== id);
}

export function clearCart() {
  items = [];
}

export function getItems() {
  return items;
}
```

Import `getItems`, `addItem`, `totalPrice` directly into any component. Because the module uses `.svelte.ts` extension and top-level `$state`, the reactive graph works across all component boundaries.

## Limits to Know

Claude occasionally reverts to Svelte 4 syntax mid-conversation, especially for `{#each}` keyed blocks and event directives. When you see `on:click` instead of `onclick`, remind it: "Use Svelte 5 event syntax — onclick not on:click."

It also sometimes writes `$effect` where `$derived` is correct. If a value is purely computed from other state, it should be `$derived`, not `$effect` with a local variable.

For complex animation and transition code (`fly`, `fade`, nested transitions), Claude is less reliable — test those outputs carefully.

### Prompt Corrections That Work

Keep these one-liners ready for mid-session corrections:

- **Wrong event syntax**: "Use Svelte 5 event syntax — `onclick` not `on:click`"
- **Wrong reactivity primitive**: "That value is computed, use `$derived` not `$effect` with a local variable"
- **Old prop syntax**: "Use `$props()` destructuring, not `export let`"
- **Store instead of runes**: "This is a Svelte 5 project — use a `.svelte.ts` module with `$state`, not a writable store"

Pasting these corrections directly into the chat is faster than re-explaining the Svelte 5 migration context, and Claude applies the correction cleanly without needing a full restart.
## Advanced: Reactive State with Nested Objects

Claude handles complex nested state correctly when you guide it:

**Prompt:**
```text
Create a Svelte 5 component for managing a nested user profile object with name, email, and preferences (theme, notifications).
Use $state and $derived to keep a dirty flag that tracks if any field has been modified.
The component should have Save and Cancel buttons.
```

**Claude output:**
```svelte
<script lang="ts">
  const {
    user,
    onSave,
  } = $props<{
    user: User;
    onSave: (user: User) => Promise<void>;
  }>();

  let draft = $state.snapshot(user);

  const isDirty = $derived(JSON.stringify(draft) !== JSON.stringify(user));

  function handleChange(field: keyof User, value: any) {
    draft[field] = value;
  }

  async function save() {
    await onSave(draft);
  }

  function cancel() {
    draft = $state.snapshot(user);
  }
</script>

<div class="form">
  <input
    type="text"
    value={draft.name}
    onchange={(e) => handleChange('name', e.currentTarget.value)}
  />

  <button onclick={save} disabled={!isDirty}>Save</button>
  <button onclick={cancel}>Cancel</button>
</div>
```

This uses `$state.snapshot()` to create a shallow copy for the draft — correct but worth understanding. Deep nested object mutations won't trigger reactivity without reassignment at each level.

## Form Validation Patterns

Ask Claude for schema-based form validation:

```text
Create a Svelte 5 form component that validates with Zod.
Fields: email (required, must be email), password (min 8 chars), confirmPassword (must match password).
Show error messages below each field as the user types.
Disable the submit button if validation fails.
```

Claude generates:
```svelte
<script lang="ts">
  import { z } from 'zod';

  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

  let formData = $state({
    email: '',
    password: '',
    confirmPassword: '',
  });

  let errors = $derived.by(() => {
    const result = schema.safeParse(formData);
    return result.success ? {} : result.error.flatten().fieldErrors;
  });

  const isValid = $derived(Object.keys(errors).length === 0);
</script>

<form onsubmit={(e) => { e.preventDefault(); if (isValid) handleSubmit(); }}>
  <input
    type="email"
    value={formData.email}
    onchange={(e) => formData.email = e.currentTarget.value}
  />
  {#if errors.email}
    <span class="error">{errors.email.join(', ')}</span>
  {/if}
</form>
```

Claude correctly uses `$derived.by()` with a function to compute complex validation state and includes the Zod `.refine()` call for cross-field validation.

## Event Forwarding and Bubbling

Claude sometimes forgets that Svelte 5 doesn't auto-forward events. Guide it:

```text
Create a reusable Button component that accepts an onclick prop and forwards it properly.
Do not use on:click directives. Use onclick prop and call it directly.
```

Claude will then produce:
```svelte
<script lang="ts">
  const { onclick, children, ...attrs } = $props();
</script>

<button {onclick} {...attrs}>
  {#if children}
    {children}
  {/if}
</button>
```

This is the correct Svelte 5 pattern — pass `onclick` as a prop and invoke it directly, not through a directive.

## Performance: Server-Side Rendering with +page.svelte

Ask Claude for SSR patterns that render on the server and hydrate correctly:

```text
Create a +page.svelte that uses the load function data to render a list of posts.
Include a count of total posts derived from the data.
Ensure this works with server-side rendering.
```

Claude generates:
```svelte
<script lang="ts">
  import type { PageData } from './$types';

  const { posts, totalCount } = $props<PageData>();

  const postCount = $derived(posts.length);
</script>

<h1>Posts ({postCount} of {totalCount})</h1>
{#each posts as post (post.id)}
  <article>{post.title}</article>
{/each}
```

This correctly uses typed PageData and avoids state that would cause hydration mismatches.

## Related Articles

- [AI Coding Assistant Accuracy for TypeScript Svelte Component](/ai-tools-compared/ai-coding-assistant-accuracy-for-typescript-svelte-component/)
- [Claude Max vs Claude Pro Actual Difference](/ai-tools-compared/claude-max-vs-claude-pro-actual-difference-in-daily-message-limits/)
- [Claude Code Losing Context Across Sessions](/ai-tools-compared/claude-code-losing-context-across-sessions-fix/)
- [Claude Code Go Module Development Guide](/ai-tools-compared/claude-code-go-module-development-guide/)
- [How to Build Custom MCP Servers for Claude](/ai-tools-compared/how-to-build-custom-mcp-servers-for-claude)
Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
