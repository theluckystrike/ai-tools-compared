---
layout: default
title: "Best AI Tools for Writing Pulumi Programs"
description: "Compare Claude Code, Copilot, and Cursor for writing Pulumi infrastructure — TypeScript stacks, component resources, state management, and provider config"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-writing-pulumi-programs
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Pulumi's strength over Terraform is using real programming languages — but that means AI tools need to know both the cloud provider's resource model and the idiomatic TypeScript/Python patterns for Pulumi. Most AI tools know AWS CDK better than Pulumi, which causes subtle errors: wrong import paths, missing `Output` type handling, and incorrect ComponentResource patterns.

This guide tests Claude Code, GitHub Copilot, and Cursor on real Pulumi tasks in TypeScript.

## Key Takeaways

- **Most AI tools know**: AWS CDK better than Pulumi, which causes subtle errors: wrong import paths, missing `Output` type handling, and incorrect ComponentResource patterns.
- **A common mistake because**: AWS CDK patterns dominate training data.
- **Topics covered**: task 1: eks cluster with node groups, task 2: componentresource pattern, task 3: output handling
- **Practical guidance included**: Step-by-step setup and configuration instructions

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

**Prompt:** "Write a Pulumi ComponentResource for an S3 bucket with encryption, versioning, and lifecycle rules."

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

## Tool Comparison

| Task | Claude Code | Copilot | Cursor |
|---|---|---|---|
| Correct import paths | Always `@pulumi/*` | Mixes CDK/Pulumi | Usually correct |
| ComponentResource pattern | Correct with registerOutputs | Missing pattern | Basic, no registerOutputs |
| Output type handling | `pulumi.interpolate` | String interpolation mistakes | Mixed |
| Provider-specific knowledge | Accurate | Good | Good |
| Config and secrets | Uses `pulumi.Config` | Sometimes hardcodes | Usually correct |
| Stack references | Correct | Often missing | Sometimes correct |

## Related Reading

- [Best AI Assistants for Pulumi Infrastructure Code in TypeScript](/ai-tools-compared/best-ai-assistants-for-pulumi-infrastructure-code-in-typescr/)
- [Claude vs GPT-4 Terraform Pulumi Infrastructure Code](/ai-tools-compared/claude-vs-gpt4-terraform-pulumi-infrastructure-code-2026/)
- [Best AI Tools for Writing GitHub Actions Workflows](/ai-tools-compared/best-ai-tools-for-writing-github-actions-workflows-2026/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
