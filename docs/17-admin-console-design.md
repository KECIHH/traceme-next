# Admin Console Design - TraceMe Next

## Current Status

**TraceMe Next does not currently implement an admin console.** This document is a design reference only for potential future admin diagnostics and operations needs.

## Why Not Implement Admin Now

### Reasons to Defer

1. **Current stage is personal beta / feature-polish.** The priority is making the existing personal workflow clearer, safer, and easier to use. Admin tooling is operational overhead that does not directly improve the user-facing product.

2. **Small user base and controlled environment.** During personal beta, direct database queries, log inspection, and manual migration checks remain acceptable for diagnostics. An admin UI adds attack surface without proportional benefit at this scale.

3. **Risk of premature complexity.** Building admin before the core product stabilizes can lead to maintaining two surfaces instead of one. Admin requirements become clearer after production patterns emerge.

4. **Information leakage risk.** Admin surfaces that show too much detail can accidentally expose secrets, connection strings, raw tokens, session data, or user privacy boundaries. Conservative read-only diagnostics require careful design.

5. **Operational maturity gap.** Admin is most useful when combined with alerting, audit logs, backup verification, and incident response playbooks. Building UI without these foundations creates incomplete coverage.

### What Requires Admin in Personal Projects

Most personal projects **never need a formal admin backend**. Direct access to:
- Database console or SQL client
- Server logs and application logs
- Environment variable inspection
- Migration status checks

...is often sufficient and safer than exposing the same information through a web UI.

Admin becomes valuable when:
- Multiple operators need safe read-only diagnostics without direct database/server access.
- Routine checks (migration status, provider health, error summaries) are frequent enough to justify automation.
- The project transitions from personal beta to shared service with more than one maintainer.

## Minimum Admin Goals (If Implemented)

If an admin console is eventually built for TraceMe Next, the first phase should be **read-only diagnostics only**, focused on:

### 1. System Health
- Application version and build timestamp
- Database connectivity status (reachable / unreachable, not connection string)
- Auth provider status (configured / not configured, not secrets)
- Required table presence summary
- Migration status (which files applied, which pending, not SQL content)

### 2. Provider Status
- Which AI provider is configured (`mock` / `openai-compatible` / etc.)
- Whether required environment variables are set (yes/no, not the values)
- Recent generation success/failure rate (count only, not raw responses)

### 3. Usage Summary (Non-Sensitive Aggregates Only)
- Total registered users (count)
- Total saved trips (count)
- Total trip versions (count)
- Total active share links (count)
- Generation requests in last 24h / 7d / 30d (count)

### 4. Error Summary (Safe Aggregates Only)
- Recent error codes and counts (e.g., `PROVIDER_ERROR: 3`, `VALIDATION_ERROR: 1`)
- Error request IDs for correlation (not stack traces)
- Timestamp of last error by type

### What Should NOT Be Shown

An admin console must never display:

- `DATABASE_URL`, connection strings, or host/port details
- `AUTH_SECRET`, `AUTH_URL`, OAuth client secrets, or OAuth provider tokens
- AI API keys or provider endpoint URLs
- Session tokens, bearer tokens, or authorization header values
- Share link tokens or `tokenHash` values
- User email addresses in full (aggregate counts or redacted summaries only)
- Raw AI prompts or raw AI responses
- SQL query text or database schema details beyond table presence
- Stack traces or internal implementation details
- Owner `userId` or record `id` values in user-facing error messages

## Permission Model Draft

### Admin User Identification

Do not use "any logged-in OAuth user automatically becomes admin." This creates accidental privilege escalation.

Recommended approaches:

#### Option A: Admin Allowlist (Simplest)
- Define an `ADMIN_EMAILS` environment variable with a comma-separated list of allowed admin email addresses.
- Server-side admin gate checks `await getCurrentUser()` and compares `user.email` against the allowlist.
- Allowlist changes require server restart or config reload.

Example:
```bash
ADMIN_EMAILS="owner@example.com,ops@example.com"
```

#### Option B: Database Role Flag
- Add `role` column to `users` table with values `user` / `admin`.
- Admin flag must be set manually through direct database access or a separate secure provisioning flow.
- Prevents accidental privilege grant through normal OAuth login.

#### Option C: Separate Admin Authentication
- Admin console uses a different authentication mechanism (e.g., separate admin password or IP allowlist).
- More secure, but adds operational complexity.

**Recommendation for personal projects:** Start with Option A (allowlist). It is the simplest and avoids accidental admin role grants during normal user login.

### Admin Session Boundary

- Admin pages and APIs must require both:
  1. Valid authenticated session (via `requireCurrentUser()`)
  2. Admin privilege check (via `requireAdmin()` helper)

- Unauthorized admin access returns `403 FORBIDDEN`, not `404 NOT_FOUND`, to distinguish privilege failure from missing resources.

- Admin operations should be logged separately from normal user operations for audit purposes.

## API Draft (Read-Only First Phase)

### `GET /api/admin/health`
**Auth:** Requires admin session.

**Response:**
```json
{
  "ok": true,
  "data": {
    "appVersion": "1.0.0-beta",
    "buildTimestamp": "2026-06-12T10:30:00Z",
    "databaseConnected": true,
    "authConfigured": true,
    "requiredTablesPresent": true
  }
}
```

### `GET /api/admin/migrations`
**Auth:** Requires admin session.

**Response:**
```json
{
  "ok": true,
  "data": {
    "applied": [
      { "filename": "0001_account_history_skeleton.sql", "appliedAt": "2026-06-09T08:00:00Z" },
      { "filename": "0002_auth_session_boundary.sql", "appliedAt": "2026-06-09T08:00:10Z" },
      { "filename": "0003_trip_plan_shares.sql", "appliedAt": "2026-06-10T09:15:00Z" }
    ],
    "pending": []
  }
}
```

Does not return SQL content, connection strings, or migration error stack traces.

### `GET /api/admin/provider-status`
**Auth:** Requires admin session.

**Response:**
```json
{
  "ok": true,
  "data": {
    "provider": "openai-compatible",
    "configured": true,
    "recentSuccessRate": {
      "last24h": { "total": 15, "success": 14, "failure": 1 },
      "last7d": { "total": 120, "success": 118, "failure": 2 }
    }
  }
}
```

Does not return API keys, endpoint URLs, model names, or raw provider responses.

### `GET /api/admin/usage-summary`
**Auth:** Requires admin session.

**Response:**
```json
{
  "ok": true,
  "data": {
    "users": { "total": 3 },
    "trips": { "total": 12, "deleted": 2 },
    "versions": { "total": 18 },
    "shares": { "active": 5, "revoked": 1 },
    "generations": {
      "last24h": 8,
      "last7d": 45,
      "last30d": 150
    }
  }
}
```

Does not return user emails, trip titles, or record IDs.

### `GET /api/admin/error-summary`
**Auth:** Requires admin session.

**Response:**
```json
{
  "ok": true,
  "data": {
    "recentErrors": [
      {
        "code": "PROVIDER_ERROR",
        "count": 3,
        "lastOccurred": "2026-06-12T14:30:00Z",
        "sampleRequestId": "req_abc123"
      },
      {
        "code": "VALIDATION_ERROR",
        "count": 1,
        "lastOccurred": "2026-06-12T10:15:00Z",
        "sampleRequestId": "req_def456"
      }
    ]
  }
}
```

Does not return stack traces, SQL details, connection strings, or user-identifiable information.

## UI Draft (Read-Only Dashboard)

### Layout
- Simple single-page dashboard with collapsible sections
- No complex navigation or multi-page admin flows in first phase

### Sections

#### 1. System Status
- Database: ✓ Connected / ✗ Unreachable
- Auth: ✓ Configured / ⚠ Not Configured
- Migrations: ✓ Up to Date / ⚠ Pending
- Last checked: [timestamp]

#### 2. Provider Status
- Current provider: `openai-compatible`
- Configuration: ✓ Valid
- Recent success rate (24h): 14/15 (93%)

#### 3. Usage Summary
- Users: 3
- Saved trips: 12 (2 deleted)
- Active shares: 5
- Generations (7d): 45

#### 4. Recent Errors
- `PROVIDER_ERROR`: 3 occurrences, last at 2026-06-12 14:30
- Request ID: `req_abc123` (for log correlation)

### UI Safety
- No raw SQL, stack traces, connection strings, secrets, or user emails displayed
- Error details link to request ID only, not to stack trace expansion
- User counts are aggregates, not clickable lists

## Security Risks

### 1. Information Leakage
**Risk:** Admin surfaces accidentally expose secrets, tokens, connection strings, or user privacy details.

**Mitigation:**
- Design all admin responses to show only safe aggregates and status flags.
- Never pass raw environment variables to the client.
- Redact user emails (show counts only or first 3 chars + `***`).
- Do not display raw share tokens, `tokenHash`, or session tokens.

### 2. Privilege Escalation
**Risk:** Normal users gain admin access through misconfigured permission checks.

**Mitigation:**
- Admin allowlist or explicit role flag separate from normal OAuth login.
- Admin pages must check both authenticated session AND admin privilege.
- Log all admin access attempts (success and failure).

### 3. Unintended Modifications
**Risk:** Admin actions accidentally modify or delete user data.

**Mitigation:**
- First phase is **read-only diagnostics only**.
- Write operations (manual delete, force migration, reset provider) should be deferred until audit logging and confirmation flows are designed.
- Any future write action requires confirmation prompt and logs the operator email.

### 4. Expanded Attack Surface
**Risk:** Admin endpoints become new targets for reconnaissance or exploitation.

**Mitigation:**
- Rate-limit admin endpoints separately from user endpoints.
- Consider IP allowlist for admin routes if operators are known and static.
- Admin endpoints must fail closed: missing `ADMIN_EMAILS` = no admin access.

### 5. Accidental Production Impact
**Risk:** Admin diagnostics query expensive aggregates or lock tables during peak usage.

**Mitigation:**
- Use summary tables or cached counts instead of live `COUNT(*)` on large tables.
- Separate admin query timeouts from normal user query timeouts.
- Consider read replicas for admin diagnostics if database load becomes a concern.

## Recommended Implementation Order

Do not implement the admin console in the immediate next round. Continue personal workflow polish first, especially empty states, error recovery, clearer confirmations, and polish around the already implemented delete / recently deleted / restore-deleted flow.

When admin becomes necessary, follow this order:

### Phase 0: Design First (Current Document)
- Define what admin surface is actually needed.
- Document permission model and API drafts.
- Review security risks and mitigation strategies.
- Get user/owner approval before implementation.

### Phase 1: Admin Privilege Boundary
- Add `requireAdmin()` helper with allowlist or role check.
- Add automated tests for admin gate behavior.
- No admin UI or API routes yet.

### Phase 2: Read-Only Health Check
- Implement `GET /api/admin/health` only.
- Return safe status flags (database connected, auth configured, migrations applied).
- Add admin UI shell with single "System Health" section.
- Verify no secrets, connection strings, or sensitive details are exposed.

### Phase 3: Expand Diagnostics
- Add `GET /api/admin/migrations` for migration status.
- Add `GET /api/admin/provider-status` for provider summary.
- Add `GET /api/admin/usage-summary` for safe aggregate counts.
- Add `GET /api/admin/error-summary` for recent error codes.
- Expand admin UI with additional read-only sections.

### Phase 4: (Deferred) Write Operations
- Only after read-only diagnostics prove stable and useful.
- Requires audit logging, confirmation prompts, and operator accountability.
- Examples: manual trip deletion, force migration apply, provider config validation.

## Alternative: No Admin UI

For many personal projects, **the best admin console is no admin console.**

Instead, maintain:
- Direct database access for the project owner
- Server log inspection via SSH or container logs
- Manual migration scripts with dry-run mode
- Documented SQL queries for common diagnostics

This approach:
- Has zero attack surface from admin web UI
- Requires no admin authentication complexity
- Avoids accidental information leakage
- Keeps operational knowledge in runbooks instead of bespoke UI

Admin UI becomes valuable only when:
- There are multiple operators who need safe diagnostics without database access
- Diagnostic checks are frequent enough to justify UI investment
- The project scales beyond personal/small-team use

## Next Steps

1. **Do not implement admin console in Round 46.** This document is design reference only.

2. **Continue personal workflow polish first.** The delete / recently deleted / restore-deleted UI already exists; polish its empty states, error recovery, and confirmation wording before admin work.

3. **Revisit admin needs after personal beta stabilizes.** Admin requirements become clearer once production patterns, common failure modes, and operator workflows are established.

4. **Consider alternative to admin UI.** Direct database access, server logs, and manual scripts may remain sufficient for personal projects indefinitely.

5. **If admin is eventually needed, start with Phase 1 (privilege boundary) and Phase 2 (read-only health check only).** Do not build write operations or complex multi-page flows until diagnostics prove useful.

## Summary

- TraceMe Next does not currently implement an admin console and should defer it until personal workflow polish completes.
- If admin becomes necessary, the first phase should be read-only diagnostics: system health, migration status, provider status, safe usage aggregates, and error summaries.
- Admin surfaces must never expose secrets, connection strings, raw tokens, user emails, SQL details, or stack traces.
- Admin privilege requires explicit allowlist or role flag separate from normal OAuth login.
- The best admin console for many personal projects is no admin console—direct database access and server logs remain acceptable and safer at small scale.
