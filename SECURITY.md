# Security Policy

## Reporting a Vulnerability

**Please do not open public issues for security vulnerabilities.**

If you discover a security vulnerability in FlowPay, please email us at security@flowpay.dev with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide an estimated timeline for a fix.

## Security Best Practices

### For Users
- Keep Node.js and dependencies updated
- Use strong JWT secrets in production
- Enable HTTPS in production
- Rotate access tokens regularly
- Monitor logs for suspicious activity

### For Contributors
- Don't commit secrets or sensitive data
- Use environment variables for configuration
- Review security advisories regularly
- Report vulnerabilities responsibly
- Follow secure coding practices

## Dependencies

We actively monitor dependencies for security vulnerabilities using:
- `npm audit`
- `yarn audit`
- GitHub Security Alerts
- Dependabot

All critical vulnerabilities are addressed immediately.

## SSL/TLS

- Always use HTTPS in production
- Keep certificates updated
- Enforce strong TLS versions (1.2+)

## Authentication & Authorization

- JWT tokens expire after 24 hours by default
- Passwords are hashed with bcrypt
- API endpoints require authentication
- Role-based access control implemented

## Data Protection

- Database connections use SSL/TLS
- Sensitive data is encrypted at rest
- API requests are validated and sanitized
- CORS properly configured

## Compliance

We follow security best practices based on:
- OWASP Top 10
- Node.js Security Best Practices
- Stellar Network Security Guidelines

## Security Updates

Security patches are released as:
- Minor version bumps for non-breaking fixes
- Patch releases for critical issues

Users should upgrade promptly when security updates are available.

## Contact

For security inquiries: security@flowpay.dev

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers in our security advisory.
