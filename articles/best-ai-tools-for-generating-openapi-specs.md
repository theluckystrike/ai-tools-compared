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
voice-checked: true---

{% raw %}

OpenAPI specs are the contract between your API and its consumers. AI-generated specs that miss edge cases — nullable fields, error schemas, authentication schemes — create downstream problems in generated SDKs and client code. This guide tests Claude, Copilot, and Speakeasy on real API code and measures output quality against what you'd need in production.

## Key Takeaways

- **Start with free options**: to find what works for your workflow, then upgrade when you hit limitations.
- **@router.get("/{order_id}"**: response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user = Depends(get_current_user)
) -> OrderResponse:
    """Get order details.
- **A week-long trial with**: actual work gives better signal than feature comparison charts.
- **Do these tools work**: offline? Most AI-powered tools require an internet connection since they run models on remote servers.
- **How quickly do AI**: tool recommendations go out of date? AI tools evolve rapidly, with major updates every few months.
- **Should I switch tools**: if something better comes out? Switching costs are real: learning curves, workflow disruption, and data migration all take time.

## Test: FastAPI to OpenAPI 3.1

FastAPI auto-generates OpenAPI specs, but the defaults miss important details. Use Claude to enhance them:

```python
# api/routers/orders.py
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderItem(BaseModel):
    product_id: str = Field(..., description="Product SKU or UUID")
    quantity: int = Field(..., ge=1, le=100)
    unit_price: float = Field(..., gt=0)

class CreateOrderRequest(BaseModel):
    customer_id: str
    items: list[OrderItem] = Field(..., min_length=1)
    shipping_address_id: Optional[str] = None
    coupon_code: Optional[str] = None

class OrderResponse(BaseModel):
    order_id: str
    status: str  # pending, confirmed, shipped, delivered, cancelled
    total_amount: float
    created_at: datetime
    estimated_delivery: Optional[datetime] = None

@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(
    request: CreateOrderRequest,
    current_user = Depends(get_current_user)
) -> OrderResponse:
    """Create a new order for the authenticated customer."""
    ...

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user = Depends(get_current_user)
) -> OrderResponse:
    """Get order details. Returns 404 if order not found or belongs to different customer."""
    ...

@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    status: Optional[str] = Query(None, description="Filter by order status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user)
) -> list[OrderResponse]:
    """List orders for the authenticated customer with pagination."""
    ...
```

**Prompt to Claude:**

```
Generate a complete OpenAPI 3.1 spec for this FastAPI router.

Requirements:
- Include all error responses: 401, 403, 404, 422 with schemas
- Document the Bearer token authentication scheme
- Add examples for request bodies and responses
- The 'status' field in OrderResponse should be an enum
- Document pagination headers in list response (X-Total-Count, X-Page, X-Total-Pages)
- Add a 409 response on POST if a duplicate order is detected
```

**Claude's output (key sections):**

```yaml
openapi: 3.1.0
info:
  title: Orders API
  version: 1.0.0

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    OrderStatus:
      type: string
      enum: [pending, confirmed, shipped, delivered, cancelled]
      description: Current status of the order

    OrderItem:
      type: object
      required: [product_id, quantity, unit_price]
      properties:
        product_id:
          type: string
          description: Product SKU or UUID
          example: "SKU-12345"
        quantity:
          type: integer
          minimum: 1
          maximum: 100
          example: 2
        unit_price:
          type: number
          format: float
          exclusiveMinimum: 0
          example: 29.99

    OrderResponse:
      type: object
      required: [order_id, status, total_amount, created_at]
      properties:
        order_id:
          type: string
          format: uuid
          example: "ord_abc123def456"
        status:
          $ref: '#/components/schemas/OrderStatus'
        total_amount:
          type: number
          format: float
          example: 59.98
        created_at:
          type: string
          format: date-time
          example: "2026-03-22T14:30:00Z"
        estimated_delivery:
          type: string
          format: date-time
          nullable: true
          example: "2026-03-27T12:00:00Z"

    ErrorResponse:
      type: object
      required: [detail]
      properties:
        detail:
          oneOf:
            - type: string
            - type: array
              items:
                type: object
                properties:
                  loc:
                    type: array
                    items:
                      type: string
                  msg:
                    type: string
                  type:
                    type: string

paths:
  /orders:
    post:
      summary: Create a new order
      operationId: createOrder
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
            example:
              customer_id: "cust_123"
              items:
                - product_id: "SKU-12345"
                  quantity: 2
                  unit_price: 29.99
              shipping_address_id: "addr_456"
              coupon_code: null
      responses:
        '201':
          description: Order created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '401':
          description: Missing or invalid authentication token
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: Duplicate order detected (same items + customer within 60 seconds)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '422':
          description: Request validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

    get:
      summary: List orders for authenticated customer
      operationId: listOrders
      security:
        - BearerAuth: []
      parameters:
        - name: status
          in: query
          required: false
          schema:
            $ref: '#/components/schemas/OrderStatus'
          description: Filter by order status
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: Paginated list of orders
          headers:
            X-Total-Count:
              schema:
                type: integer
              description: Total number of orders matching the filter
            X-Page:
              schema:
                type: integer
              description: Current page number
            X-Total-Pages:
              schema:
                type: integer
              description: Total number of pages
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/OrderResponse'
```

Claude correctly adds the `nullable: true` on optional fields, uses `$ref` for reusable schemas, documents pagination headers, and generates a realistic 409 response.

## Express.js to OpenAPI

```typescript
// routes/users.ts
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /users/:id
 * Get user profile by ID
 * @param id - User UUID
 * @returns User profile or 404
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  // ...
});
```

**Claude generates JSDoc-aware specs:**

```
Generate an OpenAPI 3.1 spec from this Express router.
Read the JSDoc comments to extract parameter descriptions.
The authenticate middleware means all routes require BearerAuth.
```

Claude extracts the JSDoc description, maps the middleware to the security scheme, and generates the path item.

## Go Gin to OpenAPI

```go
// handlers/products.go
type CreateProductRequest struct {
    Name        string  `json:"name" binding:"required,min=2,max=100"`
    Price       float64 `json:"price" binding:"required,gt=0"`
    CategoryID  uint    `json:"category_id" binding:"required"`
    StockCount  int     `json:"stock_count" binding:"min=0"`
    Description string  `json:"description" binding:"max=1000"`
}

func (h *ProductHandler) Create(c *gin.Context) {
    var req CreateProductRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    // ...
}
```

**Prompt:**

```
Generate an OpenAPI 3.1 spec from this Go Gin handler.
Map the binding validation tags to OpenAPI schema constraints:
- required → required field
- min=2,max=100 → minLength/maxLength for strings, minimum/maximum for numbers
- gt=0 → exclusiveMinimum: 0
- max=1000 → maxLength: 1000
```

Claude correctly maps Gin binding tags to JSON Schema constraints — something Copilot frequently misses.

## Validation with Spectral

After generation, validate the spec:

```bash
# Install Spectral
npm install -g @stoplight/spectral-cli

# Create .spectral.yaml
cat > .spectral.yaml << 'EOF'
extends:
  - spectral:oas

rules:
  operation-operationId:
    severity: error
  operation-description:
    severity: warn
  info-contact:
    severity: off
EOF

# Validate
spectral lint openapi.yaml
```

**Using Claude to fix Spectral errors:**

```python
import anthropic
import subprocess

client = anthropic.Anthropic()

def fix_spec(spec: str) -> str:
    with open("/tmp/spec.yaml", "w") as f:
        f.write(spec)

    result = subprocess.run(
        ["spectral", "lint", "/tmp/spec.yaml", "--format", "json"],
        capture_output=True, text=True
    )

    if result.returncode == 0:
        return spec

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"Fix these Spectral validation errors:\n\n{result.stdout}\n\nSpec:\n{spec}\n\nReturn only the corrected YAML."
        }]
    )
    return response.content[0].text
```

## Tool Comparison

| Capability | Claude | Copilot | Speakeasy |
|---|---|---|---|
| Error schemas (4xx/5xx) | Excellent | Partial | Good |
| Enum types from comments | Excellent | Misses | N/A |
| Validation constraint mapping | Excellent | Partial | Excellent |
| Pagination headers | Yes (when asked) | No | No |
| Examples in schemas | Yes | Sometimes | Yes |
| Security scheme inference | Yes | No | Yes |
| Existing code → spec | Any framework | JS/TS best | Requires SDK |

## Related Reading

- [AI Tools for Generating OpenAPI Specs from Code](/ai-tools-for-generating-openapi-specs-from-code/)
- [AI Tools for Writing OpenAPI Specifications 2026](/ai-tools-for-writing-openapi-specifications-2026/)
- [AI Code Generation for Python FastAPI Endpoints with Pydantic](/ai-code-generation-for-python-fastapi-endpoints-with-pydanti/)
---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

## Frequently Asked Questions

**Are free AI tools good enough for ai tools for generating openapi specs?**

Free tiers work for basic tasks and evaluation, but paid plans typically offer higher rate limits, better models, and features needed for professional work. Start with free options to find what works for your workflow, then upgrade when you hit limitations.

**How do I evaluate which tool fits my workflow?**

Run a practical test: take a real task from your daily work and try it with 2-3 tools. Compare output quality, speed, and how naturally each tool fits your process. A week-long trial with actual work gives better signal than feature comparison charts.

**Do these tools work offline?**

Most AI-powered tools require an internet connection since they run models on remote servers. A few offer local model options with reduced capability. If offline access matters to you, check each tool's documentation for local or self-hosted options.

**How quickly do AI tool recommendations go out of date?**

AI tools evolve rapidly, with major updates every few months. Feature comparisons from 6 months ago may already be outdated. Check the publication date on any review and verify current features directly on each tool's website before purchasing.

**Should I switch tools if something better comes out?**

Switching costs are real: learning curves, workflow disruption, and data migration all take time. Only switch if the new tool solves a specific pain point you experience regularly. Marginal improvements rarely justify the transition overhead.
{% endraw %}
