# Project Brief and Roadmap

This document is the project single source of truth for continuing work after context compression, window changes, or long breaks. Read it before planning or implementing a new round.

## One-Sentence Definition

TraceMe Next is a personal travel-planning workbench that uses AI or mock generation to create structured travel-plan drafts, then helps the user plan, save, review versions, and share read-only trips.

## Current Product Positioning

- Stage: personal beta / feature-polish.
- Main line: personal travel-planning workbench.
- Current priority: make the existing personal workflow clearer, safer, and easier to use before adding external-data products or production operations work.
- Output promise: generated plans are planning drafts only. Tickets, opening hours, hotel prices, transport schedules, transport prices, weather, and other volatile information must be checked by the user before travel.

## What This Is Not

TraceMe Next is not currently:

- A formal production commercial service.
- A live ticket, hotel, transport, weather, map, or search product.
- An admin backend or operations console.
- An OTA, booking, payment, or reservation system.
- An authoritative itinerary guarantee tool.
- A productionization track for domain, HTTPS, reverse proxy, or public infrastructure work.

Current personal beta workbench acceptance baseline: [docs/18-current-workbench-acceptance.md](18-current-workbench-acceptance.md).

## Implemented Capabilities

- Travel-plan generation through `POST /api/travel-plans/generate`, with `mock` and `openai-compatible` provider modes.
- Current request/result contract from `src/lib/schemas/trip.ts`: `GenerateTripPlanRequestSchema` and `TripPlanSchema`. Older names such as `travelStyle`, `specialRequests`, and `verificationItems` are historical references only, not the current contract.
- Plan comparison through `POST /api/travel-plans/compare` after a main plan exists.
- Result export through copy full text, Markdown download, and browser print/save PDF.
- Server-side account/auth boundary and safe current-user summary when Auth and database variables are configured.
- Manual save of generated plans, protected "my trips" list, and protected trip detail.
- Version history, version detail, append-version behavior, and restore from historical versions.
- Owner-created fixed-version share links, safe share-list summaries, revoke behavior, and public read-only share pages.
- Owner-scoped saved-trip soft delete, recently deleted list, and restore-deleted UI/API flow.
- Sensitive response boundaries that avoid returning secrets, raw provider data, token hashes, SQL details, stack traces, or connection strings.

## Not Implemented Yet

- One-click undo toast beyond the current recently deleted restore flow.
- Hard-delete retention job, account deletion workflow, or permanent deletion policy.
- Admin backend.
- Maps, weather, enhanced web search, live ticket/hotel/transport/weather data, or provider-backed external-data workflows.
- User settings, data statistics, analytics, richer permissions, or multi-user collaboration.
- Server-side or precision-layout PDF export.
- Preproduction rehearsal, domain setup, HTTPS setup, reverse proxy setup, or commercial release work.

## Short-Term Priorities

1. Polish the existing personal workbench flow: empty states, loading states, unauthenticated states, save success, restore, revoke, and unavailable-share states.
2. Recommended next step: stabilize the completed owner-only delete / recently deleted / restore-deleted flow with clearer empty/error states and optional honest undo affordances.
3. Keep deletion behavior soft-delete first, with confirmation, generic unavailable states, and clear wording that recently deleted trips can be restored within the server-enforced window.
4. Keep share safety conservative: deleting a trip makes old public share links unavailable, and restoring a deleted trip should require creating a new share link.

## Deferred Directions

Defer the following until the personal beta workflow is clearer and safer:

- Preproduction, formal production switch, domain, HTTPS, reverse proxy, and public infrastructure work.
- Admin backend implementation.
- Maps, weather, enhanced search, live pricing, live booking, and other third-party data features.
- Commercial release, payment, OTA-style booking, or operational analytics.
- Hard-delete retention, account deletion, and complex permission models until their product and privacy policies are documented.

## Development Rules For Each Round

- Read this document, `docs/08-project-state.md`, and any relevant topic document before planning or coding.
- Do only the current round's stated goal.
- Do not add adjacent features just because the code is nearby.
- Record scope boundaries before or while implementing.
- Keep public API, schema, database, environment-variable, and UI behavior unchanged unless the round explicitly asks for those changes.
- After verification, update `docs/08-project-state.md` with what changed, what did not change, and command results.
- If checks fail, record the failing command and concise error summary before expanding scope.

## Sensitive Information Rules

Never record or expose real sensitive values in docs, source, tests, logs, UI, API responses, or final reports.

Do not expose:

- Real server IPs, real domains, or private infrastructure addresses.
- API keys, OAuth secrets, Auth secrets, session tokens, bearer tokens, authorization header values, or raw share tokens.
- Database URLs, connection strings, passwords, SQL details, token hashes, provider endpoints, provider credentials, or raw provider responses.
- Stack traces or internal implementation details in user-facing errors.

Use placeholders such as `[预生产域名]`, `[本地验证 URL]`, `[真实 AI Provider]`, and empty environment-variable names when documentation needs to mention configuration.

## Recommended Next Step

Next recommended implementation round: personal-workbench polish after the completed delete / restore-deleted UI.

Use `docs/14-delete-restore-design.md` as the deletion safety reference. Keep the UI owner-only, confirmation-based, soft-delete first, and conservative about public share reactivation. Do not add hard delete, admin, maps, weather, search, productionization, or complex permissions as part of that polish round.
