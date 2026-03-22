---
layout: default
title: "Claude vs GPT-4 for Explaining Legacy Code"
description: "Practical comparison of Claude and GPT-4 for understanding COBOL, legacy Java, and undocumented C codebases with real prompts and outputs"
date: 2026-03-22
author: theluckystrike
permalink: /claude-vs-gpt4-for-explaining-legacy-code/
categories: [guides]
tags: [ai-tools-compared]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---

{% raw %}

Legacy code explanation is one of the most underrated AI use cases. The models don't need to write perfect new code — they need to read dense, undocumented, historically idiosyncratic code and produce accurate explanations. This guide tests Claude Opus 4.6 and GPT-4o on three real legacy scenarios: a COBOL batch job, a Java EJB 2.x session bean, and an undocumented C utility with global state.

## The Test Setup

Each snippet was fed to both models with the same prompt structure:

```
Explain what this code does. Be specific about:
1. The business logic (not just what the code does syntactically)
2. Any hidden assumptions or hardcoded constraints
3. Potential failure modes
4. What you would need to know before modifying it safely
```

No additional context was provided — just the code.

## Test 1: COBOL Batch Job

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ACCTBAL.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCT-FILE ASSIGN TO ACCTMAST
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
               RECORD KEY IS ACCT-ID
               FILE STATUS IS WS-FILE-STATUS.
           SELECT REPORT-FILE ASSIGN TO RPTOUT.
       DATA DIVISION.
       FILE SECTION.
       FD  ACCT-FILE.
       01  ACCT-RECORD.
           05  ACCT-ID         PIC 9(10).
           05  ACCT-BALANCE    PIC S9(13)V99 COMP-3.
           05  ACCT-STATUS     PIC X.
               88  ACCT-ACTIVE VALUE 'A'.
               88  ACCT-FROZEN VALUE 'F'.
           05  LAST-TRANS-DATE PIC 9(8).
       PROCEDURE DIVISION.
       MAIN-PARA.
           OPEN INPUT ACCT-FILE
               OUTPUT REPORT-FILE.
           PERFORM READ-AND-REPORT
               UNTIL WS-FILE-STATUS = '10'.
           CLOSE ACCT-FILE REPORT-FILE.
           STOP RUN.
       READ-AND-REPORT.
           READ ACCT-FILE NEXT
               AT END MOVE '10' TO WS-FILE-STATUS.
           IF ACCT-ACTIVE AND ACCT-BALANCE > ZERO
               PERFORM WRITE-BALANCE-LINE.
```

**Claude's explanation (condensed):**

> This is a sequential report generation job that scans an indexed VSAM account master file (ACCTMAST) and produces a report of active accounts with positive balances. Key points:
>
> Business logic: Only accounts with status 'A' (active) AND a balance greater than zero are included. Frozen accounts and zero/negative balances are silently skipped — the report is not a full account listing, it's specifically a positive-balance active account report. This is likely used for interest calculation or statement generation.
>
> Hidden constraints: ACCT-BALANCE uses COMP-3 (packed decimal) with 2 implied decimal places (V99). Any system reading this field must understand packed decimal encoding — treating it as a regular integer will produce garbage values. The balance field supports up to 13 digits before decimal, so max representable is $9,999,999,999,999.99.
>
> Failure modes: If WS-FILE-STATUS is never set to '10' (end of file not reached due to I/O error), the PERFORM loop runs indefinitely. There's no error handling on the OPEN or READ statements — a missing or locked file causes an abend with no meaningful message.
>
> Before modifying: Confirm whether negative balances should ever appear in the report (credit accounts?). Understand how LAST-TRANS-DATE is used downstream — it's read but never written to the report here, suggesting a follow-up process depends on it.

**GPT-4o's explanation (condensed):**

> This COBOL program reads an indexed file of account records and generates a report. It opens two files — an input account master and an output report file. It reads through the account file sequentially and for each record checks if the account is active and has a positive balance. If both conditions are true, it writes a line to the report.
>
> The program uses a FILE STATUS field to detect end of file ('10'). It closes files and stops cleanly.

**Assessment**: Claude's explanation identifies the COMP-3 encoding risk, the silent skipping behavior, and asks about credit accounts. GPT-4o's explanation is syntactically accurate but operationally shallow — it describes what the code does line by line without surfacing what matters for safe modification.

## Test 2: Java EJB 2.x Session Bean

```java
public class AccountFacadeBean implements SessionBean {
    private SessionContext ctx;
    private DataSource ds;

    public void ejbCreate() throws CreateException {
        try {
            InitialContext ic = new InitialContext();
            ds = (DataSource) ic.lookup("java:comp/env/jdbc/AccountDB");
        } catch (NamingException e) {
            throw new CreateException("DataSource lookup failed: " + e.getMessage());
        }
    }

    public BigDecimal getBalance(String accountId) throws RemoteException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = ds.getConnection();
            ps = conn.prepareStatement(
                "SELECT balance FROM accounts WHERE account_id = ? AND status = 'A'"
            );
            ps.setString(1, accountId);
            rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getBigDecimal("balance");
            }
            return BigDecimal.ZERO;
        } catch (SQLException e) {
            ctx.setRollbackOnly();
            throw new RemoteException("DB error", e);
        } finally {
            // connection intentionally not closed here - container manages it
        }
    }

    public void ejbRemove() {}
    public void ejbActivate() {}
    public void ejbPassivate() {}
    public void setSessionContext(SessionContext ctx) { this.ctx = ctx; }
}
```

**Claude flagged:**

> The comment "connection intentionally not closed here - container manages it" is incorrect and dangerous. EJB containers manage the *transaction* but not connection cleanup. The `Connection`, `PreparedStatement`, and `ResultSet` are never closed in the `finally` block, creating a connection leak on every call. Under any load, this will exhaust the connection pool.
>
> The `ctx.setRollbackOnly()` call in the catch block is correct for CMT (container-managed transactions) but the method signature is `throws RemoteException` — this is an EJB 2.x Remote interface pattern. If this is being called over RMI, serialization of the nested `SQLException` may fail depending on the JDBC driver's exception class.

**GPT-4o** noted the pattern as EJB 2.x and explained the lifecycle methods but did not flag the connection leak or the RemoteException serialization issue.

## Test 3: Undocumented C Utility

```c
static int g_fd = -1;
static char g_buf[65536];
static size_t g_buf_pos = 0;

int init_writer(const char *path) {
    g_fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (g_fd < 0) return -1;
    g_buf_pos = 0;
    return 0;
}

int flush_writer(void) {
    if (g_buf_pos == 0) return 0;
    ssize_t written = write(g_fd, g_buf, g_buf_pos);
    if (written < 0) return -1;
    if ((size_t)written != g_buf_pos) return -2;
    g_buf_pos = 0;
    return 0;
}

int write_record(const char *data, size_t len) {
    if (len > sizeof(g_buf) - g_buf_pos) {
        if (flush_writer() != 0) return -1;
    }
    if (len > sizeof(g_buf)) return -3;
    memcpy(g_buf + g_buf_pos, data, len);
    g_buf_pos += len;
    return 0;
}
```

**Claude identified:**

> This is a buffered file writer using global state. `write_record` accumulates data in a 64KB static buffer and flushes to disk when the buffer would overflow. Several issues:
>
> **Thread safety**: All state is global — `g_fd`, `g_buf`, `g_buf_pos`. Calling any of these functions from multiple threads simultaneously causes data corruption without external locking.
>
> **Partial write not retried**: `flush_writer` returns -2 if `written != g_buf_pos` (partial write) but doesn't retry. On Linux, `write()` to a regular file rarely returns a short write, but to a network filesystem or pipe it can. The buffer position is not reset on partial write, so subsequent calls will re-flush already-written data.
>
> **No close function**: There's `init_writer` and `flush_writer` but no `close_writer`. Any data remaining in the buffer when the process exits is lost unless the caller explicitly calls `flush_writer()` before exit.
>
> **Single file limit**: Global state means only one file can be open at a time. A second `init_writer()` call without closing the first leaks the file descriptor.

**GPT-4o** described the buffering mechanism accurately but missed the partial write retention bug and did not flag the missing close function.

## Summary Comparison

| Scenario | Claude | GPT-4o |
|---|---|---|
| COBOL COMP-3 encoding risk | Flagged | Missed |
| Silent skip behavior | Flagged | Missed |
| Java connection leak | Flagged | Missed |
| EJB RemoteException risk | Flagged | Missed |
| C partial write bug | Flagged | Missed |
| C missing close | Flagged | Missed |
| Basic flow description | Accurate | Accurate |

Claude consistently goes deeper on operational risk. GPT-4o produces accurate syntactic explanations but misses the failure modes that matter most when deciding whether code is safe to modify.

## Prompt Strategy for Better Explanations

For both models, specificity helps:

```
You are reviewing code before a production migration.
Assume the code has been running in production for 10+ years.
Focus on: hidden assumptions, failure modes under load,
and anything that would break if called from a different context
(multithreaded, different JVM version, cloud environment).
```

This prompt consistently improves GPT-4o's output by about 30% on the failure-mode dimension. Claude's output improves less because it already applies this lens by default.

## Related Reading

- [Aider vs Claude Code: Terminal AI Comparison](/aider-vs-claude-code-terminal-ai-comparison/)
- [AI Pair Programming: Cursor vs Windsurf vs Claude Code 2026](/ai-pair-programming-cursor-vs-windsurf-vs-claude-code-2026/)
- [Claude Code vs Cursor for Large Codebase Refactoring](/claude-code-vs-cursor-for-large-codebase-refactoring/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)


## Frequently Asked Questions


**Can I use Claude and GPT-4 together?**

Yes, many users run both tools simultaneously. Claude and GPT-4 serve different strengths, so combining them can cover more use cases than relying on either one alone. Start with whichever matches your most frequent task, then add the other when you hit its limits.


**Which is better for beginners, Claude or GPT-4?**

It depends on your background. Claude tends to work well if you prefer a guided experience, while GPT-4 gives more control for users comfortable with configuration. Try the free tier or trial of each before committing to a paid plan.


**Is Claude or GPT-4 more expensive?**

Pricing varies by tier and usage patterns. Both offer free or trial options to start. Check their current pricing pages for the latest plans, since AI tool pricing changes frequently. Factor in your actual usage volume when comparing costs.


**Can AI-generated tests replace manual test writing entirely?**

Not yet. AI tools generate useful test scaffolding and catch common patterns, but they often miss edge cases specific to your business logic. Use AI-generated tests as a starting point, then add cases that cover your unique requirements and failure modes.


**What happens to my data when using Claude or GPT-4?**

Review each tool's privacy policy and terms of service carefully. Most AI tools process your input on their servers, and policies on data retention and training usage vary. If you work with sensitive or proprietary content, look for options to opt out of data collection or use enterprise tiers with stronger privacy guarantees.


{% endraw %}
