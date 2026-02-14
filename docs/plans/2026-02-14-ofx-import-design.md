# OFX File Import Feature Design

**Date:** 2026-02-14  
**Status:** Approved

## Overview

Add ability to import bank statements from OFX (Open Financial Exchange) files triggered from the Account Detail page. Users upload an OFX file, preview parsed transactions, and import selected transactions to their account.

## Database Schema Changes

Add columns to `transactions` table:

```sql
ALTER TABLE transactions ADD COLUMN ofx_fitid VARCHAR(255);
ALTER TABLE transactions ADD COLUMN ofx_memo VARCHAR(500);
ALTER TABLE transactions ADD COLUMN ofx_refnum VARCHAR(255);
CREATE INDEX idx_transactions_ofx_fitid ON transactions(ofx_fitid);
```

## Data Mapping During Import

| OFX Field | Transaction Column | Notes |
|-----------|-------------------|-------|
| REFNUM | payee | Full REFNUM (without -N suffix) |
| MEMO | comment | Copied as-is |
| DTPOSTED | date | Parsed to YYYY-MM-DD |
| TRNAMT | amount | Positive = income, negative = expense |
| FITID | ofx_fitid | For deduplication |
| MEMO | ofx_memo | Original MEMO stored |
| REFNUM | ofx_refnum | Original REFNUM stored |
| Account ID | account_id | From page context |

## Implementation Components

```
lib/
  ofx/
    parser.ts       - OFX file parsing using library
    types.ts        - Parsed OFX transaction types
    
lib/actions/
  import.ts         - Server action for file upload & import
  
components/
  ofx-import-dialog.tsx  - Preview dialog + import UI
```

## UI Flow

1. **Button**: "Import OFX" button on Account Detail page
2. **Upload**: File input accepting .ofx files
3. **Preview**: Dialog shows:
   - Table: Date | Payee (REFNUM) | Amount | Memo | Select (checkbox)
   - "Select All" / "Deselect All" controls
4. **Import**: Button commits selected transactions
5. **Result**: Toast shows "X imported, Y skipped (duplicates)"

## Transaction Table Enhancement

- Add info icon in actions column when `ofx_fitid` exists
- Click opens dialog showing: FITID, REFNUM, Original MEMO
- Payee column shows `payee` field (REFNUM from import)

## Deduplication Logic

Query:
```sql
SELECT id FROM transactions 
WHERE account_id = $1 
  AND date = $2 
  AND ofx_fitid = $3 
  AND amount = $4
```

Match on: account_id + date + ofx_fitid + amount

This handles the case where the same FITID can appear in different statement files.

## Dependencies

- Use an OFX parsing library (e.g., `ofx-parser` or similar) instead of regex parsing