---
layout: default
title: "Best AI Tools for Writing Playwright Tests"
description: "Compare Claude Code, Copilot, and Cursor for writing Playwright tests. page objects, network mocking, auth setup, and complex interaction patterns"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-writing-playwright-tests-guide
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Playwright tests fail in two ways: they don't test the right thing, or they fail on CI because of timing issues and environment differences. AI tools can write Playwright code quickly, but the quality gap shows up in locator strategy, wait handling, and test isolation. This guide covers the patterns that separate good Playwright AI output from bad.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - The Test Quality Spectrum

```
Level 1 - Brittle. querySelector selectors, arbitrary sleeps
Level 2 - Functional. getByRole/getByTestId, basic waits
Level 3 - Production. page object model, auth fixtures, network mocking
```

Most AI tools default to Level 1-2. Claude Code with context consistently reaches Level 3.

Step 2 - Task 1: Login Flow with Auth State

Prompt - "Write a Playwright test for login. Email/password form, redirects to dashboard on success."

Copilot's output:

```typescript
test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  expect(page.url()).toContain('/dashboard');
});
```

This works in isolation but:
- Uses `waitForNavigation()` which is deprecated in favor of `waitForURL`
- Doesn't save auth state (means logging in before every test)
- Uses CSS selectors instead of accessible locators

Claude's output:

```typescript
// tests/auth.setup.ts. Run once to create auth state
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email address').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for dashboard to confirm auth succeeded
  await page.waitForURL('/dashboard', { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

  // Save auth state for reuse across tests
  await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000' }
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json'  // Reuse auth state. no login per test
      },
      dependencies: ['setup']
    }
  ]
});
```

```typescript
// tests/dashboard.spec.ts. Uses saved auth state
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('shows user metrics on load', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for data to load (not arbitrary sleep)
    await expect(page.getByTestId('metrics-section')).toBeVisible();

    // Test specific content
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dashboard');
    await expect(page.getByTestId('revenue-card')).toBeVisible();
  });
});
```

Step 3 - Task 2: Page Object Model

Prompt - "Create a Page Object for a shopping cart page."

Cursor's output:

```typescript
// Cursor. flat functions, no class
async function addToCart(page: Page, productId: string) { ... }
async function getCartCount(page: Page) { ... }
```

Claude's output:

```typescript
// tests/pages/CartPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class CartPage {
  private readonly page: Page;

  // Locators defined as properties for reuse
  readonly cartItems: Locator;
  readonly emptyCartMessage: Locator;
  readonly checkoutButton: Locator;
  readonly orderSummary: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.getByTestId('cart-item');
    this.emptyCartMessage = page.getByText('Your cart is empty');
    this.checkoutButton = page.getByRole('link', { name: 'Proceed to Checkout' });
    this.orderSummary = page.getByTestId('order-summary');
  }

  async goto() {
    await this.page.goto('/cart');
    await this.page.waitForLoadState('networkidle');
  }

  async getItemCount(): Promise<number> {
    // Return 0 if empty state is showing
    if (await this.emptyCartMessage.isVisible()) return 0;
    return await this.cartItems.count();
  }

  async removeItem(productName: string) {
    const item = this.cartItems.filter({ hasText: productName });
    await item.getByRole('button', { name: 'Remove' }).click();
    // Wait for item to disappear, not arbitrary sleep
    await item.waitFor({ state: 'detached' });
  }

  async updateQuantity(productName: string, quantity: number) {
    const item = this.cartItems.filter({ hasText: productName });
    const quantityInput = item.getByRole('spinbutton', { name: /quantity/i });
    await quantityInput.fill(String(quantity));
    await quantityInput.press('Enter');
    // Wait for price recalculation
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/cart') && resp.status() === 200
    );
  }

  async getTotal(): Promise<string> {
    const totalEl = this.orderSummary.getByTestId('total-price');
    await expect(totalEl).toBeVisible();
    return await totalEl.textContent() ?? '';
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
    await this.page.waitForURL('/checkout/');
  }
}

// Usage in tests
test('removing last item shows empty state', async ({ page }) => {
  const cart = new CartPage(page);
  await cart.goto();

  const count = await cart.getItemCount();
  expect(count).toBeGreaterThan(0);

  await cart.removeItem('Product Name');
  await expect(cart.emptyCartMessage).toBeVisible();
});
```

Step 4 - Task 3: Network Mocking

Prompt - "Write a test that mocks the payment API to test error handling."

```typescript
// Claude's network mock implementation
import { test, expect } from '@playwright/test';

test.describe('Checkout error handling', () => {
  test('shows error message when payment fails', async ({ page }) => {
    // Mock the payment endpoint BEFORE navigating
    await page.route('/api/payments/charge', route => {
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_funds',
          message: 'Your card has insufficient funds.'
        })
      });
    });

    await page.goto('/checkout');
    await page.getByLabel('Card number').fill('4111111111111111');
    await page.getByLabel('Expiry').fill('12/28');
    await page.getByLabel('CVC').fill('123');
    await page.getByRole('button', { name: 'Pay now' }).click();

    // Verify error state
    await expect(page.getByRole('alert')).toContainText('insufficient funds');
    await expect(page.getByRole('button', { name: 'Pay now' })).toBeEnabled();
    // Verify URL didn't change (didn't navigate away)
    expect(page.url()).toContain('/checkout');
  });

  test('shows loading state during payment processing', async ({ page }) => {
    let resolvePayment: () => void;
    const paymentPromise = new Promise<void>(resolve => {
      resolvePayment = resolve;
    });

    // Delayed mock. payment hangs until we resolve it
    await page.route('/api/payments/charge', async route => {
      await paymentPromise;
      route.fulfill({
        status: 200,
        body: JSON.stringify({ status: 'succeeded', redirectUrl: '/orders/success' })
      });
    });

    await page.goto('/checkout');
    // Fill form...
    await page.getByRole('button', { name: 'Pay now' }).click();

    // Check loading state appears
    await expect(page.getByRole('button', { name: 'Processing...' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Processing...' })).toBeDisabled();

    // Resolve payment and verify success
    resolvePayment!();
    await page.waitForURL('/orders/success');
  });
});
```

Step 5 - Task 4: Visual Regression Testing

```typescript
// Claude adds visual regression snapshots properly
test('checkout page layout matches baseline', async ({ page }) => {
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  // Mask dynamic content before screenshot
  await expect(page).toHaveScreenshot('checkout-page.png', {
    mask: [
      page.getByTestId('user-name'),   // Mask dynamic user data
      page.getByTestId('session-id'),  // Mask session-specific values
    ],
    maxDiffPixels: 50  // Allow minor font rendering differences
  });
});
```

Tool Comparison

| Pattern | Claude Code | Copilot | Cursor |
|---|---|---|---|
| Auth state saving | Correct (storageState) | Login per test | Partial |
| Locator strategy | ARIA roles, test IDs | CSS selectors | Mixed |
| Wait strategy | waitForURL, waitForResponse | waitForNavigation, sleeps | Mostly correct |
| Page Object Model | Full class with typed locators | Functions only | Basic class |
| Network mocking | Route with delayed/error responses | Basic route.fulfill | Correct basics |
| Visual regression | mask + maxDiffPixels | Basic screenshot | Basic screenshot |

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Related Articles

- [Which AI Is Better for Writing Playwright End-to-End Tests](/which-ai-is-better-for-writing-playwright-end-to-end-tests-2/)
- [Best AI Tools for Writing Playwright E2E Tests 2026](/best-ai-tools-for-writing-playwright-e2e-tests-2026/)
- [Best AI Tools for Writing Playwright Tests 2026](/best-ai-tools-for-writing-playwright-tests-2026/)
- [Best AI for Writing Playwright Tests That Handle Dynamic](/best-ai-for-writing-playwright-tests-that-handle-dynamic-loa/)
- [Best AI Tools for Writing Cypress Tests](/ai-tools-for-writing-cypress-tests/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
