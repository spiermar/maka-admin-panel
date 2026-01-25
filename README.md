# Financial Ledger Application

A web-based ledger application for managing, categorizing, and analyzing financial transactions across multiple accounts.

## Features

- Multi-account transaction management
- Hierarchical category organization (up to 3 levels deep)
- Cash flow analytics and visualizations
- Income vs expense tracking
- Shared access for multiple users (family finances)

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Shadcn UI, Tailwind CSS
- **Backend:** Next.js Server Components & Server Actions
- **Database:** PostgreSQL (Neon)
- **Auth:** iron-session with bcrypt
- **Charts:** Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Neon)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your database connection string and session secret.

4. Initialize the database:
   ```bash
   psql $DATABASE_URL -f scripts/init-db.sql
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Default Login

- **Username:** admin
- **Password:** admin123

## Project Structure

```
/app
  /(auth)         - Authentication pages
  /(dashboard)    - Protected dashboard routes
/lib
  /db             - Database queries
  /actions        - Server Actions
  /auth           - Authentication utilities
  /analytics      - Analytics calculations
  /validations    - Zod schemas
/components
  /ui             - Shadcn UI components
  /dashboard      - Dashboard components
  /transactions   - Transaction components
  /settings       - Settings components
/scripts          - Database scripts
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions.

## License

MIT
