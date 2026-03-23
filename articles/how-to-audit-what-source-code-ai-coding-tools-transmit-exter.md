---
layout: default
title: "How to Audit What Source Code AI Coding Tools Transmit"
description: "When you use AI coding tools like GitHub Copilot, Cursor, or Claude Code, your source code often gets transmitted to external servers for processing"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-audit-what-source-code-ai-coding-tools-transmit-externally/
categories: [guides]
tags: [ai-tools-compared, privacy, security, tools, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

When you use AI coding tools like GitHub Copilot, Cursor, or Claude Code, your source code often gets transmitted to external servers for processing. Understanding what leaves your machine is essential for protecting proprietary code, meeting compliance requirements, and making informed decisions about your development environment.

This guide covers practical methods to audit and monitor network traffic from AI coding tools, giving you visibility into exactly what data gets transmitted.

# Install mitmproxy
pip install mitmproxy

# Start the proxy on port 8080
mitmproxy -p 8080
```

Configure your system or IDE to use `127.0.0.1:8080` as the HTTP proxy.
- **For a simpler approach**: use the mitmweb interface:

```bash
mitmweb -p 8080
```

This opens a web interface at `http://127.0.0.1:8081` where you can browse captured requests.
- **Use mitmproxy to inspect**: specific request payloads 3.
- **The cloud-enhanced tier sends**: snippets for server-side inference, making Tabnine's free tier uniquely private among completion tools.
- **When you use AI**: coding tools like GitHub Copilot, Cursor, or Claude Code, your source code often gets transmitted to external servers for processing.

## Why Auditing AI Coding Tool Traffic Matters

Developers frequently work with proprietary algorithms, internal APIs, trade secrets, and customer data. AI coding assistants can inadvertently transmit this sensitive information to third-party servers, creating security and compliance risks. Industries like finance, healthcare, and government have strict regulations about where code can travel.

Beyond compliance, auditing helps you understand the behavior of AI tools. Different tools handle context windows, code uploads, and telemetry differently. By monitoring traffic, you can choose tools that align with your privacy requirements.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Method 1: Network Traffic Monitoring with HTTP Debugging Tools

The most direct approach is intercepting HTTP/HTTPS traffic from your IDE or terminal. Tools like mitmproxy, Charles Proxy, or Wireshark let you inspect requests in real time.

### Setting Up mitmproxy

mitmproxy creates a local proxy server that captures all HTTP/HTTPS traffic. Here's how to use it:

```bash
# Install mitmproxy
pip install mitmproxy

# Start the proxy on port 8080
mitmproxy -p 8080
```

Configure your system or IDE to use `127.0.0.1:8080` as the HTTP proxy. For HTTPS inspection, you'll need to install the mitmproxy CA certificate on your system.

For a simpler approach, use the mitmweb interface:

```bash
mitmweb -p 8080
```

This opens a web interface at `http://127.0.0.1:8081` where you can browse captured requests.

### Capturing AI Tool Traffic

Start mitmproxy, then launch your AI coding tool. Watch for requests to domains like:

- `api.github.com` (Copilot)

- `api.anthropic.com` (Claude-based tools)

- `api.openai.com` (OpenAI models)

- `api.codeium.com` (Codeium)

- Vendor-specific endpoints

Each request body typically contains snippets of your code, file paths, and context. You'll see exactly what gets sent alongside prompts.

### Step 2: Method 2: Using strace for System Call Monitoring

On Linux, `strace` traces system calls made by a process. This works even for encrypted traffic, showing you when and where connections are made.

```bash
# Trace network-related system calls for a process
strace -e trace=network -f -p <PID> 2>&1 | grep -E "(connect|sendto)"

# Save full output to a file
strace -e trace=network -f -o /tmp/ai-tool-trace.txt -p <PID>
```

For a new process:

```bash
strace -e trace=network -f -o /tmp/cursor-trace.txt cursor
```

Look for connect calls to external IP addresses. This reveals all network destinations, even if the traffic is encrypted.

### Step 3: Method 3: Local DNS Logging

Every external connection starts with a DNS query. Logging DNS requests shows which domains your AI tools contact without inspecting encrypted traffic.

### Using dnsmasq for Logging

Configure dnsmasq as your local DNS server with query logging:

```conf
# /etc/dnsmasq.conf
log-queries
log-facility=/var/log/dnsmasq.log
```

Restart dnsmasq and set your machine's DNS to `127.0.0.1`. All DNS queries get logged with timestamps.

### Quick DNS Check with tcpdump

```bash
# Capture DNS queries on port 53
sudo tcpdump -i any -n port 53 -c 100
```

Run this while using your AI coding tool. You'll see every domain being resolved, giving you a list of external services.

### Step 4: Method 4: Inspecting Claude Code and Similar Tools

Claude Code and similar agents often run as CLI tools or desktop applications. They typically have configuration files or verbose modes that reveal behavior.

### Enabling Verbose Logging

Many CLI tools support verbose output:

```bash
# Claude Code verbose mode (if available)
claude --verbose chat

# Check environment variables
env | grep -i claude
env | grep -i anthropic
```

### Examining Configuration Files

AI tools store configuration in standard locations:

```bash
# Find Claude Code config
ls ~/.config/claude/
ls ~/Library/Application\ Support/Claude/

# Check for telemetry settings
cat ~/.config/claude/settings.json | grep -i telemetry
```

Look for options to disable telemetry or limit data transmission.

### Step 5: Method 5: Firewall-Based Blocking and Monitoring

Create explicit firewall rules to monitor or block specific connections.

### Using pfctl on macOS

```bash
# Create a simple rule to log connections to specific domains
echo "block drop log all proto tcp to any port 443 domain ai-tool.com" | sudo pfctl -f -
```

### Using iptables on Linux

```bash
# Log connections to specific IPs
sudo iptables -A OUTPUT -p tcp -d 140.82.121.6 -j LOG --log-prefix "COPILOT: "
```

Review logs with:

```bash
sudo journalctl -f | grep "COPILOT"
```

### Step 6: Practical Audit Workflow

Combine these methods for visibility:

1. **Start with DNS logging** to identify all contacted domains

2. **Use mitmproxy** to inspect specific request payloads

3. **Run strace** on new or suspicious processes

4. **Review tool configuration** for privacy settings

5. **Create firewall rules** to block or alert on specific connections

### Step 7: What to Look For

When auditing, pay attention to:

- Full code uploads: Some tools send entire files rather than snippets

- File paths: Paths may reveal project structure and naming conventions

- Context accumulation: Some tools maintain conversation history that grows over time

- Telemetry: Background analytics may transmit usage patterns

- Third-party services: Check for requests to analytics or logging services

### Step 8: What Each Major Tool Actually Transmits

Understanding the documented behavior of popular tools helps set expectations before you audit:

**GitHub Copilot** transmits the current file, a few adjacent files it selects automatically, and your cursor position. The extension sends roughly 2,000-6,000 tokens of surrounding context per completion request.

**Cursor** transmits file contents to Anthropic or OpenAI APIs depending on which model you select. Cursor's privacy mode reduces context sent to the active file only. Without it, Cursor can include files from your codebase based on semantic similarity to the current task.

**Claude Code** transmits the content you explicitly share plus files you reference with @ mentions. It also collects anonymized usage analytics unless you opt out via `claude config set telemetry false`.

**Codeium** transmits code snippets to its own servers for completion. The free tier allows code to be used to improve the model. Enterprise plans include a data privacy agreement preventing training on your code.

**Tabnine** on its free tier runs the basic model locally — no code leaves your machine. The cloud-enhanced tier sends snippets for server-side inference, making Tabnine's free tier uniquely private among completion tools.

### Step 9: Tool-Specific Audit Commands

Each tool exposes different hooks for monitoring:

```bash
# For GitHub Copilot — check VS Code extension logs
code --log debug 2>&1 | grep -i copilot | grep -i request

# For Claude Code — enable request logging
ANTHROPIC_LOG=debug claude chat 2>&1 | grep -E "(POST|payload|tokens)"

# For Cursor — check its local log directory
ls ~/Library/Logs/Cursor/
tail -f ~/Library/Logs/Cursor/main.log | grep -i api

# For Codeium — inspect VS Code output panel
# In VS Code: Cmd+Shift+U -> select "Codeium" from dropdown
```

For a tool-agnostic approach, mitmproxy with a custom script captures and logs all outbound requests:

```python
# mitmproxy_ai_logger.py
from mitmproxy import http
import json, time

AI_DOMAINS = [
 "api.anthropic.com", "api.openai.com", "api.github.com",
 "api.codeium.com", "copilot-proxy.githubusercontent.com",
]

def request(flow: http.HTTPFlow) -> None:
 host = flow.request.pretty_host
 if any(domain in host for domain in AI_DOMAINS):
 ts = time.strftime("%H:%M:%S")
 print(f"[{ts}] {flow.request.method} {host} ({len(flow.request.content)}b)")
 try:
 body = json.loads(flow.request.content)
 if "messages" in body:
 for msg in body["messages"]:
 preview = str(msg.get("content", ""))[:150]
 print(f" >> {preview}...")
 except Exception:
 pass
```

Run with: `mitmproxy -s mitmproxy_ai_logger.py -p 8080`

### Step 10: Create a Data Transmission Baseline

Before you can detect anomalies, establish a baseline. Spend 30 minutes coding normally while capturing all traffic, then analyze what was sent:

```bash
# Capture a coding session
mitmweb -p 8080 --save-stream-file ai-session.mitm

# Export and count code fragments transmitted
mitmdump -r ai-session.mitm -w - | strings | grep -E "[a-zA-Z]{20,}" > code-fragments.txt
wc -l code-fragments.txt
```

Compare the fragment count against the number of completions triggered. A ratio above 3:1 suggests the tool is sending substantial context beyond each immediate request.

### Step 11: Reducing Transmitted Data

After auditing, consider these mitigation strategies:

- Use local-only AI models when available (Tabnine free tier, Continue + Ollama, Aider with local models)

- Configure context windows to limit uploaded code — Cursor's privacy mode restricts to the active file

- Disable telemetry in tool settings — Claude Code: `claude config set telemetry false`; Copilot: disable in VS Code settings under `github.copilot.telemetry.enabled`

- Use network isolation for sensitive repositories — create a firewall rule that blocks AI tool domains for specific project directories

- Review and rotate API keys quarterly if using direct integrations

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Frequently Asked Questions

**How long does it take to audit what source code ai coding tools transmit?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Can I adapt this for a different tech stack?**

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

## Related Articles

- [What Source Code Context Window Do Different AI Coding Tools](/what-source-code-context-window-do-different-ai-coding-tools/)
- [Copilot Code Referencing Feature: How It Handles Open Source](/copilot-code-referencing-feature-how-it-handles-open-source-/)
- [Fine Tune Open Source Code Models for Your Codebase](/fine-tune-open-source-code-models-for-your-codebase-2026/)
- [AI Audit Trail and Evidence Collection Tools](/ai-audit-trail-and-evidence-collection-tools-2026/)
- [Best AI Tool for Auditors: Audit Report Generation Compared](/best-ai-tool-for-auditors-audit-report-generation/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
```
{% endraw %}
