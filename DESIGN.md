---
name: Gastar
description: Private personal ledger for Argentina.
colors:
  primary: '#14532d'
  primary-dark: '#bef264'
  on-primary: '#f7fee7'
  on-primary-dark: '#1a2e05'
  background: '#fafaf9'
  background-dark: '#0c0a09'
  surface: '#ffffff'
  surface-dark: '#1c1917'
  surface-raised: '#ffffff'
  surface-raised-dark: '#292524'
  muted: '#f5f5f4'
  muted-dark: '#292524'
  text: '#1c1917'
  text-dark: '#fafaf9'
  text-muted: '#6b6560'
  text-muted-dark: '#a8a29e'
  border: '#e7e5e4'
  border-dark: '#292524'
  border-strong: '#8a837d'
  border-strong-dark: '#78716c'
  positive: '#15803d'
  positive-dark: '#4ade80'
  negative: '#b91c1c'
  negative-dark: '#f87171'
  transfer: '#57534e'
  transfer-dark: '#a8a29e'
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
    fontWeight: 600
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
    fontWeight: 500
    lineHeight: 1.5
rounded:
  md: '0.625rem'
  card: '0.875rem'
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
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
    height: '2.75rem'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '0.5rem 1rem'
    height: '2.75rem'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.5rem 0.75rem'
    height: '2.75rem'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.card}'
    padding: '1rem'
    width: '360px'
  nav-item:
    textColor: '{colors.text-muted}'
    typography: '{typography.nav-label}'
    height: '2.75rem'
  nav-item-active:
    textColor: '{colors.text}'
  nav-fab:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.card}'
    size: '3.25rem'
  profile-link:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.pill}'
    size: '2.75rem'
  segmented-control:
    backgroundColor: '{colors.muted}'
    textColor: '{colors.text-muted}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '3px'
  segmented-control-selected:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    height: '2.25rem'
  empty-state-badge:
    textColor: '{colors.primary}'
    rounded: '{rounded.pill}'
    size: '3.5rem'
  top-bar:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    typography: '{typography.headline}'
    padding: '1rem 1.5rem 0.75rem'
---

# Design System: Gastar

## Overview

**Creative North Star: "The Private Ledger"**

Gastar is a calm, precise, personal book of accounts. Numbers lead, and color appears only at moments that matter. The tone is the classic, serious-bank feel from PRODUCT.md, a durable brand commitment rather than a style option. The single theme is **Pampa**: forest green and lime on warm stone, light and dark, both first-class. The visual language is shadcn/ui-like: stone neutrals, hairline borders, small radii and compact controls.

The system is quiet and layered. Tonal surfaces, hairline borders and a small three-step elevation scale carry structure, type weight carries hierarchy, and the FAB marks the primary action. Buttons and navigation are compact and confident: small radii, a firm 2px focus ring, a slight press scale, and a clear dimmed disabled state.

**Key Characteristics:**

- Stone neutrals with a forest-green primary in light and a lime primary in dark, switched by token swap only (`light-dark()` in `app.css`).
- One typeface (DM Sans) with weight, not size, doing most of the hierarchy work.
- Lists and sections sit on surface cards over the page; a three-step elevation scale (`--shadow-1`, `--shadow-2`, `--shadow-lift`).
- 0.625rem radius buttons and fields, 0.875rem cards and FAB; pills only for the top-bar avatar and bell badge and the empty-state badge.
- Tabular numerals for every amount.

## Colors

Pampa: forest green and lime on warm stone, plus three semantic tones for money direction.

The theme is switched via `data-theme` on `<html>` (`light`, `dark`, or absent for system), with `prefers-color-scheme` as the fallback when the attribute is absent. In dark, primary becomes Lime (`#bef264`) with a dark-green on-primary. The `-dark` tokens in the frontmatter are the dark-theme values of the same roles.

### Primary

- **Forest** (`primary`): Primary buttons, the center FAB, the wordmark, the active nav icon and the focus ring. Dark: **Lime** (`primary-dark`).

### Neutral (stone)

- **Stone 50** (`background`): Page background, the selected segment and the translucent bottom nav. Dark counterpart: Stone 950 (`background-dark`).
- **Page White** (`surface`): Cards and fields. Dark counterpart: Stone 900 (`surface-dark`).
- **Raised White** (`surface-raised`): Layers above a surface, such as the Sheet and ConfirmDialog dialogs. Dark counterpart: `surface-raised-dark`.
- **Muted** (`muted`): The segmented track, hover fills (rows, secondary button, top-bar avatar). Dark counterpart: `muted-dark`.
- **Ledger Ink** (`text`): Body text. Dark counterpart: `text-dark`.
- **Muted Stone** (`text-muted`): Labels and inactive nav items. Dark counterpart: `text-muted-dark`.
- **Hairline** (`border`): 1px borders on bars, cards and dividers. Dark counterpart: `border-dark`.
- **Control Edge** (`border-strong`): 1px edges of form controls, at least 3:1 against the surface. Dark counterpart: `border-strong-dark`.
- **On primary** (`on-primary`): Text on primary fills. Dark counterpart: `on-primary-dark`.

### Semantic

- **Positive** (`positive`): Income amounts. Dark: `positive-dark`.
- **Negative** (`negative`): Error messages and destructive actions only; outcome amounts use the text colour with a minus sign. Dark: `negative-dark`.
- **Transfer** (`transfer`): Transfer amounts (neutral stone). Dark: `transfer-dark`.

### Swatches

- **Account and category swatches** (`--swatch-green`, `--swatch-teal`, `--swatch-blue`, `--swatch-violet`, `--swatch-plum`, `--swatch-red`, `--swatch-orange`, `--swatch-ochre`): The eight user-pickable accent colours for IconBadge and the color picker, each with a light and a `-dark` value (listed in the frontmatter, defined with `light-dark()` in `app.css`).

### Named Rules

**The Action Colour Rule.** Primary marks actions, selection and focus only: button fills, the FAB, the active nav icon and the focus ring. Never use it for link text; links and the active nav label use the text color (links underlined).

**The Control Edge Rule.** Controls are identified by their edge: inputs, selects and the option picker trigger use `border-strong`. Cards, bars and dividers stay on the hairline `border`. The segmented track is a `muted` fill with no edge.

**The Token Rule.** Colors come from the theme tokens; never hardcode a hex in a component.

## Typography

**Display Font:** none
**Body Font:** DM Sans (with system-ui, -apple-system, sans-serif), weights 400, 500, 600 loaded via @fontsource/dm-sans.

**Character:** A single clean humanist sans. Hierarchy comes from weight and a short size scale (0.75rem `--font-size-xs`, 0.875rem `--font-size-sm`, 1rem `--font-size-base`, 1.25rem `--font-size-lg`, 1.75rem `--font-size-xl`, plus the 2.25rem hero step) rather than a second family.

### Hierarchy

- **Headline** (600, h1 to h3, 1.2, letter-spacing -0.01em): Page and section headings.
- **Title** (600, 1.25rem): The "Gastar" wordmark text on the login screen.
- **Page title** (500, 1.75rem, 1.2): The `PageHeader` h1 on every screen.
- **Body** (400, 1rem, 1.5): Default text and fields.
- **Label** (400, 0.875rem): Form labels in muted stone, and error text in the negative color. Buttons use 0.875rem at weight 500.
- **Hero** (`--font-size-hero`, 2.25rem): The large balance or amount figure on the dashboard, account detail and movement detail, sized `clamp(1.5rem, 9vw, var(--font-size-hero))` so it shrinks on narrow screens.
- **Nav label** (500, 0.75rem via `--font-size-xs`; 0.6875rem under 22rem wide): Bottom navigation labels. The 0.6875rem size is a deliberate off-scale exception so "Movimientos" fits in the five-slot nav at 320px.

### Named Rules

**The Tabular Rule.** Every money amount uses `font-variant-numeric: tabular-nums` (the `.amount` class) so columns align.

## Layout

Mobile-first single column with no layout breakpoints; one narrow-width tweak (nav label font size). `.content` shares the `--content-width` (560px) column with the bottom nav; the nav spans the full width with a border (translucent: `--bg` at 92% with a 12px backdrop blur) and its inner items are inset (inline padding of `space-5` inside the column, as page content). `.content` sets `--gutter` (`space-5`) as its inline padding; the page top bar bleeds out to the content edges with a negative `--gutter` margin. The segmented control options shrink (`min-width: 0`, `space-1` side padding), wrap labels with `overflow-wrap: anywhere` instead of clipping, and keep the 2.75rem hit area. The page top bar is sticky (z-index 9, inside `.content`) only on viewports at least 40em tall (`@media (min-height: 40em)`; `em` is the browser text size, so large text or zoom turns it off and the bar scrolls away); under the same query `html` has a `scroll-padding-top` so focused elements stay clear of it, and the bottom nav is fixed with a `safe-area-inset-bottom` allowance (z-index 10). Content bottom padding is `calc(space-8 + 4.5rem + env(safe-area-inset-bottom))` so nothing hides under the nav. The login screen is a centered column with safe-area padding on all four sides. Spacing is a short rem scale (`space-1` to `space-6`, plus `space-8`); page padding is `space-5`. The browser theme color follows the page background (Stone 50 / Stone 950), the PWA manifest `theme_color` is Forest (`#14532d`) and its background is Stone 50.

## Elevation & Depth

Depth comes from layering first, shadow second. The page (Stone 50) is the base; lists and sections sit on surface cards (Page White) with a 1px hairline border; sheets sit on the raised surface. Shadows are soft and small, and money direction colours are never affected by them.

### Elevation Scale

- **Level 0, page** (`--bg`): No shadow.
- **Level 1, card** (`--shadow-1`: light `0 1px 2px rgb(0 0 0 / 0.04)`; dark `0 1px 2px rgb(0 0 0 / 0.2)`): `Card` and the shared `.list-card` list container (surface fill, hairline border, 0.875rem radius, clipped overflow, last row without divider). Used for list pages, dashboard sections and the merged balance card (total balance plus month balance).
- **Level 2, raised** (`--shadow-2`: light `0 2px 8px rgb(0 0 0 / 0.12)`; dark `0 2px 8px rgb(0 0 0 / 0.35)` plus a brighter inset highlight): Modal layers: the `Sheet` and `ConfirmDialog` dialogs, both with the `--surface-raised` fill.
- **Lift** (`--shadow-lift`: light `0 6px 16px rgb(0 0 0 / 0.2)`; dark `0 6px 16px rgb(0 0 0 / 0.6)` plus a 1px border-token edge): The center "+" FAB only; it stays the most prominent element in the bottom nav.

### Dark Theme

Dark does not rely on black shadows, which vanish on dark backgrounds. Elevation is expressed by lighter surface steps (`--bg` < `--surface` < `--surface-raised`), the hairline border as a subtle edge, and a faint inset top highlight on raised layers; the drop shadows are kept light-touch except the FAB lift.

### Row Feedback

`ListRow` fills with `muted` on hover (only under `@media (hover: hover)`) and while pressed, and shows an inset focus-visible outline. Background transitions (0.15s) apply only under `prefers-reduced-motion: no-preference`; there is no row scale.

### Named Rules

**The Layering Rule.** Group rows and sections into a surface card (`Card` or `.list-card`); do not leave lists directly on the page background. Use the lowest elevation level that separates the layer.

## Shapes

Three radii: `--radius` 0.625rem (`rounded.md`) for buttons, fields, the segmented track, the Sheet top corners and the option picker trigger; `--radius-card` 0.875rem (`rounded.card`) for cards, list cards and the FAB; and a full pill (`rounded.pill`, 999px) for the avatar (a 2.75rem circle). The wordmark mark and the empty-state badge reuse them (an 8px-radius mark; a 3.5rem tinted circle). Borders are always 1px in the border token. Transitions are 0.15s ease on opacity, color and background-color. When `prefers-reduced-motion: no-preference` also holds, `transform` is added so pressed buttons, nav items and the FAB scale down (0.98 for buttons, 0.96 for the rest); with reduced motion there is no press scale.

## Components

Shared components live in `src/lib/components/`.

### Buttons

- **Shape:** 0.625rem radius, 2.75rem minimum height, `space-2` by `space-4` padding, 0.875rem weight-500 label, inline-flex with a `space-2` gap. Renders as an `<a>` when given an `href`, otherwise a `<button>`.
- **Primary:** Primary fill, on-primary text. Hover drops opacity to 0.9.
- **Secondary:** Surface fill, text color, hairline border. Hover keeps full opacity and fills `muted`. The `block` variant is full width.
- **Danger:** As secondary with negative text and a 50% negative border.
- **States:** Disabled (and `aria-disabled='true'`) is 0.5 opacity with a not-allowed cursor. Active (not disabled) scales to 0.98. Focus-visible is the global 2px primary outline with 2px offset .

### Cards / Containers

- **Corner Style:** 0.875rem (`--radius-card`).
- **Background:** Surface with a 1px border and `--shadow-1`.
- **List container:** `.list-card` (global class in `app.css`) on a `<ul>` of `ListRow` items; the shared way to group rows.
- **Internal Padding:** `space-4`; full width, with an optional `maxWidth` (360px on the login card).

### Inputs / Fields

- **Input style:** Surface background, 1px control-edge border, 0.625rem radius, padding `space-2` by `space-3`, full width, 2.75rem minimum height (inputs and selects).
- **Focus-visible:** Border turns primary and a 2px primary outline sits at 1px offset .
- **Field:** A label (flex column, `space-1` gap, small muted text) wrapping the control, plus an optional error line below: small text in the negative color with `role="alert"`, linked by an optional `errorId`.

### Segmented Control

A `muted` track (no edge, 3px padding, 2px gap, 0.625rem radius) of radio options, used for the theme choice, the Inicio currency tabs (`CurrencyTabs`) and the currency filters of the Cuentas and Movimientos lists. Options are at least 2.25rem tall, 0.875rem, weight 500, muted text; the selected option is a `--bg` chip with the text color and a small literal shadow (`0 1px 3px`). The radio input is invisible and extends 4px above and below the option so the hit area stays at least 2.75rem; focus-visible draws a 2px primary outline on the option.

### Page Header and Empty State

- **PageHeader:** The sticky top bar of every app screen: a row `[back] [eyebrow + h1] [bell] [avatar]`. Props `title`, optional `eyebrow` (defaults to today's date in Buenos Aires, es-AR, from the `(app)` layout load) and optional `back` (`{ href, label }`: a 2.75rem circular chevron-left link, `label` is its aria-label, hover tints primary 8%). The h1 is 1.75rem, 500, line-height 1.2 under a muted 0.8125rem eyebrow; it wraps and is never truncated, and the back link, bell and avatar stay fixed 2.75rem (the title wraps below them at large text). The bell is a 2.75rem `--surface` square with a hairline border and `--radius`, linking to `/notifications` (2px primary ring on that page); its badge is a 1.25rem primary pill with the alert count as text (`--on-primary`, 0.75rem, 600, capped at "9+") straddling its top-right corner, and is `aria-hidden` because the link's label already says "Avisos: N" (plain "Avisos" at zero). The bar is sticky only on viewports at least 40em tall (see Layout), uses `--bg` at 92% with a 12px backdrop blur, `space-4` top and `space-3` bottom padding, and a transparent bottom hairline that turns `--border` once the page scrolls (CSS scroll-driven animation inside `@supports (animation-timeline: scroll())`, no JS). The avatar is a 2.75rem `muted` circle with the user's initials linking to Profile (`aria-label="Perfil"`, 2px primary ring on the current page); it is hidden when the layout data is missing (error page). Back rules: bottom-nav tabs have none; every other screen links up to a fixed parent; New movement returns to the in-app screen it was opened from (fallback Inicio).
- **DetailHeader:** Used on account, category and movement detail. Renders `PageHeader` with `back`, then a hero `Card`. Props: `title`, `back`, `label` (muted small caption), optional `icon` and `color` (IconBadge), `value` (hero figure, 600, `clamp` hero size), `tone` (`positive`, `negative` or `transfer` colour for the value), `context` (muted small line) and a children snippet for extra content (such as the category per-currency nets).
- **Secondary link row:** "Ver movimientos" on account and category detail is a single `ListRow` with a trailing chevron-right in a surface container (hairline border, `--shadow-1`), not an underlined text link.
- **Add row (`.add-row`):** A dashed-border, `radius-card` link row (min 3.5rem tall, muted 0.875rem weight-500 text with a plus icon) after a list ("+ Nueva cuenta", "+ Nueva categoría"); hover turns the text to the text colour and the border primary. It replaces header action buttons.
- **Detail tone:** Detail hero amounts colour only income (`positive`, with "+"). Outcomes use the text colour with "-" (never `negative`), transfers use `transfer`. Category net is shown as a cash flow (spend "-", net income "+" in `positive`).
- **Destructive cue:** The confirm-delete trigger ("Eliminar") in the detail actions uses the `negative` text colour and a 50% `negative` border; other actions stay neutral.
- **FilterBar:** Wrapping flex form with `space-2` by `space-3` gaps. The search field takes the full first row (search icon inset left); a segmented control or filters disclosure takes its own full row; a checkbox label stays compact (auto width) and shares a row when it fits. On the movements list the filters `summary` is an inline pill (surface fill, hairline border, 2.75rem tall).
- **List day headings:** Movements group by day under a small heading (0.875rem, 600, muted text, `space-4` inline padding) rather than a body-size title.
- **CurrencyTabs:** `ARS | USD` `SegmentedControl` in a form posting to `/currency` (cookie `currency`); a failure shows a `role="alert"` line under it, and focus returns to the checked radio after switching.
- **Money:** An amount with the decimals dimmed for USD only (ARS has no decimal part; 70% opacity, text-colour amounts only, to keep 4.5:1; coloured decimals stay full), `tabular-nums`, the number breaks only after the symbol gap and at thousands separators (`<wbr>` after each `.`), never inside a digit group; `kind` colours it (`income` positive with a `+`, `transfer` transfer colour, `outcome`/`plain` text colour). Font size and weight come from the parent.
- **MovementRow:** A `ListRow` with a leading `.row-icon` (2.25rem muted square: description initial, or the transfer icon), title, subtitle and a trailing `Money` (`.row-amount`).
- **Section head:** `.section-head` (global): a wrapping flex row, heading left and a link or `Money` total right, baseline-aligned.
- **Profile:** One `Card` groups the user name and email, an "Administrar" link section (a `nav` with the "Cuentas" and "Categorías" links: 2.75rem tall, text colour, weight 500), the theme control and the "Cerrar sesión" button as sections separated by hairline dividers.
- **Reportes charts:** The 6-month income and outcome bars and the category donut are `aria-hidden` SVG/CSS; their text equivalents are the per-month link `aria-label` ("{mes}: ingresos X, gastos Y") and the visible slice list (name, %, amount). Tokens: income bar `--positive`, outcome bar `--text-muted` (income always left, outcome right, as in the legend, so colour is not the only cue), slices `--swatch-green`, `--swatch-orange`, `--swatch-blue`, `--swatch-plum` and `--transfer` for "Otros". Bars keep full opacity (non-text 3:1); the selected month has a bold label and `aria-current="true"`. The bar row bleeds to the card edges so each month link is at least 2.75rem wide at 320px.
- **Plan rule row (`/plan`):** A list card (surface, hairline border, `radius-card`) of rows; each row is a link (min 2.75rem, `ListRow` padding) with the description (0.875rem, 500), a muted 0.75rem line "status · Día N · account" and a trailing `Money`. An unpaid active rule adds a separate "Registrar" link (text colour, underlined, 600, 2.75rem tall) that wraps under the row at large text sizes. Status is always text, never colour alone.
- **EmptyState:** A centered column: a 3.5rem pill circle tinted with `color-mix(in srgb, var(--primary) 8%, transparent)` holding a primary-colored icon, over muted text. Used by the placeholder pages.

### Icon and Wordmark

- **Icon:** Inline SVG, 24px by default, 24-unit viewBox, `currentColor` 1.75 stroke with round caps and joins, `aria-hidden`. Names: home, accounts, plus, movements, categories, profile, plan, chart, search, chevron-left, chevron-right, transfer, plus the account icons (bank, wallet, cash, card, piggy-bank, dollar, coins, safe, briefcase, phone).
- **Wordmark:** A rounded-square ledger mark (two horizontal strokes) plus "Gastar" in title type. Mark fill is primary and strokes are on-primary, so it flips in dark; the text is primary.

### Sheet

A modal bottom sheet built on `<dialog>` (`showModal`): full width up to 35rem, max height 85dvh, raised-surface fill, 1px border, top corners rounded 0.625rem, bottom safe-area padding. The backdrop is the text color at 40%. A header holds an h2 title (1.25rem) and a secondary "Cerrar" button; clicking the backdrop or pressing Escape closes it.

### Option Picker

A field that opens a Sheet of radio rows. The trigger looks like an input (2.75rem minimum height, 1px control-edge border, 0.625rem radius, padding `space-2` by `space-3`) showing the selected row or a muted placeholder. Each row is an icon badge, a name (weight 500, truncated) and optional muted meta text (such as " · Archivada"), at least 2.75rem tall with a hairline divider. Hover fills the row `muted`; the selected row has a 2px primary outline; focus-visible a 2px primary outline at 2px offset. Choosing a row closes the sheet and returns focus to the trigger. Without JavaScript the rows render inline as a plain radio group.

### Icon and Color Pickers

Radio groups of round swatches (the icon picker shows the ten account icons in IconBadge, the color picker the eight swatches at 2.75rem). The checked option has a 2px text-color ring separated by a 2px surface gap; focus-visible moves the ring to 4px offset. The ring is a literal two-ring `box-shadow` in `IconPicker` and `ColorPicker`, a named exception to the no-literal-`box-shadow` rule (with the selected chip of `SegmentedControl`).

### Navigation

- **Style:** Fixed translucent bottom bar (`--bg` at 92% with a 12px backdrop blur) with a top hairline, no gap, and `space-2` vertical padding plus the bottom safe-area inset. Five equal slots: two items, the FAB, two items. Each item is an icon over a 0.75rem weight-500 label (0.6875rem under 22rem), muted by default, at least 2.75rem tall.
- **Item states:** Hover and `aria-current='page'` turn the label the text color; the active item's icon turns primary. Press scales to 0.96. Items have no horizontal padding; labels truncate with an ellipsis.
- **Top bar:** See PageHeader above. The bottom nav stays Inicio | Movimientos | + | Plan | Reportes (Cuentas and Categorías live in Profile).

### Plan Summary and Limit Row

The `/plan` summary is a `Card` with the "Disponible · {mes}" heading, a hero `Money`, a status pill (hairline `--border-strong`, `negative` border and text when over) whose label is always text, and a `<dl>` of figures (muted term, 500 value, a hairline above the "Para gastar" and "Disponible" totals) that wraps at 320px. A limit row sits in a `.list-card`: name, "{gastado} de {límite}", a text flag ("Vas rápido", "Te pasaste") and a 0.5rem pill `role="meter"` bar (`--primary` fill, `negative` when over) so state never relies on colour.

The Inicio "Disponible para gastar" card reuses this pattern in compact form: a `Card` after the balance card (the hero balance stays the one `--font-size-hero` figure), an h2, the amount at `--font-size-xl`, the same text status pill, the muted "por día" line and a 2.75rem "Ver plan" link. With no plan it shows the two lines of copy and a "Crear plan" `Button`.

### Wizard Steps

The plan setup is one form with four sections. With JS a step list (3px top border: `--primary` when done or current) and Siguiente / Atrás show one section at a time and focus its heading; without JS every section shows and one "Guardar plan" submits. Rows are `.list-card` check rows (at least 3rem) or bordered fieldsets; two-field pairs use `auto-fit` columns so they stack at 320px and 200% text.

### Nav FAB

A 3.25rem primary square with the 0.875rem card radius and a 24px plus icon, centered in the bottom nav. It is the only element with `--shadow-lift`; hover drops opacity to 0.9 and press scales to 0.96.

## Do's and Don'ts

### Do:

- **Do** use the theme tokens for every color, radius and spacing value.
- **Do** put `tabular-nums` on every amount; only income is coloured (`positive`, with `+`); outcomes use the text colour with a minus sign and transfers the neutral `transfer` colour.
- **Do** use `--radius` for buttons and fields and `--radius-card` for cards and the FAB.
- **Do** group lists and sections into surface cards (`Card` or `.list-card`) and pick the lowest elevation token that works; keep `--shadow-lift` for the FAB.
- **Do** keep primary for actions, selection and focus; use `border-strong` on control edges.

### Don't:

- **Don't** hardcode hex values in components.
- **Don't** use primary as link text; links use the text color with an underline.
- **Don't** hardcode a `box-shadow` in a component (the checked ring of `IconPicker` and `ColorPicker` and the selected chip of `SegmentedControl` are the only exceptions) or add a shadow outside the elevation scale; don't use heavy black shadows in dark; don't add hover, press and disabled treatments beyond those described in Components (0.9 hover opacity, tints, press scale, 0.5 disabled).
- **Don't** treat these known gaps (documented, not decided) as settled: z-indices are not tokenized, and the tint percentage (8% `color-mix`) and the 0.96 and 0.98 press scales are repeated literals rather than tokens.
