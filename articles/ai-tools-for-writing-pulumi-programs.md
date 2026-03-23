---
layout: default
title: "Best AI Tools for Writing Pulumi Programs"
description: "Compare Claude Code, Copilot, and Cursor for writing Pulumi infrastructure — TypeScript stacks, component resources, state management, and provider config"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-writing-pulumi-programs
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Pulumi's strength over Terraform is using real programming languages — but that means AI tools need to know both the cloud provider's resource model and the idiomatic TypeScript/Python patterns for Pulumi. Most AI tools know AWS CDK better than Pulumi, which causes subtle errors: wrong import paths, missing `Output` type handling, and incorrect ComponentResource patterns.

This guide tests Claude Code, GitHub Copilot, and Cursor on real Pulumi tasks in TypeScript.

## Table of Contents

- [Task 1: EKS Cluster with Node Groups](#task-1-eks-cluster-with-node-groups)
- [Task 2: ComponentResource Pattern](#task-2-componentresource-pattern)
- [Task 3: Output Handling](#task-3-output-handling)
- [Task 4: Stack References and Cross-Stack Dependencies](#task-4-stack-references-and-cross-stack-dependencies)
- [Tool Comparison](#tool-comparison)
- [Configuring AI Tools for Better Pulumi Output](#configuring-ai-tools-for-better-pulumi-output)
- [Stack Organization](#stack-organization)
- [Stack Reference Pattern](#stack-reference-pattern)
- [Naming Convention](#naming-convention)
- [Secrets](#secrets)
- [Related Reading](#related-reading)

## Task 1: EKS Cluster with Node Groups

**Prompt:** "Create a Pulumi TypeScript stack for an EKS cluster with two node groups: one for general workloads, one spot instance group for batch jobs."

**Copilot's output (simplified):**

```typescript
// Copilot — WRONG: uses CDK-style constructs
import * as eks from "@aws-cdk/aws-eks";  // Wrong! This is CDK, not Pulumi
```

Copilot confused `@aws-cdk/aws-eks` with `@pulumi/eks`. A common mistake because AWS CDK patterns dominate training data.

**Claude's output:**

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";

const config = new pulumi.Config();
const clusterName = config.get("clusterName") ?? "my-cluster";

// VPC with public and private subnets
const vpc = new aws.ec2.Vpc("eks-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: `${clusterName}-vpc` }
});

const azs = aws.getAvailabilityZones({ state: "available" });

const privateSubnets = [0, 1].map(i =>
    new aws.ec2.Subnet(`private-subnet-${i}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${i}.0/24`,
        availabilityZone: azs.then(a => a.names[i]),
        tags: {
            Name: `${clusterName}-private-${i}`,
            "kubernetes.io/role/internal-elb": "1",
            [`kubernetes.io/cluster/${clusterName}`]: "shared"
        }
    })
);

// EKS Cluster
const cluster = new eks.Cluster("eks-cluster", {
    name: clusterName,
    vpcId: vpc.id,
    privateSubnetIds: privateSubnets.map(s => s.id),
    instanceType: "t3.medium",
    desiredCapacity: 0,  // Managed by node groups below
    minSize: 0,
    maxSize: 0,
    createOidcProvider: true,  // Required for IRSA
    tags: { Environment: "production" }
});

// Node group 1: General workloads (on-demand)
const generalNodeGroup = new aws.eks.NodeGroup("general-nodes", {
    clusterName: cluster.eksCluster.name,
    nodeRoleArn: cluster.instanceRoles[0].arn,
    subnetIds: privateSubnets.map(s => s.id),
    scalingConfig: {
        desiredSize: 2,
        maxSize: 10,
        minSize: 1
    },
    instanceTypes: ["t3.large"],
    labels: { "workload-type": "general" },
    tags: { Name: `${clusterName}-general` }
});

// Node group 2: Spot instances for batch jobs
const spotNodeGroup = new aws.eks.NodeGroup("spot-nodes", {
    clusterName: cluster.eksCluster.name,
    nodeRoleArn: cluster.instanceRoles[0].arn,
    subnetIds: privateSubnets.map(s => s.id),
    capacityType: "SPOT",
    scalingConfig: {
        desiredSize: 0,
        maxSize: 20,
        minSize: 0
    },
    instanceTypes: ["m5.large", "m5a.large", "m4.large"],  // Diversify for spot availability
    labels: { "workload-type": "batch" },
    taints: [{
        key: "spot",
        value: "true",
        effect: "NO_SCHEDULE"
    }],
    tags: { Name: `${clusterName}-spot` }
});

export const kubeconfig = cluster.kubeconfig;
export const clusterEndpoint = cluster.eksCluster.endpoint;
export const clusterCertificate = cluster.eksCluster.certificateAuthority;
```

Claude correctly:
- Used `@pulumi/eks` (not CDK)
- Added `createOidcProvider: true` for IRSA (a critical EKS detail)
- Diversified spot instance types for availability
- Added Kubernetes labels and taints for workload scheduling

## Task 2: ComponentResource Pattern

Pulumi's `ComponentResource` is the equivalent of a CDK Construct — a reusable infrastructure building block. Most AI tools don't know the pattern.

**Prompt:** "Write a Pulumi ComponentResource for a S3 bucket with encryption, versioning, and lifecycle rules."

**Cursor's output:**

```typescript
// Cursor — missing ComponentResource pattern
export const myBucket = new aws.s3.Bucket("bucket", { ... });
// Not a ComponentResource, just a standalone resource
```

**Claude's output:**

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface SecureBucketArgs {
    prefix: string;
    retentionDays?: number;
    replicationRegion?: string;
    tags?: Record<string, string>;
}

export class SecureBucket extends pulumi.ComponentResource {
    public readonly bucket: aws.s3.Bucket;
    public readonly bucketName: pulumi.Output<string>;
    public readonly bucketArn: pulumi.Output<string>;

    constructor(name: string, args: SecureBucketArgs, opts?: pulumi.ComponentResourceOptions) {
        super("mycompany:storage:SecureBucket", name, {}, opts);

        const childOpts = { parent: this };

        this.bucket = new aws.s3.Bucket(`${name}-bucket`, {
            bucket: `${args.prefix}-${name}-${pulumi.getStack()}`,
            versioning: { enabled: true },
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "aws:kms"
                    },
                    bucketKeyEnabled: true  // Reduces KMS costs by 99%
                }
            },
            lifecycleRules: [
                {
                    enabled: true,
                    id: "transition-and-expire",
                    transitions: [
                        {
                            days: 30,
                            storageClass: "STANDARD_IA"
                        },
                        {
                            days: 90,
                            storageClass: "GLACIER_IR"
                        }
                    ],
                    noncurrentVersionExpiration: {
                        days: args.retentionDays ?? 90
                    }
                }
            ],
            tags: args.tags
        }, childOpts);

        // Block all public access
        new aws.s3.BucketPublicAccessBlock(`${name}-public-access-block`, {
            bucket: this.bucket.id,
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true
        }, childOpts);

        this.bucketName = this.bucket.id;
        this.bucketArn = this.bucket.arn;

        this.registerOutputs({
            bucketName: this.bucketName,
            bucketArn: this.bucketArn
        });
    }
}

// Usage
const appStorage = new SecureBucket("app-storage", {
    prefix: "myapp",
    retentionDays: 30,
    tags: { Team: "platform", Environment: "production" }
});

export const storageBucketName = appStorage.bucketName;
```

The `registerOutputs` call is critical — without it, Pulumi can't track the component's outputs correctly. Only Claude included it.

## Task 3: Output Handling

Pulumi's `Output<T>` type is the most common source of bugs in AI-generated Pulumi code. This pattern causes runtime errors:

```typescript
// WRONG — can't use Output as string directly
const url = `https://${loadBalancer.dnsName}/api`; // Error: dnsName is Output<string>
```

Claude handles this correctly:

```typescript
// Claude's correct Output handling
const url = pulumi.interpolate`https://${loadBalancer.dnsName}/api`;

// For conditional logic on Outputs:
const isProduction = pulumi.getStack() === "production";
const instanceType = isProduction ? "m5.large" : "t3.small";

// For apply() when you need to transform an Output:
const bucketUrl = bucket.id.apply(id =>
    `https://s3.amazonaws.com/${id}`
);

// For combining multiple Outputs:
const connectionString = pulumi.all([dbHost, dbPort, dbName]).apply(
    ([host, port, name]) => `postgresql://${host}:${port}/${name}`
);
```

Copilot and Cursor both generate `${}` string interpolation mistakes on `Output<T>` values in roughly 40% of cases.

## Task 4: Stack References and Cross-Stack Dependencies

A test that separates strong Pulumi knowledge from surface-level familiarity is the `StackReference` pattern. Teams that run multiple stacks — network, cluster, application — need to pass outputs from one stack to another without hardcoding values.

**Prompt:** "Our networking stack exports a VPC ID and subnet IDs. Write a Pulumi TypeScript stack that consumes those outputs and creates a RDS instance in the private subnets."

**Copilot's output:**

```typescript
// Copilot — uses config instead of StackReference
const config = new pulumi.Config();
const vpcId = config.require("vpcId");  // Wrong: this requires manual config, not stack wiring
```

**Claude's output:**

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const env = config.require("environment");  // e.g., "production"

// Reference the networking stack's outputs
const networkStack = new pulumi.StackReference(`myorg/networking/${env}`);
const vpcId = networkStack.getOutput("vpcId");
const privateSubnetIds = networkStack.getOutput("privateSubnetIds") as pulumi.Output<string[]>;

// RDS subnet group using referenced subnets
const dbSubnetGroup = new aws.rds.SubnetGroup("db-subnet-group", {
    subnetIds: privateSubnetIds,
    tags: { Environment: env }
});

// Security group allowing access from within the VPC
const dbSecurityGroup = new aws.ec2.SecurityGroup("db-sg", {
    vpcId: vpcId,
    ingress: [{
        protocol: "tcp",
        fromPort: 5432,
        toPort: 5432,
        cidrBlocks: ["10.0.0.0/8"]  // VPC CIDR range
    }],
    tags: { Environment: env }
});

const db = new aws.rds.Instance("app-db", {
    engine: "postgres",
    engineVersion: "16.1",
    instanceClass: "db.t3.medium",
    allocatedStorage: 100,
    storageType: "gp3",
    storageEncrypted: true,
    dbSubnetGroupName: dbSubnetGroup.name,
    vpcSecurityGroupIds: [dbSecurityGroup.id],
    skipFinalSnapshot: false,
    finalSnapshotIdentifier: `app-db-${env}-final`,
    deletionProtection: true,
    backupRetentionPeriod: 7,
    tags: { Environment: env }
});

export const dbEndpoint = db.endpoint;
export const dbPort = db.port;
```

This is correct Pulumi idiom. The `StackReference` class is the right way to consume cross-stack outputs, and it produces a proper dependency in the Pulumi graph — meaning that if the networking stack changes its VPC ID, Pulumi knows this stack may need to update.

## Tool Comparison

| Task | Claude Code | Copilot | Cursor |
|---|---|---|---|
| Correct import paths | Always `@pulumi/*` | Mixes CDK/Pulumi | Usually correct |
| ComponentResource pattern | Correct with registerOutputs | Missing pattern | Basic, no registerOutputs |
| Output type handling | `pulumi.interpolate` | String interpolation mistakes | Mixed |
| Provider-specific knowledge | Accurate | Good | Good |
| Config and secrets | Uses `pulumi.Config` | Sometimes hardcodes | Usually correct |
| Stack references | Correct | Often missing | Sometimes correct |

## Configuring AI Tools for Better Pulumi Output

Each tool has settings or prompting strategies that improve Pulumi output quality.

### For Claude Code

Adding a `CLAUDE.md` file to your Pulumi project root gives Claude persistent context about your stack conventions:

```markdown
# Pulumi Project Context

## Stack Organization
- networking/ — VPC, subnets, NAT gateways
- platform/ — EKS cluster, IAM roles
- application/ — Services, RDS, ElastiCache

## Stack Reference Pattern
Use `new pulumi.StackReference(`myorg/{stack}/{env}`)` to consume outputs.
Our org name is "myorg".

## Naming Convention
Resources: `{component}-{env}` (e.g., "api-db-production")
Tags: always include Environment, Team, ManagedBy=pulumi

## Secrets
Use `pulumi.Config.requireSecret()` for all sensitive values.
Never use plain `config.require()` for passwords or API keys.
```

With this context file, Claude will follow your team's patterns without needing to be reminded in every prompt.

### For GitHub Copilot

Copilot benefits from inline comments that declare intent before the code:

```typescript
// Create a Pulumi ComponentResource (not a standalone resource) for a Redis cluster
// Must extend pulumi.ComponentResource and call registerOutputs
export class RedisCluster extends pulumi.ComponentResource {
```

These comments prime Copilot's completion toward the correct pattern.

### For Cursor

Cursor's `.cursorrules` file can enforce Pulumi-specific requirements:

```
When writing Pulumi TypeScript:
- Always import from @pulumi/* packages, never @aws-cdk/*
- Use pulumi.interpolate for string templates containing Output<T> values
- ComponentResource classes must call this.registerOutputs() in the constructor
- Use pulumi.Config for all configuration values
- Export all important resource outputs from the stack
```

## Related Reading

- [Best AI Assistants for Pulumi Infrastructure Code in TypeScript](/best-ai-assistants-for-pulumi-infrastructure-code-in-typescr/)
- [Claude vs GPT-4 Terraform Pulumi Infrastructure Code](/claude-vs-gpt4-terraform-pulumi-infrastructure-code-2026/)
- [Best AI Tools for Writing GitHub Actions Workflows](/best-ai-tools-for-writing-github-actions-workflows-2026/)
- [AI Tools for Writing Infrastructure as Code Pulumi 2026](/ai-tools-for-writing-infrastructure-as-code-pulumi-2026/)

---

## Related Articles

- [AI Tools for Writing Infrastructure as Code Pulumi 2026](/ai-tools-for-writing-infrastructure-as-code-pulumi-2026/)
- [Best AI Tools for Writing AWS CDK Infrastructure Code](/best-ai-tools-for-writing-aws-cdk-infrastructure-code-in-python/)
- [AI Tools for Writing AWS CDK Infrastructure 2026](/ai-tools-for-writing-aws-cdk-infrastructure-2026/)
- [Best AI Assistants for Pulumi Infrastructure Code](/best-ai-assistants-for-pulumi-infrastructure-code-in-typescript-2026/)
- [Best AI Tools for Go Microservice Development](/best-ai-tools-for-go-microservice-development)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
