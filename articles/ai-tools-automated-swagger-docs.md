---
layout: default
title: "AI Tools for Automated Swagger Documentation"
description: "How to automate OpenAPI/Swagger documentation generation using Claude, GPT-4, and Copilot from Express, FastAPI, and Spring Boot code with real examples"
date: 2026-03-22
author: theluckystrike
permalink: /ai-tools-automated-swagger-docs/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Writing OpenAPI/Swagger documentation by hand is a maintenance burden. it drifts from the actual API. AI tools can generate accurate OpenAPI specs from existing route handlers, models, and validation schemas, then keep them in sync as the codebase changes. This guide covers automated Swagger doc generation pipelines using Claude and GPT-4.

The Problem with Manual Swagger Docs

Manual OpenAPI specs go stale. A route gets a new query parameter, someone forgets to update the spec. AI-assisted documentation either generates the spec from code (snapshot approach) or runs as a CI check that detects drift.

The three automation levels:

1. One-shot generation. paste code, get OpenAPI YAML
2. Script-based extraction. parse routes/models programmatically, send to AI for spec generation
3. CI drift detection. AI compares spec to current code on each PR

Level 1: One-Shot from Express Routes

Prompt to Claude:

```
Generate a complete OpenAPI 3.1 spec for these Express.js route handlers.
Include all request/response schemas, validation rules, and error responses.
Format as YAML.

[paste route handlers]
```

Express handlers:

```javascript
// routes/users.js
router.get('/users/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { include_orders } = req.query; // boolean, optional

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const result = { id: user.id, email: user.email, name: user.name };
  if (include_orders === 'true') {
    result.orders = await Order.findByUserId(id);
  }

  res.json(result);
});

router.post('/users', async (req, res) => {
  const { email, name, password } = req.body;
  // Validation: email required, name required, password min 8 chars
  if (!email || !name || !password || password.length < 8) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const user = await User.create({ email, name, password });
  res.status(201).json({ id: user.id, email: user.email });
});
```

Claude's generated OpenAPI spec:

```yaml
openapi: 3.1.0
info:
  title: Users API
  version: 1.0.0

paths:
  /users/{id}:
    get:
      summary: Get user by ID
      operationId: getUserById
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: User identifier
        - name: include_orders
          in: query
          required: false
          schema:
            type: boolean
          description: Include user's orders in response
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserWithOrders'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /users:
    post:
      summary: Create a new user
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserCreatedResponse'
        '400':
          $ref: '#/components/responses/BadRequest'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateUserRequest:
      type: object
      required: [email, name, password]
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
        password:
          type: string
          minLength: 8

    UserCreatedResponse:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
          format: email

    UserWithOrders:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
          format: email
        name:
          type: string
        orders:
          type: array
          items:
            $ref: '#/components/schemas/Order'

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
    BadRequest:
      description: Invalid input
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
```

Level 2: Automated Pipeline Script

Script that extracts all routes and sends them to Claude in bulk:

```python
swagger_generator.py
import ast
import os
import anthropic
import yaml

def extract_express_routes(src_dir: str) -> str:
    """Extract route definitions from JS files via simple pattern matching."""
    import re
    routes = []
    pattern = re.compile(
        r'router\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]',
        re.MULTILINE
    )

    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith('.js') or f.endswith('.ts'):
                path = os.path.join(root, f)
                content = open(path).read()
                matches = pattern.findall(content)
                if matches:
                    routes.append(f"\n# File: {path}\n{content}")

    return '\n'.join(routes)


def generate_openapi_spec(source_code: str, api_title: str) -> str:
    client = anthropic.Anthropic()

    system = """You are an OpenAPI 3.1 specification generator. When given API route handlers,
    generate a complete, valid OpenAPI 3.1 YAML spec. Include:
    - All path parameters and query parameters
    - Request body schemas with validation rules from code comments or logic
    - Response schemas for all status codes (200, 201, 400, 401, 403, 404, 500)
    - Reusable components/schemas for request/response bodies
    - Security schemes based on middleware usage
    Return ONLY the YAML. No explanations."""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8096,
        system=system,
        messages=[{
            "role": "user",
            "content": f"Generate OpenAPI 3.1 spec for this API (title: {api_title}):\n\n{source_code}"
        }]
    )

    return message.content[0].text


def validate_openapi_yaml(spec_yaml: str) -> bool:
    """Basic validation. check required top-level keys."""
    try:
        spec = yaml.safe_load(spec_yaml)
        required = {'openapi', 'info', 'paths'}
        return required.issubset(spec.keys())
    except yaml.YAMLError:
        return False


if __name__ == "__main__":
    import sys
    src_dir = sys.argv[1] if len(sys.argv) > 1 else "./src/routes"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "openapi.yaml"

    print(f"Extracting routes from {src_dir}...")
    source = extract_express_routes(src_dir)

    print("Generating OpenAPI spec with Claude...")
    spec = generate_openapi_spec(source, "My API")

    if validate_openapi_yaml(spec):
        with open(output_file, 'w') as f:
            f.write(spec)
        print(f"Spec written to {output_file}")
    else:
        print("ERROR: Generated spec failed validation")
        print(spec[:500])
        sys.exit(1)
```

FastAPI: Augmenting Auto-Generated Docs

FastAPI auto-generates OpenAPI from type hints, but the descriptions are empty. Use Claude to enrich them:

```python
enrich_fastapi_docs.py
import json
import anthropic


def enrich_openapi_descriptions(openapi_json: dict) -> dict:
    """Use Claude to add descriptions to all endpoints and schemas."""
    client = anthropic.Anthropic()

    spec_str = json.dumps(openapi_json, indent=2)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8096,
        messages=[{
            "role": "user",
            "content": f"""Add clear, concise descriptions to all paths, operations, parameters,
and schema properties in this OpenAPI spec. Keep existing values.
Add 'description' fields where missing.
Return the complete JSON.

{spec_str}"""
        }]
    )

    return json.loads(message.content[0].text)


Usage with FastAPI
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.on_event("startup")
async def enrich_docs():
    openapi = app.openapi()
    enriched = enrich_openapi_descriptions(openapi)
    app.openapi_schema = enriched
```

Spring Boot: Extracting from Controllers

Spring Boot's `@RestController` annotations contain more structured information than Express route handlers. Claude can parse the Java code and produce accurate specs:

```python
spring_swagger_generator.py
import os
import re
import anthropic

def extract_spring_controllers(src_dir: str) -> list[str]:
    """Find all @RestController classes and return their source."""
    controllers = []
    for root, _, files in os.walk(src_dir):
        for f in files:
            if not f.endswith('.java'):
                continue
            path = os.path.join(root, f)
            content = open(path).read()
            if '@RestController' in content or '@Controller' in content:
                controllers.append(f"// {path}\n{content}")
    return controllers

def generate_spec_from_spring(controllers: list[str]) -> str:
    client = anthropic.Anthropic()

    combined = "\n\n".join(controllers)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8096,
        system="""You are an OpenAPI 3.1 spec generator for Spring Boot.
Given @RestController source code:
- Extract @RequestMapping, @GetMapping, @PostMapping etc. for paths
- Parse @PathVariable, @RequestParam, @RequestBody annotations for parameters
- Infer response schemas from return types and @ResponseStatus annotations
- Extract validation constraints from @Valid, @NotNull, @Size etc.
Return a complete OpenAPI 3.1 YAML spec only.""",
        messages=[{
            "role": "user",
            "content": f"Generate OpenAPI spec from these Spring Boot controllers:\n\n{combined}"
        }]
    )
    return message.content[0].text

if __name__ == "__main__":
    import sys
    src = sys.argv[1] if len(sys.argv) > 1 else "./src/main/java"
    controllers = extract_spring_controllers(src)
    print(f"Found {len(controllers)} controller(s)")
    spec = generate_spec_from_spring(controllers)
    with open("openapi.yaml", "w") as f:
        f.write(spec)
    print("openapi.yaml written")
```

Claude handles Spring's annotation-heavy style well. It correctly maps `@PathVariable String id` to an OpenAPI path parameter and `@RequestBody @Valid CreateUserDto dto` to a required request body with schema derived from the DTO fields.

Comparing Claude vs GPT-4 for Spec Generation

Both tools produce valid OpenAPI YAML, but they differ in two ways:

Schema completeness: Claude tends to infer more response schemas from variable names and comments. If a route returns `{ id, email, createdAt }`, Claude creates a named schema `UserResponse` in `components/schemas`. GPT-4 sometimes inlines the schema directly in the path, which works but reduces reusability.

Error response handling: Claude consistently generates 401, 403, 404, and 500 responses based on middleware patterns it sees in the code (`authenticate`, `authorize`, etc.). GPT-4 often only generates the happy-path 200/201 unless you explicitly ask for error responses in the prompt.

Prompt tip: Add "Include all error response schemas (400, 401, 403, 404, 422, 500) and use $ref for reusable error schemas" to get GPT-4 closer to Claude's default output quality.

CI Drift Detection

```yaml
.github/workflows/swagger-drift.yml
name: Check Swagger Drift
on: [pull_request]

jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install anthropic pyyaml
      - name: Generate fresh spec and compare
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          python swagger_generator.py ./src/routes /tmp/generated-spec.yaml
          python compare_specs.py openapi.yaml /tmp/generated-spec.yaml
```

The `compare_specs.py` script can use a simple YAML diff or send both specs to Claude with the prompt: "List all breaking changes between spec A and spec B. A breaking change is a removed path, removed parameter, or changed response schema that would break existing clients." This catches regressions that naive string diffs miss. like renaming a field or changing a parameter from optional to required.

Keeping Specs Current Over Time

One-shot generation solves the bootstrap problem. The harder challenge is keeping the spec accurate as routes change. The most reliable pattern:

1. Store the spec in version control. treat `openapi.yaml` like production code, not generated output
2. Generate a "shadow spec" in CI. regenerate from current code on every PR
3. Diff and alert. fail the build if the shadow spec has paths not in the committed spec, or if committed spec has paths not in the code

This catches both directions of drift: code added without spec updates, and spec updates without corresponding code changes.

Related Reading

- [Best AI Tools for Writing Swagger API Documentation 2026](/best-ai-tools-for-writing-swagger-api-documentation-2026/)
- [How to Build AI-Powered API Diff Tools](/build-ai-powered-api-diff-tools/)
- [AI Code Review Automation Tools Comparison](/ai-code-review-automation-tools-comparison/)
- [AI Tools for Automated API Documentation from Code Comments](/ai-tools-for-automated-api-documentation-from-code-comments/)

---

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
