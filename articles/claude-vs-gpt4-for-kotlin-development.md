---
layout: default
title: "Claude vs GPT-4 for Kotlin Development"
description: "Compare Claude and GPT-4 for Kotlin: coroutines, data classes, extension functions, Spring Boot integration, and Android development tasks"
date: 2026-03-22
author: theluckystrike
permalink: /claude-vs-gpt4-for-kotlin-development/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, comparison, claude-ai]
---

{% raw %}
# Claude vs GPT-4 for Kotlin Development

Kotlin has enough unique features — coroutines, sealed classes, extension functions, null safety — that AI tools that excel at Java often generate Kotlin that's technically correct but stylistically wrong. This comparison tests Claude and GPT-4 on tasks that are distinctly Kotlin, not just Java with different syntax.

---

## Test Setup

Tasks tested:
1. Writing idiomatic coroutine code (not just wrapping in `runBlocking`)
2. Sealed class hierarchies for domain modeling
3. Extension functions for existing types
4. Spring Boot + Kotlin: suspend controller functions
5. Android: ViewModel with Flow

---

## Test 1: Coroutines — Idiomatic vs Technically Correct

**Prompt:**
```
Write a function that fetches user data and their orders concurrently
from two separate API endpoints. Handle errors gracefully and return
a combined result. Use Kotlin coroutines.
```

**Claude:**

```kotlin
import kotlinx.coroutines.*

data class User(val id: String, val name: String)
data class Order(val id: String, val total: Double)
data class UserWithOrders(val user: User, val orders: List<Order>)

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val cause: Throwable? = null) : Result<Nothing>()
}

suspend fun fetchUserWithOrders(
    userId: String,
    userService: UserService,
    orderService: OrderService,
): Result<UserWithOrders> = coroutineScope {
    val userDeferred = async { userService.getUser(userId) }
    val ordersDeferred = async { orderService.getOrdersForUser(userId) }

    try {
        val user = userDeferred.await()
        val orders = ordersDeferred.await()
        Result.Success(UserWithOrders(user, orders))
    } catch (e: CancellationException) {
        throw e  // never swallow CancellationException
    } catch (e: Exception) {
        Result.Error("Failed to fetch user data for $userId", e)
    }
}
```

Claude correctly:
- Used `coroutineScope` instead of `GlobalScope`
- Re-throws `CancellationException` (critical for cooperative cancellation)
- Used `async`/`await` for concurrent execution
- Returned a sealed class result type

**GPT-4:**

```kotlin
import kotlinx.coroutines.*

suspend fun fetchUserWithOrders(userId: String): UserWithOrders {
    return withContext(Dispatchers.IO) {
        val userDeferred = async { fetchUser(userId) }
        val ordersDeferred = async { fetchOrders(userId) }

        try {
            UserWithOrders(userDeferred.await(), ordersDeferred.await())
        } catch (e: Exception) {
            throw RuntimeException("Failed to fetch data", e)
        }
    }
}
```

GPT-4 output is functional but has two issues:
1. Catches and rethrows `CancellationException` as `RuntimeException` — breaks coroutine cancellation
2. Uses `withContext(Dispatchers.IO)` unnecessarily if the functions are already `suspend` — adds overhead

For production Kotlin code, Claude's output is significantly safer.

---

## Test 2: Sealed Class Domain Modeling

**Prompt:**
```
Model a payment processing domain with sealed classes.
States: Pending, Processing, Succeeded, Failed, Refunded.
Include transition functions that return the next valid state or an error.
```

**Claude:**

```kotlin
import java.time.Instant

sealed class PaymentState {
    abstract val paymentId: String
    abstract val createdAt: Instant

    data class Pending(
        override val paymentId: String,
        override val createdAt: Instant = Instant.now(),
        val amountCents: Long,
        val currency: String,
    ) : PaymentState()

    data class Processing(
        override val paymentId: String,
        override val createdAt: Instant,
        val amountCents: Long,
        val currency: String,
        val processorRef: String,
        val processingStartedAt: Instant = Instant.now(),
    ) : PaymentState()

    data class Succeeded(
        override val paymentId: String,
        override val createdAt: Instant,
        val amountCents: Long,
        val currency: String,
        val processorRef: String,
        val succeededAt: Instant = Instant.now(),
    ) : PaymentState()

    data class Failed(
        override val paymentId: String,
        override val createdAt: Instant,
        val amountCents: Long,
        val currency: String,
        val processorRef: String?,
        val reason: String,
        val failedAt: Instant = Instant.now(),
    ) : PaymentState()

    data class Refunded(
        override val paymentId: String,
        override val createdAt: Instant,
        val amountCents: Long,
        val currency: String,
        val refundedAmountCents: Long,
        val refundedAt: Instant = Instant.now(),
    ) : PaymentState()
}

fun PaymentState.startProcessing(processorRef: String): Result<PaymentState.Processing> =
    when (this) {
        is PaymentState.Pending -> Result.success(
            PaymentState.Processing(
                paymentId = paymentId,
                createdAt = createdAt,
                amountCents = amountCents,
                currency = currency,
                processorRef = processorRef,
            )
        )
        else -> Result.failure(
            IllegalStateException("Cannot start processing from state ${this::class.simpleName}")
        )
    }

fun PaymentState.markSucceeded(): Result<PaymentState.Succeeded> =
    when (this) {
        is PaymentState.Processing -> Result.success(
            PaymentState.Succeeded(
                paymentId = paymentId,
                createdAt = createdAt,
                amountCents = amountCents,
                currency = currency,
                processorRef = processorRef,
            )
        )
        else -> Result.failure(
            IllegalStateException("Cannot succeed from state ${this::class.simpleName}")
        )
    }
```

**GPT-4** generated a similar structure but used an `enum class` for state names inside a regular class, then added `when` statements that weren't exhaustive and didn't use Kotlin's `Result` type — it returned nullable types instead. The code worked but missed idiomatic patterns.

---

## Test 3: Spring Boot Suspend Controller

**Prompt:**
```
Write a Spring Boot controller in Kotlin with suspend functions
for a REST endpoint that fetches data from a database using R2DBC.
Include proper error handling and response types.
```

**Claude:**

```kotlin
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import kotlinx.coroutines.flow.Flow

@RestController
@RequestMapping("/api/users")
class UserController(
    private val userRepository: UserRepository,
    private val userService: UserService,
) {
    @GetMapping("/{id}")
    suspend fun getUser(@PathVariable id: Long): ResponseEntity<UserResponse> {
        val user = userService.findById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(user.toResponse())
    }

    @GetMapping
    fun getAllUsers(): Flow<UserResponse> =
        userService.findAll().map { it.toResponse() }

    @PostMapping
    suspend fun createUser(@RequestBody request: CreateUserRequest): ResponseEntity<UserResponse> {
        val user = userService.create(request)
        return ResponseEntity
            .created(URI.create("/api/users/${user.id}"))
            .body(user.toResponse())
    }

    @ExceptionHandler(UserNotFoundException::class)
    suspend fun handleNotFound(e: UserNotFoundException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(404).body(ErrorResponse(e.message ?: "Not found"))
}

// R2DBC repository
interface UserRepository : CoroutineCrudRepository<User, Long> {
    fun findByEmail(email: String): Flow<User>
    suspend fun findByEmailAndActive(email: String, active: Boolean): User?
}
```

GPT-4 generated valid Spring Boot code but used `@Async` annotations instead of `suspend` functions — mixing threading models in a way that undermines the purpose of using coroutines with R2DBC.

---

## Comparison Summary

| Task | Claude | GPT-4 |
|------|--------|-------|
| Coroutine safety | Correctly handles CancellationException | Swallows CancellationException |
| Sealed class usage | Idiomatic with Result type | Uses nullable or enum hybrid |
| Extension functions | Clean, idiomatic | Sometimes generates companion object methods instead |
| Spring Boot + coroutines | Uses suspend correctly | May mix @Async and suspend |
| Android ViewModel/Flow | StateFlow patterns correct | Occasionally uses LiveData instead |
| Null safety | Consistent use of `?.`, `?:` | Sometimes adds `!!` unnecessarily |
| Java interop | Handles `@JvmStatic`, `@JvmField` | Knows the annotations, sometimes misplaces them |

---

## When GPT-4 Performs Better

GPT-4 has an edge on:
- **Generating boilerplate quickly** — data transfer objects, mappers, converters
- **Gradle build file configuration** — more up-to-date knowledge of Kotlin Gradle DSL
- **Android XML layout generation** — more training data on Android UI patterns
- **Explaining Java-to-Kotlin migration steps** — clear, step-by-step

---

## Practical Recommendation

For coroutines, sealed classes, and anything that requires understanding Kotlin's type system and idioms: use Claude. The CancellationException handling alone can save debugging hours.

For rapid boilerplate generation — data classes, repository interfaces, mapper functions — either tool works fine and GPT-4's speed advantage may matter.

In Cursor, use Claude as the backend model when working on Kotlin with coroutines. The codebase context + Claude's Kotlin idiom understanding is the strongest combination available.

---

## Related Reading

- [AI Code Completion for Kotlin Compose Multiplatform](/ai-tools-compared/ai-code-completion-for-kotlin-compose-multiplatform-shared-u/)
- [Claude vs ChatGPT for Refactoring Legacy Java to Kotlin](/ai-tools-compared/claude-vs-chatgpt-for-refactoring-legacy-java-code-to-kotlin/)
- [Best AI for Writing Correct Kotlin Multiplatform Shared Code](/ai-tools-compared/best-ai-for-writing-correct-kotlin-multiplatform-shared-code/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
