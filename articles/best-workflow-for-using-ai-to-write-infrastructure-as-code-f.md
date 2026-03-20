---

layout: default
title: "Best Workflow for Using AI to Write Infrastructure as Code from Diagrams"
description: "A practical guide for developers on how to use AI tools to convert architecture diagrams into production-ready Terraform, CloudFormation, or Pulumi code with proven workflows."
date: 2026-03-16
author: theluckystrike
permalink: /best-workflow-for-using-ai-to-write-infrastructure-as-code-f/
categories: [guides]
tags: [tools]
---


Converting architecture diagrams into infrastructure as code (IaC) has traditionally been a time-consuming manual task. Developers draw the desired infrastructure, then manually write Terraform, CloudFormation, or Pulumi code to match. AI tools now offer a more efficient path—transforming visual diagrams directly into deployable infrastructure code. This guide shows you the most effective workflow for achieving this conversion reliably.



## Why Use AI for Diagram-to-Code Conversion



Manual IaC creation from diagrams introduces several pain points. You must translate each component—VPCs, subnets, load balancers, compute instances—into the correct provider syntax. Minor mistakes lead to deployment failures or security misconfigurations. AI accelerates this process by understanding both the visual representation and the corresponding code patterns.



The key advantage lies in AI's ability to recognize common architectural patterns. When you describe a three-tier web application with a load balancer, database, and auto-scaling compute, AI can generate the complete Terraform module with appropriate variables, outputs, and security group rules.



## The Recommended Workflow



### Step 1: Prepare Your Diagram



Before feeding anything to an AI tool, ensure your diagram contains sufficient detail. AI performs best when the diagram clearly shows:



- All network components (VPCs, subnets, routing tables)

- Compute resources (instances, containers, serverless functions)

- Data stores (databases, caches, object storage)

- Security boundaries (security groups, NACLs, IAM roles)

- Connectivity between components



If you're using a tool like draw.io, Lucidchart, or even a hand-drawn sketch photographed on your phone, the clarity of component labels matters significantly. Label your AWS resources as "AWS RDS PostgreSQL" rather than just "Database."



### Step 2: Choose Your AI Tool and Context Strategy



Different AI tools handle diagram-to-code conversion with varying strengths. The workflow differs slightly depending on whether you're using Claude, ChatGPT, or Cursor.



For Claude or ChatGPT, provide the diagram description in a structured prompt. Include the cloud provider, all components visible, and any specific requirements like high availability or encryption. The more context you provide upfront, the better the initial output.



For Cursor, you can use its file context capabilities. Create a new Terraform file in your project, then use Cursor's chat to describe the diagram while referencing any existing infrastructure code in your workspace. This helps maintain consistency with your existing module patterns.



### Step 3: Generate Initial Code with Clear Prompts



The prompt you use determines code quality. Here's a proven prompt structure:



> "Generate a Terraform module for an AWS architecture described as follows: VPC with CIDR 10.0.0.0/16, three public subnets across three availability zones, three private subnets for application tier, NAT gateway in each public subnet, Application Load Balancer with HTTP/HTTPS listeners, Auto Scaling Group with EC2 instances, RDS MySQL instance in private subnets, ElastiCache Redis cluster, and S3 bucket for static assets. Include appropriate security groups, outputs for all resource IDs, and use variables for customizable parameters."



This prompt provides specific CIDR ranges, component types, and explicitly requests variables and outputs. The result will be far more usable than a vague request.



### Step 4: Review and Refine Generated Code



AI-generated infrastructure code requires careful review before deployment. Check these critical areas:



Resource naming and tags: Ensure resources follow your organization's naming conventions. Add appropriate tags for cost allocation and automation.



Security configuration: Verify security group rules follow least-privilege principles. Check that databases are not exposed to the public internet.



Dependencies: Confirm `depends_on` declarations exist where implicit dependencies aren't enough—particularly for databases that other resources must wait for.



Variable validation: Add `validation` blocks to variables to catch misconfiguration early. For example, validate that VPC CIDR ranges don't overlap:



```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Invalid VPC CIDR block format."
  }
}
```


### Step 5: Iterate with Specific Fixes



Rather than regenerating everything, ask AI to fix specific issues. This iterative approach produces better results:



> "Add conditional enablement for the NAT gateways to reduce costs in development environments."



> "Refactor the security groups to use a shared module pattern instead of inline rules."



> "Add lifecycle hooks to the Auto Scaling Group for blue-green deployment support."



This targeted refinement helps the AI understand your exact requirements without starting over.



## Practical Example: VPC with Public and Private Subnets



Here's a real workflow example converting a simple network diagram into Terraform:



Input description: "AWS VPC with 10.0.0.0/16 CIDR, one public subnet in each of three AZs (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24), one private subnet in each AZ for compute (10.0.101.0/24, 10.0.102.0/24, 10.0.103.0/24), one private subnet in each AZ for RDS (10.0.201.0/24, 10.0.202.0/24, 10.0.203.0/24). Include an Internet Gateway and route tables."



**Generated Terraform module** (simplified excerpt):



```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AZs for subnet placement"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone = var.availability_zones[count.index]
  
  map_public_ip_on_launch = true
  
  tags = {
    Name = "public-subnet-${count.index + 1}"
    Type = "public"
  }
}

resource "aws_subnet" "private_compute" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 101)
  availability_zone = var.availability_zones[count.index]
  
  tags = {
    Name = "private-compute-${count.index + 1}"
    Type = "compute"
  }
}

resource "aws_subnet" "private_database" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 201)
  availability_zone = var.availability_zones[count.index]
  
  tags = {
    Name = "private-database-${count.index + 1}"
    Type = "database"
  }
}
```


You would then iterate to add the Internet Gateway, NAT Gateways, route tables, and other components.



## Common Pitfalls to Avoid



Under-specifying requirements: Vague prompts produce vague code. Always specify exact CIDR ranges, instance types, and provider-specific configurations.



Ignoring state management: AI doesn't understand your existing Terraform state. When modifying existing infrastructure, carefully compare generated code against what's already deployed.



Skipping testing: Always run `terraform plan` before `terraform apply`. AI generates code that may not match your specific requirements—testing catches these mismatches.



Not using version constraints: Pin provider versions in your configuration. AI may generate code for a newer provider version with breaking changes.



## When AI Falls Short



Complex enterprise architectures sometimes exceed AI's capabilities. Multi-account AWS organizations with shared services, intricate network topologies with transit gateways, or highly regulated compliance requirements may need manual expert intervention. Use AI as a productivity multiplier for the 80% of standard patterns, then handle edge cases manually.



The workflow works best for standard architectures: VPCs, compute clusters, load balancers, databases, and common data stores. As your infrastructure becomes more specialized, expect to do more manual refinement.



## Final Recommendations



Start with simple diagrams and work up to complex architectures. Each iteration teaches the AI tool your organization's patterns and preferences. Maintain a library of tested Terraform modules generated through this process—you can feed these back as context for future diagram-to-code conversions.



The combination of clear diagram preparation, detailed prompts, careful code review, and iterative refinement creates a powerful workflow for infrastructure automation. Practice this approach on non-production resources first, then apply it to your production infrastructure once comfortable with the results.



Built by theluckystrike — More at [zovo.one](https://zovo.one)

