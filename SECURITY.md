# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| < 0.5   | :x:                |

## Reporting a Vulnerability

The HaemoLogix team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:
- **Primary Contact**: mdalam4884@gmail.com
- **Subject Line**: [SECURITY] Brief description of the issue

### What to Include in Your Report

Please include the following information in your report:
- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Initial Response**: You should receive an acknowledgment within 48 hours
- **Status Updates**: We will keep you informed about our progress
- **Disclosure Timeline**: We aim to patch critical vulnerabilities within 90 days
- **Credit**: We will credit you in our security advisories (unless you prefer to remain anonymous)

## Security Best Practices for Deployment

When deploying HaemoLogix, please ensure:

1. **Environment Variables**: Never commit `.env` files or expose API keys
2. **Database Security**: Use strong passwords and enable SSL/TLS for database connections
3. **Authentication**: Rotate Clerk API keys regularly
4. **Third-Party Services**: Keep all API credentials secure:
   - Twilio (SMS)
   - AWS S3 (File storage)
   - SMTP (Email)
   - OpenCage (Geocoding)
5. **HTTPS Only**: Always deploy with HTTPS enabled
6. **Regular Updates**: Keep dependencies updated to patch known vulnerabilities
7. **Access Control**: Implement proper role-based access control
8. **Data Privacy**: Follow GDPR/local privacy regulations for handling donor and patient data

## Security Features in HaemoLogix

- **Authentication**: Clerk-based secure authentication
- **Authorization**: Role-based access control (Admin, Hospital, Donor)
- **Data Encryption**: SSL/TLS for data in transit
- **Input Validation**: Zod schema validation on all forms
- **HIPAA Considerations**: Designed with medical data privacy in mind
- **Rate Limiting**: Middleware protection against brute force attacks

## Medical Data Compliance

As HaemoLogix handles sensitive medical information:
- Donor eligibility data
- Blood type information
- Health screening results
- Hospital registration details

Please ensure your deployment complies with:
- Local healthcare data protection regulations
- HIPAA (if deploying in the US)
- GDPR (if deploying in the EU)
- India's Digital Personal Data Protection Act (DPDP)

## Responsible Disclosure

We follow a coordinated disclosure process:
1. You report the vulnerability privately
2. We confirm and investigate the issue
3. We develop and test a fix
4. We release a security patch
5. We publicly disclose the vulnerability (with your consent)

Thank you for helping keep HaemoLogix and our users safe!
