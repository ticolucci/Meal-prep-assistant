# Terms of Service Analysis: Mathem & ICA

## Purpose
This document summarizes the ToS review for Mathem and ICA, the two grocery delivery services targeted by the Playwright cart automation feature (Story 10).

## Key Findings

### Mathem
- Mathem's ToS do not explicitly prohibit browser automation or scripting.
- The ToS focus on account misuse, resale, and commercial scraping — none of which apply to a personal meal-prep tool filling your own cart.
- No rate-limiting or bot-detection clauses were found in the public ToS.

### ICA
- ICA's ToS similarly do not explicitly prohibit browser automation for personal use.
- Their terms focus on unauthorized access, commercial data extraction, and account sharing.
- Personal/family use of automation to manage your own shopping cart does not violate any stated clause.

## Risk Assessment
- **Personal/family use:** Effectively zero legal risk. Both services' ToS target commercial abuse, not personal productivity tools.
- **Rate of requests:** The app sends a small number of requests (one per shopping list item) — indistinguishable from normal browsing.
- **Credential handling:** The app does NOT store or manage user credentials. The user logs in manually; the tool only automates cart operations within an already-authenticated session.

## Mitigations Built Into the App
1. **First-run disclaimer/consent screen** — the user must acknowledge how the tool works before using automation features.
2. **Manual login** — the user handles authentication themselves; the tool never touches credentials.
3. **Cart review before checkout** — the tool adds items to the cart but never confirms an order. The user must review and confirm manually.
4. **Transparent operation** — the user can see what items were added and which were missed/out-of-stock.
