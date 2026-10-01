---
name: Gastar
description: Private personal ledger for Argentina.
colors:
  primary: '#00301c'
  primary-dark: '#f0ff9c'
  on-primary: '#f4ece6'
  on-primary-dark: '#00301c'
  accent: '#f0ff9c'
  background: '#f4ece6'
  background-dark: '#06120c'
  surface: '#ffffff'
  surface-dark: '#0c2318'
  text: '#14201a'
  text-dark: '#f4ece6'
  text-muted: '#6b6259'
  text-muted-dark: '#a9a199'
  border: '#ded3c9'
  border-dark: '#1e3a2b'
  positive: '#1c6b3e'
  positive-dark: '#7ce0a0'
  negative: '#7a1f0e'
  negative-dark: '#ff9c85'
typography:
  body:
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  headline:
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif"
    fontWeight: 500
    lineHeight: 1.2
  title:
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  nav-label:
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif"
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.5
rounded:
  md: '0.75rem'
  pill: '999px'
spacing:
  space-1: '0.25rem'
  space-2: '0.5rem'
  space-3: '0.75rem'
  space-4: '1rem'
  space-5: '1.5rem'
  space-6: '2rem'
  space-8: '3rem'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: '0.75rem 1.5rem'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: '0.75rem 1.5rem'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1rem'
    height: '3rem'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    padding: '2rem 1.5rem'
    width: '360px'
  nav-item:
    textColor: '{colors.text-muted}'
    typography: '{typography.nav-label}'
    rounded: '{rounded.pill}'
    padding: '0.25rem 0'
  nav-item-active:
    textColor: '{colors.primary}'
  nav-fab:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.pill}'
    size: '3.5rem'
  profile-link:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.pill}'
    size: '2.75rem'
  segmented-control:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: '0.25rem'
  segmented-control-selected:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    height: '2.75rem'
  empty-state-badge:
    textColor: '{colors.primary}'
    rounded: '{rounded.pill}'
    size: '3.5rem'
  topbar:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.primary}'
    typography: '{typography.title}'
    padding: '1rem 1.5rem'
---

# Design System: Gastar

## Overview

**Creative North Star: "The Private Ledger"**

Gastar is a calm, precise, personal book of accounts. Numbers lead, and the accent appears only at moments that matter. The tone is the classic, serious-bank feel from PRODUCT.md, a durable brand commitment rather than a style option. Light and dark themes are both first-class.

The system is quiet and flat. Tonal layering and hairline borders carry structure, type weight carries hierarchy, and a single lifted element marks the primary action. Buttons and navigation are tactile and confident: pill shapes, a firm 2px focus ring, a slight press scale, and a clear dimmed disabled state.

**Key Characteristics:**

- Warm, paper-like light theme and a deep forest-green dark theme, switched by token swap only.
- One typeface (DM Sans) with weight, not size, doing most of the hierarchy work.
- Flat surfaces separated by hairline borders; one shadow in the whole app.
- Pill buttons, 0.75rem fields and cards.
- Tabular numerals for every amount.

## Colors

A warm paper and forest-green palette with a single sharp lime signal, and two muted semantic tones for money direction.

The theme is switched via `data-theme` on `<html>` (`light`, `dark`, or absent for system), with `prefers-color-scheme` as the fallback when the attribute is absent. In dark, primary becomes Signal Lime and on-primary becomes Forest Ledger Green. The `-dark` tokens in the frontmatter are the dark-theme values of the same roles.

### Primary

- **Forest Ledger Green** (`primary`): Primary buttons, the center FAB, the wordmark, the active nav item and its tint, the selected segment and the light-theme focus ring.
- **Signal Lime** (`accent`, and `primary-dark`): The dark-theme primary fill and focus ring. It is the accent token in both themes.

### Neutral

- **Warm Paper** (`background`; `on-primary` in light): Page background and text on primary fills. Dark counterpart: Midnight Ledger (`background-dark`).
- **Page White** (`surface`): Top bar, bottom nav, cards and fields. Dark counterpart: Deep Ledger Green (`surface-dark`).
- **Ledger Ink** (`text`): Body text. Dark counterpart: Warm Paper Ink (`text-dark`).
- **Muted Taupe** (`text-muted`): Labels and inactive nav items. Dark counterpart: Dusk Taupe (`text-muted-dark`).
- **Hairline Sand** (`border`): 1px borders on bars, cards and fields. Dark counterpart: Hairline Forest (`border-dark`).

### Tertiary

- **Credit Green** (`positive`): Income amounts. Dark: Credit Mint (`positive-dark`).
- **Debit Burgundy** (`negative`): Outcome amounts and error messages. Dark: Debit Coral (`negative-dark`).

### Named Rules

**The Signal Lime Rule.** Signal Lime is a fill and outline color only in dark. On Warm Paper it is illegible as text, so never use it for text in the light theme.

**The Token Rule.** Colors come from the theme tokens; never hardcode a hex in a component.

## Typography

**Display Font:** none
**Body Font:** DM Sans (with system-ui, -apple-system, sans-serif), weights 300, 400, 500, 600 loaded via @fontsource/dm-sans.

**Character:** A single clean humanist sans. Hierarchy comes from weight and a short size scale (0.875rem, 1rem, 1.25rem, 1.75rem) rather than a second family.

### Hierarchy

- **Headline** (500, h1 to h3, 1.2): Page and section headings.
- **Title** (600, 1.25rem): The "Gastar" wordmark text in the top bar (larger mark on the login screen).
- **Page title** (500, 1.75rem, 1.2): The `PageHeader` h1 on every screen.
- **Body** (400, 1rem, 1.5): Default text, fields and buttons (buttons at weight 500).
- **Label** (400, 0.875rem): Form labels in muted taupe, and error text in the negative color.
- **Nav label** (400, 0.75rem; 0.6875rem under 22rem wide): Bottom navigation labels.

### Named Rules

**The Tabular Rule.** Every money amount uses `font-variant-numeric: tabular-nums` (the `.amount` class) so columns align.

## Layout

Mobile-first single column with no breakpoints. `.content` and the bottom nav share a 560px max width, centered. The top bar is sticky (z-index 10) and the bottom nav is fixed with a `safe-area-inset-bottom` allowance (z-index 10). Content bottom padding is `calc(space-8 + 4.5rem + env(safe-area-inset-bottom))` so nothing hides under the nav. The login screen is a centered column with safe-area padding on all four sides. Spacing is a short rem scale (`space-1` to `space-6`, plus `space-8`); page padding is `space-5`. The browser theme color is Forest Ledger Green and the PWA manifest background is Warm Paper.

## Elevation & Depth

Essentially flat. Depth comes from tonal layering (Warm Paper page, Page White bars, cards and fields) and 1px hairline borders. The only shadow is the center add-movement FAB, which is lifted to read as the primary action.

### Shadow Vocabulary

- **FAB lift** (`box-shadow: 0 4px 12px rgb(0 0 0 / 0.2)`): The center "+" FAB only.

### Named Rules

**The One Lift Rule.** Only the FAB is lifted. Everything else stays flat with a hairline border.

## Shapes

Two radii: a gently rounded 0.75rem (`rounded.md`) for fields, cards and nav items, and a full pill (`rounded.pill`, 999px) for buttons, the FAB and the profile link (a 2.75rem circle). The wordmark mark and the empty-state badge reuse them (an 8px-radius mark; a 3.5rem tinted circle). Borders are always 1px in the border token. Transitions are 0.15s ease on opacity, color and background-color. When `prefers-reduced-motion: no-preference` also holds, `transform` is added so pressed buttons, nav items, the FAB and the profile link scale down (0.98 for buttons, 0.96 for the rest); with reduced motion there is no press scale.

## Components

Shared components live in `src/lib/components/`.

### Buttons

- **Shape:** Pill (999px), weight 500, inline-flex with a `space-2` gap. Renders as an `<a>` when given an `href`, otherwise a `<button>`.
- **Primary:** Primary fill, on-primary text, padding `space-3` by `space-5`. Hover drops opacity to 0.9.
- **Secondary:** Transparent, text color, 1px border. Hover keeps full opacity and adds a primary tint (`color-mix(in srgb, var(--primary) 8%, transparent)`). The `block` variant is full width.
- **States:** Disabled (and `aria-disabled='true'`) is 0.5 opacity with a not-allowed cursor. Active (not disabled) scales to 0.98. Focus-visible is the global 2px primary outline with 2px offset (accent in dark).

### Cards / Containers

- **Corner Style:** 0.75rem.
- **Background:** Surface with a 1px border; no shadow.
- **Internal Padding:** `space-6` by `space-5`; full width, with an optional `maxWidth` (360px on the login card).

### Inputs / Fields

- **Input style:** Surface background, 1px border, 0.75rem radius, padding `space-3` by `space-4`, full width, 3rem minimum height (inputs and selects).
- **Focus-visible:** Border turns primary and a 2px primary outline sits at 1px offset (accent outline in dark).
- **Field:** A label (flex column, `space-1` gap, small muted text) wrapping the control, plus an optional error line below: small text in the negative color with `role="alert"`, linked by an optional `errorId`.

### Segmented Control

A pill track (background color, 1px border, `space-1` padding) of radio options, used for the theme choice. Each option is a pill, at least 2.75rem tall, weight 500; the selected one is filled with primary and on-primary text. The radio input is invisible and covers the option; focus-visible draws a 2px primary outline on the option.

### Page Header and Empty State

- **PageHeader:** A single h1 (1.75rem, 500, line-height 1.2) with `space-5` below.
- **EmptyState:** A centered column: a 3.5rem pill circle tinted with `color-mix(in srgb, var(--primary) 8%, transparent)` holding a primary-colored icon, over muted text. Used by the placeholder pages.

### Icon and Wordmark

- **Icon:** Inline SVG, 24px by default, 24-unit viewBox, `currentColor` 1.75 stroke with round caps and joins, `aria-hidden`. Names: home, accounts, plus, movements, categories, profile.
- **Wordmark:** A rounded-square ledger mark (two horizontal strokes) plus "Gastar" in title type. Mark fill is primary and strokes are on-primary, so it flips in dark; the text is primary.

### Navigation

- **Style:** Fixed bottom bar on the surface color with a top hairline, no gap, and `space-2` vertical padding plus the bottom safe-area inset. Five equal slots: two items, the FAB, two items. Each item is an icon over a 0.75rem label (0.6875rem under 22rem), muted by default.
- **Item states:** Hover turns the label and icon to the text color. Active press scales to 0.96. `aria-current='page'` turns it primary with a pill background tinted `color-mix(in srgb, var(--primary) 10%, transparent)`. Items have no horizontal padding; labels truncate with an ellipsis.
- **Top bar:** Sticky, surface background, bottom hairline, the wordmark left and the profile link right.
- **Profile link:** A 2.75rem circle with a 1px border, surface fill and the profile icon; hover tints it as above and press scales to 0.96.

### Nav FAB

A 3.5rem primary pill circle with a 24px plus icon, centered in the bottom nav and pulled up by 1.5rem. It is the only lifted element; hover drops opacity to 0.9 and press scales to 0.96.

## Do's and Don'ts

### Do:

- **Do** use the theme tokens for every color, radius and spacing value.
- **Do** put `tabular-nums` on every amount; income uses `positive` and outcome uses `negative`.
- **Do** use pill buttons and the 0.75rem radius for fields and cards.
- **Do** keep the FAB as the single lifted element; everything else is flat with a hairline border.
- **Do** keep Signal Lime as a fill or outline in dark only.

### Don't:

- **Don't** hardcode hex values in components.
- **Don't** use Signal Lime as text on Warm Paper; it is illegible there.
- **Don't** add new shadows, or hover, press and disabled treatments beyond those described in Components (0.9 hover opacity, tints, press scale, 0.5 disabled).
- **Don't** treat these known gaps (documented, not decided) as settled: there is no transfer color token, the FAB shadow is hardcoded black, z-indices are not tokenized, and the tint percentages (8% and 10% `color-mix`) and the 0.96 and 0.98 press scales are repeated literals rather than tokens.
