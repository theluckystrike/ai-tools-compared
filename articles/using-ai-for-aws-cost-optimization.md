---
layout: default
title: "Using AI for AWS Cost Optimization"
description: "Use Claude to analyze AWS Cost Explorer exports, identify rightsizing opportunities, and generate Terraform changes that reduce your monthly AWS bill"
date: 2026-03-22
author: theluckystrike
permalink: /using-ai-for-aws-cost-optimization/
categories: [guides]
tags: [ai-tools-compared, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

AWS bills are notoriously hard to analyze. The line items are cryptic, the pricing models vary by service, and the optimization opportunities require understanding your workload patterns. AI tools are useful here not because they understand AWS better than a specialized tool like Spot.io or CloudHealth, but because they can contextualize cost data against your actual infrastructure code and suggest specific changes.

## Step 1: Export Your Cost Data

```bash
# Export last 90 days of cost data via AWS CLI
aws ce get-cost-and-usage \
  --time-period Start=2025-12-22,End=2026-03-22 \
  --granularity MONTHLY \
  --metrics "BlendedCost" "UsageQuantity" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output json > cost-export.json

# Also get resource-level data for EC2
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-03-01 \
  --granularity DAILY \
  --metrics "BlendedCost" "UsageQuantity" \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["Amazon EC2"]
    }
  }' \
  --group-by Type=DIMENSION,Key=INSTANCE_TYPE \
  --output json > ec2-cost-by-type.json
```

## Step 2: AI-Assisted Cost Analysis

Feed the export to Claude with context about your workload:

```python
import anthropic
import json

client = anthropic.Anthropic()

def analyze_costs(cost_export: dict, workload_description: str) -> str:
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        system="""You are an AWS cost optimization specialist.
Analyze cost data and identify specific, actionable savings opportunities.
For each recommendation, include: estimated monthly savings, implementation effort (Low/Medium/High), and risk level.""",
        messages=[{
            "role": "user",
            "content": f"""
Analyze this AWS cost export and identify optimization opportunities.

Workload context: {workload_description}

Cost data (last 90 days):
{json.dumps(cost_export, indent=2)[:3000]}

Identify:
1. Services with highest spend — are they expected given the workload?
2. Instance types that are likely oversized
3. Any services with zero usage this period
4. Data transfer costs that suggest architectural inefficiency
5. Top 5 specific actions to reduce cost, ranked by impact
"""
        }]
    )
    return response.content[0].text

with open("cost-export.json") as f:
    cost_data = json.load(f)

workload = """
We run a SaaS application with:
- 4 EC2 m5.xlarge instances (web tier, ~40% CPU average)
- 2 RDS db.r6g.large (read replica + primary, PostgreSQL)
- CloudFront + S3 for static assets
- Typical traffic: 50k DAU, peak at US business hours
- Dev/staging environments running 24/7 on similar instance sizes
"""

analysis = analyze_costs(cost_data, workload)
print(analysis)
```

**Typical Claude output:**

```
COST ANALYSIS RESULTS

1. EC2 Rightsizing (Estimated savings: $340/month, Low risk)
   Your 4 x m5.xlarge at 40% average CPU are oversized. m5.large would
   handle this load with headroom. Downsize all 4 to m5.large.

2. Dev/Staging Schedules (Estimated savings: $520/month, Low effort)
   Dev/staging running 24/7 costs ~$780/month. Stopping environments
   outside business hours (8pm-8am + weekends) cuts this by 67%.

3. RDS Reserved Instances (Estimated savings: $290/month, Low effort)
   Your db.r6g.large instances have run 90+ days without resizing.
   1-year reserved instances save ~$580/year vs on-demand.

4. S3 Intelligent Tiering (Estimated savings: $45/month, Low effort)
   Enable on buckets with >100GB — objects move to infrequent access automatically.

5. Inter-AZ Data Transfer (Investigate)
   $180/month in inter-AZ transfer suggests services not co-located
   for hot paths. Review security group rules and load balancer targets.
```

## Step 3: Generate Rightsizing Terraform Changes

```python
def generate_terraform_changes(recommendation: str, current_tf: str) -> str:
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": f"""
Generate a Terraform change to implement this cost optimization:
{recommendation}

Current Terraform:
{current_tf}

Requirements:
- Minimal diff — only change what's necessary
- Add a comment explaining the change and expected savings
- Note if the change requires destroy/recreate
- Make instance type configurable via variable
"""
        }]
    )
    return response.content[0].text
```

**Input:**

```hcl
resource "aws_instance" "web" {
  count         = 4
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "m5.xlarge"
  subnet_id     = var.subnet_ids[count.index % length(var.subnet_ids)]
}
```

**Claude's output:**

```hcl
variable "web_instance_type" {
  description = "EC2 instance type for web tier. Downsized from m5.xlarge (40% avg CPU). Estimated savings: $340/month."
  type        = string
  default     = "m5.large"  # was m5.xlarge — rightsized 2026-03-22
}

resource "aws_instance" "web" {
  count         = 4
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.web_instance_type  # NOTE: requires stop/start
  subnet_id     = var.subnet_ids[count.index % length(var.subnet_ids)]
}
```

## Step 4: Instance Scheduler for Dev/Staging

Claude-generated Lambda for stopping/starting environments on schedule:

```python
import boto3

ec2 = boto3.client('ec2')

def get_scheduled_instances(state: str) -> list:
    response = ec2.describe_instances(Filters=[
        {'Name': 'tag:Schedule', 'Values': ['business-hours']},
        {'Name': 'instance-state-name', 'Values': [state]},
    ])
    return [
        instance['InstanceId']
        for reservation in response['Reservations']
        for instance in reservation['Instances']
    ]

def lambda_handler(event, context):
    action = event.get('action')  # 'start' or 'stop'

    if action == 'stop':
        ids = get_scheduled_instances('running')
        if ids:
            ec2.stop_instances(InstanceIds=ids)
            print(f"Stopped: {ids}")
    elif action == 'start':
        ids = get_scheduled_instances('stopped')
        if ids:
            ec2.start_instances(InstanceIds=ids)
            print(f"Started: {ids}")
```

```hcl
# CloudWatch Events rules for the schedule
resource "aws_cloudwatch_event_rule" "stop_dev" {
  name                = "stop-dev-staging"
  schedule_expression = "cron(0 20 ? * MON-FRI *)"
}

resource "aws_cloudwatch_event_rule" "start_dev" {
  name                = "start-dev-staging"
  schedule_expression = "cron(0 8 ? * MON-FRI *)"
}
```

## Step 5: AWS Compute Optimizer Analysis

```bash
# Enable Compute Optimizer (free)
aws compute-optimizer update-enrollment-status --status Active

# Get EC2 recommendations after 24h
aws compute-optimizer get-ec2-instance-recommendations \
  --output json > compute-optimizer-recommendations.json
```

Paste the output to Claude:

```
Prioritize these AWS Compute Optimizer recommendations by:
1. Monthly savings amount
2. Implementation risk (stop/start required vs live resize)
3. Performance risk flag (OVER_PROVISIONED vs UNDER_PROVISIONED)

[paste recommendations JSON]
```

## Step 6: Identify Idle and Orphaned Resources

One of the most overlooked cost categories is orphaned resources — things that exist but serve no workload. Claude can help identify them when given the right CLI output.

```bash
# Find unattached EBS volumes
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].{ID:VolumeId,Size:Size,Type:VolumeType,AZ:AvailabilityZone}' \
  --output json > unattached-volumes.json

# Find Elastic IPs not associated to running instances
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].[PublicIp,AllocationId]' \
  --output json > idle-eips.json

# Find load balancers with no registered targets
aws elbv2 describe-load-balancers --output json > albs.json
aws elbv2 describe-target-groups --output json > target-groups.json
```

Prompt Claude with all three files:

```
Review these AWS resource exports and identify resources that are costing money
but appear unused. Estimate monthly cost for each idle resource and suggest
whether to delete or repurpose it.

Unattached EBS volumes: [paste unattached-volumes.json]
Idle Elastic IPs: [paste idle-eips.json]
Load balancers: [paste albs.json]
Target groups: [paste target-groups.json]
```

Idle EBS volumes cost $0.10/GB-month (gp3). A 500GB forgotten snapshot or volume adds $50/month for nothing. Elastic IPs cost $3.60/month each when unattached. Most accounts accumulate 10-30 of these over time.

## Step 7: NAT Gateway vs VPC Endpoints

NAT Gateway charges $0.045/GB for all outbound traffic from private subnets. If your Lambda functions or EC2 instances are calling AWS APIs (S3, DynamoDB, Secrets Manager, SSM) through a NAT Gateway, you're paying for traffic that could go through free VPC endpoints instead.

Ask Claude to audit your VPC endpoint configuration:

```
I pay $180/month in NAT Gateway data processing charges.
My private subnets contain Lambda functions and EC2 instances that
call S3, DynamoDB, SSM Parameter Store, and Secrets Manager.

Which VPC Interface Endpoints and Gateway Endpoints should I create
to eliminate NAT Gateway charges for these services?
Provide the Terraform resource blocks for each endpoint.
```

Claude generates the endpoint Terraform and also flags which services support Gateway endpoints (free: S3, DynamoDB) vs Interface endpoints ($0.01/AZ/hour but cheaper than NAT at scale).

## Savings Summary by Category

| Optimization | Typical Savings | Effort |
|---|---|---|
| Dev/staging schedules | 15-25% of dev costs | Low |
| EC2 rightsizing | 20-35% of EC2 spend | Medium |
| Reserved Instances (1yr) | 30-40% of covered spend | Low |
| S3 Intelligent Tiering | 5-15% of S3 spend | Low |
| NAT Gateway → VPC Endpoints | 10-20% of data transfer | Medium |
| RDS RI purchase | 30-40% of RDS spend | Low |
| Orphaned resources cleanup | $50-300/month (varies) | Low |
| EBS volume rightsizing | 10-20% of EBS spend | Low |

## Related Articles

- [Best AI Tools for Cloud Cost Optimization Across AWS Azure](/best-ai-tools-for-cloud-cost-optimization-across-aws-azure-g/)
- [Best AI Assistants for AWS CloudFormation Template](/best-ai-assistants-for-aws-cloudformation-template-generatio/)
- [How Much Does Cursor AI Actually Cost Per Month All](/how-much-does-cursor-ai-actually-cost-per-month-all-plans/)
- [GitHub Copilot vs Amazon Codewhisperer for AWS Development](/github-copilot-vs-amazon-codewhisperer-for-aws-development-2026/)
- [AI Tools for Writing AWS CDK Infrastructure 2026](/ai-tools-for-writing-aws-cdk-infrastructure-2026/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)

## Frequently Asked Questions

**Are there any hidden costs I should know about?**

Watch for overage charges, API rate limit fees, and costs for premium features not included in base plans. Some tools charge extra for storage, team seats, or advanced integrations. Read the full pricing page including footnotes before signing up.

**Is the annual plan worth it over monthly billing?**

Annual plans typically save 15-30% compared to monthly billing. If you have used the tool for at least 3 months and plan to continue, the annual discount usually makes sense. Avoid committing annually before you have validated the tool fits your needs.

**Can I change plans later without losing my data?**

Most tools allow plan changes at any time. Upgrading takes effect immediately, while downgrades typically apply at the next billing cycle. Your data and settings are preserved across plan changes in most cases, but verify this with the specific tool.

**Do student or nonprofit discounts exist?**

Many AI tools and software platforms offer reduced pricing for students, educators, and nonprofits. Check the tool's pricing page for a discount section, or contact their sales team directly. Discounts of 25-50% are common for qualifying organizations.

**What happens to my work if I cancel my subscription?**

Policies vary widely. Some tools let you access your data for a grace period after cancellation, while others lock you out immediately. Export your important work before canceling, and check the terms of service for data retention policies.
{% endraw %}
