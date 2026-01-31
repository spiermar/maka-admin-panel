# Deployment Guide

## Prerequisites

- Vercel account
- Neon PostgreSQL account

## Steps

### 1. Set up Neon Database

 1. Create a new Neon project at [neon.tech](https://neon.tech)
2. Note your connection string
3. Set DATABASE_URL environment variable
4. Run the initialization script:
   ```bash
   export DATABASE_URL="your-neon-connection-string"
   npm run script:init-db
   ```

   The script will display random admin credentials - save them securely:
   ```
   Username: admin
   Password: <random-16-char-password>
   ```

5. Store the generated password securely in a password manager

### 2. Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables:
   - `POSTGRES_URL`: Your Neon connection string
   - `SESSION_SECRET`: Generate with `openssl rand -base64 32`
   - `NODE_ENV`: `production`

4. Deploy

### 3. Verify Deployment

1. Visit your deployed URL
2. Log in with the admin credentials displayed during initialization
3. Change the password immediately after first login
4. Test creating accounts, categories, and transactions

## Environment Variables

### Required

- `POSTGRES_URL`: PostgreSQL connection string (from Neon)
- `SESSION_SECRET`: 32+ character random string for session encryption

### Optional

- `NODE_ENV`: Set to `production` for production builds

## Database Management

### Creating a Backup

```bash
pg_dump $POSTGRES_URL > backup.sql
```

### Restoring from Backup

```bash
psql $POSTGRES_URL < backup.sql
```

## Security Considerations

1. Change default admin password after first login
2. Use strong SESSION_SECRET (32+ characters)
3. Enable 2FA on Vercel and Neon accounts
4. Regularly update dependencies
5. Monitor logs for suspicious activity

## Monitoring

- **Logs:** Check Vercel deployment logs for errors
- **Database:** Monitor query performance in Neon dashboard
- **Errors:** Review error boundaries and logs

## Troubleshooting

### Database Connection Errors

- Verify POSTGRES_URL is correct
- Check Neon project is active
- Ensure IP allowlist is configured (if applicable)

### Session Errors

- Verify SESSION_SECRET is set
- Check cookie settings in production

### Build Errors

- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
