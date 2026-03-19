# Deployment

This project uses **GitHub Actions** for CI/CD, **Vercel** for hosting, and **Turso** (cloud SQLite) for the production database.

All deployments are controlled by GitHub Actions — Vercel's automatic deployments are disabled via `ignoreCommand: "exit 0"` in `vercel.json` so that database migrations always run before deployment.

## Pipeline Overview

```
Push to main:
  lint + test (parallel) → build → db:migrate (Turso prod) → vercel deploy --prod

Pull Request opened/updated:
  lint + test (parallel) → build → create Turso branch DB → db:migrate (branch) → vercel deploy preview → E2E tests → PR comment

Pull Request closed:
  cleanup-preview.yml → delete Turso branch DB → PR comment
```

## Pipeline Jobs

### `ci-cd.yml`

| Job | Trigger | Depends On | What It Does |
|-----|---------|------------|--------------|
| **lint** | all | — | Runs `npm run lint` and `npm run test:types` |
| **test** | all | — | Runs `npm run test:unit` with local SQLite |
| **build** | all | lint, test | Runs `npm run build` |
| **deploy** | push to main | lint, test, build | Migrates prod DB, deploys to Vercel production |
| **preview** | pull requests | lint, test, build | Creates branch DB, migrates it, deploys Vercel preview, posts PR comment |
| **e2e-preview** | pull requests | preview | Runs Playwright E2E tests against the live preview URL |

### `cleanup-preview.yml`

Triggered when a PR is closed (merged or abandoned). Deletes the Turso branch database `meal-prep-pr-<PR_NUMBER>` and posts a confirmation comment.

## Preview Environments

Each pull request gets a fully isolated environment:

1. **Branch database**: A Turso database `meal-prep-pr-<PR_NUMBER>` is created, seeded from the production database. Migrations are applied to it.
2. **Preview deployment**: A Vercel preview is deployed with the branch DB credentials.
3. **E2E tests**: Playwright runs against the live preview URL.
4. **Cleanup**: When the PR is closed, the branch database is automatically deleted.

This ensures every PR is tested against a realistic database without affecting production data.

## Required GitHub Secrets

Configure these in **Repository → Settings → Secrets and variables → Actions**.

### Vercel

| Secret | Description | How to Obtain |
|--------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel API authentication token | [Vercel Dashboard](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID` | Vercel organization/team ID | Run `vercel link` locally → check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project ID | Same file as above |

### Turso

| Secret | Description | How to Obtain |
|--------|-------------|---------------|
| `TURSO_DATABASE_URL` | Production DB URL (`libsql://...`) | `turso db show <db-name> --url` |
| `TURSO_AUTH_TOKEN` | Production DB auth token | `turso db tokens create <db-name>` |
| `TURSO_API_TOKEN` | Platform API token (manage branch DBs) | `turso auth api-tokens mint ci-cd` |
| `TURSO_ORG_NAME` | Turso organization slug | `turso org list` |
| `TURSO_PRIMARY_DB_NAME` | Production DB name (seed source) | The name you chose when creating the DB |

### Application

| Secret | Description | How to Obtain |
|--------|-------------|---------------|
| `ANTHROPIC_API_KEY` | AI recipe parsing in production | [Anthropic Console](https://console.anthropic.com/) → API Keys |

## One-Time Manual Setup

### 1. Install CLIs

```bash
# Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login

# Vercel CLI
npm i -g vercel
```

### 2. Create Turso production database

```bash
turso db create meal-prep-assistant
turso db show meal-prep-assistant --url    # → note the libsql:// URL
turso db tokens create meal-prep-assistant  # → note the auth token
turso auth api-tokens mint ci-cd            # → note the API token
turso org list                              # → note the org name
```

### 3. Link Vercel project

```bash
cd Meal-prep-assistant
vercel link    # follow prompts to connect to your Vercel account/project
cat .vercel/project.json    # → note orgId and projectId
```

Create a Vercel API token at https://vercel.com/account/tokens.

### 4. Set Vercel environment variables

In the [Vercel Dashboard](https://vercel.com/), go to your project → Settings → Environment Variables and add:

- `TURSO_DATABASE_URL` — production URL (for all environments)
- `TURSO_AUTH_TOKEN` — production token (for all environments)
- `ANTHROPIC_API_KEY` — your Anthropic API key (for all environments)

### 5. Add GitHub secrets

Go to your repository on GitHub → Settings → Secrets and variables → Actions → New repository secret.

Add each secret from the tables above:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `TURSO_API_TOKEN`
- `TURSO_ORG_NAME`
- `TURSO_PRIMARY_DB_NAME`
- `ANTHROPIC_API_KEY`

### 6. Run initial migration

```bash
TURSO_DATABASE_URL=<your-libsql-url> TURSO_AUTH_TOKEN=<your-token> npm run db:migrate
```

## Local Development

Local development uses a file-based SQLite database — no Turso account needed.

```bash
cp .env.example .env.local
# Edit .env.local with your ANTHROPIC_API_KEY

# Run migrations against local DB
TURSO_DATABASE_URL=file:./local.db TURSO_AUTH_TOKEN=local npm run db:migrate

# Start dev server
npm run dev
```

## Database Migrations

Migrations are managed by [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview).

```bash
# Generate a new migration after changing src/db/schema.ts
npx drizzle-kit generate

# Apply migrations locally
TURSO_DATABASE_URL=file:./local.db TURSO_AUTH_TOKEN=local npm run db:migrate

# Apply migrations to production (done automatically by CI/CD)
TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> npm run db:migrate
```

There is no automatic rollback — if a migration needs to be reversed, create a new migration that undoes the changes.

## Key Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci-cd.yml` | Main CI/CD pipeline |
| `.github/workflows/cleanup-preview.yml` | PR branch DB cleanup |
| `vercel.json` | Vercel config with `ignoreCommand: "exit 0"` |
| `.vercelignore` | Files excluded from Vercel builds |
| `drizzle.config.ts` | Drizzle ORM migration config |
| `playwright.config.ts` | E2E config (supports `BASE_URL` for preview testing) |

## Troubleshooting

### Migration fails in CI

Check that `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` secrets are set correctly. For branch databases, ensure `TURSO_API_TOKEN` has permission to create databases.

### Vercel deploys on its own

Ensure `vercel.json` has `"ignoreCommand": "exit 0"`. This tells Vercel to skip all automatic deployments.

### E2E tests fail against preview

- Verify the preview URL is accessible (it may take a few seconds after deployment)
- Check that `BASE_URL` is being passed correctly to the E2E job
- Review the Playwright report artifact uploaded to the GitHub Actions run

### Turso branch database limit

Turso has a limit on the number of databases per organization. If branch DB creation fails, check if old branch databases need to be cleaned up manually:

```bash
turso db list
turso db destroy meal-prep-pr-<number>
```

### Build fails with missing env vars

The build job uses dummy local DB credentials (`file:./build.db`). If the build requires other env vars, add them to the build step in `ci-cd.yml`.
