---
layout: default
title: "Self Hosted AI Coding Tools That Support Air Gapped"
description: "A practical comparison of self-hosted AI coding assistants that work in air-gapped, offline, and secure environments. Find the best tool for disconnected"
date: 2026-03-16
author: "AI Tools Compared"
permalink: /self-hosted-ai-coding-tools-that-support-air-gapped-environm/
reviewed: true
score: 9
categories: [guides]
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
intent-checked: true
---
{% raw %}

Air-gapped environments, systems physically isolated from public networks, are common in defense, finance, healthcare, and critical infrastructure. Developers working in these settings need AI coding assistants that run entirely offline while still offering solid code completion, generation, and refactoring capabilities. Here's a practical comparison of the best options for 2026.

Table of Contents

- [What Makes an AI Coding Tool Work in Air-Gapped Environments](#what-makes-an-ai-coding-tool-work-in-air-gapped-environments)
- [1. Codeium Community Edition](#1-codeium-community-edition)
- [2. Continue.dev with Ollama](#2-continuedev-with-ollama)
- [3. Tabby](#3-tabby)
- [4. LocalAI](#4-localai)
- [5. Cody (Sourcegraph)](#5-cody-sourcegraph)
- [Comparison Summary](#comparison-summary)
- [Practical Recommendations](#practical-recommendations)
- [GPU and Storage Requirements for Air-Gapped Deployments](#gpu-and-storage-requirements-for-air-gapped-deployments)
- [Security Checklist for Air-Gapped Deployments](#security-checklist-for-air-gapped-deployments)
- [Fine-Tuning Models for Your Codebase](#fine-tuning-models-for-your-codebase)
- [Setting Up Secure Air-Gapped Networks](#setting-up-secure-air-gapped-networks)
- [Model Selection for Resource-Constrained Environments](#model-selection-for-resource-constrained-environments)
- [Continuous Model Updates in Air-Gapped Settings](#continuous-model-updates-in-air-gapped-settings)
- [Monitoring AI Tool Performance](#monitoring-ai-tool-performance)
- [Building Your Air-Gapped Development Workflow](#building-your-air-gapped-development-workflow)
- [Compliance and Audit Trails](#compliance-and-audit-trails)

What Makes an AI Coding Tool Work in Air-Gapped Environments

For an AI coding assistant to function in a disconnected environment, it must operate without external API calls and run inference locally using your own GPU or CPU. Key requirements include no outbound network traffic during normal operation, support for local model files (GGUF, GPTQ, or safetensors formats), and reasonable performance on available hardware.

Beyond the basic network requirement, air-gapped deployments introduce additional constraints that many tools do not address out of the box. All model weights must be transferred via approved media, USB drives, internal artifact repositories, or air-gapped package mirrors. The tool must not phone home for license validation, telemetry, or automatic model updates. The setup must also be reproducible: your security team needs to audit the software supply chain before anything enters the secure environment.

A useful checklist before deploying any tool in an air-gapped environment:

- Confirm there are no outbound network calls during normal inference (use `tcpdump` or a network monitoring tool to verify)
- Check whether the tool has an auto-update mechanism and how to disable it
- Verify the Docker image or binary can be downloaded, transferred, and installed without internet access at install time
- Confirm the license model does not require periodic license server validation

The tools below fall into three categories: open-source projects built specifically for local deployment, self-hosted server solutions you can run on your own infrastructure, and established tools with well-documented offline modes.

1. Codeium Community Edition

Codeium offers a community edition that runs completely offline through its local engine. You download the engine binary and configure it to use local models instead of connecting to Codeium's cloud service.

Setup Example:

```bash
Download Codeium local engine
curl -L -o codeium-local.tar.gz https://codeium.com/downloads/codeium-local
tar -xzf codeium-local.tar.gz
./codeium-local serve --model-path ./models/
```

After starting the server, configure your editor to connect to `http://localhost:8080`. Codeium's offline mode provides code completion and generation using 7B parameter models that run on a single GPU.

Simple setup, VS Code compatible, active development
Fewer model options than cloud version, hardware-dependent performance

2. Continue.dev with Ollama

Continue.dev is an open-source AI coding assistant that integrates directly into VS Code and JetBrains IDEs. When paired with Ollama, it runs entirely offline after the initial download. There are no background API calls, no telemetry by default, and no license server dependency, making it a strong choice for regulated environments.

A practical configuration uses two separate models: a larger one for chat and generation, and a smaller, faster model for tab autocomplete.

Setup Example:

```bash
Install Ollama (download binary, transfer via approved media)
curl -fsSL https://ollama.com/install.sh | sh

Pull coding models
ollama pull codellama:13b-instruct
ollama pull deepseek-coder:6.7b

Configure Continue.dev with separate models for chat and autocomplete
cat >> ~/.continue/config.yaml << 'EOF'
models:
  - provider: ollama
    model: codellama:13b-instruct
    api_base: "http://localhost:11434"
    name: "CodeLlama 13B (local)"
tabAutocompleteModel:
  provider: ollama
  model: deepseek-coder:6.7b
  api_base: "http://localhost:11434"
EOF
```

The 13B model handles complex queries while the 6.7B model delivers sub-second completions during typing. For air-gap transfer, download the Ollama binary and model GGUF files on a connected machine, then place model files in `~/.ollama/models/` following Ollama's directory structure.

Full control over model choice, JetBrains and VS Code support, supports fine-tuning, active open-source community
Requires managing two separate components, more configuration than turnkey solutions, no built-in multi-user support

3. Tabby

Tabby is an open-source, self-hosted AI coding assistant built specifically for teams running in secure or disconnected environments. It provides a VS Code-compatible extension, a JetBrains plugin, and a server component that runs entirely on your infrastructure without any cloud dependency.

Setup Example:

```bash
Start Tabby server with GPU acceleration
docker run -d -p 8080:8080 \
  -v tabby_data:/data \
  tabbyai/tabby:latest \
  serve --model Qwen/CodeQwen-7B-Chat --device cuda

CPU-only fallback for environments without GPU
docker run -d -p 8080:8080 \
  -v tabby_data:/data \
  tabbyai/tabby:latest \
  serve --model TabbyML/StarCoder-1B --device cpu

Configure VS Code extension to point to http://localhost:8080
```

Offline model transfer:

```bash
Download model weights on a connected machine
tabby download --model TabbyML/DeepSeek-Coder-6.7B

Transfer the model directory to the air-gapped host
rsync -av ~/.tabby/models/ airgapped-host:/home/user/.tabby/models/
```

For team deployments, a single Tabby server on a dedicated GPU machine serves all developer workstations over the internal network. Tabby's multi-user mode includes authentication, per-user usage tracking, and a web dashboard showing completion counts and model latency metrics.

Purpose-built for offline use, Docker deployment, no cloud dependency, multi-user dashboard
Requires GPU for fast response times on models above 7B parameters, server management overhead

4. LocalAI

LocalAI provides a drop-in replacement for the OpenAI API that runs entirely on your hardware. Any coding tool that supports OpenAI-compatible APIs can use LocalAI as its backend, including Continue.dev, custom scripts, and IDE extensions that allow a configurable endpoint.

Setup Example:

```bash
Run LocalAI with GPU support
docker run -d -p 8080:8080 -v /path/to/models:/models \
  quay.io/go-skynet/local-ai:latest \
  --models-path /models --context-size 4096 --threads 8

Place a pre-downloaded coding model in the models directory
codellama-13b-instruct.Q5_K_M.gguf (approx 9GB, transferred via approved media)

Test the local API
curl http://localhost:8080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "def fibonacci(n):",
    "model": "codellama-13b-instruct.Q5_K_M.gguf",
    "max_tokens": 200,
    "temperature": 0.2
  }'
```

The OpenAI API compatibility means you can configure any tool that accepts a custom base URL without modifying its source code. This makes LocalAI the most versatile option for organizations that have existing OpenAI-compatible integrations they want to migrate to a local backend.

For quantization selection: GGUF files with Q5_K_M quantization offer a good balance between quality and file size. A 13B model at Q5_K_M is approximately 9GB and runs on a single 16GB GPU. A 7B model at Q4_K_M is roughly 4GB for environments with tighter storage or VRAM constraints.

OpenAI API compatible, works with many existing tools without code changes, supports multimodal models, flexible backend (CUDA, Metal, CPU)
More complex configuration than purpose-built tools, requires understanding GGUF quantization levels, no native IDE extension

5. Cody (Sourcegraph)

Cody from Sourcegraph offers a self-hosted option for enterprise environments. The self-hosted version runs entirely on your infrastructure with local embeddings for context-aware autocomplete.

Setup Example:

```bash
Deploy Cody self-hosted
kubectl apply -f https://github.com/sourcegraph/cody/blob/main/deploy/k8s/self-hosted.yaml

Configure authentication
cody config set auth --provider github \
  --client-id $GITHUB_CLIENT_ID \
  --client-secret $GITHUB_CLIENT_SECRET
```

Enterprise features, strong codebase analysis, full data control
Requires Sourcegraph infrastructure, aimed at teams, heavier setup

Comparison Summary

| Tool | Offline Mode | Model Control | Setup Difficulty | Best For |
|------|--------------|---------------|------------------|----------|
| Codeium CE | Native | Limited | Easy | VS Code users wanting quick offline setup |
| Continue + Ollama | Yes | Full | Medium | Developers wanting flexibility and control |
| Tabby | Yes | Moderate | Easy | Teams wanting a purpose-built solution |
| LocalAI | Yes | Full | Hard | Advanced users building custom toolchains |
| Cody (Self-Hosted) | Yes | Enterprise | Hard | Large organizations needing codebase analysis |

Practical Recommendations

For a single developer working on a laptop with discrete GPU, Continue.dev combined with Ollama offers the simplest path to offline AI assistance. The setup takes under 30 minutes and provides a good balance of capability and ease of use.

For teams that need enterprise-grade features without internet connectivity, Tabby provides the best balance. The Docker-based deployment simplifies management while the purpose-built design handles offline scenarios natively.

If you already run Sourcegraph for code intelligence in your organization, extending to Cody self-hosted makes natural sense. The integration between code search and AI assistance is valuable for large codebases.

GPU and Storage Requirements for Air-Gapped Deployments

All these tools perform significantly better with a dedicated GPU. An NVIDIA RTX 3060 (12GB VRAM) handles 7B parameter models comfortably for single-user scenarios. For 13B models, a RTX 4090 (24GB VRAM) or RTX 3090 provides enough headroom. For multi-user team deployments serving 10 or more developers simultaneously, consider server-class hardware: an A10G (24GB) handles concurrent 7B model requests well, and an A100 (40GB or 80GB) supports larger 34B models.

Running on CPU alone is viable for smaller 1B, 3B parameter models like TabbyML/StarCoder-1B, but expect 3, 8 second completion latency rather than sub-second responses. For developers who need responsive inline completions, GPU access is effectively a requirement for models above 3B parameters.

For storage planning: a 7B model at GGUF Q5_K_M is roughly 5GB; a 13B model is approximately 9GB; a 34B model is around 22GB. Budget additional space for model metadata and vector embeddings if using codebase indexing features. When transferring models via portable media, verify file integrity with SHA256 checksums before deployment.

Security Checklist for Air-Gapped Deployments

Before going live, verify the following for each tool:

- Run `tcpdump -i any port not 8080` during normal inference to confirm no unexpected outbound connections
- Disable automatic update checks (`OLLAMA_UPDATE_CHECK=false` for Ollama; Tabby makes no update calls when serving pre-downloaded models)
- Scan container images with Grype or Trivy using an offline vulnerability database downloaded before air-gapping
- Pin all Docker image versions to specific digest hashes rather than `latest` tags
- Store model files in an internal artifact repository (Nexus or Artifactory) rather than on individual developer machines

Fine-Tuning Models for Your Codebase

Air-gapped environments allow you to fine-tune models on your proprietary code without exposing it to external services. This improves model output quality significantly:

```bash
Fine-tune a code model on your codebase
ollama create custom-codellama --base codellama:7b --train ./training-data.txt

Or use LM Studio's fine-tuning interface
1. Load base model (CodeQwen-7B, CodeLlama, etc.)
2. Provide training examples from your codebase
3. Run fine-tuning (GPU-accelerated)
4. Save output model for continued development

The result: AI assistance tuned to your coding patterns
Including your framework patterns, naming conventions, and architectural styles
```

Fine-tuned models understand your specific tech stack better than general-purpose models, producing more relevant suggestions.

Setting Up Secure Air-Gapped Networks

For government, military, or highly sensitive environments, implement additional security controls:

```bash
Network isolation verification
1. No outbound traffic from development machines
iptables -L OUTPUT | grep REJECT

2. Verify all AI tools run locally
netstat -tulpn | grep -E "ollama|tabby|continue"

3. Implement host-based firewall
ufw status
ufw allow 8080  # Only internal AI service
ufw deny out any

4. Audit all network connections
tcpdump -i eth0 -w traffic.pcap
Should show only internal traffic, no external connections

5. Verify no DNS lookups to external services
grep "external.domain" /var/log/syslog
Should return nothing
```

Model Selection for Resource-Constrained Environments

Smaller models work better in air-gapped environments where hardware might be limited:

| Model | Size | VRAM | Performance | Code Quality |
|-------|------|------|-------------|--------------|
| CodeQwen-1.5B | 1.5B | 4GB | Fast | Acceptable |
| CodeLlama-7B | 7B | 12GB | Good | Very Good |
| StarCoder-15B | 15B | 24GB | Better | Excellent |
| WizardCoder-34B | 34B | 48GB+ | Best | Best |

Start with 7B parameter models for single-user scenarios. Scale to larger models only if your hardware supports it and you need better output quality.

Continuous Model Updates in Air-Gapped Settings

Even in offline environments, you can benefit from model improvements:

```bash
Pre-download new model versions on a connected machine
(external network)
ollama pull codellama:latest
tar czf codellama-latest.tar.gz ~/.ollama/

Transfer to air-gapped environment via secure channel
(USB drive, secure network transfer, etc.)
scp -i privkey codellama-latest.tar.gz user@airgapped-host:~/

On air-gapped machine
tar xzf codellama-latest.tar.gz -C ~/.ollama/
ollama serve  # Now uses latest model

Set up automated download mechanism for new models quarterly
Use secure channels only (never cloud connectivity)
```

Monitoring AI Tool Performance

Track performance metrics in your air-gapped environment:

```python
Monitor tool usage and performance
import time
import json
from pathlib import Path

class AIToolMetrics:
    def __init__(self):
        self.metrics = []

    def log_completion(self, model, prompt_length, completion_time, tokens):
        self.metrics.append({
            "timestamp": time.time(),
            "model": model,
            "prompt_tokens": prompt_length,
            "completion_time_ms": completion_time * 1000,
            "generated_tokens": tokens,
            "throughput_tokens_per_sec": tokens / completion_time
        })

    def save_metrics(self):
        with open("ai_tool_metrics.json", "w") as f:
            json.dump(self.metrics, f, indent=2)

    def analyze_performance(self):
        avg_time = sum(m["completion_time_ms"] for m in self.metrics) / len(self.metrics)
        avg_throughput = sum(m["throughput_tokens_per_sec"] for m in self.metrics) / len(self.metrics)
        print(f"Avg completion time: {avg_time:.0f}ms")
        print(f"Avg throughput: {avg_throughput:.1f} tokens/sec")

Usage in your IDE or CLI
metrics = AIToolMetrics()
[Log completions as they happen]
metrics.save_metrics()
metrics.analyze_performance()
```

Identifying bottlenecks helps you optimize your setup over time.

Building Your Air-Gapped Development Workflow

Establish a complete offline development workflow:

```bash
1. Initialize air-gapped development environment
docker pull python:3.11
docker run -d --name dev-box -v /code:/workspace python:3.11 sleep infinity

2. Start AI assistance services
ollama serve --models-dir /workspace/.ollama &
continue-dev --port 8080 &
tabby serve --port 8081 &

3. Configure your editor
.vscode/settings.json
{
  "copilot.enabled": false,
  "[python]": {
    "defaultInterpreterPath": "/usr/local/bin/python"
  },
  "continue.serverUrl": "http://localhost:8080"
}

4. All development happens locally
No external API calls, no cloud sync, full data control

5. Periodic backups of generated code
rsync -av /workspace /backup/workspace_$(date +%Y%m%d)
```

Compliance and Audit Trails

Air-gapped AI tools simplify compliance requirements. All code stays internal, all processing is local, and audit trails exist entirely within your infrastructure:

```bash
Generate compliance report
echo "=== AI Tool Usage Audit ===" > audit_report.txt
echo "Date: $(date)" >> audit_report.txt
echo "Tools in use:" >> audit_report.txt

ollama list >> audit_report.txt 2>&1
continue-dev --version >> audit_report.txt 2>&1
tabby --version >> audit_report.txt 2>&1

echo "Network access violations: $(tcpdump -r traffic.pcap | grep -c 'external')" >> audit_report.txt

echo "Code files processed: $(find /workspace -name "*.py" -o -name "*.ts" | wc -l)" >> audit_report.txt
echo "All processing: LOCAL ONLY" >> audit_report.txt

Submit compliance report to your organization
```

This type of audit trail helps satisfy security and compliance requirements that cloud-based tools cannot meet.

Related Articles

- [AI Tools for Self Service Support Portals: Practical Guide](/ai-tools-for-self-service-support-portals/)
- [Free AI Coding Tools That Work Offline Without Internet](/free-ai-coding-tools-that-work-offline-without-internet/)
- [How to Create Custom Instructions for AI Coding Tools That](/how-to-create-custom-instructions-for-ai-coding-tools-that-e/)
- [Best Air Gapped AI Code Completion Solutions for Offline](/best-air-gapped-ai-code-completion-solutions-for-offline-dev/)

For organizations with strict compliance requirements, air-gapped AI tools provide the only viable path to AI-assisted development without creating security or regulatory risks.

Built by theluckystrike. More at [zovo.one](https://zovo.one)

Frequently Asked Questions

Who is this article written for?

This article is written for developers, technical professionals, and power users who want practical guidance. Whether you are evaluating options or implementing a solution, the information here focuses on real-world applicability rather than theoretical overviews.

How current is the information in this article?

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Always verify specific feature availability and pricing directly on the official website before making purchasing decisions.

Are there free alternatives available?

Free alternatives exist for most tool categories, though they typically come with limitations on features, usage volume, or support. Open-source options can fill some gaps if you are willing to handle setup and maintenance yourself. Evaluate whether the time savings from a paid tool justify the cost for your situation.

How do I get started quickly?

Pick one tool from the options discussed and sign up for a free trial. Spend 30 minutes on a real task from your daily work rather than running through tutorials. Real usage reveals fit faster than feature comparisons.

What is the learning curve like?

Most tools discussed here can be used productively within a few hours. Mastering advanced features takes 1-2 weeks of regular use. Focus on the 20% of features that cover 80% of your needs first, then explore advanced capabilities as specific needs arise.

{% endraw %}
