---
layout: default
title: "How to Export Grammarly Personal Dictionary Before Switching"
description: "A practical guide for developers and power users on exporting your Grammarly personal dictionary before transitioning to AI assistants like Claude"
date: 2026-03-16
last_modified_at: 2026-03-16
author: theluckystrike
permalink: /how-to-export-grammarly-personal-dictionary-before-switching/
categories: [guides]
tags: [ai-tools-compared, tools]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
---


Export your Grammarly personal dictionary by locating the local SQLite database on Windows (`%APPDATA%\Grammarly\GrammarlyAppData\userdictionary\`) or macOS (`~/Library/Application Support/Grammarly/`), then extracting the word list with a Python script or SQLite viewer. For browser extension users, pull dictionary data from Local Storage via Developer Tools. Once exported, you can import your custom words into Claude, VS Code, Neovim, or any other tool that supports custom dictionaries.

## Why Your Personal Dictionary Matters

Your Grammarly personal dictionary contains words that the tool has learned to recognize as correct in your writing context. These might include:

- Technical acronyms specific to your industry

- Company names and product names you frequently use

- Specialized terminology from your field

- Custom spellings you prefer

- Names of people, places, or projects

When you stop using Grammarly, all these custom entries vanish unless you export them first. The good news is that Grammarly does provide ways to access your dictionary data, though the methods require some technical steps.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Method 1: Export via Grammarly Desktop Application

The Grammarly desktop application for Windows and macOS stores your personal dictionary locally. Here is how to find and export it.

### On Windows

Your personal dictionary is stored in a SQLite database. Navigate to:

```
%APPDATA%\Grammarly\GrammarlyAppData\userdictionary\
```

You will find a file named something like `userdictionary.db`. You can open this file with any SQLite viewer. Use this Python script to extract your words:

```python
import sqlite3
import os

db_path = os.path.join(
    os.environ['APPDATA'],
    'Grammarly',
    'GrammarlyAppData',
    'userdictionary',
    'userdictionary.db'
)

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check available tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables found:", tables)

    # Try to read from common dictionary tables
    for table in tables:
        table_name = table[0]
        try:
            cursor.execute(f"SELECT * FROM {table_name};")
            rows = cursor.fetchall()
            if rows:
                print(f"\nWords in {table_name}:")
                for row in rows:
                    print(row)
        except Exception as e:
            print(f"Error reading {table_name}: {e}")

    conn.close()
else:
    print(f"Dictionary database not found at: {db_path}")
```

### On macOS

The database location differs on macOS:

```
~/Library/Application Support/Grammarly/GrammarlyAppData/userdictionary/
```

Use the same Python script with the adjusted path:

```python
import os

db_path = os.path.expanduser(
    '~/Library/Application Support/Grammarly/GrammarlyAppData/userdictionary/userdictionary.db'
)
```

### Step 2: Method 2: Browser Extension Dictionary Export

If you primarily use the Grammarly browser extension, your dictionary syncs to Grammarly's servers. You can access it through the web application or by inspecting browser storage.

### Using Browser Developer Tools

Open the browser where you have Grammarly installed, then:

1. Go to any text field (or grammarly.com)

2. Open Developer Tools (F12 or Cmd+Option+I)

3. Navigate to the Application tab

4. Expand Local Storage > chrome-extension://

5. Look for entries containing "dictionary" or "personal"

You may find JSON data with your custom words. Extract and format them:

```javascript
// Run this in the browser console on grammarly.com
const keys = Object.keys(localStorage);
const dictionaryKeys = keys.filter(k =>
  k.toLowerCase().includes('dict') ||
  k.toLowerCase().includes('personal')
);

dictionaryKeys.forEach(key => {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(`Key: ${key}`, data);
  } catch(e) {
    console.log(`Key: ${key}`, localStorage.getItem(key));
  }
});
```

### Step 3: Method 3: Manual Word List Recovery

If other methods fail, you can rebuild your dictionary systematically. This takes more time but works reliably.

### Track Words from Your Writing

Create a script that extracts unique words from your documents and identify which ones you added to Grammarly:

```python
import os
import re
from collections import Counter

def extract_words_from_directory(directory, extensions=['.md', '.txt', '.py', '.js', '.java']):
    """Extract all words from text files in a directory."""
    word_counts = Counter()

    for root, dirs, files in os.walk(directory):
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        text = f.read()
                        words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9_-]+\b', text.lower())
                        word_counts.update(words)
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")

    return word_counts

# Usage
word_counts = extract_words_from_directory('./my-writing-projects')
print(f"Found {len(word_counts)} unique words")
print("\nMost common words (likely in your dictionary):")
for word, count in word_counts.most_common(50):
    print(f"  {word}: {count}")
```

This gives you a list of frequently used words, making it easier to remember which ones you added to Grammarly.

### Step 4: Importing Words Into Claude and Other Tools

Once you have your exported word list, you can import it into your new AI assistant or text editor.

### For Claude (via Claude Code)

Create a custom words file that Claude can reference. Add entries to your project configuration:

```bash
# Create a .claude-words file in your project
cat > .claude-custom-words << 'EOF'
# Custom words and terms for Claude to recognize
# Add your Grammarly personal dictionary words here

# Technical terms
# AcmeCorp
# APIGateway
# Auth0
# CI/CD
# PostgreSQL

# Project-specific terms
# [Add your custom terms here]
EOF
```

### For VS Code with Spell Checker

If you use VS Code with a spell-checking extension, import your words:

```json
// In your VS Code settings.json
{
  "cSpell.userWords": [
    "AcmeCorp",
    "APIGateway",
    "Auth0",
    "CI/CD",
    "PostgreSQL",
    // Add your exported words here
  ]
}
```

### For Text Editors (Neovim, Emacs)

Add to your spell checker configuration:

```lua
-- For Neovim (add to init.lua or spell file)
vim.cmd([[
  set spelllang=en_us
  " Load custom dictionary
  set spellfile=~/.config/nvim/spell/custom.utf-8.add
]])
```

Then create the file with one word per line:

```
AcmeCorp
APIGateway
Auth0
CI/CD
PostgreSQL
```

### Step 5: What the Grammarly Dictionary Actually Stores

Before exporting, it helps to know exactly what Grammarly saves. The personal dictionary typically contains two categories of entries:

**Accepted words** — terms you marked as "correct" when Grammarly flagged them. These include product names like `Kubernetes`, `Terraform`, or `PostgreSQL`, acronyms like `IAM`, `RBAC`, or `SLA`, and non-standard spellings you intentionally use. Every time you clicked "Add to dictionary," Grammarly stored the word in this table.

**Ignored patterns** — some versions of Grammarly also store patterns or phrases you have suppressed from suggestions. These may not appear in the same SQLite table as accepted words. Check all tables when running the extraction script.

The most common table names are `user_dictionary`, `personal_words`, and `dictionary_entries`. Run `SELECT name FROM sqlite_master WHERE type='table';` before querying to see what your installation contains.

### Step 6: Cross-Platform Word List Consolidation

If you use Grammarly on both Windows and macOS (or on a work machine and a personal machine), you likely have two separate local databases with overlapping but different word sets. Merge them before importing into your new tool:

```python
import sqlite3
import os

def extract_words_from_db(db_path):
    """Extract all words from a Grammarly SQLite database."""
    words = set()
    if not os.path.exists(db_path):
        return words
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    for table in tables:
        try:
            cursor.execute(f"SELECT * FROM {table};")
            for row in cursor.fetchall():
                for cell in row:
                    if isinstance(cell, str) and len(cell) > 1:
                        words.add(cell.strip())
        except Exception:
            pass
    conn.close()
    return words

# Merge from multiple machines
windows_db = "/path/to/windows/userdictionary.db"
mac_db = os.path.expanduser(
    "~/Library/Application Support/Grammarly/GrammarlyAppData/userdictionary/userdictionary.db"
)

all_words = extract_words_from_db(windows_db) | extract_words_from_db(mac_db)

# Write merged list
with open("merged-dictionary.txt", "w") as f:
    for word in sorted(all_words):
        f.write(word + "\n")

print(f"Merged {len(all_words)} unique words")
```

This produces a single `merged-dictionary.txt` that you can import into any target tool.

### Step 7: Importing Into LanguageTool (Self-Hosted)

LanguageTool is a popular Grammarly alternative that can run self-hosted. Its personal dictionary is a plain text file with one word per line, stored at `~/.languagetool/personalDictionary.txt` on Linux and macOS.

```bash
# Copy your exported word list directly
cp merged-dictionary.txt ~/.languagetool/personalDictionary.txt
```

If you use the LanguageTool VS Code extension, the custom words list is configurable in settings:

```json
{
  "languageToolLint.motherTongue": "en-US",
  "languageToolLint.dictionary": ["AcmeCorp", "PostgreSQL", "Terraform"]
}
```

For large dictionaries, use the import script above to generate the JSON array automatically and paste the output into `settings.json` under `languageToolLint.dictionary`.

### Step 8: Validating the Export

After exporting and importing, validate that your most critical terms are present. Create a quick test file with the technical words that matter most to your workflow, then run your new spell checker against it. Any flagged terms that should have been imported need to be added manually.

```bash
# Count words in export to verify completeness
wc -l merged-dictionary.txt
```

A complete export typically contains between 50 and 500 words for an active developer. If your export shows fewer than 20 words and you have used Grammarly for years, the database path may be wrong or the account may have used cloud sync rather than local storage.

### Step 9: Automate the Export Process

For ongoing use, consider a script that backs up your dictionary regularly:

```bash
#!/bin/bash
# backup-grammarly-dictionary.sh

DATE=$(date +%Y-%m-%d)
DEST_DIR="$HOME/Documents/dictionary-backups"
mkdir -p "$DEST_DIR"

# Copy from common locations
if [ -d "$APPDATA/Grammarly/GrammarlyAppData/userdictionary" ]; then
    cp -r "$APPDATA/Grammarly/GrammarlyAppData/userdictionary" "$DEST_DIR/grammarly-$DATE"
    echo "Backed up Windows Grammarly dictionary"
fi

if [ -d "$HOME/Library/Application Support/Grammarly/GrammarlyAppData/userdictionary" ]; then
    cp -r "$HOME/Library/Application Support/Grammarly/GrammarlyAppData/userdictionary" "$DEST_DIR/grammarly-mac-$DATE"
    echo "Backed up macOS Grammarly dictionary"
fi

echo "Backup complete: $DEST_DIR"
```

Run this weekly or monthly to keep your dictionary safe.

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Frequently Asked Questions

**How long does it take to export grammarly personal dictionary before switching?**

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

**What are the most common mistakes to avoid?**

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

**Do I need prior experience to follow this guide?**

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

**Can I adapt this for a different tech stack?**

Yes, the underlying concepts transfer to other stacks, though the specific implementation details will differ. Look for equivalent libraries and patterns in your target stack. The architecture and workflow design remain similar even when the syntax changes.

**Where can I get help if I run into issues?**

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

## Related Articles

- [Switching from Grammarly to ChatGPT for Editing Workflow Mig](/switching-from-grammarly-to-chatgpt-for-editing-workflow-mig/)
- [Export Perplexity Collections Before Switching to ChatGPT Se](/export-perplexity-collections-before-switching-to-chatgpt-se/)
- [How to Export Gemini Workspace Data Before Switching to](/how-to-export-gemini-workspace-data-before-switching-to-claude-team/)
- [Grammarly AI Not Working in Browser Fix (2026)](/grammarly-ai-not-working-in-browser-fix-2026/)
- [Grammarly Business vs ChatGPT Team for Enterprises](/grammarly-business-vs-chatgpt-team-for-enterprises/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
```
```
