---
layout: default
title: "How to Use AI for Nix Package Management"
description: "Practical guide to using Claude and ChatGPT for writing Nix derivations, flakes, devShells, and NixOS module configurations with real working examples"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-use-ai-for-nix-package-management/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

How to Use AI for Nix Package Management

Nix has one of the steepest learning curves in developer tooling. The language is purely functional, error messages are cryptic, and the ecosystem has diverged between legacy channels and Flakes. AI tools can significantly reduce the time to get working derivations. if you prompt them correctly.

Setting Context: Flakes vs Legacy

Start every Nix session by specifying your environment:

```text
I'm using Nix Flakes (flake.nix). nixpkgs follows nixos-unstable.
Use the new-style lib.mkOption and lib.types. Do not use <nixpkgs> import syntax.
Assume nix-darwin for macOS or NixOS modules where relevant.
```

This prevents Claude from generating pre-flake patterns like `import <nixpkgs> {}` which don't work in flake contexts.

Writing a Derivation with stdenv

Prompt:
```text
Write a Nix derivation for a Rust CLI tool. Source is a GitHub tarball at
github.com/example/mytool, version 0.4.2, SHA256 = abc123.
The tool uses cargo build --release. It needs openssl as a build dep.
The binary should be installed to $out/bin/mytool.
```

Claude output:

```nix
{ lib
, stdenv
, fetchFromGitHub
, rustPlatform
, openssl
, pkg-config
}:

rustPlatform.buildRustPackage rec {
  pname = "mytool";
  version = "0.4.2";

  src = fetchFromGitHub {
    owner = "example";
    repo = "mytool";
    rev = "v${version}";
    sha256 = "sha256-abc123==";
  };

  cargoHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

  nativeBuildInputs = [ pkg-config ];
  buildInputs = [ openssl ];

  meta = with lib; {
    description = "My CLI tool";
    license = licenses.mit;
    maintainers = [];
    platforms = platforms.unix;
  };
}
```

Claude correctly uses `rustPlatform.buildRustPackage` instead of raw `stdenv.mkDerivation` for Rust projects. It separates `nativeBuildInputs` (build-time) from `buildInputs` (runtime), which is important for cross-compilation.

One thing to correct: the `cargoHash` needs to be computed. Tell Claude: "The cargoHash is unknown. set it to the empty hash so Nix prints the correct one." Claude will then produce `cargoHash = lib.fakeHash;`, which triggers Nix to print the real hash on first build.

Flake devShell

Prompt:
```text
Write a flake.nix with a devShell for a Python 3.12 project. Include:
- python with packages: fastapi, uvicorn, sqlalchemy, alembic, pytest
- postgresql 16 running locally via process-compose or a simple script
- direnv integration (auto-load on cd)
- shellHook that prints "Dev environment ready"
```

Claude output:

```nix
{
  description = "Python 3.12 development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        python = pkgs.python312;
        pythonEnv = python.withPackages (ps: with ps; [
          fastapi
          uvicorn
          sqlalchemy
          alembic
          pytest
          pytest-asyncio
        ]);
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pythonEnv
            pkgs.postgresql_16
            pkgs.pgcli         # nice to have
            pkgs.just          # task runner
          ];

          shellHook = ''
            export PGDATA=$PWD/.postgres
            export PGHOST=$PGDATA
            export DATABASE_URL="postgresql:///$USER?host=$PGDATA"

            if [ ! -d "$PGDATA" ]; then
              initdb --no-locale --encoding=UTF8 -D "$PGDATA"
              pg_ctl -D "$PGDATA" -l "$PGDATA/postgres.log" start
              createdb $USER 2>/dev/null || true
            else
              pg_ctl -D "$PGDATA" -l "$PGDATA/postgres.log" status \
                || pg_ctl -D "$PGDATA" -l "$PGDATA/postgres.log" start
            fi

            echo "Dev environment ready"
          '';
        };
      }
    );
}
```

This is a production-quality flake. The `shellHook` handles PostgreSQL initialization and auto-start, sets `PGDATA` to the project directory so it doesn't conflict with system Postgres, and uses `postgresql_16` from nixpkgs directly.

NixOS Module Configuration

For system-level config, Claude handles NixOS module syntax well:

Prompt:
```text
Write a NixOS module that configures a systemd service running a Node.js app.
The app is at /srv/myapp, runs with node server.js, needs PORT=3000 env var,
auto-restarts, runs as user "myapp", and starts after network.target.
```

```nix
{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.myapp;
in {
  options.services.myapp = {
    enable = mkEnableOption "myapp Node.js service";

    port = mkOption {
      type = types.port;
      default = 3000;
      description = "Port to listen on";
    };

    package = mkOption {
      type = types.package;
      default = pkgs.nodejs_20;
      description = "Node.js package to use";
    };
  };

  config = mkIf cfg.enable {
    users.users.myapp = {
      isSystemUser = true;
      group = "myapp";
      home = "/srv/myapp";
    };

    users.groups.myapp = {};

    systemd.services.myapp = {
      description = "myapp Node.js service";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      environment = {
        PORT = toString cfg.port;
        NODE_ENV = "production";
      };

      serviceConfig = {
        User = "myapp";
        Group = "myapp";
        WorkingDirectory = "/srv/myapp";
        ExecStart = "${cfg.package}/bin/node server.js";
        Restart = "on-failure";
        RestartSec = "5s";

        # Hardening
        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ReadWritePaths = [ "/srv/myapp" ];
      };
    };
  };
}
```

Claude adds systemd hardening options (`NoNewPrivileges`, `ProtectSystem`) and the `ReadWritePaths` override. details that most generated configs miss.

Debugging Nix Build Failures with AI

When a derivation fails, paste the full error into Claude with context about your nixpkgs version. Common failure patterns Claude diagnoses well:

Missing build inputs: Nix errors like `error: cannot find -lssl` mean the library isn't in `buildInputs`. Claude identifies the package name (`pkgs.openssl`) and the correct input list.

Phase override issues: If a project has a non-standard build system, Claude writes the correct `buildPhase` and `installPhase` overrides:

```nix
buildPhase = ''
  make PREFIX=$out
'';

installPhase = ''
  make install PREFIX=$out
'';
```

Impure fetches: Any network access during build fails in the Nix sandbox. Claude suggests converting `fetchurl` with hash mismatches and flags when a derivation tries to access the network at build time.

String interpolation in paths: A common mistake is writing `"${pkgs.nodejs}/bin"` where Nix expects a derivation reference. Claude catches these and uses proper store path interpolation patterns.

Overlay Patterns for Customizing nixpkgs

For customizing nixpkgs packages without forking, overlays are the right tool:

```nix
In flake.nix outputs:
nixpkgs.overlays = [
  (final: prev: {
    # Override a package version
    my-tool = prev.my-tool.overrideAttrs (old: {
      version = "2.0.0";
      src = prev.fetchFromGitHub {
        owner = "example";
        repo = "my-tool";
        rev = "v2.0.0";
        sha256 = "sha256-...";
      };
    });

    # Add a package not in nixpkgs
    custom-cli = final.callPackage ./pkgs/custom-cli.nix {};
  })
];
```

Claude generates overlay syntax correctly. The key distinction: use `final` for packages that should resolve against the final overlaid set (enabling other overlays to see them), and `prev` for the original pre-overlay packages. Claude explains this when asked.

Where AI Struggles with Nix

- `cargoHash` and `vendorHash`. always need to be determined via Nix's hash mismatch output; AI can't compute these
- Overlays. Claude sometimes writes syntactically correct overlays that don't compose properly with other overlays
- NixOS module options types. `types.attrs` is almost always wrong; ask Claude to use `types.attrsOf` with a submodule
- Cross-compilation. `depsBuildBuild`, `depsBuildHost`, etc. are often mixed up

Packaging a Node.js Application

Prompt:
```text
Write a Nix derivation for a Node.js application. Source is at github.com/example/myapp.
The package.json is at the root. Build with npm ci && npm run build.
Output goes to bin/myapp.js. Runtime deps: nodejs_20, systemd (for logging).
Build deps: nodejs_20, git. Include a meta section.
```

Claude correctly generates:
```nix
{ lib, stdenv, fetchFromGitHub, nodejs_20, git, systemd }:

stdenv.mkDerivation rec {
  pname = "myapp";
  version = "1.0.0";

  src = fetchFromGitHub {
    owner = "example";
    repo = "myapp";
    rev = version;
    sha256 = "sha256-AAAA...";
  };

  nativeBuildInputs = [ git ];
  buildInputs = [ nodejs_20 ];
  propagatedBuildInputs = [ systemd ];

  buildPhase = ''
    npm ci
    npm run build
  '';

  installPhase = ''
    mkdir -p $out/bin
    cp bin/myapp.js $out/bin/
    chmod +x $out/bin/myapp.js
  '';

  meta = with lib; {
    description = "My Node.js app";
    license = licenses.mit;
    platforms = platforms.unix;
  };
}
```

The key insight: `nativeBuildInputs` are tools used during build, `buildInputs` are runtime dependencies, and `propagatedBuildInputs` are propagated to packages that depend on this derivation.

Using nixpkgs-unstable vs Stable

For production, ask Claude to help you lock nixpkgs:

```text
Write a flake.nix that uses nixpkgs-unstable but allows pinning
to a specific commit for reproducibility. Include a way to update
the lock file with nix flake update.
```

Claude produces:
```nix
{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ nodejs_20 ];
        };
      }
    );
}
```

Run `nix flake lock` to create flake.lock, which pins exact commit hashes. This ensures reproducibility across team members.

Debugging Derivation Builds

When a derivation fails, ask Claude for debugging strategies:

```text
My derivation is failing with "command not found: git" during build.
How can I debug a Nix derivation? What does the build sandbox restrict?
```

Claude explains:
- Nix builds in an isolated sandbox with limited `/nix/store` access
- Tools must be explicitly added to `nativeBuildInputs` or `buildInputs`
- Use `nix develop` to enter the devShell with the same environment as the build
- Add `set -x` to buildPhase to see command execution
- Use `builtins.trace` for debugging Nix expressions

NixOS Configuration Management

For full system configuration, ask Claude to generate NixOS modules:

```text
Write a NixOS configuration module that sets up a PostgreSQL service
with automatic backups, creates a database and user, and configures
systemd to start postgres on boot. Allow overriding the backup directory.
```

Claude produces:
```nix
{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.postgres-backup;
in {
  options.services.postgres-backup = {
    enable = mkEnableOption "PostgreSQL with backups";
    backupDir = mkOption {
      type = types.path;
      default = "/var/backups/postgres";
      description = "Directory to store backups";
    };
  };

  config = mkIf cfg.enable {
    services.postgresql = {
      enable = true;
      ensureDatabases = [ "myapp" ];
      ensureUsers = [{
        name = "appuser";
        ensureDBOwnership = true;
      }];
    };

    systemd.timers.postgres-backup = {
      wantedBy = [ "timers.target" ];
      timerConfig.OnCalendar = "daily";
      timerConfig.Persistent = true;
    };

    systemd.services.postgres-backup = {
      script = ''
        ${pkgs.postgresql}/bin/pg_dump -U postgres myapp > \
          ${cfg.backupDir}/myapp-$(date +%Y%m%d).sql
      '';
    };
  };
}
```

This is a solid pattern for declarative system configuration.

Common Mistakes to Catch

When Claude generates Nix code, watch for:
- Using `types.attrs` instead of `types.attrsOf types.str`
- Forgetting `mkIf cfg.enable` in module config blocks
- Mixing `buildInputs` and `nativeBuildInputs` (wrong leads to cross-compilation failures)
- Hardcoding paths like `/usr/bin/python` instead of using `${pkgs.python3}/bin/python`
- Not using `$out` for install phase output paths

Related Articles

- [Claude Code Semantic Versioning Automation: A Complete Guide](/claude-code-semantic-versioning-automation/)
- [Best AI Tools for Writing Bazel BUILD Files 2026](/best-ai-tools-for-writing-bazel-build-files-2026/)
- [AI Tools for Automated SSL Certificate Management](/ai-tools-for-automated-ssl-certificate-management-and-monito/)
- [Effective Context Management Strategies for AI Coding](/effective-context-management-strategies-for-ai-coding-in-monorepo-projects-2026/)
- [AI Policy Management Tools Enterprise Compliance](/ai-policy-management-tools-enterprise-compliance-2026/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
