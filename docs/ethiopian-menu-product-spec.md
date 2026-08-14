# Ethiopian QR Menu — Product Specification

## Overview

Multi-tenant QR menu SaaS for Ethiopian restaurants. Guests browse bilingual menus (Amharic-first or English-first), configure dishes with modifiers, and order according to branch service mode.

## Service modes

| Mode | Guest behavior |
|------|----------------|
| `MENU_ONLY` | Browse only; optional call waiter, WhatsApp, request bill |
| `SINGLE_QR_SELF_ORDER` | Shared QR; checkout asks dine-in / takeaway / room service |
| `PER_TABLE_QR` | Signed table token locks context; optional takeaway if enabled |

Legacy `qrMode` (`SINGLE` / `PER_TABLE`) maps to service modes for compatibility.

## Money

- Server calculates subtotal, service charge, VAT, and grand total.
- Orders store monetary snapshots; UI displays server totals.
- ETB displays as whole numbers by default.

## Cart & order lines

- Each cart line has unique `lineId` / `clientLineId`.
- Same dish with different modifiers or notes = separate lines.
- Order items store name snapshots, modifier JSON, line totals.

## Modifiers

- `ModifierGroup` + `ModifierOption` per menu item.
- Required/optional, min/max selection, price deltas.
- Platter/combo enforces `comboItemCount` when configured.

## Menu versioning

- Status: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- One published menu per branch.
- Publish runs preflight checks; template apply requires confirmation and backs up draft.

## Dietary labels

Structured: `FASTING`, `VEGAN`, `VEGETARIAN`, `HALAL`, `GLUTEN_FREE`, `SPICY`. Never inferred from ad-hoc fields.

## Kitchen

Order item states: `PENDING` → `PREPARING` → `READY` with undo via `previousStatus`.

## Security

- Per-table QR uses revocable `qrToken`, not editable query params.
- Tenant isolation on all staff/admin routes.
- Client prices, tables, and totals are never trusted.
