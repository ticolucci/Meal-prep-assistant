# Meal-Prep Assistant

A Next.js application that helps you organize your weekly meal prep routine. It combines AI-powered recipe parsing, smart shopping list generation, prep session scheduling, and browser-automated grocery cart filling.

## Tech Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS**
- **Turso** (SQLite) via **Drizzle ORM**
- **Playwright** (headless browser automation for grocery carts)

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# Fill in your Turso credentials in .env.local
npm run dev
```

## Project Structure

See [`docs/index.md`](docs/index.md) for the full project overview, architectural principles, and key file index.

The project uses a **Ralph loop** architecture — see [`prompt.md`](prompt.md) for the autonomous agent prompt and [`stories.yaml`](stories.yaml) for the backlog.
