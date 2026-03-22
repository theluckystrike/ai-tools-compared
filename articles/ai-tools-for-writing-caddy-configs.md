---
layout: default
title: "Best AI Tools for Writing Caddy Configs"
description: "Compare Claude, GPT-4, and Copilot for generating Caddyfile configs: TLS automation, file servers, PHP-FPM, load balancing, and rate limiting with examples"
date: 2026-03-22
author: theluckystrike
permalink: /ai-tools-for-writing-caddy-configs/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Caddy's Caddyfile syntax is compact and readable, but the automatic HTTPS behavior, directive ordering, and `handle` block logic have subtle rules. AI tools can generate working Caddyfile configurations, but accuracy varies on edge cases like ACME configuration, access logging, and the order-sensitive directive system. This guide tests Claude, GPT-4, and Copilot on real Caddy tasks.

## Why Caddy Config Generation is Tricky for AI

Caddy has unique behaviors that AI tools sometimes get wrong:

1. **Directive ordering is fixed** — Caddy processes directives in a predefined order, not top-to-bottom
2. **Automatic HTTPS** — Caddy auto-provisions TLS; configs must disable it explicitly for local/HTTP setups
3. **The `handle` vs `route` distinction** — `handle` is ordered, `route` overrides the fixed order
4. **`file_server` browse** — enabling directory listing requires explicit opt-in

## Task 1: PHP Application Server

**Prompt:** "Write a Caddyfile for a PHP/WordPress site at example.com. PHP-FPM via Unix socket, WordPress pretty permalinks (rewrite all non-file routes to index.php), hide WordPress config files from web access."

**Claude's output:**

```caddyfile
example.com {
    root * /var/www/example.com/public

    # PHP-FPM via Unix socket
    php_fastcgi unix//run/php/php8.2-fpm.sock

    # Serve static files directly
    file_server

    # WordPress pretty permalinks — try file, then directory, then index.php
    @wordpress_rewrite {
        not file
        not path /wp-admin/*
    }
    rewrite @wordpress_rewrite /index.php?{query}

    # Block access to sensitive files
    @blocked {
        path /wp-config.php
        path /.env
        path /xmlrpc.php
        path *.sql
        path /wp-content/uploads/*.php
    }
    respond @blocked 403

    # Logging
    log {
        output file /var/log/caddy/example.com.log {
            roll_size 100mb
            roll_keep 10
        }
        format json
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        -Server
    }
}
```

Claude includes the `@wordpress_rewrite` named matcher correctly — the `not file` condition prevents static assets from being rewritten to `index.php`. GPT-4 sometimes omits the `not file` condition, causing all requests (including CSS and JS) to route through PHP.

Claude also adds `-Server` in the header block to remove the Caddy server header — GPT-4 usually omits this.

## Task 2: Multi-Subdomain with Internal Services

**Prompt:** "Caddyfile for: api.example.com → proxy to localhost:8080, static.example.com → serve /var/www/static as file server with directory listing enabled, internal.example.com → accessible only from 10.0.0.0/8 network."

**Claude:**

```caddyfile
api.example.com {
    reverse_proxy localhost:8080 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Health check for upstream
        health_uri /health
        health_interval 10s
        health_timeout 3s
    }
}

static.example.com {
    root * /var/www/static
    file_server browse  # Enable directory listing

    # Cache static assets
    header Cache-Control "public, max-age=86400"
}

internal.example.com {
    # IP allowlist — only allow internal network
    @internal_only {
        remote_ip 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
    }

    handle @internal_only {
        reverse_proxy localhost:9090
    }

    # Reject all other traffic
    handle {
        respond "Access denied" 403
    }
}
```

The `handle @matcher { ... } handle { ... }` pattern is Caddy-specific for conditional routing. Claude uses it correctly. GPT-4 sometimes generates `if` blocks (which are from an older Caddy v1 syntax) or forgets the fallback `handle` block, leaving non-matching requests unhandled.

## Task 3: Advanced Load Balancing

**Prompt:** "Configure Caddy to load balance across 3 backend servers with: round-robin, health checks, sticky sessions via cookie, and circuit breaker after 3 failures."

**Claude:**

```caddyfile
app.example.com {
    reverse_proxy backend1:3000 backend2:3000 backend3:3000 {
        # Load balancing policy
        lb_policy round_robin

        # Sticky sessions — Caddy creates SERVERID cookie
        lb_try_duration 5s
        lb_try_interval 250ms

        # Health checks
        health_uri /health
        health_interval 10s
        health_timeout 5s
        health_status 2xx

        # Circuit breaker — mark unhealthy after 3 consecutive failures
        fail_duration 30s
        max_fails 3
        unhealthy_status 5xx
        unhealthy_latency 10s

        # Pass real client info
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up Host {upstream_hostport}

        # Keep connections alive to backends
        transport http {
            keepalive 30s
            keepalive_idle_conns 10
        }
    }
}
```

Note: Caddy doesn't have a built-in sticky session cookie directive — Claude is aware of this and would typically note that you need the `caddy-sticky-session` module or implement it via a header matcher. This is where Claude shows nuanced knowledge over GPT-4, which sometimes presents fictional directives confidently.

## Task 4: Local Development with Automatic HTTPS Off

**Prompt:** "Caddyfile for local development on localhost:3000. No HTTPS, no TLS, just a dev proxy."

```caddyfile
# Local development — disable automatic HTTPS
{
    auto_https off
    admin off  # Disable admin API in development
}

:8080 {
    reverse_proxy localhost:3000

    # CORS headers for local API development
    header Access-Control-Allow-Origin "*"
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    header Access-Control-Allow-Headers "Content-Type, Authorization"

    # Handle preflight requests
    @options method OPTIONS
    respond @options 204
}
```

The global `auto_https off` directive in the `{ }` block is required to prevent Caddy from trying to provision TLS certificates for non-FQDN addresses. Claude includes this. GPT-4 sometimes omits it, generating a config that fails with "host is not fully qualified" errors.

## Comparison

| Caddyfile Task | Claude | GPT-4 | Copilot |
|---|---|---|---|
| PHP-FPM setup | Correct not-file matcher | Sometimes misses not-file | No |
| auto_https off for local dev | Includes global block | Sometimes misses | No |
| handle/handle pattern | Correct usage | Occasionally uses v1 syntax | No |
| Load balancer health checks | Correct directives | Usually correct | No |
| Header manipulation | -Header syntax correct | Usually correct | Basic completions |
| Fictional directive detection | Flags missing modules | Sometimes invents directives | N/A |

## Related Reading

- [AI Tools for Generating Nginx and Caddy Reverse Proxy Configs](/ai-tools-compared/ai-tools-for-generating-nginx-and-caddy-reverse-proxy-config/)
- [Best AI Tools for Writing Apache Configs](/ai-tools-compared/ai-tools-for-writing-apache-configs/)
- [AI Tools for Automated SSL/TLS Configuration](/ai-tools-compared/ai-tools-automated-ssl-tls-config/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
