# Security Tooling and Best Practices Design Document

**Issue:** #22 - [LOW] Security Tooling and Best Practices
**Date:** 2026-01-26
**Severity:** LOW
**Status:** Design Phase

## Overview

Implement three security tooling best practices to establish a security baseline: security.txt file for responsible disclosure, npm audit in CI for vulnerability scanning, and GitHub Dependabot for automated dependency updates.

## Problem Statement

The application lacks security tooling infrastructure:

### 1. Missing security.txt (CWE-1048)

No RFC 9116 `security.txt` file at `/.well-known/security.txt`, meaning:
- No clear responsible disclosure channel
- Security researchers don't know how to report vulnerabilities
- Potential public disclosure without coordination
- Violates security best practice recommendations

### 2. No Dependency Scanning in CI

Vulnerabilities in node_modules go undetected:
- Known vulnerabilities (CVEs) may exist in dependencies
- Manual security reviews are error-prone and infrequent
- No automated enforcement before production deployment
- Compliance violations (SOC 2, PCI DSS require vulnerability scanning)

### 3. No Automated Dependency Updates

Dependencies may become stale and vulnerable:
- Manual updates are time-consuming and forgotten
- Vulnerabilities accumulate over time
- Missed security patches in dependencies
- Increased technical debt

## Solution Architecture

### Approach: Three Independent Security Improvements

Implement three separate but complementary security tools:

1. **security.txt file** (RFC 9116 compliant)
   - Static file at `/.well-known/security.txt`
   - Defines responsible disclosure process
   - Enables security researcher communication

2. **npm audit in CI** (vulnerability scanning)
   - Integration with existing GitHub Actions CI
   - Automated scanning of package-lock.json
   - Blocks PRs with vulnerabilities above threshold

3. **GitHub Dependabot** (automated updates)
   - Platform feature (GitHub configuration)
   - Weekly dependency version updates
   - Creates PRs for review and merging

All three are independent, can be deployed incrementally, and have minimal disruption to existing workflows.

### Component 1: security.txt

**File:** `public/.well-known/security.txt`

**Purpose:** Define security policy and disclosure channel

**Content requirements (RFC 9116):**
- `Contact:` Required - email or URL for reporting
- `Expires:` Required - document expiry date (typically 1 year)
- `Encryption:` Optional - PGP key URL
- `Acknowledgements:` Optional - security hall of fame
- `Preferred-Languages:` Optional - supported languages
- `Canonical:` Optional - canonical URL

**Example content:**
```
# Security Policy

Contact: mailto:security@example.com
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://example.com/.well-known/security.txt
Project: Maka Admin Panel
Source-Code: https://github.com/username/maka-admin-panel
```

### Component 2: npm audit in CI

**Integration point:** `.github/workflows/ci.yml`

**How it works:**
1. CI workflow triggers on PR or push
2. `npm ci` installs dependencies from package-lock.json
3. `npm audit` scans package-lock.json against vulnerability database
4. If vulnerabilities found above threshold → job fails
5. PR blocked until vulnerabilities resolved

**Configuration options:**
- `--audit-level=moderate`: Fails on moderate/high/critical
- `--audit-level=high`: Fails on high/critical only (less strict)
- Can create separate informational job (doesn't block)

### Component 3: GitHub Dependabot

**Configuration file:** `.github/dependabot.yml`

**How it works:**
1. Dependabot checks for new dependency versions weekly
2. Creates PRs with version changes and changelog links
3. CI runs on Dependabot PRs
4. Team reviews and merges
5. Dependencies stay current

**Configuration options:**
- Schedule: `daily`, `weekly`, `monthly`
- `open-pull-requests-limit`: Max concurrent PRs (1-10)
- `target`: "dev" for devDependencies separate update
- Labels: categorize PRs (e.g., "dependencies", "security")
- Allow/ignore rules: selective updates

### Security Properties

**Before:**
- ❌ No responsible disclosure channel
- ❌ Vulnerabilities detected manually (rarely)
- ❌ Dependencies updated manually (infrequently)
- ❌ No automated enforcement

**After:**
- ✅ Responsible disclosure enabled (security.txt)
- ✅ Automated vulnerability scanning (npm audit in CI)
- ✅ Automated dependency updates (Dependabot)
- ✅ Compliance enforcement (SOC 2, PCI DSS)
- ✅ Reduced exposure to known vulnerabilities

### Compliance Mapping

**SOC 2:**
- CC6.3: Monitor and update security patches
- CC7.2: Test and update system controls

**GDPR:**
- Article 32: Security of processing (vulnerability management)

**PCI DSS:**
- Requirement 6.2: Install critical security patches
- Requirement 6.2.3: Install applicable security patches
- Requirement 10.2.6: Review logs of all system components

### Dependencies Between Components

All three components are independent:

- **security.txt:** No dependencies, static file only
- **npm audit in CI:** No dependencies, uses existing CI
- **Dependabot:** Platform feature, no code changes

Can deploy in any order or all at once.

## Implementation Scope

### In Scope
1. Create `public/.well-known/security.txt` with RFC 9116 compliance
2. Integrate `npm audit` into existing CI workflow
3. Create `.github/dependabot.yml` configuration
4. Document security tooling and processes
5. Update deployment documentation

### Out of Scope
- Static code analysis (Semgrep, SonarQube)
- SAST/DAST scanning platforms (Snyk, WhiteSource)
- Bug bounty program
- Security monitoring/alerting (Sentry, Datadog)
- SBOM (Software Bill of Materials) generation
- Automated security reporting

### Future Enhancements

After baseline deployment:
1. **Static code analysis:** Semgrep, SonarQube, ESLint security plugin
2. **Container scanning:** Docker image vulnerability scanning (Trivy, Clair)
3. **SAST/DAST:** Snyk, WhiteSource, Checkmarx
4. **Security monitoring:** Real-time alerts on suspicious activity
5. **Bug bounty:** Program with HackerOne, Bugcrowd
6. **Secrets scanning:** Detect accidentally committed secrets
7. **Compliance reporting:** Automated SOC 2, GDPR, PCI DSS reports

## Testing Strategy

### security.txt Testing

**Manual:**
- Verify file accessible at `https://example.com/.well-known/security.txt`
- Validate content parses correctly
- Check all required fields present (`Contact`, `Expires`)

**Automated:**
- Create E2E test: Fetch URL, validate response code 200
- Validate field presence regex

### npm audit Testing

**Unit/Integration:**
- Create PR with known vulnerable dependency
- Verify CI fails with audit output
- Update dependency to fixed version
- Verify CI passes
- Test `--audit-level=moderate` vs `--audit-level=high`

**Manual:**
- Run locally: `npm audit`
- Review vulnerability reports
- Test `npm audit fix`

### Dependabot Testing

**End-to-end:**
- Wait for Monday (Dependabot runs weekly)
- Verify PR created with proper labels
- Review changelog in PR
- Merge PR, verify dependency updated
- Verify CI passes on Dependabot PR

### Security Tooling Integration Test

**Full workflow:**
1. Create security.txt
2. Deploy to staging
3. Verify URL accessible
4. Integrate npm audit in CI
5. Force a vulnerable dependency (test case)
6. Verify CI blocks PR
7. Enable Dependabot
8. Monitor first Dependabot PRs

## Migration and Deployment

### No Database Changes Required

All three improvements are configuration-only or static files.

### Deployment Steps

**Immediate deployment (independent):**

1. **security.txt:**
   - Create file in repository
   - Commit and merge PR
   - Deploy to production (automatic as static file)
   - Verify URL accessible
   - Set calendar reminder for Dec 2026 to update Expires

2. **npm audit in CI:**
   - Update `.github/workflows/ci.yml`
   - Commit and push
   - Monitor next CI run
   - Adjust `--audit-level` if too many failures

3. **Dependabot:**
   - Create `.github/dependabot.yml`
   - Commit and push
   - Wait for Monday (first PRs)
   - Review and merge initial PRs

**Deployment order:** Any order, all independent.

### Rollback Plan

- **security.txt:** Delete file (no runtime impact)
- **npm audit:** Remove from CI workflow (revert file)
- **Dependabot:** Delete config file (stops updates, existing PRs remain)

No database state, application code, or runtime changes to restore.

### Maintenance

**Annual:**
- Update security.txt Expires field (December 2026)
- Review and update contact information

**Weekly (after initial):**
- Review Dependabot PRs (Mondays)
- Review npm audit results (already in CI logs)

**As needed:**
- Adjust Dependabot schedule/frequency
- Update security documentation
- Respond to security disclosure reports
- Tune npm audit severity level

## Alternatives Considered

### Alternative 1: Only security.txt
- **Pros:** Quickest implementation
- **Cons:** No vulnerability scanning, stale dependencies
- **Rejected:** Need comprehensive baseline

### Alternative 2: Only npm audit
- **Pros:** Automated vulnerability detection
- **Cons:** No responsible disclosure, manual updates
- **Rejected:** Need full tooling ecosystem

### Alternative 3: Only Dependabot
- **Pros:** Automated dependency updates
- **Cons:** No disclosure channel, no CI scanning
- **Rejected:** Need multiple defense layers

### Alternative 4: All three (chosen)
- **Pros:** Comprehensive security baseline
- **Cons:** Three separate changes (but minimal effort each)
- **Selected:** Establishes all critical security practices

## Success Criteria

- ✅ security.txt accessible at production URL
- ✅ security.txt includes Contact and Expires fields
- ✅ npm audit runs on all PRs in CI
- ✅ CI blocks PRs with vulnerable dependencies
- ✅ Dependabot creates weekly dependency update PRs
- ✅ All existing CI jobs still pass (no regression)
- ✅ New security job(s) run successfully
- ✅ Documentation updated with tools and processes

## References

- Design Document: `docs/plans/2026-01-26-security-tooling-design.md`
- Issue: #22 - [LOW] Security Tooling and Best Practices
- RFC 9116: A File Format to Aid in Security Vulnerability Disclosure
- OWASP Dependency Check: https://owasp.org/www-project-dependency-check/
- npm Audit Documentation: https://docs.npmjs.com/cli/audit.html
- GitHub Dependabot: https://docs.github.com/en/code-security/dependabot
- CWE-1048: 2017 CWE Top 25 - Improper Data Sanitization
