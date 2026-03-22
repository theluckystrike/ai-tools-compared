---
layout: default
title: "How to Use AI for Infrastructure Capacity Planning"
description: "Use Claude and data analysis tools to build AI-powered capacity planning — forecast resource needs, model traffic growth, and automate scaling decisions"
date: 2026-03-22
author: theluckystrike
permalink: ai-powered-capacity-planning-guide
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Capacity planning is the art of having enough resources before you need them without paying for idle infrastructure. The old approach — overprovision by 2x and hope — is expensive. AI-assisted planning uses historical metrics, growth models, and anomaly detection to make data-driven forecasts.

## Key Takeaways

- **RECOMMENDED_CHANGES**: Specific infrastructure changes (instance sizes, counts, autoscaling rules)
4.
- **COST_ESTIMATE**: Estimated monthly cost impact of recommended changes
6.
- **Topics covered**: what ai adds to capacity planning, step 1: collect and prepare metrics, step 2: generate forecasts with prophet
- **Practical guidance included**: Step-by-step setup and configuration instructions

## What AI Adds to Capacity Planning

Traditional capacity planning uses linear extrapolation. AI-assisted planning adds:
- Seasonal pattern detection (weekly, monthly, annual cycles)
- Event-aware forecasting (product launches, marketing campaigns)
- Multi-metric correlation (CPU and memory together predict saturation)
- Natural language interpretation of complex forecasts

## Step 1: Collect and Prepare Metrics

```python
# capacity_data.py
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

## Step 2: Generate Forecasts with Prophet

```python
# forecaster.py
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

## Step 3: AI-Powered Capacity Analysis

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

Service: {service_name}
Current configuration: {json.dumps(current_config, indent=2)}
Budget constraints: {json.dumps(budget_constraints, indent=2) if budget_constraints else "None specified"}

30-day metric forecasts:
{json.dumps(metrics_summary, indent=2)}

Provide:
1. CAPACITY_RISK: [Critical/High/Medium/Low] — will current capacity handle predicted load?
2. BOTTLENECK: Which resource will be first to constrain the service?
3. RECOMMENDED_CHANGES: Specific infrastructure changes (instance sizes, counts, autoscaling rules)
4. TIMELINE: When to make each change
5. COST_ESTIMATE: Estimated monthly cost impact of recommended changes
6. MONITORING_THRESHOLDS: Specific metric thresholds to alert on before saturation

Be specific with numbers. Reference the forecast peaks in your analysis."""
        }]
    )
    return response.content[0].text

# Example usage
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

## Step 4: Autoscaling Policy Generation

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

Peak CPU forecast: {forecast_peak}%
Current CPU per instance: {current_cpu_per_instance}%
Target CPU utilization: {target_cpu_utilization}%
Recommended max instances: {recommended_max}

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

## Step 5: Capacity Planning Report

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
## Executive Summary (3-4 sentences)

## High Priority Actions (must do this week)

## Upcoming Capacity Events (next 30 days)

## Cost Optimization Opportunities

Keep it concise — this is a weekly standup artifact, not a novel."""
        }]
    )

    return response.content[0].text

# Schedule as a weekly job
report = generate_capacity_report(["order-service", "inventory-service", "payment-service"])
# Send to #infra-capacity Slack channel
```

## Related Reading

- [How to Use AI for Capacity Planning and Resource Right-Sizing](/ai-tools-compared/how-to-use-ai-for-capacity-planning-and-resource-right-sizin/)
- [How to Use AI for Log Anomaly Detection](/ai-tools-compared/how-to-use-ai-for-log-anomaly-detection/)
- [AI-Powered Database Performance Tuning](/ai-tools-compared/ai-powered-database-performance-tuning/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
