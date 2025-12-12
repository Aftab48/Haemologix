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

To enable the Vercel Preview workflow, you must add the following **Repository Secrets** in GitHub Settings:

1. Go to **Settings** → **Secrets and variables** → **Actions**.
2. Add the following secrets:

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

