---
layout: default
title: "How to Move Midjourney Style References to Stable Diffusion"
description: "A practical guide for developers and power users on transferring Midjourney style prompts to Stable Diffusion LoRA training pipelines"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-move-midjourney-style-references-to-stable-diffusion-/
categories: [tutorials, guides]
score: 9
voice-checked: true
reviewed: true
intent-checked: true
tags: [ai-tools-compared]
---
---
layout: default
title: "How to Move Midjourney Style References to Stable Diffusion"
description: "A practical guide for developers and power users on transferring Midjourney style prompts to Stable Diffusion LoRA training pipelines"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-move-midjourney-style-references-to-stable-diffusion-/
categories: [tutorials, guides]
score: 9
voice-checked: true
reviewed: true
intent-checked: true
tags: [ai-tools-compared]
---


If you have developed a distinctive visual style in Midjourney and want to recreate it within Stable Diffusion, transferring those style references to LoRA training offers a powerful solution. This process allows you to preserve the aesthetic qualities you have cultivated, specific color grading, texture preferences, composition rules, and artistic influences, and apply them to generate new images using open-source models. This guide walks you through the technical steps for developers and power users who want to move their Midjourney expertise into the Stable Diffusion ecosystem.

Key Takeaways

- Use consistent prompting patterns: ```
/imagine prompt: [subject] --style [your-custom-parameters] --v 6 --s 250
```

Save these images in a dedicated folder.
- If you cannot collect: at least 15 images that all clearly demonstrate the same style, your LoRA will likely produce inconsistent results.
- Avoid using grid images: (the 2x2 output before upscaling) because the lower resolution hurts caption quality and training effectiveness.
- Use a rare or: nonsense token like `sks` or `xyz123style` that does not appear in normal prompts.
- This guide walks you: through the technical steps for developers and power users who want to move their Midjourney expertise into the Stable Diffusion ecosystem.
- This choice matters because: your LoRA will be anchored to the model's existing style space.

Understanding the Challenge

Midjourney and Stable Diffusion use fundamentally different approaches to image generation. Midjourney operates as a closed system where style is embedded in prompt engineering and parameter tuning. Stable Diffusion, by contrast, gives you direct control over the generation process and allows you to train custom models through LoRA (Low-Rank Adaptation) files. The goal is to extract the stylistic elements from your Midjourney workflow and encode them into a trainable format.

The core challenge involves reverse-engineering your Midjourney prompts into a training dataset that a LoRA pipeline can process. This requires collecting reference images, analyzing the prompt patterns, and preparing the data for training.

Choosing Your Base Model

Before collecting training data, decide which Stable Diffusion base model to train your LoRA against. This choice matters because your LoRA will be anchored to the model's existing style space.

| Base Model | Best For | Notes |
|---|---|---|
| SDXL 1.0 | Photorealistic and artistic styles | Highest quality, requires more VRAM (12GB+) |
| SD 1.5 | Stylized, anime, illustration | Most compatible, wide LoRA ecosystem |
| Pony Diffusion V6 | Character art, stylized | Strong for character-focused styles |
| Flux.1-dev | Photorealism, complex scenes | Newest architecture, LoRA support growing |
| Realistic Vision v6 | Photographic realism | Fine-tuned SD 1.5, excellent for portraits |

If your Midjourney style is cinematic and photorealistic, train against SDXL or Realistic Vision. For painterly or stylized aesthetics, SD 1.5 offers more community tooling and faster training.

Step 1: Collect Reference Images

The foundation of any LoRA training is a high-quality dataset. Start by generating a series of images in Midjourney that represent your target style. Aim for 20-50 images that demonstrate the consistency of your aesthetic across different subjects and compositions.

Use consistent prompting patterns:

```
/imagine prompt: [subject] --style [your-custom-parameters] --v 6 --s 250
```

Save these images in a dedicated folder. For LoRA training, you need both the images and their corresponding captions. Midjourney does not export captions automatically, so you will need to create them manually or generate them using a vision model.

For best results, vary your subjects while keeping the style constant. If your target style is "moody cinematic portrait photography with deep shadows and warm highlights," generate that style applied to different people, different environments, and different compositions. Style-consistent dataset diversity is the single most important factor in producing a generalizable LoRA.

Step 2: Generate Captions for Training

LoRA training requires text captions that describe each image. Create a captioning file for each image using the same naming convention with a `.txt` extension. For example, if you have `style_reference_01.jpg`, create `style_reference_01.txt`.

Your captions should follow a structured format:

```text
a photograph of [subject], [lighting conditions], [color palette], [texture details], [composition style]
```

For instance:

```text
a portrait of a woman, soft natural lighting, warm golden tones, smooth skin texture, shallow depth of field, cinematic composition
```

If you prefer automated captioning, you can use the BLIP model:

```python
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

def caption_image(image_path):
    image = Image.open(image_path).convert("RGB")
    inputs = processor(image, return_tensors="pt")
    output = model.generate(inputs)
    return processor.decode(output[0], skip_special_tokens=True)

Example usage
caption = caption_image("style_reference_01.jpg")
print(caption)
```

This generates descriptive captions that the LoRA training process will use to associate visual features with text tokens.

A better alternative for 2025-2026 is using Florence-2 or LLaVA for captioning, as they produce more detailed and accurate descriptions than BLIP:

```python
from transformers import AutoProcessor, AutoModelForCausalLM
import torch
from PIL import Image

model_id = "microsoft/Florence-2-large"
processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True, torch_dtype=torch.float16).cuda()

def caption_detailed(image_path):
    image = Image.open(image_path).convert("RGB")
    inputs = processor(text="<MORE_DETAILED_CAPTION>", images=image, return_tensors="pt").to("cuda", torch.float16)
    generated_ids = model.generate(inputs, max_new_tokens=1024)
    return processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
```

Step 3: Configure the Training Pipeline

With your image-caption pairs ready, set up your LoRA training environment. The most common tools are Kohya's LoRA Trainer or the SD-Trainer. Install the required dependencies:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install diffusers accelerate transformers
```

Create a training configuration file. Here is a minimal example using Kohya's format:

```toml
[general]
pretrained_model_name_or_path = "runwayml/stable-diffusion-v1-5"
output_dir = "./lora_output"
output_name = "midjourney-style-transfer"

[datasets]
resolution = 512
batch_size = 4
num_epochs = 10
learning_rate = 1e-4

[lora]
network_dim = 128
network_alpha = 64
```

Adjust the parameters based on your GPU memory and dataset size. A network dimension of 128 works well for style transfer, though you can increase to 256 for more nuanced styles.

Step 4: Prepare Dataset Structure

Organize your files in the structure expected by the training script:

```
dataset/
 meta_latent.csv
 image/
     style_reference_01.jpg
     style_reference_01.txt
     style_reference_02.jpg
     style_reference_02.txt
     ...
```

The CSV file maps images to their captions:

```csv
file_name,text
style_reference_01.jpg,a photograph of a woman, soft natural lighting...
style_reference_02.jpg,a landscape with mountains, golden hour...
```

Step 5: Execute Training

Run the training script with your configuration:

```bash
python sd-scripts/train_network.py \
  --pretrained_model_name_or_path=runwayml/stable-diffusion-v1-5 \
  --train_data_dir=./dataset \
  --output_dir=./lora_output \
  --output_name=midjourney-style-transfer \
  --network_dim=128 \
  --network_alpha=64 \
  --learning_rate=1e-4 \
  --max_train_steps=1000 \
  --save_every_n_steps=100
```

Monitor the training loss. A successful style LoRA typically shows convergence within 500-1000 steps depending on dataset size and complexity.

For SDXL training, the command differs slightly. Use `train_network.py` with `--sdxl` flag and a higher resolution:

```bash
python sd-scripts/train_network.py \
  --sdxl \
  --pretrained_model_name_or_path=stabilityai/stable-diffusion-xl-base-1.0 \
  --train_data_dir=./dataset \
  --output_dir=./lora_output_xl \
  --output_name=midjourney-style-sdxl \
  --network_dim=64 \
  --network_alpha=32 \
  --learning_rate=4e-4 \
  --resolution=1024,1024 \
  --max_train_steps=1500
```

SDXL LoRAs typically use lower `network_dim` values (32-64) to avoid overfitting on smaller datasets.

Step 6: Test Your LoRA

After training completes, test the LoRA with a Stable Diffusion pipeline:

```python
import torch
from diffusers import StableDiffusionPipeline
from peft import PeftModel, PeftConfig

peft_config = PeftConfig.from_pretrained("./lora_output/midjourney-style-transfer")
base_model = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16
)

model = PeftModel.from_pretrained(base_model, "./lora_output/midjourney-style-transfer")
model = model.to("cuda")

prompt = "a woman portrait, cinematic lighting, warm tones, your-style-trigger-word"
image = model(prompt, num_inference_steps=50).images[0]
image.save("output.png")
```

The trigger word in your prompt activates the style learned during training.

For ComfyUI users, load the LoRA via the `Load LoRA` node and connect it between your checkpoint loader and the KSampler. Set the LoRA strength between 0.6-1.0 and adjust until you find the right balance between style adherence and prompt flexibility.

Common Issues and Solutions

Overfitting: If your LoRA produces images too similar to training data, reduce `network_dim` or increase dataset diversity. Signs of overfitting include the same facial features or backgrounds appearing regardless of the prompt.

Weak Style Transfer: If the style is not prominent enough, increase `network_dim` to 256 and extend training steps. Also check that your captions consistently describe the stylistic elements rather than just the subjects.

Artifacting: This often indicates too-high learning rate. Reduce `learning_rate` to `5e-5` and restart training. Artifacts typically appear as warped textures or incoherent areas in generated images.

Style Bleeding: If the LoRA applies your style even at low strength values and overrides the base model's capabilities, reduce `network_alpha`. The ratio of `network_dim` to `network_alpha` controls how strongly the LoRA modifies the base model's attention layers.

Frequently Asked Questions

How many images do I actually need for a style LoRA?

20-30 high-quality, style-consistent images often outperform 100 inconsistent ones. Quality and stylistic coherence matter more than raw count. If you cannot collect at least 15 images that all clearly demonstrate the same style, your LoRA will likely produce inconsistent results.

Can I train on Midjourney upscaled images?

Yes, upscaled images (U1-U4 in Midjourney) work well for training. Avoid using grid images (the 2x2 output before upscaling) because the lower resolution hurts caption quality and training effectiveness. Always use the highest resolution Midjourney outputs available.

Does the trigger word matter?

The trigger word is a token that the LoRA associates with your style during training. Use a rare or nonsense token like `sks` or `xyz123style` that does not appear in normal prompts. This ensures the LoRA activates predictably without accidentally firing on common vocabulary. Add it consistently to all your training captions.

Can I merge my style LoRA with other LoRAs?

Yes. Tools like `kohya-ss` and `sd-scripts` include a `merge_lora.py` script for combining multiple LoRAs at different weights. This lets you combine a style LoRA with a character or object LoRA. Keep total LoRA weight below 1.5 combined to avoid artifacts.

Related Articles

- [Move Stable Diffusion Workflows to Midjourney](/how-to-move-stable-diffusion-workflows-to-midjourney-equivalent-setup/)
- [Stable Diffusion vs Midjourney for Character Design](/stable-diffusion-vs-midjourney-for-character-design/)
- [DALL-E 3 vs Stable Diffusion for Illustrations](/dall-e-3-vs-stable-diffusion-for-illustrations/)
- [Stable Diffusion ComfyUI vs Automatic1111 Comparison](/stable-diffusion-comfyui-vs-automatic1111-comparison/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
```
