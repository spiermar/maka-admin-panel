# Transaction Input Validation

## Overview

Transaction forms enforce business rules to prevent data manipulation and ensure data quality.

## Validation Rules

### Amount
- **Format:** Decimal with up to 2 places (e.g., 123.45)
- **Range:** -1,000,000.00 to +1,000,000.00
- **Error:** "Amount must be between -1,000,000.00 and 1,000,000.00"

### Date
- **Format:** YYYY-MM-DD
- **Range:** Within last 10 years, not in future
- **Error:** "Date must be within last 10 years and not in the future"

## Edge Cases

| Value | Valid | Reason |
|-------|-------|--------|
| 1,000,000.00 | ✅ | At upper limit |
| 1,000,000.01 | ❌ | Exceeds limit |
| Today | ✅ | Current date |
| Tomorrow | ❌ | Future date |
| 10 years ago | ✅ | At lower limit |
| 10 years + 1 day | ❌ | Exceeds limit |

## Implementation

Validation is enforced by Zod schema in `lib/validations/transactions.ts`.
Server Actions automatically reject invalid data before database operations.
