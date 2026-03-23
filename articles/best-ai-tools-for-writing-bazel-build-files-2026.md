---
layout: default
title: "Best AI Tools for Writing Bazel BUILD Files 2026"
description: "Compare Claude and ChatGPT for generating Bazel BUILD files. Go, Python, Java, proto targets, gazelle integration, and visibility rules with real examples"
date: 2026-03-22
author: theluckystrike
permalink: /best-ai-tools-for-writing-bazel-build-files-2026/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, best-of, artificial-intelligence]
---

{% raw %}

Best AI Tools for Writing Bazel BUILD Files 2026

Bazel has a steep learning curve. the BUILD language is Starlark (a Python subset), but the rules for each language vary significantly. AI tools help with the boilerplate, but you need to verify dependencies and visibility rules carefully.

Why Bazel BUILD Files Are Hard to Write

BUILD files look simple: a handful of rule invocations with `name`, `srcs`, `deps`, and `visibility`. In practice, the complexity comes from several directions:

- Rule set differences: `rules_go`, `rules_python`, `rules_java`, and `rules_proto` each have different conventions for dependency resolution, test setup, and external packages
- Gazelle conventions: External Go deps use `@com_github_...` naming; Python uses `requirement()` calls. these are easy to get wrong
- Visibility scoping: The difference between `//visibility:public`, `//services/orders:__pkg__`, and `//services/orders:__subpackages__` has real architectural consequences
- Test embedding: Go tests use `embed` to include the library under test; Python tests use `deps`. mixing these up produces errors that aren't obvious

AI tools can handle the boilerplate reliably, but you need to verify the dep names against your actual Gazelle-generated mapping and visibility rules against your intended architecture.

Go BUILD Files

Prompt to Claude:
```text
Write a Bazel BUILD file for a Go package at //services/orders/handler.
It implements an HTTP handler. Imports: standard library net/http,
internal package //lib/auth:auth, external //vendor/github.com/go-chi/chi.
Include a go_test target for handler_test.go.
Use rules_go conventions.
```

Claude output:

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

ChatGPT often adds `net/http` to `deps` (wrong. stdlib is implicit) and sometimes uses `go_binary` for a library target.

Go Binary with Multiple Packages

Prompt:
```text
Write a BUILD file for a Go binary at //cmd/api-server.
It imports: //services/orders/handler, //services/users/handler, //lib/config,
and external github.com/spf13/cobra.
```

Claude output:

```python
load("@io_bazel_rules_go//go:def.bzl", "go_binary", "go_library")

go_library(
    name = "api-server_lib",
    srcs = ["main.go"],
    importpath = "github.com/example/myapp/cmd/api-server",
    visibility = ["//visibility:private"],
    deps = [
        "//lib/config",
        "//services/orders/handler",
        "//services/users/handler",
        "@com_github_spf13_cobra//:cobra",
    ],
)

go_binary(
    name = "api-server",
    embed = [":api-server_lib"],
    visibility = ["//visibility:public"],
)
```

The `go_library` + `go_binary` pattern with embedding is idiomatic rules_go. it allows the binary to be tested and linked correctly. Claude generates this pattern automatically; ChatGPT often collapses it into a single `go_binary` target without the library, which prevents proper test setup.

Python BUILD Files

Prompt:
```text
Write a BUILD file for a Python FastAPI service.
Source: main.py, routers/users.py, routers/orders.py.
Dependencies: FastAPI, SQLAlchemy, pydantic (from a pip_install WORKSPACE setup).
Include py_test for tests/test_users.py. Add a py_binary for running the service.
```

Claude output:

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

One nuance: you need a `load` statement for `requirement` from your pip_install repository. Claude adds a comment noting you need to load it from your specific pip install name (e.g., `load("@pip//:requirements.bzl", "requirement")`).

Proto + gRPC BUILD Files

Prompt:
```text
Write a BUILD file for a proto file at //proto/orders.proto.
Generate: Go bindings, Python bindings, and a gRPC service.
Use rules_proto and rules_go. The proto package is "orders.v1".
```

Claude output:

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

Go bindings
go_proto_library(
    name = "orders_go_proto",
    compilers = ["@io_bazel_rules_go//proto:go_grpc"],
    importpath = "github.com/example/myapp/proto/orders/v1",
    proto = ":orders_proto",
    visibility = ["//visibility:public"],
)

Python proto bindings
py_proto_library(
    name = "orders_py_proto",
    deps = [":orders_proto"],
    visibility = ["//visibility:public"],
)

Python gRPC bindings
py_grpc_library(
    name = "orders_py_grpc",
    srcs = [":orders_proto"],
    deps = [":orders_py_proto"],
    visibility = ["//visibility:public"],
)
```

Claude separates proto, go_proto, py_proto, and py_grpc into distinct targets. this is the correct pattern that allows consumers to depend on only what they need. ChatGPT sometimes collapses these into a single target, which works but forces unnecessary rebuilds.

Java BUILD Files

Prompt:
```text
Write a Bazel BUILD file for a Java service with Spring Boot.
Sources: src/main/java/com/example/OrderService.java
External deps: Spring Boot starter web, Spring Data JPA, Hibernate (from maven_install).
Include a java_test for OrderServiceTest.java.
```

Claude output:

```python
load("@rules_java//java:defs.bzl", "java_binary", "java_library", "java_test")

java_library(
    name = "order_service_lib",
    srcs = ["src/main/java/com/example/OrderService.java"],
    deps = [
        "@maven//:org_springframework_boot_spring_boot_starter_web",
        "@maven//:org_springframework_boot_spring_boot_starter_data_jpa",
        "@maven//:org_hibernate_hibernate_core",
    ],
    visibility = ["//visibility:private"],
)

java_binary(
    name = "order_service",
    main_class = "com.example.OrderService",
    runtime_deps = [":order_service_lib"],
    visibility = ["//visibility:public"],
)

java_test(
    name = "order_service_test",
    srcs = ["src/test/java/com/example/OrderServiceTest.java"],
    test_class = "com.example.OrderServiceTest",
    deps = [
        ":order_service_lib",
        "@maven//:junit_junit",
        "@maven//:org_mockito_mockito_core",
    ],
)
```

Maven coordinates in rules_java follow the `@maven//:group_artifact_name` format where dots and hyphens become underscores. Claude handles this conversion correctly. ChatGPT sometimes uses the original Maven coordinate format (`org.springframework.boot:spring-boot-starter-web`) which doesn't work in Bazel.

Visibility Rules

Prompt:
```text
I have packages: //services/auth, //services/orders, //lib/db.
Rules: lib/db is public. services/auth is visible to services/orders only.
services/orders is public. Write the visibility declarations.
```

```python
//lib/db/BUILD
py_library(
    name = "db",
    visibility = ["//visibility:public"],
    ...
)

//services/auth/BUILD
py_library(
    name = "auth",
    visibility = ["//services/orders:__pkg__"],  # only orders package
    ...
)

//services/orders/BUILD
py_library(
    name = "orders",
    visibility = ["//visibility:public"],
    ...
)
```

Claude uses `__pkg__` (allows subpackages at that path) correctly. It knows the difference between `__pkg__`, `__subpackages__`, and explicit package lists. ChatGPT occasionally uses `//services/orders/...` which is a glob pattern not valid in visibility.

For package groups spanning multiple packages, Claude correctly uses `package_group`:

```python
Shared access group for internal services
package_group(
    name = "internal_services",
    packages = [
        "//services/...",
        "//internal/...",
    ],
)

Use the group in visibility
py_library(
    name = "auth",
    visibility = [":internal_services"],
    ...
)
```

Gazelle Integration

Claude also explains when to use Gazelle vs manual BUILD files:

```bash
Generate BUILD files automatically with Gazelle
bazel run //:gazelle

Update deps from go.mod
bazel run //:gazelle -- update-repos \
  -from_file=go.mod \
  -to_macro=deps.bzl%go_dependencies \
  -prune

After generating, manually add visibility rules
Gazelle defaults to private; you must explicitly make public
```

For projects with hundreds of packages, let Gazelle generate the base BUILD files and use AI to add visibility, test targets, and custom rules.

Claude also understands the Gazelle directive system for per-package configuration:

```python
In a BUILD file, Gazelle directives control generation behavior
gazelle:go_naming_convention go_default_library
gazelle:proto_strip_import_prefix /proto
gazelle:resolve go github.com/example/myapp/lib/auth //lib/auth
```

These `# gazelle:` comments are read by Gazelle during generation and can override naming conventions or force specific resolution for ambiguous imports.

Custom Rules and Macros

For teams with custom Starlark rules, Claude handles macro generation well:

Prompt:
```text
Write a Starlark macro called service_library that wraps go_library and go_test,
sets default visibility to internal_services, and enforces that every service
has a corresponding test file.
Cross-Language Dependencies and External Rules

Prompt:
```text
Write BUILD files for a monorepo with:
- Go service at //services/api
- Python worker at //services/worker
- Shared protobuf definitions at //proto
- External dependencies: gRPC, FastAPI

Show the full dependency chain.
```

Claude output:

```python
//tools/macros/service.bzl
load("@io_bazel_rules_go//go:def.bzl", "go_library", "go_test")

def service_library(name, srcs, deps = [], test_srcs = None, kwargs):
 """Macro for internal service libraries with enforced test coverage.

 Args:
 name: Library name
 srcs: Source files
 deps: Dependencies
 test_srcs: Test files (defaults to [name + "_test.go"])
 kwargs: Additional args passed to go_library
 """
 if test_srcs == None:
 test_srcs = [name + "_test.go"]

 go_library(
 name = name,
 srcs = srcs,
 deps = deps,
 visibility = ["//visibility:__subpackages__", "//services:__subpackages__"],
 kwargs
 )

 go_test(
 name = name + "_test",
 srcs = test_srcs,
 embed = [":" + name],
 deps = deps,
 )
```

The macro pattern is useful for enforcing organizational conventions across hundreds of packages without duplicating the same boilerplate in every BUILD file.
//proto/BUILD
load("@rules_proto//proto:defs.bzl", "proto_library")
load("@io_bazel_rules_go//proto:def.bzl", "go_proto_library")
load("@com_github_grpc_grpc//bazel:python_rules.bzl", "py_grpc_library", "py_proto_library")

proto_library(
    name = "api_proto",
    srcs = ["api.proto"],
    visibility = ["//visibility:public"],
)

go_proto_library(
    name = "api_go_proto",
    importpath = "github.com/example/api/proto/api/v1",
    proto = ":api_proto",
    compilers = ["@io_bazel_rules_go//proto:go_grpc"],
    visibility = ["//visibility:public"],
)

py_proto_library(
    name = "api_py_proto",
    deps = [":api_proto"],
    visibility = ["//visibility:public"],
)

py_grpc_library(
    name = "api_py_grpc",
    srcs = [":api_proto"],
    deps = [":api_py_proto"],
    visibility = ["//visibility:public"],
)

---

//services/api/BUILD
load("@io_bazel_rules_go//go:def.bzl", "go_binary", "go_library")

go_library(
    name = "api_lib",
    srcs = ["main.go", "handler.go"],
    importpath = "github.com/example/services/api",
    deps = [
        "//proto:api_go_proto",
        "@com_github_grpc_grpc_go//grpc",
        "@org_golang_google_grpc//:go_default_library",
    ],
)

go_binary(
    name = "api",
    embed = [":api_lib"],
    visibility = ["//visibility:public"],
)

---

//services/worker/BUILD
load("@rules_python//python:defs.bzl", "py_binary", "py_library")

py_library(
    name = "worker_lib",
    srcs = ["main.py", "tasks.py"],
    deps = [
        "//proto:api_py_grpc",
        requirement("fastapi"),
        requirement("grpcio"),
    ],
)

py_binary(
    name = "worker",
    main = "main.py",
    srcs = ["main.py"],
    deps = [":worker_lib"],
    visibility = ["//visibility:public"],
)
```

Claude correctly separates proto, go_proto, py_proto, and py_grpc libraries so Go and Python consumers pull only what they need.

Conditional Rules and Selects

Prompt:
```text
I have platform-specific code: Windows uses one library, Linux another.
Write a BUILD file using select() to choose the right dependency.
```

Claude output:

```python
load("@io_bazel_rules_go//go:def.bzl", "go_library")

go_library(
    name = "platform_lib",
    srcs = ["main.go"] + select({
        "@io_bazel_rules_go//go/platform:linux": ["linux_specific.go"],
        "@io_bazel_rules_go//go/platform:windows": ["windows_specific.go"],
        "//conditions:default": ["generic.go"],
    }),
    deps = select({
        "@io_bazel_rules_go//go/platform:linux": [
            "@org_golang_google_protobuf//:protobuf",
        ],
        "@io_bazel_rules_go//go/platform:windows": [
            "@com_microsoft_windows_libs//:kernel32",
        ],
        "//conditions:default": [],
    }),
)
```

The `select()` function chooses based on conditions (platform, OS, build flags). It's cleaner than separate BUILD files per platform.

Build Cache and Remote Execution

Prompt:
```text
I want Bazel to cache build outputs so rebuilds are fast.
Should I use local cache or remote cache (Bazelisk, BuildBuddy)?
```

Claude explains:

```
Local cache (default):
- ~/.bazel/cache/ stores outputs from previous builds
- Same machine rebuilds are instant
- Disk cost: typically 1-5GB for medium projects

Remote cache options:
1. Bazelisk + local cache
   bazel build --disk_cache=/mnt/bazel-cache //...
   Good for: build farms, CI/CD pipelines

2. BuildBuddy (hosted)
   bazel build --bes_backend=grpcs://api.buildbuddy.io:1985
   Good for: teams, sharing cache across machines

3. Self-hosted remote cache
   bazel build --remote_cache=http://localhost:9090
   Good for: on-premises deployments

Performance impact:
- Cache hit: 1 second (instant)
- Cache miss: full build (5-30 minutes depending on project size)
```

Related Reading

- [Best AI Tools for Writing Makefiles](/best-ai-tools-for-writing-makefiles-2026/)
- [How to Use AI for Nix Package Management](/how-to-use-ai-for-nix-package-management/)
- [AI-Powered CI/CD Pipeline Optimization](/ai-powered-cicd-pipeline-optimization-2026/)

- [Best AI IDE Features for Writing Configuration Files YAML](/best-ai-ide-features-for-writing-configuration-files-yaml-json-toml/)
---

Related Articles

- [Best AI Tools for Writing Dockerfiles](/ai-tools-for-writing-dockerfiles-guide)
- [Best AI Tools for Writing Makefiles in 2026](/best-ai-tools-for-writing-makefiles-2026/)
- [AI Autocomplete for Test Files How Well Different Tools Pred](/ai-autocomplete-for-test-files-how-well-different-tools-pred/)
- [Best AI Tools for Writing Unit Test Mocks 2026](/best-ai-tools-for-writing-unit-test-mocks-2026/)
- [Best AI Tools for Writing GitHub Actions Matrix Build Strate](/best-ai-tools-for-writing-github-actions-matrix-build-strate/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
