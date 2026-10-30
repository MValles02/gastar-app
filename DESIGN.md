---
name: Gastar
description: Private personal ledger for Argentina.
colors:
  primary: 'oklch(0.508 0.118 165.612)'
  primary-dark: 'oklch(0.432 0.095 166.913)'
  on-primary: 'oklch(0.979 0.021 166.113)'
  on-primary-dark: 'oklch(0.979 0.021 166.113)'
  background: 'oklch(0.955 0.02 85)'
  background-dark: 'oklch(0.147 0.004 49.25)'
  surface: 'oklch(0.98 0.012 85)'
  surface-dark: 'oklch(0.216 0.006 56.043)'
  surface-raised: 'oklch(0.98 0.012 85)'
  surface-raised-dark: 'oklch(0.216 0.006 56.043)'
  muted: 'oklch(0.925 0.022 82)'
  muted-dark: 'oklch(0.268 0.007 34.298)'
  text: 'oklch(0.18 0.012 60)'
  text-dark: 'oklch(0.985 0.001 106.423)'
  text-muted: 'oklch(0.52 0.022 70)'
  text-muted-dark: 'oklch(0.709 0.01 56.259)'
  border: 'oklch(0.895 0.02 80)'
  border-dark: 'oklch(1 0 0 / 10%)'
  border-strong: 'oklch(0.68 0.025 70)'
  border-strong-dark: 'oklch(0.553 0.013 58.071)'
  positive: '#2e6b34'
  positive-dark: '#8bd68f'
  negative: 'oklch(0.577 0.245 27.325)'
  negative-dark: 'oklch(0.704 0.191 22.216)'
  warning: 'oklch(0.555 0.163 48.998)'
  warning-dark: 'oklch(0.879 0.169 91.605)'
  transfer: '#2c5d8a'
  transfer-dark: '#8db8e6'
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
    fontFamily: "'Geist Mono Variable', ui-monospace, monospace"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  headline:
    fontFamily: "'Geist Mono Variable', ui-monospace, monospace"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "'Geist Mono Variable', ui-monospace, monospace"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "'Geist Mono Variable', ui-monospace, monospace"
    fontSize: '0.875rem'
    fontWeight: 400
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
  button-default:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '0 0.625rem'
    height: '2.75rem'
  button-outline:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '0 0.625rem'
    height: '2.75rem'
  input:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.25rem 0.625rem'
    height: '2rem'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.card}'
    padding: '1rem'
  nav-item:
    textColor: '{colors.text-muted}'
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
  empty-media-icon:
    backgroundColor: '{colors.muted}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    size: '2rem'
  top-bar:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    typography: '{typography.headline}'
    padding: '1rem 1.5rem 0.75rem'
---

# Design System: Gastar

## Overview

**Creative North Star: "The Private Ledger"**

Gastar is a calm, precise, personal book of accounts. Numbers lead, and color appears only at moments that matter. The tone is the classic, serious-bank feel from PRODUCT.md, a durable brand commitment rather than a style option. The single theme comes from the shadcn/ui preset bJMUTPE2, adapted: light is warm cream (a cream page with lighter-cream cards, no pure white anywhere), dark is stone near-black, the primary is emerald, and both themes are first-class. The app keeps its own positive, transfer and swatch colours, a primary-coloured focus ring, and a stronger `border-strong` for form-control contrast. The visual language is shadcn/ui-like: hairline borders, small radii and compact controls.

The system is quiet and layered. Tonal surfaces, hairline borders and a small three-step elevation scale carry structure, type weight carries hierarchy, and the FAB marks the primary action. Buttons and navigation are compact and confident: small radii, a firm 2px focus ring, a slight press scale, and a clear dimmed disabled state.

**Key Characteristics:**

- Warm cream neutrals with an emerald primary in light, stone near-black with a deeper emerald primary in dark, switched by token swap only (`light-dark()` in `app.css`).
- One typeface (Geist Mono) everywhere, body, headings, titles and amounts, with weight, not size, doing most of the hierarchy work.
- Lists and sections sit on surface cards over the page; a three-step elevation scale (`--shadow-1`, `--shadow-2`, `--shadow-lift`).
- 0.625rem radius buttons and fields, 0.875rem cards and FAB; pills only for the top-bar avatar and bell badge.
- Tabular numerals for every amount.

## Colors

Warm cream neutrals and an emerald primary, plus three semantic tones for money direction.

The theme is switched via `data-theme` on `<html>` (`light`, `dark`, or absent for system), with `prefers-color-scheme` as the fallback when the attribute is absent. In dark, the neutrals are stone near-black and the primary is a deeper emerald (`primary-dark`) with the same pale on-primary. The `-dark` tokens in the frontmatter are the dark-theme values of the same roles.

### Primary

- **Emerald** (`primary`): Primary buttons, the center FAB, the wordmark, the active nav icon and the focus ring. Dark: deeper emerald (`primary-dark`).

### Neutral (cream, stone in dark)

- **Cream** (`background`): Page background and the translucent bottom nav. Dark counterpart: stone near-black (`background-dark`).
- **Light Cream** (`surface`): Cards and fields, lighter than the page; never pure white. Dark counterpart: `surface-dark`.
- **Raised Cream** (`surface-raised`): Layers above a surface, such as the BottomDrawer (popover fill) and ConfirmDialog (stock shadcn `AlertDialog`, popover fill). Dark counterpart: `surface-raised-dark`.
- **Warning** (`warning`): Amber text and tint of the `warning` StatusPill tone (due today or soon, "Vas rápido"); `--warning` in `app.css`, mapped to the Tailwind `warning` colour. Dark counterpart: `warning-dark`.
- **Muted** (`muted`): A warm-tinted fill for the segmented track, hover fills (rows, secondary button, top-bar avatar). Dark counterpart: `muted-dark`.
- **Ledger Ink** (`text`): Body text. Dark counterpart: `text-dark`.
- **Muted Ink** (`text-muted`): Labels and inactive nav items. Dark counterpart: `text-muted-dark`.
- **Hairline** (`border`): 1px borders on bars, cards and dividers. Dark counterpart: `border-dark`.
- **Control Edge** (`border-strong`): 1px edges of form controls, at least 3:1 against the surface. Dark counterpart: `border-strong-dark`.
- **On primary** (`on-primary`): Text on primary fills. Dark counterpart: `on-primary-dark`.

### Semantic

- **Positive** (`positive`): Income amounts. Dark: `positive-dark`.
- **Negative** (`negative`): Outcome amounts (and negative balances), error messages and destructive actions. Dark: `negative-dark`.
- **Transfer** (`transfer`): Transfer amounts (blue). Dark: `transfer-dark`.

### Swatches

- **Account and category swatches** (`--swatch-green`, `--swatch-teal`, `--swatch-blue`, `--swatch-violet`, `--swatch-plum`, `--swatch-red`, `--swatch-orange`, `--swatch-ochre`): The eight user-pickable accent colours for IconBadge and the color picker, each with a light and a `-dark` value (listed in the frontmatter, defined with `light-dark()` in `app.css`).

### Named Rules

**The Action Colour Rule.** Primary marks actions, selection and focus only: button fills, the FAB, the active nav icon and the focus ring. Never use it for link text; links use the text color (links underlined).

**The Control Edge Rule.** Controls are identified by their edge: inputs, selects and the option picker trigger use `border-strong`. Cards, bars and dividers stay on the hairline `border`. The segmented track is a `muted` fill with no edge.

**The Token Rule.** Colors come from the theme tokens; never hardcode a hex in a component.

## Typography

**Display Font:** none
**Body Font:** Geist Mono (with ui-monospace, monospace fallback), a variable font loaded via @fontsource-variable/geist-mono, used for body, headings, titles and amounts.

**Character:** A single monospaced family, so amounts and columns align naturally. Hierarchy comes from weight and a short size scale (0.75rem `--font-size-xs`, 0.875rem `--font-size-sm`, 1rem `--font-size-base`, 1.25rem `--font-size-lg`, 1.75rem `--font-size-xl`, plus the 2.25rem hero step) rather than a second family.

### Hierarchy

- **Headline** (600, h1 to h3, 1.2, letter-spacing -0.01em): Page and section headings.
- **Title** (600, 1.25rem): The "Gastar" wordmark text on the login screen.
- **Page title** (500, 1.75rem, 1.2): The `PageHeader` h1 on every screen.
- **Body** (400, 1rem, 1.5): Default text and fields.
- **Label** (400, 0.875rem): Form labels in muted ink, and error text in the negative color. Buttons use 0.875rem at weight 500.
- **Hero** (`--font-size-hero`, 2.25rem): The large balance or amount figure on the dashboard, account detail and movement detail, sized `clamp(1.5rem, 9vw, var(--font-size-hero))` so it shrinks on narrow screens.

### Named Rules

**The Tabular Rule.** Every money amount uses `font-variant-numeric: tabular-nums` (the `.amount` class) so columns align.

## Layout

Mobile-first single column with no layout breakpoints; no narrow-width tweaks. `.content` shares the `--content-width` (560px) column with the bottom nav; the nav spans the full width with a border (translucent: `--bg` at 92% with a 12px backdrop blur) and its inner items are inset (inline padding of `space-5` inside the column, as page content). `.content` sets `--gutter` (`space-5`) as its inline padding; the page top bar bleeds out to the content edges with a negative `--gutter` margin. The segmented control options shrink (`min-width: 0`, `space-1` side padding), wrap labels with `overflow-wrap: anywhere` instead of clipping, and keep the 2.75rem hit area. The page top bar is sticky (z-index 9, inside `.content`) only on viewports at least 40em tall (`@media (min-height: 40em)`; `em` is the browser text size, so large text or zoom turns it off and the bar scrolls away); under the same query `html` has a `scroll-padding-top` so focused elements stay clear of it, and the bottom nav is fixed with a `safe-area-inset-bottom` allowance (z-index 10). Content bottom padding is `calc(space-8 + 4.5rem + env(safe-area-inset-bottom))` so nothing hides under the nav. The login screen is a centered column with safe-area padding on all four sides. Spacing is a short rem scale (`space-1` to `space-6`, plus `space-8`); page padding is `space-5`. The browser theme color follows the page background (cream / stone near-black); the PWA manifest `theme_color` is a cream (`#f6efe1`).

## Elevation & Depth

Depth comes from layering first, shadow second. The page (cream) is the base; lists and sections sit on surface cards (lighter cream) with a 1px hairline border; sheets sit on the raised surface. Shadows are soft and small, and money direction colours are never affected by them.

### Elevation Scale

- **Level 0, page** (`--bg`): No shadow.
- **Level 1, card** (`--shadow-1`: light `0 1px 2px rgb(0 0 0 / 0.04)`; dark `0 1px 2px rgb(0 0 0 / 0.2)`): `Card` and `ListCard` (surface fill, hairline border, 0.875rem radius, clipped overflow). Used for list pages, dashboard sections and the merged balance card (total balance plus month balance).
- **Level 2, raised** (`--shadow-2`: light `0 2px 8px rgb(0 0 0 / 0.12)`; dark `0 2px 8px rgb(0 0 0 / 0.35)` plus a brighter inset highlight): Modal layers: the `BottomDrawer` and `ConfirmDialog`, both stock shadcn parts with the popover fill.
- **Lift** (`--shadow-lift`: light `0 6px 16px rgb(0 0 0 / 0.2)`; dark `0 6px 16px rgb(0 0 0 / 0.6)` plus a 1px border-token edge): The center "+" FAB only; it stays the most prominent element in the bottom nav.

### Dark Theme

Dark (stone near-black with emerald primary) does not rely on black shadows, which vanish on dark backgrounds. Elevation is expressed by lighter surface steps (`--bg` < `--surface` < `--surface-raised`), the hairline border as a subtle edge, and a faint inset top highlight on raised layers; the drop shadows are kept light-touch except the FAB lift.

### Row Feedback

An `Item` row (a link or button via the `child` snippet) fills with `muted` on hover (links only, stock shadcn `hover:bg-muted`) and while pressed (links and buttons, `app.css`), and shows the stock 3px focus ring. Rows are stock shadcn `Item.Media`, `Item.Content` (`Item.Title`, `Item.Description`) and `Item.Actions`; there is no row scale.

### Named Rules

**The Layering Rule.** Group rows and sections into a surface card (`Card` or `ListCard`); do not leave lists directly on the page background. Use the lowest elevation level that separates the layer.

## Shapes

Three radii: `--radius` 0.625rem (`rounded.md`) for buttons, fields, the segmented track and the option picker trigger; `--radius-card` 0.875rem (`rounded.card`) for cards, list cards and the FAB; and a full pill (`rounded.pill`, 999px) for the avatar (a 2.75rem circle). The wordmark mark and the empty-state badge reuse them (an 8px-radius mark; a 3.5rem tinted circle). Borders are always 1px in the border token. Transitions are 0.15s ease on opacity, color and background-color. When `prefers-reduced-motion: no-preference` also holds, `transform` is added so pressed buttons, nav items and the FAB scale down (0.98 for buttons, 0.96 for the rest); with reduced motion there is no press scale. Screens change with a page transition (View Transitions API, `app.css`), 0.28s on an iOS-like curve (`cubic-bezier(0.32, 0.72, 0, 1)`): opening a child screen slides it in from the right while the old one drifts left and dims; going back reverses it; switching tabs crossfades in 0.2s; a form sheet rises from the bottom over the screen it opens from and lowers off it on Cancelar, save, back or a drag (from where the drag left it) while the screens underneath crossfade. Changes within one screen (month, currency, filters, search) update in place with no transition, since taps are ignored while one runs. The header and tab bar crossfade in place instead of sliding. There is no page transition with reduced motion, without browser support, or when the browser already animated the back swipe.

## Components

Shared components live in `src/lib/components/`.

### Buttons

- **Source:** the generated shadcn-svelte `Button` (`$lib/components/ui/button`), used with its stock styling. It renders an `<a>` when given an `href`, otherwise a `<button>` (type `button` unless set).
- **Shape (default size):** 0.625rem radius, 2.75rem tall (`--tap-target`, one height on every form, detail and auth screen), 0.625rem horizontal padding, 0.875rem weight-500 label, inline-flex. Full width is `class="w-full"`.
- **`default`:** Primary fill, on-primary text; hover fills primary at 80%. Used for the main action.
- **`outline`:** Page-background fill, hairline border, text colour; hover fills `muted`. Used for secondary actions (Cancelar, Archivar, filter trigger).
- **`destructive`:** Tinted negative fill (10%), negative text. Used for delete triggers.
- **`link`:** Primary text, underline on hover; inline actions such as "Quitar" and "Usar sugeridos" (destructive ones add `text-destructive`).
- **States:** Disabled is 0.5 opacity and non-interactive. Focus-visible is a 3px ring (`ring-ring/50`) with a ring-coloured border. Active (not disabled) nudges down 1px and takes the variant's hover fill, so a tap shows a press on touch screens.

### Cards / Containers

- **Source:** the generated shadcn-svelte `Card` (`$lib/components/ui/card`) with stock styling: `Card.Root` plus `Card.Content` (and `Header`/`Title` where a heading is part of the card).
- **Corner Style:** 0.875rem (`rounded-xl`, equal to `--radius-card`).
- **Background:** `card` (surface) with a 1px foreground 10% ring and no shadow.
- **List container:** `ListCard` (`Item.Group` with the card border, radius and shadow) holding `ListRow`s; the one way to group rows.
- **Internal Padding:** 1rem (`--card-spacing`) vertically on the root and horizontally on `Card.Content`. Cards that lay out their own sections use `Card.Root` with `class="gap-0 overflow-hidden py-0"` and no `Card.Content`.

### Inputs / Fields

- **App forms:** The same generated shadcn parts with stock styling as the auth forms, stacked (label above control): `Field.Field` with `Field.Label for=` and `Input` (text, number and date), `InputGroup` for the amount (currency symbol as an inline-start addon) and the FilterBar search (search icon addon, `aria-label`), and `NativeSelect` (+ `NativeSelect.Option`) for native selects. Errors are `Field.Error` (`role="alert"`, linked by `aria-describedby`); fields inside the list cards of the account, category, movement and recurring forms sit in a `Field.Field` with `p-4`. `OptionPicker` keeps its custom styling until migrated. Filter checkboxes are the generated shadcn `Checkbox` next to a `Field.Label for=` in a horizontal `Field.Field`; form toggles are `SwitchRow` (below); checkboxes, switches and radios are Bits UI buttons and need JavaScript (no no-JS fallback, except the `OptionPicker` rows).
- **Auth forms:** Use the generated shadcn parts with stock styling: `Field.Field` per field with `Field.Label for=`, `Input` (2rem tall, `border-input`, 3px ring on focus), `Field.Error` (`role="alert"`, destructive text, linked by `aria-describedby`) and `Field.Description` for hints. `PasswordInput` is an `InputGroup` with an inline-end ghost icon `InputGroup.Button` toggling visibility (`aria-pressed`).

### Segmented Control

A `muted` track (no edge, 3px padding, 2px gap, 0.625rem radius) built on the generated shadcn `RadioGroup` (`RadioGroup.Root` + `RadioGroup.Item` inside a `Label`), used for the theme choice, the Inicio currency tabs (`CurrencyTabs`) and the currency filters of the Cuentas and Movimientos lists. Options are at least 2.25rem tall, 0.875rem, weight 500, muted text; the selected option is a `background` chip with the text color and the stock `shadow-sm`. The `RadioGroup.Item` is an invisible button covering the whole option, so the hit area is the option; focus-visible draws the stock 3px ring on the option. Requires JavaScript (a form `name` renders a hidden input that posts the value).

### Page Header and Empty State

- **PageHeader:** The sticky top bar of every app screen: a row `[back] [eyebrow + h1] [bell] [avatar]`. Props `title`, optional `eyebrow` (defaults to today's date in Buenos Aires, es-AR, from the `(app)` layout load) and optional `back` (`{ href, label }`: a stock ghost icon `Button` with href and a chevron-left; `label` is its aria-label; `close` is the same with an X). The h1 is 1.75rem, 500, line-height 1.2 under a muted 0.8125rem eyebrow; it wraps and is never truncated, and the bell and avatar links stay fixed 2.75rem (the title wraps below them at large text). The bell is a 2.75rem `--surface` square with a hairline border and `--radius`, linking to `/notifications` (2px primary ring on that page); its badge is a stock `Badge` with the alert count as text (capped at "9+") straddling its top-right corner, and is `aria-hidden` because the link's label already says "Avisos: N" (plain "Avisos" at zero). The bar is sticky only on viewports at least 40em tall (see Layout), uses `--bg` at 92% with a 12px backdrop blur, `space-4` top and `space-3` bottom padding, and a transparent bottom hairline that turns `--border` once the page scrolls (CSS scroll-driven animation inside `@supports (animation-timeline: scroll())`, no JS). The avatar is a stock `Avatar` (`Avatar.Fallback` with the user's initials) inside a 2.75rem link to Profile (`aria-label="Perfil"`, 2px primary ring on the current page); it is hidden when the layout data is missing (error page). Back rules: bottom-nav tabs have none; every other screen links up to a fixed parent; New movement returns to the in-app screen it was opened from (fallback Inicio).
- **Secondary link row:** "Ver movimientos" on account and category detail is the last row of the details card (`DetailCard`): a `ListRow` with a trailing chevron-right under a hairline top border, not an underlined text link.
- **SwitchRow:** A horizontal `Field.Field` (min 3.5rem, `px-4`) with the `Field.Label` filling the row and the stock shadcn `Switch` (Bits UI) at its end; posts `name=value` (default `on`) when on. Sits as an `<li>` in a fields card ("Repetir cada mes") or alone in a `Card` ("Usar este plan todos los meses").
- **Sheet:** Every form screen (`FORM_ROUTES`) is an iOS-style bottom sheet: the `(app)` layout wraps it in `Sheet` (a `--bg` panel with `--radius-card` top corners and `--shadow-2`, over a `--scrim`-dimmed strip at the top; no tab bar), and the page wraps its content in `SheetHeader` instead of starting with `PageHeader`: a centered grabber, Cancelar (ghost link, pops up like ‹) top-left, the one-line truncating title centered, and Guardar (primary, a real `type="submit"` for the form with `id="sheet-form"` through its `form` attribute, or a link for a wizard's Siguiente) top-right, drawn over the bar but last in the DOM so Tab goes Cancelar, the fields, Guardar; destructive actions sit at the end of the sheet body. Dragging the bar down past 120px, or a downward flick, is Cancelar (no new history entry); a shorter drag springs back (0.35s on the page-transition curve, instant with reduced motion), and a drag is ignored while a pop is already in flight. The bar is sticky on the same terms as `PageHeader`, stopping below the notch (`env(safe-area-inset-top)`) with a sheet-coloured strip over the safe area.
- **DetailActions:** The action stack of detail screens: the primary action full width, then Editar (outline) and a secondary action 50/50 (Editar alone is full width), then the destructive action full width (`ConfirmDialog` with `triggerClass="w-full"`).
- **ActionLink:** The underlined text-colour link for section actions ("Agregar", "Ver todos"), 0.875rem weight 500, 2.75rem tall. It replaces the old add-row cards: lists get "Agregar" under their `SectionHeader` (Cuentas and Categorías, right under the `FilterBar`).
- **Detail tone:** Amounts never show a visible "+" or "-"; colour carries the direction: income `positive`, outcome `negative`, transfer `transfer`. Category net is shown as a cash flow (spend `negative`, net income `positive`).
- **Destructive cue:** The confirm-delete trigger ("Eliminar") in the detail actions uses the `negative` text colour and a 50% `negative` border; other actions stay neutral.
- **FilterBar:** Wrapping flex form with `space-2` by `space-3` gaps. The search field takes the full first row (search icon inset left); a segmented control or filters disclosure takes its own full row; a checkbox label stays compact (auto width) and shares a row when it fits. The form submits on native `change` and on a click of any checkbox or radio inside it (Bits controls fire no `change`). On the movements list the filters `summary` is an inline pill (surface fill, hairline border, 2.75rem tall).
- **List day headings:** Movements group by day under a small heading (0.875rem, 600, muted text, `space-4` inline padding) rather than a body-size title.
- **CurrencyTabs:** `ARS | USD` `SegmentedControl` in a form posting to `/currency` (cookie `currency`); a failure shows a `role="alert"` line under it, and focus returns to the checked radio after switching.
- **Money:** An amount with the decimals dimmed for USD only (ARS has no decimal part; 70% opacity, text-colour amounts only, to keep 4.5:1; coloured decimals stay full), `tabular-nums`, the number breaks only after the symbol gap and at thousands separators (`<wbr>` after each `.`), never inside a digit group; no visible sign: `tone` colours it. `stock` (default; balances, totals) is the text colour, negative when below zero. `flow` (movements) follows `direction`: `income` positive, `outcome` negative, `transfer` the text colour (the `transfer` colour stays for transfer tiles and icons); without `direction` it follows the sign. Zero is always the text colour. A visually hidden "-"/"+" keeps the direction for screen readers. Font size and weight come from the parent. `HeroAmount` takes the same `tone`/`direction`. A transfer's amount keeps the text colour; the `transfer` colour only tints its glyph.
- **DetailHero:** The amount card of the movement, recurring-rule, account and category detail pages: a `Card` with a centered `HeroAmount` and a muted label below (type, "Saldo"), no icon. A `top` snippet holds a month nav (category) and `children` replaces the amount (empty or multi-currency states). The account hero is `stock`; the others are `flow`.
- **ListRow / ListCard:** One row component for every list. `ListRow` is a `listitem` wrapping a stock `Item.Root` (link via `href`, `submit` button or plain block) with: an optional `lead` (`IconBadge`, fixed 2.25rem, icon or letter, neutral when no colour); line 1 `Item.Title` (truncated) with the `value` (`.row-amount`, display font, top-aligned, right) beside it; line 2 `Item.Description` with a `StatusPill`, then `.row-meta` (truncating) and `metaEnd`; an optional full-width `footer` (a `Meter`); `chevron` for navigation rows; `dimmed` mutes the lead, title and value (archived accounts and categories, inactive rules). The status pill never sits on line 1, so it cannot overlap an amount. `MovementRow` is a `ListRow`: lead is the category icon (or the description initial) in the category colour, neutral without a category, and a transfer uses the `transfer` colour on the glyph only (`IconBadge glyph`, neutral tile); with a `date`, line 2 is the date in meta and the account (or "Origen → Destino" for a transfer) end-aligned in `metaEnd`, without it the account or transfer pair is the meta; no category name; `Money tone="flow"`.
- **Meter:** A 0.375rem track (`muted`) with a fill in a swatch colour; with a `label` it is `role="meter"` with `aria-valuetext` (limits). Used by plan limits and the Inicio category rows.
- **StatusPill:** A `Badge` with a 14% tint of the tone colour as fill and the tone colour as text: `ok` (positive, check), `warning` (amber, clock), `bad` (negative, alert circle), `neutral` (muted fill, muted text, no icon). Tone maps live in `$lib/status` (`PLAN_TONE`, `DUE_TONE`); the label is always text.
- **SectionHeader / CardEyebrow:** `SectionHeader` (`.section-head`) is a wrapping flex row: the title (1.25rem, 600) or, for `variant="group"`, a `CardEyebrow` h2; an `aside` (group total) on the same line at the right; an `action` (`ActionLink`) on its own line under the title. `CardEyebrow` is the single small uppercase muted label (0.75rem, 600, 0.06em tracking) used above figures and groups.
- **Profile:** The user name and email, then one `ListCard` ("Tu cuenta") of uniform `ListRow`s, each with an icon lead and a chevron and no value: Cambiar nombre (profile), Cambiar contraseña (lock), Cuentas, Categorías and, when connected, Mercado Pago; then the theme control and the "Cerrar sesión" button as separate sections. The delete-account page opens with a `DangerCallout` (1px negative border, card radius, alert icon).
- **Reportes charts:** The 6-month income and outcome bars and the category donut are `aria-hidden` SVG/CSS; their text equivalents are the per-month link `aria-label` ("{mes}: ingresos X, gastos Y") and the visible slice list (name, %, amount). Tokens: income bar `--positive`, outcome bar `--negative` (income always left, outcome right, as in the legend, so colour is not the only cue), slices `--swatch-green`, `--swatch-orange`, `--swatch-blue`, `--swatch-plum` and `--text-muted` for "Otros". Bars keep full opacity (non-text 3:1); the selected month has a bold label and `aria-current="true"`. The bar row bleeds to the card edges so each month link is at least 2.75rem wide at 320px.
- **Plan rule row (`/plan`):** A `ListRow` in a `ListCard`, a link to the rule detail (where "Registrar" lives): letter lead, description, `Money` value, a `StatusPill` (`DUE_TONE`: paid ok, today warning, overdue bad, upcoming neutral; inactive rules neutral with the reason) and "Día N · account" as meta; inactive rows are `dimmed`. Status is always text, never colour alone.
- **Empty (shadcn `Empty`):** `Empty.Root > Empty.Header > Empty.Media variant="icon"` (2rem muted rounded square, 1rem icon) plus `Empty.Description` (muted text), centered; action `Button`s sit below it. Full-screen status pages (check email, expired link) wrap `Empty.Root class="min-h-dvh"` in a `main`, with `Empty.Title` as the level-1 heading and the actions in `Empty.Content`.

### Icon and Wordmark

- **Icon:** Inline SVG, 24px by default, 24-unit viewBox, `currentColor` 1.75 stroke with round caps and joins, `aria-hidden`. Names: home, accounts, plus, movements, categories, profile, plan, chart, search, chevron-left, chevron-right, transfer, lock, tag, plus the category icons (tag, cart, food, transport, car, health, education, entertainment, gift, travel, services, clothing, pets, salary) and the account icons (bank, wallet, cash, card, piggy-bank, dollar, coins, safe, briefcase, phone).
- **Wordmark:** A rounded-square ledger mark (two horizontal strokes) plus "Gastar" in title type. Mark fill is primary and strokes are on-primary, so it flips in dark; the text is primary.

### Bottom Drawer

A modal bottom drawer (`BottomDrawer`) composed only of the generated shadcn-svelte `Drawer` (vaul-svelte) parts with stock styling: `Drawer.Root`, `Drawer.Content` (popover fill, top corners `rounded-t-xl`, max height 80vh, centred up to 35rem, stock overlay and grab handle), `Drawer.Header` as a row with `Drawer.Title` and a `Drawer.Close` rendered as a ghost icon `Button` (`aria-label="Cerrar"`), then a scrolling body with bottom safe-area padding. The dialog is named by its title; dragging down, clicking the backdrop or pressing Escape closes it.

### Option Picker

A field that opens a Bottom Drawer of radio rows. The trigger is a stock `Button` (`outline`, full width, content left-aligned) showing the selected row or a muted placeholder; the `row` variant is a 3.5rem `ghost` button with the label left and value plus chevron right. Each drawer row is a stock `Item` button: `Item.Media` with the icon badge, `Item.Title` (the name) and an optional `Item.Description` (such as " · Archivada"); the selected row (`aria-pressed`) shows a trailing check in `Item.Actions`. Hover fills the row `muted`; focus-visible is the stock 3px ring. Choosing a row closes the drawer and returns focus to the trigger. Without JavaScript the rows render inline as a plain radio group.

### Icon and Color Pickers

Shadcn `RadioGroup`s of round swatches (the icon picker shows the ten account icons in IconBadge, the color picker the eight swatches at 2.75rem), each swatch inside a `Label` wrapping an invisible `RadioGroup.Item`. The checked option has a 2px text-color ring (`ring-2 ring-offset-2`, offset in the page background); focus-visible draws a 2px ring-colored outline at 4px offset. Requires JavaScript.

### Navigation

- **Style:** Fixed translucent bottom bar (`--bg` at 92% with a 12px backdrop blur) with a top hairline, no gap, and `space-2` vertical padding plus the bottom safe-area inset. Five equal slots: two items, the FAB, two items. Each item is an icon only (no visible label; the Spanish name is its `aria-label` and `title`), muted by default, at least 2.75rem tall.
- **Item states:** `aria-current='page'` gives the item a `muted` pill and turns its icon primary. Press scales to 0.96.
- **Top bar:** See PageHeader above.
- **Month stepper (`MonthNav`):** Two ghost icon `Button`s (chevron-left and chevron-right, `aria-label` "Mes anterior"/"Mes siguiente") around the `.month-label`; on the current month the forward button is `disabled` with `aria-disabled="true"`.
- **Auth tabs (`AuthTabs`):** A `ButtonGroup` of two linked `Button`s (Ingresar, Crear cuenta) in a `nav` labelled "Acceso"; the active one is `default`, the other `outline`, with `aria-current="page"`. The bottom nav stays Inicio | Movimientos | + | Plan | Reportes (Cuentas and Categorías live in Profile).

### Plan Summary and Limit Row

The `/plan` summary is a `Card` with the "Disponible · {mes}" heading, a hero `Money`, a `StatusPill` (`PLAN_TONE`: ok, warning, bad) whose label is always text, and a `<dl>` of figures (muted term, 500 value, a hairline above the "Para gastar" and "Disponible" totals) that wraps at 320px. A limit row is a `ListRow` in a `ListCard`: name, a `StatusPill` flag ("Vas rápido" warning, "Te pasaste" bad), "{gastado} de {límite}" as the value and a `Meter` footer, so state never relies on colour.

The Inicio "Disponible para gastar" card reuses this pattern in compact form: a `Card` after the balance card (the hero balance stays the one `--font-size-hero` figure), an h2, the amount at `--font-size-xl`, the same `StatusPill`, the muted "por día" line and a 2.75rem "Ver plan" link. With no plan it shows the two lines of copy and a "Crear plan" `Button`.

### Wizard Steps

The plan setup is one form with four sections. With JS a step list (3px top border: `--primary` when done or current) and Siguiente / Atrás show one section at a time and focus its heading; without JS every section shows and one "Guardar plan" submits. Rows are `ListRow`s, a `SwitchRow` in a `Card` or bordered fieldsets; two-field pairs use `auto-fit` columns so they stack at 320px and 200% text.

### Nav FAB

A 3.25rem primary square with the 0.875rem card radius and a 24px plus icon, centered in the bottom nav. It is the only element with `--shadow-lift`; hover drops opacity to 0.9 and press scales to 0.96.

### Touch

There is no grey WebKit tap flash (`-webkit-tap-highlight-color: transparent` on `html`); presses show through the `:active` styles above instead, which iOS Safari applies because the root layout listens to `touchstart`. Hover styles only apply where a pointer can hover (`@media (hover: hover)`, Tailwind's default for `hover:`), so a tap never leaves a sticky hover. Small controls keep their visual size and get a 44px hit area from an invisible `::after` centred on them (MonthNav arrows, the password eye, switches) or overhanging the segment (segmented controls, each segment at least 44px wide).

### Navigation Progress

A 3px `--primary` bar fixed at the top (`NavProgress`, below the safe area) appears only when a navigation's data takes longer than 150ms: a 40% segment sliding across in 1.1s on the page-transition curve, or a still full-width bar with reduced motion. It is gone before the page transition starts and is never part of its snapshots.

## Do's and Don'ts

### Do:

- **Do** use the theme tokens for every color, radius and spacing value.
- **Do** put `tabular-nums` on every amount; never show "+" or "-": income is `positive` (green), outcome `negative` (red), transfer `transfer` (blue).
- **Do** use `--radius` for buttons and fields and `--radius-card` for cards and the FAB.
- **Do** group lists and sections into surface cards (`Card` or `ListCard`) and pick the lowest elevation token that works; keep `--shadow-lift` for the FAB.
- **Do** keep primary for actions, selection and focus; use `border-strong` on control edges.

### Don't:

- **Don't** hardcode hex values in components.
- **Don't** use primary as link text; links use the text color with an underline.
- **Don't** hardcode a `box-shadow` in a component (there are no exceptions) or add a shadow outside the elevation scale; don't use heavy black shadows in dark; don't add hover, press and disabled treatments beyond those described in Components (0.9 hover opacity, tints, press scale, 0.5 disabled).
- **Don't** treat these known gaps (documented, not decided) as settled: z-indices are not tokenized, and the tint percentage (8% `color-mix`) and the 0.96 and 0.98 press scales are repeated literals rather than tokens.
