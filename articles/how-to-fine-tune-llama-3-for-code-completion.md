---
layout: default
title: "How to Fine-Tune Llama 3 for Code Completion"
description: "Practical guide to fine-tuning Llama 3 on your codebase for code completion. Covers dataset prep, QLoRA training, evaluation, and serving the model locally."
date: 2026-03-21
author: theluckystrike
permalink: /how-to-fine-tune-llama-3-for-code-completion/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Fine-tuning Llama 3 on your own codebase produces a model that knows your internal libraries, naming conventions, and common patterns. The result is better autocomplete suggestions than a general-purpose model — without sending your code to an external API.

## Why Fine-Tune vs Use a General Model

General code models are trained on public code. They do not know your internal SDK, your team's preferred patterns, or your domain-specific abstractions. A model fine-tuned on your codebase:

- Suggests your actual function and class names instead of inventing plausible-sounding ones
- Follows your error handling patterns (custom exception classes, log formats)
- Generates code that passes your linters on the first attempt
- Works offline with zero data leakage

The trade-off: you need enough code examples (typically 500-10,000 samples) and a GPU for training (a single A100 for a few hours, or a consumer RTX 3090/4090 for QLoRA).

## Prerequisites

```bash
pip install transformers datasets peft bitsandbytes accelerate trl \
    torch torchvision --index-url https://download.pytorch.org/whl/cu121

python -c "import torch; print(torch.cuda.get_device_name(0))"
```

You'll need at least 24GB VRAM for Llama 3 8B with QLoRA.

## Step 1: Prepare the Training Dataset

```python
from datasets import Dataset
import ast
from pathlib import Path

def extract_functions_from_file(filepath: str) -> list[dict]:
    with open(filepath) as f:
        source = f.read()

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    pairs = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if not (node.body and isinstance(node.body[0], ast.Expr)):
            continue

        docstring = ast.get_docstring(node)
        if not docstring or len(docstring) < 20:
            continue

        start = node.lineno - 1
        end = node.end_lineno
        func_lines = source.split("\n")[start:end]
        func_source = "\n".join(func_lines)
        signature_line = func_lines[0]

        pairs.append({
            "instruction": f"Write a Python function with this signature and behavior:\n"
                          f"Signature: {signature_line.strip()}\n"
                          f"Description: {docstring}",
            "output": func_source,
        })

    return pairs

all_pairs = []
for py_file in Path("./src").rglob("*.py"):
    pairs = extract_functions_from_file(str(py_file))
    all_pairs.extend(pairs)

print(f"Extracted {len(all_pairs)} training examples")

def format_example(example):
    return {
        "text": f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n"
                f"{example['instruction']}<|eot_id|>"
                f"<|start_header_id|>assistant<|end_header_id|>\n"
                f"{example['output']}<|eot_id|>"
    }

dataset = Dataset.from_list(all_pairs).map(format_example)
dataset = dataset.train_test_split(test_size=0.1, seed=42)
dataset.save_to_disk("./training_data")
```

Aim for at least 500 examples. 2,000-5,000 typically produces noticeably better results.

## Step 2: Configure QLoRA Training

QLoRA lets you fine-tune an 8B parameter model on a 24GB GPU by quantizing base model weights to 4-bit.

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from peft import LoraConfig, get_peft_model
import torch

MODEL_ID = "meta-llama/Meta-Llama-3-8B-Instruct"

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
    token=os.getenv("HF_TOKEN"),
)
model.config.use_cache = False

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, token=os.getenv("HF_TOKEN"))
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# trainable params: 41,943,040 || all params: 8,072,818,688 || trainable%: 0.52%
```

## Step 3: Train

```python
from trl import SFTTrainer
from datasets import load_from_disk

dataset = load_from_disk("./training_data")

training_args = TrainingArguments(
    output_dir="./llama3-code-finetuned",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    gradient_checkpointing=True,
    optim="paged_adamw_32bit",
    learning_rate=2e-4,
    bf16=True,
    max_grad_norm=0.3,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    evaluation_strategy="steps",
    eval_steps=50,
    save_steps=100,
    load_best_model_at_end=True,
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    dataset_text_field="text",
    max_seq_length=2048,
    tokenizer=tokenizer,
    args=training_args,
    packing=False,
)

trainer.train()
trainer.save_model("./llama3-code-finetuned/final")
```

Training 2,000 examples for 3 epochs on an RTX 4090 takes approximately 45-90 minutes.

## Step 4: Merge and Export for Ollama

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM

base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16,
    device_map="cpu",
    token=os.getenv("HF_TOKEN"),
)

model = PeftModel.from_pretrained(base_model, "./llama3-code-finetuned/final")
merged_model = model.merge_and_unload()
merged_model.save_pretrained("./llama3-code-merged", safe_serialization=True)
tokenizer.save_pretrained("./llama3-code-merged")
```

Convert to GGUF for Ollama:

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp && pip install -r requirements.txt

python convert_hf_to_gguf.py ../llama3-code-merged --outfile llama3-code.gguf
./llama-quantize llama3-code.gguf llama3-code-q4km.gguf Q4_K_M

cat > Modelfile << 'EOF'
FROM ./llama3-code-q4km.gguf
PARAMETER temperature 0.1
PARAMETER num_ctx 8192
SYSTEM "You are an expert coding assistant. Generate clean, idiomatic code."
EOF

ollama create my-code-model -f Modelfile
ollama run my-code-model "Write a FastAPI endpoint that..."
```

## Evaluating the Fine-Tuned Model

```python
import ollama

test_prompts = [
    "Write a function that fetches user data using our internal UserRepository class",
    "Add error handling to this function using our AppError base class",
]

for prompt in test_prompts:
    base_response = ollama.generate(model="llama3:8b", prompt=prompt)
    ft_response = ollama.generate(model="my-code-model", prompt=prompt)

    print(f"Prompt: {prompt}")
    print(f"Base model:\n{base_response['response'][:300]}")
    print(f"Fine-tuned:\n{ft_response['response'][:300]}")
```

If the fine-tuned model uses your actual class names and follows your error handling patterns while the base model invents generic ones, the fine-tuning worked.

## Related Reading

- [Running Deepseek Coder Locally vs Cloud API for Private Repos](/running-deepseek-coder-locally-vs-cloud-api-for-private-repo/)
- [Best Local LLM Alternatives to Cloud AI Coding Assistants](/best-local-llm-alternatives-to-cloud-ai-coding-assistants-fo/)
- [LLM Fine-Tuning Platforms Comparison 2026](/llm-fine-tuning-platforms-comparison-2026/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
