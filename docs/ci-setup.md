# CI Setup Guide

This guide walks through configuring the GitHub Actions CI workflow for the Maka Admin Panel.

## Prerequisites

Before setting up CI, ensure you have:

1. **GitHub Repository Access**: Admin access to configure repository settings and secrets
2. **Neon Database Project**: A Neon Postgres project for CI testing ([neon.tech](https://neon.tech))
3. **GitHub Account**: Access to GitHub Actions (included in all plans)

## Required Secrets Configuration

The CI workflow requires the following repository secrets to be configured.

### Setting Up Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the following secrets:

#### `DATABASE_URL`

**Purpose**: PostgreSQL connection string for the CI test database

**Format**:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**How to obtain**:
1. Log into your Neon Console ([console.neon.tech](https://console.neon.tech))
2. Select your project
3. Navigate to **Dashboard** or **Connection Details**
4. Copy the connection string
5. Ensure it includes `?sslmode=require` at the end

**Example**:
```
postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### `SESSION_SECRET`

**Purpose**: Encryption key for session cookies (used by `iron-session`)

**Requirements**:
- Must be a cryptographically secure random string
- Minimum 32 characters recommended
- Base64 encoded

**How to generate**:

Using OpenSSL (macOS/Linux):
```bash
openssl rand -base64 32
```

Using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Using Python:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Example output**:
```
dGhpc2lzYXJhbmRvbWx5Z2VuZXJhdGVkc2VjcmV0a2V5Zm9ydGVzdGluZw==
```

### Verification

After adding secrets, verify they appear in **Settings** → **Secrets and variables** → **Actions**:

- ✅ `DATABASE_URL`
- ✅ `SESSION_SECRET`

The secret values will be masked and not visible after creation.

## Workflow Triggers

The CI workflow runs automatically on:

### Pull Requests
- Triggers on: `opened`, `synchronize`, `reopened`
- Target branches: `main`, `develop`
- Runs all checks (lint, unit tests, e2e tests, build)

### Push to Protected Branches
- Triggers on push to: `main`, `develop`
- Runs all checks
- Provides continuous validation of protected branches

### Manual Dispatch
You can manually trigger the workflow:
1. Go to **Actions** tab
2. Select **CI** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Branch Protection Rules (Recommended)

To enforce CI checks before merging, configure branch protection:

### For `main` Branch

1. Navigate to **Settings** → **Branches**
2. Click **Add rule** or edit existing rule for `main`
3. Configure the following settings:

**Branch name pattern**: `main`

**Protection settings**:
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - **Required status checks** (select all):
    - `lint`
    - `unit-tests`
    - `e2e-tests`
    - `build`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

### For `develop` Branch (if using Git Flow)

Repeat the above steps with branch name pattern `develop`.

## Monitoring CI Runs

### Viewing Workflow Runs

1. Go to the **Actions** tab in your repository
2. Select the **CI** workflow from the sidebar
3. View run history, status, and logs

### Understanding Status Checks

Each CI run shows:
- **Lint**: ESLint checks pass
- **Unit Tests**: Vitest tests pass with coverage
- **E2E Tests**: Playwright tests pass (Chromium + Firefox)
- **Build**: Next.js production build succeeds

### Viewing Artifacts

Failed test runs include artifacts:
- **Playwright Test Results**: HTML report with screenshots/videos
- **Playwright Report**: Detailed test execution report

To download:
1. Open the failed workflow run
2. Scroll to **Artifacts** section at the bottom
3. Download the artifact ZIP file

## Troubleshooting

### Common Issues

#### ❌ Database Connection Failures

**Error**: `Error: connect ECONNREFUSED` or `FATAL: password authentication failed`

**Solutions**:
1. Verify `DATABASE_URL` secret is set correctly
2. Ensure connection string includes `?sslmode=require`
3. Check Neon project is active and not suspended
4. Verify network access (Neon allows connections from GitHub Actions by default)

#### ❌ Session Secret Issues

**Error**: `Error: SESSION_SECRET is not set` or session-related test failures

**Solutions**:
1. Verify `SESSION_SECRET` is set in repository secrets
2. Ensure secret is at least 32 characters
3. Re-generate the secret using the commands above

#### ❌ E2E Test Failures

**Error**: Tests timeout or fail intermittently

**Solutions**:
1. Check Playwright artifacts for screenshots/videos
2. Review test logs for specific error messages
3. Verify database schema is initialized correctly
4. Check for rate limiting or resource constraints

#### ❌ Build Failures

**Error**: `next build` fails with TypeScript or build errors

**Solutions**:
1. Run `npm run build` locally to reproduce
2. Fix TypeScript errors or build configuration issues
3. Ensure all dependencies are correctly specified in `package.json`

### Debugging Steps

1. **Check Workflow Logs**: Click into failed job → expand failed step → review logs
2. **Download Artifacts**: Download test reports and review failures locally
3. **Run Locally**: Reproduce the issue locally with same Node.js version (20.x)
4. **Check Secrets**: Verify all required secrets are set (values are masked in logs)

## Cost Considerations

### GitHub Actions Usage

- **Free Tier**: 2,000 minutes/month for private repositories (free for public repos)
- **Typical CI Run**: 3-5 minutes (includes all jobs)
- **Estimated Monthly Usage**: ~150-250 minutes for 50 PRs/month

### Neon Database

- **Free Tier**: Includes sufficient compute and storage for CI testing
- **CI Database**: Uses minimal resources (short-lived test runs)
- **Recommendation**: Use a dedicated Neon project or branch for CI to avoid conflicts with development databases

## Next Steps

After completing this setup:

1. ✅ Create a test pull request to verify CI runs
2. ✅ Review the workflow run logs to ensure all jobs pass
3. ✅ Configure branch protection rules
4. ✅ Update team documentation with CI requirements

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Neon Documentation](https://neon.tech/docs)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)

---

**Questions or Issues?**

If you encounter issues not covered in this guide, please:
1. Check existing GitHub Issues for similar problems
2. Review workflow logs and artifacts
3. Open a new issue with full error details and logs
