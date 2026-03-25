---
layout: default
title: "How to Use AI for Log Anomaly Detection"
description: "Build AI-powered log anomaly detection with Claude, OpenAI embeddings, and Python. parse, cluster, and alert on unusual log patterns in production"
date: 2026-03-22
author: theluckystrike
permalink: how-to-use-ai-for-log-anomaly-detection
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Production logs contain the answer to most incidents, but finding anomalies in 100k+ lines per minute is not a human-scale problem. AI-based anomaly detection works differently from threshold-based alerting: it learns what "normal" looks like and flags deviations, including the novel errors you haven't written alerts for yet.

This guide builds a practical log anomaly detector using OpenAI embeddings for pattern clustering and Claude for root cause analysis.

The Architecture

```
Raw Logs → Parser → Normalizer → Embedder
                                     ↓
                              Baseline Clusters (normal patterns)
                                     ↓
             New Log Line → Embed → Distance Check → Anomaly Score
                                                          ↓
                                               Score > Threshold → Claude Analysis
```

Two phases - an offline baseline phase that learns normal patterns, and an online detection phase that scores new logs against that baseline.

Step 1 - Log Parsing and Normalization

Raw logs are noisy. Normalize before embedding to improve cluster quality:

```python
log_normalizer.py
import re
from dataclasses import dataclass
from datetime import datetime

Patterns to replace with stable tokens
REPLACEMENTS = [
    (r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '<UUID>'),
    (r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '<IP>'),
    (r'"[A-Z]{3,7} /[^"]*"', '"<HTTP_REQUEST>"'),
    (r'/[a-zA-Z0-9_\-./]+/[a-zA-Z0-9_\-]+', '<PATH>'),
    (r'\b\d+ms\b', '<DURATION>ms'),
    (r'\b\d+\.?\d*\s*(MB|KB|GB|bytes)\b', '<SIZE>'),
    (r'\b[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2}[.0-9Z+-]*\b', '<TIMESTAMP>'),
    (r'\btxn_[a-zA-Z0-9]+\b', '<TXN_ID>'),
    (r'\busr_[a-zA-Z0-9]+\b', '<USER_ID>'),
    (r'\b[0-9]{5,}\b', '<NUMBER>'),
]

@dataclass
class ParsedLog:
    raw: str
    normalized: str
    level: str
    service: str
    timestamp: datetime | None

def parse_log_line(line: str) -> ParsedLog:
    """Parse a structured or semi-structured log line."""
    # Try to extract level
    level_match = re.search(r'\b(DEBUG|INFO|WARN|WARNING|ERROR|CRITICAL|FATAL)\b', line, re.I)
    level = level_match.group(1).upper() if level_match else "UNKNOWN"

    # Try to extract service name (common formats)
    service_match = re.search(r'service[=: ]["\'"]?([a-zA-Z0-9_-]+)', line, re.I)
    service = service_match.group(1) if service_match else "unknown"

    # Normalize
    normalized = line
    for pattern, replacement in REPLACEMENTS:
        normalized = re.sub(pattern, replacement, normalized)

    # Collapse whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return ParsedLog(
        raw=line,
        normalized=normalized,
        level=level,
        service=service,
        timestamp=None
    )
```

Step 2 - Build a Baseline with Embeddings

Embed a sample of normal logs and build a cluster centroid database:

```python
baseline_builder.py
import numpy as np
import json
from openai import OpenAI
from sklearn.cluster import KMeans
from log_normalizer import parse_log_line

client = OpenAI()
EMBED_MODEL = "text-embedding-3-small"

def embed_logs(log_texts: list[str], batch_size: int = 200) -> np.ndarray:
    embeddings = []
    for i in range(0, len(log_texts), batch_size):
        batch = log_texts[i:i + batch_size]
        response = client.embeddings.create(model=EMBED_MODEL, input=batch)
        embeddings.extend([item.embedding for item in response.data])
    return np.array(embeddings)

def build_baseline(log_lines: list[str], n_clusters: int = 50) -> dict:
    """
    Cluster normal log patterns and save centroids.
    Call this on 24h of known-good logs.
    """
    parsed = [parse_log_line(line) for line in log_lines]
    normalized_texts = [p.normalized for p in parsed]

    print(f"Embedding {len(normalized_texts)} log lines...")
    embeddings = embed_logs(normalized_texts)

    print(f"Clustering into {n_clusters} groups...")
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(embeddings)

    # Save centroids and representative examples
    baseline = {
        "centroids": kmeans.cluster_centers_.tolist(),
        "n_clusters": n_clusters,
        "examples": {}
    }

    for cluster_id in range(n_clusters):
        mask = kmeans.labels_ == cluster_id
        cluster_indices = np.where(mask)[0]
        # Store 3 representative examples per cluster
        examples = [normalized_texts[i] for i in cluster_indices[:3]]
        baseline["examples"][str(cluster_id)] = examples

    return baseline

def save_baseline(baseline: dict, path: str = "log_baseline.json"):
    with open(path, "w") as f:
        json.dump(baseline, f)
    print(f"Baseline saved to {path}")
```

Step 3 - Online Anomaly Detection

```python
detector.py
import numpy as np
import json
from openai import OpenAI
from anthropic import Anthropic

oai = OpenAI()
anthropic = Anthropic()

EMBED_MODEL = "text-embedding-3-small"
ANOMALY_THRESHOLD = 0.35  # cosine distance. tune based on your logs

class LogAnomalyDetector:
    def __init__(self, baseline_path: str = "log_baseline.json"):
        with open(baseline_path) as f:
            baseline = json.load(f)
        self.centroids = np.array(baseline["centroids"])
        self.examples = baseline["examples"]

    def score(self, log_text: str) -> tuple[float, int]:
        """Returns (anomaly_score, nearest_cluster_id). Score 0=normal, 1=max anomaly."""
        embedding = oai.embeddings.create(
            model=EMBED_MODEL,
            input=[log_text]
        ).data[0].embedding

        vec = np.array(embedding)

        # Cosine distance to each centroid
        norms = np.linalg.norm(self.centroids, axis=1) * np.linalg.norm(vec)
        similarities = self.centroids @ vec / np.where(norms > 0, norms, 1)
        distances = 1 - similarities

        min_dist_idx = int(np.argmin(distances))
        min_dist = float(distances[min_dist_idx])

        return min_dist, min_dist_idx

    def analyze_anomaly(
        self,
        anomalous_log: str,
        context_logs: list[str],
        nearest_cluster_examples: list[str]
    ) -> str:
        """Use Claude to explain why a log line is anomalous."""
        context = "\n".join(context_logs[-10:])  # Last 10 lines for context
        examples = "\n".join(nearest_cluster_examples[:3])

        response = anthropic.messages.create(
            model="claude-opus-4-6",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""This log line was flagged as anomalous.

Anomalous log:
{anomalous_log}

Surrounding context (last 10 lines):
{context}

Similar normal log patterns from baseline:
{examples}

Provide:
1. LIKELY CAUSE: What probably caused this anomaly (1-2 sentences)
2. SEVERITY: [P1-Critical / P2-High / P3-Medium / P4-Low]
3. SUGGESTED ACTION: What to check or do first (1-2 sentences)"""
            }]
        )
        return response.content[0].text

    def process_stream(self, log_generator, alert_callback=None):
        """Process a stream of log lines, alerting on anomalies."""
        buffer = []  # Keep recent context

        for raw_line in log_generator:
            from log_normalizer import parse_log_line
            parsed = parse_log_line(raw_line)
            buffer.append(raw_line)
            if len(buffer) > 50:
                buffer.pop(0)

            # Skip DEBUG logs for performance
            if parsed.level == "DEBUG":
                continue

            score, cluster_id = self.score(parsed.normalized)

            if score > ANOMALY_THRESHOLD:
                cluster_examples = self.examples.get(str(cluster_id), [])
                analysis = self.analyze_anomaly(
                    raw_line,
                    buffer[:-1],
                    cluster_examples
                )

                alert = {
                    "anomaly_score": round(score, 3),
                    "log_line": raw_line,
                    "analysis": analysis
                }

                if alert_callback:
                    alert_callback(alert)
                else:
                    print(f"\n[ANOMALY score={score:.3f}]\n{raw_line}")
                    print(f"\n{analysis}\n{'='*60}")
```

Step 4 - Wiring It Together

```python
run_detector.py
import sys
from detector import LogAnomalyDetector

def slack_alert(alert: dict):
    """Send anomaly alert to Slack."""
    import urllib.request, json, os
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook:
        return

    message = {
        "text": f":rotating_light: *Log Anomaly Detected* (score: {alert['anomaly_score']})",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Score:* {alert['anomaly_score']}\n*Log:* `{alert['log_line'][:200]}`"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": alert['analysis']
                }
            }
        ]
    }

    req = urllib.request.Request(
        webhook,
        data=json.dumps(message).encode(),
        headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req)

def tail_log_file(path: str):
    """Generator that yields new lines as they appear (like tail -f)."""
    import time
    with open(path) as f:
        f.seek(0, 2)  # Seek to end
        while True:
            line = f.readline()
            if line:
                yield line.strip()
            else:
                time.sleep(0.1)

if __name__ == "__main__":
    detector = LogAnomalyDetector("log_baseline.json")
    log_path = sys.argv[1] if len(sys.argv) > 1 else "/var/log/app/app.log"

    print(f"Watching {log_path} for anomalies...")
    detector.process_stream(tail_log_file(log_path), alert_callback=slack_alert)
```

Tuning the Threshold

The 0.35 cosine distance threshold is a starting point. Calibrate it on your logs:

```python
tune_threshold.py
import json
import numpy as np
from detector import LogAnomalyDetector

detector = LogAnomalyDetector()

Load a labeled sample (100 normal, 20 known anomalies)
with open("labeled_logs.json") as f:
    labeled = json.load(f)

thresholds = np.arange(0.20, 0.60, 0.05)
best_f1, best_threshold = 0, 0.35

for threshold in thresholds:
    tp = fp = fn = 0
    for item in labeled:
        score, _ = detector.score(item["log"])
        predicted_anomaly = score > threshold
        is_anomaly = item["label"] == "anomaly"

        if predicted_anomaly and is_anomaly: tp += 1
        elif predicted_anomaly and not is_anomaly: fp += 1
        elif not predicted_anomaly and is_anomaly: fn += 1

    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0

    print(f"Threshold {threshold:.2f}: P={precision:.2f} R={recall:.2f} F1={f1:.2f}")
    if f1 > best_f1:
        best_f1, best_threshold = f1, threshold

print(f"\nBest threshold: {best_threshold:.2f} (F1={best_f1:.2f})")
```

Cost Estimate

For 10,000 log lines/minute filtered to ~500 ERROR/WARN lines:
- Embeddings - 500 * 100 tokens avg = 50k tokens/min = ~$0.01/min = ~$14/day
- Claude analysis: triggered ~5-10 times/day on true anomalies = $0.01/day

Total - under $15/day for production anomaly detection with root cause analysis.

Related Articles

- [AI-Powered Log Analysis Tools for Debugging](/ai-log-analysis-tools-for-debugging/)
- [Best AI Tools for Debugging Production Incidents](/best-ai-tools-for-debugging-production-incidents-with-log-analysis/)
- [Claude vs GPT-4 for Shell Scripting 2026](/claude-vs-gpt4-for-shell-scripting-2026/)
- [AI Powered Log Analysis Tools for Production Debugging](/ai-powered-log-analysis-tools-for-production-debugging-compa/)
- [Effective Workflow for Using AI](/effective-workflow-for-using-ai-to-debug-production-issues-from-logs/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
