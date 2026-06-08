# Account, Saved History, and Version History Design

## Current Boundary

TraceMe Next is currently a travel plan draft generation MVP. It does not have a database, user login, saved history, version history, rollback, or account workspace.

This is intentional. The MVP first validates the generation loop: user input, server-side AI generation, `TripPlanSchema` validation, result display, Markdown export, and browser print/save-PDF. Adding account and storage too early would increase privacy, security, migration, backup, and operations work before the core travel plan contract is stable.

The existing `POST /api/travel-plans/generate` behavior must remain unchanged. It should continue returning a generated `TripPlan` for the current request only. Future saved-history APIs will sit beside it instead of changing its request or response contract.

## Why Accounts and History Are Needed Later

After the generated plan experience is stable, accounts and persistence become necessary for:

- Saving generated plans across sessions and devices.
- Listing past plans without relying on browser state.
- Opening a saved plan detail page from history.
- Creating a new version after regeneration, comparison, or manual adjustment.
- Restoring a previous version without losing the newer timeline.
- Enforcing that each user can only access their own plans.
- Supporting deletion, backup, and later privacy controls.

The storage model should save the full `TripPlan` JSON snapshot and also extract a small set of metadata for fast list views. Persistent database fields must not be added to `TripPlanSchema`; `TripPlanSchema` remains the generation-result contract.

## Core User Flows

- Login required for history: unauthenticated users can still generate a one-off draft, but cannot save or view account history.
- Save current plan: after generation, a logged-in user saves the current `TripPlan` into history. The system creates a `TripPlanRecord` and the first `TripPlanVersion`.
- View history: the user opens a list of their non-deleted plans, sorted by recent update time.
- Open detail: the user opens one saved plan and sees the current version snapshot.
- Save new version: when the user generates or edits a replacement plan later, the system appends a new version under the same record.
- View versions: the user sees version numbers, creation times, optional notes, and which version is current.
- Restore version: restoring an older version creates a new version copied from that snapshot, then points the record to the new version.
- Delete plan: first-phase deletion is soft delete. Deleted records disappear from normal history and can later be hard-deleted by a separate retention policy.

## Data Model Draft

### `User`

Purpose: stores the local account identity used for ownership checks.

Key fields:

- `id`: stable internal user id.
- `email`: normalized login email when available; unique if the selected login method supports email.
- `displayName`: optional user-facing name.
- `avatarUrl`: optional profile image URL.
- `authProvider`: login provider identifier, such as email or an external identity provider.
- `createdAt`: account creation timestamp.
- `updatedAt`: latest account metadata update timestamp.
- `lastLoginAt`: latest successful login timestamp.
- `deletedAt`: soft-delete timestamp for account deletion workflows.

### `TripPlanRecord`

Purpose: one saved travel plan entry shown in the user history list.

Key fields:

- `id`: stable plan record id.
- `userId`: owner id; required on every query and mutation.
- `title`: list/detail title, usually derived from destination and date range.
- `destination`: copied from `tripPlanSnapshot.input.destination`.
- `startDate`: copied from `tripPlanSnapshot.input.startDate`.
- `endDate`: copied from `tripPlanSnapshot.input.endDate`.
- `travelers`: copied from `tripPlanSnapshot.input.travelers`.
- `budgetAmount`: copied from `tripPlanSnapshot.input.budget.amount`.
- `budgetCurrency`: copied from `tripPlanSnapshot.input.budget.currency`.
- `budgetScope`: copied from `tripPlanSnapshot.input.budget.scope`.
- `currentVersionId`: points to the version currently shown by default.
- `createdAt`: first saved timestamp.
- `updatedAt`: latest version or metadata update timestamp.
- `deletedAt`: soft-delete timestamp; normal list APIs exclude rows where this is set.

### `TripPlanVersion`

Purpose: immutable saved snapshot for one version of a plan.

Key fields:

- `id`: stable version id.
- `tripPlanRecordId`: parent saved plan id.
- `userId`: duplicated owner id for simpler scoped queries and defense in depth.
- `versionNumber`: monotonically increasing integer within one `TripPlanRecord`.
- `tripPlanSnapshot`: full `TripPlan` JSON snapshot that must validate against the current compatible `TripPlanSchema` when saved.
- `sourceProvider`: copied from `tripPlanSnapshot.source.provider`.
- `sourceKind`: copied from `tripPlanSnapshot.source.kind`.
- `generatedAt`: copied from `tripPlanSnapshot.generatedAt`.
- `createdAt`: version save timestamp.
- `restoreFromVersionId`: set only when this version was created by restoring an older version.
- `note`: optional short user/system note such as "initial save" or "restored from version 2".

### Optional `TripPlanShare` / `ShareLink`

Purpose: possible future read-only sharing record. This should not be included in the first account-history implementation by default.

Key fields:

- `id`: stable share record id.
- `tripPlanRecordId`: shared plan id.
- `userId`: owner who created the link.
- `tokenHash`: hashed link token; never store raw share tokens.
- `scope`: read-only access scope.
- `expiresAt`: optional expiration timestamp.
- `revokedAt`: timestamp for manual revocation.
- `createdAt`: share creation timestamp.

First phase recommendation: do not implement sharing. Public links increase privacy, abuse, indexing, and support risk. If added later, links must be unguessable, revocable, expirable, read-only, and clearly labeled as exposing a travel draft to anyone with the link.

## API Draft

All saved-history APIs require a logged-in user. Every query and mutation must be scoped by the current `userId`; users can only see and modify their own records.

### `POST /api/travel-plans/save`

Purpose: save a generated `TripPlan` snapshot as a new history record.

Request draft:

- `tripPlan`: full `TripPlan` JSON snapshot.
- `title`: optional custom title.
- `note`: optional version note.

Behavior:

- Validate login.
- Validate `tripPlan` with `TripPlanSchema`.
- Create `TripPlanRecord`.
- Create first `TripPlanVersion` with `versionNumber = 1`.
- Set `TripPlanRecord.currentVersionId` to the first version.
- Return record summary and current version summary.

### `GET /api/travel-plans`

Purpose: list the current user's saved plans.

Behavior:

- Validate login.
- Return only rows where `TripPlanRecord.userId` equals the current user and `deletedAt` is empty.
- Return list metadata and current version summary, not every historical snapshot.
- Default sort: `updatedAt` descending.

### `GET /api/travel-plans/:id`

Purpose: read one saved plan detail.

Behavior:

- Validate login.
- Fetch only where `id` and `userId` both match and `deletedAt` is empty.
- Return record metadata, current version snapshot, and a compact version list.

### `POST /api/travel-plans/:id/versions`

Purpose: append a new snapshot version to an existing saved plan.

Request draft:

- `tripPlan`: full `TripPlan` JSON snapshot.
- `note`: optional version note.

Behavior:

- Validate login.
- Fetch parent record by `id` and current `userId`.
- Validate `tripPlan` with `TripPlanSchema`.
- Create next `TripPlanVersion` with `versionNumber = max + 1`.
- Update `currentVersionId` and `updatedAt`.
- Return updated record and new current version summary.

### `POST /api/travel-plans/:id/restore`

Purpose: restore a previous version without mutating old versions.

Request draft:

- `versionId`: version to restore.
- `note`: optional restore note.

Behavior:

- Validate login.
- Fetch parent record and target version by current `userId`.
- Copy target `tripPlanSnapshot` into a new `TripPlanVersion`.
- Set `restoreFromVersionId` to the restored version id.
- Use the next version number.
- Point `currentVersionId` to the new restored version.
- Return updated record and restored current version summary.

## Permission and Deletion Rules

- Ownership is mandatory: every saved-history query includes the current `userId`.
- A user cannot read, save a version to, restore, or delete another user's plan.
- Prefer returning "not found" for records outside the user boundary to avoid confirming another record exists.
- Soft delete is the first-phase behavior for plans: set `TripPlanRecord.deletedAt`, hide from normal list/detail APIs, and leave versions intact for retention and recovery policy.
- Account deletion needs a separate product and compliance decision: either soft-delete the user first and queue later cleanup, or hard-delete user-owned plans after a defined retention window.
- Hard delete, export, retention windows, and recovery tooling should be designed before broader public launch.

## Relationship to `TripPlanSchema`

The saved version stores a full `TripPlan` JSON snapshot. This preserves the exact generated draft as seen by the user and avoids spreading travel-plan fields across many relational tables too early.

Recommended rule:

- `TripPlanSchema` continues to define the generated content contract.
- `TripPlanRecord` stores searchable/list metadata derived from the snapshot.
- `TripPlanVersion.tripPlanSnapshot` stores the full snapshot.
- Database ids, owner ids, version ids, deletion markers, and sharing state do not enter `TripPlanSchema`.
- Future schema evolution should keep old snapshots readable. If a breaking `TripPlan` shape is introduced, add a snapshot schema version and migration/read adapter before changing persistence.

## Migration and Deployment Notes

- Introduce migrations before enabling history APIs in production.
- Create tables in a reversible migration order: users, plan records, plan versions, optional share links later.
- Add indexes for `TripPlanRecord.userId + updatedAt`, `TripPlanRecord.userId + deletedAt`, `TripPlanVersion.tripPlanRecordId + versionNumber`, and `TripPlanVersion.userId`.
- Keep database connection settings server-only and out of browser-visible variables.
- Backups must be configured before enabling real user storage.
- Rollout should start with a small internal or beta group and mock/generated plans only.
- Existing no-login users will not have historical data to migrate because current versions do not persist results.
- Docker deployment needs a clear volume or managed database story before storage is enabled.

## Technology Route Candidates

### Self-Hosted PostgreSQL + Login Service

Best for long-term control and standard relational modeling. PostgreSQL fits JSON snapshots, transactional version creation, indexes, and future reporting.

Trade-offs: the team owns database upgrades, backups, monitoring, credential rotation, restore drills, and login security integration.

### Managed Database and Login

Best for moving faster with built-in account, session, migration, backup, and admin tooling.

Trade-offs: vendor lock-in, pricing growth, regional availability, data export, and framework integration need review before choosing.

### SQLite or Local-File Storage

Good for local prototypes and single-process demos.

Not recommended for the current Docker beta account-history path. It complicates multi-instance deployment, persistent volumes, backups, concurrency, and server migration. It can be used only as a disposable local spike, not as the main saved-history architecture.

## Recommended Next Round

Next round should build the minimum database skeleton before login UI:

- Pick the database route.
- Add migration structure and empty connection boundary.
- Define tables and types for `User`, `TripPlanRecord`, and `TripPlanVersion`.
- Add repository interfaces with tests around owner scoping and version numbering.
- Keep all routes behind non-public implementation boundaries until login is ready.

Reason: data ownership, version creation, and rollback rules are the foundation. Establishing the persistence boundary first reduces the chance that login integration must be reworked around unclear storage rules.

## Risks

- Data privacy: travel plans contain destinations, dates, budgets, and preference signals.
- Cost: persistent storage, backups, managed login, and higher AI usage can compound.
- Backup and restore: history is only valuable if restore drills work.
- Deletion expectations: soft delete, hard delete, account deletion, and retention must be clear.
- Login failure: expired sessions or identity-provider changes can block users from their saved plans.
- Permission scoping bugs: missing `userId` filters can leak another user's travel history.
- Schema drift: future `TripPlanSchema` changes can make old snapshots hard to read.
- Sharing risk: public links can expose private travel intent if introduced too early.
