---
title: "AI Tools for Generating OpenTelemetry Instrumentation Code in 2026"
description: "Compare Claude, GPT-4, and Copilot for generating OTel spans, metrics, and traces. Real Python, Go, and Java instrumentation code examples."
author: "theluckystrike"
date: "2026-03-22"
updated: "2026-03-22"
reviewed: true
score: 8
voice-checked: true
intent-checked: true
category: "AI Tools"
tags: ["OpenTelemetry", "Observability", "Instrumentation", "Tracing", "AI"]
---

## AI Tools for OpenTelemetry Instrumentation Generation

OpenTelemetry provides standardized observability for applications across distributed systems. Writing instrumentation code—spans, metrics, traces—is repetitive and error-prone. AI tools can generate correct boilerplate instrumentation code while reducing manual work. This guide compares Claude, GPT-4, and Copilot for OTel code generation.

## Claude (Anthropic)

Claude excels at generating multi-language OpenTelemetry instrumentation with proper context propagation and span management.

**Strengths:**
- Generates correct OTel SDK initialization across Python, Go, Java
- Understands complex instrumentation patterns: automatic spans, baggage, W3C trace context
- Provides explanation of instrumentation decisions
- Handles context propagation correctly between microservices
- Suggests appropriate exporter configuration (Jaeger, Honeycomb, Datadog)

**Pricing:** Claude API: $3-$15 per million input tokens (Claude 3.5 Sonnet), $15/$45 for Opus 4.6.

**Real Example - Python OTel Instrumentation:**

Request: Generate FastAPI instrumentation with automatic span creation for database queries.

Claude generates:
```python
from opentelemetry import trace, metrics, baggage
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from prometheus_client import start_http_server
from fastapi import FastAPI

# Jaeger exporter for traces
jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# Prometheus exporter for metrics
prometheus_reader = PrometheusMetricReader()
metrics.set_meter_provider(MeterProvider(metric_readers=[prometheus_reader]))
start_http_server(port=8000)

# Auto-instrument FastAPI and SQLAlchemy
app = FastAPI()
FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument()

# Get tracer for manual spans
tracer = trace.get_tracer(__name__)

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    with tracer.start_as_current_span("get_user_details") as span:
        span.set_attribute("user.id", user_id)
        # Database query auto-instrumented by SQLAlchemyInstrumentor
        user = db.query(User).filter(User.id == user_id).first()
        return user
```

Claude explains:
- `BatchSpanProcessor` buffers spans for efficient export (vs. immediate export)
- `SQLAlchemyInstrumentor` auto-captures all database queries as child spans
- Manual span context with `tracer.start_as_current_span()` for business logic
- Prometheus metrics exposed on port 8000 automatically

**Use Case:** Production teams, complex distributed systems, teams needing multi-language support.

## GPT-4 (OpenAI)

GPT-4 generates solid OTel instrumentation code with clear structure and good error handling patterns.

**Strengths:**
- Produces syntactically correct instrumentation code
- Clear explanation of span hierarchy and naming conventions
- Good at generating instrumentation for REST APIs
- Suggests metric types: Counter, Gauge, Histogram
- Provides complete working examples

**Weaknesses:**
- Sometimes misses context propagation details for async frameworks
- Less detailed about exporter configuration trade-offs
- May suggest redundant instrumentation

**Pricing:** GPT-4o: $2.50/$10 per million tokens. GPT-4 Turbo: $10/$30 per million tokens.

**Real Example - Go OTel Instrumentation:**

```go
package main

import (
    "context"
    "log"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
    "github.com/gin-gonic/gin"
)

func initTracer() (*trace.TracerProvider, error) {
    exporter, err := otlptracehttp.New(context.Background(),
        otlptracehttp.WithEndpoint("localhost:4318"),
    )
    if err != nil {
        return nil, err
    }
    
    res, _ := resource.New(context.Background(),
        resource.WithAttributes(
            semconv.ServiceNameKey.String("api-server"),
            semconv.ServiceVersionKey.String("1.0.0"),
        ),
    )
    
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(res),
    )
    otel.SetTracerProvider(tp)
    
    return tp, nil
}

func handleRequest(c *gin.Context) {
    ctx := c.Request.Context()
    tracer := otel.Tracer("request-handler")
    
    _, span := tracer.Start(ctx, "process_request")
    defer span.End()
    
    // Process business logic
    span.AddEvent("processing_complete")
    c.JSON(200, gin.H{"status": "ok"})
}
```

GPT-4 provides:
- OTLP HTTP exporter configuration
- Resource attributes for service identification
- Proper defer span.End() cleanup
- Context propagation from HTTP request

**Use Case:** API teams, Go microservices, teams familiar with OpenAI API.

## GitHub Copilot (Microsoft)

Copilot suggests OpenTelemetry code inline in your IDE, speeding up instrumentation implementation.

**Strengths:**
- Real-time inline suggestions while writing OTel code
- Works within IDE (VS Code, JetBrains)
- Suggests import statements and boilerplate
- Recognizes common patterns from codebase
- Free with GitHub Pro ($4/month)

**Weaknesses:**
- Suggestions sometimes incomplete for complex instrumentation
- May not understand exporter configuration nuances
- Limited explanation of instrumentation decisions
- Context window limited to recent file changes

**Pricing:** Free with GitHub Pro ($4/month). Enterprise: $19-$40/user/month.

**Real Example - Java OTel Instrumentation:**

In IDE, start typing instrumentation code. Copilot suggests:

```java
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.semconv.trace.attributes.SemanticAttributes;

public class UserService {
    private static final Tracer tracer = GlobalOpenTelemetry
        .get()
        .getTracer("UserService", "1.0.0");
    
    public User getUserById(String userId) {
        Span span = tracer.spanBuilder("getUserById")
            .setAttribute(SemanticAttributes.DB_OPERATION, "SELECT")
            .setAttribute("user.id", userId)
            .startSpan();
        
        try (var ignored = span.makeCurrent()) {
            return database.query("SELECT * FROM users WHERE id = ?", userId);
        } finally {
            span.end();
        }
    }
    
    public void updateUser(User user) {
        Span span = tracer.spanBuilder("updateUser")
            .setAttribute(SemanticAttributes.DB_OPERATION, "UPDATE")
            .startSpan();
        
        try (var ignored = span.makeCurrent()) {
            database.execute("UPDATE users SET ...", user);
        } finally {
            span.end();
        }
    }
}
```

Copilot provides:
- Try-with-resources for span cleanup
- Semantic convention attributes
- Span builder pattern
- No need for SDK initialization (uses GlobalOpenTelemetry)

**Use Case:** Individual developers, rapid prototyping, teams in GitHub/VS Code ecosystem.

## Comparison Table

| Feature | Claude | GPT-4 | Copilot |
|---------|--------|-------|---------|
| Multi-language support | 9/10 | 8/10 | 7/10 |
| Context propagation | 9/10 | 8/10 | 6/10 |
| Exporter configuration | 9/10 | 7/10 | 5/10 |
| Span hierarchy | 8/10 | 8/10 | 7/10 |
| Metric generation | 8/10 | 8/10 | 6/10 |
| Error handling | 8/10 | 8/10 | 7/10 |
| Explanation quality | 9/10 | 8/10 | 4/10 |
| IDE integration | None | None | Excellent |
| Pricing | Mid | Mid-High | Low |

## Real-World Instrumentation Workflow

1. **Initialize SDK:** Use AI to generate tracer provider and exporter setup
2. **Auto-instrumentation:** Add auto-instrumentors for frameworks (FastAPI, Gin, Spring)
3. **Manual spans:** Use AI to generate business-logic spans for critical paths
4. **Metrics:** Generate metrics code for latency, error rates, throughput
5. **Baggage:** Use AI to suggest context propagation for request IDs, user IDs

## Common Instrumentation Patterns

**Pattern 1: Database Query Tracing**
```python
with tracer.start_as_current_span("db.query") as span:
    span.set_attribute("db.statement", "SELECT...")
    span.set_attribute("db.name", "postgres")
    results = database.query(sql)
    span.set_attribute("db.row_count", len(results))
```

**Pattern 2: HTTP Request Tracing**
```go
_, span := tracer.Start(ctx, "http.request")
defer span.End()

span.SetAttributes(
    attribute.String("http.method", req.Method),
    attribute.String("http.target", req.URL.Path),
    attribute.Int("http.status_code", resp.StatusCode),
)
```

**Pattern 3: Cache Hit/Miss Metrics**
```python
cache_hits = meter.create_counter("cache.hits")
cache_misses = meter.create_counter("cache.misses")

if cache_hit:
    cache_hits.add(1, {"cache.name": "redis"})
else:
    cache_misses.add(1, {"cache.name": "redis"})
```

## Key Instrumentation Metrics to Capture

- Request latency (Histogram)
- Error rate by endpoint (Counter)
- Database query count (Counter)
- Cache hit/miss ratio (Counter)
- Worker queue depth (Gauge)
- Memory usage (Gauge)

## Exporter Configuration Comparison

| Exporter | Use Case | Cost | Setup |
|----------|----------|------|-------|
| Jaeger (local) | Development | Free | Simple |
| Honeycomb | SaaS observability | $0.50/GB | Quick setup |
| Datadog | Full monitoring platform | Custom | Integration heavy |
| New Relic | APM focus | $100+/month | Comprehensive |
| Prometheus | Metrics only | Free | Advanced config |

## Challenges and Limitations

All AI tools struggle with:
- Complex async context propagation in Python
- Circular dependency avoidance in initialization
- Knowing when NOT to instrument (over-instrumentation)
- Database connection pool instrumentation
- Distributed trace sampling decisions

## Conclusion

Claude leads for production instrumentation across multiple languages and exporters. GPT-4 provides solid middle-ground with good code quality. Copilot wins for IDE workflow speed when you know what you need. For complex distributed systems, Claude's reasoning justifies the cost. For teams comfortable with OpenAI, GPT-4 offers reliability. Copilot is unbeatable for rapid solo development. Combine approaches: use Copilot for initial scaffolding, Claude for validation and complex patterns.

## Related Articles

- [OpenTelemetry SDK Configuration Guide](/articles/otel-sdk-configuration/)
- [Distributed Tracing Best Practices](/articles/distributed-tracing-best-practices/)
- [Observability Metrics for Microservices](/articles/microservices-metrics/)
- [Jaeger vs. Zipkin: Tracing Platform Comparison](/articles/jaeger-vs-zipkin/)
- [Instrumentation Performance Tuning](/articles/instrumentation-performance/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
