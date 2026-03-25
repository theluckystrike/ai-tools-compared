---
layout: default
title: "How to Build AI-Powered API Diff Tools"
description: "Build an AI-powered API diff tool that compares OpenAPI specs, detects breaking changes, and generates migration guides using Claude with Python examples"
date: 2026-03-22
author: theluckystrike
permalink: /build-ai-powered-api-diff-tools/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence, api]
---

{% raw %}

An API diff tool tells you what changed between two API versions. An AI-powered one tells you what changed, which changes are breaking, which clients will be affected, and what migration steps consumers need to take. This guide shows how to build one using Claude as the analysis engine.

What Makes a Change "Breaking"

Not all API changes are equal. Breaking changes break existing client code without modification:

| Change | Breaking? | Example |
|---|---|---|
| Remove endpoint | Yes | DELETE /api/v1/users/{id} removed |
| Remove required field from request | No | Made optional |
| Add required field to request | Yes | New required field consumers must send |
| Remove field from response | Yes | Clients reading that field break |
| Add field to response | No | Additive, clients can ignore |
| Change field type | Yes | string → integer breaks JSON parsers |
| Change HTTP status code | Maybe | 200 → 201 is usually fine, 200 → 400 is breaking |
| Change authentication method | Yes | OAuth → API key requires client changes |

Tool Architecture

```python
api_diff.py. main diff tool

import json
import yaml
import anthropic
from dataclasses import dataclass
from typing import Any

client = anthropic.Anthropic()


@dataclass
class DiffResult:
    breaking_changes: list[dict]
    non_breaking_changes: list[dict]
    migration_guide: str
    severity: str  # "none" | "minor" | "major" | "critical"


def load_spec(path: str) -> dict:
    """Load OpenAPI spec from JSON or YAML file."""
    with open(path) as f:
        content = f.read()

    if path.endswith('.json'):
        return json.loads(content)
    return yaml.safe_load(content)


def extract_endpoints(spec: dict) -> dict[str, dict]:
    """Extract all endpoints with their schemas from an OpenAPI spec."""
    endpoints = {}

    for path, path_item in spec.get('paths', {}).items():
        for method, operation in path_item.items():
            if method in ('get', 'post', 'put', 'patch', 'delete', 'options', 'head'):
                key = f"{method.upper()} {path}"
                endpoints[key] = {
                    'parameters': operation.get('parameters', []),
                    'requestBody': operation.get('requestBody'),
                    'responses': operation.get('responses', {}),
                    'security': operation.get('security'),
                    'deprecated': operation.get('deprecated', False),
                    'operationId': operation.get('operationId'),
                }

    return endpoints


def compute_structural_diff(old_spec: dict, new_spec: dict) -> dict:
    """Compute raw structural differences between specs."""
    old_endpoints = extract_endpoints(old_spec)
    new_endpoints = extract_endpoints(new_spec)

    removed_endpoints = set(old_endpoints.keys()) - set(new_endpoints.keys())
    added_endpoints = set(new_endpoints.keys()) - set(old_endpoints.keys())
    common_endpoints = set(old_endpoints.keys()) & set(new_endpoints.keys())

    modified = {}
    for endpoint in common_endpoints:
        old = json.dumps(old_endpoints[endpoint], sort_keys=True)
        new = json.dumps(new_endpoints[endpoint], sort_keys=True)
        if old != new:
            modified[endpoint] = {
                'old': old_endpoints[endpoint],
                'new': new_endpoints[endpoint],
            }

    # Also check top-level info changes
    info_changed = old_spec.get('info') != new_spec.get('info')
    servers_changed = old_spec.get('servers') != new_spec.get('servers')

    return {
        'removed_endpoints': list(removed_endpoints),
        'added_endpoints': list(added_endpoints),
        'modified_endpoints': modified,
        'info_changed': info_changed,
        'servers_changed': servers_changed,
        'components_changed': old_spec.get('components') != new_spec.get('components'),
    }


def analyze_diff_with_claude(
    structural_diff: dict,
    old_version: str,
    new_version: str,
) -> DiffResult:
    """Use Claude to analyze the structural diff and classify changes."""

    # Truncate modified endpoints to avoid token limits
    diff_summary = {
        'removed_endpoints': structural_diff['removed_endpoints'],
        'added_endpoints': structural_diff['added_endpoints'],
        'modified_count': len(structural_diff['modified_endpoints']),
        'modified_samples': dict(
            list(structural_diff['modified_endpoints'].items())[:10]  # Top 10
        ),
        'info_changed': structural_diff['info_changed'],
        'servers_changed': structural_diff['servers_changed'],
    }

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        system="""You are an API compatibility expert. When given a diff between two OpenAPI specs,
you identify breaking vs non-breaking changes, assess severity, and write a migration guide.

Respond with JSON:
{
  "breaking_changes": [{"endpoint": "...", "change": "...", "impact": "...", "migration": "..."}],
  "non_breaking_changes": [{"endpoint": "...", "change": "..."}],
  "severity": "none|minor|major|critical",
  "migration_guide": "markdown text",
  "summary": "one paragraph"
}""",
        messages=[{
            "role": "user",
            "content": f"""Analyze API changes from version {old_version} to {new_version}:

{json.dumps(diff_summary, indent=2)}

Classify each change as breaking or non-breaking.
Generate a migration guide for API consumers."""
        }]
    )

    response = message.content[0].text
    if "```json" in response:
 response = response.split("```json")[1].split("```")[0]

 data = json.loads(response.strip())

 return DiffResult(
 breaking_changes=data['breaking_changes'],
 non_breaking_changes=data['non_breaking_changes'],
 migration_guide=data['migration_guide'],
 severity=data['severity'],
 )
```

CLI Tool

```python
api_diff_cli.py
import click
import json
from api_diff import load_spec, compute_structural_diff, analyze_diff_with_claude


@click.command()
@click.argument('old_spec', type=click.Path(exists=True))
@click.argument('new_spec', type=click.Path(exists=True))
@click.option('--old-version', default='v1', help='Old API version label')
@click.option('--new-version', default='v2', help='New API version label')
@click.option('--output', type=click.Choice(['text', 'json', 'markdown']), default='text')
@click.option('--fail-on-breaking', is_flag=True, help='Exit 1 if breaking changes found')
def diff(old_spec, new_spec, old_version, new_version, output, fail_on_breaking):
 """Compare two OpenAPI specs and detect breaking changes."""

 old = load_spec(old_spec)
 new = load_spec(new_spec)

 click.echo(f"Computing diff: {old_version} → {new_version}...")
 structural = compute_structural_diff(old, new)

 if not any([
 structural['removed_endpoints'],
 structural['modified_endpoints'],
 structural['added_endpoints'],
 ]):
 click.echo("No API changes detected.")
 return

 click.echo("Analyzing with Claude...")
 result = analyze_diff_with_claude(structural, old_version, new_version)

 if output == 'json':
 click.echo(json.dumps({
 'severity': result.severity,
 'breaking_changes': result.breaking_changes,
 'non_breaking_changes': result.non_breaking_changes,
 }, indent=2))

 elif output == 'markdown':
 click.echo(f"# API Diff: {old_version} → {new_version}")
 click.echo(f"\nSeverity: {result.severity.upper()}")
 click.echo(f"\n## Breaking Changes ({len(result.breaking_changes)})")
 for change in result.breaking_changes:
 click.echo(f"\n### `{change['endpoint']}`")
 click.echo(f"- Change: {change['change']}")
 click.echo(f"- Impact: {change['impact']}")
 click.echo(f"- Migration: {change['migration']}")
 click.echo(f"\n## Migration Guide\n\n{result.migration_guide}")

 else: # text
 click.echo(f"\nSeverity: {result.severity.upper()}")
 click.echo(f"Breaking changes: {len(result.breaking_changes)}")
 click.echo(f"Non-breaking changes: {len(result.non_breaking_changes)}")

 if result.breaking_changes:
 click.echo("\nBREAKING CHANGES:")
 for change in result.breaking_changes:
 click.echo(f" [{change['endpoint']}]: {change['change']}")
 click.echo(f" Impact: {change['impact']}")
 click.echo(f" Fix: {change['migration']}")

 if fail_on_breaking and result.breaking_changes:
 raise SystemExit(1)


if __name__ == '__main__':
 diff()
```

Sample Output

```bash
$ python api_diff_cli.py openapi-v1.yaml openapi-v2.yaml --old-version v1 --new-version v2

Severity - MAJOR
Breaking changes - 3
Non-breaking changes - 5

BREAKING CHANGES:
 [DELETE /api/v1/users/{id}]: Endpoint removed
 Impact: Clients calling DELETE /users/:id will receive 404
 Fix - Migrate to DELETE /api/v2/users/{id}. identical behavior

 [POST /api/v1/orders]: New required field 'shipping_address_id' added to request body
 Impact: Clients not sending shipping_address_id will receive 422
 Fix: Include shipping_address_id from the addresses endpoint before creating orders

 [GET /api/v1/products]: Response field 'price' type changed from string to number
 Impact: Clients parsing price as string will need to handle numeric type
 Fix - Update price handling to expect number type (e.g., 29.99 instead of "29.99")
```

CI Integration

```yaml
.github/workflows/api-diff.yml
name: API Breaking Change Check
on:
 pull_request:
 paths:
 - 'openapi*.yaml'
 - 'openapi*.json'

jobs:
 api-diff:
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v4
 with:
 fetch-depth: 2 # Need previous commit for comparison
 - run: pip install anthropic pyyaml click
 - name: Check for breaking changes
 env:
 ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
 run: |
 git show HEAD~1:openapi.yaml > /tmp/old-spec.yaml
 python api_diff_cli.py /tmp/old-spec.yaml openapi.yaml \
 --old-version "HEAD~1" \
 --new-version "HEAD" \
 --output markdown \
 --fail-on-breaking
```

Related Reading

- [AI Tools for Automated Swagger Documentation](/ai-tools-automated-swagger-docs/)
- [AI-Powered Database Schema Diff Tools](/ai-powered-database-schema-diff-tools/)
- [AI Code Review Automation Tools Comparison](/ai-code-review-automation-tools-comparison/)

---

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
