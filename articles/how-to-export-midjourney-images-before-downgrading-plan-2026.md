---
layout: default
title: "How to Export Midjourney Images Before Downgrading Plan"
description: "A practical developer guide for exporting Midjourney images before downgrading your subscription plan in 2026. Includes API methods, batch export"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-export-midjourney-images-before-downgrading-plan-2026/
categories: [guides]
score: 9
voice-checked: true
reviewed: true
intent-checked: true
tags: [ai-tools-compared]
---
---
layout: default
title: "How to Export Midjourney Images Before Downgrading Plan"
description: "A practical developer guide for exporting Midjourney images before downgrading your subscription plan in 2026. Includes API methods, batch export"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-export-midjourney-images-before-downgrading-plan-2026/
categories: [guides]
score: 8
voice-checked: true
reviewed: true
intent-checked: true
tags: [ai-tools-compared]
---


Midjourney offers powerful AI image generation, but subscription costs add up quickly. If you're considering downgrading your plan, whether moving from Pro to Standard or Standard to Basic, you need to export your generated images first. Once you downgrade, you lose access to your previous generations stored on Midjourney's servers. This guide covers practical methods for developers and power users to export Midjourney images before downgrading, with code examples and automation strategies.


- The 2026 pricing structure: shows the practical impact: Pro plan users get 2000+ fast hours monthly with full access to all features and image storage.
- This guide covers practical: methods for developers and power users to export Midjourney images before downgrading, with code examples and automation strategies.
- Downgrading to Standard reduces: this to 200 fast hours and limits certain advanced features.
- Right-click the image and: select "Save Image" or use the reaction buttons (envelope icon) to have Midjourney DM you the image file.
- Then use a library: like discord.js to listen for Midjourney bot responses and extract image URLs.
- Click any image to view it full-size: then use the download button to save it.

Why Export Before Downgrading

Midjourney stores your image generations on their servers while your subscription remains active. When you downgrade, access to higher-tier features, and in some cases, your image history, becomes restricted or disappears entirely. Unlike a local-first workflow where you own everything, Midjourney's cloud-centric model means your generations live on their infrastructure until you explicitly download them.

The 2026 pricing structure shows the practical impact: Pro plan users get 2000+ fast hours monthly with full access to all features and image storage. Downgrading to Standard reduces this to 200 fast hours and limits certain advanced features. Your generated images don't automatically transfer, you must download them before the downgrade takes effect.

Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


Step 1 - Method 1: Manual Discord Export

The simplest approach uses Midjourney's built-in Discord functionality. Each generated image appears in your Discord channel with download options.

Navigate to your Midjourney server in Discord. Find the image you want to preserve. Right-click the image and select "Save Image" or use the reaction buttons (envelope icon) to have Midjourney DM you the image file. This works for individual images but becomes tedious when you have hundreds or thousands of generations to preserve.

For bulk manual export, open your server settings, go to "Privacy Settings," and enable "Allow server members to download images." This lets you right-click and save multiple images quickly in Discord's desktop or web client.

Step 2 - Method 2: Discord Bot API for Automated Export

Developers can automate image export using Discord's API. This approach requires more setup but scales to hundreds or thousands of images.

First, create a Discord bot through the Discord Developer Portal. Add the bot to your Midjourney server with appropriate permissions (read messages, read message history). Then use a library like discord.js to listen for Midjourney bot responses and extract image URLs.

Here's a practical Node.js example:

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const https = require('https');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const imageDir = './midjourney-exports';

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }
});

client.on('messageCreate', async (message) => {
  // Check if message is from Midjourney bot
  if (message.author.id === '936929561302675456' && message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment.url && attachment.url.endsWith('.png')) {
      const filename = `${Date.now()}-${attachment.name}`;
      downloadImage(attachment.url, `${imageDir}/${filename}`);
      console.log(`Downloaded: ${filename}`);
    }
  }
});

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

client.login('YOUR_BOT_TOKEN');
```

This script listens for messages from the Midjourney bot (user ID 936929561302675456) and automatically downloads any attached images. Run this while you're actively generating images to capture everything in real-time.

Step 3 - Method 3: Midjourney Web Gallery Export

Midjourney's web interface at midjourney.com provides an alternative export method. Log in to your account and navigate to "Midjourney Web" or "Gallery" (the exact name varies by current UI). This web interface displays your generation history in a browsable format.

The web gallery shows thumbnails of your previous generations. Click any image to view it full-size, then use the download button to save it. For bulk export, you can open multiple images in new tabs and use a batch download approach.

The web interface has limitations, it's primarily designed for viewing rather than mass export. Large archives spanning months of generation may take considerable time to navigate and download manually.

Step 4 - Method 4: Browser Automation with Puppeteer or Playwright

For large archives, browser automation provides the most powerful solution. Use Puppeteer or Playwright to programmatically navigate your Midjourney web gallery and download images at scale.

```javascript
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function exportMidjourneyGallery() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.midjourney.com/account');
  // You'll need to handle login manually or use stored cookies

  const outputDir = './gallery-exports';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Scroll and collect image URLs
  const imageUrls = await page.evaluate(() => {
    const images = document.querySelectorAll('.gallery-image, img[src*="midjourney"]');
    return Array.from(images).map(img => img.src).filter(src => src.includes('blob') || src.includes('cdn'));
  });

  console.log(`Found ${imageUrls.length} images to export`);

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const response = await page.request.get(url);
      const buffer = await response.body();
      fs.writeFileSync(path.join(outputDir, `image-${i}.png`), buffer);
      console.log(`Saved image ${i + 1}/${imageUrls.length}`);
    } catch (err) {
      console.error(`Failed to download image ${i}:`, err.message);
    }
  }

  await browser.close();
}

exportMidjourneyGallery().catch(console.error);
```

This approach gives you programmatic control over the export process. You can enhance it with rate limiting, retry logic, and progress tracking for large archives.

Step 5 - Method 5: Using Midjourney's API (If Available)

Midjourney has been gradually rolling out official API access to select partners and enterprise customers. If you have API access, you can query your generation history programmatically.

Check the Midjourney developer documentation for current API availability. If accessible, authentication typically uses API keys, and you can retrieve generation history with endpoints similar to:

```python
import requests

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(
    "https://api.midjourney.com/v1/users/me/generations",
    headers=headers,
    params={"limit": 100, "offset": 0}
)

generations = response.json()["data"]
for gen in generations:
    image_url = gen["image_url"]
    # Download and save the image
```

This method provides the cleanest integration but remains limited to users with official API access.

Best Practices Before Downgrading

Regardless of which export method you choose, follow these practices before downgrading your Midjourney plan:

First, export in the highest resolution available. Midjourney generates images at various resolutions, and upscaled versions offer better quality for preservation. If you have access to upscaled outputs, prioritize those over initial generations.

Second, preserve metadata alongside images. Create a simple JSON or CSV file tracking each image's prompt, generation date, parameters, and any relevant notes. This context becomes valuable when you want to revisit or recreate specific generations later.

Third, test your export method before the downgrade. Run a small batch of downloads and verify the files are accessible and undamaged. This validation prevents surprises when you need to export your entire archive.

Fourth, consider redundant storage. Save exports to multiple locations, local drive, cloud storage (Google Drive, Dropbox, AWS S3), or external backup. This protects against local hardware failures.

Step 6 - Automated Batch Export with Python

For developers managing large Midjourney archives, Python automation provides efficient bulk export:

```python
import asyncio
import aiohttp
import os
from datetime import datetime

class MidjourneyExporter:
    def __init__(self, message_ids, output_dir="./exports"):
        self.message_ids = message_ids
        self.output_dir = output_dir
        self.session = None

    async def setup(self):
        """Initialize async session."""
        self.session = aiohttp.ClientSession()
        os.makedirs(self.output_dir, exist_ok=True)

    async def download_image(self, image_url, filename):
        """Download single image with retry logic."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with self.session.get(image_url, timeout=30) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        filepath = os.path.join(self.output_dir, filename)
                        with open(filepath, 'wb') as f:
                            f.write(content)
                        print(f"Downloaded: {filename}")
                        return True
            except asyncio.TimeoutError:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2  attempt)  # Exponential backoff
                continue
        print(f"Failed to download: {filename}")
        return False

    async def export_all(self):
        """Download all images concurrently."""
        tasks = []
        for idx, image_url in enumerate(self.message_ids):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"midjourney_{timestamp}_{idx}.png"
            task = self.download_image(image_url, filename)
            tasks.append(task)

        results = await asyncio.gather(*tasks)
        return sum(results)

    async def cleanup(self):
        """Close session."""
        await self.session.close()

Usage
async def main():
    image_urls = [
        "https://cdn.midjourney.com/image1.png",
        "https://cdn.midjourney.com/image2.png"
    ]
    exporter = MidjourneyExporter(image_urls)
    await exporter.setup()
    downloaded = await exporter.export_all()
    await exporter.cleanup()
    print(f"Exported {downloaded} images successfully")

asyncio.run(main())
```

Step 7 - Metadata Management

Preserve context alongside your images to make future retrieval easier:

```python
import json
from datetime import datetime

class ImageMetadata:
    def __init__(self, output_dir="./exports"):
        self.output_dir = output_dir
        self.metadata_file = os.path.join(output_dir, "metadata.json")
        self.catalog = []

    def add_image(self, filename, prompt, parameters=None, generation_time=None):
        """Add image metadata to catalog."""
        entry = {
            "filename": filename,
            "prompt": prompt,
            "created_at": generation_time or datetime.now().isoformat(),
            "parameters": parameters or {},
            "exported_at": datetime.now().isoformat()
        }
        self.catalog.append(entry)

    def save(self):
        """Write metadata to JSON file."""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.catalog, f, indent=2)

Usage
metadata = ImageMetadata("./exports")
metadata.add_image(
    "midjourney_001.png",
    "A cyberpunk city at night with neon signs reflecting on wet streets",
    {"model": "midjourney v5.2", "aspect_ratio": "16:9"}
)
metadata.save()
```

Step 8 - Organizing Exported Images

Create a structured directory layout for easy navigation:

```
exports/
 2026_march/
    landscapes/
       mountain_range_001.png
       sunset_ocean_002.png
    character_designs/
       hero_concept_001.png
       villain_sketches_001.png
 2026_february/
 metadata.json
```

Script to organize by category:

```python
import shutil
import os
from pathlib import Path

def organize_exports(base_dir, category_mapping):
    """
    Organize images into categories based on filename patterns.
    category_mapping: dict mapping pattern to folder name
    {"space": "fields", "character": "characters"}
    """
    for filename in os.listdir(base_dir):
        if not filename.endswith(('.png', '.jpg', '.jpeg')):
            continue

        target_folder = "other"
        for pattern, folder_name in category_mapping.items():
            if pattern.lower() in filename.lower():
                target_folder = folder_name
                break

        target_path = os.path.join(base_dir, target_folder)
        os.makedirs(target_path, exist_ok=True)

        src = os.path.join(base_dir, filename)
        dst = os.path.join(target_path, filename)
        shutil.move(src, dst)
        print(f"Moved {filename} to {target_folder}/")

Usage
organize_exports(
    "./exports",
    {
        "market": "markets",
        "character": "characters",
        "architecture": "architecture",
        "texture": "textures"
    }
)
```

Step 9 - Downgrade Timeline Checklist

Two Weeks Before Downgrade:
- Review your generation history
- Identify images worth preserving
- Test export method on small sample (10-20 images)

One Week Before:
- Begin export process for high-value images
- Verify exports are complete and accessible
- Back up exported images to cloud storage

Three Days Before:
- Export remaining images
- Test compressed archives (if using ZIP)
- Confirm cloud backups are complete

Day Before Downgrade:
- Final verification that all important images are locally available
- Test cloud backup access from different device
- Make note of any images still in progress

After Downgrade:
- Attempt to access images through Midjourney web interface (confirm they're gone)
- Verify local and cloud backups are intact
- Delete temporary export files from device if storage is tight

Step 10 - Storage Calculation

Before exporting, estimate storage needs:

- Single image: 2-4 MB (PNG), 1-2 MB (JPG)
- 100 images: 200-400 MB
- 1,000 images: 2-4 GB
- Pro plan user (2000+ hours): Approximately 20,000-50,000 images = 40-200 GB

For reference:
- USB 3.0 drive: $20-50 for 256 GB
- External hard drive: $50-100 for 1-2 TB
- Google One plan (2TB): $9.99/month
- AWS S3 storage: $0.023/GB/month (1TB = ~$24/month)

Choose storage method based on your collection size and access patterns.

Troubleshooting

Configuration changes not taking effect

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

Permission denied errors

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

Connection or network-related failures

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


Frequently Asked Questions

How long does it take to export midjourney images before downgrading plan?

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

- [How to Export Dall E Generated Images at Full Resolution](/how-to-export-dall-e-generated-images-at-full-resolution-before-leaving/)
- [Ideogram vs Midjourney for Text in Images Compared](/ideogram-vs-midjourney-for-text-in-images-compared/)
- [Midjourney Basic Plan Image Limits Per Month: Real Numbers](/midjourney-basic-plan-image-limits-per-month-real-numbers-20/)
- [Midjourney Standard vs Pro Plan: Is Stealth Mode Worth](/midjourney-standard-vs-pro-plan-stealth-mode-worth-extra-cost/)
- [AI Tools for Generating Website Hero Images Compared](/ai-tools-for-generating-website-hero-images-compared/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)
