---
layout: default
title: "How to Export Grammarly Personal Dictionary Before."
description: "A practical guide for developers and power users on exporting your Grammarly personal dictionary before transitioning to AI assistants like Claude."
date: 2026-03-16
author: theluckystrike
permalink: /how-to-export-grammarly-personal-dictionary-before-switching/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
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



## Method 1: Export via Grammarly Desktop Application



The Grammarly desktop application for Windows and macOS stores your personal dictionary locally. Here is how to find and export it.



### On Windows



Your personal dictionary is stored in an SQLite database. Navigate to:



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


## Method 2: Browser Extension Dictionary Export



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


## Method 3: Manual Word List Recovery



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



## Importing Words Into Claude and Other Tools



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


## Automating the Export Process



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



## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
