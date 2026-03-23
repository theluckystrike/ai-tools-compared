---
layout: default
title: "Open Source AI Code Completion for Neovim Without Cloud API"
description: "A practical comparison of self-hosted AI code completion solutions for Neovim that work entirely offline without requiring cloud API keys."
date: 2026-03-16
author: "AI Tools Compared"
permalink: /open-source-ai-code-completion-for-neovim-without-cloud-api-/
reviewed: true
score: 9
categories: [guides]
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence, api]
intent-checked: true
---
{% raw %}

If you use Neovim as your primary editor, you have likely explored ways to integrate AI-powered code completion. Many developers turn to cloud-based solutions like GitHub Copilot, but these require API keys, subscriptions, and an internet connection. For privacy-conscious developers, teams working in secure environments, or anyone wanting to avoid recurring costs, self-hosted alternatives offer a compelling path forward.

This article compares the leading open-source AI code completion tools for Neovim that run locally without cloud API dependencies. Each solution has distinct trade-offs in setup complexity, model quality, and resource requirements.

## Table of Contents

- [Why Skip Cloud API Keys?](#why-skip-cloud-api-keys)
- [CodeLLama (via Ollama)](#codellama-via-ollama)
- [CodeGeex](#codegeex)
- [CodeGen (Salesforce)](#codegen-salesforce)
- [StarCoder](#starcoder)
- [Qwen2.5-Coder](#qwen25-coder)
- [Neovim Plugins Purpose-Built for Local Completion](#neovim-plugins-purpose-built-for-local-completion)
- [Comparing the Options](#comparing-the-options)
- [Hardware Considerations](#hardware-considerations)
- [Performance Tips](#performance-tips)
- [Advanced Configuration: Building a Production Setup](#advanced-configuration-building-a-production-setup)
- [Model Selection for Different Languages](#model-selection-for-different-languages)
- [Benchmarking Your Setup](#benchmarking-your-setup)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Integration with Other Tools](#integration-with-other-tools)

## Why Skip Cloud API Keys?

Cloud-based AI code completion services send your code to external servers. This raises legitimate concerns around data privacy, especially when working with proprietary codebases. Additionally, reliance on external services means your completion workflow depends on internet connectivity and service availability.

Running AI code completion locally gives you complete control over your data. You can use the tools on airplanes, in secure facilities, or in regions with limited internet access. The upfront investment in hardware and setup pays off over time with no per-token costs.

## CodeLLama (via Ollama)

Ollama has become the simplest way to run large language models locally. It supports CodeLLama, a model specifically designed for code generation and completion.

### Setup

First, install Ollama on your system:

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

Pull the CodeLLama model:

```bash
ollama pull codellama
```

### Neovim Integration

Use the `completor` plugin or configure `nvim-cmp` with a custom source. Here is a basic setup using `nvim-cmp`:

```lua
-- ~/.config/nvim/lua/plugins/cmp.lua
return {
  "hrsh7th/nvim-cmp",
  dependencies = { "hrsh7th/cmp-ollama" },
  config = function()
    local cmp = require("cmp")
    cmp.setup({
      sources = cmp.config.sources({
        { name = "ollama" },
      }),
    })
  end,
}
```

You will need to configure the Ollama endpoint and model in your setup. This approach provides completions from a model running entirely on your machine.

## CodeGeex

CodeGeex is an open-source code generation model maintained by the THUDM research group. It specializes in code completion and supports multiple programming languages.

### Installation

CodeGeex can be deployed as a local server using the official implementation:

```bash
git clone https://github.com/THUDM/CodeGeeX
cd CodeGeeX
pip install -r requirements.txt
```

Run the server locally:

```bash
python codegeex/benchmark/api.py --port 8080
```

### Neovim Integration

Connect Neovim using a custom completion source. You can use `vim-go` or write a simple Python script that interfaces with the API:

```lua
-- Simple example using an HTTP request
local function get_completion(prompt)
  local http = require("socket.http")
  local json = require("cjson")

  local response = {}
  local body = json.encode({
    prompt = prompt,
    max_length = 256,
  })

  local result = http.request({
    url = "http://localhost:8080/completions",
    method = "POST",
    headers = {
      ["Content-Type"] = "application/json",
      ["Content-Length"] = #body,
    },
    source = ltn12.source.string(body),
    sink = ltn12.sink.table(response),
  })

  return table.concat(response)
end
```

This requires additional Lua dependencies, but demonstrates the core approach.

## CodeGen (Salesforce)

CodeGen was developed by Salesforce Research and is available in multiple sizes. The model excels at code generation tasks and can run locally through various frameworks.

### Running with Hugging Face Transformers

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_name = "Salesforce/codegen-2b-mono"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

def complete_code(prompt):
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(**inputs, max_new_tokens=50)
    return tokenizer.decode(outputs[0])
```

For Neovim integration, wrap this Python script in a VimEx command or use the `completor` framework to create a custom source.

## StarCoder

StarCoder is a code-focused language model developed by BigCode. It was trained on permissively licensed code from GitHub, making it a responsible choice for commercial projects.

### Quick Start with llama.cpp

For running StarCoder efficiently on consumer hardware, use the quantized version with llama.cpp:

```bash
# Download the quantized StarCoder model
wget https://huggingface.co/TheBloke/StarCoder-GGML/resolve/main/starcoder-q4_0.gguf

# Run with llama.cpp
./main -m starcoder-q4_0.gguf --n-gpu-layers 1 -c 2048
```

Configure your Neovim completion plugin to query this local endpoint. The setup requires more configuration than Ollama but provides more control over the model behavior.

## Qwen2.5-Coder

Qwen2.5-Coder (from Alibaba's Qwen team) emerged as a strong contender in late 2025. The 7B and 14B variants perform competitively with CodeLLama 34B on most benchmarks while running comfortably on consumer hardware.

### Setup via Ollama

```bash
ollama pull qwen2.5-coder:7b
```

Then configure your completion source to use `qwen2.5-coder` as the model name. The model has notably better instruction-following for fill-in-the-middle (FIM) tasks than earlier Qwen iterations, which translates to more accurate inline completions rather than pure next-token generation.

## Neovim Plugins Purpose-Built for Local Completion

Beyond generic cmp sources, several plugins are specifically designed for local LLM completion workflows:

- **gen.nvim**: Lightweight plugin that speaks directly to any Ollama endpoint; requires zero extra dependencies and exposes completions through a simple `:Gen` command interface.
- **llm.nvim**: Supports multiple backends (Ollama, llama.cpp HTTP server) and offers streaming completions that display tokens as they arrive rather than waiting for the full response.
- **copilot.lua** (unofficial): Forks of the official Copilot plugin have been adapted to redirect requests to local endpoints, preserving the ghost-text completion UX while eliminating the cloud dependency.

For daily driver use, llm.nvim with streaming enabled provides the most responsive feel. Latency on a 7B quantized model running on Apple Silicon or a mid-range NVIDIA GPU is typically under 500ms for short completions—fast enough to not disrupt flow.

## Comparing the Options

| Tool | Model Size | Hardware Requirements | Setup Complexity |
|------|-----------|----------------------|------------------|
| Ollama + CodeLLama | 7-13B parameters | 8-16GB RAM recommended | Low |
| Ollama + Qwen2.5-Coder | 7-14B parameters | 8-16GB RAM | Low |
| CodeGeex | 13B parameters | 16GB+ RAM | Medium |
| CodeGen | 2-16B parameters | 4-16GB RAM | Medium |
| StarCoder + llama.cpp | Quantized options | 4-8GB RAM | Medium-High |

Ollama provides the easiest setup experience. If you want minimal configuration time, CodeLLama or Qwen2.5-Coder through Ollama delivers the fastest path to working local AI code completion.

CodeGeex and CodeGen offer specialized code models but require more manual setup. These work well if you need specific capabilities from these architectures.

StarCoder excels when you need the most efficient resource usage. The quantized versions run smoothly on laptops without dedicated GPUs.

## Hardware Considerations

Local AI code completion demands computational resources. A modern multi-core CPU can handle smaller models, but GPU acceleration dramatically improves response times. NVIDIA GPUs with CUDA support work best. Apple Silicon Macs can also run these models efficiently through Metal acceleration in some frameworks.

RAM usage scales with model size. Plan for at least 8GB of available memory for smaller models, and 16GB or more for larger implementations.

## Performance Tips

To get the best experience from local AI code completion in Neovim:

- Use quantization to reduce model size and memory requirements
- Adjust the context length based on your typical completion needs
- Consider using a dedicated GPU or eGPU for faster responses
- Cache completions locally to avoid redundant API calls
- Prefer fill-in-the-middle (FIM) capable models (CodeLLama Instruct, Qwen2.5-Coder) for inline completion over pure next-token models

## Advanced Configuration: Building a Production Setup

For developers committed to self-hosted completions, here's a production-ready architecture:

**Infrastructure Stack:**
```
Neovim Editor
  ↓
nvim-cmp (completion engine)
  ↓
Custom Lua plugin (talks to inference server)
  ↓
vLLM or Ollama (inference server)
  ↓
Quantized CodeLLama model (GPU inference)
```

**Example: Ollama + nvim-cmp Setup**

First, install Ollama and pull a model:
```bash
# Install Ollama (https://ollama.ai)
ollama pull codellama:7b-instruct

# Start Ollama service
ollama serve --host 127.0.0.1:11434
```

Then configure Neovim (`~/.config/nvim/init.lua`):

```lua
-- Install packer if needed, then add these plugins
use 'hrsh7th/nvim-cmp'
use 'hrsh7th/cmp-nvim-lsp'
use 'hrsh7th/cmp-buffer'
use 'hrsh7th/cmp-path'

-- Custom completion source for Ollama
local cmp = require('cmp')
local source = {}

function source.new()
  return setmetatable({}, { __index = source })
end

function source:complete(params, callback)
  local prefix = params.context.line:sub(params.offset)

  -- Call Ollama API
  local cmd = string.format(
    "curl -s http://127.0.0.1:11434/api/generate -d '{\"model\": \"codellama:7b-instruct\", \"prompt\": \"%s\", \"stream\": false}' | jq -r '.response'",
    prefix
  )

  local handle = io.popen(cmd)
  local result = handle:read("*a")
  handle:close()

  -- Parse completion and return
  local items = {{
    label = result,
    kind = cmp.lsp.CompletionItemKind.Text
  }}

  callback({ items = items })
end

function source:resolve(completion_item, callback)
  callback(completion_item)
end

function source:execute(completion_item, callback)
  callback(completion_item)
end

-- Register the source
cmp.register_source('ollama', source.new())

-- Configure cmp
cmp.setup({
  sources = cmp.config.sources({
    { name = 'ollama', priority = 10 },
    { name = 'nvim_lsp' },
    { name = 'buffer' },
  })
})
```

**Production Considerations:**

1. **Response Caching**: Cache completions for identical context to reduce latency
```lua
local completion_cache = {}

function get_completion_cached(prompt)
  if completion_cache[prompt] then
    return completion_cache[prompt]
  end
  local result = get_completion(prompt)
  completion_cache[prompt] = result
  return result
end
```

2. **Timeout Handling**: Set timeouts for inference to prevent hanging
```bash
# In Ollama startup
timeout 5 curl http://127.0.0.1:11434/api/generate ...
```

3. **Error Recovery**: Gracefully fall back to LSP if AI completion fails
```lua
function source:complete(params, callback)
  local success, result = pcall(function()
    return call_ollama(params)
  end)

  if not success then
    -- Fall back to LSP completion
    vim.lsp.completion.trigger(params)
  else
    callback(result)
  end
end
```

## Model Selection for Different Languages

Not all models excel equally across languages:

**For Python/Go/Rust:**
- CodeLLama 13B (best overall balance)
- DeepSeek Coder (if you have GPU resources)
- StarCoder 15B (good alternative)

**For JavaScript/TypeScript:**
- Qwen Coder (excellent for JS/TS)
- CodeLLama 13B+ (needs more VRAM)
- CodeGeex (specialized for JS)

**For C/C++/Java:**
- CodeLLama 70B (if you have resources)
- StarCoder (surprisingly good for C++)
- Specialized Java model if available

## Benchmarking Your Setup

Before deploying, benchmark completion quality and speed:

```bash
#!/bin/bash
# Benchmark completion latency

MODEL="codellama:7b"
ITERATIONS=10

echo "Benchmarking $MODEL..."

for i in $(seq 1 $ITERATIONS); do
  prompt="def factorial(n):"

  time_start=$(date +%s%N)

  curl -s http://127.0.0.1:11434/api/generate \
    -d "{\"model\": \"$MODEL\", \"prompt\": \"$prompt\", \"stream\": false}" > /dev/null

  time_end=$(date +%s%N)
  time_ms=$(( (time_end - time_start) / 1000000 ))

  echo "Iteration $i: ${time_ms}ms"
done
```

Track:
- Average latency (should be <2s for coding)
- Completion quality (matches what you'd write)
- GPU utilization (staying below 80%)
- Memory usage (not exceeding available VRAM)

## Troubleshooting Common Issues

**Issue: Completions are very slow (>5s)**
- Reduce context length: `--n-ctx 512` instead of 2048
- Use quantized models (4-bit or 8-bit)
- Add more VRAM or use smaller models

**Issue: Out of memory errors**
- Check model size: `ollama list`
- Use 7B parameter models instead of 13B+
- Enable 4-bit quantization in your model pull command

**Issue: Completions don't match the current context**
- Increase context window in your prompt
- Provide more surrounding code to the API
- Use a larger model with better code understanding

## Integration with Other Tools

**GitHub Copilot Comparison:**
| Aspect | Local Completion | GitHub Copilot |
|--------|------------------|-----------------|
| Privacy | Complete (local) | Data sent to GitHub |
| Cost | ~$100-200/year electricity | $10/month |
| Quality | Good (7-13B models) | Excellent (larger models) |
| Setup | 2-4 hours | 5 minutes |
| Speed | 1-5 seconds/completion | <500ms |
| Offline | Yes | No |

Local completion makes sense when privacy matters more than raw speed, or when you want to avoid recurring subscription costs.

## Related Articles

- [Open Source AI Code Linting Tools With Automatic Fix](/open-source-ai-code-linting-tools-with-automatic-fix-suggest/)
- [AI Code Completion for Flutter BLoC Pattern Event and State](/ai-code-completion-for-flutter-bloc-pattern-event-and-state-/)
- [AI Code Completion for Java Jakarta EE Migration from Javax](/ai-code-completion-for-java-jakarta-ee-migration-from-javax-/)
- [AI Code Completion for Java Record Classes and Sealed](/ai-code-completion-for-java-record-classes-and-sealed-interf/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

## Frequently Asked Questions

**Who is this article written for?**

This article is written for developers, technical professionals, and power users who want practical guidance. Whether you are evaluating options or implementing a solution, the information here focuses on real-world applicability rather than theoretical overviews.

**How current is the information in this article?**

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Always verify specific feature availability and pricing directly on the official website before making purchasing decisions.

**Does Neovim offer a free tier?**

Most major tools offer some form of free tier or trial period. Check Neovim's current pricing page for the latest free tier details, as these change frequently. Free tiers typically have usage limits that work for evaluation but may not be sufficient for daily professional use.

**How do I get started quickly?**

Pick one tool from the options discussed and sign up for a free trial. Spend 30 minutes on a real task from your daily work rather than running through tutorials. Real usage reveals fit faster than feature comparisons.

**What is the learning curve like?**

Most tools discussed here can be used productively within a few hours. Mastering advanced features takes 1-2 weeks of regular use. Focus on the 20% of features that cover 80% of your needs first, then explore advanced capabilities as specific needs arise.
{% endraw %}
