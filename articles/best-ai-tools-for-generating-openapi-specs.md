---
layout: default
title: "Best AI Tools for Generating OpenAPI Specs"
description: "Compare Claude, Copilot, and Speakeasy for generating accurate OpenAPI 3.1 specs from code, with examples for FastAPI, Express, and Go Gin"
date: 2026-03-22
author: theluckystrike
permalink: /best-ai-tools-for-generating-openapi-specs/
categories: [guides]
tags: [ai-tools-compared]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---

{% raw %}

Writing OpenAPI specs by hand is tedious and error-prone. For a moderately complex API — 20 endpoints, nested schemas, security definitions — manually writing the YAML takes hours and still misses edge cases. AI tools have changed this significantly. Claude, GitHub Copilot, and specialized tools like Speakeasy can generate production-quality OpenAPI 3.1 specs from existing code or natural language descriptions. This guide compares them with real examples.

## Claude: Best for Complex Schema Generation

Claude excels at understanding code context and generating accurate OpenAPI specs that match what your code actually does. Feed it your controller code and it produces correct request/response schemas, including edge cases most tools miss.

**FastAPI example:**

```python
# Paste this into Claude with prompt: "Generate OpenAPI 3.1 spec for this endpoint"
@app.post("/users/{user_id}/posts", response_model=PostResponse)
async def create_post(
    user_id: int,
    post: PostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PostResponse:
    """Create a new post for the specified user."""
    ...
```

Claude produces the full path item including parameters, request body schema derived from `PostCreate`, response schema from `PostResponse`, and the security requirement from the `Depends(get_current_user)` dependency.

**Strengths:** handles inheritance, discriminators, and nested schemas correctly; good at inferring security schemes from auth patterns; understands framework conventions (FastAPI, Django REST, Express).

**Weakness:** no native IDE integration for iterative spec generation; you copy-paste code in and get YAML back.

For larger APIs, provide Claude with multiple route files and your model definitions in a single prompt. Claude can handle 30-40 endpoints per session and produces consistent `$ref` usage across the spec when given all the models upfront. Ask it explicitly to use `$ref` for shared schemas rather than inlining — this produces cleaner specs that validate correctly and are easier to maintain.

## GitHub Copilot: Best for Inline Spec Writing

Copilot works best when you start writing the spec and let it autocomplete. Open a `.yaml` file, type `paths:`, and Copilot suggests paths based on what it infers about your project from surrounding files.

```yaml
# Start typing and Copilot autocompletes based on your codebase context
openapi: 3.1.0
info:
  title: User Management API
  version: 1.0.0
paths:
  /users:
    get:
      # Copilot suggests summary, parameters, responses from your model files
```

This works well if your codebase has consistent patterns. Copilot picks up your model names, response shapes, and error patterns from surrounding files. It is less reliable for specs that need to be strictly accurate — it sometimes generates plausible-looking but incorrect schemas.

**Best use case:** greenfield API design where you are writing spec-first. Copilot accelerates the typing but requires careful review.

Copilot's autocomplete is most reliable when your model files are open in the same editor session. Keep your TypeScript interfaces or Python Pydantic models open in adjacent tabs. Copilot reads the open file context and uses it to generate schemas that match your actual types rather than guessing.

## Speakeasy: Best for Generating SDKs From Specs

Speakeasy is purpose-built for the OpenAPI ecosystem. It validates your spec, generates type-safe SDKs in 8+ languages, and creates usage documentation automatically.

```bash
# Install Speakeasy CLI
brew install speakeasy-api/homebrew-tap/speakeasy

# Generate spec from annotated code (supports TypeScript, Python, Go)
speakeasy generate sdk --schema ./openapi.yaml --lang typescript --out ./sdk

# Validate your spec against OpenAPI 3.1
speakeasy validate --schema ./openapi.yaml
```

Speakeasy is not primarily an AI tool, but its AI-assisted spec generation from code annotations is genuinely useful. The real value is downstream: once you have an accurate spec, Speakeasy generates and maintains SDKs across language updates.

## Express and TypeScript Example With Claude

Express does not generate specs automatically, making AI assistance particularly valuable. Provide Claude with your route definitions and TypeScript interfaces:

```typescript
// Feed this to Claude with: "Generate OpenAPI 3.1 spec for these routes"
interface CreateOrderRequest {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  couponCode?: string;
}

interface OrderResponse {
  orderId: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  total: number;
  createdAt: string;
}

router.post('/orders', authenticate, async (req: Request<{}, OrderResponse, CreateOrderRequest>, res) => {
  // ...
});

router.get('/orders/:id', authenticate, async (req: Request<{ id: string }>, res: Response<OrderResponse>) => {
  // ...
});
```

Claude generates:

```yaml
paths:
  /orders:
    post:
      summary: Create a new order
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: Order created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /orders/{id}:
    get:
      summary: Get order by ID
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Order details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    CreateOrderRequest:
      type: object
      required: [userId, items]
      properties:
        userId:
          type: string
        items:
          type: array
          minItems: 1
          items:
            type: object
            required: [productId, quantity]
            properties:
              productId:
                type: string
              quantity:
                type: integer
                minimum: 1
        couponCode:
          type: string
          nullable: true
    OrderResponse:
      type: object
      required: [orderId, status, total, createdAt]
      properties:
        orderId:
          type: string
        status:
          type: string
          enum: [pending, confirmed, shipped, delivered]
        total:
          type: number
          format: float
        createdAt:
          type: string
          format: date-time
```

Claude correctly maps the TypeScript union type to an OpenAPI enum, marks `couponCode` as nullable, and adds appropriate response codes. The `$ref` usage is consistent throughout.

## Comparison: Claude vs Copilot vs Speakeasy

| Task | Claude | GitHub Copilot | Speakeasy |
|---|---|---|---|
| Generate spec from existing code | Excellent | Good | Limited |
| Iterative inline spec writing | Manual | Excellent | N/A |
| Spec validation | Via prompt | No | Excellent |
| SDK generation | No | No | Excellent |
| Handles complex schemas | Excellent | Inconsistent | Reads existing specs |
| Cost | $20/mo (Pro) | $10/mo | $200/mo (teams) |

## Practical Workflow: Claude + Speakeasy

The most effective workflow combines Claude for initial spec generation with Speakeasy for validation and SDK generation:

```bash
# Step 1: Use Claude to generate initial spec from your routes
# Paste your route files into Claude and ask for OpenAPI 3.1 YAML

# Step 2: Save as openapi.yaml, validate with Speakeasy
speakeasy validate --schema ./openapi.yaml

# Step 3: Fix any issues Claude missed (Speakeasy gives specific error messages)
# Re-run until clean

# Step 4: Generate SDKs
speakeasy generate sdk --schema ./openapi.yaml --lang typescript --out ./sdk/ts
speakeasy generate sdk --schema ./openapi.yaml --lang python --out ./sdk/python
```

This combination cuts spec generation time from days to hours for a mid-sized API.

Adding spec validation to CI ensures the spec stays accurate as your API evolves:

```yaml
# .github/workflows/openapi-validate.yml
name: Validate OpenAPI Spec
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Speakeasy
        run: brew install speakeasy-api/homebrew-tap/speakeasy
      - name: Validate spec
        run: speakeasy validate --schema ./openapi.yaml
```

When a PR modifies routes without updating the spec, the validation job catches the drift. Pair this with a documentation build step that regenerates API reference docs from the validated spec.

## Go Gin Example With Claude

For Go APIs using the Gin framework, Claude needs explicit prompting to handle Go's type system correctly:

```go
// Feed this to Claude with: "Generate OpenAPI 3.1 spec, use Go types correctly"
type CreateOrderRequest struct {
    UserID    uuid.UUID       `json:"user_id" binding:"required"`
    Items     []OrderItem     `json:"items" binding:"required,min=1"`
    CouponCode *string        `json:"coupon_code,omitempty"`
}

type OrderItem struct {
    ProductID uuid.UUID `json:"product_id" binding:"required"`
    Quantity  int       `json:"quantity" binding:"required,min=1,max=100"`
}
```

Claude correctly maps `uuid.UUID` to `string` with `format: uuid`, `*string` to a nullable string, and the `min=1` binding to `minItems: 1` on the array.

For Go APIs, also tell Claude to use `binding:"required"` as the source of truth for `required` fields in the schema. Claude reads the struct tags accurately but benefits from explicit guidance on which tags to prioritize for schema generation.

## Frequently Asked Questions

**Are free AI tools good enough for generating OpenAPI specs?**

For simple APIs (under 10 endpoints, flat schemas), free Claude or Copilot tiers are sufficient. For complex APIs with nested schemas, authentication flows, and multiple response types, the paid tiers give significantly better results. Speakeasy has no meaningful free tier for teams.

**How do I evaluate which tool fits my workflow?**

Run a practical test: take a real endpoint from your codebase and ask each tool to generate the spec. Compare accuracy against the actual request/response shapes. A real-world test on your own code gives better signal than benchmark comparisons.

**How quickly do AI tool recommendations go out of date?**

AI tools evolve rapidly. The comparison above reflects March 2026 capabilities. Claude and Copilot have both improved significantly on code understanding in the past year. Verify current features before committing to a paid plan.

**Should I commit the OpenAPI spec to the repository?**

Yes. Treat the spec as a first-class artifact alongside your code. Commit it to version control, validate it in CI, and use it to generate documentation and SDKs. Teams that generate the spec on-demand from code annotations tend to have more accurate specs than teams that maintain it manually, but both approaches work better with a committed, validated spec than without one.

{% endraw %}
