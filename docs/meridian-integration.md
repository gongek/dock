# Meridian integration spec (Dock)

Dock is a Meridian companion product. This document is the **Meridian platform checklist**: OAuth scopes, HTTP APIs, and payloads Dock already calls or is ready to consume. Implementation references live under `convex/meridian/`.

## OAuth scopes

Dock’s default sign-in bundle is defined in [`convex/meridian/scopes.ts`](../convex/meridian/scopes.ts) as `DOCK_MERIDIAN_OAUTH_SCOPES_CORE`:

```text
user.identify user.staff.read user.billing.read isMeridianStaff bots.read flows.read guilds.read offline_access
```

| Scope | Purpose for Dock |
|--------|------------------|
| `user.identify` | Sign-in, profile |
| `user.staff.read` | Staff entitlements (replaces `isMeridianStaff`; userinfo may still return `isMeridianStaff`) |
| `user.billing.read` | Plan and billing cycle **without** Stripe PII (preferred over `billing.read`) |
| `isMeridianStaff` | Legacy alias during migration |
| `bots.read` | Bot linking, dashboard identity |
| `flows.read` | Command/event/function counts on dashboard |
| `guilds.read` | Server list, primary guild for `linkedGuildId` |
| `offline_access` | Refresh tokens |

Incremental bundles (request only when a feature is enabled): `DOCK_MERIDIAN_SCOPE_BUNDLE` in the same file — staff (`cowork.read`, `logs.read`), published site data (`cases.read`, `variables.read`), public stats (`botstatus.read`, `botstatus.write`), ops, automation, guild metadata, media, events.

## Incremental consent (Dock → Meridian)

| Bundle key | Scopes | Enable when |
|------------|--------|-------------|
| `core` | Default sign-in | Always |
| `staffDashboard` | `cowork.read`, `logs.read` | Staff/cowork panel |
| `publishedSiteData` | `cases.read`, `variables.read` | Case blocks or `{vars.*}` sync |
| `publicStatsSetup` | `botstatus.read`, `botstatus.write` | Dashboard stats onboarding |
| `ops` | `bots.write`, `botstatus.write` | Restart / hosting actions |
| `automationInvoke` | `flows.read`, `webhooks.read`, `webhooks.invoke` | Run flows from site |
| `automationSetup` | `flows.write`, `webhooks.read` | Configure webhooks |
| `guildBuilder` | `guilds.metadata.read` | Guild labels in builder |

Dock must **not** request `billing.read`, `env.read`, or `flows.write` on core sign-in. Prefer **`user.billing.read`** over full Stripe **`billing.read`**.

## Create bot site (`/select` handoff)

When an owner creates a bot-linked Dock site, bot picking happens on Meridian—not inside Dock.

1. Dock issues a handoff via Convex action `meridian.botSelectHandoff.buildMeridianBotSelectHandoffUrl`, which sends the user to Meridian `/select` with a composite `client` query param:
   - Production: `client=dock.siteonboarding` → return to `https://api.dock.surf/callback/onboarding`
   - Local: `client=dock.siteonboarding.local.3001` → `http://localhost:3001/callback/onboarding`
2. `dock` is the client provider; `siteonboarding` is the callback slug. See [`convex/meridian/botSelectHandoff.ts`](../convex/meridian/botSelectHandoff.ts) and [`shared/dockBotSelectHandoff.ts`](../shared/dockBotSelectHandoff.ts).
3. Meridian resolves the callback URL from `client` on `/select`. Optional legacy `client=dock&return=…` and optional `ts`/`sig` signing (shared secret `DOCK_MERIDIAN_BOT_SELECT_SECRET`) remain supported for older links.

**Local env:**

```bash
# Dock (Convex dev deployment)
npx convex env set MERIDIAN_APEX_ORIGIN "http://localhost:3000"
npx convex env set SITE_URL "http://localhost:3001"

# Meridian (.env.local) — only if using signed handoffs
DOCK_MERIDIAN_BOT_SELECT_SECRET=<same value>
```
4. After the user picks a bot, Meridian navigates to the resolved callback with `?bot={meridianBotId}`.
5. The callback validates the bot id and redirects to **`onboarding.dock.surf/sites/config?bot=…`** (local: `/subdomain/onboarding/sites/config?bot=…`).
6. Dock validates the bot against OAuth `bots.read` userinfo on the config step, then `createBotSite`.

Account linking during onboarding uses normal Meridian OAuth with `redirectTo` pointing at **`onboarding.dock.surf/sites/link`**.

Dock onboarding callbacks (`api.dock.surf` / local `/callback/onboarding`) are encoded in the composite `client` param. Other trusted `dock.surf` handoff URLs still use the auth return allowlist. Relative `return` paths stay in-app on Meridian.

## Scope catalog (Meridian platform)

Full matrix lives in the Meridian gaps plan; Dock encodes the subset it needs in `MERIDIAN_SCOPE` (`convex/meridian/scopes.ts`). Highlights Meridian should publish on [api/scopes](https://docs.meridian.surf/api/scopes) and OpenAPI:

- **User:** `user.identify`, `user.staff.read` (replaces `isMeridianStaff`), `user.billing.read`, optional `user.email`, `user.connections.read`
- **Bots / stats:** `bots.read`, documented `home-stats`, `botstatus.read` / `botstatus.write`, optional `hosting.read`
- **Guilds:** `guilds.read`, proposed `guilds.metadata.read`, `guilds.members.read` for Meridian-backed page access
- **Automation:** `flows.read` (userinfo + optional `/flows` API), `flows.write` off default sign-in
- **Site data:** `variables.read`, `cases.read` (webhooks `events.subscribe` / `dock.ingest` future)
- **Cowork:** `cowork.read` for staff mapping

Integration matrix: each row in `MERIDIAN_SCOPE` should map to a documented HTTP surface and userinfo field where applicable.

## HTTP APIs Dock uses today

| Endpoint | Auth | Dock usage |
|----------|------|------------|
| `GET /api/oauth/userinfo` | Bearer | Bots, flows, guilds, plan, staff |
| `GET /api/external/v1/billing/summary` | `billing.read` | Legacy plan fallback |
| `GET /api/external/v1/bots/{id}/home-stats` (+ fallbacks) | Bearer | Dashboard stats — see [`apiPaths.ts`](../convex/meridian/apiPaths.ts) |
| `GET /botstatus/{ref}/api` | None (public) | Live stats when owner enabled public status |

## HTTP APIs Dock is ready for (returns empty / no-op until Meridian ships)

Canonical paths are in [`convex/meridian/apiPaths.ts`](../convex/meridian/apiPaths.ts).

| Endpoint | Scope | Dock client | Owner action |
|----------|-------|-------------|--------------|
| `GET /api/external/v1/user/billing` | `user.billing.read` | [`billing.ts`](../convex/meridian/billing.ts) | Plan sync |
| `GET /api/external/v1/bots/{id}/variables?guildId=` | `variables.read` | [`variablesClient.ts`](../convex/meridian/variablesClient.ts) | `syncMeridianVariablesForSite` |
| `GET /api/external/v1/bots/{id}/cases` | `cases.read` | [`casesClient.ts`](../convex/meridian/casesClient.ts) | `syncMeridianCasesForSite` |
| `GET/PATCH .../bots/{id}/public-status` | `botstatus.read` / `botstatus.write` | [`botPublicStatus.ts`](../convex/meridian/botPublicStatus.ts) | `enablePublicBotStatus` |
| `GET /api/external/v1/bots/{id}/flows` | `flows.read` | [`flowsClient.ts`](../convex/meridian/flowsClient.ts) | Dashboard fallback |

### Cases payload

Map API JSON to Dock’s [`ModerationCaseRowPayload`](../convex/meridian/types.ts) via [`mapMeridianCaseRow`](../convex/meridian/casesClient.ts). Sync upserts by `meridianCaseId` on `siteCaseRecords`.

### Variables payload

```json
{ "variables": [{ "name": "welcome", "value": "Hello", "publicDock": true }] }
```

Only variables with `publicDock !== false` are synced to [`siteVariables`](../convex/siteVariables.ts) and exposed as `{vars.name}` on published pages.

### User billing payload (sanitized)

Include: `plan` / `planLabel`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, trimmed `products[]`. Exclude Stripe customer ids, invoices, payment methods, tax ids.

### Guilds on userinfo

Extend `guilds[]` with `name`, `icon`, `primary`. Dock resolves `linkedGuildId` via [`guildMetadata.ts`](../convex/meridian/guildMetadata.ts).

## Dock Convex actions (site owners)

| Action | File |
|--------|------|
| `meridian.integrationActions.syncMeridianCasesForSite` | Pull cases from Meridian |
| `meridian.integrationActions.syncMeridianVariablesForSite` | Pull `{vars.*}` into site |
| `meridian.integrationActions.enablePublicBotStatus` | PATCH public status on |
| `meridian.integrationActions.listGuildOptionsFromMeridian` | Guild picker labels |

## OpenAPI

Meridian should document all ` /api/external/v1/*` routes above in [openapi.json](https://api.meridian.surf/openapi.json) with scope requirements and stable field names (especially `home-stats`, `UserinfoBot.discordId`, `UserinfoFlow.kind`).

## Security

- Never expose env/private storage vars to Dock OAuth tokens.
- Keep `flows.write`, `bots.write`, and full `billing.read` off default Dock sign-in; use incremental consent + PIN on Meridian.
