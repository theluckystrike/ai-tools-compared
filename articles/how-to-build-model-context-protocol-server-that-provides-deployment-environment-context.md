---
layout: default
title: "How to Build a Model Context Protocol Server That"
description: "Learn how to build a Model Context Protocol server that gives AI coding assistants access to your deployment environment details, enabling more"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/
categories: [guides]
tags: [ai-tools-compared, tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---
Build an MCP server that exposes your deployment environment details to AI coding assistants by creating a Node.js server using the Model Context Protocol that returns structured information about cloud provider, regions, container orchestration, and infrastructure configuration. This context enables your AI assistant to generate Terraform, Kubernetes manifests, and deployment workflows that match your actual infrastructure setup.



## Understanding MCP Servers and Deployment Context



MCP servers act as bridges between AI models and external systems. A deployment environment context server provides information about your infrastructure—cloud provider, region, container orchestration platform, environment variables, secrets management, and networking configuration. With this context, your AI assistant can generate Terraform configurations that match your AWS setup, Kubernetes manifests that respect your existing namespace conventions, or GitHub Actions workflows that deploy to your specific infrastructure.



The protocol follows a request-response pattern where the AI sends a request to your server, and your server returns structured data. Building this server gives you control over exactly what environment information your AI can access.



## Setting Up Your MCP Server Project



Start by creating a new Node.js project for your MCP server:



```bash
mkdir deployment-context-mcp && cd deployment-context-mcp
npm init -y
npm install @modelcontextprotocol/server std
```


Create the main server file:



```typescript
// server.ts
import { Server } from "@modelcontextprotocol/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio.js";

const server = new Server(
  {
    name: "deployment-context-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "get_deployment_context",
        description: "Returns current deployment environment details including cloud provider, region, cluster info, and relevant configuration.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_kubernetes_context",
        description: "Returns Kubernetes-specific context including namespace, available services, and ingress configurations.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_deployment_context") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            cloudProvider: "aws",
            region: "us-west-2",
            environment: "production",
            services: [
              { name: "api-gateway", type: "ecs", port: 8080 },
              { name: "auth-service", type: "ecs", port: 3001 },
              { name: "data-processing", type: "lambda" }
            ],
            database: {
              primary: { type: "aurora-postgresql", version: "15.4" },
              cache: { type: "elasticache-redis", version: "7.0" }
            },
            networking: {
              vpcCidr: "10.0.0.0/16",
              privateSubnets: ["10.0.1.0/24", "10.0.2.0/24"],
              loadBalancerArn: "arn:aws:elasticloadbalancing:us-west-2:123456789:loadbalancer/app/prod-lb/abc123"
            }
          }, null, 2),
        },
      ],
    };
  }

  if (name === "get_kubernetes_context") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            currentContext: "production",
            namespace: "production",
            availableNamespaces: ["development", "staging", "production"],
            ingressClass: "nginx",
            storageClass: "gp3",
            serviceMesh: "istio"
          }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```


## Connecting to Your Actual Infrastructure



For production use, replace the hardcoded values with real infrastructure queries. The following examples show how to fetch actual deployment context from different sources.



### AWS Integration



Query your AWS environment directly:



```typescript
import { ECSClient, DescribeClustersCommand } from "@aws-sdk/client-ecs";

async function getAWSContext() {
  const ecs = new ECSClient({ region: process.env.AWS_REGION || "us-west-2" });
  
  const clusterResponse = await ecs.send(new DescribeClustersCommand({
    clusters: [process.env.ECS_CLUSTER_NAME]
  }));
  
  const cluster = clusterResponse.clusters[0];
  
  return {
    cloudProvider: "aws",
    region: process.env.AWS_REGION || "us-west-2",
    ecs: {
      clusterName: cluster.clusterName,
      clusterArn: cluster.clusterArn,
      runningTasks: cluster.runningTasksCount,
      services: cluster.activeServicesCount
    }
  };
}
```


### Kubernetes Integration



Query your current Kubernetes context using the official client:



```typescript
import * as k8s from "@kubernetes/client-node";

async function getKubernetesContext() {
  const kc = new k8s.Config.fromDefault();
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  
  const namespaceResponse = await k8sApi.listNamespace();
  const namespaces = namespaceResponse.body.items.map(ns => ns.metadata.name);
  
  return {
    currentContext: kc.getCurrentContext(),
    namespace: kc.getCurrentNamespace() || "default",
    namespaces,
    storageClass: await getStorageClass(k8sApi),
    ingressClass: await getIngressClass(k8sApi)
  };
}

async function getStorageClass(api: k8s.CoreV1Api) {
  const scResponse = await api.listStorageClass();
  return scResponse.body.items.map(sc => sc.metadata.name);
}
```


## Registering Your Server with Claude Code



After building your server, register it with your AI assistant. For Claude Code, add it to your configuration:



```bash
# Add to your claude.json or project-specific settings
claude mcp add deployment-context ./server.py
```


For Cursor, add it through the settings interface under "MCP Servers" with the path to your server executable.



## Practical Example: Generating Environment-Aware Code



With your deployment context server running, your AI assistant can now generate infrastructure-aware code. Consider this prompt:



> "Create a Kubernetes deployment manifest for a Node.js API service"



Without deployment context, the AI might generate a generic manifest. With your MCP server providing context, it can generate:



```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    environment: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: your-registry/api-gateway:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: connection-string
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
```


The manifest now includes your production namespace, appropriate resource limits, and secret references matching your actual Kubernetes configuration.



## Extending Your Server



Beyond basic context, consider adding these capabilities:



- Secrets retrieval: Safely expose non-sensitive metadata about secrets without exposing actual values

- Environment-specific configuration: Return different values for development, staging, and production

- Compliance rules: Include tagging requirements, network policies, or security constraints specific to your organization

- Dependency mapping: Show which services communicate with each other to help the AI understand integration points



## Security Considerations



When building your deployment context server, follow these practices:



Never expose actual secrets or credentials through your MCP server. Return only metadata and configuration patterns. Implement authentication if your server will be used by multiple team members. Consider rate limiting to prevent abuse, and audit logging to track which tools accessed what information.



## Testing Your Implementation



Verify your server works correctly before using it with your AI assistant:



```bash
# Test the server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server.js
```


You should receive a list of available tools. Then test each tool individually to confirm it returns the expected data structure.









## Related Articles

- [How to Build Model Context Protocol Server That Provides](/ai-tools-compared/how-to-build-model-context-protocol-server-that-provides-deployment-environment-context/)
- [How to Build Model Context Protocol Server That Provides Rea](/ai-tools-compared/how-to-build-model-context-protocol-server-that-provides-rea/)
- [How to Build Model Context Protocol Server for Internal Desi](/ai-tools-compared/how-to-build-model-context-protocol-server-for-internal-desi/)
- [How to Build a Model Context Protocol Server That Serves](/ai-tools-compared/how-to-build-model-context-protocol-server-that-serves-opena/)
- [How to Create Model Context Protocol Server That Serves API](/ai-tools-compared/how-to-create-model-context-protocol-server-that-serves-api-/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
