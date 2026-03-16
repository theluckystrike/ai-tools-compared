---
layout: default
title: "Chrome Enterprise Extension Management API: A Complete Guide for Developers"
description: "Learn how to programmatically manage Chrome extensions in your organization using the Chrome Enterprise Extension Management API. Practical examples and code snippets included."
date: 2026-03-15
author: theluckystrike
permalink: /chrome-enterprise-extension-management-api/
---

{% raw %}
The Chrome Enterprise Extension Management API provides a powerful way for organizations to programmatically control Chrome browser extensions across their managed devices. If you're an IT administrator or developer responsible for Chrome deployments in enterprise environments, understanding this API opens up significant automation possibilities.

## What the API Offers

The Chrome Enterprise Extension Management API is a RESTful API that integrates with Google Admin Console. It enables you to query installed extensions, install new extensions organization-wide, uninstall extensions, and retrieve detailed extension information. This capability is particularly valuable for large organizations managing hundreds or thousands of Chrome installations.

The API operates at the organizational unit (OU) level, allowing granular control over which extensions are available to different groups within your organization. You can target specific departments, locations, or device types with different extension configurations.

## Authentication Setup

Before making API calls, you need to configure authentication. The API uses OAuth 2.0 and requires a service account with appropriate admin privileges. Here's how to set it up:

1. Create a service account in Google Cloud Console
2. Enable the Chrome Enterprise API in your project
3. Grant the service account admin privileges in Google Admin Console
4. Download your JSON key file

You'll need to obtain an access token for each API request. Here's a Python example for authentication:

```python
import google.auth
from google.oauth2 import service_account

SCOPES = ['https://www.googleapis.com/auth/chrome.management']

def get_access_token():
    credentials = service_account.Credentials.from_service_account_file(
        'service-account-key.json',
        scopes=SCOPES
    )
    credentials.refresh(google.auth.transport.requests.Request())
    return credentials.token
```

## Listing Extensions

One of the most common operations is listing extensions installed in your organization. The API allows you to query extensions at the organizational unit level or across the entire domain.

```python
import requests

def list_extensions(org_unit_id, access_token):
    url = f'https://chromeenterprise.googleapis.com/v1/organizations/{org_unit_id}/extensions'
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json().get('extensions', [])
    else:
        print(f'Error: {response.status_code} - {response.text}')
        return []

# Usage
extensions = list_extensions('org-unit-id-123', access_token)
for ext in extensions:
    print(f"{ext['name']} - {ext['version']} (ID: {ext['extensionId']})")
```

The response includes detailed information about each extension: name, version, extension ID, permissions requested, and installation source. This data helps you maintain visibility into what extensions exist across your fleet.

## Installing Extensions Organization-Wide

Deploying extensions to users becomes straightforward with the API. You can push extensions to specific organizational units, ensuring the right teams have the tools they need.

```python
def install_extension(org_unit_id, extension_id, access_token):
    url = f'https://chromeenterprise.googleapis.com/v1/organizations/{org_unit_id}/extensions'
    
    payload = {
        'extensionId': extension_id,
        'installType': 'FORCE_INSTALLED'
    }
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        print(f'Successfully installed extension {extension_id}')
        return response.json()
    else:
        print(f'Installation failed: {response.status_code}')
        return None
```

The `installType` parameter offers several options. `FORCE_INSTALLED` automatically installs the extension and prevents users from disabling or removing it. `AUTOMATIC` installs it automatically but allows users to uninstall. `ADMIN_INSTALLED` makes it available in the organization's Chrome Web Store for optional installation.

## Uninstalling Extensions

Removing extensions follows a similar pattern. This proves essential when security vulnerabilities are discovered or when certain extensions violate organizational policies.

```python
def uninstall_extension(org_unit_id, extension_id, access_token):
    url = f'https://chromeenterprise.googleapis.com/v1/organizations/{org_unit_id}/extensions/{extension_id}'
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    response = requests.delete(url, headers=headers)
    
    if response.status_code == 204:
        print(f'Successfully uninstalled extension {extension_id}')
        return True
    else:
        print(f'Uninstallation failed: {response.status_code}')
        return False
```

## Getting Extension Details

Retrieving detailed information about specific extensions helps with compliance auditing and security reviews. The API provides comprehensive metadata including permissions, version history, and update channels.

```python
def get_extension_details(extension_id, access_token):
    url = f'https://chromeenterprise.googleapis.com/v1/extensions/{extension_id}'
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f'Error: {response.status_code}')
        return None

# Example usage
details = get_extension_details('gighmmpiobklfepjocnamgkkbiglidom', access_token)
print(f"Name: {details['name']}")
print(f"Version: {details['version']}")
print(f"Permissions: {details.get('permissions', [])}")
print(f"Description: {details.get('description', 'N/A')}")
```

## Practical Use Cases

The API shines in several real-world scenarios. Security teams can automatically block extensions with known vulnerabilities by monitoring CVE databases and pushing uninstall commands. IT departments can maintain consistent extension configurations across new device deployments through automation scripts.

Developers building internal company extensions can use the API to track adoption rates and gather installation statistics. HR teams can manage compliance training extensions by ensuring required tools are installed and preventing users from removing them.

## Rate Limits and Best Practices

Google imposes rate limits on the API to prevent abuse. Typical limits allow for hundreds of requests per minute, which suffices for most organizational needs. However, when managing large fleets, implement exponential backoff for retries and cache responses where possible.

Consider implementing a configuration management system that stores your extension policies in version control. This approach enables rollback capabilities and provides an audit trail for compliance purposes.

## Wrapping Up

The Chrome Enterprise Extension Management API transforms how organizations manage browser extensions at scale. By leveraging these programmatic capabilities, you reduce manual work, improve security posture, and maintain consistent user experiences across your Chrome deployment.

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
