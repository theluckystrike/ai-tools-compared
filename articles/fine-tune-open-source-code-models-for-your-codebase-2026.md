---
layout: default
title: "Fine Tune Open Source Code Models for Your Codebase"
description: "Fine-tune DeepSeek Coder and CodeLlama on your codebase with LoRA and QLoRA. Dataset preparation, training configs, and evaluation methods covered."
date: 2026-03-20
last_modified_at: 2026-03-20
author: theluckystrike
permalink: /fine-tune-open-source-code-models-for-your-codebase-2026/
categories: [guides]
tags: [ai-tools-compared, ai, development, models, fine-tuning]
reviewed: true
score: 9
voice-checked: true
intent-checked: true
---


Fine-tuning open source code models like Code Llama, Deepseek Coder, and Mistral's Codestral on your proprietary codebase significantly improves suggestion accuracy and reduces hallucinations. Instead of generic suggestions, your AI assistant understands your team's conventions, naming patterns, and architecture. This guide shows exactly how to adapt modern models to your specific code repository.

## Table of Contents

- [Why Fine-tune Instead of Using Commercial Models?](#why-fine-tune-instead-of-using-commercial-models)
- [Choosing Your Base Model](#choosing-your-base-model)
- [Step 1: Prepare Your Training Dataset](#step-1-prepare-your-training-dataset)
- [Step 2: Fine-tune Using QLoRA (Memory-Efficient)](#step-2-fine-tune-using-qlora-memory-efficient)
- [Step 3: Deploy Your Fine-tuned Model](#step-3-deploy-your-fine-tuned-model)
- [Step 4: Continuous Improvement](#step-4-continuous-improvement)
- [Infrastructure and Cost](#infrastructure-and-cost)
- [Building a Data Quality Pipeline](#building-a-data-quality-pipeline)
- [Choosing Your Fine-tuning Approach: LoRA vs Full Fine-tuning vs RLHF](#choosing-your-fine-tuning-approach-lora-vs-full-fine-tuning-vs-rlhf)
- [Benchmarking Your Fine-tuned Model](#benchmarking-your-fine-tuned-model)
- [Common Pitfalls](#common-pitfalls)

## Why Fine-tune Instead of Using Commercial Models?

Commercial AI coding tools (GitHub Copilot, Claude Code) learn from billions of public repositories. But they miss your team's unique patterns: your custom frameworks, internal library conventions, and proprietary architectural decisions. Fine-tuning creates a personalized version that:

- Generates code matching your team's exact style
- Understands your internal libraries and custom abstractions
- Reduces security risks by never sending code to external APIs
- Provides predictable pricing (one-time compute cost)
- Enables deployment on your own infrastructure

The trade-off: you invest engineering time upfront but gain a tool that evolves with your codebase over time.

## Choosing Your Base Model

Three open source models dominate code fine-tuning in 2026:

| Model | Parameters | Strengths | Fine-tuning Cost |
|-------|-----------|-----------|------------------|
| Code Llama | 7B, 13B, 34B | Best for Python/JS, good instruction following | Low (7B fits GPU) |
| Deepseek Coder | 6.7B, 33B | Superior logical reasoning, multi-language | Medium (needs VRAM) |
| Mistral Codestral | 22B | Fastest inference, best code completion | High (needs 24GB VRAM) |

**Recommendation**: Start with Code Llama 13B. It's proven on code tasks, fine-tunes efficiently on consumer hardware, and supports 8K context windows.

## Step 1: Prepare Your Training Dataset

Fine-tuning requires 500-2000 high-quality code examples. This is the critical step—garbage in, garbage out.

```bash
# Extract your codebase functions and their tests
# Target: create pairs of (code context, code completion)

# Python example: grab function definitions + their docstrings/tests
find ./src -name "*.py" -type f | while read file; do
  # Extract functions with their docstrings
  python -c "
import ast
with open('$file') as f:
    tree = ast.parse(f.read())
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            print(f'# Function: {node.name}')
            print(ast.unparse(node)[:500])
            print('---')
" >> training_data.txt
done
```

Create a JSONL file format (one training example per line):

```json
{"prompt": "def calculate_discount(price: float, customer_type: str) -> float:\n    \"\"\"Calculate discount based on customer tier.\"\"\"\n    # Your codebase implementation:", "completion": "    if customer_type == 'vip':\n        return price * 0.2\n    elif customer_type == 'regular':\n        return price * 0.1\n    return 0"}
{"prompt": "async def fetch_user_data(user_id: str) -> dict:\n    \"\"\"Retrieve user profile from database.\"\"\"", "completion": "    async with db.transaction():\n        user = await User.get(id=user_id)\n        if not user:\n            raise UserNotFoundError(f'User {user_id} not found')\n        return user.to_dict()"}
{"prompt": "class DatabasePool:\n    \"\"\"Connection pool for PostgreSQL.\"\"\"", "completion": "    def __init__(self, min_size=5, max_size=20):\n        self.min_size = min_size\n        self.max_size = max_size\n        self.connections = asyncio.Queue()"}
```

**Quality tips**:
- Include docstrings and comments (models learn style, not just syntax)
- Deduplicate similar code patterns
- Remove test fixtures and mock data
- Include both successful patterns and documented failure cases

## Step 2: Fine-tune Using QLoRA (Memory-Efficient)

QLoRA lets you fine-tune 33B models on a 24GB GPU by quantizing weights to 4-bit. Install requirements:

```bash
pip install -U transformers peft bitsandbytes trl
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Verify GPU access
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name())"
```

Fine-tuning script using Hugging Face's `SFTTrainer`:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig
import torch

# Load base model with 4-bit quantization
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model_id = "meta-llama/Llama-2-13b-hf"
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto"
)

# Configure LoRA (Low-Rank Adaptation)
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)

# Training configuration
training_args = SFTConfig(
    output_dir="./code-model-lora",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    num_train_epochs=3,
    learning_rate=2e-4,
    warmup_steps=100,
    logging_steps=10,
    save_steps=100,
    max_seq_length=2048,
    optim="paged_adamw_8bit",  # Memory efficient
)

# Train
trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    tokenizer=tokenizer,
    formatting_func=lambda x: x["prompt"] + x["completion"]
)

trainer.train()
model.save_pretrained("./my-code-model-lora")
```

This typically trains in 2-4 hours on a single 24GB GPU for 1000 examples.

## Step 3: Deploy Your Fine-tuned Model

Merge LoRA weights back into the base model:

```python
from peft import AutoPeftModelForCausalLM

model = AutoPeftModelForCausalLM.from_pretrained(
    "./my-code-model-lora",
    device_map="auto",
    torch_dtype=torch.float16,
)
merged_model = model.merge_and_unload()
merged_model.save_pretrained("./my-code-model-merged")

# Upload to Hugging Face Hub for team access
merged_model.push_to_hub("yourorg/my-code-model-merged")
```

Integration with your IDE (VSCode + Continue extension):

```json
{
  "models": [
    {
      "title": "My Custom Code Model",
      "provider": "ollama",
      "model": "yourorg/my-code-model-merged:latest"
    }
  ],
  "tabAutocompleteModel": {
    "provider": "ollama",
    "model": "yourorg/my-code-model-merged:latest"
  }
}
```

## Step 4: Continuous Improvement

Fine-tune quarterly as your codebase evolves:

- Extract new code patterns from merged PRs
- Add new architectural patterns your team adopted
- Remove patterns that became deprecated
- Track accuracy improvement with internal benchmarks

Example evaluation script:

```python
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

def evaluate_model(model, test_prompts):
    model.eval()
    total_loss = 0

    for prompt in test_prompts:
        inputs = tokenizer(prompt["prompt"], return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs, labels=inputs["input_ids"])
        total_loss += outputs.loss.item()

    return total_loss / len(test_prompts)

baseline_loss = evaluate_model(original_model, test_set)
finetuned_loss = evaluate_model(finetuned_model, test_set)

print(f"Improvement: {((baseline_loss - finetuned_loss) / baseline_loss) * 100:.1f}%")
```

## Infrastructure and Cost

**Minimum setup**: Single 24GB GPU (RTX 4090 or equivalent)
- Google Colab: $15-30/month for persistent storage + compute
- Lambda Labs: ~$0.44/hour for A6000 (48GB VRAM)
- Self-hosted: $2000 upfront for RTX 4090

**Development cost**: 40-60 hours of engineering work for setup, validation, and deployment

**ROI**: Break-even when fine-tuned model reduces code review cycles by 5-10% across a 10+ person team.

## Building a Data Quality Pipeline

The quality of your fine-tuning dataset determines the quality of the resulting model more than any hyperparameter choice. A systematic pipeline for collecting and filtering training examples is worth the engineering investment.

### Filtering Low-Quality Examples

Not all code in your repository is suitable for training. Exclude:

- Auto-generated files (migrations, protobuf output, build artifacts)
- Files with TODO/FIXME density above 5% of lines — these signal incomplete work
- Vendored external dependencies
- Test fixtures and mock data files
- Functions shorter than 3 lines — too little context for the model to learn from

A quality filter checks the file header for "auto-generated" or "do not edit" strings, counts TODO density, and skips files under 20 lines. For Python, extract `(docstring, implementation)` pairs using the `ast` module: walk the tree for `FunctionDef` nodes, skip functions without docstrings, and store the prompt as the signature plus docstring, with the full function body as the completion target.

### Deduplication

Near-duplicate examples teach the model nothing new but inflate training time. A simple approach is hashing the first 200 characters of each completion and dropping collisions. More strong deduplication using MinHash LSH (`pip install datasketch`) can detect near-duplicates with ~85% similarity. A codebase with 50,000 extractable functions typically deduplicates down to 8,000-12,000 distinct patterns — which is the training set size you want.

## Choosing Your Fine-tuning Approach: LoRA vs Full Fine-tuning vs RLHF

Three fine-tuning strategies exist, each with different cost and quality profiles:

| Approach | VRAM Required | Training Time | Quality Gain | Use Case |
|---|---|---|---|---|
| QLoRA (4-bit) | 16-24GB | 2-6 hours | Good | Most teams — best cost/quality tradeoff |
| LoRA (full precision) | 40-80GB | 4-12 hours | Better | When VRAM is available |
| Full fine-tuning | 80GB+ | Days | Best | Large teams with dedicated ML infra |
| RLHF | 80GB+ (2 models) | Weeks | Best for alignment | Enterprise with human feedback pipeline |

For most engineering teams, QLoRA on a rented cloud GPU is the right answer. Full fine-tuning provides marginally better results but requires 4-8x more compute budget.

## Benchmarking Your Fine-tuned Model

Measuring improvement objectively prevents wasting time on failed runs. Reserve 10% of your training examples as a held-out test set before fine-tuning begins. After training, evaluate using next-line exact match: generate a completion from each test prompt and check whether the first non-trivial generated line matches the expected line.

```python
def evaluate_exact_match(model, tokenizer, test_examples: list[dict]) -> float:
    matches = 0
    for ex in test_examples:
        inputs = tokenizer(ex["prompt"], return_tensors="pt").to(model.device)
        with torch.no_grad():
            output = model.generate(**inputs, max_new_tokens=128, temperature=0.1)
        generated = tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        expected_line = ex["completion"].strip().split("\n")[0].strip()
        if expected_line in generated:
            matches += 1
    return matches / len(test_examples)
```

A meaningful improvement is a 15-25% increase in exact match rate compared to the base model. Under 10% improvement usually means the training dataset needs more examples or better quality filtering.

## Common Pitfalls

1. **Too few training examples**: Under 300 examples doesn't create meaningful improvement. Aim for 1000+.
2. **Overfitting to old patterns**: If your codebase refactored significantly, include both old and new examples.
3. **Training on test data**: Always split 90/10 training/validation to detect overfitting.
4. **Ignoring context windows**: Code Llama supports 8K tokens; include multi-function context in prompts.

## Frequently Asked Questions

**Who is this article written for?**

This article is written for developers, technical professionals, and power users who want practical guidance. Whether you are evaluating options or implementing a solution, the information here focuses on real-world applicability rather than theoretical overviews.

**How current is the information in this article?**

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Always verify specific feature availability and pricing directly on the official website before making purchasing decisions.

**Are there free alternatives available?**

Free alternatives exist for most tool categories, though they typically come with limitations on features, usage volume, or support. Open-source options can fill some gaps if you are willing to handle setup and maintenance yourself. Evaluate whether the time savings from a paid tool justify the cost for your situation.

**How do I get started quickly?**

Pick one tool from the options discussed and sign up for a free trial. Spend 30 minutes on a real task from your daily work rather than running through tutorials. Real usage reveals fit faster than feature comparisons.

**What is the learning curve like?**

Most tools discussed here can be used productively within a few hours. Mastering advanced features takes 1-2 weeks of regular use. Focus on the 20% of features that cover 80% of your needs first, then explore advanced capabilities as specific needs arise.

## Related Articles

- [How to Fine-Tune Llama 3 for Code Completion](/how-to-fine-tune-llama-3-for-code-completion/)
- [Copilot Code Referencing Feature: How It Handles Open Source](/copilot-code-referencing-feature-how-it-handles-open-source-/)
- [AI Tools for Analyzing Which Open Source Issues Would Benefi](/ai-tools-for-analyzing-which-open-source-issues-would-benefi-from-contributions/)
- [Best AI Assistant for Creating Open Source Project Branding](/best-ai-assistant-for-creating-open-source-project-branding-/)
- [Best AI Assistant for Drafting Open Source Partnership and](/best-ai-assistant-for-drafting-open-source-partnership-and-integration-proposals-2026/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
