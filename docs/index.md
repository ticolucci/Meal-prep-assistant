# Meal-Prep Assistant — Project Index

## Overview
A Next.js full-stack application that helps users organize weekly meal prep. It combines AI-powered recipe parsing, smart shopping list generation, prep session scheduling, and browser-automated grocery cart filling (via Playwright).

## Tech Stack
- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Database:** Turso (SQLite) via Drizzle ORM
- **Browser Automation:** Playwright (headless, for grocery cart orchestration)

## Key Files
| File | Purpose |
|------|---------|
| `stories.yaml` | All user stories with acceptance criteria — the Ralph loop reads this to pick its next task |
| `learnings.yaml` | Accumulated technical context from previous Ralph loop iterations |
| `prompt.md` | The system prompt that drives each Ralph loop execution |
| `docs/index.md` | This file — project overview and architectural principles |
| `docs/tos-analysis.md` | Terms of Service analysis for Mathem and ICA (reference only) |
| `docs/architecture.md` | DB schema, page pattern, navigation, data flow — READ THIS to understand how the app is structured |
| `docs/testing.md` | Testing philosophy, pyramid target, mock rules, factory pattern — READ THIS before writing any test |
| `drizzle.config.ts` | Drizzle ORM / Turso configuration |
| `src/db/index.ts` | Database client connection |
| `src/db/schema.ts` | Drizzle table definitions — single source of truth for the DB shape |
| `src/lib/` | Pure functions (no DB, no HTTP) — business logic lives here |
| `src/app/actions/` | Next.js Server Actions — the only place that touches the DB or external APIs |
| `src/components/` | Shared UI components; `*Client.tsx` suffix = `"use client"` |
| `src/test/factories.ts` | DB factory functions for tests — `makeRecipe()`, `makeIngredient()`, etc. |
| `src/db/test-client.ts` | Drizzle client pointed at `file:./test.db` — import this in integration tests |

## Architectural Principles

### Testing
See `docs/testing.md` for the full strategy. Short version: unit tests (Vitest) for pure functions, integration tests (Vitest + real local SQLite `test.db`) for Server Actions and queries, E2E (Playwright) for user journeys only. Mock external HTTP and time; never mock the local DB or internal code.

### Evolving Database
Schema grows incrementally — each story adds only what it immediately needs. See `docs/architecture.md` for the current schema and migration workflow.
