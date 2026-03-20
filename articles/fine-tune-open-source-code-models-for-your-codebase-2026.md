---
layout: default
title: "Fine Tune Open Source Code Models for Your Codebase"
description: "Guide to adapting open source AI models to your specific codebase using LoRA, QLoRA, and supervised fine-tuning."
date: 2026-03-20
author: theluckystrike
permalink: /fine-tune-open-source-code-models-for-your-codebase-2026/
categories: [guides]
tags: [ai-tools-compared, ai, development, models, fine-tuning]
reviewed: true
score: 8
voice-checked: true
intent-checked: true
---

Fine-tuning open source code models like Code Llama, Deepseek Coder, and Mistral's Codestral on your proprietary codebase significantly improves suggestion accuracy and reduces hallucinations. Instead of generic suggestions, your AI assistant understands your team's conventions, naming patterns, and architecture. This guide shows exactly how to adapt modern models to your specific code repository.

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

## Common Pitfalls

1. **Too few training examples**: Under 300 examples doesn't create meaningful improvement. Aim for 1000+.
2. **Overfitting to old patterns**: If your codebase refactored significantly, include both old and new examples.
3. **Training on test data**: Always split 90/10 training/validation to detect overfitting.
4. **Ignoring context windows**: Code Llama supports 8K tokens; include multi-function context in prompts.

## Related Reading
- [Best AI Assistant for SQL Query Optimization](/ai-tools-compared/guides-hub/)
- [AI Tools for Writing Python FastAPI Endpoints](/ai-tools-compared/guides-hub/)
- [Fine-tuning Strategies for Different Programming Languages](/ai-tools-compared/guides-hub/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
