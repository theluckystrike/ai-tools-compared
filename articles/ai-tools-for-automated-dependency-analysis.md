---
layout: default
title: "AI Tools for Automated Dependency Analysis"
description: "Use Claude and open-source AI tools to analyze dependency graphs, detect circular deps, find unused packages, and assess vulnerability blast radius"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-automated-dependency-analysis
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Dependency analysis is one of the highest-ROI applications for AI in engineering. A dependency graph can tell you what depends on what. but understanding *why*, predicting the blast radius of an upgrade, and prioritizing which vulnerabilities to fix first requires reasoning that pure graph analysis can't do. AI bridges that gap.

Three Problems AI Solves Well

1. Circular dependency explanation: Not just "A→B→A exists" but "this cycle forms because auth imports config which imports auth for logging"
2. Upgrade impact analysis: "If I upgrade lodash from 4.17.15 to 4.17.21, which of my 47 dependencies actually use it?"
3. Vulnerability prioritization: "Of these 12 CVEs, which are exploitable given my actual call graph?"

Setup - Build a Dependency Graph

Start with the actual dependency data. Here's how to extract it for npm, pip, and Go:

```python
dep_graph.py
import subprocess
import json
from pathlib import Path

def get_npm_deps() -> dict:
    result = subprocess.run(
        ["npm", "list", "--all", "--json"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def get_pip_deps() -> dict:
    """Build a pip dependency graph using pipdeptree."""
    result = subprocess.run(
        ["pip", "install", "-q", "pipdeptree"],
        capture_output=True
    )
    result = subprocess.run(
        ["pipdeptree", "--json-tree"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def get_go_deps() -> dict:
    result = subprocess.run(
        ["go", "mod", "graph"],
        capture_output=True, text=True
    )
    edges = []
    for line in result.stdout.strip().split("\n"):
        if " " in line:
            parts = line.split(" ")
            edges.append({"from": parts[0], "to": parts[1]})
    return {"edges": edges}

def detect_circular_deps_python() -> list[str]:
    """Use pipdeptree to detect circular dependencies."""
    result = subprocess.run(
        ["pipdeptree", "--warn", "silence"],
        capture_output=True, text=True
    )
    cycles = [
        line for line in result.stderr.split("\n")
        if "circular" in line.lower()
    ]
    return cycles
```

Visualizing the Graph Before Analysis

Before sending data to an AI, build a visual. Claude and GPT-4 reason better when you can point to a specific subgraph:

```python
visualize_deps.py. output a Mermaid diagram for large graphs
def to_mermaid(edges: list[dict], max_edges: int = 50) -> str:
    lines = ["graph LR"]
    for edge in edges[:max_edges]:
        src = edge["from"].replace("-", "_").replace(".", "_")
        dst = edge["to"].replace("-", "_").replace(".", "_")
        lines.append(f"    {src} --> {dst}")
    return "\n".join(lines)

Paste the Mermaid output into a prompt for visual context
```

Mermaid diagrams paste cleanly into Claude prompts and allow you to ask questions like "explain the path between `auth-service` and `db-driver` in this graph."

AI Analysis - Circular Dependency Explanation

```python
analyze_deps.py
from anthropic import Anthropic
import json

client = Anthropic()

def explain_circular_dependency(cycle: list[str], dep_graph: dict) -> str:
    """Have Claude explain why a circular dependency exists and how to break it."""
    cycle_str = " → ".join(cycle)

    # Find relevant portion of the graph
    relevant_edges = []
    for edge in dep_graph.get("edges", []):
        if any(pkg in edge["from"] or pkg in edge["to"] for pkg in cycle):
            relevant_edges.append(edge)

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Analyze this circular dependency and explain how to break it.

Cycle - {cycle_str}

Relevant dependency edges:
{json.dumps(relevant_edges[:30], indent=2)}

Provide:
1. ROOT_CAUSE: Why does this cycle likely exist? (1-2 sentences)
2. BREAK_STRATEGY: Most practical way to break the cycle
3. CODE_CHANGE: Describe the specific refactoring needed
4. RISK: Low/Medium/High. how difficult is the fix?"""
        }]
    )
    return response.content[0].text

def analyze_upgrade_impact(
    package: str,
    from_version: str,
    to_version: str,
    dep_graph: dict
) -> str:
    """Predict the impact of upgrading a package."""
    # Find all packages that depend on this one
    dependents = []
    for edge in dep_graph.get("edges", []):
        if package.lower() in edge.get("to", "").lower():
            dependents.append(edge["from"])

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""Analyze the impact of upgrading {package} from {from_version} to {to_version}.

Direct dependents in this codebase:
{json.dumps(dependents, indent=2)}

Based on semantic versioning and common knowledge of {package}:
1. BREAKING_CHANGES: What typically changes between these versions?
2. AFFECTED_DEPENDENTS: Which dependents are most likely to need code changes?
3. SAFE_UPGRADE: Is this likely a safe drop-in upgrade?
4. TESTING_PRIORITY: Which areas to test first?
5. ROLLBACK_PLAN: How to safely roll back if the upgrade breaks something?"""
        }]
    )
    return response.content[0].text
```

Practical Upgrade Workflow

The most effective pattern combines automated graph extraction with AI reasoning in a pull request comment:

1. Run `npm outdated --json` or `pip list --outdated --format=json`
2. For each package with a major version bump, call `analyze_upgrade_impact()`
3. Post the AI summary as a PR comment before the upgrade lands

This lets reviewers see the expected blast radius before merging, not after discovering broken tests.

Vulnerability Blast Radius Analysis

```python
def analyze_vulnerability_blast_radius(
    cve_id: str,
    vulnerable_package: str,
    vuln_description: str,
    dep_graph: dict,
    endpoints: list[str] = None
) -> str:
    """Assess how exploitable a vulnerability is given the actual dependency graph."""
    # Build reverse dependency path
    def find_paths_to_root(pkg: str, graph: dict, depth: int = 0) -> list[list[str]]:
        if depth > 5:
            return []
        paths = []
        for edge in graph.get("edges", []):
            if pkg.lower() in edge.get("to", "").lower():
                parent = edge["from"]
                sub_paths = find_paths_to_root(parent, graph, depth + 1)
                if sub_paths:
                    paths.extend([[parent] + p for p in sub_paths])
                else:
                    paths.append([parent])
        return paths

    paths = find_paths_to_root(vulnerable_package, dep_graph)
    paths_str = "\n".join(" → ".join(p) for p in paths[:20])

    endpoints_str = "\n".join(endpoints[:10]) if endpoints else "Unknown"

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1200,
        messages=[{
            "role": "user",
            "content": f"""Assess the blast radius of this vulnerability in our codebase.

CVE - {cve_id}
Vulnerable package - {vulnerable_package}
Description - {vuln_description}

Dependency paths to vulnerable package:
{paths_str}

Exposed endpoints/surfaces:
{endpoints_str}

Provide:
EXPLOITABILITY: [Critical/High/Medium/Low]. can this actually be reached?
ATTACK_VECTOR - How would an attacker trigger this?
AFFECTED_FEATURES - What parts of the product are at risk?
IMMEDIATE_MITIGATION - What to do right now if patching is delayed?
PRIORITY - Should this block the current release?"""
        }]
    )
    return response.content[0].text
```

Integrating with Snyk or Dependabot Output

Snyk and Dependabot surface CVEs but don't tell you whether your code actually reaches the vulnerable function. Combine their output with AI blast radius analysis:

```python
snyk_bridge.py. pipe Snyk JSON output into Claude blast radius analysis
import json, subprocess

def get_snyk_vulns() -> list[dict]:
    result = subprocess.run(
        ["snyk", "test", "--json"],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    return data.get("vulnerabilities", [])

def triage_snyk_vulns(dep_graph: dict) -> list[dict]:
    vulns = get_snyk_vulns()
    results = []
    for vuln in vulns:
        analysis = analyze_vulnerability_blast_radius(
            cve_id=vuln.get("identifiers", {}).get("CVE", ["Unknown"])[0],
            vulnerable_package=vuln["moduleName"],
            vuln_description=vuln["title"],
            dep_graph=dep_graph,
        )
        results.append({"vuln": vuln["title"], "analysis": analysis})
    return results
```

Unused Dependency Detection

```python
import ast
import os
from pathlib import Path

def find_actually_used_packages(src_dir: str, packages: list[str]) -> dict:
    """Scan Python source to find which installed packages are actually imported."""
    imported = set()

    for py_file in Path(src_dir).rglob("*.py"):
        try:
            tree = ast.parse(py_file.read_text())
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imported.add(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imported.add(node.module.split(".")[0])

    return {
        "used": [p for p in packages if any(
            p.lower().replace("-", "_") == imp.lower()
            for imp in imported
        )],
        "unused": [p for p in packages if not any(
            p.lower().replace("-", "_") == imp.lower()
            for imp in imported
        )]
    }

def get_ai_removal_advice(unused_packages: list[str], project_description: str) -> str:
    """Ask Claude which unused packages are safe to remove."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": f"""This Python project ({project_description}) has these packages
installed but no direct imports found in source code:

{', '.join(unused_packages)}

For each package, advise:
SAFE_TO_REMOVE: [Yes/No/Maybe]
REASON - Why it might be needed even without direct imports
  (e.g., pytest plugins, build tools, transitive deps pulled in intentionally)

Format as a table - Package | Safe | Reason"""
        }]
    )
    return response.content[0].text
```

False Positives to Watch For

The static import scanner misses several legitimate patterns. Tell Claude about these when asking for removal advice:

- Pytest plugins (`pytest-cov`, `pytest-asyncio`) are loaded by pytest automatically with no import
- Django apps in `INSTALLED_APPS` that register themselves via `AppConfig`
- Celery tasks auto-discovered via `autodiscover_tasks()`
- Packages used only in config files (e.g., `gunicorn` listed in `Procfile` but never imported)

Claude will flag these as `Maybe` with an explanation when you provide the project description.

CI Integration

```yaml
.github/workflows/dep-analysis.yml
name: Dependency Analysis

on:
  pull_request:
    paths:
      - 'package.json'
      - 'requirements.txt'
      - 'go.mod'
      - 'pyproject.toml'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run dependency analysis
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          pip install pipdeptree anthropic
          python3 scripts/analyze_deps.py \
            --check-circular \
            --check-unused \
            > /tmp/dep_report.md

      - name: Post analysis as PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('/tmp/dep_report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Dependency Analysis\n\n${report}`
            });
```

Caching Graph Data Between Runs

Regenerating the full dependency graph on every CI run is slow. Cache it using the lock file as a cache key:

```yaml
- name: Cache dependency graph
  uses: actions/cache@v4
  with:
    path: /tmp/dep-graph.json
    key: dep-graph-${{ hashFiles('/package-lock.json', '/requirements.txt', '/go.sum') }}

- name: Build graph if not cached
  run: |
    if [ ! -f /tmp/dep-graph.json ]; then
      python3 scripts/build_graph.py > /tmp/dep-graph.json
    fi
```

This reduces CI time by 60-80% on large monorepos where the dependency structure changes infrequently.

Tool Comparison

| Tool | Circular Deps | Vuln Analysis | Upgrade Impact | AI Explanation |
|---|---|---|---|---|
| Claude (API) | Via graph + AI | Full blast radius | Semantic analysis | Yes |
| Snyk | No | Yes | Limited | No |
| FOSSA | Basic | Yes | No | No |
| Depcheck (npm) | No | No | No | No |
| pipdeptree | Detects only | No | No | No |

The AI-powered approach is the only one that combines detection with reasoning about impact and prioritization.

Related Articles

- [AI Tools for Generating Dependency Update Pull Request](/ai-tools-for-generating-dependency-update-pull-request-descr/)
- [AI Tools for Cohort Analysis](/ai-tools-for-cohort-analysis/)
- [How to Use AI for Cloud Migration Planning and Dependency](/how-to-use-ai-for-cloud-migration-planning-and-dependency-ma/)
- [How to Use AI to Resolve Python Import Circular Dependency](/how-to-use-ai-to-resolve-python-import-circular-dependency-e/)
- [How to Use AI to Resolve NPM Peer Dependency Conflict](/how-to-use-ai-to-resolve-npm-peer-dependency-conflict-errors/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
