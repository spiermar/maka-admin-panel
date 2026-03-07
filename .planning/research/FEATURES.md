# Feature Research

**Domain:** Rental operations
**Researched:** 2026-03-07
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Unit and inventory catalog | Operators must track every rentable asset and status | MEDIUM | Core data model for units, categories, locations, and lifecycle states |
| Reservation and booking management | Teams need a single source of truth for upcoming rentals | MEDIUM | Includes hold, confirm, modify, cancel, and conflict prevention |
| Customer and account records | Repeat customers, contacts, and billing entities are foundational | LOW | Should support business and individual renters, plus contact history |
| Check-out/check-in workflow | Physical handoff requires auditable state transitions | MEDIUM | Tracks condition, accessories, timestamps, and responsible staff |
| Billing, invoicing, and payments | Revenue operations depend on accurate charges and collections | HIGH | Taxes, deposits, late fees, waivers, payment status, and receipts |
| Availability calendar | Planners must see utilization and gaps quickly | MEDIUM | Needs reliable overlap rules and location-level filtering |
| Damage/loss and incident tracking | Rental risk management is expected in operational systems | MEDIUM | Links incident costs to customer account and asset maintenance queue |
| Role-based access controls | Multi-role teams need permission boundaries | MEDIUM | Granular access for ops, finance, warehouse, and admins |
| Audit trail and activity log | Disputes and compliance require change accountability | MEDIUM | Immutable event history for bookings, billing, and inventory changes |
| Operational reporting | Managers need utilization, revenue, and exception visibility | MEDIUM | Baseline KPIs: occupancy/utilization, overdue items, AR aging |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dynamic pricing rules engine | Improves margin via demand-, duration-, and season-based pricing | HIGH | Requires pricing rule precedence and explainable quote breakdown |
| Dispatch and route optimization | Reduces delivery/pickup costs and improves on-time performance | HIGH | Depends on geospatial data, route windows, and driver capacity |
| Predictive maintenance and replacement scoring | Prevents downtime and extends asset lifecycle | HIGH | Needs telemetry/incident history and model-driven maintenance triggers |
| Self-service renter portal | Lowers support burden and speeds booking changes/payments | MEDIUM | Customer-facing auth, booking changes, payment capture, document access |
| Contract and waiver automation | Faster turnaround with fewer legal/process errors | MEDIUM | Template versioning, e-sign integration, and jurisdiction-aware clauses |
| Utilization optimization recommendations | Helps operators rebalance inventory across locations | MEDIUM | Recommendation logic based on demand heatmaps and transfer costs |
| API/webhook ecosystem | Enables integration with ERP, CRM, accounting, IoT, and BI | MEDIUM | Developer-facing docs, auth tokens, and event subscription model |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Fully custom workflow builder for every tenant | Buyers want exact process matching legacy SOPs | High implementation and support burden; fragmentation hurts upgrades | Opinionated workflows with configurable checkpoints and policy toggles |
| Real-time sync for every field and view | Feels modern and "instant" | Expensive infra, conflict complexity, weak ROI for low-change data | Event-driven updates for critical states + short polling elsewhere |
| Unlimited free-form pricing overrides | Sales/ops want rapid deal flexibility | Margin leakage, audit gaps, and inconsistent customer pricing | Rule-based discounts with approval thresholds and audit logs |
| One-click mass deletion of records | Teams want cleanup speed | Data loss risk, broken financial/audit chains, compliance exposure | Soft delete + retention policies + scoped archive tools |
| Full offline-first parity across all modules | Field teams request no-network operation | Very high sync/conflict complexity across finance + inventory domains | Offline support only for check-out/check-in and signature capture |

## Feature Dependencies

```text
Inventory Catalog
    └──requires──> Role-Based Access Controls
                       └──requires──> Audit Trail

Reservation Management
    └──requires──> Availability Calendar
                       └──requires──> Inventory Catalog

Billing/Invoices/Payments
    └──requires──> Reservation Management
                       └──requires──> Customer Accounts

Check-out/Check-in
    └──requires──> Reservation Management
    └──requires──> Inventory Catalog

Damage/Incident Tracking
    └──requires──> Check-out/Check-in
    └──enhances──> Predictive Maintenance

Self-Service Portal
    └──requires──> Customer Accounts
    └──requires──> Reservation Management
    └──requires──> Billing/Invoices/Payments

Dynamic Pricing Engine
    └──requires──> Reservation Management
    └──requires──> Availability Calendar

Dispatch/Route Optimization
    └──requires──> Reservation Management
    └──requires──> Location and Delivery Metadata

Unlimited Price Overrides ──conflicts──> Dynamic Pricing Rules Governance
Mass Hard Deletes ──conflicts──> Audit Trail and Financial Compliance
```

### Dependency Notes

- **Reservation Management requires Availability Calendar and Inventory Catalog:** booking reliability depends on conflict-free asset availability state.
- **Billing requires Reservation Management and Customer Accounts:** charge computation and collections are downstream of contract dates, rates, and customer identity.
- **Damage Tracking depends on Check-out/Check-in:** condition deltas need before/after evidence and chain-of-custody timestamps.
- **Self-Service Portal depends on core ops and finance features:** customer self-service is only credible when booking and payment states are authoritative.
- **Dynamic Pricing conflicts with unrestricted overrides:** governance controls are needed to preserve consistency and margin discipline.
- **Hard deletes conflict with audit/compliance:** operational and financial records should be retained or archived, not destroyed.

## Complexity Notes

- **LOW:** Customer master data and baseline profile management.
- **MEDIUM:** Reservation lifecycle, asset lifecycle, role-based permissions, and operational reporting.
- **HIGH:** Billing/payment correctness, dynamic pricing precedence, dispatch optimization, and predictive maintenance logic.
- **Primary complexity drivers:** temporal overlap rules, cross-module state consistency, financial accuracy, and compliance-grade auditability.

---
*Feature research for: rental operations*
*Researched: 2026-03-07*
