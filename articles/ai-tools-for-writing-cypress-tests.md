---
layout: default
title: "Best AI Tools for Writing Cypress Tests"
description: "Compare Claude, GPT-4, and Copilot for writing Cypress E2E tests from scratch. Real selector strategies, custom commands, and intercept patterns included"
date: 2026-03-22
author: theluckystrike
permalink: /ai-tools-for-writing-cypress-tests/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Writing Cypress tests by hand is tedious. You need to think about selectors, async handling, network intercepts, and reusable commands all at once. AI tools can generate a working test scaffold in seconds. but the output quality varies significantly. This guide covers how Claude, GPT-4, and GitHub Copilot perform when writing new Cypress tests from requirements or existing UI code.

What Good Cypress Test Generation Looks Like

A well-written Cypress test avoids brittle selectors, handles async operations correctly, and uses custom commands for repeated flows. The AI needs to:

- Use `data-testid` attributes rather than CSS class selectors
- Chain assertions naturally without `.then()` callback soup
- Stub or intercept network requests for deterministic tests
- Structure tests with `beforeEach` hooks and `describe` blocks
- Know the difference between `cy.intercept()` and `cy.route()` (the latter is legacy)

Claude for Full Test File Generation

Claude performs best when given the component's HTML structure or a description of the user flow. It writes idiomatic Cypress 13+ code with correct assertion chaining.

Prompt:

```
Write a Cypress test for a login form. The form has:
- Email input: data-testid="email-input"
- Password input: data-testid="password-input"
- Submit button: data-testid="login-btn"
- Error message: data-testid="login-error"

The API endpoint is POST /api/auth/login. Test: successful login, wrong password,
network error. Use cy.intercept() for API mocking.
```

Claude's output:

```javascript
// cypress/e2e/login.cy.js
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('logs in successfully with valid credentials', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: { token: 'fake-jwt-token', user: { id: 1, email: 'user@example.com' } },
    }).as('loginRequest');

    cy.getByTestId('email-input').type('user@example.com');
    cy.getByTestId('password-input').type('correctpassword');
    cy.getByTestId('login-btn').click();

    cy.wait('@loginRequest').its('request.body').should('deep.equal', {
      email: 'user@example.com',
      password: 'correctpassword',
    });

    cy.url().should('include', '/dashboard');
  });

  it('shows error message for invalid credentials', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: { message: 'Invalid email or password' },
    }).as('loginFailed');

    cy.getByTestId('email-input').type('user@example.com');
    cy.getByTestId('password-input').type('wrongpassword');
    cy.getByTestId('login-btn').click();

    cy.wait('@loginFailed');
    cy.getByTestId('login-error')
      .should('be.visible')
      .and('contain.text', 'Invalid email or password');
  });

  it('handles network errors gracefully', () => {
    cy.intercept('POST', '/api/auth/login', { forceNetworkError: true }).as('networkError');

    cy.getByTestId('email-input').type('user@example.com');
    cy.getByTestId('password-input').type('anypassword');
    cy.getByTestId('login-btn').click();

    cy.wait('@networkError');
    cy.getByTestId('login-error').should('be.visible');
  });
});
```

Claude also generates the custom command to support `cy.getByTestId()`:

```javascript
// cypress/support/commands.js
Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});
```

GPT-4 for Test Generation from User Stories

GPT-4 handles natural language requirements well. Give it a user story and it maps it to test cases systematically.

Prompt - "User story: As a user, I can add items to cart, update quantities, and checkout. Write Cypress tests covering the happy path and edge cases like max quantity limits."

```javascript
// GPT-4 output. cypress/e2e/cart.cy.js
describe('Shopping Cart', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/products/*', { fixture: 'product.json' }).as('getProduct');
    cy.visit('/products/123');
    cy.wait('@getProduct');
  });

  it('adds item to cart and reflects in cart icon', () => {
    cy.intercept('POST', '/api/cart/items', {
      statusCode: 201,
      body: { cartItemId: 'abc', quantity: 1, total: 29.99 },
    }).as('addToCart');

    cy.get('[data-testid="add-to-cart-btn"]').click();
    cy.wait('@addToCart');

    cy.get('[data-testid="cart-badge"]').should('contain', '1');
  });

  it('enforces maximum quantity limit of 10', () => {
    cy.intercept('PUT', '/api/cart/items/*', (req) => {
      if (req.body.quantity > 10) {
        req.reply({ statusCode: 400, body: { message: 'Maximum quantity is 10' } });
      } else {
        req.reply({ statusCode: 200, body: { quantity: req.body.quantity } });
      }
    }).as('updateQuantity');

    cy.visit('/cart');
    cy.get('[data-testid="quantity-input"]').clear().type('11');
    cy.get('[data-testid="update-qty-btn"]').click();

    cy.wait('@updateQuantity');
    cy.get('[data-testid="qty-error"]').should('contain', 'Maximum quantity is 10');
  });

  it('completes checkout flow', () => {
    cy.intercept('POST', '/api/orders', {
      statusCode: 201,
      body: { orderId: 'order-456', status: 'confirmed' },
    }).as('createOrder');

    cy.visit('/cart');
    cy.get('[data-testid="checkout-btn"]').click();
    cy.get('[data-testid="card-number"]').type('4242424242424242');
    cy.get('[data-testid="card-expiry"]').type('12/28');
    cy.get('[data-testid="card-cvc"]').type('123');
    cy.get('[data-testid="place-order-btn"]').click();

    cy.wait('@createOrder');
    cy.url().should('include', '/orders/order-456/confirmation');
  });
});
```

GPT-4 tends to use `cy.get()` with `data-testid` attributes by default, which is correct, but sometimes falls back to class selectors when test IDs aren't obvious. Always check the selectors.

GitHub Copilot for In-Editor Completion

Copilot works inline. it's best when you've established the pattern in the file and let it continue.

```javascript
// Start typing: describe('Product Search', () => {
// Copilot fills in the structure based on file context

describe('Product Search', () => {
  beforeEach(() => {
    cy.visit('/search');
  });

  it('returns results for a valid search query', () => {
    // Copilot suggests the intercept + assertion chain
    cy.intercept('GET', '/api/search?q=*', { fixture: 'search-results.json' }).as('searchQuery');

    cy.get('[data-testid="search-input"]').type('laptop');
    cy.get('[data-testid="search-btn"]').click();

    cy.wait('@searchQuery');
    cy.get('[data-testid="result-item"]').should('have.length.greaterThan', 0);
  });

  // Copilot continues with: empty results, error state, filter tests...
});
```

Copilot is fastest for extending existing test files. It learns your naming conventions, your custom command patterns, and your fixture file structure from context. Weak for generating test files from scratch.

Handling Complex Scenarios - File Upload Tests

All three tools can handle file upload testing, but the approaches differ:

```javascript
// Reliable file upload test pattern (works with Claude/GPT-4 suggestions)
it('uploads a profile picture successfully', () => {
  cy.intercept('POST', '/api/profile/avatar', {
    statusCode: 200,
    body: { url: 'https://cdn.example.com/avatar-123.jpg' },
  }).as('uploadAvatar');

  // cy.selectFile is Cypress 9.3+ API. Claude knows this, GPT-4 sometimes uses deprecated form
  cy.get('[data-testid="avatar-upload"]').selectFile('cypress/fixtures/test-image.jpg');
  cy.get('[data-testid="upload-btn"]').click();

  cy.wait('@uploadAvatar');
  cy.get('[data-testid="avatar-preview"]')
    .should('have.attr', 'src')
    .and('include', 'avatar-123.jpg');
});
```

Claude consistently uses `cy.selectFile()` (the current API). GPT-4 sometimes outputs the older `cy.fixture().then()` pattern. always verify which Cypress version you're targeting.

Testing Authenticated Routes with Session Management

A common problem is needing to log in before every test. Claude generates session-based auth helpers correctly:

```javascript
// cypress/support/commands.js
Cypress.Commands.add('loginAs', (email, password) => {
  cy.session(
    [email, password],
    () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: { email, password },
      }).then((response) => {
        window.localStorage.setItem('auth_token', response.body.token);
      });
    },
    {
      validate() {
        cy.request('/api/auth/me').its('status').should('eq', 200);
      },
    }
  );
});

// Usage in tests:
describe('Admin Dashboard', () => {
  beforeEach(() => {
    cy.loginAs('admin@example.com', Cypress.env('ADMIN_PASSWORD'));
    cy.visit('/admin');
  });

  it('shows the user management panel', () => {
    cy.getByTestId('user-management-panel').should('be.visible');
  });
});
```

`cy.session()` caches the authenticated state across tests in the same spec, cutting login overhead from O(n) per test to O(1) per spec file. Copilot often skips session caching entirely and generates `cy.visit('/login')` + form filling in every `beforeEach`, which is functional but slow on large suites.

Testing Accessibility with AI-Generated Cypress Tests

Claude can extend Cypress tests with basic accessibility checks using the `cypress-axe` plugin:

Prompt - "Add axe-core accessibility checks to the login test. Run on page load and after the error state appears."

```javascript
// cypress/support/e2e.js. add once
import 'cypress-axe';

// cypress/e2e/login.cy.js. extended with a11y
describe('Login Flow. Accessibility', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.injectAxe();
  });

  it('has no accessibility violations on load', () => {
    cy.checkA11y('[data-testid="login-form"]', {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });
  });

  it('error state meets accessibility standards', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: { message: 'Invalid email or password' },
    }).as('loginFailed');

    cy.getByTestId('email-input').type('user@example.com');
    cy.getByTestId('password-input').type('wrong');
    cy.getByTestId('login-btn').click();
    cy.wait('@loginFailed');

    cy.getByTestId('login-error').should('be.visible');
    cy.checkA11y('[data-testid="login-form"]');
  });
});
```

Claude adds `cy.injectAxe()` in `beforeEach` (correct. must run after page load) and scopes `checkA11y` to the form element to avoid noise from unrelated components. GPT-4 often calls `checkA11y()` globally, generating violations from navigation or footer elements that aren't relevant to the feature under test.

Generating Fixtures with AI

You can also use Claude to generate fixture files that match your API contract:

Prompt - "Generate a Cypress fixture file for a list of 3 products. Each has id, name, price (number), category (string), and imageUrl (nullable string). Realistic values."

```json
// cypress/fixtures/products.json
[
  {
    "id": 1,
    "name": "Wireless Noise-Cancelling Headphones",
    "price": 249.99,
    "category": "Electronics",
    "imageUrl": "https://cdn.example.com/products/headphones-xm5.jpg"
  },
  {
    "id": 2,
    "name": "Ergonomic Office Chair",
    "price": 489.00,
    "category": "Furniture",
    "imageUrl": "https://cdn.example.com/products/chair-mesh.jpg"
  },
  {
    "id": 3,
    "name": "Artisan Coffee Blend 250g",
    "price": 18.50,
    "category": "Food & Drink",
    "imageUrl": null
  }
]
```

This is a small but useful application of AI in the testing workflow. Realistic fixture data catches edge cases (nullable fields, price formatting, long strings) that placeholder data misses.

Prompting Tips for Better Cypress Output

A few patterns that consistently improve AI-generated Cypress tests across all three tools:

Provide your Cypress version. Behavior changed significantly between Cypress 9, 10, and 12+. Start your prompt with "Using Cypress 13 with the default configuration..." and the tool will avoid legacy APIs.

Include your custom commands. Paste your `commands.js` file into the prompt. Both Claude and GPT-4 will use your existing commands (`cy.loginAs`, `cy.getByTestId`) rather than re-implementing them inline.

Specify your testing philosophy. "Avoid `.then()` callbacks, use `.should()` for assertions, and always wait on aliased intercepts before asserting" produces cleaner output than a bare request for tests.

Reference existing test files as examples. Pasting one well-written test file and saying "write more tests in this style for the checkout flow" gives more consistent results than generating from scratch. Copilot excels at this pattern in particular.

Tool Comparison

| Capability | Claude | GPT-4 | Copilot |
|---|---|---|---|
| Full test file from description | Excellent | Very Good | Weak |
| Modern API usage (cy.intercept, selectFile) | Excellent | Good (check version) | Good in context |
| Custom command generation | Yes | Yes | Sometimes |
| User story to test cases | Good | Excellent | No |
| In-editor completion | N/A | N/A | Excellent |
| Fixture file generation | Yes | Yes | No |
| Session-based auth helpers | Correct | Correct | Basic |
| Realistic fixture data | Good | Good | No |

Task 4 - Fixing Flaky Tests

When tests fail intermittently, AI helps diagnose race conditions:

Flaky test example:
```javascript
it('submits form after validation', () => {
  cy.get('[data-testid="email"]').type('user@example.com');
  cy.get('[data-testid="submit"]').click();
  cy.get('[data-testid="success-message"]').should('be.visible');  // Flaky here
});
```

Prompt to Claude:
```
This test is flaky. sometimes it passes, sometimes it fails at the success message.
The message appears after form validation (async check against server).
How do I fix the race condition?
```

Claude identifies the issue and suggests:

```javascript
// Problem: Clicking submit doesn't wait for async validation

// Solution 1: Intercept and wait for validation request
it('submits form after validation', () => {
  cy.intercept('POST', '/api/validate', { statusCode: 200 }).as('validate');

  cy.get('[data-testid="email"]').type('user@example.com');
  cy.get('[data-testid="submit"]').click();

  // Explicitly wait for the validation request to complete
  cy.wait('@validate');

  // Now success message should be visible
  cy.get('[data-testid="success-message"]').should('be.visible');
});

// Solution 2: Use cy.findByText (retries until found)
// Better than cy.get for dynamic content
cy.findByText('Success!', { timeout: 5000 }).should('be.visible');

// Solution 3: Intercept the success state change
cy.intercept('POST', '/api/submit', (req) => {
  req.reply({ statusCode: 200, body: { status: 'success' } });
}).as('submitForm');

cy.get('[data-testid="submit"]').click();
cy.wait('@submitForm');
cy.get('[data-testid="success-message"]').should('be.visible');
```

Claude recognizes the async pattern and suggests the right fix. GPT-4 sometimes suggests flawed solutions like `cy.wait(2000)` (bad practice).

Task 5 - Custom Cypress Commands

Prompt - "Generate a custom command for the login flow that handles MFA. Takes email, password, and optional MFA code. Returns authenticated state."

```javascript
// cypress/support/commands.js

Cypress.Commands.add('loginWithMFA', (email, password, mfaCode = null) => {
  // Navigate to login
  cy.visit('/login');

  // Fill credentials
  cy.get('[data-testid="email"]').type(email);
  cy.get('[data-testid="password"]').type(password, { log: false }); // Hide password from logs

  // Intercept authentication request
  cy.intercept('POST', '/api/auth/login', (req) => {
    req.reply({
      statusCode: 200,
      body: {
        sessionToken: 'token-abc123',
        requiresMFA: !!mfaCode
      }
    });
  }).as('login');

  cy.get('[data-testid="login-btn"]').click();
  cy.wait('@login');

  // Handle MFA if provided
  if (mfaCode) {
    cy.get('[data-testid="mfa-input"]').should('be.visible');
    cy.get('[data-testid="mfa-input"]').type(mfaCode, { log: false });

    cy.intercept('POST', '/api/auth/mfa-verify', {
      statusCode: 200,
      body: { authenticated: true }
    }).as('mfaVerify');

    cy.get('[data-testid="mfa-submit"]').click();
    cy.wait('@mfaVerify');
  }

  // Verify we're logged in
  cy.url().should('include', '/dashboard');
  cy.get('[data-testid="user-menu"]').should('be.visible');
});

// Usage in tests:
it('logs in with MFA', () => {
  cy.loginWithMFA('user@example.com', 'password123', '123456');
});
```

Claude generates well-structured custom commands with error handling and secret masking. Copilot struggles with the logic flow.

E2E Testing Anti-Patterns - What Claude Catches

Claude can audit your Cypress suite and flag problems:

Prompt - "Review this Cypress test and identify anti-patterns:"

```javascript
it('creates a new project', () => {
  cy.get('.create-btn').click();          //  Brittle class selector
  cy.wait(2000);                          //  Hard-coded delay
  cy.get('input').first().type('name');   //  No testid, relies on order
  cy.get('textarea').type('description'); //  Same issue
  cy.get('form button').last().click();   //  Fragile selector
  cy.get('.success').should('exist');     //  Doesn't wait for visibility
});
```

Claude response:

```
Issues found:

1.  cy.wait(2000). Hard-coded delays fail in slow environments
   → Use cy.intercept() to wait for actual request

2.  .get('.create-btn'). Class selectors break when styling changes
   → Use data-testid attributes

3.  .get('input').first(). Relies on DOM order
   → Use data-testid for specific inputs

4.  .should('exist'). Element could be invisible
   → Use .should('be.visible')

Refactored:

it('creates a new project', () => {
  cy.intercept('POST', '/api/projects', { statusCode: 201 }).as('createProject');

  cy.get('[data-testid="create-btn"]').click();
  cy.get('[data-testid="project-name"]').type('name');
  cy.get('[data-testid="project-description"]').type('description');
  cy.get('[data-testid="save-btn"]').click();

  cy.wait('@createProject');
  cy.get('[data-testid="success-message"]').should('be.visible');
});
```

GPT-4 gives similar feedback but sometimes misses the `cy.wait()` delay issue.

Cypress Tools Comparison

| Aspect | Claude | GPT-4 | Copilot |
|--------|--------|-------|---------|
| Full test generation from requirements | Excellent | Very Good | Weak |
| Identifying flaky test causes | Excellent | Good | Moderate |
| Custom command design | Excellent | Good | Moderate |
| Anti-pattern detection | Excellent | Good | No |
| Modern API knowledge (cy.intercept) | Excellent | Good (sometimes outdated) | Good in-context |
| Fixture file generation | Yes | Yes | No |

Real-World Test Maintenance

Cypress test maintenance often requires quick fixes. Claude excels at "what broke my test":

```
My test was working last week, now it fails with:
"Timed out retrying after 4000ms: cy.click() failed because the
element has css property: pointer-events set to none"

The element exists in the DOM, but a loading overlay is blocking it.
```

Claude identifies - you need to wait for the overlay to disappear before clicking.

```javascript
// Fix: Wait for overlay to be gone
cy.get('[data-testid="loading-overlay"]').should('not.exist');
cy.get('[data-testid="submit-btn"]').click();

// Or use { force: true } only as last resort
cy.get('[data-testid="submit-btn"]').click({ force: true });
```

Related Articles

- [Best AI Tools for Writing Playwright Tests](/ai-tools-for-writing-playwright-tests-guide)
- [AI Tools for Writing Selenium to Cypress Test Migration 2026](/ai-tools-for-writing-selenium-cypress-test-migration-2026/)
- [ChatGPT vs Claude for Generating Cypress Component Test](/chatgpt-vs-claude-for-generating-cypress-component-test-boil/)
- [AI Tools for Debugging Flaky Cypress Tests Caused by Timing](/ai-tools-for-debugging-flaky-cypress-tests-caused-by-timing-issues/)
- [Best AI Tools for Writing Unit Tests Comparison 2026](/best-ai-tools-for-writing-unit-tests-comparison-2026/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
