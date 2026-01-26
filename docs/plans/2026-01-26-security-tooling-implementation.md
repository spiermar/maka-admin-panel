# Security Tooling and Best Practices Implementation Plan

**Issue:** #22 - [LOW] Security Tooling and Best Practices
**Design:** docs/plans/2026-01-26-security-tooling-design.md
**Estimated Time:** 1-2 hours
**Priority:** LOW

## Overview

Implement three security tooling improvements: security.txt file, npm audit in CI, and GitHub Dependabot configuration.

## Implementation Steps

### Step 1: Create security.txt File

**File:** `public/.well-known/security.txt` (new)

```
# Security Policy

# Contact Information
Contact: mailto:security@example.com

# Policy Expiration (Update annually)
Expires: 2026-12-31T23:59:59.000Z

# Language
Preferred-Languages: en

# Canonical URL
Canonical: https://example.com/.well-known/security.txt

# Project Information
Project: Maka Admin Panel
Source-Code: https://github.com/username/maka-admin-panel

# Additional Information (Optional)
# Encryption: https://example.com/pgp-key.txt
# Acknowledgements: https://example.com/security-hall-of-fame
# Policy: https://example.com/security-policy
# Hiring: https://example.com/jobs
# Bug-Bounty: https://example.com/bug-bounty

# Important: Update this file annually
```

**Customization required:**
- Replace `security@example.com` with actual security contact email
- Replace `https://example.com` with actual production URL
- Update `Source-Code` with actual GitHub repository URL
- Add `Encryption` field if PGP key available
- Add `Acknowledgements` field with security hall of fame URL
- Add `Policy` field with detailed security documentation URL
- Add `Hiring` field if hiring security researchers
- Add `Bug-Bounty` field if bug bounty program exists

**Format requirements:**
- Plain text file
- Field format: `FieldName: value`
- Comments start with `#`
- Recommended max line length: 80 chars

### Step 2: Add npm audit to CI

**File:** `.github/workflows/ci.yml` (modify)

Add new security-scan job or integrate into existing lint/test job:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  # ... existing jobs ...

  security-scan:
    runs-on: ubuntu-latest
    name: Security Audit
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Dependency review
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: moderate
```

**Alternative: Add to existing job**

If you prefer minimal changes, add to an existing job:

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    # ... existing steps ...
    - name: Security audit
      run: npm audit --audit-level=moderate
```

**Configuration options:**
- `--audit-level=low`: Fails on low/moderate/high/critical (most strict)
- `--audit-level=moderate`: Fails on moderate/high/critical (recommended)
- `--audit-level=high`: Fails on high/critical (less strict)
- `--audit-level=critical`: Fails on critical only (least strict)

**Decision guidance:**
- Start with `moderate` (recommended)
- Adjust to `high` if too many false positives
- Don't use `low` (too strict, many false positives)

### Step 3: Create Dependabot Configuration

**File:** `.github/dependabot.yml` (new)

```yaml
version: 2
updates:
  # Production dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
   commit-message:
      prefix: "chore(deps)"
      prefix-development: "chore(dev-deps)"
    # Version update strategy
    versioning-strategy: increase
    
    # Allow specific packages (optional, for security patches only)
    allow:
      - dependency-type: "direct"
      
    # Ignore versions (optional)
    ignore:
      - dependency-name: "some-package"
        update-types: ["version-update:semver-major"]
  
  # Development dependencies
  - package-ecosystem: "npm"
    directory: "/"
    target: "dev"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "dev"
    commit-message:
      prefix: "chore(dev-deps)"
    versioning-strategy: increase
```

**Configuration options:**
- `interval`: `daily`, `weekly`, `monthly`
- `day`: Day of week (monday, tuesday, etc.)
- `time`: Time of day (UTC, in "HH:MM" format)
- `open-pull-requests-limit`: Max concurrent PRs (1-10)
- `labels`: Array of labels to apply to PRs

**Customization for this project:**
1. Check GitHub repo settings → "Actions" → "General" → "Permissions" → "Workflow permissions"
2. Ensure "Allow GitHub Actions to create and approve pull requests" is enabled for Dependabot

### Step 4: Update Documentation

**File:** `docs/SECURITY_TOOLING.md` (new)

```markdown
# Security Tooling

## Overview

The application uses multiple automated security tools to maintain security posture and detect vulnerabilities early.

## Responsible Disclosure

**Report vulnerabilities to:** security@example.com

Please report security vulnerabilities responsibly following our security.txt file:
https://example.com/.well-known/security.txt

We will:
- Acknowledge receipt within 24-48 hours
- Provide a timeline for analysis and remediation
- Coordinate disclosure to protect users
- Credit researchers in our security hall of fame

## Dependency Security

### Automated Scanning

**Tool:** npm audit (integrated via GitHub Actions CI)

**When runs:** Every PR and push to main

**Behavior:**
- Scans `package-lock.json` against npm vulnerability database
- Blocks PRs with moderate or higher vulnerabilities
- Provides detailed vulnerability reports in CI logs
- Fails CI build if vulnerabilities found

**Severity levels:**
- **Moderate:** May have some impact
- **High:** Significant impact, likely exploitable
- **Critical:** Widespread exploitation possible

**Viewing scan results:**
- Check GitHub Actions CI logs
- Search for "vulnerabilities" or "npm audit"
- Review affected packages and versions

**Fixing vulnerabilities:**
1. Run locally: `npm audit`
2. Review vulnerability details
3. Update affected packages:
   ```bash
   npm audit fix
   # or manually update
   npm update <package-name>
   ```
4. Commit and push
5. Verify CI passes

### Automated Updates

**Tool:** GitHub Dependabot

**When runs:** Weekly (Monday 6am UTC)

**Behavior:**
- Checks for new dependency versions
- Creates PRs with version updates
- Includes changelog links in PR descriptions
- Uses semantic commit messages (`chore(deps)`)

**Reviewing Dependabot PRs:**
1. Check Dependabot PR on Mondays
2. Review changelog links for breaking changes
3. Run tests locally (or wait for CI)
4. Merge if tests pass
5. Tag releases as needed

**Configuration:**
- Production dependencies: `chore(deps)` prefix
- Development dependencies: `chore(dev-deps)` prefix
- Labels: `dependencies`, `security`, `dev`

**Ignoring vulnerabilities (last resort):**

If a vulnerability has no fix or is false positive:

1. **False positive:** Report to npm, add to `npm audit` ignore
2. **No fix available:** Create audit exception:
   ```bash
   npm audit fix --audit-level=moderate --force
   ```
3. **Document exception:** Add note to security documentation

## Manual Audits

### Check vulnerabilities locally

```bash
npm audit
```

### Check vulnerabilities with specific severity

```bash
npm audit --audit-level=high
```

### Generate vulnerability report

```bash
npm json > package.json
npm audit --json > audit-report.json
```

## Security Best Practices

### Development

1. **Never commit:** API keys, secrets, passwords
2. **Review PRs:** Check dependency changes for security issues
3. **Use .npmrc:** Configure npm security settings:
   ```ini
   # .npmrc
   audit-level=moderate
   ```
4. **Pin major versions:** Prevent unexpected breaking changes in dependencies

### Deployment

1. **Before deploy:** Ensure CI passes all security checks
2. **Review vulnerabilities**: Check npm audit output in CI logs
3. **Update dependencies:** Merge Dependabot PRs regularly
4. **Emergency patches:** Dependabot may create out-of-band security PRs

3. **Monitoring:**
   - Check CI logs for new vulnerabilities
   - Review security advisories from npm
   - Subscribe to security bulletin (GitHub security alerts)

## Security Resources

- **npm Audit Documentation:** https://docs.npmjs.com/cli/audit.html
- **GitHub Dependabot:** https://docs.github.com/en/code-security/dependabot
- **GitHub Security Advisories:** https://github.com/advisories
- **npm Security Advisories:** https://www.npmjs.com/advisories
- **Node.js Security:** https://nodejs.org/en/security/
- **OWASP Dependency Check:** https://owasp.org/www-project-dependency-check/

## Emergency Response

### Critical vulnerability in production

1. **Assess:** Severity and impact
2. **Check:** Is exploit active in production?
3. **Patch:** Update vulnerable dependency immediately
4. **Deploy:** Hotfix to production
5. **Notify:** Security team, stakeholders
6. **Post-mortem:** Document and improve process

### Zero-day vulnerability

1. **Monitor:** CVE databases, GitHub Security Advisories
2. **Assess:** Exposure of your application
3. **Mitigate:** WAF rules, network-level blocking
4. **Patch:** Update dependency when fix is available
5. **Deploy:** Emergency deployment if active exploits
```

**File:** Update `README.md` (or create new section):

```markdown
## Security

### Reporting Vulnerabilities

Please report security vulnerabilities responsibly via:
- Email: security@example.com
- Security Policy: https://example.com/.well-known/security.txt

### Security Tools

The application uses automated security tools:
- **npm audit:** Scans dependencies for vulnerabilities
- **GitHub Dependabot:** Automated dependency updates
- **GitHub Actions CI:** Enforces security policies

See [Security Tooling Documentation](docs/SECURITY_TOOLING.md) for details.
```

### Step 5: Testing Checklist

**Before committing each improvement:**

**security.txt:**
- [ ] Create file at `public/.well-known/security.txt`
- [ ] Customize contact email and URLs
- [ ] Verify format follows RFC 9116
- [ ] Set calendar reminder for Dec 2026 to update `Expires`
- [ ] Deploy to production, verify URL accessible: `curl https://example.com/.well-known/security.txt`

**npm audit:**
- [ ] Update CI workflow with security-scan job
- [ ] Test locally: `npm audit --audit-level=moderate`
- [ ] Create test PR to verify CI includes audit job
- [ ] Verify audit output in CI logs
- [ ] Test with vulnerable dependency if available

**Dependabot:**
- [ ] Create dependabot.yml configuration
- [ ] Verify YAML syntax
- [ ] Verify GitHub Actions permissions enabled for Dependabot
- [ ] Wait for Monday to observe first PR(s)
- [ ] Review Dependabot PR for proper content
- [ ] Merge test PR, verify dependency updated

### Step 6: Add Calendar Reminder

Set a reminder in your calendar for **December 2026** (or one year from today):

**Event:** Update security.txt Expires field
**Date:** December 1, 2026 (or one year from today)
**Notes:** Update Expires field in `public/.well-known/security.txt` to December 2027

### Step 7: Create Feature Branches

Each improvement can be its own branch or combined:

```bash
# Option 1: Separate branches (recommended for review)
git checkout -b docs/add-security-txt-file
git checkout -b ci/add-npm-audit
git checkout -b ci/enable-dependabot

# Option 2: Combined branch
git checkout -b feat/security-add-tooling-baseline
```

### Step 8: Commit Changes

**Commit 1: security.txt**

```bash
git add public/.well-known/security.txt
git commit -m "docs: add security.txt for responsible disclosure

- RFC 9116 compliant security policy file
- Enables security researchers to report vulnerabilities
- Contact: security@example.com
- Expires: 2026-12-31T23:59:59.000Z
- Closes #22 (security.txt)"
```

**Commit 2: npm audit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add npm audit to security scanning

- Run npm audit on all PRs
- Block PRs with moderate+ vulnerabilities
- Add dependency review action
- Automates vulnerability detection
- Closes #22 (npm audit)"
```

**Commit 3: Dependabot**

```bash
git add .github/dependabot.yml docs/SECURITY_TOOLING.md
git commit -m "ci: enable GitHub Dependabot for automated dependency updates

- Check for updates weekly (Monday 6am UTC)
- Separate handling for prod/dev dependencies
- Automated PRs with dependency version updates
- Keeps dependencies current with minimal effort
- Closes #22 (Dependabot)"
```

### Step 9: Deploy to Staging/Production

All three improvements can be deployed immediately and independently:

**1. security.txt:**
- Merge PR to main
- Deploy to production (automatic as static file)
- Verify URL accessible: `curl https://example.com/.well-known/security.txt`
- Update team documentation
- **No production deployment needed** (just file commit)

**2. npm audit:**
- Merge PR to main
- No production deployment needed (CI-only)
- Monitor first CI run on next PR
- Adjust `--audit-level` if too many failures
- Review CI logs for vulnerabilities

**3. Dependabot:**
- Merge PR to main
- No deployment needed (platform feature)
- Wait for Monday (first PRs)
- Monitor Dependabot activity
- Review and merge initial PRs

## Files Modified/Created

| File | Type | Action |
|------|------|--------|
| `public/.well-known/security.txt` | New | Create |
| `.github/workflows/ci.yml` | Edit | Add npm audit job |
| `.github/dependabot.yml` | New | Create |
| `docs/SECURITY_TOOLING.md` | New | Create |
| `README.md` | Edit | Add Security section |

## Verification Commands

**security.txt:**
```bash
# Verify file accessible
curl -I https://example.com/.well-known/security.txt

# Should return:
# HTTP/2 200
# content-type: text/plain; charset=utf-8
```

**npm audit:**
```bash
# Run locally
npm audit

# Run with specific severity
npm audit --audit-level=moderate

# Try to fix vulnerabilities (non-breaking changes only)
npm audit fix

# Force fix (may break things)
npm audit fix --force
```

**Dependabot:**
```bash
# Check configuration valid
yamllint .github/dependabot.yml

# View Dependabot status
gh repo dependabot-alerts

# View Dependabot updates
gh repo dependabot-updates
```

## Success Criteria

- ✅ security.txt accessible at production URL
- ✅ security.txt includes contact and expires fields
- ✅ security.txt follows RFC 9116 format
- ✅ npm audit runs on all PRs in CI
- ✅ CI blocks PRs with vulnerable dependencies
- ✅ Dependabot creates weekly dependency update PRs
- ✅ All existing CI jobs still pass (no regression)
- ✅ New security job(s) run successfully
- ✅ Documentation updated with tools and processes
- ✅ Calendar reminder set for Expires field update

## Rollback Plan

- **security.txt:** Delete file (no runtime impact)
- **npm audit:** Remove security-scan job from CI workflow
- **Dependabot:** Delete `dependabot.yml` (stops automated updates)

No runtime or database changes, rollback is non-destructive.

## Monitoring

### Metrics to Track

**npm audit:**
- Failed CI jobs due to vulnerabilities
- Vulnerability severity distribution
- Time to fix vulnerabilities (PR to fix)

**Dependabot:**
- Number of Dependabot PRs per week
- Time to review and merge Dependabot PRs
- Dependency freshness (days behind latest)

### Alerts

- CI failure due to new vulnerability
- Dependabot PRs with severity labels
- Security advisories for dependencies in use

## Maintenance

**Annual:**
- Update security.txt Expires field (Dec 2026)
- Review and update contact information
- Review security tooling configuration

**Weekly:**
- Review Dependabot PRs (Mondays)
- Review npm audit results (already in CI logs)

**As needed:**
- Adjust Dependabot schedule/frequency
- Update security documentation
- Tune npm audit severity level
- Respond to security disclosure reports

## Troubleshooting

**Issue: npm audit false positives**

```bash
# Review vulnerability details
npm audit --json

# If false positive, report to npm
# Document exception in security documentation
# Ignore temporarily (not recommended)
npm audit fix --audit-level=high --force
```

**Issue: Dependabot not creating PRs**

```bash
# Check GitHub Actions permissions
gh repo view --json actionsWorkflowPermissions

# Check Dependabot enabled
gh repo dependabot-status

# Verify YAML syntax
yamllint .github/dependabot.yml

# Check logs
gh logs dependabot
```

**Issue: security.txt not accessible**

```bash
# Verify file in public folder
ls -la public/.well-known/security.txt

# Check Next.js static file serving
curl -I http://localhost:3000/.well-known/security.txt

# Check hosting configuration (Vercel, Netlify, etc.)
```

## Future Enhancements

**Static Code Analysis:**
- Semgrep (security patterns)
- SonarQube (code quality + security)
- ESLint security plugin
- CodeQL (GitHub Advanced Security)

**Container Scanning:**
- Trivy (container vulnerability scanning)
- Clair (container security)

**SAST/DAST Platforms:**
- Snyk (dependency and code security)
- WhiteSource (software composition analysis)
- Checkmarx (application security testing)

**Security Monitoring:**
- Sentry (error tracking with security context)
- Datadog Security Monitoring
- ELK Stack (log aggregation and security analysis)

**Compliance Reporting:**
- Automated SOC 2 report generation
- GDPR compliance dashboards
- PCI DSS compliance verification

**Secrets Scanning:**
- GitGuardian (detect secrets in code)
- TruffleHog (find secrets in repositories)

**SBOM Generation:**
- Software Bill of Materials for compliance
- CycloneDX or SPDX format

**Bug Bounty Program:**
- Platform: HackerOne, Bugcrowd, Intigriti
- Rewards and scope definition
- Disclosure workflow

## References

- RFC 9116: A File Format to Aid in Security Vulnerability Disclosure
- npm Audit Documentation: https://docs.npmjs.com/cli/audit.html
- GitHub Dependabot: https://docs.github.com/en/code-security/dependabot
- GitHub Security Advisories: https://github.com/advisories
- OWASP Dependency Checker: https://owasp.org/www-project-dependency-check/
- CWE-1048: Improper Data Sanitization (security.txt)
- CWE-1104: Use of Unmaintained Third Party Components
