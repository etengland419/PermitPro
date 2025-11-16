# Security Policy

## Overview

Security is paramount at PermitPro. This document outlines our security policies, best practices, and incident response procedures.

## Reporting Security Vulnerabilities

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please report security issues to:
- **Email**: security@permitpro.com
- **PGP Key**: Available at https://permitpro.com/security-pgp
- **Expected Response Time**: Within 24 hours

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Bug Bounty Program

We offer rewards for qualifying security vulnerabilities:
- **Critical**: $500 - $2,000
- **High**: $200 - $500
- **Medium**: $100 - $200
- **Low**: Recognition in Hall of Fame

---

## Security Best Practices

### For Developers

#### 1. Authentication & Authorization

**DO:**
- Use bcrypt for password hashing (cost factor: 12)
- Implement 2FA for all accounts
- Use JWT tokens with short expiration (15 minutes)
- Implement refresh token rotation
- Use OAuth 2.0 for third-party integrations

**DON'T:**
- Store passwords in plain text
- Use weak hashing algorithms (MD5, SHA1)
- Share authentication tokens between users
- Store sensitive data in localStorage (use httpOnly cookies)

**Example:**
```javascript
// Good
const hashedPassword = await bcrypt.hash(password, 12);

// Bad
const hashedPassword = md5(password);
```

#### 2. Input Validation

**DO:**
- Validate all user inputs on both client and server
- Use schema validation libraries (Zod, Joi, Yup)
- Sanitize HTML inputs to prevent XSS
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on all endpoints

**DON'T:**
- Trust client-side validation alone
- Use eval() or Function() with user input
- Concatenate user input into SQL queries
- Allow unrestricted file uploads

**Example:**
```javascript
// Good - Parameterized query
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
);

// Bad - SQL injection vulnerability
const result = await db.query(
  `SELECT * FROM users WHERE email = '${userEmail}'`
);
```

#### 3. XSS Prevention

**DO:**
- Escape all user-generated content before rendering
- Use Content Security Policy (CSP) headers
- Sanitize HTML with DOMPurify
- Use React's built-in XSS protection (never use dangerouslySetInnerHTML without sanitization)

**CSP Header:**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.permitpro.com;
  style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
```

#### 4. CSRF Protection

**DO:**
- Include CSRF tokens in all state-changing requests
- Use SameSite cookie attribute
- Validate Origin and Referer headers
- Use double-submit cookie pattern

**Example:**
```javascript
// Express middleware
app.use(csrf({ cookie: { sameSite: 'strict', httpOnly: true } }));
```

#### 5. API Security

**DO:**
- Implement rate limiting (10 req/min for free tier)
- Use API keys with appropriate scopes
- Log all API requests for audit
- Implement request signing for critical operations
- Use HTTPS for all API communication

**Rate Limiting Example:**
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Free tier limit
  message: 'Too many requests, please upgrade your plan'
});

app.use('/api/', apiLimiter);
```

#### 6. Secrets Management

**DO:**
- Store secrets in environment variables
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly (every 90 days)
- Never commit secrets to version control
- Use different secrets for different environments

**DON'T:**
- Hardcode API keys in source code
- Commit .env files to Git
- Share production secrets in chat
- Use the same secret across environments

**.gitignore:**
```
.env
.env.local
.env.*.local
secrets/
*.pem
*.key
```

**Pre-commit Hook:**
```bash
#!/bin/bash
# .git/hooks/pre-commit

if git diff --cached | grep -E 'API_KEY|SECRET|PASSWORD|TOKEN'; then
  echo "ERROR: Potential secret detected!"
  exit 1
fi
```

#### 7. Data Encryption

**At Rest:**
- All database data encrypted using AWS KMS
- Document storage (S3) encrypted with server-side encryption
- Backup encryption enabled

**In Transit:**
- TLS 1.3 required for all connections
- HSTS header enabled
- Certificate pinning for mobile apps

**Example Headers:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

#### 8. File Upload Security

**DO:**
- Validate file types (whitelist approach)
- Scan uploads for malware
- Limit file sizes (10MB max)
- Store uploads in isolated storage (S3)
- Generate random filenames
- Implement virus scanning

**Example:**
```javascript
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const maxSize = 10 * 1024 * 1024; // 10MB

if (!allowedTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

if (file.size > maxSize) {
  throw new Error('File too large');
}
```

#### 9. Dependency Security

**DO:**
- Run `npm audit` before every deployment
- Use Snyk or Dependabot for automated scanning
- Keep dependencies up to date
- Review security advisories weekly
- Use lock files (package-lock.json, yarn.lock)

**CI/CD Integration:**
```yaml
# .github/workflows/security.yml
- name: Run security audit
  run: npm audit --audit-level=high

- name: Check for vulnerabilities
  uses: snyk/actions/node@master
```

#### 10. Logging & Monitoring

**DO:**
- Log all authentication attempts
- Log all data access (audit trail)
- Monitor for unusual patterns
- Set up alerts for security events
- Implement log aggregation (ELK, Datadog)

**DON'T LOG:**
- Passwords or password hashes
- Credit card numbers
- API keys or tokens
- Session IDs
- Personal identifiable information (PII) without masking

**Example:**
```javascript
// Good - Masked data
logger.info('User login', {
  email: maskEmail(user.email),  // u***@example.com
  ip: request.ip
});

// Bad - Exposed PII
logger.info('User login', {
  email: user.email,
  password: user.password  // NEVER!
});
```

---

## Security Checklist for Pull Requests

Before merging any PR, verify:

- [ ] All user inputs are validated
- [ ] No secrets in code or config files
- [ ] SQL queries use parameterization
- [ ] XSS prevention in place for user-generated content
- [ ] CSRF tokens implemented for state changes
- [ ] Rate limiting applied to endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies scanned for vulnerabilities
- [ ] Authentication required for protected routes
- [ ] Authorization checks enforce least privilege
- [ ] Audit logging added for sensitive operations
- [ ] Unit tests include security test cases

---

## Common Vulnerabilities & Mitigations

### OWASP Top 10 Protection

| Vulnerability | Mitigation |
|---------------|------------|
| **A01 Broken Access Control** | Implement role-based access control (RBAC), verify user permissions on every request |
| **A02 Cryptographic Failures** | Use TLS 1.3, encrypt data at rest with AES-256, use bcrypt for passwords |
| **A03 Injection** | Use parameterized queries, input validation, ORM where possible |
| **A04 Insecure Design** | Threat modeling, security reviews, secure by default |
| **A05 Security Misconfiguration** | Security headers, disable debug mode in production, regular updates |
| **A06 Vulnerable Components** | Regular dependency audits, automated scanning |
| **A07 Auth Failures** | Multi-factor authentication, secure session management, rate limiting |
| **A08 Software/Data Integrity** | Code signing, SRI for CDN resources, verify package integrity |
| **A09 Logging Failures** | Comprehensive logging, real-time monitoring, alerting |
| **A10 SSRF** | Validate and sanitize URLs, use allow-lists, network segmentation |

---

## Incident Response Plan

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 - Critical** | Data breach, system compromise | Immediate | Database exposed publicly |
| **P1 - High** | Service degradation, potential data leak | <1 hour | Authentication bypass discovered |
| **P2 - Medium** | Limited impact, no data exposure | <4 hours | XSS vulnerability in low-traffic page |
| **P3 - Low** | Minimal impact | <24 hours | Outdated dependency with no exploit |

### Response Procedure

#### 1. Detection
- Automated alerts (Datadog, PagerDuty)
- Bug bounty reports
- User reports
- Security audits

#### 2. Triage (Within 15 minutes)
- Assess severity
- Determine scope of impact
- Assign incident commander
- Create incident channel (#incident-YYYY-MM-DD)

#### 3. Containment (Immediate)
- **P0**: Shut down affected systems immediately
- **P1**: Rate limit, block IPs, disable affected features
- **P2/P3**: Monitor while developing fix

#### 4. Investigation
- Collect logs and evidence
- Identify root cause
- Determine data exposure
- Document timeline

#### 5. Eradication
- Deploy fix to production
- Verify fix effectiveness
- Update all affected systems

#### 6. Recovery
- Restore normal operations
- Monitor for recurrence
- Verify system integrity

#### 7. Post-Incident
- Write post-mortem within 72 hours
- Notify affected users (if applicable)
- Update security policies
- Implement preventive measures

### Notification Requirements

**Must notify users if:**
- Personal data accessed by unauthorized party
- Payment information compromised
- Account takeover occurred
- Legal requirement (GDPR, CCPA)

**Notification timeline:**
- Email affected users within 72 hours
- Post public incident report within 1 week
- Report to authorities as required by law

---

## Compliance

### SOC 2 Type II
- **Target**: Q3 2025
- **Requirements**: Access controls, encryption, monitoring, incident response

### GDPR Compliance
- Right to access personal data
- Right to deletion (within 30 days)
- Data portability
- Consent management
- Data processing agreements

### PCI DSS (If storing payment info)
- **Current**: Using Stripe (PCI compliant)
- **Never store**: Card numbers, CVV codes
- **Always**: Use tokenization

---

## Security Training

All developers must complete:
- OWASP Top 10 training (annually)
- Secure coding practices (quarterly)
- Incident response drill (bi-annually)

---

## Security Tooling

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Snyk** | Dependency scanning | GitHub Actions |
| **OWASP ZAP** | Penetration testing | Weekly scans |
| **SonarQube** | Code quality & security | CI/CD pipeline |
| **AWS GuardDuty** | Threat detection | AWS account monitoring |
| **Datadog** | Log analysis | Real-time monitoring |
| **1Password** | Secret management | Team-wide |

---

## Contact

For security questions or concerns:
- **Security Team**: security@permitpro.com
- **Emergency**: +1 (555) 123-SECURE
- **Office Hours**: 24/7 for P0/P1 incidents

---

**Last Updated**: 2024-01-15
**Next Review**: 2024-04-15
**Owner**: Security Team Lead
