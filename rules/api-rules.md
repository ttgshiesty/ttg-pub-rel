# API Rules

Use documented API return structures first.

Primary references:

- `AI_CONTEXT/API_RETURNS_REAL.md`
- `AI_CONTEXT/COMPLETE_API_RETURNS.md`
- `AI_CONTEXT/API_REFERENCE_COMPLETE.md`

## ArcTracker v2

Authenticated requests use:

- `X-App-Key`
- `Authorization: Bearer <arc_u1 user key>`

Known endpoint group:

- `/api/v2/user/profile`
- `/api/v2/user/summary`
- `/api/v2/user/stash`
- `/api/v2/user/loadout`
- `/api/v2/user/quests`
- `/api/v2/user/hideout`
- `/api/v2/user/projects`
- `/api/v2/user/rounds`
- `/api/v2/user/blueprints`
- `/api/v2/user/enemy-kills`
- `/api/v2/user/weapon-kills`
- `/api/v2/user/map-performance`
- `/api/v2/user/expedition-status`

## Field Priority

Use live fields first:

| Live Field | Fallbacks |
|---|---|
| `outcome` | `status`, `extraction` |
| `durationMs` | `duration`, `durationSeconds`, `time_topside`, `timeAlive` |
| `netValue` | `netProfit`, `profit`, `lootValueGained` |
| `valueExtracted` | `lootValue`, `loot_value` |
| `valueBroughtIn` | `loadoutValue`, `loadout_value` |
| `damage` | `damageDealt`, `damage_dealt`, `totalDamage` |
| `score` | `xp`, `experience`, `totalScore` |
| `roundEndedAt` | `syncedAt`, `createdAt`, `timestamp`, `date` |
| `learned` | `unlocked`, `claimed`, `completed` |
| `targetId` | `id`, `target_id` |
| `weaponAssetId` | `assetId`, `weapon_id` |
| `itemId` | `id`, `item_id` |

## MetaForge

Base: `https://metaforge.app/api/arc-raiders`

Known working endpoints:

- `/items`
- `/arcs`
- `/quests`
- `/events-schedule`
- `/traders`

Known unavailable:

- `/api/arc-raiders/weekly-trials` returns 404 in current docs.

Treat weekly trials as unavailable until the correct endpoint is verified.
