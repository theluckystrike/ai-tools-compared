---
layout: default
title: "Best AI Tools for Writing AWS CDK Infrastructure Code"
description: "A practical comparison of AI coding tools for writing AWS CDK infrastructure code in Python, featuring code examples and recommendations for developers"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /best-ai-tools-for-writing-aws-cdk-infrastructure-code-in-python/
categories: [guides]
tags: [ai-tools-compared, tools, aws, cdk, python, best-of, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---

{% raw %}

Several AI tools excel at this task. This guide recommends the best options based on specific use cases and shows you which tool to choose for your situation.

This guide evaluates the best AI tools for writing AWS CDK infrastructure code in Python, focusing on practical output quality and developer experience.

Table of Contents

- [Why AI Tools Matter for AWS CDK Development](#why-ai-tools-matter-for-aws-cdk-development)
- [Claude Code](#claude-code)
- [GitHub Copilot](#github-copilot)
- [Amazon CodeWhisperer](#amazon-codewhisperer)
- [Cursor](#cursor)
- [Tool Comparison at a Glance](#tool-comparison-at-a-glance)
- [Practical Recommendations](#practical-recommendations)
- [Prompting Tips for Better CDK Output](#prompting-tips-for-better-cdk-output)
- [Related Reading](#related-reading)

Why AI Tools Matter for AWS CDK Development

AWS CDK Python code differs from typical application code. You work with constructs from the AWS Construct Library, manage stack outputs, handle cross-stack references, and ensure proper IAM permissions. The abstraction level means more boilerplate than handwritten Terraform, and the CDK v2 migration introduced changes that still cause confusion when AI tools suggest deprecated v1 patterns.

AI tools help in several key areas:

- Generating complete construct definitions from high-level requirements
- Creating proper IAM roles and policies with least-privilege principles
- Setting up cross-stack references and output exports
- Converting CloudFormation concepts to CDK equivalents
- Handling AWS service-specific patterns (VPC setups, Lambda configurations, etc.)

The best tools understand both Python typing and AWS service semantics, producing code that follows CDK best practices. Poor AI suggestions in this domain typically manifest as: missing `from constructs import Construct`, using CDK v1 import paths, or generating IAM policies that grant `*` permissions rather than scoped resource ARNs.

Claude Code

Claude Code provides terminal-based AI assistance suitable for developers working in command-line environments. For CDK projects, it excels at generating complete stack definitions and explaining AWS service configurations.

A typical interaction might produce a VPC construct with proper subnet configuration:

```python
from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_iam as iam,
)
from constructs import Construct

class VpcStack(Stack):
    def __init__(self, scope: Construct, id: str, kwargs):
        super().__init__(scope, id, kwargs)

        # Create VPC with public and private subnets
        self.vpc = ec2.Vpc(
            self, "MainVpc",
            cidr="10.0.0.0/16",
            max_azs=2,
            nat_gateway=ec2.NatGatewayProviderValue.ONE_PER_AVAILABILITY_ZONE,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                )
            ]
        )
```

Claude Code handles the CDK v2 import patterns correctly and produces syntax-valid Python. Its strength lies in generating infrastructure that follows AWS Well-Architected Framework patterns without requiring extensive prompt engineering. It also explains why it chose particular configuration values, which is useful when onboarding engineers who are new to CDK.

Pro tip for Claude Code CDK prompts: Include your AWS region, account structure (single-account vs. multi-account), and whether you need environment-agnostic stacks. This context significantly improves the relevance of generated cross-account configurations.

GitHub Copilot

GitHub Copilot integrates directly into popular IDEs like VS Code and PyCharm, providing inline suggestions as you type. For CDK development, it works well for iterative construct modifications and completing partially written infrastructure definitions.

Copilot excels at context-aware completions. When you start defining a S3 bucket construct, it suggests common configurations like versioning, encryption, and lifecycle rules:

```python
from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_s3_deployment as s3_deploy,
)
from constructs import Construct

class WebsiteStack(Stack):
    def __init__(self, scope: Construct, id: str, kwargs):
        super().__init__(scope, id, kwargs)

        bucket = s3.Bucket(
            self, "SiteBucket",
            website_index_document="index.html",
            public_read_access=True,
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="CleanupOldVersions",
                    enabled=True,
                    expiration=aws_cdk.Duration.days(30),
                )
            ]
        )
```

The IDE integration means Copilot sees your current file and project structure, making suggestions that align with existing patterns. However, it sometimes suggests CDK v1 patterns that require adaptation for CDK v2. Watch particularly for old-style `core.Duration` references and the deprecated `@aws-cdk/aws-*` import paths, Copilot occasionally generates these even in v2 projects.

When Copilot works best for CDK: It excels at filling in construct properties you are mid-way through writing. Start the construct definition yourself, then let Copilot complete the property list. This approach uses its completion strengths while avoiding the v1/v2 confusion that appears when generating from scratch.

Amazon CodeWhisperer

Amazon CodeWhisperer, particularly the professional tier, offers specialized knowledge of AWS services and CDK constructs. Developed by Amazon specifically for AWS development, it understands service-specific patterns deeply.

For Lambda function definitions, CodeWhisperer generates configurations that properly integrate with other AWS services:

```python
from aws_cdk import (
    Stack,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
)
from constructs import Construct

class ApiStack(Stack):
    def __init__(self, scope: Construct, id: str, kwargs):
        super().__init__(scope, id, kwargs)

        # Create Lambda function with proper runtime and settings
        handler = lambda_.Function(
            self, "ApiHandler",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="index.handler",
            code=lambda_.Code.from_asset("lambda"),
            environment={
                "LOG_LEVEL": "INFO",
                "TABLE_NAME": "my-table"
            },
            timeout=aws_cdk.Duration.seconds(30),
            memory_size=256
        )

        # Grant Lambda permissions to access DynamoDB
        table = aws_dynamodb.Table.from_table_name(self, "Table", "my-table")
        table.grant_read_write_data(handler)
```

CodeWhisperer automatically suggests IAM permissions based on the AWS resources your code references, reducing the manual policy writing burden. This AWS-native focus makes it particularly strong for CDK development. The professional tier also provides security scanning that flags over-permissive IAM statements before you deploy, which is a genuine time-saver during review.

CodeWhisperer's biggest advantage: When you call `table.grant_read_write_data(handler)`, it understands that this produces scoped IAM permissions on the specific table ARN rather than a wildcard, and it propagates that understanding to suggest similarly scoped grants elsewhere in your stack.

Cursor

Cursor, built on VS Code with AI integration, offers a hybrid approach combining inline suggestions with chat-based interactions. Its workspace-aware context understanding makes it effective for larger CDK projects with multiple stacks.

For complex multi-stack architectures, Cursor can generate the complete structure:

```python
main_stack.py
from aws_cdk import Stack
from constructs import Construct
from .compute_stack import ComputeStack
from .data_stack import DataStack

class MainStack(Stack):
    def __init__(self, scope: Construct, id: str, kwargs):
        super().__init__(scope, id, kwargs)

        # Create data stack first (dependencies)
        data_stack = DataStack(self, "DataStack")

        # Create compute stack with reference to data
        compute_stack = ComputeStack(
            self, "ComputeStack",
            db_secret=data_stack.db_secret,
            vpc=data_stack.vpc
        )

        # Export values from compute stack
        self.api_endpoint = compute_stack.api_url
```

Cursor's strength is managing inter-stack references and ensuring proper construct ordering, which becomes critical as infrastructure grows in complexity. When you use `@codebase` in Cursor's chat, it can read across all your stack files simultaneously and flag circular dependencies or missing outputs before you run `cdk synth`.

Tool Comparison at a Glance

| Feature | Claude Code | GitHub Copilot | CodeWhisperer | Cursor |
|---|---|---|---|---|
| CDK v2 accuracy | Excellent | Good | Excellent | Good |
| IAM policy quality | Good | Fair | Excellent | Good |
| Multi-stack awareness | Good | Limited | Good | Excellent |
| Inline IDE suggestions | No | Yes | Yes | Yes |
| Chat-based generation | Yes | Limited | No | Yes |
| Security scanning | No | No | Yes (Pro) | No |
| Explains design choices | Yes | No | No | Partial |

Practical Recommendations

Choosing the right AI tool depends on your workflow and project requirements:

For terminal-focused developers: Claude Code provides CDK generation without leaving your command-line environment. Its explanations help developers learn CDK concepts alongside implementation, making it useful for teams building their CDK knowledge.

For IDE-integrated workflows: GitHub Copilot offers the smoothest integration with existing development environments, with reasonable CDK understanding despite occasional version mismatches. Use it for property completion rather than full stack generation.

For AWS-heavy projects: Amazon CodeWhisperer's deep AWS service knowledge and automatic IAM permission suggestions provide tangible time savings for CDK development. The built-in security scanning catches common IAM mistakes before they reach production.

For complex multi-stack architectures: Cursor's workspace awareness and chat capabilities handle projects with many interdependent stacks more effectively than inline-only solutions. The ability to reference multiple stack files in a single chat interaction is particularly valuable when debugging cross-stack reference issues.

All tools require review before production deployment. Generated IAM policies particularly need scrutiny for least-privilege compliance, and CDK constructs should match your organization's tagging and naming conventions. Run `cdk diff` against your existing stacks before applying AI-generated changes, even for seemingly minor modifications.

The AI market evolves rapidly, and tool capabilities improve continuously. Testing current versions against your specific use cases provides the most accurate basis for selection.

Prompting Tips for Better CDK Output

Regardless of which tool you use, how you phrase your prompts significantly affects the quality of generated CDK code.

State your CDK version explicitly. "Generate CDK v2 Python code" avoids the v1 import pattern mistakes that affect all tools to some degree.

Provide your account and environment context. "This stack deploys to a single AWS account in us-east-1 with no cross-account sharing" helps the AI avoid generating unnecessary `aws_cdk.Environment` configurations or cross-account role assumptions.

Ask for removal policies explicitly. Destructive resources like databases and S3 buckets get `RemovalPolicy.RETAIN` by default in CDK, but AI tools often generate `RemovalPolicy.DESTROY` for development convenience. State your preference upfront: "Use RETAIN removal policy on all stateful resources."

Request `cdk.json` context integration. If your project uses `cdk.json` for feature flags and environment variables, mention this. AI tools can generate code that reads from the CDK context using `self.node.try_get_context("my_value")` rather than hardcoding configuration values.

Ask for stack outputs. Generated stacks often omit `CfnOutput` declarations. Explicitly requesting "include stack outputs for any endpoint URLs, bucket names, or ARNs that downstream systems would need" produces more complete infrastructure code.

Related Articles

- [AI Tools for Writing AWS CDK Infrastructure 2026](/ai-tools-for-writing-aws-cdk-infrastructure-2026/)
- [Claude vs ChatGPT for Creating AWS CDK Infrastructure](/claude-vs-chatgpt-for-creating-aws-cdk-infrastructure-stacks/)
- [AI Tools for Writing Infrastructure as Code Pulumi 2026](/ai-tools-for-writing-infrastructure-as-code-pulumi-2026/)
- [Best AI Tools for Infrastructure as Code 2026](/ai-tools-for-infrastructure-as-code-2026/)
- [AI Tools for Writing pytest Tests with Moto Library for AWS](/ai-tools-for-writing-pytest-tests-with-moto-library-for-aws-/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)

Frequently Asked Questions

Are free AI tools good enough for ai tools for writing aws cdk infrastructure code?

Free tiers work for basic tasks and evaluation, but paid plans typically offer higher rate limits, better models, and features needed for professional work. Start with free options to find what works for your workflow, then upgrade when you hit limitations.

How do I evaluate which tool fits my workflow?

Run a practical test: take a real task from your daily work and try it with 2-3 tools. Compare output quality, speed, and how naturally each tool fits your process. A week-long trial with actual work gives better signal than feature comparison charts.

Do these tools work offline?

Most AI-powered tools require an internet connection since they run models on remote servers. A few offer local model options with reduced capability. If offline access matters to you, check each tool's documentation for local or self-hosted options.

How quickly do AI tool recommendations go out of date?

AI tools evolve rapidly, with major updates every few months. Feature comparisons from 6 months ago may already be outdated. Check the publication date on any review and verify current features directly on each tool's website before purchasing.

Should I switch tools if something better comes out?

Switching costs are real: learning curves, workflow disruption, and data migration all take time. Only switch if the new tool solves a specific problem you experience regularly. Marginal improvements rarely justify the transition overhead.

{% endraw %}
