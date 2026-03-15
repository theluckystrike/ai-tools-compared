---

layout: default
title: "Claude vs ChatGPT for Refactoring Legacy Java Code to Kotlin: Practical Comparison"
description: "A developer-focused comparison of Claude and ChatGPT for converting legacy Java code to Kotlin. Includes code examples, conversion strategies, and recommendations."
date: 2026-03-16
author: theluckystrike
permalink: /claude-vs-chatgpt-for-refactoring-legacy-java-code-to-kotlin/
reviewed: true
score: 8
categories: [comparisons]
intent-checked: true
voice-checked: true
---

# Claude vs ChatGPT for Refactoring Legacy Java Code to Kotlin: Practical Comparison

Claude generally produces more idiomatic Kotlin code when refactoring legacy Java, with better handling of null safety, extension functions, and coroutine migration. ChatGPT tends to generate more verbose conversions that preserve Java patterns verbatim. Here is a detailed breakdown of how each tool handles real-world Java-to-Kotlin migration tasks.

## Why Refactor Java to Kotlin?

Legacy Java codebases often contain verbose patterns that Kotlin simplifies significantly. Null safety alone eliminates entire categories of NullPointerException bugs. Data classes replace POJOs with minimal boilerplate. Coroutines provide a cleaner alternative to threading. However, automated conversion requires understanding both languages deeply, which makes AI tools valuable for accelerating migration.

## Test Scenario

To compare both tools fairly, I provided identical Java code to each and evaluated the Kotlin output for correctness, idiomatic style, and compile-readiness.

**Input Java Code:**

```java
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
    
    public User findUserById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }
        return userRepository.findById(id).orElse(null);
    }
    
    public List<User> findActiveUsers() {
        return userRepository.findAll().stream()
            .filter(user -> user.isActive())
            .collect(Collectors.toList());
    }
    
    public void notifyUser(Long userId, String message) {
        User user = findUserById(userId);
        if (user != null && user.getEmail() != null) {
            emailService.sendEmail(user.getEmail(), "Notification", message);
        }
    }
}
```

## Claude's Kotlin Output

Claude produced:

```kotlin
class UserService(
    private val userRepository: UserRepository,
    private val emailService: EmailService
) {
    fun findUserById(id: Long): User? {
        require(id != null) { "User ID cannot be null" }
        return userRepository.findById(id).orElse(null)
    }
    
    fun findActiveUsers(): List<User> {
        return userRepository.findAll()
            .filter { it.isActive() }
    }
    
    fun notifyUser(userId: Long, message: String) {
        val user = findUserById(userId)
        user?.email?.let { email ->
            emailService.sendEmail(email, "Notification", message)
        }
    }
}
```

Key improvements: Used Kotlin primary constructor syntax, replaced `List` with concrete type inference, applied safe call operator (`?.`), converted `require()` from manual null check, removed unnecessary `stream()` and `Collectors.toList()` ( Kotlin `filter` returns `List`).

## ChatGPT's Kotlin Output

ChatGPT produced:

```kotlin
class UserService(
    private val userRepository: UserRepository,
    private val emailService: EmailService
) {
    fun findUserById(id: Long): User? {
        if (id == null) {
            throw IllegalArgumentException("User ID cannot be null")
        }
        return userRepository.findById(id).orElse(null)
    }
    
    fun findActiveUsers(): List<User> {
        return userRepository.findAll().stream()
            .filter { user -> user.isActive() }
            .collect(Collectors.toList())
    }
    
    fun notifyUser(userId: Long?, message: String) {
        val user = findUserById(userId!!)
        if (user != null && user.email != null) {
            emailService.sendEmail(user.email, "Notification", message)
        }
    }
}
```

Issues: Retained Java `stream()` pattern, unnecessary `!!` operator introduced, parameter changed to nullable `Long?` unnecessarily, less idiomatic use of safe calls.

## Null Safety Handling

Null safety is where the tools diverge most significantly. Claude consistently applies Kotlin's null-safe operators, while ChatGPT often preserves Java's explicit null-checking patterns.

**Java Input:**

```java
public String getUserDisplayName(User user) {
    if (user != null && user.getProfile() != null 
        && user.getProfile().getName() != null) {
        return user.getProfile().getName();
    }
    return "Unknown";
}
```

**Claude:**
```kotlin
fun getUserDisplayName(user: User?): String {
    return user?.profile?.name ?: "Unknown"
}
```

**ChatGPT:**
```kotlin
fun getUserDisplayName(user: User?): String {
    if (user != null && user.profile != null && user.profile.name != null) {
        return user.profile.name!!
    }
    return "Unknown"
}
```

Claude uses the Elvis operator (`:?`) for clean null coalescing. ChatGPT keeps verbose checks and introduces a `!!` assertion, which defeats null safety benefits.

## Data Class Conversions

Converting Java POJOs to Kotlin data classes reveals another pattern difference.

**Java Input:**

```java
public class User {
    private Long id;
    private String name;
    private String email;
    private boolean active;
    
    // Getters, setters, equals, hashCode, toString...
}
```

**Claude:**
```kotlin
data class User(
    val id: Long,
    val name: String,
    val email: String,
    val active: Boolean
)
```

**ChatGPT:**
```kotlin
class User(
    var id: Long?,
    var name: String?,
    var email: String?,
    var active: Boolean
) {
    // Empty class body - but often includes commented-out boilerplate
}
```

Claude produces a true data class with val properties, leveraging Kotlin immutability by default. ChatGPT sometimes generates regular classes with nullable types and var properties, missing the point of Kotlin's data class benefits.

## Coroutine Migration

For async Java code, both tools handle conversion differently.

**Java Input:**

```java
public CompletableFuture<User> fetchUserAsync(Long id) {
    return CompletableFuture.supplyAsync(() -> {
        return userRepository.findById(id).orElse(null);
    });
}
```

**Claude:**
```kotlin
suspend fun fetchUserAsync(id: Long): User? {
    return userRepository.findById(id).orElse(null)
}
```

**ChatGPT:**
```kotlin
fun fetchUserAsync(id: Long): CompletableFuture<User?> {
    return CompletableFuture.supplyAsync {
        userRepository.findById(id).orElse(null)
    }
}
```

Claude recognizes that Kotlin coroutines can replace `CompletableFuture` for simpler cases, producing code that integrates naturally with Kotlin async patterns. ChatGPT preserves the Java async pattern verbatim, missing the opportunity for modern Kotlin concurrency.

## When ChatGPT Performs Better

ChatGPT occasionally excels in specific scenarios: generating extensive inline documentation, maintaining exact behavioral parity when the Java code has complex edge cases, and providing multiple conversion approaches in a single response. For large-scale migrations, ChatGPT's willingness to output more verbose code can be advantageous when strict behavioral equivalence is prioritized over idiomatic style.

## Recommendations

Use Claude for most Java-to-Kotlin migrations. Its Kotlin output is more idiomatic, better leverages language features, and requires less manual cleanup. The null safety handling alone saves significant refactoring time.

Use ChatGPT when you need verbose conversion with extensive comments, when converting code with complex business logic that must be preserved exactly, or when you want to see multiple approaches side by side for educational purposes.

For production migrations, run both tools on your codebase and compare outputs. Claude's results typically require less manual intervention, but ChatGPT can serve as a useful reference for edge cases.

Built by theluckystrike — More at [zovo.one](https://zovo.one)
