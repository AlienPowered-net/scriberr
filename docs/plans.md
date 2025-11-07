## Plan System Overview

Scriberr now supports Free vs Pro plans with hard limits enforced on the backend and surfaced in the UI.

### Plans

- **FREE**
  - Up to 25 notes
  - Up to 3 note folders
  - Contacts + Note Tags disabled
  - Note history capped at the 5 most recent versions
- **PRO — $5/mo**
  - Unlimited notes, folders, contacts, and tags
  - Unlimited note version history
  - Contacts workspace unlocked (folders, tags, icons, colors)

### Data Model

`prisma/schema.prisma` now stores:

- `Shop.plan` (`FREE` | `PRO`)
- `Subscription` model with Shopify subscription metadata
- `SubscriptionStatus` enum (`NONE`, `ACTIVE`, `CANCELED`, `PAST_DUE`)

The migration lives in `prisma/migrations/20251107000100_add_plan_subscription`.

### Guard Utilities

`src/server/guards/ensurePlan.ts` exposes helpers to:

- Fetch a merchant (`getMerchantByShop`)
- Enforce note / folder capacity
- Gate Contacts & Note Tags features
- Trim note versions for free plans
- Wrap Remix actions with plan context (`withPlanContext`)

### Billing

- `POST /api/billing/create` → calls Shopify `appSubscriptionCreate` and returns the confirmation URL.
- `GET /api/billing/confirm` → verifies charge, stores `Subscription`, flips plan to PRO, then redirects to `/app/settings/billing/success`.
- Helpers live in `src/lib/shopify/billing.ts`.

#### Required environment

```
NEXT_PUBLIC_APP_URL=https://your.ngrok-or-vercel-domain
SHOPIFY_BILLING_TEST_MODE=true   # optional, defaults true outside production
```

### UI

- Nav hides Contacts + Note Tags on free accounts.
- Upgrade prompts run through `src/components/UpgradeModal.tsx`.
- API responses with plan errors return `{ error, message, upgradeHint: true }` which triggers the modal.

### Testing

`vitest` covers guard logic and subscription status mapping:

```
npm run test
```

### Versioning

- Run `node scripts/increment-version.js` after plan-impacting changes.
- Version strings in the home header and settings footer read from `package.json`, so the script keeps UI and deployments aligned.

