---
layout: default
title: "Best AI Tools for Writing GitHub Actions"
description: "Compare Claude Code, Copilot, and Cursor for writing GitHub Actions — security hardening, matrix builds, composite actions, and OIDC auth patterns"
date: 2026-03-22
author: theluckystrike
permalink: /ai-tools-for-writing-github-actions-guide/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

# Best AI Tools for Writing GitHub Actions in 2026

GitHub Actions YAML is deceptively simple on the surface and deeply complex once you need matrix builds, reusable workflows, OIDC authentication, or proper caching. AI tools that understand only the syntax produce workflows that run — but burn twice the compute, fail under load, or silently skip security controls.

## The Test Cases

Three workflows form the benchmark:
1. A Node.js CI with matrix builds across Node versions and OS
2. A Docker build with OIDC push to AWS ECR (no stored credentials)
3. A reusable workflow called from multiple repositories

## Claude for GitHub Actions

Claude is the strongest overall. It understands the difference between `github.token` and `secrets.GITHUB_TOKEN`, knows when to use `actions/cache@v4` vs `setup-node`'s built-in cache, and generates OIDC authentication correctly without being asked.

**Prompt:**
```text
Write a GitHub Actions workflow for a Node.js monorepo. Requirements:
- Matrix build across Node 18, 20, 22 and ubuntu-latest, windows-latest
- Cache node_modules based on package-lock.json hash
- Run tests with coverage, upload coverage to Codecov
- On push to main only: build Docker image, push to ECR using OIDC (no stored AWS keys)
- Fail fast: false for the matrix
- Concurrency: cancel in-progress runs on the same branch
# Best AI Tools for Writing GitHub Actions

GitHub Actions YAML is verbose and error-prone. Security hardening, matrix builds, composite actions, and OIDC authentication patterns are tedious to write manually. AI tools excel at generating the boilerplate and catching common mistakes like insecure checkout practices or missing permissions.

## Basic Workflow Generation

**Prompt to Claude:**
```text
Write a GitHub Actions workflow that:
- Triggers on push to main and pull requests
- Runs on ubuntu-latest
- Checks out code, sets up Node.js 20, installs dependencies with npm ci
- Runs linting and tests
- Only builds on main branch
Use strict permissions: contents read, checks write.
```

**Claude output:**

```yaml
name: CI

on:
 push:
 branches: [main, 'release/**']
 pull_request:
 branches: [main]

concurrency:
 group: ${{ github.workflow }}-${{ github.ref }}
 cancel-in-progress: true

jobs:
 test:
 name: Test (Node ${{ matrix.node-version }} / ${{ matrix.os }})
 runs-on: ${{ matrix.os }}
 strategy:
 fail-fast: false
 matrix:
 node-version: ['18', '20', '22']
 os: [ubuntu-latest, windows-latest]

 steps:
 - uses: actions/checkout@v4

 - name: Setup Node.js ${{ matrix.node-version }}
 uses: actions/setup-node@v4
 with:
 node-version: ${{ matrix.node-version }}
 cache: npm

 - name: Install dependencies
 run: npm ci

 - name: Run tests with coverage
 run: npm run test:coverage

 - name: Upload coverage to Codecov
 if: matrix.os == 'ubuntu-latest' && matrix.node-version == '20'
 uses: codecov/codecov-action@v4
 with:
 token: ${{ secrets.CODECOV_TOKEN }}
 fail_ci_if_error: true

 build-and-push:
 name: Build and Push to ECR
 needs: test
 if: github.ref == 'refs/heads/main' && github.event_name == 'push'
 runs-on: ubuntu-latest
 permissions:
 id-token: write # Required for OIDC
 contents: read
name: Tests and Linting
on:
 push:
 branches: [main]
 pull_request:

permissions:
 contents: read
 checks: write

jobs:
 test:
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v4
 with:
 fetch-depth: 0 # full history for better linting

 - uses: actions/setup-node@v4
 with:
 node-version: '20'
 cache: 'npm'

 - run: npm ci
 - run: npm run lint
 - run: npm test

 build:
 runs-on: ubuntu-latest
 if: github.ref == 'refs/heads/main'
 needs: test
 steps:
 - uses: actions/checkout@v4
 - uses: actions/setup-node@v4
 with:
 node-version: '20'
 cache: 'npm'
 - run: npm ci
 - run: npm run build
 - uses: actions/upload-artifact@v4
 with:
 name: dist
 path: dist/
```

Claude adds `fetch-depth: 0` (needed by some linters), uses `npm ci` instead of `npm install` (correct for CI), and includes the `cache: 'npm'` line that saves ~30 seconds per run. It also sets strict permissions instead of the default `contents: write`.

## Matrix Builds

**Prompt:**
```text
Write a GitHub Actions matrix build for a Python package.
Test on Python 3.9, 3.10, 3.11, 3.12 and OS: ubuntu-latest, windows-latest, macos-latest.
Skip Python 3.9 on Windows (not supported). Use uv for dependency management.
Include coverage report upload to Codecov.
```

**Claude output:**

```yaml
name: Matrix Tests
on: [push, pull_request]

permissions:
 contents: read

jobs:
 test:
 strategy:
 matrix:
 os: [ubuntu-latest, windows-latest, macos-latest]
 python-version: ['3.9', '3.10', '3.11', '3.12']
 exclude:
 - os: windows-latest
 python-version: '3.9'

 runs-on: ${{ matrix.os }}
 steps:
 - uses: actions/checkout@v4

 - uses: astral-sh/setup-uv@v2
 with:
 python-version: ${{ matrix.python-version }}

 - run: uv sync
 - run: uv run pytest --cov=src tests/
 - run: uv run coverage xml

 - uses: codecov/codecov-action@v3
 with:
 files: coverage.xml
 flags: unittests
 os: ${{ matrix.os }}
 python-version: ${{ matrix.python-version }}
```

Claude uses `exclude` to skip the 3.9-on-Windows combination and includes `python-version` in the Codecov upload flags so reports are grouped correctly.

## Composite Actions (Reusable Steps)

**Prompt:**
```text
Write a composite GitHub Action that:
- Checks out the code
- Sets up Node.js with npm cache
- Installs dependencies
- Runs ESLint and Prettier

The action should accept inputs: node-version (default 20), and cache-enabled (default true).
Use it from a main workflow.
```

**Claude output (action.yml):**

```yaml
name: Setup and Lint
description: Check out, install, and lint a Node.js project
inputs:
 node-version:
 description: Node.js version
 required: false
 default: '20'
 cache-enabled:
 description: Enable npm cache
 required: false
 default: 'true'

runs:
 using: composite
 steps:
 - uses: actions/checkout@v4

 - uses: actions/setup-node@v4
 with:
 node-version: ${{ inputs.node-version }}
 cache: ${{ inputs.cache-enabled == 'true' && 'npm' || '' }}

 - run: npm ci
 shell: bash

 - run: npm run lint
 shell: bash

 - run: npm run format:check
 shell: bash
```

**Usage in main workflow:**

```yaml
jobs:
 check:
 runs-on: ubuntu-latest
 steps:
 - uses: ./.github/actions/setup-and-lint
 with:
 node-version: '20'
 cache-enabled: 'true'
```

Claude correctly uses `shell: bash` in composite actions (required) and shows how to conditionally set the cache parameter.

## OIDC Authentication and Token Exchange

**Prompt:**
```text
Write a GitHub Actions workflow that:
- Authenticates to AWS using OIDC (no static credentials)
- Assumes a role with proper trust policy
- Pushes a Docker image to ECR
Include the AWS trust policy configuration.
```

**Claude output (workflow):**

```yaml
name: Build and Push to ECR
on:
 push:
 branches: [main]

permissions:
 id-token: write
 contents: read

env:
 AWS_REGION: us-east-1
 ECR_REGISTRY: 123456789.dkr.ecr.us-east-1.amazonaws.com
 ECR_REPOSITORY: myapp

jobs:
 build:
 runs-on: ubuntu-latest
 outputs:
 image: ${{ steps.image.outputs.image }}

 steps:
 - uses: actions/checkout@v4

 - name: Configure AWS credentials via OIDC
 uses: aws-actions/configure-aws-credentials@v4
 with:
 role-to-assume: ${{ secrets.AWS_ECR_ROLE_ARN }}
 aws-region: ${{ vars.AWS_REGION }}

 - name: Login to Amazon ECR
 id: login-ecr
 uses: aws-actions/amazon-ecr-login@v2

 - name: Build and push Docker image
 env:
 REGISTRY: ${{ steps.login-ecr.outputs.registry }}
 REPOSITORY: my-app
 IMAGE_TAG: ${{ github.sha }}
 run: |
 docker build \
 --label "git-commit=${{ github.sha }}" \
 --label "built-by=github-actions" \
 -t $REGISTRY/$REPOSITORY:$IMAGE_TAG \
 -t $REGISTRY/$REPOSITORY:latest \
 .
 docker push $REGISTRY/$REPOSITORY:$IMAGE_TAG
 docker push $REGISTRY/$REPOSITORY:latest
```

Key things Claude gets right automatically:
- `permissions: id-token: write` is required for OIDC — omitting it causes a silent 403
- Coverage upload only on one matrix combination to avoid duplicate Codecov reports
- `cancel-in-progress: true` prevents queue buildup on busy branches
- `npm ci` instead of `npm install` for reproducible installs

## Copilot for GitHub Actions

Copilot (inline in VS Code) generates structurally valid workflows but misses security-critical details. In testing, it:
- Omits `permissions` blocks entirely, relying on over-broad default token permissions
- Uses `npm install` instead of `npm ci`
- Doesn't set `fail-fast: false` unless asked
- Generates OIDC setup incorrectly, missing the `id-token: write` permission

For simple single-job workflows, Copilot is fine. For anything involving credentials or matrix builds, it requires significant manual review.

## Composite Actions: Reusable Workflow Patterns

Claude handles reusable workflows and composite actions well. Here's a composite action for shared build steps:

```yaml
# .github/actions/setup-and-build/action.yml
name: Setup and Build
description: Install dependencies and build the project

inputs:
 node-version:
 description: Node.js version to use
 required: false
 default: '20'
 working-directory:
 description: Directory containing package.json
 required: false
 default: '.'

outputs:
 cache-hit:
 description: Whether the cache was restored
 value: ${{ steps.cache.outputs.cache-hit }}

runs:
 using: composite
 steps:
 - name: Setup Node.js
 uses: actions/setup-node@v4
 with:
 node-version: ${{ inputs.node-version }}
 cache: npm
 cache-dependency-path: ${{ inputs.working-directory }}/package-lock.json

 - name: Install dependencies
 shell: bash
 working-directory: ${{ inputs.working-directory }}
 run: npm ci

 - name: Build
 shell: bash
 working-directory: ${{ inputs.working-directory }}
 run: npm run build
```

The `shell: bash` is required in composite actions — Claude includes it; many AI tools omit it, causing failures on Windows runners.

### Reusable Workflows vs Composite Actions

A common point of confusion is when to use reusable workflows (`workflow_call`) vs composite actions. Claude explains the distinction correctly when asked:

- **Composite actions** run within a job's context — they can't define their own jobs, services, or runners. Use them for shared steps.
- **Reusable workflows** are full workflows called from another workflow — they can define their own jobs, strategy matrices, and runners. Use them for shared CI pipelines.

```yaml
# Reusable workflow — called with workflow_call
# .github/workflows/reusable-test.yml
on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '20'
    secrets:
      CODECOV_TOKEN:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

And the caller:

```yaml
# .github/workflows/ci.yml
jobs:
  run-tests:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '22'
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

Claude generates both sides of this pattern correctly. Copilot generates only the reusable workflow definition and omits the `secrets` pass-through in the caller, causing the called workflow to fail because secrets don't inherit automatically.

## Security Hardening Patterns

For production workflows, add these hardening steps that Claude applies correctly when prompted:

```yaml
# Pin all actions to full commit SHA, not tags
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

# Minimal permissions — override per-job
permissions:
 contents: read

# Prevent script injection via environment variables
- name: Process user input safely
 env:
 USER_INPUT: ${{ github.event.pull_request.title }}
 run: |
 # Never interpolate github context directly into run commands
 echo "PR title length: ${#USER_INPUT}"
```

The script injection pattern — interpolating `${{ github.event.pull_request.title }}` directly into a `run` block — is a common vulnerability that Copilot frequently generates. Claude warns about this and uses environment variable indirection instead.

### Token Permission Scoping

Claude's default permission scoping is minimal — `contents: read` at the workflow level with explicit per-job escalation:

```yaml
# Global minimum
permissions:
  contents: read

jobs:
  deploy:
    permissions:
      contents: read
      id-token: write      # OIDC only — scoped to this job
      deployments: write   # Deployment status only — scoped to this job
    runs-on: ubuntu-latest
    steps:
      # ...
```

Copilot frequently generates `permissions: write-all` or omits permissions entirely, leaving the default `write` access on `contents` — which allows any step in the workflow to modify repository contents.

## Advanced: Dynamic Matrix Generation

```yaml
jobs:
 generate-matrix:
 runs-on: ubuntu-latest
 outputs:
 matrix: ${{ steps.set-matrix.outputs.matrix }}
 steps:
 - uses: actions/checkout@v4
 - id: set-matrix
 run: |
 # Build matrix dynamically from changed services
 SERVICES=$(git diff --name-only HEAD~1 HEAD | grep '^services/' | cut -d/ -f2 | sort -u | jq -R . | jq -sc .)
 echo "matrix={\"service\":$SERVICES}" >> $GITHUB_OUTPUT

 build-services:
 needs: generate-matrix
 if: ${{ needs.generate-matrix.outputs.matrix != '{"service":[]}' }}
 strategy:
 matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v4
 - name: Build ${{ matrix.service }}
 run: docker build services/${{ matrix.service }}
```

### Handling Empty Dynamic Matrices

The `if` condition on `build-services` guards against an empty matrix — a case that causes a confusing workflow failure without it. Claude includes this guard automatically. The condition checks whether the `service` array is empty after the `generate-matrix` job runs.

One edge case Claude handles correctly: when `git diff HEAD~1 HEAD` runs on the initial commit (no `HEAD~1`), it errors out. Claude adds `|| true` or fetches with `--depth=2` to handle shallow clones:

```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Required for git diff HEAD~1

      - id: set-matrix
        run: |
          SERVICES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep '^services/' | cut -d/ -f2 | sort -u | jq -R . | jq -sc .)
          SERVICES=${SERVICES:-'[]'}
          echo "matrix={\"service\":$SERVICES}" >> $GITHUB_OUTPUT
```

## Caching Strategies

Claude differentiates between caching approaches based on package manager and monorepo structure:

```yaml
# Single-package npm project — use setup-node built-in cache
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm

# Monorepo with multiple package.json files — use actions/cache with glob
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      **/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

# pnpm — requires separate cache setup
- uses: pnpm/action-setup@v3
  with:
    version: 9

- name: Get pnpm store directory
  id: pnpm-cache
  run: echo "dir=$(pnpm store path)" >> $GITHUB_OUTPUT

- uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.dir }}
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: ${{ runner.os }}-pnpm-
```

Copilot defaults to the npm built-in cache even when the project uses pnpm or yarn, requiring a manual correction.

## Related Articles

- [AI-Powered CI/CD Pipeline Optimization](/ai-powered-cicd-pipeline-optimization-2026/)
- [Best AI Tools for Writing Makefiles](/best-ai-tools-for-writing-makefiles-2026/)
- [AI Tools for Automated Migration Testing](/ai-tools-for-automated-migration-testing-2026/)
- [AI Tools for Writing GitHub Actions Workflows (2026)](/ai-tools-compared/ai-tools/best-ai-tools-for-github-actions-workflows/)
          role-to-assume: arn:aws:iam::123456789:role/github-actions-role
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        run: aws ecr get-login-password --region ${{ env.AWS_REGION }} | docker login --username AWS --password-stdin ${{ env.ECR_REGISTRY }}

      - name: Build Docker image
        run: docker build -t ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }} .

      - name: Push to ECR
        id: image
        run: |
          docker push ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
          echo "image=${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}" >> $GITHUB_OUTPUT
```

**AWS IAM Trust Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Claude includes the `id-token: write` permission (required for OIDC) and shows the correct trust policy syntax with both `aud` and `sub` conditions.

## Secrets Management Best Practices

**Prompt:**
```text
Show me how to:
- Use GitHub Secrets in a workflow
- Encrypt sensitive data
- Pass secrets to Docker builds without exposing in logs
- Rotate secrets safely
```

Claude's explanation includes:

```bash
# In your workflow, use ${{ secrets.SECRET_NAME }}
# GitHub automatically masks the value in logs

# For Docker build secrets (BuildKit):
docker build \
  --secret DATABASE_PASSWORD \
  --build-arg REGISTRY_URL=${{ secrets.REGISTRY_URL }} \
  .

# Dockerfile (with buildkit syntax):
# syntax=docker/dockerfile:1
FROM ubuntu
RUN --mount=type=secret,id=DATABASE_PASSWORD \
  cat /run/secrets/DATABASE_PASSWORD
```

Never echo secrets or print them to logs. GitHub masks known secrets but not dynamic ones. Rotate regularly — set an expiration date for long-lived secrets.

## Tool Comparison

| Task | Claude | ChatGPT |
|------|--------|---------|
| Basic workflows | Excellent | Excellent |
| Matrix builds with exclusions | Handles correctly | Sometimes wrong |
| Composite action inputs | Correct shell handling | Omits shell directive |
| OIDC trust policy JSON | Accurate syntax | Incomplete |
| Permission scoping | Strict (reads=read, checks=write) | Often too permissive |
| Secrets handling | Honest about limitations | Sometimes unsafe advice |
| Caching (npm, pip, etc) | Includes by default | Sometimes omitted |

## Common Mistakes to Avoid

Claude catches these automatically:
- Using `actions/checkout@v3` (old) instead of `v4`
- Running `npm install` in CI (use `npm ci`)
- Using `permissions: write-all` (overly permissive)
- Forgetting `id-token: write` for OIDC workflows
- Using `pull_request` without specifying `branches:` on `push` (triggers on every branch)

## Related Reading

- [Best AI Tools for Writing GitHub Actions Matrix Build Strategies](/ai-tools-compared/best-ai-tools-for-writing-github-actions-matrix-build-strate/)
- [Best AI Tools for Writing Kubernetes Custom Resource Definitions](/ai-tools-compared/best-ai-tools-for-writing-kubernetes-custom-resource-definitions-2026/)
- [AI Assistants for Writing Correct AWS IAM Policies](/ai-tools-compared/ai-assistants-for-writing-correct-aws-iam-policies-with-least-privilege/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
