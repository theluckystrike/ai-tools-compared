---
layout: default
title: "How to Migrate ChatGPT Plugins"
description: "A practical guide for developers and power users to migrate ChatGPT plugins to Custom GPTs. Includes code examples and best practices"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /migrate-chatgpt-plugins-to-custom-gpts-step-by-step-2026/
categories: [guides]
tags: [ai-tools-compared, tools, chatgpt]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Migrate a ChatGPT Plugin to a Custom GPT by exporting your existing OpenAPI specification, creating a new GPT in the GPT Builder, pasting the spec into the Actions configuration panel, mapping your authentication settings, and testing each endpoint. The process reuses your plugin's API server and OpenAPI schema directly, so the backend stays the same while the configuration moves into the GPT Builder interface. This step-by-step guide covers the full migration with code examples for both manual and programmatic approaches.

## Table of Contents

- [Understanding the Architecture Differences](#understanding-the-architecture-differences)
- [Step 1: Audit Your Current Plugin](#step-1-audit-your-current-plugin)
- [Step 2: Export Your OpenAPI Specification](#step-2-export-your-openapi-specification)
- [Step 3: Create Your Custom GPT](#step-3-create-your-custom-gpt)
- [Step 4: Configure Authentication](#step-4-configure-authentication)
- [Step 5: Test Your Migrated GPT](#step-5-test-your-migrated-gpt)
- [Step 6: Deploy and Monitor](#step-6-deploy-and-monitor)
- [Advanced: Programmatic GPT Creation](#advanced-programmatic-gpt-creation)
- [Writing Effective System Prompts for Migrated GPTs](#writing-effective-system-prompts-for-migrated-gpts)
- [Migrating Multiple Plugins: Batch Automation Script](#migrating-multiple-plugins-batch-automation-script)
- [Plugin Migration Compatibility Reference](#plugin-migration-compatibility-reference)

## Understanding the Architecture Differences

ChatGPT Plugins and Custom GPTs serve similar purposes but operate differently under the hood. Plugins used a manifest file (`ai-plugin.json`) and OpenAPI specifications to define endpoints. Custom GPTs use Actions, which are conceptually similar but require a different setup approach through the GPT Builder interface or the Assistants API.

The key distinction is that plugins required external server hosting with a publicly accessible HTTPS endpoint. Custom GPTs with Actions can connect to APIs the same way, but also benefit from a more improved configuration process directly within ChatGPT.

## Step 1: Audit Your Current Plugin

Before migrating, document your plugin's current functionality. Create a checklist of:

- All endpoints your plugin exposes

- Authentication requirements (API keys, OAuth flows)

- Input/output schemas for each action

- Any third-party dependencies

For example, a typical plugin manifest looks like this:

```json
{
  "name_for_model": "weather_plugin",
  "name_for_human": "Weather Reporter",
  "description_for_model": "Fetches current weather data for any location",
  "auth": {
    "type": "none"
  },
  "api": {
    "type": "openapi",
    "url": "https://api.example.com/openapi.yaml"
  }
}
```

## Step 2: Export Your OpenAPI Specification

Your plugin's OpenAPI specification is the foundation for your Custom GPT Action. Locate your `openapi.yaml` or `openapi.json` file from the plugin repository. Review it for compatibility with the Custom GPT Actions format.

Key adjustments you may need to make:

- Ensure all endpoints use HTTPS

- Verify response schemas are properly defined

- Add operation IDs if missing (required for Actions)

```yaml
openapi: 3.0.0
info:
  title: Weather API
  version: 1.0.0
paths:
  /weather:
    get:
      operationId: getWeather
      summary: Get current weather
      parameters:
        - name: location
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Weather data
          content:
            application/json:
              schema:
                type: object
                properties:
                  temperature:
                    type: number
                  conditions:
                    type: string
```

## Step 3: Create Your Custom GPT

Navigate to ChatGPT and access the GPT Builder:

1. Click your profile menu and select "My GPTs"

2. Click "Create a GPT"

3. Give your GPT a name and description

4. Configure the Capabilities (Web Browsing, DALL-E Image Generation, Code Interpreter)

5. Add your Action using the OpenAPI specification

In the Actions configuration panel, paste your refined OpenAPI specification. The GPT Builder will parse your endpoints and generate a configuration interface.

## Step 4: Configure Authentication

Custom GPT Actions support multiple authentication methods. Map your plugin's auth configuration to the appropriate Action auth type:

| Plugin Auth Type | Custom GPT Action Auth |
|-----------------|----------------------|
| None | No authentication |
| API Key | Header or query parameter |
| OAuth 2.0 | OAuth 2.0 configuration |

For API key authentication in Actions, specify how the key should be passed:

```yaml
securitySchemes:
  apiKey:
    type: apiKey
    in: header
    name: X-API-Key
security:
  - apiKey: []
```

Configure the authentication credentials in the Action settings panel, providing your API key or OAuth client credentials.

## Step 5: Test Your Migrated GPT

The GPT Builder provides a testing panel where you can interact with your Custom GPT and verify the Actions work correctly. Run through each endpoint:

1. Ask your GPT to perform an action your plugin supported

2. Verify the API call executes successfully

3. Check the response formatting matches expectations

4. Test error handling with invalid inputs

Common issues during testing include:

- Missing authentication headers

- Incorrect parameter types

- API rate limiting

- Response parsing errors

Address each issue by adjusting your OpenAPI specification or updating the Action configuration.

## Step 6: Deploy and Monitor

Once testing passes, save your Custom GPT and decide on visibility:

- Private: Only you can use the GPT

- Link sharing: Anyone with the link can use it

- Public: Listed in the GPT Store (if available in your region)

Monitor usage through the My GPTs dashboard. Track API call volumes and response times to ensure your backend can handle the load.

## Advanced: Programmatic GPT Creation

For bulk migrating multiple plugins, use the Assistants API to create Custom GPTs programmatically:

```python
from openai import OpenAI

client = OpenAI(api_key="your-api-key")

assistant = client.beta.assistants.create(
    name="Weather Reporter",
    description="Fetches current weather data for any location",
    model="gpt-4o",
    tools=[
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get current weather for a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "City name or coordinates"
                        }
                    },
                    "required": ["location"]
                }
            }
        }
    ]
)
```

This approach gives you version control over your GPT configurations and enables CI/CD pipelines for GPT management.

## Writing Effective System Prompts for Migrated GPTs

One area where Custom GPTs diverge significantly from plugins is the system prompt. Plugins relied entirely on the `description_for_model` field in the manifest to guide behavior. Custom GPTs have a full system prompt field where you can provide detailed instructions, personas, and constraints.

When migrating, translate your plugin's `description_for_model` into a richer system prompt:

**Plugin manifest approach (limited):**
```json
{
  "description_for_model": "Fetches current weather data for any location. Use this when users ask about weather."
}
```

**Custom GPT system prompt approach (expanded):**
```
You are a weather assistant. When users ask about current conditions, forecasts,
or weather-related travel planning, call the getWeather action with the
location they specify.

Always:
- Ask for clarification if the location is ambiguous
- Present temperatures in both Celsius and Fahrenheit
- Include a brief description of what the conditions mean practically
  (e.g., "light rain — bring an umbrella")
- Suggest follow-up questions like "Would you like a 5-day forecast?"

Never fabricate weather data if the API call fails — inform the user that
the service is temporarily unavailable.
```

The system prompt investment pays off in user experience. Take time to write instructions that match how your plugin originally behaved, then extend them with behaviors the constrained manifest format could not express.

## Migrating Multiple Plugins: Batch Automation Script

If you have more than two or three plugins to migrate, automate the process. This script reads plugin manifests from a directory and creates corresponding Assistants API configurations:

```python
import json
import os
from pathlib import Path
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

def load_plugin_manifest(manifest_path: str) -> dict:
    with open(manifest_path) as f:
        return json.load(f)

def load_openapi_spec(spec_url: str) -> dict:
    import requests
    response = requests.get(spec_url)
    response.raise_for_status()
    return response.json()

def migrate_plugin_to_assistant(manifest_path: str) -> str:
    manifest = load_plugin_manifest(manifest_path)
    openapi_spec = load_openapi_spec(manifest["api"]["url"])

    # Extract function definitions from OpenAPI paths
    tools = []
    for path, methods in openapi_spec.get("paths", {}).items():
        for method, operation in methods.items():
            if method in ("get", "post", "put", "delete"):
                tool = {
                    "type": "function",
                    "function": {
                        "name": operation.get("operationId", f"{method}_{path.replace('/', '_')}"),
                        "description": operation.get("summary", ""),
                        "parameters": {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    }
                }
                tools.append(tool)

    assistant = client.beta.assistants.create(
        name=manifest["name_for_human"],
        description=manifest["description_for_model"],
        model="gpt-4o",
        tools=tools
    )
    return assistant.id

# Migrate all plugins in a directory
plugin_dir = Path("./plugins")
for manifest_file in plugin_dir.glob("*/ai-plugin.json"):
    assistant_id = migrate_plugin_to_assistant(str(manifest_file))
    print(f"Migrated {manifest_file.parent.name} -> Assistant ID: {assistant_id}")
```

This script handles the mechanical conversion. You will still need to review each generated assistant and refine its system prompt and tool definitions manually.

## Plugin Migration Compatibility Reference

Not all plugin features translate cleanly to Custom GPTs. Use this reference when auditing your plugins:

| Plugin Feature | Custom GPT Equivalent | Migration Effort |
|---------------|----------------------|-----------------|
| `description_for_model` | System prompt | Low — expand and refine |
| `description_for_human` | GPT name + description fields | Low — copy directly |
| No-auth API | Action with no auth | Low — paste OpenAPI spec |
| API key auth | Action with API key auth | Low — configure in Actions panel |
| OAuth 2.0 | Action with OAuth 2.0 | Medium — reconfigure client credentials |
| Logo / branding | GPT profile image | Low — upload image |
| Legal / privacy URLs | GPT Builder info fields | Low — paste URLs |
| `contact_email` | Not required in Custom GPTs | None — field removed |
| Multiple endpoints | Multiple operations in one Action | Low — single spec covers all |

## Frequently Asked Questions

**Q: Do I need to change my backend API when migrating from a plugin to a Custom GPT?**

No. Your API server stays identical. Only the configuration layer changes — from the `ai-plugin.json` manifest to the GPT Builder Actions interface. The API endpoints, authentication logic, and response formats remain unchanged.

**Q: Can a single Custom GPT replace multiple plugins?**

Yes. A Custom GPT can have a single OpenAPI specification that covers all your plugin endpoints. Consolidating multiple plugins into one Custom GPT simplifies user experience and reduces the number of GPTs you need to maintain.

**Q: What happens to users who were using my plugin before?**

ChatGPT Plugins are deprecated, so existing plugin users need to discover and install your Custom GPT separately. Share the Custom GPT link with your existing users and post it wherever you originally promoted the plugin.

**Q: My plugin used OAuth. How do I set that up in a Custom GPT?**

In the Actions configuration panel, select "OAuth" as the authentication type. Enter your OAuth client ID, client secret, authorization URL, and token URL. The GPT Builder handles the OAuth flow for users automatically after this configuration.

**Q: Can I test Actions against a local development server?**

Not directly through the GPT Builder interface, which requires publicly accessible HTTPS URLs. Use a tunneling tool like ngrok or Cloudflare Tunnel to expose your local server temporarily during development and testing.

## Related Articles

- [ChatGPT Plugins Replacement Custom Gpts Pricing](/chatgpt-plugins-replacement-custom-gpts-pricing-for-developers/)
- [Transfer ChatGPT Custom GPTs to Claude Projects Step by Step](/transfer-chatgpt-custom-gpts-to-claude-projects-step-by-step/)
- [Do ChatGPT Plus Memory and Custom GPTs Count Toward](/chatgpt-plus-memory-and-custom-gpts-count-toward-usage-limit/)
- [Migrate Jasper AI Brand Voice Settings to ChatGPT Custom Ins](/migrate-jasper-ai-brand-voice-settings-to-chatgpt-custom-ins/)
- [Migrating from ChatGPT Plugins to Claude MCP Tools for.](/migrating-from-chatgpt-plugins-to-claude-mcp-tools-for-coding-workflows/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
