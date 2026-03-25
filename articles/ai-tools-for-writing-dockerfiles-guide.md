---
layout: default
title: "Best AI Tools for Writing Dockerfiles"
description: "Compare Claude Code, Copilot, and Cursor for Dockerfile generation. multi-stage builds, security hardening, layer caching, and distroless images"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-writing-dockerfiles-guide
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Dockerfile quality separates 2GB images from 150MB ones, root-running containers from hardened ones, and builds that always pull the internet from builds that use the layer cache. AI tools generate working Dockerfiles quickly, but the difference between "works" and "production-ready" is large.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - The Test: Python FastAPI Application

All tools were given the same prompt:
> "Write a production Dockerfile for a Python FastAPI application. Focus on security, image size, and build caching."

Step 2 - Claude's Multi-Stage Build

```dockerfile
Build stage. install deps and compile
FROM python:3.12-slim AS builder

WORKDIR /build

Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

Copy requirements first. better layer caching
Changes to source code won't invalidate this layer
COPY requirements.txt .

Install to a separate directory for easy copying
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

Runtime stage. minimal image with no build tools
FROM python:3.12-slim AS runtime

WORKDIR /app

Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

Create non-root user
RUN groupadd --gid 1001 appuser \
    && useradd --uid 1001 --gid appuser --no-create-home --shell /sbin/nologin appuser

Copy installed packages from builder
COPY --from=builder /install /usr/local

Copy application code
COPY --chown=appuser:appuser . .

Switch to non-root user
USER appuser

Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

Expose port (documentation only. doesn't publish)
EXPOSE 8000

Use exec form to receive signals properly
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

Key features:
- Multi-stage build: build tools don't end up in the final image
- Requirements copied before source: cache is preserved when only code changes
- Non-root user with no shell and no home directory
- `HEALTHCHECK` with reasonable timeouts
- `exec` form CMD (not shell form) for proper signal handling

Step 3 - Copilot's Output

```dockerfile
FROM python:3.12

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

This is a valid Dockerfile but:
- Copies everything before pip install. invalidates pip cache on any code change
- Runs as root
- No multi-stage build. includes gcc, build tools in final image
- No health check
- Uses full `python:3.12` (~1GB) instead of `python:3.12-slim` (~130MB)

Step 4 - Node.js Application

```dockerfile
Claude's Node.js multi-stage Dockerfile

Stage 1 - Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

Copy package files first
COPY package.json package-lock.json ./

Install production dependencies only
RUN npm ci --omit=dev --prefer-offline

Stage 2 - Build (for TypeScript or Next.js)
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

Stage 3 - Production runtime
FROM node:20-alpine AS runtime
WORKDIR /app

Security hardening
RUN apk add --no-cache dumb-init \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

Copy only what's needed
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --chown=nextjs:nodejs package.json ./

USER nextjs

dumb-init: proper signal handling for Node.js
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

Claude's Node.js version uses `dumb-init` for proper PID 1 signal handling. a critical detail for graceful shutdown that almost no other AI tool includes.

Step 5 - Go Application: Scratch Image

```dockerfile
Claude's Go Dockerfile. minimal final image

Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /build

Install CA certificates for HTTPS calls from the binary
RUN apk add --no-cache ca-certificates git

Download dependencies (cached separately from source)
COPY go.mod go.sum ./
RUN go mod download

Build with security flags
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o server \
    ./cmd/server

Runtime stage. empty scratch image
FROM scratch

Copy CA certs for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

Copy binary
COPY --from=builder /build/server /server

Non-root user in scratch (no /etc/passwd, use numeric UID)
USER 65534:65534

EXPOSE 8080

ENTRYPOINT ["/server"]
```

The `scratch` final image is under 10MB and has zero attack surface. no shell, no package manager, no OS utilities. Claude knows to copy CA certs (needed for HTTPS calls) and use a numeric UID since there's no `/etc/passwd` in scratch.

Step 6 - Security Scanning Integration

```dockerfile
.github/workflows/docker-security.yml
- name: Run Trivy security scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'myapp:${{ github.sha }}'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # Fail build on critical vulns
```

```python
Use Claude to interpret Trivy output
from anthropic import Anthropic
import json

client = Anthropic()

def interpret_trivy_report(trivy_json: dict) -> str:
    critical_vulns = [
        v for result in trivy_json.get("Results", [])
        for v in result.get("Vulnerabilities", [])
        if v.get("Severity") == "CRITICAL"
    ]

    if not critical_vulns:
        return "No critical vulnerabilities found."

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Summarize these Docker image vulnerabilities and provide remediation steps.

Vulnerabilities:
{json.dumps(critical_vulns[:5], indent=2)}

For each - affected package, severity, CVE, and specific fix (usually a package version update or base image change)."""
        }]
    )
    return response.content[0].text
```

Tool Comparison

| Feature | Claude Code | Copilot | Cursor |
|---|---|---|---|
| Multi-stage builds | Always | Rare | Sometimes |
| Non-root user | Yes | No | Sometimes |
| Layer cache optimization | Optimal | Basic | Partial |
| Signal handling (dumb-init) | Yes | No | No |
| Health checks | Yes | No | Rarely |
| Scratch images for Go | Yes with CA certs | Basic scratch | No |
| Security hardening flags | `-w -s -extldflags` | Basic | Partial |

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Related Articles

- [Best AI Tools for Writing Dockerfile Optimization 2026](/best-ai-tools-for-writing-dockerfile-optimization-2026/)
- [Best AI Tools for Writing Bazel BUILD Files 2026](/best-ai-tools-for-writing-bazel-build-files-2026/)
- [How to Use Copilot to Write Dockerfiles for Multi-Stage](/how-to-use-copilot-to-write-dockerfiles-for-multi-stage-buil/)
- [Best AI Coding Tool for Dockerfile Generation](/best-ai-coding-tool-for-dockerfile-generation/)
- [Configuring AI Coding Tools to Match Your Teams Specific](/configuring-ai-coding-tools-to-match-your-teams-specific-doc/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
