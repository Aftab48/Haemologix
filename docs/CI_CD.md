# 🚀 CI/CD Pipeline Documentation

HaemoLogix uses **GitHub Actions** for continuous integration, security scanning, and deployment previews.

## 🛠️ Workflows Overview

| Workflow | File | Triggers | Description |
|----------|------|----------|-------------|
| **CI** | `ci.yml` | Push, PR | Lints code (`npm run lint`), checks types (`tsc`), and verifies build (`npm run build`). |
| **Security** | `security.yml` | Push, PR, Weekly | Runs CodeQL analysis and scans new dependencies for vulnerabilities. |
| **Preview** | `preview.yml` | PR | Deploys a preview environment to Vercel for every Pull Request. |
| **Dependabot** | `dependabot.yml` | Weekly/Monthly | Automatically updates npm packages and GitHub Actions. |

## 🔑 Required Secrets

### For CI Build Workflow

To enable the CI build workflow, you **must** add the following **Repository Secrets** in GitHub Settings:

1. Go to **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add each secret:

| Secret Name | Required | Description | Where to Find |
|-------------|----------|-------------|---------------|
| `CI_CLERK_PUBLISHABLE_KEY` | ✅ **Required** | Clerk Publishable Key (test key is fine for CI) | [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys) - Use a **test** key (starts with `pk_test_`) |
| `CI_CLERK_SECRET_KEY` | ✅ **Required** | Clerk Secret Key (test key is fine for CI) | [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys) - Use a **test** key (starts with `sk_test_`) |
| `CI_DATABASE_URL` | ⚠️ Optional | PostgreSQL connection string (dummy is fine for build) | Format: `postgresql://user:pass@host:port/db?sslmode=disable` |
| `CI_GOOGLE_MAPS_API_KEY` | ⚠️ Optional | Google Maps API Key | [Google Cloud Console](https://console.cloud.google.com/) or use placeholder |

**Important Notes**:
- **Clerk keys are REQUIRED** - Clerk validates key format during build, so you must use real test keys from your Clerk dashboard
- Test keys are safe for CI - they won't affect production and are designed for development/testing
- If secrets are not set, the build will fail with a clear error message
- You can create a free Clerk account and use test keys specifically for CI builds

### For Vercel Preview Workflow

To enable the Vercel Preview workflow, add these additional secrets:

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel API Token | [Vercel Account Settings](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel Organization ID | Vercel Project Settings (`.vercel/project.json` if linked) |
| `VERCEL_PROJECT_ID` | Vercel Project ID | Vercel Project Settings |

## 🛡️ Security Features

- **CodeQL**: Automatically detects security vulnerabilities in your JavaScript/TypeScript code.
- **Dependency Review**: Blocks Pull Requests that introduce packages with known critical vulnerabilities.
- **Type Checking**: Ensures TypeScript safety before merging.
- **Linting**: Enforces code style and best practices.

## 📦 Deployment Flow

1. **Pull Request**: 
   - Code is linted, type-checked, and built.
   - Security scan runs.
   - Vercel deploys a unique preview URL (e.g., `haemologix-git-feature-x.vercel.app`).
   - Bot comments on the PR with the preview link.

2. **Merge to Main**:
   - Production deployment is handled automatically by Vercel integration (connected to GitHub).

---

*This pipeline ensures that only high-quality, secure code reaches production.*

