# Redesign D: implementation plan

Source of truth for screens: canvas artifact https://claude.ai/artifact/Rhn3LKGsWWTN5q5y3wHpf6 and `co-review.md` (item ids DR1, PL5, RE2, CT1, MO1-4, IV1-3, AU1-5, ...). Phase 1 commits both notes to `docs/redesign/`.

## Decisions (agreed with the user, 2026-11-27)

| # | Decision |
|---|---|
| D1 | No hardcoded values. Visual values (colour, radius, size, spacing, type, motion) come only from tokens in `app.css`. Business numbers (limits, cooldowns, durations, page sizes) come only from constants modules. All user-facing text comes from one catalogue. |
| D2 | The catalogue is a typed TS module, `src/lib/copy/es.ts`, es-AR only, with no dependency. Keys are grouped by screen, and functions cover text with variables (plurals, amounts). It covers UI text (screens, drawers, toasts), server error messages and emails. |
| D3 | Components: one base per pattern, plus thin domain wrappers that only compose bases. Duplicates are deleted. Routes never import `ui/` (shadcn) directly. |
| D4 | Both themes stay. Every token gets a light value derived from the current palette, and the base-components PR includes screenshots in light and dark. |
| D5 | DR1: drawers have no full page. A direct URL (e.g. `/movements/123`) loads the parent screen with that drawer open, so notification and email links keep working. |
| D6 | Categories and accounts always have an icon and colour. Forms require them. Existing rows are backfilled: by name from the catalogue, otherwise a deterministic pick. NOT NULL comes in a later release (expand/contract). |
| D7 | Enforcement: ESLint in CI blocks arbitrary Tailwind values, raw colours, inline `style=`, `ui/` imports from routes, and literal text in markup. Not-yet-migrated files sit on a legacy allowlist that each phase shrinks; the last phase deletes the list. |
| D8 | Order: foundations first, then base components, then screen by screen. |
| D9 | Delivery: one PR per phase to `develop`, stacked when a phase depends on the previous one. The user merges. Full pipeline with verifier; Opus verifier for the data/migration and auth phases. |

## Token additions (phase 1)

- **Size scale.** Today's design uses `--size-lead` 36, `--size-hero` 56, `--size-control` 44, `--size-field` 52, `--size-nav` 60, `--size-glyph-chip` 20, `--icon-sm/md/lg` 18/22/24.
- **Radius.** Keep `--radius-card` (20px) and `--radius-pill` (999px). Retire `--radius` / `--radius-sm|md|lg|xl` wherever they are unused after phase 2.
- **Spacing.** Define the page gutter, group gap and row padding as tokens.
- **Motion.** Sheet/spring/slide timings move from `edge-swipe-back.ts` to tokens or constants.
- **Colour.** Normalise the swatches and semantic colours to one colour space (oklch). Add `--tone-income`, `--tone-expense` and `--tone-neutral`, which map to positive, negative and text.
- **Icon component.** `Icon` `size` takes only a token name (sm/md/lg), not a CSS string.

## Base components (phase 2)

| Base | Replaces | Notes |
|---|---|---|
| `Glyph` | IconBadge, GlyphNameHead's lead, dot leads | Takes a category, an account, or an icon with a tone. Sizes sm/md/lg (chip 20 / lead 36 / hero 56). Implements CT1. |
| `Row` + `Group` + `SectionLabel` | ListRow, GlyphRow, TextRow, DetailRow, RowPill, StatusPill, ListCard, CardEyebrow, SectionHeader | Row has slots for lead, title/subtitle and trailing (value, chevron, toggle, amount). |
| `Amount` | Money, HeroAmount | Takes a tone (income/expense/neutral), no signs, and sizes row/tile/hero. One figure per currency. |
| `Header` | PageHeader, DetailHero | Variants: page (title + actions), home (avatar, greeting, bell) and sheet (centred title). |
| `CircleButton` | inline circle buttons, back buttons | |
| `Sheet` | BottomDrawer, FilterDrawer, ListFilterDrawer, MovementFiltersDrawer, IconColorDrawer shell | Variants: auto height and tall (picker). The footer holds the primary action. |
| `Button` | FormActions variants | Variants: primary capsule, outline capsule and destructive row. |
| `Field` / `SearchField` / `Toggle` / `Segmented` | Input wrappers, EmailField, PasswordField, SwitchRow, SegmentedControl, CurrencyTabs | All are capsules. |
| `Tile`, `Meter` | Inicio tiles, limit bars | Meter runs across the full row width. |
| `EmptyState` | EmptyState + `ui/empty` | Icon + one line (IV1). |
| `TabBar` | TabBar | Includes the + button. |

Domain wrappers that may stay as compositions only: MovementRow, LimitRow, RecurringRow, CategoryPicker.

## Phases

1. **Foundations.**
   - Commit the notes to `docs/redesign/`.
   - Add the tokens above with light and dark values.
   - Create the `src/lib/copy/es.ts` skeleton plus helpers, and move server errors (e.g. `STATEMENT_ERRORS`) into it.
   - Gather constants modules.
   - Add the ESLint rules with the legacy allowlist.
   - Update DESIGN.md.
   - No visual change.
2. **Base components.**
   - Build the table above.
   - Migrate the existing call sites of the replaced components and delete the duplicates.
   - Screenshots in both themes.
3. **Routing and data.**
   - DR1: remove the full-page drawer routes and redirect direct URLs to parent + drawer.
   - D6: custom backfill migration for the icon/colour of categories and accounts.
   - Forms and the server require icon/colour.
   - Opus verifier.
4. **Inicio.**
   - Inicio (D), empty states IV1-3 with FirstRunChecklist removed, Avisos, Importaciones (pending items, review, auto-approved).
5. **Movimientos and Cuentas.**
   - MO1-4 (day net, drawer, new movement, category picker); Cuentas, Cuenta and Nueva cuenta.
6. **Plan, Reportes and Categorías.**
   - PL5: the UI and code stop using the manual rate; the column stays.
   - RE2: remove "por día" and "gasto más grande" everywhere.
   - CA1-2.
7. **Perfil and Vinculaciones.**
   - Perfil, Mercado Pago, Gmail, Galicia, Nombre, Contraseña and Darme de baja.
8. **Auth.**
   - Login, signup, recovery and verification (AU1-5); the shared CheckEmail; email templates moved to the catalogue.
   - Confirm the Better Auth link expiry before writing "1 hora".
   - Opus verifier.
9. **Contract and cleanup** (only after phase 3 is in production).
   - NOT NULL migration on the icon/colour columns.
   - Delete the legacy allowlist.
   - Ask the user separately before dropping the PL5 rate column.

Each screen phase moves its own text into the catalogue and removes its files from the allowlist.

## Tests

E2E only for money, data, auth and isolation flows.

- **DR1 deep link.** One spec: a direct URL opens the parent screen with the drawer.
- **D6.** One spec: a category can't be saved without an icon.
- **Text.** Specs assert text by importing the catalogue, never by copying strings.
- **Existing specs.** Each phase updates the selectors its changes break.

## To verify during planning

- Is there an ESLint rule for literal text in Svelte markup (e.g. `svelte/no-raw-text` or an equivalent)? Otherwise, write a small local rule.
- Better Auth reset and verification link expiry (AU3).
- Which call sites import Lucide directly (BottomDrawer, DetailRow, FilterBar, MonthNav)? Route them through `Icon`.
