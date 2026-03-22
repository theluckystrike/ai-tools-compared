---
layout: default
title: "How to Use AI for Network Policy Generation 2026"
description: "Use Claude to generate Kubernetes NetworkPolicy, Calico GlobalNetworkPolicy, and AWS security group rules — with default-deny, egress control, and namespacing"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-use-ai-for-network-policy-generation-2026/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

# How to Use AI for Network Policy Generation 2026

Kubernetes NetworkPolicy objects are easy to get wrong — a missing `podSelector`, wrong `namespaceSelector`, or forgotten DNS egress rule can silently break connectivity or leave services over-exposed. AI tools are good at generating policy boilerplate, but you need to understand what to ask for.

## Default Deny All

Start with a default deny posture and add explicit allow rules. Never start with an allow-all.

**Prompt to Claude:**
```text
Generate Kubernetes NetworkPolicy default-deny policies for a namespace called "production".
Deny all ingress AND egress by default. Apply to all pods in the namespace.
```

**Claude output:**

```yaml
# Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}   # applies to all pods in namespace
  policyTypes:
    - Ingress
  # no ingress rules = deny all

---
# Default deny all egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  # no egress rules = deny all
```

The `podSelector: {}` (empty selector) applies to all pods in the namespace. Most mistakes here involve a missing `policyTypes` field — without it, Kubernetes only applies the policy type that has rules defined.

## Allow Specific Traffic

**Prompt:**
```text
Write NetworkPolicy for a 3-tier app in namespace "production":
- frontend (app: frontend) receives ingress on port 80/443 from the internet (no podSelector restriction)
- api (app: api) receives ingress only from frontend pods
- database (app: postgres) receives ingress only from api pods on port 5432
- All pods can egress to kube-dns (port 53 UDP/TCP) for DNS resolution
- api pods can egress to external HTTPS (port 443) for third-party APIs
```

**Claude output:**

```yaml
# Allow ingress to frontend from anywhere
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Ingress
  ingress:
    - ports:
        - port: 80
          protocol: TCP
        - port: 443
          protocol: TCP
      # No "from" block = allow from anywhere (including internet via LoadBalancer)

---
# Allow API to receive only from frontend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-from-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8080
          protocol: TCP

---
# Allow Postgres to receive only from API on port 5432
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-postgres-from-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - port: 5432
          protocol: TCP

---
# Allow all pods to reach DNS (kube-dns in kube-system)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP

---
# Allow API to reach external HTTPS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-external-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - port: 443
          protocol: TCP
```

The DNS egress policy requires both `namespaceSelector` and `podSelector` in a single `to` entry — they're AND'd, not OR'd (when in the same list item). Claude gets this right. ChatGPT often writes them as separate entries, which creates an OR condition and is too permissive.

The external egress policy uses `ipBlock` with `except` to allow external traffic while blocking RFC 1918 ranges — preventing lateral movement through external egress rules.

## Calico GlobalNetworkPolicy

For Calico, you can write cluster-wide policies:

**Prompt:**
```text
Write a Calico GlobalNetworkPolicy that:
- Blocks all traffic between production and staging namespaces
- Allows monitoring namespace to scrape metrics (port 9090) from all pods
- Applies cluster-wide
```

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-prod-staging-cross-traffic
spec:
  selector: "projectcalico.org/namespace in {'production', 'staging'}"
  order: 100
  ingress:
    - action: Deny
      source:
        namespaceSelector: >-
          projectcalico.org/namespace in {'production', 'staging'}
          && projectcalico.org/namespace != '{{ .Namespace }}'
  types:
    - Ingress

---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-monitoring-scrape
spec:
  selector: all()
  order: 50   # Higher priority (lower number = higher priority in Calico)
  ingress:
    - action: Allow
      source:
        namespaceSelector: "projectcalico.org/namespace == 'monitoring'"
      destination:
        ports: [9090, 9091, 8080]   # metrics ports
  types:
    - Ingress
```

## AWS Security Group Generation

**Prompt:**
```text
Generate Terraform for AWS security groups for the same 3-tier app.
ALB → web (port 80, 443), web → app (port 8080), app → RDS (port 5432).
Include self-referencing rules for cluster communication.
```

```hcl
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "ALB security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web tier security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "App tier security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }
}

resource "aws_security_group" "rds" {
  name        = "rds-sg"
  description = "RDS security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}
```

Claude uses security group references (not CIDR blocks) for inter-tier rules — this is correct for AWS and survives IP changes. ChatGPT sometimes uses CIDR blocks, which is less secure.

## Related Reading

- [AI-Powered Service Mesh Configuration](/ai-tools-compared/ai-powered-service-mesh-configuration-2026/)
- [AI-Powered API Gateway Configuration Tools](/ai-tools-compared/ai-powered-api-gateway-configuration-tools-2026/)
- [AI Tools for Automated Load Balancer Config](/ai-tools-compared/ai-tools-for-load-balancer-config-2026/)

---

## Related Articles

- [How to Use AI to Generate Kubernetes Network Policies](/ai-tools-compared/how-to-use-ai-to-generate-kubernetes-network-policies-correc/)
- [AI Tools for Writing Kubernetes Network Policies 2026](/ai-tools-compared/ai-tools-for-writing-kubernetes-network-policies-2026/)
- [Best AI Tools for Kubernetes Manifest Generation](/ai-tools-compared/best-ai-tools-for-kubernetes-manifest-generation/)
- [AI Policy Management Tools Enterprise Compliance](/ai-tools-compared/ai-policy-management-tools-enterprise-compliance-2026/)
- [How to Write an Enterprise Acceptable Use Policy for AI](/ai-tools-compared/how-to-write-enterprise-acceptable-use-policy-for-ai-coding-assistants/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
