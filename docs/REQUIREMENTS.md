# Requirements

**Project/Feature:**  A web-based ledger application to manage, categorize and analyze financial transactions in multiple accounts.

## A) Requirements / Features (must be testable)
**Must-have**
- R1: Store transactions for an account. Transactions should include an account, date, payee, category, amount and comment.
- R2: Visualize transations for a single account.
- R3: Add a new transaction to an account.
- R3: Delete a transaction in an account.
- R4: Edit a transaction in an account.

**Nice-to-have**
- N1: Configurable list of categories for transactions. Categories can be organized as trees, with a max depth of 3.
- N2: Configurable currency.
- N3: Pagination when visualizing transactions.

**Out of scope**
- O1: User login.

## B) Tech Stack / Constraints
**Frontend:** Next.js (16+), Shadcn, Shadcn UI, Tailwind
**Backend:** Next.js (16+)  
**Data:** PostgreSQL 
**Infra/Hosting:** Vercel, Neon
**Auth/Security:** Simple username/password, with hashed passwords in database
**Observability:** stdout logging 
