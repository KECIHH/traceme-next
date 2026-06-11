# Share Link Design

## Current Boundary

Round 36 update: this document started as the design for a future public read-only share feature. The first share-link loop is now implemented in the personal beta.

The current saved-trip capability is account-scoped: saved records, version history, version detail, version append, restore, owner share-link creation, share-link listing, and share-link revoke all require a logged-in user and owner-scoped access. Public shared-trip viewing is read-only and available only through a valid fixed-version share token.

This document now serves as design background plus a reference for later share extensions. Current gaps include expiration controls, access statistics, password-protected links, account-level sharing settings, abuse/reporting workflow, and more granular permissions. Existing `generate`, `compare`, `save`, history, versions, restore, share, and public-share APIs must keep their current behavior.

## Product Goal

The future share-link feature should let a logged-in owner create an unguessable public link that allows anyone with the link to view one saved `TripPlan` snapshot in read-only mode.

The public viewer does not need to log in. The public viewer must not be able to restore, edit, delete, append a version, save as the owner, inspect version history, or access owner-only account data. A shared page is a read-only presentation surface for a travel draft, not an ownership or collaboration surface.

## Share Target

Two target models are possible:

- Share current version: the link always resolves to the record's current version.
- Share fixed version: the link resolves to one specific `TripPlanVersion`.

Recommended first phase: share a fixed version. When a user creates a link without choosing a version, the server should bind the link to the record's current `currentVersionId` at creation time. If the owner later restores an older version or appends a newer version, old share links should keep showing the original shared snapshot.

Reasoning: fixed-version sharing is easier to explain, safer for privacy, and less surprising after restore. A later phase can add an explicit "follow current version" mode if users need living links.

## Data Model Draft

Future table/model name: `TripPlanShare` or `ShareLink`.

Suggested fields:

- `id`: stable internal share record id.
- `ownerUserId`: owner who created the share link.
- `tripPlanRecordId`: saved trip record being shared.
- `versionId`: optional target version id. First phase should set this to the shared fixed version.
- `tokenHash`: hash of the public token. Store only the hash, never the raw token.
- `tokenPreview`: optional short display suffix or prefix for owner-facing list views. It is not a credential and must not be enough to access the share.
- `status`: share state, such as `active` or `revoked`.
- `expiresAt`: optional expiration timestamp.
- `revokedAt`: timestamp set when the owner revokes the link.
- `createdAt`: creation timestamp.
- `updatedAt`: latest metadata update timestamp.
- `lastAccessedAt`: optional latest successful access timestamp.
- `accessCount`: optional successful access counter.

Suggested relational rules:

- `ownerUserId` should reference the owning user.
- `tripPlanRecordId` should reference the saved plan record.
- `versionId`, when present, should reference a version under the same record and owner.
- Queries that create, list, or revoke share links must include both record id and owner user id.
- The public token lookup should query by `tokenHash` and only return active, non-expired, non-revoked shares for non-deleted records.

## Token and Security Strategy

- Generate tokens with high randomness using server-side cryptographic randomness.
- Tokens must be long enough to be effectively unguessable and must not be sequential, UUID-only, or derived from record/user ids.
- Store only `tokenHash`; do not store raw tokens after returning the creation response.
- Return the raw public URL only once during creation. Later list responses should return only safe metadata and `tokenPreview`.
- Default state is private. A record is public only through an active, valid share link.
- Revocation must be available to the owner and must immediately prevent future access.
- Expiration should be optional in the first design, but the model should allow it.
- Public responses must not expose owner user id, owner email, internal owner metadata, database connection settings, auth secrets, OAuth secrets, API keys, bearer values, authorization header values, SQL, stack traces, or server internals.
- Logs and error responses should record only request ids and safe error codes, never raw tokens or secret values.

## API Draft

### `POST /api/travel-plans/[id]/share-links`

Purpose: create a new share link for the current user's saved trip record.

Authentication: required.

Owner rule: the record id must belong to the current user and must not be soft-deleted.

First-phase behavior:

- Resolve the record's current version.
- Create an active share bound to that fixed version.
- Return safe share metadata and the raw share URL once.
- Do not change the record, version, generation, compare, save, history, versions, or restore API behavior.

### `GET /api/travel-plans/[id]/share-links`

Purpose: list share links for the current user's saved trip record.

Authentication: required.

Response shape should include only safe owner-facing metadata:

- `id`
- `tokenPreview`
- `status`
- `versionId` or version summary
- `expiresAt`
- `revokedAt`
- `createdAt`
- `updatedAt`
- optional `lastAccessedAt`
- optional `accessCount`

It must not return raw tokens.

### `PATCH /api/travel-plans/[id]/share-links/[shareId]`

Purpose: revoke a share link.

Authentication: required.

Recommended first-phase revoke route: use `PATCH` to set `status = revoked` and `revokedAt = now()`. This keeps an audit trail and avoids ambiguity between "never existed" and "was revoked".

Alternative: `DELETE /api/travel-plans/[id]/share-links/[shareId]` can be used as an API facade, but it should still perform a soft revoke internally rather than hard delete in the first phase.

### `GET /api/shared/trips/[token]`

Purpose: public read-only access to a shared trip snapshot.

Authentication: not required.

Behavior:

- Hash the provided token server-side.
- Look up an active, non-expired, non-revoked share.
- Ensure the parent record is not soft-deleted.
- Resolve the fixed `versionId` snapshot for the first phase.
- Return a public-safe `TripPlan` payload and minimal public metadata.
- Return `404` for missing, invalid, expired, revoked, deleted, or cross-record-invalid shares.

The public API must not expose whether a record exists outside the share boundary.

## Permission Boundary

Owner-only operations:

- Create a share link.
- List share links.
- Revoke a share link.
- See share status, access count, last accessed time, and token preview.

Public operations:

- Read the public shared snapshot by valid token only.

Explicitly disallowed through a share token:

- Restore a version.
- Edit a plan.
- Delete a plan.
- Append a version.
- Save a plan as the owner.
- View owner account details.
- View private history or version management UI.
- Enumerate shares.

Prefer `404 NOT_FOUND` for invalid or unauthorized share-target lookups so the API does not confirm private record existence.

## Page Draft

### Owner Detail Page

Future owner-facing `/trips/[id]` detail page can add a compact share section with:

- create share link
- copy newly created link
- list active/revoked/expired links
- revoke link
- show fixed version number or created timestamp

This section should require login through the existing protected detail page path. It should not be implemented until the API and database boundary exist.

### Public Share Page

Future public page can use a route such as `/shared/trips/[token]`.

It should:

- display a read-only `TripPlan` snapshot
- clearly avoid owner-only actions
- avoid account, email, internal id, restore, edit, delete, save, and version-management controls
- optionally set `noindex` to reduce accidental search indexing
- show a simple unavailable state after revocation, expiration, deletion, or invalid token

## Version History Relationship

First phase: fixed-version links.

- Link creation binds to the current version at creation time unless a specific version is explicitly chosen.
- Restore creates a new current version, but existing fixed-version share links do not change.
- Appending a new version does not change existing fixed-version share links.
- Revoking a share invalidates that link regardless of the version it points to.

Later phase: optional current-version links.

- A future `targetMode` field could support `fixedVersion` and `currentVersion`.
- Current-version links should be opt-in and clearly labeled because the shared content can change after restore or append.

## Privacy and Compliance Risks

Travel plans can reveal sensitive personal context, including:

- travel destination
- departure city
- dates
- budget
- traveler count
- preferences
- risk reminders
- planned activities
- personal travel intent

Risk controls:

- Default private.
- Explicit owner action required to create a link.
- Clear owner copy that anyone with the link can view the shared plan.
- No owner email or internal id on public pages.
- Optional `noindex` for public share pages.
- Revocation and optional expiration.
- No raw token logging.
- No secret or server configuration values in docs, UI, logs, or responses.
- Abuse and support process should be designed before broad public rollout.

## Recommended First Implementation Scope

First phase:

- Database migration for share links.
- Repository methods for create, list, revoke, and public lookup.
- Owner-scoped share-link APIs.
- Public read-only shared-trip API.
- Owner detail page share controls.
- Public read-only share page.
- Tests for token hashing, one-time raw token return, owner scoping, revoked/expired links, fixed-version behavior, and response redaction.

Keep out of first phase:

- Admin UI.
- Collaboration, comments, or edit permissions.
- Current-version living links.
- Password-protected links.
- Analytics beyond optional access count and last accessed time.
- Search indexing.
- Map, weather, search, or real-time data features.

## Later Extensions

- Explicit target choice: current version or selected fixed version.
- Expiration presets.
- Password-protected shares.
- Per-link title or note.
- Owner-visible access history with privacy-preserving aggregation.
- Report/abuse flow.
- Account-level setting to disable public sharing.
- Data export and account deletion behavior for share records.
