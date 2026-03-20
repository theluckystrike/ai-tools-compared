---
layout: default
title: "How to Move Midjourney Style References to Stable Diffusion LoRA Training"
description:"A practical guide for developers and power users on transferring Midjourney style prompts to Stable Diffusion LoRA training pipelines."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-move-midjourney-style-references-to-stable-diffusion-/
categories: [tutorials, guides]
score: 7
voice-checked: true
reviewed: true
intent-checked: true
---


If you have developed a distinctive visual style in Midjourney and want to recreate it within Stable Diffusion, transferring those style references to LoRA training offers a powerful solution. This process allows you to preserve the aesthetic qualities you have cultivated—specific color grading, texture preferences, composition rules, and artistic influences—and apply them to generate new images using open-source models. This guide walks you through the technical steps for developers and power users who want to move their Midjourney expertise into the Stable Diffusion ecosystem.



## Understanding the Challenge



Midjourney and Stable Diffusion use fundamentally different approaches to image generation. Midjourney operates as a closed system where style is embedded in prompt engineering and parameter tuning. Stable Diffusion, by contrast, gives you direct control over the generation process and allows you to train custom models through LoRA (Low-Rank Adaptation) files. The goal is to extract the stylistic elements from your Midjourney workflow and encode them into a trainable format.



The core challenge involves reverse-engineering your Midjourney prompts into a training dataset that a LoRA pipeline can process. This requires collecting reference images, analyzing the prompt patterns, and preparing the data for training.



## Step 1: Collect Reference Images



The foundation of any LoRA training is a high-quality dataset. Start by generating a series of images in Midjourney that represent your target style. Aim for 20-50 images that demonstrate the consistency of your aesthetic across different subjects and compositions.



Use consistent prompting patterns:



```
/imagine prompt: [subject] --style [your-custom-parameters] --v 6 --s 250
```


Save these images in a dedicated folder. For LoRA training, you need both the images and their corresponding captions. Midjourney does not export captions automatically, so you will need to create them manually or generate them using a vision model.



## Step 2: Generate Captions for Training



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
    output = model.generate(**inputs)
    return processor.decode(output[0], skip_special_tokens=True)

# Example usage
caption = caption_image("style_reference_01.jpg")
print(caption)
```


This generates descriptive captions that the LoRA training process will use to associate visual features with text tokens.



## Step 3: Configure the Training Pipeline



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



## Step 4: Prepare Dataset Structure



Organize your files in the structure expected by the training script:



```
dataset/
├── meta_latent.csv
└── image/
    ├── style_reference_01.jpg
    ├── style_reference_01.txt
    ├── style_reference_02.jpg
    ├── style_reference_02.txt
    └── ...
```


The CSV file maps images to their captions:



```csv
file_name,text
style_reference_01.jpg,a photograph of a woman, soft natural lighting...
style_reference_02.jpg,a landscape with mountains, golden hour...
```


## Step 5: Execute Training



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



## Step 6: Test Your LoRA



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



## Common Issues and Solutions



Overfitting: If your LoRA produces images too similar to training data, reduce network_dim or increase dataset diversity.



Weak Style Transfer: If the style is not prominent enough, increase network_dim to 256 and extend training steps.



Artifacting: This often indicates too-high learning rate. Reduce learning_rate to 5e-5 and restart training.


## Related Reading

- [Best AI Tools for Developers in 2026](/best-ai-tools-for-developers-2026/)
- [AI Tools Comparison Guide](/ai-tools-comparison-guide/)
- [AI Tools Hub](/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
