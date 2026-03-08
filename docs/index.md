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
| `drizzle.config.ts` | Drizzle ORM / Turso configuration |
| `src/db/index.ts` | Database client connection |

## Architectural Principles

### Evolving Database
Do NOT design the full schema upfront. Each story creates only the tables and columns it immediately needs via Drizzle migrations. When a future story needs schema changes, create a migration to evolve the database. This mirrors TDD: minimal, incremental, just-in-time.

- When implementing a story that needs data persistence, create a new schema file (e.g., `src/db/schema.ts`) or extend the existing one with only the tables/columns required by that story's acceptance criteria.
- Run `npx drizzle-kit generate` to create the migration, then `npx drizzle-kit migrate` to apply it.
- Never add columns or tables "because we'll need them later."
