---
layout: default
title: "How to Use AI for JWT Token Debugging"
description: "Learn how to use Claude and GPT-4 to debug malformed JWTs, expired tokens, wrong algorithm errors, and claim validation failures with code examples"
date: 2026-03-22
author: theluckystrike
permalink: /ai-for-jwt-token-debugging/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, troubleshooting, artificial-intelligence]
---

{% raw %}

JWT debugging is surprisingly painful. The error messages from JWT libraries are terse, the base64url encoding obscures the payload, and issues like algorithm confusion attacks or misconfigured JWKS URIs require deep framework knowledge. AI tools dramatically speed up diagnosis. This guide shows practical prompting patterns for common JWT failure modes.

## Common JWT Failure Categories

1. **Signature verification failures** — wrong secret, wrong algorithm, RS256/HS256 confusion
2. **Claim validation errors** — expired `exp`, wrong `iss`, wrong `aud`, `nbf` in the future
3. **Malformed tokens** — incorrect padding, encoding issues, truncated tokens
4. **Algorithm confusion attacks** — RS256 public key used as HS256 secret
5. **JWKS endpoint issues** — key rotation failures, kid mismatch, network errors

## Debugging Workflow

Always start by decoding the token. Never paste real production tokens — sanitize first.

```python
# decode_jwt.py — decode without verification for debugging
import base64
import json
import sys

def decode_jwt_parts(token: str) -> dict:
    """Decode JWT header and payload without signature verification."""
    parts = token.split('.')
    if len(parts) != 3:
        return {"error": f"Expected 3 parts, got {len(parts)}"}

    def decode_part(part: str) -> dict:
        # Fix base64url padding
        padding = 4 - len(part) % 4
        if padding != 4:
            part += '=' * padding
        decoded = base64.urlsafe_b64decode(part)
        return json.loads(decoded)

    return {
        "header": decode_part(parts[0]),
        "payload": decode_part(parts[1]),
        "signature_length": len(parts[2]),
    }

if __name__ == "__main__":
    token = sys.argv[1] if len(sys.argv) > 1 else input("Paste token: ").strip()
    result = decode_jwt_parts(token)
    print(json.dumps(result, indent=2, default=str))
```

Run this first, then paste the output (never the raw token) to an AI tool for analysis.

## Prompting Claude for JWT Diagnosis

**Example scenario: Token rejected with "invalid signature"**

Decoded header:
```json
{ "alg": "HS256", "typ": "JWT" }
```

Decoded payload:
```json
{
  "sub": "user_123",
  "iss": "https://auth.example.com",
  "aud": "api.example.com",
  "exp": 1742000000,
  "iat": 1741996400
}
```

**Prompt:**

```
JWT is being rejected with "invalid signature" by my Node.js Express app using
the `jsonwebtoken` library. The token was issued by Auth0.

Header: {"alg": "HS256", "typ": "JWT"}
Payload: [decoded payload above]

My verification code:
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

The JWT_SECRET env var is set to our Auth0 Application Client Secret.
What are the likely causes?
```

**Claude's diagnosis:**

Claude identifies this immediately as an algorithm mismatch issue: Auth0 issues RS256 tokens (asymmetric) by default for APIs, not HS256 (symmetric). The `HS256` in the header likely means the token was generated with a different configuration or the client secret is being passed where a public key is required.

Claude's suggested fix:

```javascript
// Option 1: Fetch Auth0's JWKS and use RS256
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const client = jwksClient({
  jwksUri: `https://YOUR_AUTH0_DOMAIN/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

jwt.verify(token, getKey, { algorithms: ['RS256'], audience: 'api.example.com' }, (err, decoded) => {
  if (err) console.error('Verification failed:', err.message);
  else console.log('Decoded:', decoded);
});

// Option 2: If you actually want HS256, change Auth0 API settings
// Auth0 Dashboard → APIs → Your API → Settings → Token Signing Algorithm → HS256
// Then use the API identifier's client secret, NOT the application secret
```

## Algorithm Confusion Attack Debugging

This is a real security issue. Claude handles it precisely:

**Prompt:** "I'm seeing tokens succeed verification that shouldn't. My server uses RS256. Could an attacker be exploiting algorithm confusion?"

**Claude's explanation and mitigation:**

```javascript
// VULNERABLE: Not explicitly specifying algorithms
jwt.verify(token, publicKey); // Attacker can send HS256 token signed with publicKey as HMAC secret

// SECURE: Always specify allowed algorithms
jwt.verify(token, publicKey, { algorithms: ['RS256'] });

// Also validate the alg header explicitly before verification
function verifyTokenSecurely(token: string, publicKey: string): JwtPayload {
  const header = JSON.parse(
    Buffer.from(token.split('.')[0], 'base64url').toString()
  );

  if (header.alg !== 'RS256') {
    throw new Error(`Rejected: unexpected algorithm ${header.alg}`);
  }

  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  }) as JwtPayload;
}
```

## JWKS Key Rotation Debugging

A common production issue: JWKS key rotation causes sudden 401s.

```python
# jwks_debugger.py — check if kid matches any key in JWKS endpoint
import requests
import base64
import json
import sys

def debug_jwks_mismatch(token: str, jwks_uri: str) -> None:
    # Decode header
    header_b64 = token.split('.')[0]
    padding = 4 - len(header_b64) % 4
    if padding != 4:
        header_b64 += '=' * padding
    header = json.loads(base64.urlsafe_b64decode(header_b64))

    token_kid = header.get('kid')
    token_alg = header.get('alg')
    print(f"Token kid: {token_kid}, alg: {token_alg}")

    # Fetch JWKS
    resp = requests.get(jwks_uri, timeout=10)
    resp.raise_for_status()
    jwks = resp.json()

    available_kids = [key.get('kid') for key in jwks.get('keys', [])]
    print(f"Available kids in JWKS: {available_kids}")

    if token_kid in available_kids:
        print("OK: kid found in JWKS")
    else:
        print(f"MISMATCH: kid '{token_kid}' not found in JWKS endpoint")
        print("This means the token was signed with a key that has been rotated out.")
        print("Action: Re-issue the token or check if JWKS caching is stale.")

if __name__ == "__main__":
    debug_jwks_mismatch(sys.argv[1], sys.argv[2])
```

Paste this script + the output to Claude:

```
Running this script gave:
Token kid: abc123
Available kids in JWKS: [xyz789, def456]
MISMATCH: kid 'abc123' not found

This is a production API. Users are getting 401s after a deploy. What happened and how do I fix it?
```

Claude will identify this as a key rotation without cache invalidation and provide the mitigation: extend JWKS cache TTL but add an explicit re-fetch on `kid` mismatch, then force re-auth for affected sessions.

## Debugging Clock Skew and Expiry Issues

Clock skew between services causes intermittent `jwt expired` and `jwt not active` errors that are hard to reproduce. Claude generates a diagnostic script:

```python
# check_jwt_timing.py — analyze exp/iat/nbf claims against current time
import base64
import json
import sys
import time
from datetime import datetime, timezone

def analyze_jwt_timing(token: str) -> None:
    parts = token.split('.')
    padding = 4 - len(parts[1]) % 4
    if padding != 4:
        parts[1] += '=' * padding

    payload = json.loads(base64.urlsafe_b64decode(parts[1]))
    now = time.time()

    print(f"Current server time: {datetime.fromtimestamp(now, tz=timezone.utc).isoformat()}")
    print(f"Current unix ts:     {now:.0f}")
    print()

    for claim in ['iat', 'exp', 'nbf']:
        if claim in payload:
            ts = payload[claim]
            dt = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
            delta = ts - now
            status = ""
            if claim == 'exp':
                status = "EXPIRED" if delta < 0 else f"expires in {delta:.0f}s"
            elif claim == 'nbf':
                status = "NOT YET VALID" if delta > 0 else "valid"
            elif claim == 'iat':
                status = f"issued {abs(delta):.0f}s {'ago' if delta < 0 else 'in the future (clock skew!)'}"
            print(f"{claim}: {ts} ({dt}) — {status}")

if __name__ == "__main__":
    token = sys.argv[1] if len(sys.argv) > 1 else input("Paste token: ").strip()
    analyze_jwt_timing(token)
```

When `iat` is in the future by more than a second or two, that indicates the issuing server's clock is ahead of the validating server. The fix is NTP sync, but the short-term workaround is adding a `clockTolerance` option:

```javascript
// jsonwebtoken: allow up to 30 seconds of clock skew
jwt.verify(token, secret, {
  algorithms: ['RS256'],
  clockTolerance: 30,  // seconds
});
```

## Claim Validation Errors Reference

Claude can generate a debugging checklist when you describe validation error patterns:

| Error | Common Cause | AI-Generated Fix |
|---|---|---|
| `jwt expired` | `exp` in past | Check server clock sync (NTP); add clock skew tolerance |
| `jwt not active` | `nbf` in future | Clock skew between issuer and verifier |
| `invalid audience` | `aud` mismatch | Pass correct `audience` option to verify() |
| `invalid issuer` | `iss` mismatch | Check env var for issuer URL (trailing slash matters) |
| `invalid signature` | Wrong secret/key | Verify you're using correct key type for alg |
| `jwt malformed` | Bad base64 encoding | Check for URL encoding of `.` or `+` in token |

## Writing JWT Middleware Tests

Claude generates parameterized test cases that cover the full error surface:

```typescript
// jwt.middleware.test.ts
import jwt from 'jsonwebtoken';
import { verifyTokenSecurely } from './jwt-middleware';

const RSA_PRIVATE = `-----BEGIN RSA PRIVATE KEY-----
... (test key, not production) ...
-----END RSA PRIVATE KEY-----`;

const RSA_PUBLIC = `-----BEGIN PUBLIC KEY-----
... (test key, not production) ...
-----END PUBLIC KEY-----`;

describe('JWT middleware', () => {
  it('rejects tokens with unexpected algorithm', () => {
    // Sign with HS256 using the public key bytes (confusion attack simulation)
    const maliciousToken = jwt.sign({ sub: 'attacker' }, RSA_PUBLIC, {
      algorithm: 'HS256',
    });
    expect(() => verifyTokenSecurely(maliciousToken, RSA_PUBLIC)).toThrow(
      'Rejected: unexpected algorithm HS256'
    );
  });

  it('rejects expired tokens', () => {
    const expiredToken = jwt.sign({ sub: 'user_123' }, RSA_PRIVATE, {
      algorithm: 'RS256',
      expiresIn: '-1s',  // already expired
    });
    expect(() => verifyTokenSecurely(expiredToken, RSA_PUBLIC)).toThrow('jwt expired');
  });

  it('rejects tokens with wrong issuer', () => {
    const wrongIssuerToken = jwt.sign({ sub: 'user_123', iss: 'https://evil.com' }, RSA_PRIVATE, {
      algorithm: 'RS256',
    });
    expect(() => verifyTokenSecurely(wrongIssuerToken, RSA_PUBLIC)).toThrow('invalid issuer');
  });

  it('accepts valid tokens', () => {
    const validToken = jwt.sign({ sub: 'user_123' }, RSA_PRIVATE, {
      algorithm: 'RS256',
      expiresIn: '1h',
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });
    const decoded = verifyTokenSecurely(validToken, RSA_PUBLIC);
    expect(decoded.sub).toBe('user_123');
  });
});
```

AI tools excel at generating these edge case tests because algorithm confusion and clock skew issues are well-documented attack patterns in security literature. Claude consistently includes the algorithm confusion test; GPT-4o sometimes omits it.

## Related Reading

- [How to Use AI to Debug Segmentation Faults in C and C++ Programs](/ai-tools-compared/how-to-use-ai-to-debug-segmentation-faults-in-c-and-cpp-prog/)
- [AI Assistants for Writing Correct AWS IAM Policies with Least Privilege](/ai-tools-compared/ai-assistants-for-writing-correct-aws-iam-policies-with-least-privilege/)
- [AI Tools for Automated SSL/TLS Configuration](/ai-tools-compared/ai-tools-automated-ssl-tls-config/)
- [AI Debugging Assistants Compared 2026](/ai-tools-compared/ai-debugging-assistants-compared-2026/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
