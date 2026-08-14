# Menu Setup and Ordering QA

## Manual QA checklist

### Layouts
- [ ] iPhone-sized (375px) guest menu
- [ ] Android-sized (360px) guest menu
- [ ] Slow connection / offline banner

### QR flows
- [ ] Menu-only: no checkout, actions visible if configured
- [ ] Single shared QR: fulfillment selection at checkout
- [ ] Per-table QR: `/[slug]/t/[token]` locks table
- [ ] Legacy `?table=` still works for single-QR branches with validated tables

### Ordering scenarios
- [ ] First-time diner orders beyaynetu with required selections
- [ ] Fasting customer filters and orders shiro
- [ ] Two kitfo lines with different cooking prefs stay separate in cart
- [ ] Kitchen ticket shows modifiers vs guest notes

### Admin
- [ ] Guided setup steps 1–7 (branch basics → publish)
- [ ] Template apply shows impact; requires confirm; backup restore works
- [ ] Publish blocked when no sellable items or broken modifiers

### Localization
- [ ] Language toggle EN ↔ AM on guest menu
- [ ] Amharic section names and item names render correctly (no mojibake)

## Automated tests

```bash
npm run db:generate
npm run typecheck
npm -w apps/api run test
```

Covers: money math, Amharic smoke strings, tenant isolation, idempotency, table token validation, kitchen transitions.

## Migration

```bash
npm run db:migrate
npm run db:seed
```

Migration `20250814100000_ethiopia_production_ready` backfills `service_mode`, order money fields, table tokens, and order line snapshots.

## Rollback

Archive published menu before rollback. Revert migration only after exporting orders; monetary columns are required for new orders.
