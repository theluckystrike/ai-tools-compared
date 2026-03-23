---
layout: default
title: "How to Fine-Tune Llama 3 for Code Completion"
description: "Practical guide to fine-tuning Llama 3 on your codebase for code completion. Covers dataset prep, QLoRA training, evaluation, and serving the model locally."
date: 2026-03-21
last_modified_at: 2026-03-21
author: theluckystrike
permalink: /how-to-fine-tune-llama-3-for-code-completion/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---
---
layout: default
title: "How to Fine-Tune Llama 3 for Code Completion"
description: "Practical guide to fine-tuning Llama 3 on your codebase for code completion. Covers dataset prep, QLoRA training, evaluation, and serving the model locally."
date: 2026-03-21
last_modified_at: 2026-03-21
author: theluckystrike
permalink: /how-to-fine-tune-llama-3-for-code-completion/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Fine-tuning Llama 3 on your own codebase produces a model that knows your internal libraries, naming conventions, and common patterns. The result is better autocomplete suggestions than a general-purpose model. without sending your code to an external API.

Key Takeaways

- Only the LoRA adapter: weights (about 0.5% of total parameters) are trained at full precision.
- Stop early and use the checkpoint with the lowest eval loss: `load_best_model_at_end=True` handles this automatically.
- If you have under 500 examples: a 10% test split is only 50 samples and produces unreliable metrics.
- 2:000-5,000 typically produces noticeably better results.
- Filter aggressively: require docstrings of at least 50 characters and exclude test functions, which often lack meaningful descriptions of intent.
- A 20-30% improvement in: passing tests over the base model indicates successful domain adaptation.

Why Fine-Tune vs Use a General Model

General code models are trained on public code. They do not know your internal SDK, your team's preferred patterns, or your domain-specific abstractions. A model fine-tuned on your codebase:

- Suggests your actual function and class names instead of inventing plausible-sounding ones
- Follows your error handling patterns (custom exception classes, log formats)
- Generates code that passes your linters on the first attempt
- Works offline with zero data leakage

The trade-off: you need enough code examples (typically 500-10,000 samples) and a GPU for training (a single A100 for a few hours, or a consumer RTX 3090/4090 for QLoRA).

For teams where code privacy is a hard requirement. regulated industries, proprietary algorithms, internal tooling. this trade-off is non-negotiable. For everyone else, the question is whether the quality improvement justifies the setup cost. If your codebase has strong internal conventions that a general model consistently ignores, fine-tuning pays off quickly.

Prerequisites

```bash
pip install transformers datasets peft bitsandbytes accelerate trl \
    torch torchvision --index-url https://download.pytorch.org/whl/cu121

python -c "import torch; print(torch.cuda.get_device_name(0))"
```

You'll need at least 24GB VRAM for Llama 3 8B with QLoRA. An RTX 3090, RTX 4090, or A100 all work. If you're on Apple Silicon, MPS training is supported but slower and more memory-constrained. stick to the 8B model.

Step 1: Prepare the Training Dataset

The quality of your training data determines the quality of your fine-tuned model more than any hyperparameter choice. The goal is to extract instruction-output pairs where the instruction describes what a function should do and the output is the actual implementation.

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

Aim for at least 500 examples. 2,000-5,000 typically produces noticeably better results. Before training, inspect a random sample of your extracted pairs. Functions without meaningful docstrings produce noise. the model learns to generate code that matches ambiguous descriptions, which isn't useful. Filter aggressively: require docstrings of at least 50 characters and exclude test functions, which often lack meaningful descriptions of intent.

Step 2: Configure QLoRA Training

QLoRA lets you fine-tune an 8B parameter model on a 24GB GPU by quantizing base model weights to 4-bit. Only the LoRA adapter weights (about 0.5% of total parameters) are trained at full precision.

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
trainable params: 41,943,040 || all params: 8,072,818,688 || trainable%: 0.52%
```

The `r=16` rank is a good starting point. Higher rank (32, 64) learns more but risks overfitting on small datasets. For datasets under 1,000 examples, keep `r=8` and add more regularization (higher `lora_dropout`).

Step 3: Train

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

Training 2,000 examples for 3 epochs on an RTX 4090 takes approximately 45-90 minutes. Watch the eval loss: if it starts increasing while train loss continues dropping, you're overfitting. Stop early and use the checkpoint with the lowest eval loss. `load_best_model_at_end=True` handles this automatically.

Step 4: Merge and Export for Ollama

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

The Q4_K_M quantization format is recommended over Q4_0. it uses mixed quantization on the most sensitive layers and produces better output quality with only a small size increase.

Evaluating the Fine-Tuned Model

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

Beyond qualitative checks, measure pass rate on a held-out set: generate code for 20-30 functions you extracted but excluded from training, then run your test suite against the generated implementations. A 20-30% improvement in passing tests over the base model indicates successful domain adaptation.

Connecting to Your Editor

Once your model is running in Ollama, connect it to Continue.dev for IDE integration:

```json
{
  "models": [
    {
      "title": "Llama3 Fine-tuned",
      "provider": "ollama",
      "model": "my-code-model",
      "contextLength": 8192
    }
  ],
  "tabAutocompleteModel": {
    "title": "Llama3 Fine-tuned (autocomplete)",
    "provider": "ollama",
    "model": "my-code-model"
  }
}
```

The model runs locally with your custom weights. Completions use your internal naming and patterns automatically, without any prompt engineering required.

Iterating After the First Fine-Tune

The first fine-tune rarely produces a perfect model. Common issues and fixes:

The model generates hallucinated class names. your dataset is too small or the docstrings don't mention class names explicitly. Fix: add examples that include type annotations with your actual class names in the signature line. The model learns from signature context, not just the docstring.

The model ignores your error handling conventions. you didn't include enough examples of error handling code. Fix: extract functions specifically from your exception-heavy modules (request handlers, database layers) and add them as a second training pass.

Completions are too verbose. lower the `temperature` parameter in your Modelfile from 0.2 to 0.05-0.1. For autocomplete, you want the model to be decisive about common patterns, not creative.

Eval loss is noisy and hard to interpret. your test split is too small. If you have under 500 examples, a 10% test split is only 50 samples and produces unreliable metrics. Use a fixed held-out set of 100 examples instead of random splitting.

Dataset Size vs Training Time Trade-offs

| Dataset Size | Training Time (RTX 4090) | Expected Quality Improvement |
|---|---|---|
| 200-500 examples | 15-30 min | Learns naming, minor style improvements |
| 500-2,000 examples | 30-90 min | Consistent style, learns most patterns |
| 2,000-5,000 examples | 2-4 hours | Near-complete domain adaptation |
| 5,000+ examples | 4+ hours | Diminishing returns unless very diverse |

If your codebase has under 500 Python files, you're likely getting 200-800 extractable functions with good docstrings. That's enough for a useful fine-tune. Don't wait to collect more data. train on what you have, evaluate, and iterate.

Maintaining the Model Over Time

Fine-tuned models go stale as your codebase evolves. Set up a quarterly re-training pipeline:

```bash
Cron job or CI scheduled workflow
python extract_functions.py --src ./src --output ./training_data_$(date +%Y%m)
python train.py --data ./training_data_$(date +%Y%m) --output ./models/$(date +%Y%m)
python convert_to_gguf.py --model ./models/$(date +%Y%m) --out ./ollama/$(date +%Y%m).gguf
```

Teams that do this find the model stays relevant as new modules and patterns are added. Skip re-training and the model increasingly suggests patterns from older code that may have been refactored away.

Frequently Asked Questions

How long does it take to fine-tune llama 3 for code completion?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Can I adapt this for a different tech stack?

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

Related Articles

- [Fine Tune Open Source Code Models for Your Codebase](/fine-tune-open-source-code-models-for-your-codebase-2026/)
- [AI Code Completion for Java Jakarta EE Migration from Javax](/ai-code-completion-for-java-jakarta-ee-migration-from-javax-/)
- [AI Code Completion for Java Record Classes and Sealed Interf](/ai-code-completion-for-java-record-classes-and-sealed-interf/)
- [AI Code Completion for Writing Shell Commands Inside Scripts](/ai-code-completion-for-writing-shell-commands-inside-scripts/)
- [AI Code Completion Latency Comparison](/ai-code-completion-latency-comparison-copilot-vs-cursor-vs-cody-2026/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
