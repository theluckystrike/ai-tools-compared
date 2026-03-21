---
layout: default
title: "Claude Code Terminal Output Garbled on Windows Fix 2026"
description: "Fix garbled terminal output in Claude Code on Windows with practical solutions for encoding issues, terminal compatibility, and configuration tweaks."
date: 2026-03-20
author: theluckystrike
permalink: /claude-code-terminal-output-garbled-on-windows-fix-2026/
reviewed: true
score: 8
categories: [troubleshooting]
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, troubleshooting, claude-code, windows, terminal]
---

# Claude Code Terminal Output Garbled on Windows Fix 2026

Windows users running Claude Code frequently encounter garbled output—characters that appear as boxes, question marks, or completely wrong symbols. This problem stems from encoding mismatches between Claude Code's output and Windows terminal expectations. In 2026, several reliable solutions exist to fix this issue and restore clean, readable terminal output.

## Understanding the Garbled Output Problem

Claude Code outputs text using UTF-8 encoding by default. Windows terminals, particularly Command Prompt (cmd.exe) and older PowerShell configurations, often default to legacy encodings like Windows-1252 or the system's active code page (typically CP437 or CP1252). When UTF-8 encoded characters hit a terminal expecting a different encoding, characters get misinterpreted, resulting in garbled output.

The problem manifests in several ways:

- Special characters (→, ©, ü, ñ) appear as boxes or question marks
- Non-ASCII characters display incorrectly
- JSON output shows escaped Unicode sequences instead of actual characters
- Colored terminal output displays as garbled text

## Primary Solution: Configure Terminal Encoding

The most effective fix involves setting your Windows terminal to use UTF-8 encoding consistently.

### PowerShell Configuration

Open PowerShell and run the following commands to set UTF-8 globally:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
```

To make this permanent, add these lines to your PowerShell profile:

```powershell
# Create profile if it doesn't exist
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}

# Add encoding settings
"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8" | Add-Content $PROFILE
'$env:PYTHONIOENCODING = "utf-8"' | Add-Content $PROFILE
```

### Windows Terminal (Recommended)

If you use Windows Terminal, configure the default encoding in settings:

1. Open Windows Terminal Settings
2. Navigate to Profiles → Defaults → Advanced
3. Set "Character set" to UTF-8
4. Alternatively, add this to your settings.json:

```json
{
  "profiles": {
    "defaults": {
      "font": {
        "face": "Cascadia Code"
      }
    },
    "list": [
      {
        "guid": "{...}",
        "commandline": "powershell.exe",
        "env": {
          "PYTHONIOENCODING": "utf-8"
        }
      }
    ]
  }
}
```

### Command Prompt Fix

For Command Prompt users, execute this before running Claude Code:

```cmd
chcp 65001
```

This command changes the active code page to UTF-8 (code page 65001). For a permanent solution, create a batch file:

```batch
@echo off
chcp 65001 >nul
python -m claude_code %*
```

Save this as `claude.bat` and place it in a directory in your PATH.

## Solution: Set Claude Code Environment Variables

Claude Code respects several environment variables that control encoding behavior. Set these before launching Claude Code:

```powershell
$env:CLAUDE_CODE_UTF8 = "1"
$env:LANG = "en_US.UTF-8"
$env:LC_ALL = "en_US.UTF-8"
```

For permanent configuration, add them to your system environment variables:

1. Press Win + R, type `sysdm.cpl`, press Enter
2. Go to Advanced → Environment Variables
3. Under User variables, click New
4. Add each variable with value `1` or `en_US.UTF-8`

## Solution: Terminal Font Compatibility

Some fonts don't support the full Unicode character range that Claude Code uses. Switching to a font with comprehensive Unicode support resolves display issues:

- **Cascadia Code**: Microsoft's monospace font with excellent Unicode support
- **JetBrains Mono**: Popular developer font with wide character coverage
- **Fira Code**: Another solid option with ligatures and Unicode support

Configure your terminal to use one of these fonts. In Windows Terminal, navigate to Profiles → Your Profile → Appearance and select a compatible font.

## Solution: Update Claude Code Installation

Outdated Claude Code versions may have encoding bugs that newer releases have fixed. Ensure you have the latest version:

```powershell
# Check current version
claude --version

# Update Claude Code
claude update

# Or reinstall if needed
npm install -g @anthropic-ai/claude-code
```

## Troubleshooting Specific Symptoms

### JSON Output Appears Garbled

When Claude Code returns JSON with Unicode characters, force JSON output to use ASCII-safe representations:

```powershell
$env:CLAUDE_CODE_JSON_ASCII = "1"
```

### Colored Output Displays Incorrectly

ANSI color codes sometimes display as garbled text on Windows. Install a terminal that handles ANSI escape sequences properly:

```powershell
# Install Windows Terminal from Microsoft Store
winget install Microsoft.WindowsTerminal

# Or use ConEmu
winget install ConEmu.ConEmu
```

### Git Bash or WSL Specific Issues

If running Claude Code through Git Bash or WSL:

```bash
# In .bashrc or .zshrc
export PYTHONIOENCODING=utf-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# In WSL, also ensure Windows-side encoding is set
```

## Verification: Testing Your Fix

After applying solutions, verify that Claude Code displays output correctly:

```powershell
# Test Unicode character display
claude -p "Print a Unicode test: ← → © ™ €"

# Test JSON output
claude -p "Return JSON with special chars: {'symbol': '✓', 'arrow': '→'}"
```

If characters display correctly, your configuration is working. If issues persist, check for conflicting environment variables or terminal-specific settings.

## Summary

Garbled terminal output in Claude Code on Windows stems from encoding mismatches. The fix involves configuring your terminal to use UTF-8 encoding, setting appropriate environment variables, using compatible fonts, and keeping Claude Code updated. Windows Terminal with UTF-8 configuration provides the most reliable experience. PowerShell users should set console output encoding in their profile. These changes ensure clean, readable output across all Claude Code interactions in 2026.

Built by theluckystrike — More at [zovo.one](https://zovo.one)
