---
layout: default
title: "Claude API Batch Processing for Large Document Workflows"
description: "Complete guide to using Claude API's batch processing feature for cost-effective document analysis and processing at scale with code examples"
date: 2026-03-20
last_modified_at: 2026-03-20
author: theluckystrike
permalink: /claude-api-batch-processing-for-large-document-workflows/
categories: [guides]
tags: [ai-tools-compared, tools, api, claude, automation, workflow, claude-ai]
reviewed: true
score: 8
voice-checked: true
intent-checked: true
---

{% raw %}

Claude's batch processing API enables you to queue hundreds or thousands of requests for off-peak processing, reducing costs by 50% compared to real-time API calls. This guide walks through implementing batch workflows for document analysis, content extraction, and data processing.

## Why Batch Processing Matters for Document Workflows

Document processing often doesn't require immediate responses. You might need to analyze hundreds of PDFs, extract structured data from emails, or categorize documents—tasks that benefit from asynchronous, cost-optimized processing.

Batch processing solves several common scenarios:

- Processing large document archives without rate limits
- Cost reduction for non-urgent analysis tasks
- Automatic retry on transient failures
- Better resource utilization for throughput-heavy workflows
- Compliance-friendly audit trails for all requests

The Claude API's batch endpoint processes requests at significantly reduced rates (50% discount) compared to synchronous API calls, making it ideal for:

- Daily/weekly document processing jobs
- Content migration and transformation
- Large-scale data labeling
- Compliance document review
- Email or log analysis pipelines

## Setting Up Batch Processing

### Prerequisites

You'll need the Claude API SDK and a valid API key. Install the Python client:

```bash
pip install anthropic
```

### Basic Batch Request Structure

Batch requests are formatted as JSONL (JSON Lines), where each line is a complete request:

```python
import json
from anthropic import Anthropic

# Initialize the client
client = Anthropic()

# Define your batch requests
batch_requests = [
    {
        "custom_id": "doc-001",
        "params": {
            "model": "claude-opus-4-6",
            "max_tokens": 1024,
            "messages": [
                {
                    "role": "user",
                    "content": "Analyze this contract for liability clauses: [document text here]"
                }
            ]
        }
    },
    {
        "custom_id": "doc-002",
        "params": {
            "model": "claude-opus-4-6",
            "max_tokens": 1024,
            "messages": [
                {
                    "role": "user",
                    "content": "Extract metadata from this invoice: [invoice text here]"
                }
            ]
        }
    }
]

# Save batch requests to JSONL file
with open("batch_requests.jsonl", "w") as f:
    for request in batch_requests:
        f.write(json.dumps(request) + "\n")
```

### Submitting a Batch

```python
# Submit the batch
with open("batch_requests.jsonl", "rb") as f:
    batch = client.beta.messages.batch.submit(
        requests=f,
    )

print(f"Batch submitted with ID: {batch.id}")
print(f"Request count: {batch.request_counts.processing}")
```

The batch will process in the background. You can check its status anytime:

```python
# Check batch status
batch_status = client.beta.messages.batch.retrieve(batch.id)
print(f"Status: {batch_status.state}")
print(f"Processing: {batch_status.request_counts.processing}")
print(f"Succeeded: {batch_status.request_counts.succeeded}")
print(f"Errored: {batch_status.request_counts.errored}")
```

## Real-World Document Analysis Example

Here's a practical example for analyzing customer support tickets and categorizing them:

```python
import json
from pathlib import Path
from anthropic import Anthropic

class TicketAnalyzer:
    def __init__(self):
        self.client = Anthropic()

    def prepare_batch_from_tickets(self, tickets: list[dict]) -> str:
        """Convert tickets to batch request format"""
        batch_requests = []

        for ticket in tickets:
            request = {
                "custom_id": f"ticket-{ticket['id']}",
                "params": {
                    "model": "claude-opus-4-6",
                    "max_tokens": 256,
                    "messages": [
                        {
                            "role": "user",
                            "content": f"""Analyze this support ticket and provide:
1. Primary category (billing, technical, feature-request, bug)
2. Sentiment (positive, neutral, negative)
3. Urgency (low, medium, high)
4. Suggested response time (hours)

Ticket:
{ticket['content']}

Respond with JSON only."""
                        }
                    ]
                }
            }
            batch_requests.append(request)

        # Write to JSONL
        batch_file = "tickets_batch.jsonl"
        with open(batch_file, "w") as f:
            for request in batch_requests:
                f.write(json.dumps(request) + "\n")

        return batch_file

    def submit_batch(self, batch_file: str) -> str:
        """Submit batch for processing"""
        with open(batch_file, "rb") as f:
            batch = self.client.beta.messages.batch.submit(requests=f)

        print(f"Submitted batch {batch.id} with {len(batch.request_counts)} requests")
        return batch.id

    def wait_for_completion(self, batch_id: str, max_wait_minutes: int = 60):
        """Poll batch status until completion"""
        import time

        start = time.time()
        max_wait_seconds = max_wait_minutes * 60

        while time.time() - start < max_wait_seconds:
            batch = self.client.beta.messages.batch.retrieve(batch_id)

            if batch.state == "completed":
                print(f"Batch completed! Succeeded: {batch.request_counts.succeeded}, Errored: {batch.request_counts.errored}")
                return batch

            print(f"Status: {batch.state} - Processing: {batch.request_counts.processing}")
            time.sleep(30)  # Check every 30 seconds

        raise TimeoutError(f"Batch {batch_id} did not complete within {max_wait_minutes} minutes")

    def retrieve_results(self, batch_id: str) -> dict:
        """Retrieve and process batch results"""
        results = {}

        # Stream results
        for result in self.client.beta.messages.batch.results(batch_id):
            custom_id = result.custom_id

            if result.result.type == "succeeded":
                # Extract the assistant's response
                content = result.result.message.content[0].text
                results[custom_id] = {
                    "status": "succeeded",
                    "analysis": json.loads(content)
                }
            elif result.result.type == "errored":
                results[custom_id] = {
                    "status": "errored",
                    "error": result.result.error.message
                }
            elif result.result.type == "expired":
                results[custom_id] = {
                    "status": "expired"
                }

        return results

# Usage
analyzer = TicketAnalyzer()

# Sample tickets
tickets = [
    {
        "id": "001",
        "content": "I was charged twice for my subscription this month. This is the second time this has happened!"
    },
    {
        "id": "002",
        "content": "Would love to see a dark mode option in the settings. Great product btw!"
    },
    {
        "id": "003",
        "content": "The API is returning 500 errors when I try to upload files larger than 100MB"
    }
]

# Process tickets in batch
batch_file = analyzer.prepare_batch_from_tickets(tickets)
batch_id = analyzer.submit_batch(batch_file)

# Wait for completion
completed_batch = analyzer.wait_for_completion(batch_id)

# Retrieve results
results = analyzer.retrieve_results(batch_id)

# Print analyzed tickets
for ticket_id, analysis in results.items():
    print(f"\n{ticket_id}: {analysis}")
```

## Organizing Large-Scale Batch Operations

For production systems handling hundreds of thousands of documents, consider this architecture:

```python
import sqlite3
from datetime import datetime

class BatchJobManager:
    def __init__(self, db_path: str = "batch_jobs.db"):
        self.db_path = db_path
        self.client = Anthropic()
        self._init_db()

    def _init_db(self):
        """Create tracking database"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS batch_jobs (
                id TEXT PRIMARY KEY,
                batch_id TEXT,
                status TEXT,
                created_at TIMESTAMP,
                completed_at TIMESTAMP,
                total_requests INTEGER,
                succeeded INTEGER,
                errored INTEGER
            )
        """)
        conn.commit()
        conn.close()

    def record_batch(self, batch_id: str, total_requests: int):
        """Track batch submission"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT INTO batch_jobs (id, batch_id, status, created_at, total_requests)
            VALUES (?, ?, ?, ?, ?)
        """, (batch_id, batch_id, "submitted", datetime.now(), total_requests))
        conn.commit()
        conn.close()

    def update_batch_status(self, batch_id: str):
        """Refresh batch status from API"""
        batch = self.client.beta.messages.batch.retrieve(batch_id)

        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            UPDATE batch_jobs
            SET status = ?, succeeded = ?, errored = ?,
                completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END
            WHERE batch_id = ?
        """, (
            batch.state,
            batch.request_counts.succeeded,
            batch.request_counts.errored,
            batch.state,
            datetime.now() if batch.state == "completed" else None,
            batch_id
        ))
        conn.commit()
        conn.close()

# Usage
manager = BatchJobManager()
manager.record_batch(batch_id, len(tickets))
```

## Cost Optimization Tips

Batch processing provides 50% cost reduction, but you can optimize further:

1. **Combine similar requests**: Group requests requiring the same analysis to reuse context
2. **Adjust max_tokens**: Set token limits precisely for your use case—over-provisioning wastes quota
3. **Use Claude Haiku**: For straightforward classification tasks, Claude Haiku 4.5 costs less than Opus
4. **Batch timing**: Submit batches during off-peak hours (evening/night in your timezone) for faster processing

## Error Handling and Retries

Batch requests can fail for various reasons. Implement intelligent retry logic:

```python
def process_batch_with_retries(batch_file: str, max_retries: int = 3):
    """Submit batch with automatic retry on failure"""
    client = Anthropic()

    for attempt in range(max_retries):
        try:
            with open(batch_file, "rb") as f:
                batch = client.beta.messages.batch.submit(requests=f)
            return batch.id
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Attempt {attempt + 1} failed: {e}. Retrying...")
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise
```

## Comparing Batch vs. Real-Time Processing

| Factor | Batch Processing | Real-Time API |
|--------|-----------------|--------------|
| Cost | 50% discount | Full price |
| Speed | Minutes to hours | Immediate |
| Throughput | Optimized for volume | Limited by rate limits |
| Complexity | Perfect for bulk tasks | Better for interactive needs |
| Retries | Automatic | Manual implementation |

## When to Use Batch Processing

Batch processing excels for:
- Daily document analysis jobs
- Email digests and summaries
- Content moderation workflows
- Data classification and labeling
- Scheduled report generation

Skip batch processing for:
- Real-time chatbots
- Interactive user-facing features
- Time-sensitive compliance checks
- Sub-second response requirements

The batch API is ideal for engineers building scalable document processing systems that can tolerate latency in exchange for cost efficiency and reliability.


## Related Articles

- [Claude API Batch Processing: How Much Cheaper Than Discount](/ai-tools-compared/claude-api-batch-processing-discount-how-much-cheaper-than-r/)
- [Claude Code vs Cursor for Large Codebase Refactoring](/ai-tools-compared/claude-code-vs-cursor-for-large-codebase-refactoring/)
- [Gemini vs Claude for Analyzing Large CSV Datasets Over 100MB](/ai-tools-compared/gemini-vs-claude-for-analyzing-large-csv-datasets-over-100mb/)
- [How to Transfer Notion AI Workflows to Claude Projects 2026](/ai-tools-compared/how-to-transfer-notion-ai-workflows-to-claude-projects-2026/)
- [Migrating from ChatGPT Plugins to Claude MCP Tools for.](/ai-tools-compared/migrating-from-chatgpt-plugins-to-claude-mcp-tools-for-coding-workflows/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
