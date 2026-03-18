# Plan: Deployment Pipeline + Google OAuth Stories

## Overview

Add two new stories to `stories.yaml` and create `docs/deployment.md` with full pipeline documentation. The deployment pipeline mirrors the proven approach from `ticolucci/itunes-port-to-spotify`.

---

## Story 1: `story_12_deployment_pipeline`

### Title: CI/CD Pipeline with Vercel & Turso

### Description
As a developer, I want a GitHub Actions CI/CD pipeline that runs lint, tests, and build checks on every push, deploys to Vercel with Turso database migrations on merge to main, and creates isolated preview environments with branch databases for pull requests.

### Acceptance Criteria
- GitHub Actions workflow `ci-cd.yml` with jobs: `lint` → `test` → `build` → `deploy`/`preview`
- `lint` job runs `npm run lint` and TypeScript type checking
- `test` job runs `npm run test:unit` with test environment variables
- `build` job runs `npm run build` (depends on lint + test passing)
- `deploy` job (push to `main` only): runs `npm run db:migrate` against production Turso, then deploys via Vercel CLI (`vercel pull`, `vercel build --prod`, `vercel deploy --prebuilt --prod`)
- `preview` job (PRs only): creates an isolated Turso branch database `meal-prep-pr-<PR_NUMBER>` seeded from production, runs migrations on it, deploys Vercel preview with branch DB credentials
- `e2e-preview` job (PRs only, after preview): installs Playwright Chromium, extracts preview URL from PR comment, runs `npm run test:e2e` against the live preview
- Separate `cleanup-preview.yml` workflow deletes the Turso branch database when a PR is closed
- `vercel.json` configured with `"ignoreCommand": "exit 0"` to prevent Vercel auto-deploys (all deploys controlled by GitHub Actions so migrations run first)
- `.vercelignore` excludes test files, docs, dev configs, and local DB files from Vercel builds
- `.env.example` created with all required environment variables documented
- `docs/deployment.md` documents the full pipeline, all required secrets, manual setup steps, and troubleshooting

### Files to Create/Modify
1. **Create** `.github/workflows/ci-cd.yml` — main CI/CD pipeline
2. **Create** `.github/workflows/cleanup-preview.yml` — PR cleanup workflow
3. **Create** `vercel.json` — Vercel project config with `ignoreCommand: "exit 0"`
4. **Create** `.vercelignore` — exclude non-deployment files
5. **Create** `.env.example` — document all environment variables
6. **Create** `docs/deployment.md` — full deployment documentation
7. **Modify** `stories.yaml` — add the story definition
8. **Modify** `package.json` — add `db:migrate` and `test:types` scripts if missing
9. **Modify** `playwright.config.ts` — support `BASE_URL` env var override for preview E2E

### Required GitHub Secrets (Manual Setup)

| Secret | Purpose | How to obtain |
|--------|---------|---------------|
| `VERCEL_TOKEN` | Vercel API auth | Vercel Dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel org identifier | Run `vercel link` locally, check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project identifier | Same as above |
| `TURSO_DATABASE_URL` | Production DB URL (`libsql://...`) | `turso db show <db-name> --url` |
| `TURSO_AUTH_TOKEN` | Production DB auth token | `turso db tokens create <db-name>` |
| `TURSO_API_TOKEN` | Turso platform API token (create/delete branch DBs) | `turso auth api-tokens mint ci-cd` |
| `TURSO_ORG_NAME` | Turso organization slug | `turso org list` |
| `TURSO_PRIMARY_DB_NAME` | Production DB name (seed source for branch DBs) | The name you chose when creating the DB |
| `ANTHROPIC_API_KEY` | AI recipe parsing in production | Anthropic Console → API Keys |

### Manual One-Time Setup Steps

1. **Install Turso CLI**: `curl -sSfL https://get.tur.so/install.sh | bash`
2. **Create production database**: `turso db create meal-prep-assistant`
3. **Note the DB URL**: `turso db show meal-prep-assistant --url`
4. **Create auth token**: `turso db tokens create meal-prep-assistant`
5. **Create API token**: `turso auth api-tokens mint ci-cd`
6. **Note org name**: `turso org list`
7. **Install Vercel CLI**: `npm i -g vercel`
8. **Link project**: `cd Meal-prep-assistant && vercel link` (follow prompts)
9. **Note org/project IDs**: `cat .vercel/project.json`
10. **Create Vercel token**: Vercel Dashboard → Settings → Tokens → Create
11. **Add all secrets to GitHub**: Repository → Settings → Secrets and variables → Actions → New repository secret (add each secret from the table above)
12. **Run initial migration**: `TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> npm run db:migrate`
13. **Set Vercel env vars**: In Vercel Dashboard, add `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `ANTHROPIC_API_KEY` as production environment variables

### Pipeline Flow Diagram (for docs/deployment.md)

```
Push to main:
  lint + test (parallel) → build → db:migrate (Turso prod) → vercel deploy --prod

Pull Request opened/updated:
  lint + test (parallel) → build → create Turso branch DB → db:migrate (branch) → vercel deploy preview → E2E tests against preview → post PR comment with status

Pull Request closed:
  cleanup-preview.yml → delete Turso branch DB → post PR comment
```

---

## Story 2: `story_13_google_oauth`

### Title: Google OAuth Authentication

### Description
As a developer, I want to add Google OAuth authentication using NextAuth.js so that only authorized users can access the application, protecting personal meal planning data.

### Acceptance Criteria
- NextAuth.js (Auth.js v5) integrated with Google OAuth provider
- `middleware.ts` protects all routes except `/auth/*`, `/api/auth/*`, and static files
- Login page with "Sign in with Google" button
- `ALLOWED_EMAIL` environment variable restricts access to a single authorized email address
- Session information available in both Server Components and Client Components
- `VERCEL_AUTOMATION_BYPASS_SECRET` support in middleware to allow E2E tests to bypass auth (header: `x-vercel-protection-bypass`)
- **E2E tests updated** to send the bypass header when running against preview deployments (via `BASE_URL` and `VERCEL_AUTOMATION_BYPASS_SECRET` env vars)
- All existing E2E tests continue to pass with auth bypass in CI
- `docs/deployment.md` updated with new required secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `ALLOWED_EMAIL`, `VERCEL_AUTOMATION_BYPASS_SECRET`

### Annotation
> **E2E Impact**: This story requires updating all Playwright E2E tests and the CI/CD preview pipeline (story_12) to inject `VERCEL_AUTOMATION_BYPASS_SECRET` as an env var on preview deployments, and to configure Playwright to send the `x-vercel-protection-bypass` header on all requests when running in CI. The `playwright.config.ts` should add `extraHTTPHeaders` when `VERCEL_AUTOMATION_BYPASS_SECRET` is set.

### Additional GitHub Secrets (Manual Setup)

| Secret | Purpose | How to obtain |
|--------|---------|---------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Same as above |
| `AUTH_SECRET` | NextAuth.js session encryption | `npx auth secret` or `openssl rand -base64 32` |
| `ALLOWED_EMAIL` | Authorized user email | Your Google account email |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | E2E auth bypass in preview | Any strong random string (`openssl rand -hex 16`) |

### Depends On
- `story_12_deployment_pipeline` (for the CI/CD preview pipeline that needs the bypass secret)

---

## Story Ordering in stories.yaml

Insert after `story_11_user_risk_disclosure`:
1. `story_12_deployment_pipeline` — no dependencies on other pending stories
2. `story_13_google_oauth` — depends on `story_12_deployment_pipeline`

---

## docs/deployment.md Outline

The deployment documentation (created as part of story_12) should cover:

1. **Overview** — Pipeline philosophy (migrations before deploys, isolated preview DBs)
2. **Architecture Diagram** — ASCII flow of the pipeline
3. **Prerequisites** — Turso CLI, Vercel CLI, GitHub repo with Actions enabled
4. **One-Time Setup** — Step-by-step with exact commands (the 13 manual steps above)
5. **GitHub Secrets Reference** — Full table of all secrets with descriptions
6. **Pipeline Jobs** — What each job does and when it runs
7. **Preview Environments** — How branch DBs work, lifecycle, cleanup
8. **Local Development** — How to run locally with `file:./local.db`
9. **Database Migrations** — How to create and run migrations
10. **Troubleshooting** — Common issues (migration failures, Turso branch limits, Vercel build errors)
11. **Security Notes** — What's in secrets vs env vars, token rotation
