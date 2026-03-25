---
title: "AI Tools for Generating OpenTelemetry Instrumentation Code"
description: "Compare Claude, GPT-4, and Copilot for generating OTel spans, metrics, and traces. Real Python, Go, and Java instrumentation code examples."
author: "theluckystrike"
date: "2026-03-22"
updated: "2026-03-22"
reviewed: true
score: 9
voice-checked: true
intent-checked: true
category: "AI Tools"
tags: [ai-tools-compared, OpenTelemetry, Observability, Instrumentation, Tracing, AI, artificial-intelligence]
permalink: /ai-tools-for-generating-opentelemetry-instrumentation-2026/
---

Table of Contents

- [AI Tools for OpenTelemetry Instrumentation Generation](#ai-tools-for-opentelemetry-instrumentation-generation)
- [Claude (Anthropic)](#claude-anthropic)
- [GPT-4 (OpenAI)](#gpt-4-openai)
- [GitHub Copilot (Microsoft)](#github-copilot-microsoft)
- [Comparison Table](#comparison-table)
- [Real-World Instrumentation Workflow](#real-world-instrumentation-workflow)
- [Common Instrumentation Patterns](#common-instrumentation-patterns)
- [Key Instrumentation Metrics to Capture](#key-instrumentation-metrics-to-capture)
- [Exporter Configuration Comparison](#exporter-configuration-comparison)
- [Challenges and Limitations](#challenges-and-limitations)
- [Sampling Strategy - Instrument Everything, Export Selectively](#sampling-strategy-instrument-everything-export-selectively)
- [Propagating Business Context Through Spans](#propagating-business-context-through-spans)

AI Tools for OpenTelemetry Instrumentation Generation

OpenTelemetry provides standardized observability for applications across distributed systems. Writing instrumentation code, spans, metrics, traces, is repetitive and error-prone. AI tools can generate correct boilerplate instrumentation code while reducing manual work. This guide compares Claude, GPT-4, and Copilot for OTel code generation.

Claude (Anthropic)

Claude excels at generating multi-language OpenTelemetry instrumentation with proper context propagation and span management.

Strengths:
- Generates correct OTel SDK initialization across Python, Go, Java
- Understands complex instrumentation patterns: automatic spans, baggage, W3C trace context
- Provides explanation of instrumentation decisions
- Handles context propagation correctly between microservices
- Suggests appropriate exporter configuration (Jaeger, Honeycomb, Datadog)

Pricing - Claude API: $3-$15 per million input tokens (Claude 3.5 Sonnet), $15/$45 for Opus 4.6.

Real Example - Python OTel Instrumentation:

Request - Generate FastAPI instrumentation with automatic span creation for database queries.

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

Jaeger exporter for traces
jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

Prometheus exporter for metrics
prometheus_reader = PrometheusMetricReader()
metrics.set_meter_provider(MeterProvider(metric_readers=[prometheus_reader]))
start_http_server(port=8000)

Auto-instrument FastAPI and SQLAlchemy
app = FastAPI()
FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument()

Get tracer for manual spans
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

Use Case - Production teams, complex distributed systems, teams needing multi-language support.

GPT-4 (OpenAI)

GPT-4 generates solid OTel instrumentation code with clear structure and good error handling patterns.

Strengths:
- Produces syntactically correct instrumentation code
- Clear explanation of span hierarchy and naming conventions
- Good at generating instrumentation for REST APIs
- Suggests metric types: Counter, Gauge, Histogram
- Provides complete working examples

Weaknesses:
- Sometimes misses context propagation details for async frameworks
- Less detailed about exporter configuration trade-offs
- May suggest redundant instrumentation

Pricing - GPT-4o: $2.50/$10 per million tokens. GPT-4 Turbo - $10/$30 per million tokens.

Real Example - Go OTel Instrumentation:

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

Use Case - API teams, Go microservices, teams familiar with OpenAI API.

GitHub Copilot (Microsoft)

Copilot suggests OpenTelemetry code inline in your IDE, speeding up instrumentation implementation.

Strengths:
- Real-time inline suggestions while writing OTel code
- Works within IDE (VS Code, JetBrains)
- Suggests import statements and boilerplate
- Recognizes common patterns from codebase
- Free with GitHub Pro ($4/month)

Weaknesses:
- Suggestions sometimes incomplete for complex instrumentation
- May not understand exporter configuration nuances
- Limited explanation of instrumentation decisions
- Context window limited to recent file changes

Pricing - Free with GitHub Pro ($4/month). Enterprise - $19-$40/user/month.

Real Example - Java OTel Instrumentation:

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

Use Case - Individual developers, rapid prototyping, teams in GitHub/VS Code environment.

Comparison Table

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

Real-World Instrumentation Workflow

1. Initialize SDK: Use AI to generate tracer provider and exporter setup
2. Auto-instrumentation: Add auto-instrumentors for frameworks (FastAPI, Gin, Spring)
3. Manual spans: Use AI to generate business-logic spans for critical paths
4. Metrics: Generate metrics code for latency, error rates, throughput
5. Baggage: Use AI to suggest context propagation for request IDs, user IDs

Common Instrumentation Patterns

Pattern 1 - Database Query Tracing
```python
with tracer.start_as_current_span("db.query") as span:
    span.set_attribute("db.statement", "SELECT...")
    span.set_attribute("db.name", "postgres")
    results = database.query(sql)
    span.set_attribute("db.row_count", len(results))
```

Pattern 2 - HTTP Request Tracing
```go
_, span := tracer.Start(ctx, "http.request")
defer span.End()

span.SetAttributes(
    attribute.String("http.method", req.Method),
    attribute.String("http.target", req.URL.Path),
    attribute.Int("http.status_code", resp.StatusCode),
)
```

Pattern 3 - Cache Hit/Miss Metrics
```python
cache_hits = meter.create_counter("cache.hits")
cache_misses = meter.create_counter("cache.misses")

if cache_hit:
    cache_hits.add(1, {"cache.name": "redis"})
else:
    cache_misses.add(1, {"cache.name": "redis"})
```

Key Instrumentation Metrics to Capture

- Request latency (Histogram)
- Error rate by endpoint (Counter)
- Database query count (Counter)
- Cache hit/miss ratio (Counter)
- Worker queue depth (Gauge)
- Memory usage (Gauge)

Exporter Configuration Comparison

| Exporter | Use Case | Cost | Setup |
|----------|----------|------|-------|
| Jaeger (local) | Development | Free | Simple |
| Honeycomb | SaaS observability | $0.50/GB | Quick setup |
| Datadog | Full monitoring platform | Custom | Integration heavy |
| New Relic | APM focus | $100+/month | |
| Prometheus | Metrics only | Free | Advanced config |

Challenges and Limitations

All AI tools struggle with:
- Complex async context propagation in Python
- Circular dependency avoidance in initialization
- Knowing when NOT to instrument (over-instrumentation)
- Database connection pool instrumentation
- Distributed trace sampling decisions

Sampling Strategy - Instrument Everything, Export Selectively

One mistake teams make when adopting OTel is exporting 100% of traces in production. At meaningful scale, this floods your backend with data and generates significant cost. AI tools are helpful for generating sampling configuration, but they rarely mention this context.

A head-based sampler decides at trace start whether to export. cheap but loses visibility into slow tail requests. A tail-based sampler buffers spans and decides at trace end. more accurate but memory-intensive.

```python
from opentelemetry.sdk.trace.sampling import (
    TraceIdRatioBased,
    ParentBased,
    ALWAYS_ON,
    ALWAYS_OFF
)

Export 10% of traces overall, but always export traces
where a parent span was sampled (preserves distributed trace integrity)
sampler = ParentBased(
    root=TraceIdRatioBased(0.10),
    remote_parent_sampled=ALWAYS_ON,    # trust upstream sampling decision
    remote_parent_not_sampled=ALWAYS_OFF
)

tp = TracerProvider(sampler=sampler)
trace.set_tracer_provider(tp)
```

For Go services using the OTLP exporter, configure tail-based sampling at the OpenTelemetry Collector level rather than in-process. this lets you adjust sampling rates without redeploying application code:

```yaml
otel-collector-config.yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100
    expected_new_traces_per_sec: 10
    policies:
      - name: error-policy
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: slow-policy
        type: latency
        latency: {threshold_ms: 500}
      - name: probabilistic
        type: probabilistic
        probabilistic: {sampling_percentage: 5}
```

This configuration always captures errors and slow requests (the ones you care about most) while sampling only 5% of fast, successful requests.

Propagating Business Context Through Spans

Standard OTel attributes capture infrastructure metrics. HTTP status codes, database query strings, latency. But the most useful traces for debugging business issues also carry application context: which customer triggered the request, what feature flag was active, what the cart value was.

```python
from opentelemetry import baggage, context
from opentelemetry.baggage.propagation import W3CBaggagePropagator

def attach_business_context(user_id: str, tenant_id: str, feature_flag: str):
    """Attach business identifiers that propagate across service boundaries."""
    ctx = baggage.set_baggage("user.id", user_id)
    ctx = baggage.set_baggage("tenant.id", tenant_id, context=ctx)
    ctx = baggage.set_baggage("feature.flag", feature_flag, context=ctx)
    return context.attach(ctx)

In your request handler:
token = attach_business_context(
    user_id=request.user.id,
    tenant_id=request.tenant.id,
    feature_flag=get_active_flag(request.user)
)

with tracer.start_as_current_span("process_order") as span:
    # Baggage values automatically propagate to child spans and downstream services
    span.set_attribute("order.value", order.total)
    span.set_attribute("order.items_count", len(order.items))
```

When you ask Claude to generate instrumentation for a specific service, provide a sample request object so the model knows what business context is available. Without that context, it generates attribute names that don't match your actual data model.

Related Articles

- [AI Tools for Writing OpenTelemetry Instrumentation 2026](/ai-tools-for-writing-opentelemetry-instrumentation-2026/)
- [AI Code Review Automation Tools Comparison 2026](/ai-code-review-automation-tools-comparison/)
- [AI Tools for Generating Platform Specific Code in Kotlin](/ai-tools-for-generating-platform-specific-code-in-kotlin-mul/)
- [Best AI Tools for Automated Code Review 2026](/best-ai-tools-for-automated-code-review-2026/)
- [How to Prevent AI Coding Tools from Generating Overly](/how-to-prevent-ai-coding-tools-from-generating-overly-complex-solutions/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
