# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the owner, who also built the app. They open it right after a movement (income, outcome or transfer) to log it, almost always on a phone. Friends and family may join later at small scale. Sign-up is public with email verification, and each user's data is isolated from every other user's. Shared accounts between users are a possible future feature, not part of the MVP.

## Product Purpose

Gastar is a personal finance PWA for Argentina. It answers two questions: how much money do I have, and how is my month going. Success means logging a movement takes seconds and the two answers are always right and visible at a glance.

## Positioning

It is private and self-hosted, run for the owner and their friends and family on their own VPS. ARS and USD are separate ledgers that are never converted or summed together. The only link between them is a manually entered exchange-rate transfer. There are no automatic rates.

## Operating Context

- Mobile-first, installable PWA, used one-handed in short sessions right after spending or receiving money.
- Month boundaries and default dates use the `America/Argentina/Buenos_Aires` timezone.
- Currency display is `$ 1.234.568` (ARS) and `US$ 1.234,56` (USD). USD amount input uses a comma as the decimal separator. ARS amounts and rates are whole pesos; USD amounts have up to 2 decimals.
- Navigation is a sticky top bar (back when applicable, date and title, profile avatar) plus a bottom nav: Inicio, Movimientos, create movement (center "+"), Plan, Reportes (Cuentas and Categorías are reached from Perfil).
- Tapping a list item opens a detail page with Edit and Delete. There are no inline row actions. Create and edit share one form.

## Capabilities and Constraints

- Auth is email + password only. Sign-up is public and requires email verification. Password reset is by emailed link.
- Movements are income, outcome or transfer. Transfers never count toward the month balance and have no category.
- Balances and category net are computed at read time, never stored. Money is stored as integer minor units.
- Categories have no type and are shared across currencies, with stats split by currency.
- Reportes shows one currency and month at a time: totals, 6-month income and outcome bars, spending by category, daily average and biggest outcome. Phone OTP is future work, not MVP.
- UI text is Spanish (es-AR). Code, docs and identifiers are English.
- Authoritative detail lives in `docs/SCOPE.md` and `docs/DATA_MODEL.md`.

## Brand Commitments

- Tone: classic, serious-bank feel. The user confirmed this is still the main idea.
- Light and dark themes are both required (light / dark / system toggle on the Profile page).
- Single theme: Pampa (forest green + lime on warm stone), in light and dark. Visual language follows shadcn/ui.
- Typeface in use is DM Sans. The ARQ palette and fonts were inspiration only and are not binding.

## Evidence on Hand

There are no user research, testimonials or metrics, and none should be fabricated. The incumbent UI and the product docs in `docs/` are the only evidence.

## Product Principles

- Speed of entry first: logging a movement right after it happens must be fast on a phone.
- The two core answers (total balance, month balance) must always be correct and visible at a glance.
- Never blur currencies: ARS and USD stay separate and no implicit conversion happens.
- Private by default: self-hosted, verified emails only, strictly isolated per-user data.
- Serious and trustworthy: calm, precise and bank-like, not playful.

## Accessibility & Inclusion

No product-specific accessibility requirement beyond sound basics. Light and dark themes are required.
