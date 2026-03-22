---
layout: default
title: "Claude vs Copilot for Java Spring Boot Microservices"
description: "Compare Claude and GitHub Copilot for Spring Boot microservices: service discovery, circuit breakers, reactive programming, and Docker Compose wiring"
date: 2026-03-22
author: theluckystrike
permalink: /claude-vs-copilot-java-spring-boot/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Spring Boot microservices involve more than single-service CRUD. A real microservices project needs service discovery, inter-service communication, resilience patterns (circuit breakers, retries), distributed tracing, and Docker Compose or Kubernetes wiring. This guide compares Claude and GitHub Copilot on these cross-service concerns — not basic REST controllers.

## Task 1: Feign Client with Circuit Breaker

**Scenario:** Service A needs to call Service B's REST API with a Resilience4j circuit breaker and fallback.

**Copilot (in-editor):**

When you type `@FeignClient(name = "user-service"`, Copilot completes the interface and generates basic method signatures. It knows Spring Cloud Feign idioms and adds `@GetMapping`, `@PostMapping` annotations correctly.

```java
// Copilot completion — basic, correct
@FeignClient(name = "user-service", url = "${user-service.url}")
public interface UserServiceClient {

    @GetMapping("/users/{id}")
    UserDto getUserById(@PathVariable Long id);

    @PostMapping("/users")
    UserDto createUser(@RequestBody CreateUserRequest request);
}
```

Copilot adds the basic client but doesn't add the circuit breaker integration. You need to prompt further.

**Claude (full solution):**

```java
// Claude generates the complete Feign client with Resilience4j circuit breaker
@FeignClient(
    name = "user-service",
    url = "${services.user-service.url}",
    fallbackFactory = UserServiceClient.UserServiceFallbackFactory.class
)
public interface UserServiceClient {

    @GetMapping("/users/{id}")
    UserDto getUserById(@PathVariable("id") Long id);

    @PostMapping("/users")
    UserDto createUser(@RequestBody CreateUserRequest request);

    @Component
    @Slf4j
    class UserServiceFallbackFactory implements FallbackFactory<UserServiceClient> {

        @Override
        public UserServiceClient create(Throwable cause) {
            log.error("UserService call failed, using fallback. Cause: {}", cause.getMessage());
            return new UserServiceClient() {

                @Override
                public UserDto getUserById(Long id) {
                    return UserDto.builder()
                        .id(id)
                        .name("Unknown User")
                        .status(UserStatus.UNAVAILABLE)
                        .build();
                }

                @Override
                public UserDto createUser(CreateUserRequest request) {
                    throw new ServiceUnavailableException("User service is currently unavailable");
                }
            };
        }
    }
}
```

```yaml
# application.yml — Claude includes this alongside the Java
spring:
  cloud:
    openfeign:
      circuitbreaker:
        enabled: true

resilience4j:
  circuitbreaker:
    instances:
      user-service:
        register-health-indicator: true
        sliding-window-size: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 5s
        permitted-number-of-calls-in-half-open-state: 3
        slow-call-duration-threshold: 2s
        slow-call-rate-threshold: 80
```

Claude generates the full solution including the `FallbackFactory` (which provides the Throwable cause, better than `Fallback`) and the corresponding `application.yml`. Copilot requires separate prompts for each piece.

## Task 2: Spring WebFlux Reactive Service

**Prompt to Claude:** "Write a reactive Spring WebFlux endpoint that fetches user data and their orders concurrently using Reactor, handles errors gracefully, and returns a combined DTO."

**Claude:**

```java
// UserOrderController.java — reactive endpoint
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserOrderController {

    private final UserWebClient userWebClient;
    private final OrderWebClient orderWebClient;

    @GetMapping("/{userId}/profile")
    public Mono<UserProfileDto> getUserProfile(@PathVariable Long userId) {
        // Fetch user and orders concurrently using Mono.zip
        return Mono.zip(
            userWebClient.getUser(userId)
                .onErrorResume(WebClientResponseException.NotFound.class,
                    ex -> Mono.error(new UserNotFoundException("User not found: " + userId))),
            orderWebClient.getOrdersByUserId(userId)
                .onErrorResume(ex -> {
                    log.warn("Failed to fetch orders for user {}: {}", userId, ex.getMessage());
                    return Mono.just(List.of()); // Degrade gracefully
                })
                .collectList()
        )
        .map(tuple -> UserProfileDto.builder()
            .user(tuple.getT1())
            .orders(tuple.getT2())
            .orderCount(tuple.getT2().size())
            .build()
        )
        .timeout(Duration.ofSeconds(5))
        .onErrorMap(TimeoutException.class,
            ex -> new GatewayTimeoutException("Profile fetch timed out"));
    }
}
```

```java
// UserWebClient.java — Claude generates the WebClient wrapper too
@Component
public class UserWebClient {

    private final WebClient webClient;

    public UserWebClient(WebClient.Builder builder,
                         @Value("${services.user-service.url}") String baseUrl) {
        this.webClient = builder
            .baseUrl(baseUrl)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    public Mono<UserDto> getUser(Long userId) {
        return webClient.get()
            .uri("/users/{id}", userId)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError,
                resp -> resp.bodyToMono(ErrorResponse.class)
                    .flatMap(err -> Mono.error(new ClientException(err.getMessage()))))
            .bodyToMono(UserDto.class)
            .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
                .filter(ex -> ex instanceof WebClientRequestException));
    }
}
```

Copilot generates basic `WebClient` calls but typically doesn't add `Mono.zip` for concurrent calls, fallback behavior on order fetch failure, or the retry configuration. It requires multiple prompts.

## Task 3: Docker Compose for Multi-Service Development

**Prompt:** "Generate Docker Compose for: Spring Boot API Gateway (port 8080), User Service, Order Service, PostgreSQL (one DB with two schemas), Redis, and Zipkin for distributed tracing."

**Claude's docker-compose.yml:**

```yaml
services:
  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - SERVICES_USER_SERVICE_URL=http://user-service:8081
      - SERVICES_ORDER_SERVICE_URL=http://order-service:8082
      - MANAGEMENT_ZIPKIN_TRACING_ENDPOINT=http://zipkin:9411/api/v2/spans
    depends_on:
      user-service:
        condition: service_healthy
      order-service:
        condition: service_healthy

  user-service:
    build: ./user-service
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/appdb
      - SPRING_DATASOURCE_USERNAME=appuser
      - SPRING_DATASOURCE_PASSWORD=secret
      - SPRING_FLYWAY_SCHEMAS=users
      - SPRING_REDIS_HOST=redis
      - MANAGEMENT_ZIPKIN_TRACING_ENDPOINT=http://zipkin:9411/api/v2/spans
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  order-service:
    build: ./order-service
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/appdb
      - SPRING_DATASOURCE_USERNAME=appuser
      - SPRING_DATASOURCE_PASSWORD=secret
      - SPRING_FLYWAY_SCHEMAS=orders
      - MANAGEMENT_ZIPKIN_TRACING_ENDPOINT=http://zipkin:9411/api/v2/spans
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8082/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    ports:
      - "5432:5432"  # Expose for local debugging

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"

  zipkin:
    image: openzipkin/zipkin:3
    ports:
      - "9411:9411"

volumes:
  postgres_data:
```

Claude uses `service_healthy` conditions for `depends_on` (requires healthchecks), separates the two schemas via Flyway configuration, and adds the Redis eviction policy. Copilot generates simpler Docker Compose but misses the health check conditions.

## Related Reading

- [Copilot vs Claude for Generating Java Spring Boot](/ai-tools-compared/copilot-vs-claude-for-generating-java-spring-boot-applicatio/)
- [AI Code Generation for Java Reactive Programming with Project Reactor](/ai-tools-compared/ai-code-generation-for-java-reactive-programming-with-projec/)
- [AI Code Generation Quality for Java Spring Security Configuration](/ai-tools-compared/ai-code-generation-quality-for-java-spring-security-configur/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
