# QR Menu Production Readiness Backlog

This backlog keeps the product focused on restaurants and cafés: QR menus, table/shared ordering, waiter requests, simple staff operations, and optional kitchen handoff.

## P0 — Must complete before launch

- [ ] **Validate all migrations and generated Prisma client**
  - Run migrations against a staging copy with existing orders and branches.
  - Run `db:generate`, typecheck, API tests, and production build.
  - Acceptance: a clean database and an upgraded database both migrate successfully.

- [ ] **Complete the restaurant launch checklist**
  - Add real completion criteria for QR generation, staff account/device readiness, test order, and publish.
  - Persist checklist progress rather than relying on inferred state alone.
  - Acceptance: an owner can tell exactly what prevents opening.

- [ ] **Secure public tracking responses**
  - Replace generic order formatting on guest tracking with a guest-safe response.
  - Never return idempotency keys, internal IDs, or access tokens after initial creation.
  - Acceptance: tracking link exposes only order information needed by that guest.

- [ ] **Finish guest translation coverage**
  - Move all guest confirmation, tracking, service-request, and takeaway strings into customer translations.
  - Acceptance: English/Amharic toggle changes every guest-facing string without corrupted text.

- [ ] **Verify notification delivery**
  - Add a real notification sound asset and visible fallbacks.
  - Test browser notification permission and live SSE reconnect behavior.
  - Acceptance: staff can see new work even when audio/notifications are unavailable.

- [ ] **Mobile and operational QA**
  - Test shared QR, secure table QR, one-waiter service, bill/waiter request lifecycle, unavailable items, slow network, and two staff devices.
  - Acceptance: 360px Android and 375px iPhone flows are usable without lost orders.

## P1 — Core experience improvements

- [ ] **Polish the Simple Service operations screen**
  - Replace inline prototype layout with responsive cards, urgency colors, retry actions, and recently-completed requests.
  - Acceptance: a waiter can scan and act on the queue with one hand on a phone/tablet.

- [ ] **Add cart editing**
  - Change quantity and edit modifiers/notes without recreating an item.
  - Do not silently default meaningful required modifiers.
  - Acceptance: guests can correct an order before submission.

- [ ] **Complete takeaway flow only if enabled for launch**
  - Enforce required pickup identity server-side; show it in staff operations and guest confirmation.
  - Acceptance: staff can reliably match a ready order to its customer.

- [ ] **Add staff assignment/audit**
  - Store who acknowledged/completed a service request and show it in the queue.
  - Acceptance: multiple waiters know who owns a request.

- [ ] **Make daily availability fast**
  - Provide a quick on/off availability view outside the full menu editor.
  - Acceptance: an owner can mark an item sold out in seconds.

## P2 — Optional scale workflows

- [ ] **Differentiate Table Service workflow**
  - Give `TABLE_SERVICE` meaningful stages rather than mirroring Simple Service.

- [ ] **Refine Kitchen + Service handoff**
  - Kitchen marks items ready; waiters receive delivery alerts and mark served.

- [ ] **Admin language support**
  - Decide whether the full admin/staff interface should support Amharic and implement consistently.

## Explicitly out of standard v1 scope

- Reservations
- Hotel/room-service workflows
- Payment processing or payment gateway integration
- Delivery logistics
- Customer CRM

