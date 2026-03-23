---
layout: default
title: "Copilot Not Suggesting Imports Automatically"
description: "Fix GitHub Copilot not auto-suggesting imports: settings checks, language server conflicts, extension order, and tsconfig adjustments step by step."
date: 2026-03-15
last_modified_at: 2026-03-22
author: theluckystrike
permalink: /copilot-not-suggesting-imports-automatically-fix/
reviewed: true
score: 9
categories: [guides]
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, troubleshooting]
---


{% raw %}

To fix Copilot not suggesting imports, first verify that `editor.inlineSuggest.enabled` is set to `true` in your VS Code `settings.json` and that your programming language is not disabled under Copilot's Language Visibility settings. If those are correct, clear the Copilot cache by deleting the `github-copilot` folder in your editor's global storage directory and re-authenticate. This guide covers all ten common fixes, from simple setting checks to extension conflict resolution.

## Key Takeaways

- **If you see import**: suggestions working in `.ts` files but not `.tsx` files, this is almost always the cause.
- **This is the single most common cause of "invisible" Copilot suggestions**: the AI is working, but the rendering layer is suppressed.
- **Copilot uses generative AI**: to predict what you likely want next, drawing from its training data.
- **When any part of that inference chain breaks**: misconfigured settings, a stale authentication token, a conflicting extension—the result is silence where suggestions used to appear.
- **These will point you**: directly to the root cause.
- **If you are behind a corporate proxy**: confirm that `api.github.com` and `copilot-proxy.githubusercontent.com` are reachable before proceeding with the fixes below.

## Understanding the Problem


Copilot should automatically suggest import statements when you use a function, class, or module that isn't currently imported in your file. For example, if you type `Math.random()` in JavaScript, Copilot should recognize that `Math` needs to be imported and suggest the appropriate import statement. When this feature stops working, several factors could be responsible.


First, verify that Copilot is actually enabled in your environment. Sometimes the simplest explanation is the correct one.


Copilot's import suggestion system works differently from language server features like TypeScript's auto-import or Python's Pylance suggestions. Copilot uses generative AI to predict what you likely want next, drawing from its training data. This means its import suggestions are context-driven rather than purely syntactic. The model scans your open file, your recent edits, and the broader workspace context to infer which imports belong at the top of your file. When any part of that inference chain breaks—misconfigured settings, a stale authentication token, a conflicting extension—the result is silence where suggestions used to appear.


## Diagnostic Checklist Before You Start


Before running through individual fixes, spend two minutes gathering baseline data. This prevents you from fixing the wrong thing.


Open the VS Code Output panel via **View → Output** and select "GitHub Copilot" from the dropdown. Look for connection errors, authentication failures, or rate limit messages. These will point you directly to the root cause.


Also check the Copilot status icon in the status bar at the bottom of the VS Code window. A spinning icon means Copilot is working but has not produced a suggestion. A yellow warning icon means a configuration or authentication problem. A greyed-out icon means Copilot is disabled for the current file or language.

If you are behind a corporate proxy, confirm that `api.github.com` and `copilot-proxy.githubusercontent.com` are reachable before proceeding with the fixes below.


## Step-by-Step Fixes


### Fix 1: Verify Copilot is Enabled


First, ensure Copilot is turned on in your editor:


1. Open VS Code (or your supported editor)

2. Navigate to **Settings** → **Extensions** → **GitHub Copilot**

3. Confirm the "Enable Copilot" checkbox is selected

4. Check the status bar at the bottom of the editor for the Copilot icon


If Copilot is disabled, toggle it on and restart your editor.


### Fix 2: Check Language-Specific Settings


Copilot behavior can vary by programming language. Verify that the relevant language is enabled:


1. Go to **Settings** → **Extensions** → **GitHub Copilot** → **Language Visibility**

2. Ensure your programming language (JavaScript, Python, TypeScript, etc.) is enabled

3. If disabled, enable it and restart Copilot


The Copilot `settings.json` section uses language identifiers that must match exactly. Python is `python`, not `Python` or `py`. TypeScript React files use `typescriptreact`. If you see import suggestions working in `.ts` files but not `.tsx` files, this is almost always the cause.


### Fix 3: Update Copilot and Your Editor


Outdated versions often cause unexpected behavior. Update both:


- VS Code: Use **Help** → **Check for Updates**

- Copilot Extension: Visit the Extensions panel and check for updates

- Restart your editor after updating


### Fix 4: Clear Copilot Cache


Cached data can become corrupted and interfere with suggestions:


1. Close your editor completely

2. Navigate to your editor's settings folder:

 - Windows: `%APPDATA%\Code\User\globalStorage\github-copilot`

 - macOS: `~/Library/Application Support/Code/User/globalStorage/github-copilot`

 - Linux: `~/.config/Code/User/globalStorage/github-copilot`

3. Delete the contents of the `github-copilot` folder

4. Reopen your editor and sign in to Copilot again


### Fix 5: Adjust Editor Settings


Certain editor settings can conflict with Copilot functionality:


1. Open your `settings.json` file (accessible via **Settings** → **Open Settings JSON**)

2. Verify these settings are configured correctly:


```json
{
  "editor.inlineSuggest.enabled": true,
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false,
    "markdown": false
  }
}
```


3. Ensure your language isn't explicitly disabled in the Copilot settings

4. Restart your editor


If `editor.inlineSuggest.enabled` is false, Copilot will generate suggestions internally but will never render them in the editor. This is the single most common cause of "invisible" Copilot suggestions—the AI is working, but the rendering layer is suppressed.


### Fix 6: Check Your Internet Connection


Copilot requires an active internet connection to function properly. Verify your connection by:


- Testing connectivity to GitHub

- Checking firewall or proxy settings that might block Copilot's requests

- Ensuring corporate networks aren't restricting access


For corporate environments, you may need to configure a proxy. Set the `http.proxy` setting in VS Code to your proxy URL and ensure your network administrator has whitelisted the Copilot endpoint domains.


### Fix 7: Re-authenticate Copilot


Authentication issues can prevent Copilot from functioning correctly:


1. Click the Copilot icon in the status bar

2. Select "Sign out" from Copilot

3. Close and reopen your editor

4. Sign in again when prompted


GitHub tokens expire after a set period, and stale tokens cause silent failures. Re-authenticating generates a fresh token and clears the stale credential from the system keychain.


### Fix 8: Review File Context


Copilot needs sufficient context to make accurate suggestions:


- Ensure your file has a clear file extension (`.js`, `.ts`, `.py`, etc.)

- Verify the file is saved to disk (unsaved files may have limited functionality)

- Check that you're not working in a restricted or excluded folder


Copilot also performs better when your file already has some content. A completely empty file gives the model very little to work with. Type a comment describing what the file does, or add the first few function signatures, and import suggestions will appear more reliably.


### Fix 9: Check Workspace Exclusions


Your workspace or user settings might be excluding certain files:


1. Open **Settings** → **Extensions** → **GitHub Copilot** → **Excluded Regions**

2. Verify no patterns match your current project files

3. Remove any overly broad exclusion patterns


A common mistake is adding `**/node_modules/**` to exclusions (which is correct) but accidentally using a broader pattern like `**/*.js` that blocks Copilot from your source files too.


### Fix 10: Disable Competing Extensions


Other extensions can interfere with Copilot:


1. Temporarily disable all other extensions

2. Test if Copilot suggests imports

3. Re-enable extensions one by one to identify the culprit


Extensions most likely to conflict include other AI completion tools (Tabnine, Codeium, AWS CodeWhisperer), aggressive linters that run on every keystroke, and extensions that intercept inline suggestion events. If you identify a conflict, check both extensions' GitHub issues pages—many conflicts have documented workarounds.


## Comparing Import Suggestion Behavior Across Languages


The quality of Copilot's import suggestions varies by ecosystem:


| Language | Import Suggestion Quality | Common Issues |
|----------|--------------------------|---------------|
| Python | Excellent | Misses conditional imports, virtual env conflicts |
| TypeScript | Excellent | May suggest CommonJS vs ESM incorrectly |
| JavaScript | Good | Node vs browser APIs sometimes confused |
| Java | Good | Requires more explicit context |
| Go | Very Good | Package paths occasionally wrong for local modules |
| Rust | Good | Crate versions sometimes outdated in suggestions |


For Python specifically, Copilot's import suggestions improve significantly when you have a `requirements.txt` or `pyproject.toml` in your project root. The model uses these files to understand which packages are available in your environment.


## Diagnostic Tips


When troubleshooting, gather information about your environment:


- Editor version: Run `code --version` in your terminal

- Copilot version: Check in the Extensions panel

- Operating system: Note your OS and version

- Error messages: Check the Output panel (View → Output → Select "GitHub Copilot")


If the issue persists after trying all fixes, consider:


- Checking the [GitHub Community Forum](https://github.com/community) for similar issues

- Reporting the problem through VS Code's "Help → Report Issue" feature

- Trying a fresh VS Code user data directory to isolate configuration issues


## Common Causes Summary


The most frequent reasons Copilot stops suggesting imports include:


The most frequent causes are disabled language support for the specific language, outdated software lacking necessary fixes, authentication problems from session expiration or sign-in issues, conflicting editor or workspace settings, insufficient context from missing file extensions or unsaved state, and network issues that prevent Copilot from reaching GitHub.


## Prevention Best Practices


Maintain consistent Copilot performance by:


- Keeping your editor and Copilot extension updated

- Regularly clearing cache every few months

- Avoiding overly broad exclusion patterns

- Monitoring extension interactions when installing new tools

- Setting up your workspace with proper project files (`package.json`, `pyproject.toml`, etc.) so Copilot has context about available dependencies


Most import suggestion issues resolve by updating your software or re-authenticating. If you work across multiple machines, keep your VS Code settings synced via the built-in Settings Sync feature to avoid configuration drift between environments.


## FAQ


**Why does Copilot suggest imports in some files but not others in the same project?**

File-level exclusions or language-specific disabling are usually responsible. Check that the file extension is recognized and that no workspace-level exclusion pattern matches the file path.

**Does Copilot suggest imports for local modules and internal packages?**

Yes, but quality depends on how much of your project is open in the editor. Copilot reads open tabs as part of its context window. Opening the module you want to import from in a separate tab often improves suggestion accuracy for local imports.

**Will Copilot suggest the correct import path for monorepo setups?**

Monorepos require more explicit context. Add a comment near the top of your file describing the package structure, or reference other files in your editor that already use the import you need. Copilot will pick up the pattern.

**Does import suggestion work in Copilot Chat vs inline suggestions?**

Both modes can suggest imports, but inline suggestions are faster for this use case. In Copilot Chat, you can explicitly ask "what imports does this code need?" and get a reliable answer with explanations.

---


## Related Articles

- [Best Free AI Tool for Writing Unit Tests Automatically](/best-free-ai-tool-for-writing-unit-tests-automatically/)
- [Copilot Chat Not Responding in GitHub Fix](/copilot-chat-not-responding-in-github-fix/)
- [Copilot Enterprise License Not Assigned Fix](/copilot-enterprise-license-not-assigned-fix/)
- [Copilot Suggestions Not Showing Up Fix 2026](/copilot-suggestions-not-showing-up-fix-2026/)
- [Copilot Suggestions Wrong How to Fix](/copilot-suggestions-wrong-how-to-fix/)

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
