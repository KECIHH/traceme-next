# Worktree Handoff

This document is the handoff note for continuing personal-workbench work after context loss, review, or a new round. Read it with `docs/00-project-brief-and-roadmap.md`, `docs/08-project-state.md`, and any round-specific acceptance note before changing code.

## Current Branch Context

- Branch: `codex/round-41-workbench-acceptance`.
- Current product line: personal travel-planning workbench.
- Current verified workflow: generation, manual save, saved trips, trip detail, version history and restore, fixed-version share links, public read-only pages, soft delete, recently deleted, and restore-deleted.
- Current stage: personal beta / feature-polish, not productionization.

## Current Dirty-File Ownership

- Current Round 48 dirty docs should be documentation-only:
  - `docs/15-worktree-handoff.md` is this worktree handoff and dirty-file ownership note.
  - `docs/16-round-44-real-e2e-acceptance.md` carries the Round 45 controlled version-seed fallback for the Round 44 real-browser acceptance checklist.
  - `docs/17-admin-console-design.md` is a future admin-console design reference only; no admin implementation exists.
- `docs/08-project-state.md` is clean in the current Git state and should stay untouched unless a later request explicitly asks to record a new project-state entry.
- No source code, schema, migration, API route, UI component, provider, deployment script, or environment example file should be bundled into this follow-up unless a later user request explicitly changes scope.
- `.env` and `.env.local` must stay untracked and must not be committed.

## Round 45 Handoff

- Round 45 completed real Chrome manual acceptance with an authenticated `[测试账号]` session and `[测试数据库]`.
- The acceptance used placeholders only in docs: `[本地验证 URL]`, `[测试账号]`, `[测试数据库]`, and `[真实 AI Provider]`.
- Chrome automation could not execute the docs/16 same-origin append snippet directly because that control channel did not expose page `fetch` or `XMLHttpRequest`.
- The accepted fallback was to create the throwaway trip through authenticated Chrome UI, seed one additional version in `[测试数据库]`, then verify version list and restore behavior through real Chrome UI.
- The real-browser acceptance result and verification commands are recorded in `docs/08-project-state.md`.

## Scope Boundaries

- Do not add admin backend, maps, weather, search, live booking, payment, production deployment, domain, HTTPS, reverse proxy, hard delete, or server-side PDF behavior as part of this handoff.
- Do not record or expose real IPs, real domains, database URLs, Auth secrets, OAuth secrets, AI keys, session tokens, bearer/header values, raw share tokens, token hashes, owner email, provider endpoints, SQL details, or stack traces.
- If documentation needs environment, account, database, provider, or share-link context, use placeholders only.

## Recommended Next Step

- If continuing from Round 45, first confirm whether the current documentation-only dirty set should be committed or carried forward.
- For future real-browser acceptance rounds, prefer the docs/16 browser-console snippet when a human-controlled browser console is available; use the documented `[测试数据库]` fallback only for throwaway records and only when the browser automation control channel cannot run same-origin requests.
