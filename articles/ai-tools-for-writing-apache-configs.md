---
layout: default
title: "Best AI Tools for Writing Apache Configs"
description: "Compare Claude, GPT-4, and Copilot for generating Apache httpd VirtualHost configs, .htaccess rules, mod_rewrite, SSL, and security headers with examples"
date: 2026-03-22
author: theluckystrike
permalink: /ai-tools-for-writing-apache-configs/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Apache httpd configuration is notoriously verbose and error-prone. Getting VirtualHost configs, mod_rewrite rules, SSL settings, and security headers right requires memorizing obscure directives. AI tools dramatically reduce the lookup time. but accuracy varies. This guide tests Claude, GPT-4, and Copilot on real Apache configuration tasks.

Task 1 - HTTPS VirtualHost with HTTP Redirect

Prompt - "Write an Apache httpd config for example.com that redirects HTTP to HTTPS, serves from /var/www/example.com, enables PHP-FPM via proxy, and sets modern TLS settings."

Claude's output:

```apache
/etc/apache2/sites-available/example.com.conf

HTTP → HTTPS redirect
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Redirect all HTTP traffic to HTTPS
    RewriteEngine On
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

HTTPS VirtualHost
<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/example.com/public

    # SSL Configuration
    SSLEngine On
    SSLCertificateFile      /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/example.com/privkey.pem

    # Modern TLS. TLS 1.2+ only, strong ciphers
    SSLProtocol             -all +TLSv1.2 +TLSv1.3
    SSLCipherSuite          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:\
                            ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:\
                            ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:\
                            DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder     Off
    SSLSessionTickets       Off

    # PHP-FPM via Unix socket proxy
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.2-fpm.sock|fcgi://localhost"
    </FilesMatch>

    # Security headers
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"

    # Directory configuration
    <Directory /var/www/example.com/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Deny access to hidden files
    <FilesMatch "^\.">
        Require all denied
    </FilesMatch>

    ErrorLog  ${APACHE_LOG_DIR}/example.com-error.log
    CustomLog ${APACHE_LOG_DIR}/example.com-access.log combined
</VirtualHost>
```

Claude includes PHP-FPM via Unix socket (faster than TCP), correct HSTS with preload, disables directory listing, and uses the `SSLHonorCipherOrder Off` setting required for TLS 1.3 forward secrecy. GPT-4 produces similar output but sometimes uses `ProxyPassMatch` instead of the `SetHandler` approach, which is less efficient.

Task 2 - mod_rewrite for SPA Routing

Single-page applications need all routes to serve `index.html`:

Prompt - "Write Apache mod_rewrite rules for a React SPA at /var/www/app. Serve index.html for all routes except actual files and API calls under /api/."

Claude's .htaccess:

```apache
/var/www/app/public/.htaccess
Options -MultiViews
RewriteEngine On
RewriteBase /

Don't rewrite actual files or directories
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

Don't rewrite API calls
RewriteCond %{REQUEST_URI} ^/api/ [NC]
RewriteRule ^ - [L]

Serve index.html for everything else (SPA routing)
RewriteRule ^ index.html [L]
```

GPT-4's version often includes `RewriteRule ^ /index.html [L]` with the leading slash, which causes an infinite redirect loop in some Apache configurations. Claude correctly omits the leading slash in the target.

Task 3 - Reverse Proxy with Load Balancing

Prompt - "Configure Apache as a reverse proxy load balancer for 3 Node.js backend servers (ports 3001, 3002, 3003). Use leastconn balancing, health checks, and sticky sessions."

Claude:

```apache
/etc/apache2/sites-available/loadbalancer.conf

Load balancing modules required:
a2enmod proxy proxy_http proxy_balancer lbmethod_byleastconn headers

<VirtualHost *:443>
    ServerName api.example.com

    SSLEngine On
    SSLCertificateFile    /etc/letsencrypt/live/api.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/api.example.com/privkey.pem

    # Define the load balancer cluster
    <Proxy "balancer://nodejs_cluster">
        BalancerMember http://127.0.0.1:3001 route=node1
        BalancerMember http://127.0.0.1:3002 route=node2
        BalancerMember http://127.0.0.1:3003 route=node3

        # Least connections balancing
        ProxySet lbmethod=byleastconn

        # Health check: probe every 5s, mark down after 2 failures
        ProxySet nofailover=Off
        BalancerMember http://127.0.0.1:3001 status=+H ping=5
        BalancerMember http://127.0.0.1:3002 status=+H ping=5
        BalancerMember http://127.0.0.1:3003 status=+H ping=5
    </Proxy>

    # Sticky sessions via cookie
    Header add Set-Cookie "ROUTEID=.%{BALANCER_WORKER_ROUTE}e; path=/" env=BALANCER_ROUTE_CHANGED

    ProxyPass        / balancer://nodejs_cluster/ stickysession=ROUTEID|.routeid nofailover=Off
    ProxyPassReverse / balancer://nodejs_cluster/

    # Pass real client IP
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"

    ErrorLog  ${APACHE_LOG_DIR}/lb-error.log
    CustomLog ${APACHE_LOG_DIR}/lb-access.log combined
</VirtualHost>
```

Task 4 - Security Headers and CSP

Prompt - "Generate Apache security headers for a banking application. Include strict CSP, HSTS, and disable all unsafe methods."

Claude:

```apache
Security headers module. requires: a2enmod headers

<IfModule mod_headers.c>
    # Strict Transport Security (2 years + preload)
    Header always set Strict-Transport-Security \
        "max-age=63072000; includeSubDomains; preload"

    # Content Security Policy. strict mode for financial app
    Header always set Content-Security-Policy \
        "default-src 'none'; \
         script-src 'self' 'nonce-{NONCE}'; \
         style-src 'self' 'nonce-{NONCE}'; \
         img-src 'self' data: https:; \
         font-src 'self'; \
         connect-src 'self' https://api.example.com; \
         frame-ancestors 'none'; \
         form-action 'self'; \
         base-uri 'self'; \
         upgrade-insecure-requests"

    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set Referrer-Policy "no-referrer"
    Header always set Cross-Origin-Opener-Policy "same-origin"
    Header always set Cross-Origin-Embedder-Policy "require-corp"
    Header always set Cross-Origin-Resource-Policy "same-origin"

    # Remove server information headers
    Header always unset X-Powered-By
    Header always unset Server
    ServerTokens Prod
    ServerSignature Off
</IfModule>

Disable unsafe HTTP methods
<LimitExcept GET POST PUT PATCH DELETE OPTIONS HEAD>
    Require all denied
</LimitExcept>
```

Claude notes that the CSP nonce requires server-side generation and suggests a PHP snippet or Apache module for dynamic nonce injection.

Task 5 - Rate Limiting and IP-Based Access Control

A common need for APIs and admin panels: rate limiting by IP using `mod_ratelimit` and `mod_evasive`, plus granular IP-based access control.

Prompt - "Configure Apache to rate limit the /api/ endpoint to 100 req/s per IP, block known bad IPs, and allow the /admin/ path only from a specific subnet."

Claude:

```apache
Rate limiting. requires - a2enmod ratelimit

<Location /api/>
    # Limit response rate to 100KB/s per connection (mod_ratelimit)
    SetOutputFilter RATE_LIMIT
    SetEnv rate-limit 100

    # mod_evasive settings (if installed)
    DOSHashTableSize    3097
    DOSPageCount        10
    DOSSiteCount        100
    DOSPageInterval     1
    DOSSiteInterval     1
    DOSBlockingPeriod   60
</Location>

IP allowlist for admin panel. only internal subnet + VPN
<Location /admin/>
    Require ip 10.0.0.0/8
    Require ip 192.168.1.0/24
    Require ip 203.0.113.42    # ops workstation static IP
</Location>

Blocklist specific IPs (load from file for large lists)
<RequireAll>
    Require all granted
    Require not ip 198.51.100.1
    Require not ip 198.51.100.2
</RequireAll>
```

For large blocklists (thousands of IPs), Claude recommends using `mod_authz_host` with an external file or switching to fail2ban integration rather than inline Apache config, which would become unmanageable.

GPT-4 produces similar rate limiting config but sometimes uses the deprecated `mod_bandwidth` or forgets to mention the `a2enmod` commands needed to activate modules.

Task 6 - .htaccess for WordPress Multisite

WordPress Multisite has specific rewrite requirements that differ from single-site WordPress. This is a common source of AI config errors.

Prompt - "Write .htaccess rules for WordPress Multisite in subdirectory mode."

Claude's output:

```apache
WordPress Multisite. subdirectory mode
/var/www/wordpress/.htaccess

Protect wp-config.php
<Files wp-config.php>
    Require all denied
</Files>

Protect .htaccess itself
<Files .htaccess>
    Require all denied
</Files>

Options -Indexes

BEGIN WordPress Multisite
RewriteEngine On
RewriteBase /
RewriteRule ^index\.php$ - [L]

Uploaded files. must come before the main WP rules
RewriteRule ^([_0-9a-zA-Z-]+/)?files/(.+) wp-includes/ms-files.php?file=$2 [L]

Add trailing slash to /wp-admin
RewriteRule ^([_0-9a-zA-Z-]+/)?wp-admin$ $1wp-admin/ [R=301,L]

Don't rewrite real files or directories
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

Rewrite network subsites
RewriteRule ^([_0-9a-zA-Z-]+/)?(wp-(content|admin|includes).*) $2 [L]
RewriteRule ^([_0-9a-zA-Z-]+/)?(.*\.php)$ $2 [L]

Route everything else through index.php
RewriteRule . index.php [L]
END WordPress Multisite
```

GPT-4 often generates the single-site WordPress rules and misses the `ms-files.php` upload handling rule, which breaks media uploads on subsites.

Tool Comparison

| Task | Claude | GPT-4 | Copilot |
|---|---|---|---|
| VirtualHost SSL config | Excellent. correct TLS settings | Good | Weak |
| mod_rewrite for SPA | Correct (no leading slash bug) | Sometimes buggy | No |
| Load balancer config | Excellent. leastconn, health checks | Good | No |
| Security headers | Excellent. COEP/COOP included | Good | No |
| Rate limiting config | Strong. recommends fail2ban for scale | Good | No |
| WordPress Multisite | Includes ms-files.php rule | Misses multisite rules | No |
| .htaccess password protection | Strong | Strong | Moderate |
| mod_wsgi for Python | Strong | Strong | No |

Module Activation Cheat Sheet

One consistently useful pattern - Claude always includes the `a2enmod` commands needed to activate referenced modules. Both GPT-4 and Copilot sometimes skip this, leaving you with configs that silently do nothing because the module isn't loaded.

```bash
Enable all modules referenced in this guide
sudo a2enmod rewrite ssl headers proxy proxy_http proxy_balancer \
             lbmethod_byleastconn ratelimit

Verify modules are loaded
apache2ctl -M | sort

Test config before reloading
apache2ctl configtest

Reload without dropping connections
sudo systemctl reload apache2
```

Related Reading

- [Best AI Tools for Writing Vagrant Configs](/ai-tools-for-writing-vagrant-configs/)
- [Best AI Tools for Writing Caddy Configs](/ai-tools-for-writing-caddy-configs/)
- [AI Tools for Automated SSL/TLS Configuration](/ai-tools-automated-ssl-tls-config/)
- [AI Assistants for Writing Correct AWS IAM Policies](/ai-assistants-for-writing-correct-aws-iam-policies-with-least-privilege/)

---

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
