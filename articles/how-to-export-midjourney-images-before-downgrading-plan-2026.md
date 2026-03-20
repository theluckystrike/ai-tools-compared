---

layout: default
title: "How to Export Midjourney Images Before Downgrading Plan"
description: "A practical developer guide for exporting Midjourney images before downgrading your subscription plan in 2026. Includes API methods, batch export scripts, and preservation strategies."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-export-midjourney-images-before-downgrading-plan-2026/
categories: [guides]
score: 7
voice-checked: true
reviewed: true
intent-checked: true
---


Midjourney offers powerful AI image generation, but subscription costs add up quickly. If you're considering downgrading your plan—whether moving from Pro to Standard or Standard to Basic—you need to export your generated images first. Once you downgrade, you lose access to your previous generations stored on Midjourney's servers. This guide covers practical methods for developers and power users to export Midjourney images before downgrading, with code examples and automation strategies.



## Why Export Before Downgrading



Midjourney stores your image generations on their servers while your subscription remains active. When you downgrade, access to higher-tier features—and in some cases, your image history—becomes restricted or disappears entirely. Unlike a local-first workflow where you own everything, Midjourney's cloud-centric model means your generations live on their infrastructure until you explicitly download them.



The 2026 pricing structure shows the practical impact: Pro plan users get 2000+ fast hours monthly with full access to all features and image storage. Downgrading to Standard reduces this to 200 fast hours and limits certain advanced features. Your generated images don't automatically transfer—you must download them before the downgrade takes effect.



## Method 1: Manual Discord Export



The simplest approach uses Midjourney's built-in Discord functionality. Each generated image appears in your Discord channel with download options.



Navigate to your Midjourney server in Discord. Find the image you want to preserve. Right-click the image and select "Save Image" or use the reaction buttons (envelope icon) to have Midjourney DM you the image file. This works for individual images but becomes tedious when you have hundreds or thousands of generations to preserve.



For bulk manual export, open your server settings, go to "Privacy Settings," and enable "Allow server members to download images." This lets you right-click and save multiple images quickly in Discord's desktop or web client.



## Method 2: Discord Bot API for Automated Export



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



## Method 3: Midjourney Web Gallery Export



Midjourney's web interface at midjourney.com provides an alternative export method. Log in to your account and navigate to "Midjourney Web" or "Gallery" (the exact name varies by current UI). This web interface displays your generation history in a browsable format.



The web gallery shows thumbnails of your previous generations. Click any image to view it full-size, then use the download button to save it. For bulk export, you can open multiple images in new tabs and use a batch download approach.



The web interface has limitations—it's primarily designed for viewing rather than mass export. Large archives spanning months of generation may take considerable time to navigate and download manually.



## Method 4: Browser Automation with Puppeteer or Playwright



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



## Method 5: Using Midjourney's API (If Available)



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



## Best Practices Before Downgrading



Regardless of which export method you choose, follow these practices before downgrading your Midjourney plan:



First, export in the highest resolution available. Midjourney generates images at various resolutions, and upscaled versions offer better quality for preservation. If you have access to upscaled outputs, prioritize those over initial generations.



Second, preserve metadata alongside images. Create a simple JSON or CSV file tracking each image's prompt, generation date, parameters, and any relevant notes. This context becomes valuable when you want to revisit or recreate specific generations later.



Third, test your export method before the downgrade. Run a small batch of downloads and verify the files are accessible and undamaged. This validation prevents surprises when you need to export your entire archive.



Fourth, consider redundant storage. Save exports to multiple locations—local drive, cloud storage (Google Drive, Dropbox, AWS S3), or external backup. This protects against local hardware failures.


## Related Reading

- [Best AI Tools for Developers in 2026](/best-ai-tools-for-developers-2026/)
- [AI Tools Comparison Guide](/ai-tools-comparison-guide/)
- [AI Tools Hub](/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
