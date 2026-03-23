---

layout: default
title: "Windsurf AI Not Picking Up ESLint Config"
description: "A practical troubleshooting guide for developers experiencing issues with Windsurf AI not detecting ESLint configuration files"
date: 2026-03-20
author: "AI Tools Compared"
permalink: /windsurf-ai-not-picking-up-eslint-config-troubleshooting-gui/
categories: [troubleshooting]
tags: [ai-tools-compared, windsurf, eslint, ai-editor, configuration, artificial-intelligence]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


Windsurf AI offers intelligent code assistance that integrates with your project's linting tools, but sometimes it fails to recognize your ESLint configuration. This creates a frustrating experience where the AI suggests code that violates your project's style guidelines or ignores your custom rules. This guide walks through the most common causes and practical solutions to get Windsurf properly detecting your ESLint setup.

## Table of Contents

- [Why Windsurf Fails to Detect ESLint Config](#why-windsurf-fails-to-detect-eslint-config)
- [Diagnostic Steps](#diagnostic-steps)
- [Solutions for Common Scenarios](#solutions-for-common-scenarios)
- [Verification](#verification)
- [Quick Reference Checklist](#quick-reference-checklist)
- [Advanced Configuration: Workspace Settings Deep Dive](#advanced-configuration-workspace-settings-deep-dive)
- [ESLint Configuration Examples](#eslint-configuration-examples)
- [Debugging ESLint Detection with CLI Commands](#debugging-eslint-detection-with-cli-commands)
- [Windsurf-Specific Troubleshooting](#windsurf-specific-troubleshooting)
- [Performance Tuning for Windsurf ESLint Integration](#performance-tuning-for-windsurf-eslint-integration)
- [Testing Your Config with Sample Files](#testing-your-config-with-sample-files)
- [Integration with CI/CD Pipelines](#integration-with-cicd-pipelines)
- [Quick Reference Checklist](#quick-reference-checklist)

## Why Windsurf Fails to Detect ESLint Config

Several factors can prevent Windsurf from picking up your ESLint configuration. Understanding these root causes helps you diagnose the specific issue in your project.

### Non-Standard File Locations

Windsurf expects your ESLint configuration in recognized locations. If you use a non-standard filename or store it in an unusual directory, Windsurf may not find it. The most common locations Windsurf looks for are `.eslintrc.js`, `.eslintrc.cjs`, `.eslintrc.json`, `.eslintrc.yml`, or `eslint.config.js` in your project root.

### Project Root Detection Issues

Windsurf needs to correctly identify your project root to locate configuration files. If your workspace contains multiple projects or uses a monorepo structure, Windsurf might be looking in the wrong directory for your ESLint config.

### Missing Dependencies

If your project lacks the required ESLint packages in `node_modules`, Windsurf cannot read your configuration. This happens frequently when developers set up ESLint globally or copy configuration files without installing dependencies.

### Cache and Indexing Problems

Windsurf maintains an internal index of your project files. Stale cache entries can cause it to use outdated configuration or miss new configuration files entirely.

## Diagnostic Steps

Follow these steps to identify why Windsurf is not detecting your ESLint configuration.

### Step 1: Verify Your Configuration File Exists

Check that your ESLint config file exists in a recognized location:

```bash
ls -la | grep eslint
```

Common valid filenames include:
- `.eslintrc.js`
- `.eslintrc.cjs`
- `.eslintrc.json`
- `.eslintrc.yml`
- `eslint.config.js` (ESLint flat config format)

If you use `eslint.config.js`, ensure it exports a valid configuration array:

```javascript
// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'error'
    }
  }
];
```

### Step 2: Validate Your Configuration

Run ESLint from the command line to confirm your configuration is valid:

```bash
npx eslint --print-config . > /dev/null 2>&1 && echo "Config is valid"
```

If this command fails, fix your configuration before troubleshooting Windsurf.

### Step 3: Check Windsurf Workspace Settings

Open Windsurf settings (Cmd/Ctrl + ,) and verify:

1. **Workspace Folder**: Ensure Windsurf has the correct project folder open
2. **ESLint Enabled**: Verify that ESLint integration is enabled in settings
3. **Node Path**: Confirm Windsurf is using the correct Node.js path

### Step 4: Inspect Windsurf Logs

Windsurf logs diagnostic information that can reveal detection issues. Access logs through:

1. Open the Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Developer: Toggle Developer Tools"
3. Check the Console tab for ESLint-related messages

Look for messages like:
- "ESLint configuration not found"
- "Failed to load ESLint"
- "Using workspace ESLint configuration"

## Solutions for Common Scenarios

### Solution 1: Rename to Standard Filename

If your config uses a non-standard name, rename it:

```bash
# If you have eslint.config.mjs, rename to eslint.config.js
mv eslint.config.mjs eslint.config.js
```

For ESLint flat config, use `eslint.config.js` or `eslint.config.mjs` in the project root.

### Solution 2: Specify Config Path Explicitly

If your config lives in a subdirectory, tell ESLint where to find it:

```bash
npx eslint --config ./config/.eslintrc.json .
```

To make Windsurf use this path, add it to your VS Code settings:

```json
{
  "eslint.workingDirectories": ["./config"],
  "eslint.validate": ["javascript", "javascriptreact"]
}
```

### Solution 3: Reinstall Dependencies

Remove and reinstall your node_modules to ensure all ESLint packages are properly installed:

```bash
rm -rf node_modules package-lock.json
npm install
```

Verify the installation:

```bash
npm list eslint
```

### Solution 4: Clear Windsurf Cache

Clear Windsurf's cache and restart:

1. Close Windsurf completely
2. Remove the cache directory:

```bash
# macOS
rm -rf ~/Library/Application\ Support/Windsurf/logs
rm -rf ~/.cache/windsurf
```

3. Reopen your project in Windsurf

### Solution 5: Configure Monorepo Projects

For monorepos, explicitly tell Windsurf which subproject to use:

```json
// In .vscode/settings.json at monorepo root
{
  "eslint.workingDirectories": [
    { "directory": "./packages/web", "changeProcessCWD": true },
    { "directory": "./packages/api", "changeProcessCWD": true }
  ]
}
```

Alternatively, add a root `eslint.config.js` that references subproject configs:

```javascript
// eslint.config.js at monorepo root
import webConfig from './packages/web/eslint.config.js';
import apiConfig from './packages/api/eslint.config.js';

export default [webConfig, apiConfig];
```

## Verification

After applying solutions, verify Windsurf recognizes your ESLint config:

1. Open a JavaScript file in your project
2. Introduce a deliberate ESLint violation
3. Wait for Windsurf to underline the issue
4. Hover over the underline to see the rule name

You should see warnings or errors matching your ESLint rules. If you see generic errors or no feedback, the configuration is still not being detected.

## Quick Reference Checklist

Use this checklist to ensure complete configuration:

- [ ] ESLint config file exists in project root
- [ ] Config filename matches accepted formats
- [ ] Config passes validation (`npx eslint --print-config`)
- [ ] ESLint installed in `node_modules`
- [ ] Windsurf workspace points to correct directory
- [ ] ESLint extension enabled in VS Code settings
- [ ] Cache cleared after configuration changes

## Advanced Configuration: Workspace Settings Deep Dive

For complex setups, create a `.vscode/settings.json` at your project root with granular ESLint configuration:

```json
{
  "eslint.enable": true,
  "eslint.run": "onSave",
  "eslint.alwaysShowStatus": true,
  "eslint.format.enable": true,
  "eslint.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "json"
  ],
  "eslint.nodePath": "./node_modules",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  }
}
```

For teams running multiple Node versions, ensure Windsurf uses the correct runtime:

```json
{
  "eslint.nodeEnv": "production",
  "eslint.nodeArgs": ["--max-old-space-size=4096"]
}
```

## ESLint Configuration Examples

### Modern ESLint (Flat Config) with Full Features

```javascript
// eslint.config.js - ESLint 9+
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    },
    plugins: {
      react,
      import: importPlugin
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/react-in-jsx-scope': 'off',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
          alphabeticalOrder: true
        }
      ]
    }
  },
  prettier
];
```

### Legacy JSON Config (.eslintrc.json)

```json
{
  "env": {
    "browser": true,
    "node": true,
    "es2022": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": ["react", "@typescript-eslint"],
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "react/react-in-jsx-scope": "off"
  },
  "overrides": [
    {
      "files": ["**/*.ts", "**/*.tsx"],
      "rules": {
        "@typescript-eslint/no-unused-vars": "warn"
      }
    }
  ]
}
```

## Debugging ESLint Detection with CLI Commands

Test your configuration directly before relying on Windsurf:

```bash
# Verify ESLint finds your config
npx eslint --debug-config . 2>&1 | head -50

# Print what ESLint sees
npx eslint --print-config src/index.js | jq '.rules | keys' | head -20

# Run ESLint on a single file to test rules
npx eslint src/app.js --format=compact

# Check which version is running
npx eslint --version

# Inspect what eslint-config-prettier does
npx eslint --print-config . | jq '.rules | to_entries[] | select(.value == false)' | head
```

## Windsurf-Specific Troubleshooting

Windsurf uses VS Code's ESLint extension internally. Access advanced debugging through the Command Palette:

1. Press Cmd/Ctrl + Shift + P
2. Type "ESLint: Debug the command line of the ESLint library"
3. Check output for errors loading your config

Common error patterns:

- **"Cannot find module '@scope/config'"** — Your extended config package isn't installed. Run `npm install @scope/config`
- **"Unexpected token"** — Your .eslintrc has syntax errors. Use `npx eslint --print-config` to identify the issue
- **"Field number X has already been used"** — ESLint rules object has duplicate keys; check for typos in rule names

## Performance Tuning for Windsurf ESLint Integration

If ESLint linting is slow or blocking Windsurf, adjust these settings:

```json
{
  "eslint.run": "onSave",
  "eslint.quiet": true,
  "eslint.lintTask.enable": false,
  "eslint.workingDirectories": [
    {
      "directory": "./src",
      "changeProcessCWD": true
    }
  ],
  "files.exclude": {
    "node_modules": true,
    "dist": true,
    ".next": true,
    "build": true
  }
}
```

Setting `run: "onSave"` instead of `onChange` prevents constant checking as you type. For monorepos, limiting working directories reduces the scope ESLint must analyze.

## Testing Your Config with Sample Files

Create a test file to verify Windsurf will detect your rules:

```javascript
// test.js - Intentional violations
const unused = 42; // Should trigger no-unused-vars
console.log('test'); // Should trigger no-console if enabled
var x=1; // Should trigger spacing rules

function badly_named(){} // Should trigger naming-convention if enabled
```

In Windsurf, open this file. You should see red underlines matching your .eslintrc rules. If you don't see errors after 2-3 seconds, your config isn't loading.

## Integration with CI/CD Pipelines

Once Windsurf detects your ESLint config properly, ensure your CI/CD runs the same checks:

```bash
#!/bin/bash
# lint.sh
set -e

echo "Running ESLint..."
npx eslint . --format=junit --output-file=eslint-results.xml

echo "Running type checks..."
npx tsc --noEmit

echo "All checks passed!"
```

## Quick Reference Checklist

Use this checklist to ensure complete configuration:

- [ ] ESLint config file exists in project root with recognized filename
- [ ] Config filename matches accepted formats (.eslintrc.js, eslint.config.js, etc.)
- [ ] Config passes validation (`npx eslint --print-config . | jq length`)
- [ ] ESLint and all plugins installed in `node_modules`
- [ ] Windsurf workspace points to correct directory (File → Open Folder)
- [ ] ESLint extension enabled in Windsurf (Settings → Search "eslint" → Ensure "Enable" is checked)
- [ ] Cache cleared after configuration changes (`Command Palette → Developer: Reload Window`)
- [ ] Node.js version compatible with your ESLint version (`node --version`)
- [ ] For extended configs, verify packages are installed (`npm list <config-name>`)

Most developers resolve this issue by ensuring their ESLint config follows standard naming conventions and exists in the project root directory. For monorepos, explicit directory configuration in VS Code settings typically fixes detection problems.

If you continue experiencing issues after trying these solutions, check the Windsurf documentation for your specific version, as configuration options may vary between releases.

## Frequently Asked Questions

**Who is this article written for?**

This article is written for developers, technical professionals, and power users who want practical guidance. Whether you are evaluating options or implementing a solution, the information here focuses on real-world applicability rather than theoretical overviews.

**How current is the information in this article?**

We update articles regularly to reflect the latest changes. However, tools and platforms evolve quickly. Always verify specific feature availability and pricing directly on the official website before making purchasing decisions.

**Does Windsurf offer a free tier?**

Most major tools offer some form of free tier or trial period. Check Windsurf's current pricing page for the latest free tier details, as these change frequently. Free tiers typically have usage limits that work for evaluation but may not be sufficient for daily professional use.

**How do I get started quickly?**

Pick one tool from the options discussed and sign up for a free trial. Spend 30 minutes on a real task from your daily work rather than running through tutorials. Real usage reveals fit faster than feature comparisons.

**What is the learning curve like?**

Most tools discussed here can be used productively within a few hours. Mastering advanced features takes 1-2 weeks of regular use. Focus on the 20% of features that cover 80% of your needs first, then explore advanced capabilities as specific needs arise.

## Related Articles

- [Does WindSurf AI Send Entire Project Context or Just Open](/does-windsurf-ai-send-entire-project-context-or-just-open-fi/)
- [Windsurf AI Flows Feature How It Chains Multiple Editing](/windsurf-ai-flows-feature-how-it-chains-multiple-editing-ste/)
- [Switching from Windsurf to Cursor How to Transfer Project](/switching-from-windsurf-to-cursor-how-to-transfer-project-config/)
- [Cursor Free Plan vs Windsurf Free Plan Which Gives](/cursor-free-plan-vs-windsurf-free-plan-which-gives-more/)
- [Switching from Windsurf Free to Cursor Free What Is](/switching-from-windsurf-free-to-cursor-free-what-is-different/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)
