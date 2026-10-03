---
name: Gastar
description: Private personal ledger for Argentina.
colors:
  primary: '#00301c'
  primary-dark: '#b1dfb9'
  on-primary: '#f4ece6'
  on-primary-dark: '#09100d'
  background: '#f4ece6'
  background-dark: '#09100d'
  surface: '#ffffff'
  surface-dark: '#1b2420'
  surface-raised: '#ffffff'
  surface-raised-dark: '#2b3631'
  text: '#14201a'
  text-dark: '#ece7df'
  text-muted: '#6b6259'
  text-muted-dark: '#a3b2ab'
  border: '#cfc2b6'
  border-dark: '#43514a'
  border-strong: '#8a7d70'
  border-strong-dark: '#85978e'
  positive: '#1c6b3e'
  positive-dark: '#82cb9b'
  negative: '#7a1f0e'
  negative-dark: '#e3928b'
  transfer: '#405870'
  transfer-dark: '#9db8d0'
  swatch-green: '#2f6b45'
  swatch-green-dark: '#7fc79a'
  swatch-teal: '#1f6a6a'
  swatch-teal-dark: '#6cc4c0'
  swatch-blue: '#2c5d8a'
  swatch-blue-dark: '#8db8e6'
  swatch-violet: '#5b4a8a'
  swatch-violet-dark: '#b3a3e6'
  swatch-plum: '#7a3d6b'
  swatch-plum-dark: '#d99ac6'
  swatch-red: '#9a3b2e'
  swatch-red-dark: '#f0a090'
  swatch-orange: '#9a5a1f'
  swatch-orange-dark: '#f0b27a'
  swatch-ochre: '#7d6a1e'
  swatch-ochre-dark: '#d9c46e'
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
    textColor: '{colors.text}'
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

Gastar is a calm, precise, personal book of accounts. Numbers lead, and color appears only at moments that matter. The tone is the classic, serious-bank feel from PRODUCT.md, a durable brand commitment rather than a style option. Light and dark themes are both first-class.

The system is quiet and layered. Tonal surfaces, hairline borders and a small three-step elevation scale carry structure, type weight carries hierarchy, and the lifted FAB marks the primary action. Buttons and navigation are tactile and confident: pill shapes, a firm 2px focus ring, a slight press scale, and a clear dimmed disabled state.

**Key Characteristics:**

- Warm, paper-like light theme and a calm night-ledger dark theme, switched by token swap only.
- One typeface (DM Sans) with weight, not size, doing most of the hierarchy work.
- Lists and sections sit on surface cards over the page; a three-step elevation scale (`--shadow-1`, `--shadow-2`, `--shadow-lift`).
- Pill buttons, 0.75rem fields and cards.
- Tabular numerals for every amount.

## Colors

A warm paper and forest-green palette, a calm night-ledger dark theme, and three muted semantic tones for money direction.

The theme is switched via `data-theme` on `<html>` (`light`, `dark`, or absent for system), with `prefers-color-scheme` as the fallback when the attribute is absent. In dark, primary becomes Sage Mist and on-primary becomes Night Ledger. The `-dark` tokens in the frontmatter are the dark-theme values of the same roles.

### Primary

- **Forest Ledger Green** (`primary`): Primary buttons, the center FAB, the wordmark, the selected segment and pressed chip, and the focus ring. Dark: Sage Mist (`primary-dark`).

### Neutral

- **Warm Paper** (`background`; `on-primary` in light): Page background and text on primary fills. Dark counterpart: Night Ledger (`background-dark`, also on-primary in dark).
- **Page White** (`surface`): Top bar, bottom nav, cards and fields. Dark counterpart: Ledger Slate (`surface-dark`).
- **Raised White** (`surface-raised`): Layers above a surface, such as the Sheet and ConfirmDialog dialogs. Dark counterpart: Raised Slate (`surface-raised-dark`).
- **Ledger Ink** (`text`): Body text. Dark counterpart: Warm Paper Ink (`text-dark`).
- **Muted Taupe** (`text-muted`): Labels and inactive nav items. Dark counterpart: Dusk Sage (`text-muted-dark`).
- **Hairline Sand** (`border`): 1px borders on bars, cards and dividers. Dark counterpart: Hairline Slate (`border-dark`).
- **Control Edge** (`border-strong`): 1px edges of form controls, at least 3:1 against the surface. Dark counterpart: `border-strong-dark`.

### Tertiary

- **Credit Green** (`positive`): Income amounts. Dark: Credit Sage (`positive-dark`).
- **Debit Burgundy** (`negative`): Outcome amounts and error messages. Dark: Debit Clay (`negative-dark`).
- **Transfer Slate** (`transfer`): Transfer amounts. Dark: `transfer-dark`.

### Swatches

- **Account and category swatches** (`--swatch-green`, `--swatch-teal`, `--swatch-blue`, `--swatch-violet`, `--swatch-plum`, `--swatch-red`, `--swatch-orange`, `--swatch-ochre`): The eight user-pickable accent colours for IconBadge and the color picker, each with a light and a `-dark` value (listed in the frontmatter, defined with `light-dark()` in `app.css`).

### Named Rules

**The Action Colour Rule.** Primary marks actions, selection and focus only: button fills, the FAB, the selected segment, the pressed chip and the focus ring. Never use it for link text; links and the active nav item use the text color (links underlined, the active nav item with a primary tint pill).

**The Control Edge Rule.** Controls are identified by their edge: inputs, selects, the option picker trigger, date chips and the segmented track use `border-strong` (at least 3:1). Cards, bars and dividers stay on the hairline `border`.

**The Token Rule.** Colors come from the theme tokens; never hardcode a hex in a component.

## Typography

**Display Font:** none
**Body Font:** DM Sans (with system-ui, -apple-system, sans-serif), weights 400, 500, 600 loaded via @fontsource/dm-sans.

**Character:** A single clean humanist sans. Hierarchy comes from weight and a short size scale (0.75rem `--font-size-xs`, 0.875rem `--font-size-sm`, 1rem `--font-size-base`, 1.25rem `--font-size-lg`, 1.75rem `--font-size-xl`, plus the 2.25rem hero step) rather than a second family.

### Hierarchy

- **Headline** (500, h1 to h3, 1.2): Page and section headings.
- **Title** (600, 1.25rem): The "Gastar" wordmark text in the top bar (larger mark on the login screen).
- **Page title** (500, 1.75rem, 1.2): The `PageHeader` h1 on every screen.
- **Body** (400, 1rem, 1.5): Default text, fields and buttons (buttons at weight 500).
- **Label** (400, 0.875rem): Form labels in muted taupe, and error text in the negative color.
- **Hero** (`--font-size-hero`, 2.25rem): The large balance or amount figure on the dashboard, account detail and movement detail, sized `clamp(1.5rem, 9vw, var(--font-size-hero))` so it shrinks on narrow screens.
- **Nav label** (400, 0.75rem via `--font-size-xs`; 0.6875rem under 22rem wide): Bottom navigation labels. The 0.6875rem size is a deliberate off-scale exception so "Movimientos" fits in the five-slot nav at 320px.

### Named Rules

**The Tabular Rule.** Every money amount uses `font-variant-numeric: tabular-nums` (the `.amount` class) so columns align.

## Layout

Mobile-first single column with no layout breakpoints; two narrow-width tweaks (nav label font size, segmented control). `.content` shares the `--content-width` (560px) column with the top bar and bottom nav: both bars keep a full-bleed surface and border, and their inner items are inset (inline padding of `space-5` inside the column, as page content) to align with that centered column. The segmented control options shrink (`min-width: 0`, `space-1` side padding), wrap labels with `overflow-wrap: anywhere` instead of clipping, and drop to `--font-size-sm` under 26rem wide, keeping the 2.75rem target. The top bar is sticky (z-index 10) and the bottom nav is fixed with a `safe-area-inset-bottom` allowance (z-index 10). Content bottom padding is `calc(space-8 + 4.5rem + env(safe-area-inset-bottom))` so nothing hides under the nav. The login screen is a centered column with safe-area padding on all four sides. Spacing is a short rem scale (`space-1` to `space-6`, plus `space-8`); page padding is `space-5`. The browser theme color is Forest Ledger Green and the PWA manifest background is Warm Paper.

## Elevation & Depth

Depth comes from layering first, shadow second. The page (Warm Paper) is the base; lists and sections sit on surface cards (Page White) with a 1px hairline border; sheets sit on the raised surface. Shadows are soft and small, and money direction colours are never affected by them.

### Elevation Scale

- **Level 0, page** (`--bg`): No shadow.
- **Level 1, card** (`--shadow-1`: light `0 1px 2px rgb(0 0 0 / 0.08)`; dark `0 1px 2px rgb(0 0 0 / 0.25)` plus a 1px inset top highlight): `Card` and the shared `.list-card` list container (surface fill, hairline border, 0.75rem radius, clipped overflow, last row without divider). Used for list pages, dashboard sections and the merged balance card (total balance plus month balance).
- **Level 2, raised** (`--shadow-2`: light `0 2px 8px rgb(0 0 0 / 0.12)`; dark `0 2px 8px rgb(0 0 0 / 0.35)` plus a brighter inset highlight): Modal layers: the `Sheet` and `ConfirmDialog` dialogs, both with the `--surface-raised` fill.
- **Lift** (`--shadow-lift`: light `0 6px 16px rgb(0 0 0 / 0.2)`; dark `0 6px 16px rgb(0 0 0 / 0.6)` plus a 1px border-token edge): The center "+" FAB only; it stays the most prominent element in the bottom nav.

### Dark Theme

Dark does not rely on black shadows, which vanish on dark backgrounds. Elevation is expressed by lighter surface steps (`--bg` < `--surface` < `--surface-raised`), the hairline border as a subtle edge, and a faint inset top highlight; the drop shadows are kept light-touch except the FAB lift.

### Row Feedback

`ListRow` shows a primary tint (8%) on hover (only under `@media (hover: hover)`), a stronger tint (14%) while pressed, and an inset focus-visible outline. Background transitions (0.15s) apply only under `prefers-reduced-motion: no-preference`; there is no row scale.

### Named Rules

**The Layering Rule.** Group rows and sections into a surface card (`Card` or `.list-card`); do not leave lists directly on the page background. Use the lowest elevation level that separates the layer.

## Shapes

Two radii: a gently rounded 0.75rem (`rounded.md`) for fields, cards and nav items, and a full pill (`rounded.pill`, 999px) for buttons, the FAB and the profile link (a 2.75rem circle). The wordmark mark and the empty-state badge reuse them (an 8px-radius mark; a 3.5rem tinted circle). Borders are always 1px in the border token. Transitions are 0.15s ease on opacity, color and background-color. When `prefers-reduced-motion: no-preference` also holds, `transform` is added so pressed buttons, nav items, the FAB and the profile link scale down (0.98 for buttons, 0.96 for the rest); with reduced motion there is no press scale.

## Components

Shared components live in `src/lib/components/`.

### Buttons

- **Shape:** Pill (999px), weight 500, inline-flex with a `space-2` gap. Renders as an `<a>` when given an `href`, otherwise a `<button>`.
- **Primary:** Primary fill, on-primary text, padding `space-3` by `space-5`. Hover drops opacity to 0.9.
- **Secondary:** Transparent, text color, 1px border. Hover keeps full opacity and adds a primary tint (`color-mix(in srgb, var(--primary) 8%, transparent)`). The `block` variant is full width.
- **States:** Disabled (and `aria-disabled='true'`) is 0.5 opacity with a not-allowed cursor. Active (not disabled) scales to 0.98. Focus-visible is the global 2px primary outline with 2px offset .

### Cards / Containers

- **Corner Style:** 0.75rem.
- **Background:** Surface with a 1px border and `--shadow-1`.
- **List container:** `.list-card` (global class in `app.css`) on a `<ul>` of `ListRow` items; the shared way to group rows.
- **Internal Padding:** `space-6` by `space-5`; full width, with an optional `maxWidth` (360px on the login card).

### Inputs / Fields

- **Input style:** Surface background, 1px control-edge border, 0.75rem radius, padding `space-3` by `space-4`, full width, 3rem minimum height (inputs and selects).
- **Focus-visible:** Border turns primary and a 2px primary outline sits at 1px offset .
- **Field:** A label (flex column, `space-1` gap, small muted text) wrapping the control, plus an optional error line below: small text in the negative color with `role="alert"`, linked by an optional `errorId`.

### Segmented Control

A pill track (background color, 1px control-edge border, `space-1` padding) of radio options, used for the theme choice. Each option is a pill, at least 2.75rem tall, weight 500; the selected one is filled with primary and on-primary text. The radio input is invisible and covers the option; focus-visible draws a 2px primary outline on the option.

### Page Header and Empty State

- **PageHeader:** An h1 (1.75rem, 500, line-height 1.2) with `space-5` below. Optional `back` (`{ href, label }`) adds a 2.75rem circular chevron-left icon link before the title (`label` is its aria-label, hover tints primary 8%). Optional `action` snippet sits after the title. With either, it is a row `[back] [title] [action]` and the title truncates with an ellipsis.
- **DetailHeader:** Used on account, category and movement detail. Renders `PageHeader` with `back`, then a hero `Card`. Props: `title`, `back`, `label` (muted small caption), optional `icon` and `color` (IconBadge), `value` (hero figure, 600, `clamp` hero size), `tone` (`positive`, `negative` or `transfer` colour for the value), `context` (muted small line) and a children snippet for extra content (such as the category per-currency nets).
- **Secondary link row:** "Ver movimientos" on account and category detail is a single `ListRow` with a trailing chevron-right in a surface container (hairline border, `--shadow-1`), not an underlined text link.
- **Destructive cue:** The confirm-delete trigger ("Eliminar") in the detail actions uses the `negative` text colour and a 50% `negative` border; other actions stay neutral.
- **FilterBar:** Wrapping flex form with `space-2` by `space-3` gaps. The search field takes the full first row (search icon inset left); a segmented control or filters disclosure takes its own full row; a checkbox label stays compact (auto width) and shares a row when it fits. On the movements list the filters `summary` is an inline pill (surface fill, hairline border, 2.75rem tall).
- **List day headings:** Movements group by day under a small heading (0.875rem, 600, muted text, `space-4` inline padding) rather than a body-size title.
- **Profile:** One `Card` groups the user name and email, the theme control and the "Cerrar sesión" button as sections separated by hairline dividers.
- **EmptyState:** A centered column: a 3.5rem pill circle tinted with `color-mix(in srgb, var(--primary) 8%, transparent)` holding a primary-colored icon, over muted text. Used by the placeholder pages.

### Icon and Wordmark

- **Icon:** Inline SVG, 24px by default, 24-unit viewBox, `currentColor` 1.75 stroke with round caps and joins, `aria-hidden`. Names: home, accounts, plus, movements, categories, profile, search, chevron-left, chevron-right, plus the account icons (bank, wallet, cash, card, piggy-bank, dollar, coins, safe, briefcase, phone).
- **Wordmark:** A rounded-square ledger mark (two horizontal strokes) plus "Gastar" in title type. Mark fill is primary and strokes are on-primary, so it flips in dark; the text is primary.

### Sheet

A modal bottom sheet built on `<dialog>` (`showModal`): full width up to 35rem, max height 85dvh, raised-surface fill, 1px border, top corners rounded 0.75rem, bottom safe-area padding. The backdrop is the text color at 40%. A header holds an h2 title (1.25rem) and a secondary "Cerrar" button; clicking the backdrop or pressing Escape closes it.

### Option Picker

A field that opens a Sheet of radio rows. The trigger looks like an input (3rem minimum height, 1px control-edge border, 0.75rem radius) showing the selected row or a muted placeholder. Each row is an icon badge, a name (weight 500, truncated) and optional muted meta text (such as " · Archivada"), at least 2.75rem tall with a hairline divider. Hover tints the row; the selected row has a 2px primary outline; focus-visible a 2px primary outline at 2px offset. Choosing a row closes the sheet and returns focus to the trigger. Without JavaScript the rows render inline as a plain radio group.

### Date and Time Picker

A fieldset with quick chips (Hoy, Ayer, and "Otra fecha" showing the picked date), at least 2.75rem tall with a control-edge border; a pressed chip is primary-filled. In datetime mode, two numeric text inputs (Hora, Minutos) follow. "Otra fecha" opens a Sheet with a month calendar: a seven-column grid starting on Monday, previous and next month buttons, 2.75rem day buttons, the picked day primary-filled, today outlined in primary, and arrow keys moving by day and week. In date-only mode there is a single chip and a "Quitar" button. Without JavaScript it is a single text field with a format hint.

### Icon and Color Pickers

Radio groups of round swatches (the icon picker shows the ten account icons in IconBadge, the color picker the eight swatches at 2.75rem). The checked option has a 2px text-color ring separated by a 2px surface gap; focus-visible moves the ring to 4px offset. The ring is a literal two-ring `box-shadow` in `IconPicker` and `ColorPicker`, the single named exception to the no-literal-`box-shadow` rule.

### Navigation

- **Style:** Fixed bottom bar on the surface color with a top hairline, no gap, and `space-2` vertical padding plus the bottom safe-area inset. Five equal slots: two items, the FAB, two items. Each item is an icon over a 0.75rem label (0.6875rem under 22rem), muted by default.
- **Item states:** Hover turns the label and icon to the text color. Active press scales to 0.96. `aria-current='page'` turns it the text color with a pill background tinted `color-mix(in srgb, var(--primary) 10%, transparent)`. Items have no horizontal padding; labels truncate with an ellipsis.
- **Top bar:** Sticky, surface background, bottom hairline, the wordmark left and the profile link right.
- **Profile link:** A 2.75rem circle with a 1px border, surface fill and the profile icon; hover tints it as above and press scales to 0.96.

### Nav FAB

A 3.5rem primary pill circle with a 24px plus icon, centered in the bottom nav and pulled up by 1.5rem. It is the only element with `--shadow-lift`; hover drops opacity to 0.9 and press scales to 0.96.

## Do's and Don'ts

### Do:

- **Do** use the theme tokens for every color, radius and spacing value.
- **Do** put `tabular-nums` on every amount; income uses `positive`, outcome `negative` and transfer `transfer`.
- **Do** use pill buttons and the 0.75rem radius for fields and cards.
- **Do** group lists and sections into surface cards (`Card` or `.list-card`) and pick the lowest elevation token that works; keep `--shadow-lift` for the FAB.
- **Do** keep primary for actions, selection and focus; use `border-strong` on control edges.

### Don't:

- **Don't** hardcode hex values in components.
- **Don't** use primary as link text; links use the text color with an underline.
- **Don't** hardcode a `box-shadow` in a component (the checked ring of `IconPicker` and `ColorPicker` is the only exception) or add a shadow outside the elevation scale; don't use heavy black shadows in dark; don't add hover, press and disabled treatments beyond those described in Components (0.9 hover opacity, tints, press scale, 0.5 disabled).
- **Don't** treat these known gaps (documented, not decided) as settled: z-indices are not tokenized, and the tint percentages (8% and 10% `color-mix`) and the 0.96 and 0.98 press scales are repeated literals rather than tokens.
