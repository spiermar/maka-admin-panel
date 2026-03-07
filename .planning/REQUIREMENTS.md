# Requirements: Rental Operations Expansion for Maka Admin

**Defined:** 2026-03-07
**Core Value:** Small landlords can reliably manage rent collection status and vacancy across their units without spreadsheets.

## v1 Requirements

### Portfolio & Units

- [ ] **UNIT-01**: User can create and manage properties and units with residential unit attributes (address, type, bedroom/bathroom count, status)
- [ ] **UNIT-02**: User can mark each unit as occupied, vacant, or unavailable with effective dates
- [ ] **UNIT-03**: User can view a filterable unit inventory list with current vacancy state

### Tenants & Leases

- [ ] **LEASE-01**: User can create tenant records and link tenants to units
- [ ] **LEASE-02**: User can create residential leases with start date, end date, monthly rent, and security deposit
- [ ] **LEASE-03**: User can renew, terminate, or move-out leases with explicit lifecycle status
- [ ] **LEASE-04**: User cannot activate overlapping leases for the same unit and overlapping date range

### Rent Operations

- [ ] **RENT-01**: User can generate monthly rent charges from active lease terms
- [ ] **RENT-02**: User can record manual rent payments with payment date, amount, and method
- [ ] **RENT-03**: User can see current balance due per lease and per tenant
- [ ] **RENT-04**: User can mark and view overdue balances based on due date and configurable grace period

### Visibility & Controls

- [ ] **VIS-01**: User can see vacancy, occupied count, and delinquent-account summaries in dashboard views
- [ ] **VIS-02**: User can see an auditable change history for high-risk rental operations (lease status changes, rent amount edits, payment adjustments)
- [ ] **VIS-03**: User access to rental operations is protected by role-based permissions in admin workflows

## v2 Requirements

### Commercial Extensions

- **COMM-01**: User can manage baseline commercial lease terms alongside residential units
- **COMM-02**: User can configure commercial-specific charge structures (for example CAM/NNN) with clear line-item breakdowns

### Payments & Tenant Experience

- **PAY-01**: User can collect online tenant payments through integrated payment processors
- **PAY-02**: Tenant can access self-service statements and payment status

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full commercial accounting workflows in v1 | Residential-first sequencing lowers initial complexity and delivery risk |
| Online payment processing in v1 | Manual payment recording solves immediate spreadsheet pain with lower implementation overhead |
| Predictive pricing/optimization features | Not required to achieve initial operational control objective |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UNIT-01 | TBD | Pending |
| UNIT-02 | TBD | Pending |
| UNIT-03 | TBD | Pending |
| LEASE-01 | TBD | Pending |
| LEASE-02 | TBD | Pending |
| LEASE-03 | TBD | Pending |
| LEASE-04 | TBD | Pending |
| RENT-01 | TBD | Pending |
| RENT-02 | TBD | Pending |
| RENT-03 | TBD | Pending |
| RENT-04 | TBD | Pending |
| VIS-01 | TBD | Pending |
| VIS-02 | TBD | Pending |
| VIS-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14 ⚠️

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after initial definition*
