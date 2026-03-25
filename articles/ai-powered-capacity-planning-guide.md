---
layout: default
title: "How to Use AI for Infrastructure Capacity Planning"
description: "Use Claude and data analysis tools to build AI-powered capacity planning. forecast resource needs, model traffic growth, and automate scaling decisions"
date: 2026-03-22
author: theluckystrike
permalink: ai-powered-capacity-planning-guide
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Capacity planning is the art of having enough resources before you need them without paying for idle infrastructure. The old approach. overprovision by 2x and hope. is expensive. AI-assisted planning uses historical metrics, growth models, and anomaly detection to make data-driven forecasts.

Table of Contents

- [What AI Adds to Capacity Planning](#what-ai-adds-to-capacity-planning)
- [Step 1 - Collect and Prepare Metrics](#step-1-collect-and-prepare-metrics)
- [Step 2 - Generate Forecasts with Prophet](#step-2-generate-forecasts-with-prophet)
- [Step 3 - AI-Powered Capacity Analysis](#step-3-ai-powered-capacity-analysis)
- [Step 4 - Autoscaling Policy Generation](#step-4-autoscaling-policy-generation)
- [Step 5 - Capacity Planning Report](#step-5-capacity-planning-report)
- [Executive Summary (3-4 sentences)](#executive-summary-3-4-sentences)
- [High Priority Actions (must do this week)](#high-priority-actions-must-do-this-week)
- [Upcoming Capacity Events (next 30 days)](#upcoming-capacity-events-next-30-days)
- [Cost Optimization Opportunities](#cost-optimization-opportunities)
- [Step 6 - Anomaly-Driven Capacity Alerts](#step-6-anomaly-driven-capacity-alerts)
- [Choosing Your Forecasting Horizon](#choosing-your-forecasting-horizon)
- [Related Reading](#related-reading)

What AI Adds to Capacity Planning

Traditional capacity planning uses linear extrapolation. AI-assisted planning adds:
- Seasonal pattern detection (weekly, monthly, annual cycles)
- Event-aware forecasting (product launches, marketing campaigns)
- Multi-metric correlation (CPU and memory together predict saturation)
- Natural language interpretation of complex forecasts

The biggest practical gain is speed. A human analyst reviewing 90 days of CloudWatch data across 20 services might take a full day. The pipeline below runs end-to-end in about four minutes and surfaces the same insights in a structured format that engineers can act on immediately.

Step 1 - Collect and Prepare Metrics

```python
capacity_data.py
import pandas as pd
from datetime import datetime, timedelta
import boto3  # or use Prometheus, Datadog, etc.

def fetch_cloudwatch_metrics(
    namespace: str,
    metric_name: str,
    dimensions: list[dict],
    days: int = 90,
    period: int = 3600  # 1-hour granularity
) -> pd.DataFrame:
    """Fetch historical metrics from CloudWatch."""
    client = boto3.client("cloudwatch")
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    response = client.get_metric_statistics(
        Namespace=namespace,
        MetricName=metric_name,
        Dimensions=dimensions,
        StartTime=start_time,
        EndTime=end_time,
        Period=period,
        Statistics=["Average", "Maximum", "p99"]
    )

    df = pd.DataFrame(response["Datapoints"])
    if df.empty:
        return df

    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    df = df.sort_values("Timestamp").reset_index(drop=True)
    return df

def fetch_service_metrics(service_name: str) -> dict[str, pd.DataFrame]:
    """Fetch all relevant metrics for a service."""
    dimensions = [{"Name": "ServiceName", "Value": service_name}]

    return {
        "cpu_utilization": fetch_cloudwatch_metrics(
            "ECS/ContainerInsights", "CpuUtilized", dimensions
        ),
        "memory_utilization": fetch_cloudwatch_metrics(
            "ECS/ContainerInsights", "MemoryUtilized", dimensions
        ),
        "request_count": fetch_cloudwatch_metrics(
            "AWS/ApplicationELB", "RequestCount",
            [{"Name": "TargetGroup", "Value": f"targetgroup/{service_name}"}]
        ),
        "response_time_p99": fetch_cloudwatch_metrics(
            "AWS/ApplicationELB", "TargetResponseTime",
            [{"Name": "TargetGroup", "Value": f"targetgroup/{service_name}"}]
        )
    }
```

Step 2 - Generate Forecasts with Prophet

```python
forecaster.py
from prophet import Prophet  # pip install prophet
import pandas as pd
import json
from anthropic import Anthropic

client = Anthropic()

def forecast_metric(
    df: pd.DataFrame,
    metric_col: str,
    forecast_days: int = 30,
    growth_events: list[dict] = None
) -> dict:
    """
    Forecast a metric using Prophet.
    growth_events: [{"ds": "2026-04-15", "lower_window": 0, "upper_window": 2, "holiday": "launch"}]
    """
    # Prepare for Prophet
    prophet_df = df[["Timestamp", metric_col]].rename(
        columns={"Timestamp": "ds", metric_col: "y"}
    )
    prophet_df["ds"] = prophet_df["ds"].dt.tz_localize(None)

    model = Prophet(
        changepoint_prior_scale=0.1,  # Conservative trend changes
        seasonality_mode="multiplicative",
        weekly_seasonality=True,
        daily_seasonality=False,
        holidays=pd.DataFrame(growth_events) if growth_events else None
    )

    # Add custom seasonalities if we have enough data
    if len(prophet_df) > 90 * 24:  # 90 days of hourly data
        model.add_seasonality(name="monthly", period=30.5, fourier_order=5)

    model.fit(prophet_df)

    future = model.make_future_dataframe(periods=forecast_days * 24, freq="h")
    forecast = model.predict(future)

    # Get forecast for the future period only
    future_only = forecast[forecast["ds"] > prophet_df["ds"].max()]

    return {
        "forecast": future_only[["ds", "yhat", "yhat_lower", "yhat_upper"]].to_dict("records"),
        "peak_predicted": float(future_only["yhat"].max()),
        "peak_upper_bound": float(future_only["yhat_upper"].max()),
        "forecast_days": forecast_days
    }
```

Step 3 - AI-Powered Capacity Analysis

```python
def analyze_capacity_needs(
    service_name: str,
    metrics: dict[str, dict],  # metric_name -> forecast result
    current_config: dict,
    budget_constraints: dict = None
) -> str:
    """Use Claude to interpret forecasts and recommend capacity changes."""
    metrics_summary = {}
    for metric, forecast in metrics.items():
        metrics_summary[metric] = {
            "current_avg": "from historical data",
            "predicted_peak_30d": round(forecast["peak_predicted"], 2),
            "predicted_peak_upper": round(forecast["peak_upper_bound"], 2)
        }

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""You are a cloud infrastructure capacity planning expert.

Service - {service_name}
Current configuration - {json.dumps(current_config, indent=2)}
Budget constraints - {json.dumps(budget_constraints, indent=2) if budget_constraints else "None specified"}

30-day metric forecasts:
{json.dumps(metrics_summary, indent=2)}

Provide:
1. CAPACITY_RISK: [Critical/High/Medium/Low]. will current capacity handle predicted load?
2. BOTTLENECK: Which resource will be first to constrain the service?
3. RECOMMENDED_CHANGES: Specific infrastructure changes (instance sizes, counts, autoscaling rules)
4. TIMELINE: When to make each change
5. COST_ESTIMATE: Estimated monthly cost impact of recommended changes
6. MONITORING_THRESHOLDS: Specific metric thresholds to alert on before saturation

Be specific with numbers. Reference the forecast peaks in your analysis."""
        }]
    )
    return response.content[0].text

Example usage
service_name = "order-service"
current_config = {
    "instance_type": "t3.large",
    "min_instances": 2,
    "max_instances": 10,
    "cpu_scale_up_threshold": 70,
    "memory_gb": 8
}

metrics_data = fetch_service_metrics(service_name)
forecasts = {}
for metric_name, df in metrics_data.items():
    if not df.empty:
        forecasts[metric_name] = forecast_metric(df, "Average")

analysis = analyze_capacity_needs(service_name, forecasts, current_config)
print(analysis)
```

Step 4 - Autoscaling Policy Generation

Claude can generate autoscaling policies from capacity analysis:

```python
def generate_autoscaling_policy(
    service_name: str,
    forecast_peak: float,
    current_cpu_per_instance: float,
    target_cpu_utilization: float = 60.0
) -> dict:
    """Generate ECS autoscaling policy based on forecasts."""
    instances_at_peak = forecast_peak / target_cpu_utilization
    recommended_max = int(instances_at_peak * 1.3)  # 30% headroom

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Generate an AWS ECS auto scaling policy for {service_name}.

Peak CPU forecast - {forecast_peak}%
Current CPU per instance - {current_cpu_per_instance}%
Target CPU utilization - {target_cpu_utilization}%
Recommended max instances - {recommended_max}

Return a JSON object with:
- target_tracking_policy: AWS-compatible target tracking config
- step_scaling_policy: Step scaling for faster response
- scheduled_scaling: If there's a clear weekly pattern, suggest scheduled scaling actions
- cooldown_seconds: Appropriate scale-in/out cooldown

Base the policy on best practices for production ECS services."""
        }]
    )

    try:
        policy_text = response.content[0].text
        # Parse JSON from response
        import re
        json_match = re.search(r'\{.*\}', policy_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception:
        pass

    return {"raw_recommendation": response.content[0].text}
```

Step 5 - Capacity Planning Report

```python
def generate_capacity_report(services: list[str]) -> str:
    """Generate a weekly capacity planning report for all services."""
    all_analyses = []

    for service in services:
        metrics = fetch_service_metrics(service)
        forecasts = {
            name: forecast_metric(df, "Average")
            for name, df in metrics.items()
            if not df.empty
        }
        if forecasts:
            analysis = analyze_capacity_needs(service, forecasts, {})
            all_analyses.append({"service": service, "analysis": analysis})

    # Have Claude write an executive summary
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""Write a weekly capacity planning report for the infrastructure team.

Service analyses:
{json.dumps([{"service": a["service"], "summary": a["analysis"][:300]} for a in all_analyses], indent=2)}

Format:
Executive Summary (3-4 sentences)

High Priority Actions (must do this week)

Upcoming Capacity Events (next 30 days)

Cost Optimization Opportunities

Keep it concise. this is a weekly standup artifact, not a novel."""
        }]
    )

    return response.content[0].text

Schedule as a weekly job
report = generate_capacity_report(["order-service", "inventory-service", "payment-service"])
Send to #infra-capacity Slack channel
```

Step 6 - Anomaly-Driven Capacity Alerts

Forecasts tell you what to expect under normal growth. Anomaly detection tells you when something unexpected is happening right now. Combining both gives you both strategic and tactical visibility:

```python
import numpy as np
from scipy import stats

def detect_capacity_anomalies(
    df: pd.DataFrame,
    metric_col: str,
    window_hours: int = 24,
    z_threshold: float = 3.0
) -> list[dict]:
    """
    Flag data points more than z_threshold standard deviations from
    the rolling mean. Returns a list of anomaly dicts for downstream alerting.
    """
    rolling_mean = df[metric_col].rolling(window=window_hours).mean()
    rolling_std  = df[metric_col].rolling(window=window_hours).std()

    z_scores = (df[metric_col] - rolling_mean) / rolling_std.replace(0, np.nan)
    anomalies = df[z_scores.abs() > z_threshold].copy()
    anomalies["z_score"] = z_scores[anomalies.index]

    return anomalies[["Timestamp", metric_col, "z_score"]].to_dict("records")


def explain_anomalies(service_name: str, anomalies: list[dict]) -> str:
    """Ask Claude to suggest root causes for detected anomalies."""
    if not anomalies:
        return "No anomalies detected in the observation window."

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": f"""Service - {service_name}
The following metric anomalies were detected in the last 24 hours:
{json.dumps(anomalies, indent=2, default=str)}

Suggest three likely root causes ranked by probability,
and for each one describe one diagnostic step an on-call engineer
should take immediately."""
        }]
    )
    return response.content[0].text
```

Integrate this into your existing alerting stack by routing the output to PagerDuty or posting it directly to a Slack channel:

```python
import urllib.request

def post_to_slack(webhook_url: str, message: str) -> None:
    payload = json.dumps({"text": message}).encode()
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    urllib.request.urlopen(req, timeout=5)

Wire it together
for service in ["order-service", "inventory-service", "payment-service"]:
    df = fetch_service_metrics(service)["cpu_utilization"]
    if df.empty:
        continue
    anomalies = detect_capacity_anomalies(df, "Average")
    if anomalies:
        explanation = explain_anomalies(service, anomalies)
        post_to_slack(
            os.environ["SLACK_CAPACITY_WEBHOOK"],
            f":warning: *Capacity anomaly. {service}*\n{explanation}"
        )
```

Choosing Your Forecasting Horizon

Different decisions require different planning horizons. A rough guide:

| Horizon | Forecast Method | Action |
|---|---|---|
| 0-4 hours | Real-time anomaly detection | Page on-call, trigger auto-scaling |
| 1-7 days | Prophet with weekly seasonality | Pre-warm instances, adjust autoscaling bounds |
| 30 days | Prophet with growth events | Right-size reserved instances |
| 90+ days | Trend extrapolation + LLM judgment | Budget submissions, architecture changes |

For horizons beyond 30 days, statistical confidence intervals widen significantly. At that point the LLM's role shifts from interpreting numbers to synthesizing qualitative signals. roadmap commitments, sales pipeline, seasonal business patterns. into a coherent planning narrative.

Related Articles

- [How to Use AI for Capacity Planning and Resource Right](/how-to-use-ai-for-capacity-planning-and-resource-right-sizin/)
- [How to Use AI to Create Milestone Planning Documents](/how-to-use-ai-to-create-milestone-planning-documents-from-is/)
- [How to Use AI for Cloud Migration Planning and Dependency](/how-to-use-ai-for-cloud-migration-planning-and-dependency-ma/)
- [How to Use AI for Predicting Infrastructure Scaling Needs](/how-to-use-ai-for-predicting-infrastructure-scaling-needs-au/)
- [AI Tools for Automated Infrastructure Drift Detection: Co](/ai-tools-for-automated-infrastructure-drift-detection-and-co/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
