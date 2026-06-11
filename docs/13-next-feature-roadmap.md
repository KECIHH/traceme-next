# Next Feature Roadmap - Personal Beta

## Current Stage

TraceMe Next is currently in a personal beta / feature-polish stage. The priority is to make the already implemented personal workflow clearer, safer, and easier to use before adding new third-party API features or production operations work.

`docs/12-production-ops-design.md` remains a future productionization reference. It is not the current main line for this stage.

This roadmap does not authorize preproduction rehearsal, formal production switch, real domain setup, HTTPS setup, reverse proxy work, admin implementation, maps, weather, enhanced search, or commercial release work.

## Implemented Capabilities

| Capability | Current state | Main remaining gap |
| --- | --- | --- |
| AI generation | `POST /api/travel-plans/generate` supports mock and `openai-compatible` provider modes, validates request/result shape, and labels volatile travel information for user verification. | More guided retry and clearer user recovery after provider or schema failures. |
| Plan comparison | `POST /api/travel-plans/compare` and the comparison panel generate lightweight variants and optimization suggestions after a main plan exists. | Better placement, clearer "reference only" copy, and possible save/version integration later. |
| Export | Result actions support copy full text, Markdown download, and browser print/save PDF. | No server-side or precision-layout PDF export. |
| Login | Auth.js boundary and account summary API exist when server-side Auth and database variables are configured. | More user-friendly unauthenticated states and settings entry are still absent. |
| Saved history | Logged-in users can manually save generated plans, list saved plans, and open protected detail pages. | No delete, undo, retention UI, bulk cleanup, or richer list filters. |
| Version history | Saved trip detail supports version listing and restore; restore creates a new current version without overwriting history. | No diff view, version notes editing, undo affordance, or compare-to-version flow. |
| Share links | Owners can create fixed-version links, copy the one-time share URL, list safe share summaries, revoke links, and use a public read-only share page. | No expiration controls, access statistics, password protection, or account-level sharing settings. |

## Unfinished Capability Priority

| Capability | User value | Complexity | Third-party API need | Fit for current personal stage | Recommendation |
| --- | --- | --- | --- | --- | --- |
| UX polish, delete, undo, and clearer confirmations | High | Low to medium | No | High | Do next. This improves trust in the current personal workflow without adding external dependencies. |
| Admin backend | Medium | Medium to high | No | Medium | Design next, but do not implement yet. Define what needs administration before building UI. |
| Maps | Medium | Medium to high | Usually yes | Low for now | Research only. Review provider cost, limits, attribution, and privacy before implementation. |
| Weather | Medium | Medium | Yes | Low for now | Research only. Any weather output must stay visibly time-sensitive and user-verified. |
| Search enhancement | Medium to high | High | Yes | Low for now | Research only. Needs source quality, quota, cost, citation, and prompt-boundary design. |
| Richer PDF / server-side export | Medium | Medium | No | Medium to low | Later. Useful after content layout stabilizes. |
| Data statistics | Low to medium | Medium | No | Low | Later. Avoid analytics before deletion/privacy expectations are clearer. |
| User settings | Medium | Medium | No | Medium | Later. Start only after the account workspace needs are concrete. |
| Finer permissions and deletion | High | Medium to high | No | High for delete basics, lower for complex permissions | Implement simple owner delete/undo before complex permission models. |

## Recommended Order

1. Polish the personal workflow first.
   - Improve empty, loading, error, unauthenticated, save-success, restore, revoke, and unavailable-share states.
   - Add a conservative saved-plan delete design before implementation: owner-only, soft delete first, confirmation required, and no hard delete until retention rules are documented.
   - Add undo only where it can be made honest and simple, such as recent soft-delete reversal or clearer restore/revoke recovery guidance.

2. Design the admin backend before building it.
   - Define what a personal project actually needs: safe read-only diagnostics, migration status, provider status, and non-sensitive account/history summaries.
   - Keep secrets, raw tokens, provider payloads, connection strings, SQL, and stack traces out of any future admin surface.
   - Do not implement the admin backend in the immediate next polish round.

3. Research maps, weather, and search enhancement.
   - Compare official API capabilities, price, quota, attribution, privacy, reliability, and regional availability before choosing providers.
   - Keep all outputs labeled as reference data requiring user confirmation.
   - Avoid making these services required for the core generation flow until fallback behavior is designed.

4. Expand exports, analytics, settings, and permissions later.
   - Consider richer PDF only after the result layout and saved-detail layout stabilize.
   - Consider analytics only after privacy, deletion, and retention expectations are documented.
   - Add user settings when there are concrete settings worth saving.
   - Add complex permissions only if the product direction moves beyond personal saved plans and public read-only links.

## Current Defaults

- The app remains a personal test version / beta workflow.
- Generated and compared plans remain planning drafts, not authoritative booking, weather, route, or price data.
- New external APIs should be research-only until their official docs, costs, limits, and privacy boundaries are reviewed.
- Sensitive values must remain placeholders in docs and logs.
- `docs/12-production-ops-design.md` is future reference, not the current execution plan.
