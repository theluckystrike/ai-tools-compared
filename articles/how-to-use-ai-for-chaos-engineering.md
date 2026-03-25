---
layout: default
title: "How to Use AI for Chaos Engineering"
description: "Use Claude and GPT-4 to design chaos experiments, generate failure scenarios, analyze blast radius, and write Chaos Monkey and Litmus tests automatically"
date: 2026-03-22
author: theluckystrike
permalink: how-to-use-ai-for-chaos-engineering
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Chaos engineering is the practice of deliberately injecting failures to find weaknesses before production does. The bottleneck isn't running experiments. it's designing them well. Choosing the right failure modes, estimating blast radius, and writing the experiment config all take expertise. AI tools can compress this from days to hours.

What AI Does Well in Chaos Engineering

Three things:
1. Experiment design: Given your architecture, suggest high-value failure scenarios
2. Config generation: Write Litmus, Chaos Mesh, or AWS FIS experiment configs
3. Blast radius analysis: Review an experiment definition and predict what could break

Step 1 - Architecture-Driven Experiment Design

Feed Claude your architecture and ask it to generate a chaos experiment backlog:

```python
chaos_planner.py
from anthropic import Anthropic

client = Anthropic()

ARCHITECTURE_DESCRIPTION = """
E-commerce platform:
- Frontend: Next.js on Vercel
- API gateway: Kong on Kubernetes (3 replicas)
- Services:
  - order-service (3 pods, PostgreSQL primary + 1 replica)
  - inventory-service (2 pods, Redis cache + PostgreSQL)
  - payment-service (2 pods, Stripe API dependency)
  - notification-service (1 pod, SQS consumer)
- Infrastructure: AWS EKS, RDS Multi-AZ, ElastiCache cluster mode
- Service mesh: Istio with circuit breakers configured
"""

def generate_experiment_backlog(architecture: str) -> str:
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2500,
        messages=[{
            "role": "user",
            "content": f"""You are a chaos engineering expert.
Given this architecture, generate a prioritized chaos experiment backlog.

For each experiment include:
- NAME: Short identifier
- HYPOTHESIS: What we expect to happen when resilience is working
- FAILURE_MODE: Exact failure to inject
- BLAST_RADIUS: What could break beyond the target
- PRIORITY: [P1 / P2 / P3] based on business impact
- TOOLING: Which tool to use (Litmus, Chaos Mesh, AWS FIS, manual)

Architecture:
{architecture}

Generate 10 experiments covering: network latency, pod failures,
database failover, dependency timeouts, resource exhaustion, and AZ failure."""
        }]
    )
    return response.content[0].text

backlog = generate_experiment_backlog(ARCHITECTURE_DESCRIPTION)
print(backlog)
```

Sample output (condensed):

```
NAME - payment-service-latency
HYPOTHESIS - Orders complete within 5s even when payment API adds 2s latency,
because our frontend shows a loading state and the API has a 10s timeout.
FAILURE_MODE - Add 2000ms latency to all egress from payment-service to stripe.com
BLAST_RADIUS - Order completion rate, P95 latency, timeout errors if > 10s total
PRIORITY - P1
TOOLING - Istio VirtualService fault injection

NAME - order-service-pod-kill
HYPOTHESIS - 1/3 pod failure causes <200ms disruption as Kubernetes reschedules
FAILURE_MODE - Kill 1 of 3 order-service pods
BLAST_RADIUS - In-flight requests on killed pod; ~5s for new pod to become ready
PRIORITY - P1
TOOLING - Litmus PodDelete

NAME - redis-cluster-node-failure
HYPOTHESIS - Inventory reads fall back to PostgreSQL when Redis node fails, with
<500ms latency increase
FAILURE_MODE - Stop one Redis cluster node
BLAST_RADIUS - inventory-service read latency, cache hit rate drops to ~50%
PRIORITY - P2
TOOLING - AWS FIS (stop EC2 instance)
```

Step 2 - Generate Litmus Experiment Configs

```python
chaos_config_generator.py
from anthropic import Anthropic
import yaml

client = Anthropic()

def generate_litmus_experiment(experiment_spec: dict) -> str:
    """Generate a LitmusChaos ChaosEngine YAML from a spec dict."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Generate a valid LitmusChaos ChaosEngine YAML for this experiment.

Use litmus experiments from hub.litmuschaos.io.
Include all required fields. Add comments explaining key parameters.

Experiment spec:
{yaml.dump(experiment_spec, default_flow_style=False)}

Return only the YAML, no explanation."""
        }]
    )
    return response.content[0].text

Example experiment
order_pod_kill = {
    "name": "order-service-pod-kill",
    "target_namespace": "production",
    "target_app": "order-service",
    "app_label": "app=order-service",
    "failure": "kill 1 pod",
    "duration_seconds": 60,
    "monitoring": {
        "success_criteria": "order_success_rate > 99%",
        "abort_if": "error_rate > 5%"
    }
}

yaml_config = generate_litmus_experiment(order_pod_kill)
print(yaml_config)
```

Generated ChaosEngine YAML:

```yaml
ChaosEngine for order-service pod deletion
This experiment validates K8s self-healing for stateless services
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: order-service-pod-delete
  namespace: production
spec:
  # Target application
  appinfo:
    appns: production
    applabel: app=order-service
    appkind: deployment

  # Abort experiment if application becomes unhealthy
  engineState: active
  chaosServiceAccount: litmus-admin

  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            # Kill 1 pod out of N replicas
            - name: TOTAL_CHAOS_DURATION
              value: "60"          # Run for 60 seconds
            - name: CHAOS_INTERVAL
              value: "10"          # Kill a pod every 10 seconds
            - name: FORCE
              value: "false"       # Graceful deletion (SIGTERM first)
            - name: PODS_AFFECTED_PERC
              value: "33"          # ~1/3 of pods
            - name: TARGET_PODS
              value: ""            # Empty = random selection
        probe:
          # HTTP probe: verify order API stays responsive
          - name: order-api-health
            type: httpProbe
            httpProbe/inputs:
              url: http://order-service.production.svc:8080/health
              insecureSkipVerify: false
              method:
                get:
                  criteria: "=="
                  responseCode: "200"
            mode: Continuous
            runProperties:
              probeTimeout: 5000
              interval: 2
              retry: 3
              probePollingInterval: 2
```

Step 3 - Blast Radius Analysis

Before running any experiment, have Claude review it for unexpected blast radius:

```python
def analyze_blast_radius(
    experiment_yaml: str,
    architecture_description: str
) -> dict:
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""Analyze the blast radius of this chaos experiment.

Architecture context:
{architecture_description}

Experiment config:
{experiment_yaml}

Provide:
1. DIRECT_IMPACT: What is directly affected
2. CASCADING_RISKS: What else could fail as a consequence
3. DATA_RISK: Any risk of data loss or corruption
4. ROLLBACK_PLAN: How to stop and recover if things go wrong
5. SAFE_TO_RUN: [YES / REQUIRES_APPROVAL / NO] with justification
6. PREREQUISITES: What must be true before running (monitoring, low-traffic window, etc.)"""
        }]
    )

    text = response.content[0].text
    return {"analysis": text, "raw": experiment_yaml}

analysis = analyze_blast_radius(yaml_config, ARCHITECTURE_DESCRIPTION)
print(analysis["analysis"])
```

Step 4 - Automated Istio Fault Injection

For network chaos without cluster-level permissions:

```python
def generate_istio_fault_injection(
    service_name: str,
    fault_type: str,  # "delay" or "abort"
    target_host: str,
    fault_value: str,  # "2000ms" or "503"
    percentage: int = 50
) -> str:
    """Generate Istio VirtualService YAML for fault injection."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": f"""Generate an Istio VirtualService YAML that injects a
{fault_type} fault of {fault_value} for {percentage}% of requests from
{service_name} to {target_host}.

Include the original routing rule so non-faulted traffic is unaffected.
Return only the YAML."""
        }]
    )
    return response.content[0].text

Add 2s delay to 30% of payment service → Stripe calls
istio_config = generate_istio_fault_injection(
    service_name="payment-service",
    fault_type="delay",
    target_host="api.stripe.com",
    fault_value="2000ms",
    percentage=30
)
print(istio_config)
```

Output:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: payment-service-chaos
  namespace: production
spec:
  hosts:
    - api.stripe.com
  http:
    - match:
        - sourceLabels:
            app: payment-service
      fault:
        delay:
          percentage:
            value: 30.0
          fixedDelay: 2000ms
      route:
        - destination:
            host: api.stripe.com
    # Passthrough for all other services
    - route:
        - destination:
            host: api.stripe.com
```

Step 5 - Generating AWS FIS Experiment Templates

AWS Fault Injection Service is the right tool for infrastructure-level experiments that affect EC2 instances, ECS tasks, or RDS failovers. Claude can generate FIS templates directly:

```python
def generate_fis_template(experiment_spec: dict) -> str:
    """Generate an AWS FIS experiment template JSON."""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""Generate an AWS FIS experiment template JSON for this experiment.

Include:
- Correct action IDs (aws:rds:failover-db-cluster, aws:ec2:stop-instances, etc.)
- Stop conditions using CloudWatch alarms
- IAM role reference
- Target resource filters

Experiment:
{yaml.dump(experiment_spec, default_flow_style=False)}

Return only valid FIS template JSON."""
        }]
    )
    return response.content[0].text

rds_failover = {
    "name": "rds-failover-test",
    "description": "Trigger RDS Multi-AZ failover and measure recovery time",
    "target": "production RDS cluster",
    "db_cluster_id": "my-prod-cluster",
    "stop_condition_alarm": "HighErrorRate5xx",
    "expected_recovery_time_seconds": 30
}

fis_template = generate_fis_template(rds_failover)
print(fis_template)
```

Running a Safe Chaos Workflow

```bash
#!/bin/bash
chaos_run.sh. safe chaos experiment execution

EXPERIMENT=$1
NAMESPACE="production"

echo "=== Pre-flight checks ==="
Verify all pods healthy before starting
kubectl get pods -n $NAMESPACE | grep -v Running
if [ $? -eq 0 ]; then
  echo "WARNING: Unhealthy pods detected. Aborting."
  exit 1
fi

Check error rate baseline
ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[5m]))/sum(rate(http_requests_total[5m]))" | jq '.data.result[0].value[1]')
echo "Baseline error rate: ${ERROR_RATE}"

echo "=== Applying chaos experiment ==="
kubectl apply -f $EXPERIMENT

echo "=== Monitoring (60s) ==="
sleep 60

echo "=== Collecting results ==="
kubectl get chaosresult -n $NAMESPACE

echo "=== Cleanup ==="
kubectl delete -f $EXPERIMENT
```

AI Tool Comparison for Chaos Engineering

| Task | Claude | GPT-4 | Manual |
|---|---|---|---|
| Experiment backlog from architecture | Detailed, prioritized | Good but less structured | Hours of expert time |
| Litmus YAML generation | Valid on first try | Requires 1-2 corrections | Reference docs needed |
| Blast radius analysis | Thorough with cascading risks | Misses some downstream effects | Manual risk assessment |
| AWS FIS templates | Correct action IDs | Occasional wrong action IDs | AWS docs required |
| Istio fault injection | Correct passthrough rule | Sometimes missing passthrough | Istio docs required |

Claude's advantage in chaos engineering comes from its ability to reason about system-level dependencies. When you describe an architecture, it builds a mental model of which services depend on which, and applies that to predict blast radius rather than just describing the direct target of an experiment.

GPT-4 is roughly equivalent for experiment design but produces slightly more YAML syntax errors in Litmus configs, requiring an extra validation step.

Related Articles

- [Best AI-Powered Platform Engineering Tools for Developer](/best-ai-powered-platform-engineering-tools-for-developer-sel/)
- [AI Tools for Generating Kubernetes Service Mesh](/ai-tools-for-generating-kubernetes-service-mesh-configuratio/)
- [AI Tools for Microservice Architecture](/ai-tools-for-microservice-architecture-design/)
- [How to Use the Claude API for Automated Code Review](/how-to-use-claude-api-for-automated-code-review/)
- [AI-Powered API Gateway Configuration Tools 2026](/ai-powered-api-gateway-configuration-tools-2026/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
