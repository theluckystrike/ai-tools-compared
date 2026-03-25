---
layout: default
title: "How to Build an AI Code Review"
description: "Build a GitHub Actions bot that runs AI code review on pull requests using Claude or GPT-4, posts inline comments, and enforces custom review rules"
date: 2026-03-21
author: theluckystrike
permalink: /how-to-build-ai-code-review-bot/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---
---
layout: default
title: "How to Build an AI Code Review"
description: "Build a GitHub Actions bot that runs AI code review on pull requests using Claude or GPT-4, posts inline comments, and enforces custom review rules"
date: 2026-03-21
author: theluckystrike
permalink: /how-to-build-ai-code-review-bot/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

An AI code review bot runs on every pull request, posts inline comments on specific lines, and enforces the rules your team cares about. without a human having to review every diff. This guide builds a working GitHub Actions bot that reviews PRs using Claude, posts comments as a GitHub App, and runs in under 60 seconds.


- This guide builds a: working GitHub Actions bot that reviews PRs using Claude, posts comments as a GitHub App, and runs in under 60 seconds.
- What are the most: common mistakes to avoid? The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully.
- Consider a security review: if your application handles sensitive user data.
- This guide covers architecture, step 1: create the github app, step 2: github actions workflow, with specific setup instructions

Architecture

The bot runs as a GitHub Actions workflow triggered on `pull_request` events. It:

1. Fetches the PR diff via the GitHub API
2. Splits the diff into reviewable hunks
3. Sends each hunk to Claude with your custom review rules
4. Posts inline comments using the GitHub Review API
5. Submits a summary review (APPROVE, REQUEST_CHANGES, or COMMENT)

Step 1 - Create the GitHub App

1. Go to Settings > Developer settings > GitHub Apps > New
2. Permissions: Pull requests (Read & write), Contents (Read)
3. Install on your target repositories
4. Generate a private key, download the PEM file

Add to repository secrets - `APP_ID` and `APP_PRIVATE_KEY`.

Step 2 - GitHub Actions Workflow

```yaml
.github/workflows/ai-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    if: |
      github.event.pull_request.draft == false &&
      github.actor != 'dependabot[bot]'
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install @anthropic-ai/sdk @octokit/app @octokit/rest
      - name: Run AI Review
        env:
          APP_ID: ${{ secrets.APP_ID }}
          APP_PRIVATE_KEY: ${{ secrets.APP_PRIVATE_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          REPO_OWNER: ${{ github.repository_owner }}
          REPO_NAME: ${{ github.event.repository.name }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: node .github/scripts/ai-review.js
```

Step 3 - The Review Script

```javascript
// .github/scripts/ai-review.js
import { App } from '@octokit/app';
import Anthropic from '@anthropic-ai/sdk';

const REVIEW_RULES = `You are a senior software engineer doing a code review.

Review for:
1. Security vulnerabilities (injection, auth issues, exposed secrets)
2. Logic errors and off-by-one bugs
3. Missing error handling (unhandled promises, missing null checks)
4. Performance issues (N+1 queries, unnecessary re-computation)

Do NOT comment on - code style, formatting, naming, or missing tests.

Respond with JSON:
{
  "comments": [
    {
      "path": "src/api/users.ts",
      "line": 42,
      "severity": "error" | "warning",
      "body": "Explanation and how to fix"
    }
  ],
  "summary": "Brief assessment",
  "decision": "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
}`;

async function main() {
  const app = new App({
    appId: process.env.APP_ID,
    privateKey: process.env.APP_PRIVATE_KEY,
  });

  const octokit = await app.getInstallationOctokit(await getInstallationId(app));
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: diff } = await octokit.rest.pulls.get({
    owner: process.env.REPO_OWNER,
    repo: process.env.REPO_NAME,
    pull_number: parseInt(process.env.PR_NUMBER),
    mediaType: { format: 'diff' }
  });

  const files = parseDiff(diff);
  if (files.length > 50) { console.log('Skipping: too many files'); return; }

  const reviewableFiles = files.filter(f =>
    !f.path.match(/\.(lock|snap|min\.(js|css)|pb\.go)/)
  );

  const allComments = [];
  let overallDecision = 'APPROVE';
  const batchSize = 10;

  for (let i = 0; i < reviewableFiles.length; i += batchSize) {
    const batch = reviewableFiles.slice(i, i + batchSize);
    const diffText = batch.map(f => `--- ${f.path}\n${f.diff}`).join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: REVIEW_RULES,
      messages: [{ role: 'user', content: `Review this PR diff:\n\n${diffText}` }]
    });

    const result = JSON.parse(extractJson(response.content[0].text));
    allComments.push(...result.comments);
    if (result.decision === 'REQUEST_CHANGES') overallDecision = 'REQUEST_CHANGES';
  }

  await octokit.rest.pulls.createReview({
    owner: process.env.REPO_OWNER,
    repo: process.env.REPO_NAME,
    pull_number: parseInt(process.env.PR_NUMBER),
    commit_id: process.env.HEAD_SHA,
    event: overallDecision,
    body: `## AI Code Review\n\nFound ${allComments.length} issue(s).\n\n*Powered by Claude*`,
    comments: allComments.map(c => ({
      path: c.path, line: c.line,
      body: `${c.severity.toUpperCase()}: ${c.body}`
    }))
  });
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return match[0];
}

async function getInstallationId(app) {
  for await (const { installation } of app.eachInstallation.iterator()) {
    return installation.id;
  }
  throw new Error('No installation found');
}

function parseDiff(diffText) {
  const files = [];
  let currentFile = null;
  let currentLine = 0;

  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ b/')) {
      if (currentFile) files.push(currentFile);
      currentFile = { path: line.slice(6), diff: '', changedLines: [] };
      currentLine = 0;
    } else if (line.startsWith('@@ ')) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
      if (match) currentLine = parseInt(match[1]) - 1;
    } else if (currentFile) {
      if (line.startsWith('+')) { currentLine++; currentFile.changedLines.push(currentLine); }
      else if (!line.startsWith('-')) currentLine++;
      currentFile.diff += line + '\n';
    }
  }

  if (currentFile) files.push(currentFile);
  return files;
}

main().catch(console.error);
```

Customizing Review Rules

Add team-specific rules to `REVIEW_RULES`:

```javascript
const CUSTOM_RULES = `
Additional rules for this codebase:
- All database queries must use parameterized statements (no string interpolation with user input)
- API endpoints must validate request body with Zod schemas before processing
- React components must not call hooks conditionally
`;
```

Cost at Scale

With Claude Haiku:
- Average PR (500 lines changed): ~$0.002
- 100 PRs/month: ~$0.20
- 1000 PRs/month: ~$2.00

Upgrade to Sonnet for security-critical repositories where false negatives are expensive.

Handling Large PRs

Large PRs overwhelm AI models and produce low-quality reviews. Split them into manageable chunks:

```javascript
function splitDiffBySize(files, maxTokens = 4000) {
  const batches = [];
  let currentBatch = [];
  let currentTokens = 0;
  for (const file of files) {
    const tokens = file.diff.length / 4;
    if (currentTokens + tokens > maxTokens && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentTokens = 0;
    }
    currentBatch.push(file);
    currentTokens += tokens;
  }
  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}
```

For PRs exceeding 2000 lines, consider reviewing only the most critical files (auth, payment, database) and skipping generated code.

Security-Focused Review Rules

For repositories handling sensitive data, add security-specific rules:

```javascript
const SECURITY_RULES = `Additional security checks:
- Flag any use of eval(), new Function(), or innerHTML with user input
- Flag SQL queries built with string concatenation
- Flag API keys, tokens, or passwords in code (not .env files)
- Flag missing CSRF protection on state-changing endpoints
- Flag missing rate limiting on authentication endpoints
- Flag use of Math.random() for security-sensitive operations
- Flag missing input validation on file upload endpoints`;
```

Measuring Review Quality

Track how often developers accept AI suggestions to improve your review rules:

| Metric | Target | How to Measure |
|--------|--------|---------------|
| True positive rate | >80% | Comments that led to code changes |
| False positive rate | <15% | Comments dismissed without changes |
| Coverage | >90% | Files with issues that AI caught |
| Latency | <60s | Time from PR open to review posted |
| Developer satisfaction | >7/10 | Quarterly survey |

Log every review outcome and periodically retune your prompts based on which comments get accepted versus dismissed.

Pros and Cons of AI Code Review Bots

Advantages:
- Reviews every PR consistently, no reviewer fatigue
- Catches security patterns human reviewers often miss
- Available instantly, no waiting for reviewer availability
- Cost per review is negligible ($0.002 with Haiku)

Limitations:
- Cannot understand business context or product requirements
- May flag intentional patterns as issues
- Cannot review architectural decisions or system design
- Requires periodic prompt tuning as your codebase evolves

The best approach combines AI review for mechanical checks (security, error handling, performance) with human review for architecture, readability, and business logic.

Related Reading

- [AI Code Review Automation Tools Comparison](/ai-code-review-automation-tools-comparison/)
- [How to Build an AI-Powered Code Linter](/how-to-build-ai-powered-code-linter/)
- [AI Tools for Automated Changelog Generation 2026](/ai-tools-for-automated-changelog-generation-2026/)
- [Remote Developer Code Review Workflow Tools for Teams](https://welikeremotestack.com/remote-developer-code-review-workflow-tools-for-teams-without-synchronous-overlap/)
- [Async Code Review Process Without Zoom Calls Step by Step](https://welikeremotestack.com/async-code-review-process-without-zoom-calls-step-by-step/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

Frequently Asked Questions

How long does it take to build an ai code review?

For a straightforward setup, expect 30 minutes to 2 hours depending on your familiarity with the tools involved. Complex configurations with custom requirements may take longer. Having your credentials and environment ready before starting saves significant time.

What are the most common mistakes to avoid?

The most frequent issues are skipping prerequisite steps, using outdated package versions, and not reading error messages carefully. Follow the steps in order, verify each one works before moving on, and check the official documentation if something behaves unexpectedly.

Do I need prior experience to follow this guide?

Basic familiarity with the relevant tools and command line is helpful but not strictly required. Each step is explained with context. If you get stuck, the official documentation for each tool covers fundamentals that may fill in knowledge gaps.

Is this approach secure enough for production?

The patterns shown here follow standard practices, but production deployments need additional hardening. Add rate limiting, input validation, proper secret management, and monitoring before going live. Consider a security review if your application handles sensitive user data.

Where can I get help if I run into issues?

Start with the official documentation for each tool mentioned. Stack Overflow and GitHub Issues are good next steps for specific error messages. Community forums and Discord servers for the relevant tools often have active members who can help with setup problems.

{% endraw %}
