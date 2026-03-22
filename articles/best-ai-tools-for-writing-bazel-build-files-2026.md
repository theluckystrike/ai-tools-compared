---
layout: default
title: "Best AI Tools for Writing Bazel BUILD Files 2026"
description: "Compare Claude and ChatGPT for generating Bazel BUILD files — Go, Python, Java, proto targets, gazelle integration, and visibility rules with real examples"
date: 2026-03-22
author: theluckystrike
permalink: /best-ai-tools-for-writing-bazel-build-files-2026/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

# Best AI Tools for Writing Bazel BUILD Files 2026

Bazel has a steep learning curve — the BUILD language is Starlark (a Python subset), but the rules for each language vary significantly. AI tools help with the boilerplate, but you need to verify dependencies and visibility rules carefully.

## Go BUILD Files

**Prompt to Claude:**
```text
Write a Bazel BUILD file for a Go package at //services/orders/handler.
It implements an HTTP handler. Imports: standard library net/http,
internal package //lib/auth:auth, external //vendor/github.com/go-chi/chi.
Include a go_test target for handler_test.go.
Use rules_go conventions.
```

**Claude output:**

```python
load("@io_bazel_rules_go//go:def.bzl", "go_library", "go_test")

go_library(
    name = "handler",
    srcs = ["handler.go"],
    importpath = "github.com/example/myapp/services/orders/handler",
    visibility = ["//visibility:public"],
    deps = [
        "//lib/auth",
        "@com_github_go_chi_chi//:chi",
    ],
)

go_test(
    name = "handler_test",
    srcs = ["handler_test.go"],
    embed = [":handler"],
    deps = [
        "//lib/auth",
        "@com_github_go_chi_chi//:chi",
    ],
)
```

Claude uses `embed` for the test target (which includes the library under test in the same package) and formats the external dependency using the `@com_github_...` Gazelle-generated name format. Standard library imports are not listed in `deps`.

ChatGPT often adds `net/http` to `deps` (wrong — stdlib is implicit) and sometimes uses `go_binary` for a library target.

## Python BUILD Files

**Prompt:**
```text
Write a BUILD file for a Python FastAPI service.
Source: main.py, routers/users.py, routers/orders.py.
Dependencies: FastAPI, SQLAlchemy, pydantic (from a pip_install WORKSPACE setup).
Include py_test for tests/test_users.py. Add a py_binary for running the service.
```

**Claude output:**

```python
load("@rules_python//python:defs.bzl", "py_binary", "py_library", "py_test")

py_library(
    name = "routers",
    srcs = [
        "routers/users.py",
        "routers/orders.py",
    ],
    deps = [
        requirement("fastapi"),
        requirement("sqlalchemy"),
        requirement("pydantic"),
    ],
    visibility = ["//visibility:private"],
)

py_binary(
    name = "service",
    srcs = ["main.py"],
    main = "main.py",
    deps = [
        ":routers",
        requirement("fastapi"),
        requirement("uvicorn"),
    ],
)

py_test(
    name = "test_users",
    srcs = ["tests/test_users.py"],
    deps = [
        ":routers",
        requirement("pytest"),
        requirement("httpx"),
    ],
)
```

The `requirement()` function call is the Gazelle/pip_install pattern for third-party packages. Claude uses it correctly. ChatGPT sometimes puts package names as strings in `deps` directly, which doesn't work.

## Proto + gRPC BUILD Files

**Prompt:**
```text
Write a BUILD file for a proto file at //proto/orders.proto.
Generate: Go bindings, Python bindings, and a gRPC service.
Use rules_proto and rules_go. The proto package is "orders.v1".
```

**Claude output:**

```python
load("@rules_proto//proto:defs.bzl", "proto_library")
load("@io_bazel_rules_go//go:def.bzl", "go_library")
load("@io_bazel_rules_go//proto:def.bzl", "go_proto_library")
load("@rules_python//python:defs.bzl", "py_library")
load("@com_github_grpc_grpc//bazel:python_rules.bzl", "py_grpc_library", "py_proto_library")

proto_library(
    name = "orders_proto",
    srcs = ["orders.proto"],
    visibility = ["//visibility:public"],
    deps = [
        "@com_google_protobuf//:timestamp_proto",  # if used
    ],
)

# Go bindings
go_proto_library(
    name = "orders_go_proto",
    compilers = ["@io_bazel_rules_go//proto:go_grpc"],
    importpath = "github.com/example/myapp/proto/orders/v1",
    proto = ":orders_proto",
    visibility = ["//visibility:public"],
)

# Python proto bindings
py_proto_library(
    name = "orders_py_proto",
    deps = [":orders_proto"],
    visibility = ["//visibility:public"],
)

# Python gRPC bindings
py_grpc_library(
    name = "orders_py_grpc",
    srcs = [":orders_proto"],
    deps = [":orders_py_proto"],
    visibility = ["//visibility:public"],
)
```

Claude separates proto, go_proto, py_proto, and py_grpc into distinct targets — this is the correct pattern that allows consumers to depend on only what they need. ChatGPT sometimes collapses these into a single target, which works but forces unnecessary rebuilds.

## Visibility Rules

**Prompt:**
```text
I have packages: //services/auth, //services/orders, //lib/db.
Rules: lib/db is public. services/auth is visible to services/orders only.
services/orders is public. Write the visibility declarations.
```

```python
# //lib/db/BUILD
py_library(
    name = "db",
    visibility = ["//visibility:public"],
    ...
)

# //services/auth/BUILD
py_library(
    name = "auth",
    visibility = ["//services/orders:__pkg__"],  # only orders package
    ...
)

# //services/orders/BUILD
py_library(
    name = "orders",
    visibility = ["//visibility:public"],
    ...
)
```

Claude uses `__pkg__` (allows subpackages at that path) correctly. It knows the difference between `__pkg__`, `__subpackages__`, and explicit package lists. ChatGPT occasionally uses `//services/orders/...` which is a glob pattern not valid in visibility.

## Gazelle Integration

Claude also explains when to use Gazelle vs manual BUILD files:

```bash
# Generate BUILD files automatically with Gazelle
bazel run //:gazelle

# Update deps from go.mod
bazel run //:gazelle -- update-repos \
  -from_file=go.mod \
  -to_macro=deps.bzl%go_dependencies \
  -prune

# After generating, manually add visibility rules
# Gazelle defaults to private; you must explicitly make public
```

For projects with hundreds of packages, let Gazelle generate the base BUILD files and use AI to add visibility, test targets, and custom rules.

## Related Reading

- [Best AI Tools for Writing Makefiles](/ai-tools-compared/best-ai-tools-for-writing-makefiles-2026/)
- [How to Use AI for Nix Package Management](/ai-tools-compared/how-to-use-ai-for-nix-package-management/)
- [AI-Powered CI/CD Pipeline Optimization](/ai-tools-compared/ai-powered-cicd-pipeline-optimization-2026/)

- [Best AI IDE Features for Writing Configuration Files YAML](/ai-tools-compared/best-ai-ide-features-for-writing-configuration-files-yaml-json-toml/)
---

## Related Articles

- [Best AI Tools for Writing Dockerfiles](/ai-tools-compared/ai-tools-for-writing-dockerfiles-guide)
- [Best AI Tools for Writing Makefiles in 2026](/ai-tools-compared/best-ai-tools-for-writing-makefiles-2026/)
- [AI Autocomplete for Test Files How Well Different Tools Pred](/ai-tools-compared/ai-autocomplete-for-test-files-how-well-different-tools-pred/)
- [Best AI Tools for Writing Unit Test Mocks 2026](/ai-tools-compared/best-ai-tools-for-writing-unit-test-mocks-2026/)
- [Best AI Tools for Writing GitHub Actions Matrix Build Strate](/ai-tools-compared/best-ai-tools-for-writing-github-actions-matrix-build-strate/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
