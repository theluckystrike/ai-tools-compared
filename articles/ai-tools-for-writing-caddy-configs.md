---
layout: default
title: "Best AI Tools for Writing Caddy Configs"
description: "Compare Claude, GPT-4, and Copilot for generating Caddyfile configs: TLS automation, file servers, PHP-FPM, load balancing, and rate limiting with examples"
date: 2026-03-22
author: theluckystrike
permalink: /ai-tools-for-writing-caddy-configs/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Caddy's Caddyfile syntax is compact and readable, but the automatic HTTPS behavior, directive ordering, and `handle` block logic have subtle rules. AI tools can generate working Caddyfile configurations, but accuracy varies on edge cases like ACME configuration, access logging, and the order-sensitive directive system. This guide tests Claude, GPT-4, and Copilot on real Caddy tasks.

Why Caddy Config Generation is Tricky for AI

Caddy has unique behaviors that AI tools sometimes get wrong:

1. Directive ordering is fixed. Caddy processes directives in a predefined order, not top-to-bottom
2. Automatic HTTPS. Caddy auto-provisions TLS; configs must disable it explicitly for local/HTTP setups
3. The `handle` vs `route` distinction. `handle` is ordered, `route` overrides the fixed order
4. `file_server` browse. enabling directory listing requires explicit opt-in

Most AI tools trained on web data have seen Caddy v1 config syntax, which is significantly different from Caddy v2. GPT-4 and Copilot can produce v1-style configs (`proxy`, `tls self_signed`) that fail on a modern Caddy v2 installation. Claude is more reliable here, but it still benefits from a prompt that specifies "Caddy v2 Caddyfile syntax."

Task 1 - PHP Application Server

Prompt - "Write a Caddyfile for a PHP/WordPress site at example.com. PHP-FPM via Unix socket, WordPress pretty permalinks (rewrite all non-file routes to index.php), hide WordPress config files from web access."

Claude's output:

```caddyfile
example.com {
    root * /var/www/example.com/public

    # PHP-FPM via Unix socket
    php_fastcgi unix//run/php/php8.2-fpm.sock

    # Serve static files directly
    file_server

    # WordPress pretty permalinks. try file, then directory, then index.php
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

Claude includes the `@wordpress_rewrite` named matcher correctly. the `not file` condition prevents static assets from being rewritten to `index.php`. GPT-4 sometimes omits the `not file` condition, causing all requests (including CSS and JS) to route through PHP.

Claude also adds `-Server` in the header block to remove the Caddy server header. GPT-4 usually omits this.

What Goes Wrong With GPT-4 Here

The most common GPT-4 failure on this task is generating a `rewrite` directive without the `not file` matcher. The result is a config that rewrites every request. including requests for `/wp-content/themes/style.css`. to `index.php`. WordPress then returns a 404 or blank page for all static assets. It is a subtle bug that only shows up when you test with a real browser.

A secondary issue - GPT-4 sometimes uses `try_files` which is not a valid Caddy v2 directive. That is a carry-over from Nginx/PHP-FPM configs in the training data.

Task 2 - Multi-Subdomain with Internal Services

Prompt - "Caddyfile for: api.example.com → proxy to localhost:8080, static.example.com → serve /var/www/static as file server with directory listing enabled, internal.example.com → accessible only from 10.0.0.0/8 network."

Claude:

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
    # IP allowlist. only allow internal network
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

Rate Limiting on the API Subdomain

A common follow-up need on API subdomains is rate limiting. Caddy's core module does not include rate limiting. it requires the `caddy-ratelimit` or `caddy-ext/ratelimit` plugin. Claude correctly identifies this when asked:

```caddyfile
Requires - xcaddy build --with github.com/mholt/caddy-ratelimit
api.example.com {
    rate_limit {
        zone api_zone {
            key {remote_host}
            events 100
            window 1m
        }
    }

    reverse_proxy localhost:8080 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

GPT-4 has been observed generating `rate_limit` directives in response to the same prompt without noting that the directive requires a plugin. leaving users with a config that Caddy silently ignores or rejects at startup.

Task 3 - Advanced Load Balancing

Prompt - "Configure Caddy to load balance across 3 backend servers with: round-robin, health checks, sticky sessions via cookie, and circuit breaker after 3 failures."

Claude:

```caddyfile
app.example.com {
    reverse_proxy backend1:3000 backend2:3000 backend3:3000 {
        # Load balancing policy
        lb_policy round_robin

        # Sticky sessions. Caddy creates SERVERID cookie
        lb_try_duration 5s
        lb_try_interval 250ms

        # Health checks
        health_uri /health
        health_interval 10s
        health_timeout 5s
        health_status 2xx

        # Circuit breaker. mark unhealthy after 3 consecutive failures
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

Caddy doesn't have a built-in sticky session cookie directive. Claude is aware of this and would typically note that you need the `caddy-sticky-session` module or implement it via a header matcher. This is where Claude shows nuanced knowledge over GPT-4, which sometimes presents fictional directives confidently.

Understanding the Circuit Breaker Parameters

The `fail_duration` and `max_fails` directives implement Caddy's passive health check. When `max_fails` (3) consecutive requests to a backend return `unhealthy_status` responses (5xx) within `fail_duration` (30s), Caddy marks that backend as unhealthy and stops routing to it. The backend is retried after the `fail_duration` window resets.

This is different from the active health check (`health_uri`, `health_interval`) which proactively polls backends. Both can be used together: the active check detects gradual degradation, while the passive check responds instantly to backend failures under live traffic.

Task 4 - Local Development with Automatic HTTPS Off

Prompt - "Caddyfile for local development on localhost:3000. No HTTPS, no TLS, just a dev proxy."

```caddyfile
Local development. disable automatic HTTPS
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

Using Caddy for Local HTTPS with mkcert

When you do want local HTTPS (to match a production environment), Claude generates the correct pattern:

```caddyfile
{
    local_certs
    # Or use a manually provisioned cert:
    # auto_https disable_redirects
}

localhost {
    tls /path/to/localhost.pem /path/to/localhost-key.pem

    reverse_proxy localhost:3000
}
```

The `local_certs` global option tells Caddy to use its internal CA (trusted locally) rather than attempting ACME. GPT-4 sometimes suggests `tls self_signed` which is Caddy v1 syntax and will fail in Caddy v2.

Task 5 - Global Error Pages and Request ID Injection

Prompt - "Add custom error pages for 404 and 500 responses across all virtual hosts. Also inject a unique request ID header for each incoming request."

Claude:

```caddyfile
{
    servers {
        trusted_proxies static 10.0.0.0/8
    }
}

(common_config) {
    # Inject unique request ID
    header X-Request-ID {http.request.uuid}

    # Custom error pages
    handle_errors {
        @404 expression {http.error.status_code} == 404
        handle @404 {
            rewrite * /errors/404.html
            file_server {
                root /var/www/error-pages
            }
        }

        @500 expression {http.error.status_code} >= 500
        handle @500 {
            rewrite * /errors/500.html
            file_server {
                root /var/www/error-pages
            }
        }
    }
}

api.example.com {
    import common_config
    reverse_proxy localhost:8080
}

app.example.com {
    import common_config
    reverse_proxy localhost:3000
}
```

The `(snippet) { ... }` + `import` pattern lets you share common config across virtual hosts. Claude generates this correctly for DRY Caddyfile configs. GPT-4 tends to repeat the error handler block in every virtual host block instead.

Comparison

| Caddyfile Task | Claude | GPT-4 | Copilot |
|---|---|---|---|
| PHP-FPM setup | Correct not-file matcher | Sometimes misses not-file | No |
| auto_https off for local dev | Includes global block | Sometimes misses | No |
| handle/handle pattern | Correct usage | Occasionally uses v1 syntax | No |
| Load balancer health checks | Correct directives | Usually correct | No |
| Header manipulation | -Header syntax correct | Usually correct | Basic completions |
| Fictional directive detection | Flags missing modules | Sometimes invents directives | N/A |
| Snippet/import pattern | Generated correctly | Repeats config | No |
| Plugin requirements noted | Yes (rate limiting, sticky) | Sometimes omits | No |

Practical Tips for AI-Assisted Caddy Config

When prompting any AI for Caddy configuration:

- Specify Caddy v2 explicitly. The training data includes Caddy v1 configs and tutorials that will confuse the output.
- Mention the Caddy version number if you know it (`caddy version` output). This helps the model avoid deprecated directives.
- Ask the model to identify any directives that require plugins. This is the most common source of silent failures.
- For complex configs, ask the AI to explain the directive evaluation order. Caddy's fixed ordering means some configs look correct but behave unexpectedly.

Claude's stronger performance on Caddy tasks comes partly from its tendency to qualify uncertain knowledge ("this may require the `caddy-ratelimit` module") rather than generating confident but wrong output.

Related Reading

- [AI Tools for Generating Nginx and Caddy Reverse Proxy Configs](/ai-tools-for-generating-nginx-and-caddy-reverse-proxy-config/)
- [Best AI Tools for Writing Apache Configs](/ai-tools-for-writing-apache-configs/)
- [AI Tools for Automated SSL/TLS Configuration](/ai-tools-automated-ssl-tls-config/)

---

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
