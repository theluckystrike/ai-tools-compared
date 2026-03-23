---
layout: default
title: "How to Build Custom AI Code Completion Models"
description: "Fine-tune CodeLlama or Starcoder2 on your internal codebase for domain-specific code completion, with training setup, evaluation, and deployment on Ollama"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-build-custom-ai-code-completion-models/
categories: [guides]
tags: [ai-tools-compared, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Off-the-shelf code completion models don't know your internal APIs, naming conventions, or domain-specific patterns. A custom fine-tuned model that completes your internal SDK calls or company-specific patterns can save significant developer time. This guide covers training data preparation, fine-tuning with QLoRA, evaluation, and deploying with Ollama or vLLM.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1: When Custom Models Make Sense

Fine-tuning is worth the investment when:

- You have proprietary internal frameworks or SDKs with 50+ public methods
- Your codebase uses domain-specific patterns not well-represented in training data
- You process code on-premises and can't send it to external APIs
- You need sub-50ms completion latency (fine-tuned 7B models beat API latency)

For general programming tasks, Claude or Copilot still win. For your internal `PaymentProcessor.process_with_retry()` calls, a fine-tuned model is more accurate.

Step 2: Model Selection: CodeLlama vs StarCoder2

Before writing a single line of training code, choose the right base model. The decision affects GPU requirements, licensing, and accuracy on specific languages.

| Model | Parameters | GPU RAM (QLoRA) | License | Best For |
|---|---|---|---|---|
| StarCoder2-3B | 3B | ~8 GB (single A10G) | BigCode OpenRAIL-M | Fast inference, Python/JS/Go |
| StarCoder2-7B | 7B | ~16 GB (single A100) | BigCode OpenRAIL-M | Better accuracy, more languages |
| CodeLlama-7B | 7B | ~16 GB | Llama 2 Community | General code, Python focus |
| CodeLlama-13B | 13B | ~28 GB (2x A10G) | Llama 2 Community | Highest accuracy, slower |
| DeepSeek-Coder-6.7B | 6.7B | ~14 GB | DeepSeek License | Strong on multi-language repos |

For most internal codebases, StarCoder2-7B is the best starting point. It supports Fill-in-the-Middle (FIM) natively, which is the right training objective for autocomplete. the model learns to predict the middle of a function given its prefix and suffix. CodeLlama also supports FIM; DeepSeek-Coder uses a slightly different format.

Step 3: Training Data Preparation

Quality training data is more important than model size. A well-curated 10,000-example dataset beats a scraped 1M-example dataset for domain-specific tasks.

```python
scripts/prepare_training_data.py
import ast
import json
from pathlib import Path
from typing import Generator

def extract_fill_in_middle_examples(
    code: str,
    min_prefix: int = 50,
    min_suffix: int = 20,
    max_middle: int = 200
) -> list[dict]:
    """
    Extract FIM (Fill-in-the-Middle) training examples from source files.
    Randomly masks function bodies, docstrings, and variable assignments.
    """
    lines = code.split("\n")
    examples = []

    # Find function definitions to mask their bodies
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        body_start = node.body[0].lineno - 1
        body_end = node.end_lineno

        prefix_lines = lines[:body_start]
        middle_lines = lines[body_start:body_end]
        suffix_lines = lines[body_end:]

        prefix = "\n".join(prefix_lines)
        middle = "\n".join(middle_lines)
        suffix = "\n".join(suffix_lines)

        if (len(prefix) >= min_prefix and
            len(suffix) >= min_suffix and
            len(middle) <= max_middle):

            examples.append({
                "prefix": prefix,
                "suffix": suffix,
                "middle": middle,
                # FIM format for StarCoder2
                "text": f"<fim_prefix>{prefix}<fim_suffix>{suffix}<fim_middle>{middle}<|endoftext|>"
            })

    return examples

def process_repo(repo_path: str, extensions: list = [".py", ".ts", ".go"]) -> list[dict]:
    """Process all source files in a repository."""
    all_examples = []
    repo = Path(repo_path)

    for ext in extensions:
        for file_path in repo.rglob(f"*{ext}"):
            # Skip tests, generated files, and vendor directories
            if any(part in file_path.parts for part in ["test", "vendor", "node_modules", "__pycache__"]):
                continue
            if "generated" in file_path.name or "pb2" in file_path.name:
                continue

            try:
                code = file_path.read_text(encoding="utf-8", errors="ignore")
                examples = extract_fill_in_middle_examples(code)
                all_examples.extend(examples)
            except Exception:
                continue

    return all_examples

Run on your codebase
examples = process_repo("/path/to/your/codebase")
print(f"Extracted {len(examples)} training examples")

Save as JSONL
with open("training_data.jsonl", "w") as f:
    for ex in examples:
        f.write(json.dumps(ex) + "\n")
```

A codebase of 200,000 lines typically yields 8,000–15,000 usable FIM examples after filtering. Aim for at least 5,000 examples before fine-tuning; below that, the model memorizes rather than generalizes.

Step 4: Fine-Tuning with QLoRA

QLoRA lets you fine-tune a 7B parameter model on a single A100 (40GB) or two A10G GPUs. For a 3B model (Starcoder2-3b), you can use a single A10G.

```python
train.py
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model, TaskType
from trl import SFTTrainer
from datasets import load_dataset
import torch

MODEL_ID = "bigcode/starcoder2-7b"  # or "codellama/CodeLlama-7b-hf"

Load model with 4-bit quantization (QLoRA)
from transformers import BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token

LoRA config. target attention layers
lora_config = LoraConfig(
    r=16,           # rank. higher = more parameters, more capacity
    lora_alpha=32,  # scaling factor
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
Typical output: trainable params: 40M || all params: 7.1B (0.56%)

Load dataset
dataset = load_dataset("json", data_files="training_data.jsonl", split="train")

training_args = TrainingArguments(
    output_dir="./checkpoints",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,  # effective batch size = 16
    learning_rate=2e-4,
    warmup_steps=100,
    logging_steps=50,
    save_steps=500,
    bf16=True,
    report_to="tensorboard",
    optim="paged_adamw_32bit",
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=2048,
)

trainer.train()
trainer.model.save_pretrained("./fine-tuned-model")
tokenizer.save_pretrained("./fine-tuned-model")
```

Training 10,000 examples for 3 epochs on a single A100 takes roughly 45–90 minutes. Monitor your TensorBoard loss curve: if training loss drops below 0.8 but validation loss stops improving, you're starting to overfit. Reduce epochs or increase dropout.

Step 5: Merging LoRA Weights

After training, merge the LoRA adapter into the base model for faster inference:

```python
merge_model.py
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

base_model = AutoModelForCausalLM.from_pretrained(
    "bigcode/starcoder2-7b",
    torch_dtype="auto",
    device_map="cpu",  # Load to CPU for merging
)
tokenizer = AutoTokenizer.from_pretrained("bigcode/starcoder2-7b")

Load and merge LoRA
model = PeftModel.from_pretrained(base_model, "./fine-tuned-model")
model = model.merge_and_unload()

Save merged model
model.save_pretrained("./merged-model", safe_serialization=True)
tokenizer.save_pretrained("./merged-model")
print("Merged model saved.")
```

Step 6: Evaluation

Before deploying, evaluate on a held-out test set:

```python
evaluate.py
from transformers import pipeline
import json

pipe = pipeline(
    "text-generation",
    model="./merged-model",
    torch_dtype="auto",
    device_map="auto",
)

def eval_completion(prefix: str, expected_middle: str, suffix: str) -> dict:
    """Evaluate FIM completion accuracy."""
    prompt = f"<fim_prefix>{prefix}<fim_suffix>{suffix}<fim_middle>"

    output = pipe(
        prompt,
        max_new_tokens=min(len(expected_middle) * 2, 200),
        temperature=0.2,
        do_sample=True,
        pad_token_id=pipe.tokenizer.eos_token_id,
    )

    generated = output[0]["generated_text"][len(prompt):]
    # Stop at end-of-text token
    if "<|endoftext|>" in generated:
        generated = generated[:generated.index("<|endoftext|>")]

    # Exact match
    exact = generated.strip() == expected_middle.strip()

    # Token-level accuracy
    gen_tokens = set(generated.split())
    exp_tokens = set(expected_middle.split())
    token_overlap = len(gen_tokens & exp_tokens) / max(len(exp_tokens), 1)

    return {
        "exact_match": exact,
        "token_overlap": token_overlap,
        "generated": generated[:200],
        "expected": expected_middle[:200],
    }

Load test set
with open("test_data.jsonl") as f:
    test_examples = [json.loads(line) for line in f][:100]

results = [
    eval_completion(ex["prefix"], ex["middle"], ex["suffix"])
    for ex in test_examples
]

exact_matches = sum(r["exact_match"] for r in results)
avg_overlap = sum(r["token_overlap"] for r in results) / len(results)

print(f"Exact match: {exact_matches}/{len(results)} ({exact_matches/len(results):.1%})")
print(f"Average token overlap: {avg_overlap:.1%}")
```

A well-tuned model on an internal codebase typically reaches 20–35% exact match on single-function completions and 60–75% token overlap. The exact match number sounds low, but in practice it means the model produces functionally equivalent code even when the whitespace or variable name differs slightly. Run the suggested completions through your unit tests as a more meaningful quality signal.

Step 7: Deploy with Ollama

Convert the merged model to GGUF format and serve with Ollama:

```bash
Install llama.cpp for conversion
brew install llama.cpp

Convert to GGUF (Q4_K_M quantization for 4-bit)
llama-quantize ./merged-model/model.safetensors \
  ./custom-coder-q4.gguf Q4_K_M

Create Ollama modelfile
cat > Modelfile << 'EOF'
FROM ./custom-coder-q4.gguf

PARAMETER temperature 0.2
PARAMETER top_p 0.95
PARAMETER num_predict 200
PARAMETER stop "<|endoftext|>"

SYSTEM "You are a code completion model trained on internal company code."
EOF

Create Ollama model
ollama create custom-coder -f Modelfile

Test it
ollama run custom-coder "def process_payment(amount: float, currency: str) ->"
```

The Q4_K_M quantization reduces a 7B model to roughly 4.5 GB. On a MacBook Pro M3, this runs at 25–40 tokens per second. fast enough for real-time autocomplete. For a team deployment, run Ollama on a shared Linux machine with a GPU and point all developer clients at `http://your-server:11434`.

Step 8: VS Code Integration

```json
// .vscode/settings.json. use with Continue.dev extension
{
  "continue.models": [
    {
      "title": "Custom Internal Coder",
      "provider": "ollama",
      "model": "custom-coder",
      "apiBase": "http://localhost:11434",
      "contextLength": 4096,
      "completionOptions": {
        "temperature": 0.2,
        "maxTokens": 200
      }
    }
  ],
  "continue.tabAutocompleteModel": {
    "title": "Custom Internal Coder",
    "provider": "ollama",
    "model": "custom-coder"
  }
}
```

Continue.dev is the recommended VS Code extension for connecting local Ollama models to the editor. It supports FIM-mode autocomplete natively and works without any data leaving your network.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Related Articles

- [How to Fine-Tune Llama 3 for Code Completion](/how-to-fine-tune-llama-3-for-code-completion/)
- [How to Run CodeLlama Locally for Private Code Completion](/how-to-run-codellama-locally-for-private-code-completion-ste/)
- [Fine Tune Open Source Code Models for Your Codebase](/fine-tune-open-source-code-models-for-your-codebase-2026/)
- [Best Self-Hosted AI Model for JavaScript TypeScript Code](/best-self-hosted-ai-model-for-javascript-typescript-code-gen/)
- [How to Build an AI-Powered Code Linter](/how-to-build-ai-powered-code-linter/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)

Frequently Asked Questions

How long does it take to build custom ai code completion models?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Will this work with my existing CI/CD pipeline?

The core concepts apply across most CI/CD platforms, though specific syntax and configuration differ. You may need to adapt file paths, environment variable names, and trigger conditions to match your pipeline tool. The underlying workflow logic stays the same.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.
{% endraw %}
