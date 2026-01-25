# Security Headers

This document explains the security headers implemented in the application and their purpose.

## Implemented Headers

### Content-Security-Policy (CSP)

**Value:** `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`

**Purpose:** Prevents Cross-Site Scripting (XSS) attacks by controlling which resources can be loaded.

**Directives:**
- `default-src 'self'` - Only load resources from the same origin by default
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` - Allow scripts from same origin and inline scripts (needed for Next.js)
- `style-src 'self' 'unsafe-inline'` - Allow styles from same origin and inline styles
- `img-src 'self' data: https:` - Allow images from same origin, data URIs, and HTTPS sources
- `font-src 'self' data:` - Allow fonts from same origin and data URIs
- `connect-src 'self'` - Only allow AJAX/WebSocket connections to same origin
- `frame-ancestors 'none'` - Prevent page from being embedded in iframes

**Note:** The use of `'unsafe-inline'` and `'unsafe-eval'` is currently required for Next.js to function. In a future iteration, these should be replaced with nonces or hashes for better security.

### X-Frame-Options

**Value:** `DENY`

**Purpose:** Prevents clickjacking attacks by not allowing the page to be embedded in any iframe.

**Protection:** Ensures the application cannot be loaded in a frame on another domain, preventing UI redress attacks.

### X-Content-Type-Options

**Value:** `nosniff`

**Purpose:** Prevents MIME type sniffing.

**Protection:** Forces browsers to respect the declared Content-Type, preventing browsers from interpreting files as a different MIME type than declared (which could lead to XSS attacks).

### Referrer-Policy

**Value:** `strict-origin-when-cross-origin`

**Purpose:** Controls how much referrer information is sent with requests.

**Behavior:**
- Same-origin requests: Send full URL
- Cross-origin HTTPS→HTTPS: Send origin only
- Cross-origin HTTPS→HTTP: No referrer sent

**Protection:** Prevents leaking sensitive information in URLs to external sites.

### Permissions-Policy

**Value:** `camera=(), microphone=(), geolocation=()`

**Purpose:** Disables browser features that aren't needed by the application.

**Disabled Features:**
- Camera access
- Microphone access
- Geolocation access

**Protection:** Reduces attack surface by explicitly denying access to sensitive browser APIs.

### Strict-Transport-Security (HSTS)

**Value:** `max-age=31536000; includeSubDomains`

**Environment:** Production only

**Purpose:** Forces browsers to only connect via HTTPS.

**Protection:**
- Prevents man-in-the-middle attacks
- Ensures all communication is encrypted
- Applies to subdomains as well

**Note:** This header is only set in production to avoid issues during local development.

## Testing Security Headers

### Using curl

```bash
curl -I https://your-domain.com
```

### Using online tools

- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

### Using browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Click on the first request
5. Check Response Headers

## Future Improvements

1. **CSP Nonces/Hashes**: Replace `'unsafe-inline'` and `'unsafe-eval'` with nonces or hashes
   - Requires configuring Next.js to inject nonces
   - More secure than allowing all inline scripts

2. **Report-Only Mode**: Add CSP reporting to detect violations without breaking functionality
   ```
   Content-Security-Policy-Report-Only: ...; report-uri /api/csp-report
   ```

3. **Stricter CSP**: As the application matures, tighten CSP directives
   - Remove `'unsafe-inline'` from script-src
   - Remove `'unsafe-eval'` from script-src
   - Whitelist specific external domains instead of `https:`

4. **Additional Headers**: Consider adding
   - `Cross-Origin-Embedder-Policy`
   - `Cross-Origin-Opener-Policy`
   - `Cross-Origin-Resource-Policy`

## Compliance

These security headers help meet requirements for:
- **OWASP Top 10**: Protection against A03:2021 – Injection and A05:2021 – Security Misconfiguration
- **PCI DSS**: Requirement 6.5.7 (Cross-site scripting)
- **SOC 2**: CC6.6 (Logical and physical access controls)
- **GDPR**: Article 32 (Security of processing)

## References

- [MDN - Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP - Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js - Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
