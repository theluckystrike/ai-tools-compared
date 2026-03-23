---
layout: default
title: "Claude vs GPT-4 for Writing Unit Test Mocks"
description: "Compare Claude and GPT-4 for generating unit test mocks and stubs in Python, TypeScript, and Java — including spy objects, partial mocks, and async mocking"
date: 2026-03-22
author: theluckystrike
permalink: /claude-vs-gpt4-for-unit-test-mocks/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, comparison, claude-ai]
---

{% raw %}

Mocking is where unit test generation gets hard. Simple mocks of external services are easy — both Claude and GPT-4 handle them. The difficult cases are: mocking complex dependency graphs, creating partial mocks without breaking unrelated methods, handling async/Promise mocks, and generating typed mocks in TypeScript without losing type safety. This guide compares both on these harder scenarios.

## Task 1: TypeScript — Mocking a Service with Type Safety

**Prompt:** "Write a Jest test for this TypeScript service. Mock the UserRepository and EmailService dependencies. The mock should maintain TypeScript type safety — no `any` casts."

**The service under test:**

```typescript
// user-service.ts
export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async registerUser(email: string, name: string): Promise<User> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new ConflictError('Email already registered');

    const user = await this.userRepo.create({ email, name });
    await this.emailService.sendWelcome(user);
    return user;
  }
}
```

**Claude's typed mock test:**

```typescript
// user-service.test.ts
import { UserService } from './user-service';
import { UserRepository } from './user-repository';
import { EmailService } from './email-service';
import { ConflictError } from './errors';

// Create typed mocks using jest.Mocked<T>
const mockUserRepo: jest.Mocked<UserRepository> = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockEmailService: jest.Mocked<EmailService> = {
  sendWelcome: jest.fn(),
  sendPasswordReset: jest.fn(),
  sendNotification: jest.fn(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(mockUserRepo, mockEmailService);
  });

  describe('registerUser', () => {
    const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };

    it('creates a new user and sends welcome email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockEmailService.sendWelcome.mockResolvedValue(undefined);

      const result = await service.registerUser('test@example.com', 'Test User');

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(mockEmailService.sendWelcome).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('throws ConflictError when email already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.registerUser('test@example.com', 'Test User')
      ).rejects.toThrow(ConflictError);

      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendWelcome).not.toHaveBeenCalled();
    });

    it('propagates email service failure', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockEmailService.sendWelcome.mockRejectedValue(new Error('SMTP failure'));

      await expect(
        service.registerUser('test@example.com', 'Test User')
      ).rejects.toThrow('SMTP failure');
    });
  });
});
```

Claude uses `jest.Mocked<T>` to preserve full type safety without any `as any` casts. GPT-4 sometimes generates `const mockUserRepo = { findByEmail: jest.fn(), ... } as UserRepository`, which loses type checking on the mock setup calls.

**Winner: Claude** — `jest.Mocked<T>` usage is idiomatic and type-safe.

## Task 2: Python — Partial Mocking with pytest-mock

**Scenario:** Mock only one method of a class, leaving others intact.

**Prompt:** "Write a pytest test that partially mocks the `DatabaseService` class — only mock the `execute_raw_sql` method, leave all other methods running their real implementation."

**GPT-4's approach:**

```python
# GPT-4 — patches the entire class, not just one method
from unittest.mock import patch, MagicMock

def test_with_mock_db():
    with patch('myapp.services.DatabaseService') as MockDB:
        mock_instance = MockDB.return_value
        mock_instance.execute_raw_sql.return_value = [{'id': 1}]
        # But now ALL methods are mocked, not just execute_raw_sql
```

**Claude's correct partial mock approach:**

```python
# claude-suggested approach — uses mocker.patch.object for method-level patching
import pytest
from myapp.services import DatabaseService, UserQueryService


@pytest.fixture
def real_db_service(db_session):
    """Actual DatabaseService connected to test DB."""
    return DatabaseService(db_session)


def test_query_with_partial_mock(real_db_service, mocker):
    """Only mock execute_raw_sql; other methods use real implementation."""

    # Patch only the specific method on the instance
    mock_raw_sql = mocker.patch.object(
        real_db_service,
        'execute_raw_sql',
        return_value=[{'id': 1, 'email': 'test@example.com'}]
    )

    service = UserQueryService(real_db_service)
    result = service.get_active_users()

    # Real methods like build_query() ran, only execute_raw_sql was intercepted
    mock_raw_sql.assert_called_once()
    call_args = mock_raw_sql.call_args[0][0]
    assert 'WHERE active = true' in call_args
    assert len(result) == 1


def test_spy_on_method_without_blocking(real_db_service, mocker):
    """Use spy to track calls without blocking execution."""
    spy = mocker.spy(real_db_service, 'execute_raw_sql')

    service = UserQueryService(real_db_service)
    service.get_active_users()  # Runs real SQL

    # Verify the method was called with expected query
    assert spy.call_count == 1
    assert 'SELECT' in spy.call_args[0][0].upper()
```

Claude correctly distinguishes `mocker.patch.object` (replaces the method) from `mocker.spy` (records calls without blocking). GPT-4 conflates these patterns.

## Task 3: Java — Mockito with Argument Captors

**Prompt:** "Write a JUnit 5 test using Mockito for an OrderService that calls PaymentGateway. Use ArgumentCaptor to verify the exact payment request object, including nested fields."

**Claude:**

```java
// OrderServiceTest.java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private PaymentGateway paymentGateway;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderService orderService;

    @Captor
    private ArgumentCaptor<PaymentRequest> paymentRequestCaptor;

    @Test
    void processOrder_sendsCorrectPaymentRequest() {
        // Arrange
        Order order = Order.builder()
            .id("order-123")
            .customerId("cust-456")
            .amount(BigDecimal.valueOf(99.99))
            .currency("USD")
            .items(List.of(new OrderItem("prod-1", 2, BigDecimal.valueOf(49.995))))
            .build();

        PaymentResult successResult = PaymentResult.success("txn-789");
        when(paymentGateway.charge(any(PaymentRequest.class))).thenReturn(successResult);
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        orderService.processOrder(order);

        // Assert — capture and verify the exact PaymentRequest sent
        verify(paymentGateway).charge(paymentRequestCaptor.capture());
        PaymentRequest captured = paymentRequestCaptor.getValue();

        assertThat(captured.getAmount()).isEqualByComparingTo("99.99");
        assertThat(captured.getCurrency()).isEqualTo("USD");
        assertThat(captured.getReference()).isEqualTo("order-123");
        assertThat(captured.getMetadata())
            .containsEntry("customer_id", "cust-456")
            .containsEntry("item_count", "1");
    }

    @Test
    void processOrder_throwsWhenPaymentDeclined() {
        Order order = Order.builder()
            .id("order-124")
            .amount(BigDecimal.valueOf(500.00))
            .currency("USD")
            .build();

        when(paymentGateway.charge(any())).thenReturn(PaymentResult.declined("insufficient_funds"));

        assertThatThrownBy(() -> orderService.processOrder(order))
            .isInstanceOf(PaymentDeclinedException.class)
            .hasMessageContaining("insufficient_funds");

        // Order should not be saved when payment fails
        verify(orderRepository, never()).save(any());
    }
}
```

Claude uses `@Captor` annotation (cleaner than `ArgumentCaptor.forClass()` inline), AssertJ fluent assertions, and `thenAnswer` for realistic repository mocking. GPT-4 sometimes uses JUnit 4 patterns (`@RunWith(MockitoJUnitRunner.class)`) in JUnit 5 tests.

## Task 4: Mocking Async Code — Node.js with Timers

Async code involving timers, queues, or retry logic is notoriously hard to mock. Claude handles this well; GPT-4 often produces tests that work only with `jest.useFakeTimers()` misconfigured.

**Prompt:** "Write a Jest test for a retry function that retries a failing async operation up to 3 times with exponential backoff. Mock time so the test runs instantly."

**Claude:**

```typescript
// retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// retry.test.ts
import { withRetry } from './retry';

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on third attempt', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success');

    // Start the retry (don't await yet — it's waiting on a timer)
    const resultPromise = withRetry(fn, 3, 1000);

    // Advance past first backoff (1000ms)
    await jest.advanceTimersByTimeAsync(1000);
    // Advance past second backoff (2000ms)
    await jest.advanceTimersByTimeAsync(2000);

    await expect(resultPromise).resolves.toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

    const resultPromise = withRetry(fn, 3, 100);

    // Advance past both backoff delays
    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(200);

    await expect(resultPromise).rejects.toThrow('persistent failure');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
```

The key: `jest.advanceTimersByTimeAsync()` (Jest 27+) is needed instead of `jest.advanceTimersByTime()` when the code under test uses `await` with timers. Claude knows this distinction; GPT-4 often uses the sync version, leaving tests that hang indefinitely.

## Task 5: Mocking HTTP Clients — MSW vs jest.mock

For testing code that makes HTTP requests, there are two schools: mock the HTTP layer with `jest.mock`, or intercept at the network level with MSW (Mock Service Worker). Claude explains both and recommends correctly.

**Claude's MSW approach for a React component test:**

```typescript
// handlers.ts — MSW request handlers
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    if (params.id === '404') {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({
      id: params.id,
      name: 'Test User',
      email: 'test@example.com',
    });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    if (!body.email) {
      return HttpResponse.json({ error: 'Email required' }, { status: 400 });
    }
    return HttpResponse.json({ id: 'new-123', ...body }, { status: 201 });
  }),
];

// setupTests.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// user-profile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { server } from './setupTests';
import { http, HttpResponse } from 'msw';
import UserProfile from './UserProfile';

it('displays user data', async () => {
  render(<UserProfile userId="123" />);
  await waitFor(() => expect(screen.getByText('Test User')).toBeInTheDocument());
});

it('shows error on 404', async () => {
  render(<UserProfile userId="404" />);
  await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
});

it('handles server error', async () => {
  // Override handler for this test only
  server.use(
    http.get('/api/users/:id', () => HttpResponse.json({}, { status: 500 }))
  );

  render(<UserProfile userId="123" />);
  await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
});
```

GPT-4 tends to reach for `jest.mock('axios')` or `jest.mock('fetch')` by default, which is lower fidelity and breaks if you swap HTTP libraries. Claude explains the MSW tradeoff clearly and uses the v2 MSW API (`http`, `HttpResponse`) rather than the deprecated v1 `rest` API.

## Comparison Summary

| Scenario | Claude | GPT-4 |
|---|---|---|
| TypeScript typed mocks | jest.Mocked<T> — no any casts | Sometimes uses `as Type` |
| Python partial mocking | Correct patch.object vs spy distinction | Often patches full class |
| Java Mockito | JUnit 5 patterns, @Captor, AssertJ | Sometimes JUnit 4 patterns |
| Async mock setup | mockResolvedValue/mockRejectedValue | Correct |
| Timer mocking | advanceTimersByTimeAsync (correct) | Sometimes uses sync variant |
| MSW vs jest.mock | Recommends MSW, uses v2 API | Defaults to jest.mock |
| Mock verification ordering | Handles ordered verification | Good |
| Complex nested matchers | Strong | Good |

## Related Reading

- [Best AI Tools for Generating Unit Test Mocks and Stubs 2026](/ai-tools-for-generating-unit-test-mocks-and-stubs-2026/)
- [Best AI Tools for Writing Unit Test Mocks 2026](/best-ai-tools-for-writing-unit-test-mocks-2026/)
- [AI Code Generation Quality for Java JUnit 5 Parameterized Tests](/ai-code-generation-quality-for-java-junit-5-parameterized-te/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
