---
name: Gastar
description: Private personal ledger for Argentina.
colors:
  primary: 'oklch(0.5029 0.102 165.62)'
  primary-dark: 'oklch(0.432 0.095 166.913)'
  link: 'oklch(0.5029 0.102 165.62)'
  link-dark: 'oklch(0.8 0.11 166)'
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
  text: 'oklch(0.2344 0.0136 72.15)'
  text-dark: 'oklch(0.985 0.001 106.423)'
  text-muted: 'oklch(0.5013 0.0205 72.86)'
  text-muted-dark: 'oklch(0.709 0.01 56.259)'
  border: 'oklch(0.8934 0.0232 84.59)'
  border-dark: 'oklch(1 0 0 / 10%)'
  border-strong: 'oklch(0.6942 0.0274 78.84)'
  border-strong-dark: 'oklch(0.553 0.013 58.071)'
  positive: 'oklch(0.4731 0.1066 145.54)'
  positive-dark: 'oklch(0.809 0.1238 145.55)'
  negative: 'oklch(0.5214 0.2052 29.32)'
  negative-dark: 'oklch(0.704 0.191 22.216)'
  warning: 'oklch(0.555 0.163 48.998)'
  warning-dark: 'oklch(0.879 0.169 91.605)'
  transfer: 'oklch(0.4661 0.0907 248.6)'
  transfer-dark: 'oklch(0.7685 0.0808 250.59)'
  swatch-green: 'oklch(0.4731 0.1066 145.54)'
  swatch-green-dark: 'oklch(0.7698 0.0974 155.88)'
  swatch-teal: 'oklch(0.4812 0.0726 188.69)'
  swatch-teal-dark: 'oklch(0.7643 0.0853 191.69)'
  swatch-sky: 'oklch(0.4709 0.0813 230.38)'
  swatch-sky-dark: 'oklch(0.7808 0.0823 225.91)'
  swatch-blue: 'oklch(0.4661 0.0907 248.6)'
  swatch-blue-dark: 'oklch(0.7685 0.0808 250.59)'
  swatch-indigo: 'oklch(0.4525 0.1036 273.44)'
  swatch-indigo-dark: 'oklch(0.7542 0.0859 275.98)'
  swatch-violet: 'oklch(0.4555 0.1025 293.42)'
  swatch-violet-dark: 'oklch(0.7534 0.0962 294.95)'
  swatch-plum: 'oklch(0.4537 0.1045 337.26)'
  swatch-plum-dark: 'oklch(0.7604 0.0943 338.13)'
  swatch-pink: 'oklch(0.4915 0.1322 1.21)'
  swatch-pink-dark: 'oklch(0.7864 0.0949 356.25)'
  swatch-red: 'oklch(0.482 0.1301 30.29)'
  swatch-red-dark: 'oklch(0.7807 0.0989 31.81)'
  swatch-orange: 'oklch(0.5608 0.1393 47.62)'
  swatch-orange-dark: 'oklch(0.809 0.1022 62.68)'
  swatch-amber: 'oklch(0.5307 0.11 58.79)'
  swatch-amber-dark: 'oklch(0.8048 0.1089 70.54)'
  swatch-ochre: 'oklch(0.5487 0.1025 88.11)'
  swatch-ochre-dark: 'oklch(0.8198 0.1093 95.99)'
  swatch-olive: 'oklch(0.5017 0.1008 117.85)'
  swatch-olive-dark: 'oklch(0.8109 0.1151 116.88)'
  swatch-brown: 'oklch(0.4525 0.0565 57.6)'
  swatch-brown-dark: 'oklch(0.7621 0.0625 60.14)'
  swatch-slate: 'oklch(0.4546 0.0316 251.94)'
  swatch-slate-dark: 'oklch(0.7605 0.0326 252.75)'
  swatch-gray: 'oklch(0.4694 0.0108 78.22)'
  swatch-gray-dark: 'oklch(0.7686 0.0126 79.77)'
typography:
  body:
    fontFamily: "'Geist Mono Variable', ui-monospace, monospace"
    fontSize: '0.9375rem'
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
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.5
rounded:
  md: '0.625rem'
  card: '1.25rem'
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
    rounded: '{rounded.pill}'
    padding: '0 1.25rem'
    height: '50px'
  button-outline:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '0 1.25rem'
    height: '50px'
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
    padding: '1.25rem'
  nav-item:
    textColor: '{colors.text-muted}'
    height: '2.75rem'
  nav-item-active:
    textColor: '{colors.text}'
  nav-fab:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.pill}'
    size: '4rem'
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

Gastar is a calm, precise, personal book of accounts. Numbers lead, and color appears only at moments that matter. The tone is the classic, serious-bank feel from PRODUCT.md, a durable brand commitment rather than a style option. The single theme comes from the shadcn/ui preset bJMUTPE2, adapted: light is warm cream (a cream page with lighter-cream cards, no pure white anywhere), dark is stone near-black, the primary is emerald, and both themes are first-class. The app keeps its own positive, transfer and swatch colours, a primary-coloured focus ring, and a stronger `border-strong` for form-control contrast. The visual language is shadcn/ui-like: soft shadowed cards, small radii and compact controls.

The system is quiet and layered. Tonal surfaces, hairline borders and a small three-step elevation scale carry structure, type weight carries hierarchy, and the FAB marks the primary action. Buttons and navigation are compact and confident: small radii, a firm 2px focus ring, a slight press scale, and a clear dimmed disabled state.

**Key Characteristics:**

- Warm cream neutrals with an emerald primary in light, stone near-black with a deeper emerald primary in dark, switched by token swap only (`light-dark()` in `app.css`).
- One typeface (Geist Mono) everywhere, body, headings, titles and amounts, with weight, not size, doing most of the hierarchy work.
- Lists and sections sit on soft shadowed surface cards over the page (no edge in light, a hairline in dark); a three-step elevation scale (`--shadow-1`, `--shadow-2`, `--shadow-lift`).
- The four tab screens (Inicio, Movimientos, Plan, Reportes) and the signed-out screens open on a solid emerald band that the first card overlaps; big amounts show a raised, half-size currency symbol.
- Motion explains changes only, on four shared tokens (see Motion); every screen is a sheet, a page, a nested sheet or a confirm dialog by one rule (see Presentation).
- Pill (999px) action buttons, 50px tall; 0.625rem radius fields; 10px rounded-square icon tiles; 1.25rem cards; 20px confirm dialogs.
- Tabular numerals for every amount.

## Colors

Warm cream neutrals and an emerald primary, plus three semantic tones for money direction.

The theme is switched via `data-theme` on `<html>` (`light`, `dark`, or absent for system), with `prefers-color-scheme` as the fallback when the attribute is absent. In dark, the neutrals are stone near-black and the primary is a deeper emerald (`primary-dark`) with the same pale on-primary. The `-dark` tokens in the frontmatter are the dark-theme values of the same roles.

### Primary

- **Emerald** (`primary`): Primary buttons, the center FAB, the wordmark mark, the active nav icon, the focus ring and the emerald band: on the tab screens the `PageHeader` with `tone="primary"` plus the `TabBand` under it holding each tab's top controls, on the signed-out screens the top of `AuthPage`; everything on it is `on-primary` (5.33:1 in light, 7.25:1 in dark). Dark: deeper emerald (`primary-dark`).

### Neutral (cream, stone in dark)

- **Cream** (`background`): Page background. Dark counterpart: stone near-black (`background-dark`).
- **Light Cream** (`surface`): Cards and fields, lighter than the page; never pure white. Dark counterpart: `surface-dark`.
- **Raised Cream** (`surface-raised`): Layers above a surface, such as the BottomDrawer (popover fill) and ConfirmDialog (stock shadcn `AlertDialog`, popover fill). Dark counterpart: `surface-raised-dark`.
- **Warning** (`warning`): Amber text and tint of the `warning` StatusPill tone (due today or soon, "Vas rápido"); `--warning` in `app.css`, mapped to the Tailwind `warning` colour. Dark counterpart: `warning-dark`.
- **Muted** (`muted`): A warm-tinted fill for the segmented track, the active tab pill, hover and press fills (rows, secondary button, top-bar avatar). Dark counterpart: `muted-dark`.
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

- **Account and category swatches** (`--swatch-<key>`, defined with `light-dark()` in `app.css`, values in the frontmatter): sixteen user-pickable accent colours for IconBadge, Meter and the color picker, in picker order: green Verde, teal Turquesa, sky Celeste, blue Azul, indigo Índigo, violet Violeta, plum Ciruela, pink Rosa, red Rojo, orange Naranja, amber Ámbar, ochre Ocre, olive Oliva, brown Marrón, slate Pizarra, gray Gris. The key is what the database stores (`toSwatchKey`; no DB enum), so existing keys never change.
- **Tints** are derived, never tokens: IconBadge fills a `color-mix` 14% of the swatch over the surface.
- **Contrast** (light value vs light surface, dark value vs dark surface / dark page / its 14% tint over the dark surface; WCAG ratios): light is a glyph colour (3:1 needed), dark text-like use needs 4.5:1 on surface and page and 3:1 on the tint. Every swatch passes; the lowest are light orange 4.62 and light ochre 4.63 (both still above 4.5).

| Key    | Light / Dark / Dark on bg / Dark on tint |
| ------ | ---------------------------------------- |
| green  | 6.06 / 8.78 / 9.91 / 6.69                |
| teal   | 5.91 / 8.58 / 9.68 / 6.58                |
| sky    | 6.29 / 8.95 / 10.10 / 6.80               |
| blue   | 6.52 / 8.44 / 9.53 / 6.47                |
| indigo | 7.11 / 7.88 / 8.90 / 6.11                |
| violet | 7.13 / 7.75 / 8.75 / 6.02                |
| plum   | 7.32 / 7.82 / 8.83 / 6.07                |
| pink   | 6.33 / 8.56 / 9.67 / 6.54                |
| red    | 6.52 / 8.44 / 9.53 / 6.47                |
| orange | 4.62 / 9.46 / 10.68 / 7.09               |
| amber  | 5.14 / 9.36 / 10.57 / 7.03               |
| ochre  | 4.63 / 10.06 / 11.35 / 7.44              |
| olive  | 5.49 / 9.93 / 11.22 / 7.37               |
| brown  | 7.06 / 8.10 / 9.15 / 6.24                |
| slate  | 6.87 / 8.18 / 9.24 / 6.29                |
| gray   | 6.46 / 8.39 / 9.48 / 6.42                |

### Named Rules

**The No Divider Lines Rule.** Rows, sections, stats, month headers, form and drawer actions and the sticky header are separated by spacing (padding or gap), never by a rule line. Outlines stay: inputs, buttons, cards and containers keep their borders, and the amount input keeps its 2px focus underline.

**The Action Colour Rule.** Primary marks actions, selection and focus: button fills, the FAB, the active nav icon and the focus ring. Inline text links ("Olvidé mi contraseña", "+ Agregar", "Ver todos", "Limpiar filtros") use the `--link` token (primary #0B7656 in light, a lighter green in dark for contrast) with no underline; navigation rows and the back link use the text colour.

**The Control Edge Rule.** Controls are identified by their edge: inputs, selects and the option picker trigger use `border-strong`. Cards, bars and dividers stay on the hairline `border`. The segmented track is a `muted` fill with no edge.

**The Token Rule.** Colors come from the theme tokens; never hardcode a hex in a component.

## Typography

**Display Font:** none
**Body Font:** Geist Mono (with ui-monospace, monospace fallback), a variable font loaded via @fontsource-variable/geist-mono, used for body, headings, titles and amounts.

**Character:** A single monospaced family, so amounts and columns align naturally. Hierarchy comes from weight and a short size scale. Weights are 400, 500 and 600 only (never 700; `strong` and `b` are 600).

| Token               | Size | Use                                                               |
| ------------------- | ---- | ----------------------------------------------------------------- |
| `--font-size-xs`    | 12px | Caption, meta, badges                                             |
| `--font-size-sm`    | 13px | Secondary text, sub-lines, labels, section titles, chips          |
| `--font-size-base`  | 15px | Body (set on `body`), rows, values, buttons, row amounts          |
| `--font-size-lg`    | 20px | Headings: sheet and dialog titles, detail titles, currency prefix |
| `--font-size-xl`    | 28px | Page titles                                                       |
| `--font-size-hero`  | 36px | Display: big amounts, including the amount input                  |
| `--font-size-input` | 16px | Every text input, textarea and select (16px prevents iOS zoom)    |

The Tailwind `text-xs/sm/base/lg` utilities map to the same tokens in `@theme`, so shadcn parts land on 12/13/15/20; inputs use `text-(length:--font-size-input)`.

### Hierarchy

- **Headline** (600, h1 to h3, 1.2, letter-spacing -0.01em): Page and section headings.
- **Title** (600, 20px): The "Gastar" wordmark text on the login screen.
- **Page title** (500, 28px, 1.2): The `PageHeader` h1 on every screen.
- **Body** (400, 15px, 1.5): Default text. Fields are 16px.
- **Label** (400, 13px): Form labels in muted ink, and error text in the negative color. Buttons use 13px at weight 500.
- **Hero** (`--font-size-hero`, 36px): The large balance or amount figure on the dashboard, account detail and movement detail, sized `clamp(1.5rem, 9vw, var(--font-size-hero))` so it shrinks on narrow screens, with the currency symbol raised at half size.

### Named Rules

**The Tabular Rule.** Every money amount uses `font-variant-numeric: tabular-nums` (the `.amount` class) so columns align.

## Layout

Mobile-first single column with no layout breakpoints; no narrow-width tweaks. `.content` is the `--content-width` (560px) column, which the floating tab bar shares (see Navigation). `.content` sets `--gutter` (`space-5`) as its inline padding; the page top bar and the `TabBand` bleed out to the content edges with a negative `--gutter` margin. The segmented control options shrink (`min-width: 0`, `space-1` side padding), wrap labels with `overflow-wrap: anywhere` instead of clipping, and keep the 2.75rem hit area. The page top bar is sticky (z-index 9, inside `.content`) only on viewports at least 40em tall (`@media (min-height: 40em)`; `em` is the browser text size, so large text or zoom turns it off and the bar scrolls away); under the same query `html` has a `scroll-padding-top` so focused elements stay clear of it, and the tab bar is fixed above the home indicator (z-index 10). On the tab screens the content's bottom padding is `--tabbar-clearance` plus 1rem so nothing hides under the bar; other screens keep `calc(space-8 + 4.5rem + env(safe-area-inset-bottom))`. The signed-out screens (`AuthPage`) are a 400px column under a full-width emerald band, with safe-area padding on all four sides. Spacing is a short rem scale (`space-1` to `space-6`, plus `space-8`); page padding is `space-5`. The browser theme color follows the page background (cream / stone near-black); the PWA manifest `theme_color` is a cream (`#f6efe1`).

### Tokens

Raw tokens live in `:root` and are exposed through `@theme inline` as Tailwind keys, so `size-control`, `px-gutter` and `gap-group` work. They are declared but unused until the components adopt them; adding them changes nothing on screen.

- **Size scale** (rem, today's px at 16px): `--size-glyph-chip` 1.25rem, `--size-lead` 2.25rem, `--size-hero` 3.5rem, `--size-control` (= `--tap-target`, 2.75rem), `--size-field` 3.25rem, `--size-nav` 3.75rem; icons `--icon-sm` 1.125rem, `--icon-md` 1.375rem, `--icon-lg` 1.5rem. Tailwind: `size-*`, `w-*`, `h-*` with `glyph-chip`, `lead`, `hero`, `control`, `field`, `nav`, `icon-sm`, `icon-md`, `icon-lg`.
- **Spacing roles:** `--space-gutter` (`space-5`, the page inline padding), `--space-group` (`space-5`, the gap between page sections), `--space-row-x` (`space-3`) and `--space-row-y` (0.625rem), the shadcn `Item` padding. Tailwind: `px-gutter`, `gap-group`, `px-row-x`, `py-row-y`.
- **Money tones:** `--tone-income` (`--positive`), `--tone-expense` (`--negative`), `--tone-neutral` (`--text`); light and dark come from the referenced tokens. Tailwind: `text-tone-income`, `text-tone-expense`, `text-tone-neutral`.

## Elevation & Depth

Depth comes from layering first, shadow second. The page (cream) is the base; lists and sections sit on surface cards (lighter cream) with a soft shadow; sheets sit on the raised surface. Shadows are soft and small, and money direction colours are never affected by them.

### Elevation Scale

- **Level 0, page** (`--bg`): No shadow.
- **Level 1, card** (`--shadow-1`: a 1px close shadow plus a 20px soft one, `0 1px 2px` at 0.03 and `0 6px 20px -8px` at 0.08 black in light; `0 1px 2px` at 0.2 and no soft layer in dark): `Card`, `ListCard` and `DetailCard` (surface fill, `--card-edge`, 1.25rem radius, clipped overflow). `--card-edge` is transparent in light (the shadow separates the card) and the `--border` hairline in dark; inside a drawer (`[data-slot='drawer-content']`) it is the hairline in both, because a light drawer is the same colour as a card. Used for list pages, dashboard sections, forms and the signed-out screens' content card.
- **Level 2, raised** (`--shadow-2`: light `0 2px 8px rgb(0 0 0 / 0.12)`; dark `0 2px 8px rgb(0 0 0 / 0.35)` plus a brighter inset highlight): Modal layers: the `BottomDrawer` and `ConfirmDialog`, both stock shadcn parts with the popover fill.
- **Lift** (`--shadow-lift`: light `0 6px 16px rgb(0 0 0 / 0.2)`; dark `0 6px 16px rgb(0 0 0 / 0.6)` plus a 1px border-token edge): The "+" FAB only; it stays the most prominent element of the tab bar.

### Dark Theme

Dark (stone near-black with emerald primary) does not rely on black shadows, which vanish on dark backgrounds. Elevation is expressed by lighter surface steps (`--bg` < `--surface` < `--surface-raised`), the hairline border as a subtle edge, and a faint inset top highlight on raised layers; the drop shadows are kept light-touch except the FAB lift.

### Row Feedback

An `Item` row (a link or button via the `child` snippet) fills with `muted` on hover (links only, stock shadcn `hover:bg-muted`) and while pressed (links and buttons, `app.css`), and shows the stock 3px focus ring. Rows are stock shadcn `Item.Media`, `Item.Content` (`Item.Title`, `Item.Description`) and `Item.Actions`; there is no row scale.

### Named Rules

**The Layering Rule.** Group rows and sections into a surface card (`Card` or `ListCard`); do not leave lists directly on the page background. Use the lowest elevation level that separates the layer.

## Shapes

Three radii: `--radius` 0.625rem (`rounded.md`) for fields, the segmented track and field-like triggers; `--radius-card` 1.25rem (`rounded.card`) for cards (Tailwind's `rounded-xl` stays 14px and is not used for cards); and a full pill (`rounded.pill`, 999px) for action buttons, the tab bar, the FAB and the avatar (a 2.75rem circle). Category and account icon tiles (`IconBadge`) are 10px rounded squares at every size, never circles; confirm dialogs use a 20px radius. The wordmark mark is an 8px-radius square, the empty-state badge a 2rem muted rounded square and the signed-out status icon a 3.5rem card-radius square. Borders are always 1px, in the border token (cards use `--card-edge`).

Press feedback: opacity, colour and fills change in `--dur-fast` on `--ease-out` (see Motion). When `prefers-reduced-motion: no-preference` also holds, `transform` is added so pressed buttons scale to 0.98 and nav items, the FAB and chips to 0.96; with reduced motion there is no press scale.

## Motion

Motion explains a change (something appeared, moved or was replaced); it never decorates. Only `transform` and `opacity` animate, UI motion stays under 300ms, and nothing animates on typing or on the numbers (Inicio's amounts, the amount field).

- **Tokens** (`app.css` `:root`): `--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` for anything entering, leaving or changing state; `--ease-drawer` `cubic-bezier(0.32, 0.72, 0, 1)` for things that travel (page transitions, the segmented thumb, edge-swipe back and pull-to-refresh springs); `--dur-fast` 120ms (press feedback, colour, fades), `--dur-base` 200ms (appear, list slides, the segmented thumb), `--dur-slow` 280ms (page transitions, springs, meters and report bars). Use the tokens, never a literal duration or curve; spinners are the exception (linear, constant).
- **Helpers** (`src/lib/motion.ts`, the same values for Svelte transitions): `in:appear` (fade plus a 4px rise, base) for things that show up in place: field errors (`Field.Error` carries it), empty states, the signed-out screens' notes ("Contraseña actualizada.", "Enviamos otro enlace."), Inicio blocks that come and go on refresh; `in:fade` (fast) for content replacing content in the same spot: the movement form's type-dependent rows, the frequent-category chips, the filter badge, a new filter or page of Movimientos; `animate:slide` with `recordOffsets` for keyed lists that nest (Movimientos' months, days and rows), so rows close the gap after a delete and open it on undo instead of jumping. Elements only animate in; leaving is instant, so a list never holds two states at once.
- **Page transitions:** Screens change with a page transition (View Transitions API, `app.css`), `--dur-slow` on the iOS-like `--ease-drawer`: opening a child screen slides it in from the right while the old one drifts left and dims; going back reverses it; switching tabs (only by tapping the bar: there is no tab swipe) slides both pages the full width on the same curve, toward the target's side of the bar (Inicio, Movimientos, Plan, Reportes: a tab to the right enters from the right and pushes the old page out left, a tab to the left the reverse), since tabs are peers; re-tapping the current tab does nothing. The tab bar shows only on the four tab screens, so a child screen reaches a tab through its back control and slides back; other replaces to another screen crossfade in `--dur-base` on `--ease-out`. Changes within one screen (month, currency, filters, search) update in place with no transition, since taps are ignored while one runs. The header and tab bar crossfade in place instead of sliding. With reduced motion every page transition is a 100ms crossfade with no movement; there is none without browser support, or when the browser already animated the back swipe.
- **Edge-swipe back:** In the installed PWA (standalone display mode only; a Safari tab already has the system swipe) a touch starting within 20px of the left edge and dragging right moves the whole page with the finger (`edgeSwipeBack`, `src/lib/edge-swipe-back.ts`, on the `(app)` layout's `main`): a surface-coloured page with a soft left shadow slides over the background. The gesture is claimed after 10px only when horizontal travel is at least 1.5x the vertical, so vertical scroll, horizontal scrollers that are scrolled, inputs, sliders and text selections keep their touches. Past 35% of the width, or a flick (over 0.5px/ms and 40px), the page finishes sliding out (0.2s) and the screen's own back or close control is clicked (same pop-or-replace logic as the button, with no second page transition); otherwise it springs back in 0.28s on the same curve. It exists only where the header has a back or close control (never on tabs or auth screens) and never while a drawer or dialog is open. With reduced motion the page does not follow the finger; release past the threshold still navigates.
- **Pull-to-refresh:** It exists only in the installed iOS app (`navigator.standalone` and standalone display mode), which has no native one; Android and browser tabs keep the browser's own, so the root's `overscroll-behavior` stays untouched (`pullRefresh`, `src/lib/pull-refresh.ts`, on the `(app)` layout's `main`; indicator `PullIndicator`). On the four tab screens only (child screens are details and forms, where a reload could clobber input and edge-swipe back owns the gestures), with the document at the top, a drag claimed after 10px with vertical travel at least 1.5x the horizontal moves the content down with iOS rubber-band resistance while the header stays put (the `TabBand`'s emerald backdrop fills the gap it uncovers), uncovering a 2rem surface-coloured circle below it: an arrow that fades in and turns with the pull and points up in `--primary` once armed at 72px. At the top a downward move is cancelled while it may still be ours, so the iOS bounce never doubles it. Release past 72px holds the content at 56px with a spinner while the screen's data reloads (`refreshAll`, at least 0.4s so it does not flash; a failure shows the error toast "No se pudo actualizar."), then settles back in 0.28s on the shared curve; below it the content springs back in 0.28s, and a finger landing on it mid-spring catches it. Drawers, dialogs, inputs, sliders, text selections and any element that scrolls on its own keep their touches. The indicator is `aria-hidden`; a polite status line announces "Actualizando…" and "Actualizado". With reduced motion the content does not move and the indicator only fades in in place (static spinner); release past the threshold still refreshes.
- **Reduced-motion and swipe tokens:** `--dur-reduced` (100ms) is the page transitions' duration under `prefers-reduced-motion` (`DUR_REDUCED` in `src/lib/constants.ts` mirrors it); `--shadow-swipe` is the edge shadow of a page dragged by edge-swipe back (`edge-swipe-back.ts` reads it).
- **Bars:** `Meter` and the Reportes month bars are full-size fills slid by a transform inside a clipping track (`translateX` / `translateY`), so a change glides on the GPU and the rounded end keeps its shape.
- **Reduced motion:** nothing moves; fades stay (100ms for `appear`, page transitions and the movement list's fade), the segmented thumb snaps, and the meter and bar fills jump.

## Copy

All user-facing text (es-AR) lives in one typed catalogue, `src/lib/copy/es.ts`; the server error messages are in it already and screen text moves in as each screen is restyled.

- **Structure:** `es` is `as const`, grouped by area: `common` (`tooManyAttempts`, `fields`, `amount`), `auth`, `home`, `movements`, `accounts`, `categories`, `plan`, `reports`, `imports`, `profile`, `emails`. Errors sit under `<area>.errors`; sync, OAuth and Galicia upload messages under `imports` and `profile`. `Copy` is its type.
- **Helpers:** `plural(n, one, other)` picks the word (singular only for 1) and `countOf(n, one, other)` gives "3 cuentas". Amounts arrive already formatted by `formatMoney` (`FormattedAmount`); the catalogue never formats.
- **Imports:** `es.ts` imports only `../constants.ts` at runtime (limits in messages come from there) and types from `../money.ts`. App code imports `#lib/copy/es.ts`; the E2E specs import `../src/lib/copy/es` and assert the catalogue value instead of a literal, so rewording a message needs no spec edit.

## Components

Shared components live in `src/lib/components/`.

### Buttons

- **Source:** the generated shadcn-svelte `Button` (`#lib/components/ui/button`), used with its stock styling. It renders an `<a>` when given an `href`, otherwise a `<button>` (type `button` unless set).
- **Shape (default size):** full pill (999px), 50px tall, 1.25rem horizontal padding, 15px weight-600 label (ghost and link stay 500), inline-flex. Full width is `class="w-full"`. Field-like triggers (the option picker field, day-of-month cells, the Filtros trigger) override it back to a 2.75rem control.
- **`default`:** Primary fill, on-primary text; hover fills primary at 80%. Used for the main action.
- **`outline`:** Surface fill, 1px `border` (#E3DBCB), ink text; hover fills `muted`. Used for secondary actions (Limpiar, Cancelar, Ver movimientos, Archivar, filter trigger).
- **`destructive`:** Outlined like `outline` (surface fill, 1px `border`) with `negative` (#C4140C) text. The delete trigger inside a page or drawer (Eliminar, Eliminar límite, Desvincular).
- **`danger`:** Solid `negative` fill with light text (`destructive-foreground`). Only the confirm button of a delete alertdialog (`AlertDialog.Action` maps `variant="destructive"` to it) and the final "Darme de baja".
- **`link`:** Primary text, never underlined; inline actions such as "Quitar" and "Usar sugeridos" (destructive ones add `text-destructive`).
- **States:** Disabled is 0.5 opacity and non-interactive. Focus-visible is a 3px ring (`ring-ring/50`) with a ring-coloured border. Active (not disabled) nudges down 1px and takes the variant's hover fill, so a tap shows a press on touch screens.

### Cards / Containers

- **Source:** the generated shadcn-svelte `Card` (`#lib/components/ui/card`) with stock styling: `Card.Root` plus `Card.Content` (and `Header`/`Title` where a heading is part of the card).
- **Corner Style:** 1.25rem (`rounded-(--radius-card)`).
- **Background:** `card` (surface) with a 1px `--card-edge` ring and `--shadow-1`.
- **List container:** `ListCard` (`Item.Group` with the card edge, radius and shadow) holding `ListRow`s; the one way to group rows.
- **Rows card:** `DetailCard`, the same card as a `<ul>` of `<li>` rows (pickers, `TextRow`, `SwitchRow`) for detail screens and every form (`EntryFields`, the limit, savings and import review forms). A row with an error (`class:bad`) gets a 3px `--negative` left bar, or a full 1.5px `--negative` outline with `outlineErrors` (the new-movement and new-rule drawers). Forms never write their own card CSS.
- **Internal Padding:** 1.25rem (`--card-spacing`) vertically on the root and horizontally on `Card.Content`. Cards that lay out their own sections use `Card.Root` with `class="gap-0 overflow-hidden py-0"` and no `Card.Content`.

### Inputs / Fields

- **App forms:** Generated shadcn parts with stock styling, stacked (label above control): `Field.Field` with `Field.Label for=` and `Input` (text, number and date), `InputGroup` for the amount (currency symbol as an inline-start addon) and the FilterBar search (search icon addon, `aria-label`), and `NativeSelect` for native selects. Errors are `Field.Error` (`role="alert"`, linked by `aria-describedby`, entering with `in:appear`). In app forms the fields are rows of one `DetailCard` (pickers, `TextRow`, `SwitchRow`; see Cards). Filter checkboxes are the generated shadcn `Checkbox` next to a `Field.Label for=` in a horizontal `Field.Field`; form toggles are `SwitchRow`. Checkboxes, switches and radios are Bits UI buttons and need JavaScript; pickers fall back to native inputs (see Pickers).
- **Auth page (`AuthPage`):** Every signed-out screen (Ingresar, Crear cuenta, Recuperar contraseña, Nueva contraseña, Enlace vencido, Revisá tu email): a full-width emerald band, then one surface `Card` holding the page's content that overlaps the band's lower edge (`space-8` band padding, `-space-6` margin, as `TabBand overlap`), both in a 400px column with safe-area padding; like the `TabBand`, a 100vh `--primary` backdrop above the band fills an iOS top overscroll. The band holds, in `on-primary`: a "Volver" link (chevron plus text, 2.75rem tall, 12% on-primary press fill, on-primary focus outline) on screens other than Ingresar / Crear cuenta, the wordmark (`Wordmark tone="primary"`: on-primary mark with primary strokes), then an optional 3.5rem status icon (12% on-primary fill), the level-1 title (28px, 500) and the description. On Ingresar / Crear cuenta the wordmark is the level-1 heading, and the card opens with `AuthTabs`. Status screens (check email, expired link) are `AuthPage` with `icon`, `title` and `description`, never `EmptyState`. The full-width submit button sits right under the fields (no pinned bar); `AuthForm` takes an `after` snippet for secondary actions, which are `outline` buttons, and dims to 0.55 while busy (`--dur-fast` fade). The "Contraseña actualizada." note is an `ok` `StatusPill`.
- **Auth forms:** The same stock parts: `Field.Field` per field, `Input` (`border-input`, 3px ring on focus), `Field.Error` and `Field.Description` for hints (`EmailField`, `PasswordField`). `PasswordInput` is an `InputGroup` with an inline-end ghost icon `InputGroup.Button` toggling visibility (`aria-pressed`).

### Segmented Control

A `muted` track (no edge, 3px padding, 2px gap, 0.625rem radius) built on the generated shadcn `RadioGroup` (`RadioGroup.Root` + `RadioGroup.Item` inside a `Label`), used for the theme choice, the Inicio currency tabs (`CurrencyTabs`) and the currency filters of the Cuentas and Movimientos lists. Options are at least 2.25rem tall, 0.875rem, weight 500, muted text; the selected option is a `background` chip with the text color and the stock `shadow-sm`. Once hydrated the chip is one thumb behind the options that slides to the new choice (`translateX`, `--dur-base` on `--ease-drawer`; it snaps with reduced motion); before hydration the checked option paints its own chip. The `RadioGroup.Item` is an invisible button covering the whole option, so the hit area is the option; focus-visible draws the stock 3px ring on the option. Requires JavaScript (a form `name` renders a hidden input that posts the value).

### Page Header, Rows and Lists

- **PageHeader:** The sticky top bar of every app screen (prop `tone`: `default`, or `primary` on the four tab screens: a solid `--primary` bar with `--on-primary` eyebrow, a bell with a 35% on-primary border and 8% fill (keeps the glyph at 4.5:1), an on-primary badge with primary text, no backdrop blur and no bottom margin, so the band below joins it): a row `[back] [eyebrow + h1] [bell] [avatar]`. Props `title`, optional `eyebrow` (defaults to today's date in Buenos Aires, es-AR, from the `(app)` layout load) and optional `back` (`{ href, label, text }`: a ghost `Button` link on its own row above the title, 44px tall, a 22px chevron-left then `text`, the parent screen's name ("‹ Inicio", "‹ Perfil", "‹ Cuentas", "‹ Categorías", "‹ Plan"), 15px/500 ink; `label` is its accessible name ("Volver a …", which contains `text`); the title below it is the full 1.75rem h1, with `action` at its right). `close` is a ghost icon `Button` with an X beside a one-line 0.9375rem title (forms). The h1 is 1.75rem, 500, line-height 1.2 under a muted 0.8125rem eyebrow; it wraps and is never truncated, and the bell and avatar links stay fixed 2.75rem (the title wraps below them at large text). The bell is a 2.75rem `--surface` square with a hairline border and `--radius`, linking to `/notifications` (2px primary ring on that page); its badge is a stock `Badge` with the alert count as text (capped at "9+") straddling its top-right corner, and is `aria-hidden` because the link's label already says "Avisos: N" (plain "Avisos" at zero). The bar is sticky only on viewports at least 40em tall (see Layout), uses `--bg` at 92% with a 12px backdrop blur, `space-4` top and `space-3` bottom padding, and a transparent bottom hairline that turns `--border` once the page scrolls (CSS scroll-driven animation inside `@supports (animation-timeline: scroll())`, no JS). The avatar is a stock `Avatar` (`Avatar.Fallback` with the user's initials) inside a 2.75rem link to Profile (`aria-label="Perfil"`, 2px primary ring on the current page); it is hidden when the layout data is missing (error page). Back rules: bottom-nav tabs have none; every other screen links up to a fixed parent; New movement returns to the in-app screen it was opened from (fallback Inicio).
- **Secondary link row:** "Ver movimientos" on account and category detail is the last row of the details card: a `ListRow` with a trailing chevron-right under a hairline top border, not an underlined text link.
- **SwitchRow:** A horizontal `Field.Field` (min 3.5rem, `px-4`) with the `Field.Label` filling the row and the stock shadcn `Switch` (Bits UI) at its end; posts `name=value` (default `on`) when on. Sits as an `<li>` in a fields card ("Repetir cada mes") or alone in a `Card` ("Usar este plan todos los meses").
- **FormActions:** The bottom bar of every form: Cancelar (outline) and the primary action (submit, `submitHref` link or a `primary` snippet) side by side at 50/50, 50px tall, pinned to the viewport bottom unless `sticky` is false.
- **TabBand:** The emerald band under the primary `PageHeader` on the four tab screens (`#lib/components/TabBand.svelte`), bleeding to the content edges in `--primary` with `--on-primary` content, and a 100vh `--primary` backdrop above it (off-screen at rest) that a pull-to-refresh uncovers. Contents: Inicio, the currency pills and the Mercado Pago pill; Movimientos, the search field and Filtros button (`FilterBar tone="primary"`: solid `--surface` fills, no border); Plan, nothing (the no-JS "Plan guardado." status only); Reportes, the currency pills and the month stepper (`MonthNav` in on-primary ink, 12% on-primary press fill). By default (`overlap`) it has `space-8` bottom padding and a `-space-6` bottom margin, so the screen's first card overlaps its lower edge; when a screen starts with something other than a card (Movimientos' list, an empty state) `overlap={false}` gives `space-4` padding and a `space-5` gap instead. The content after it is `position: relative` so the card paints over the band. Movimientos' sticky month headers still stick under the header (the band scrolls away beneath it).
- **ActionLink:** The primary-colour link with no underline for section actions ("+ Agregar", "Ver todos", "Ver reportes"), 0.8125rem weight 500, 2.75rem tall; the default "Agregar" label gets an `aria-hidden` "+ " prefix. It sits at the right of a `SectionHeader` (`aside`).
- **Detail tone:** Amounts never show a visible "+" or "-"; colour carries the direction: income `positive`, outcome `negative`, transfer `transfer`. Category net is shown as a cash flow (spend `negative`, net income `positive`).
- **Destructive cue:** The delete trigger ("Eliminar") in a page or drawer is an outlined pill with `negative` text (`destructive` variant); only the alertdialog's confirm button is solid `negative` (`danger`). Other actions stay neutral.
- **Confirm dialog (`ConfirmDialog`, stock `AlertDialog`):** 20px radius, 22px/20px/18px padding, a 20px/600 title and a 15px muted body, left-aligned, then two equal 50px pills side by side: Cancelar (`outline`) and the confirm (`danger` for deletes).
- **List month and day headings:** Movements group under a sticky month header (`h2`, 15px, 600, `--bg` fill, offset below the sticky page header) holding one muted day heading per day (`h3`, 13px, 600, `space-4` inline padding): "Hoy", "Ayer", then the capitalised weekday and day ("Lunes 26"). The day's spending ("Gastos del día" for screen readers) sits right-aligned on the same line, outside the `h3`, in 13px 600 muted `Money`, one per currency joined by " · "; omitted when the day has no outcomes. With filters active a plain muted "N movimientos" line precedes the list. A cross-currency transfer row shows the destination amount under the amount in 12px muted.
- **CurrencyTabs:** `ARS | USD` `SegmentedControl` in a form posting to `/currency` (cookie `currency`); a failure shows a `role="alert"` line under it, and focus returns to the checked radio after switching.
- **Money:** An amount with the decimals dimmed for USD only (ARS has no decimal part; neutral amounts take `text-muted`, never an opacity dim, so they keep 4.5:1 even inside a muted parent; coloured decimals stay full), `tabular-nums`, the number breaks only after the symbol gap and at thousands separators (`<wbr>` after each `.`), never inside a digit group; no visible sign: `tone` colours it. `stock` (default; balances, totals) is the text colour, negative when below zero. `flow` (movements) follows `direction`: `income` positive, `outcome` negative, `transfer` the `transfer` blue; without `direction` it follows the sign. Zero is always the text colour. A visually hidden "-"/"+" keeps the direction for screen readers. Font size and weight come from the parent. The symbol is wrapped in a `.sym` span (text unchanged for screen readers); `HeroAmount` takes the same `tone`/`direction` and raises it to half size (`0.5em`, `vertical-align: 0.8em`), `AmountInput` excepted.
- **DetailHero:** The amount card of the recurring-rule, account and category detail pages: a `Card` with a centered `HeroAmount` and a muted label below (type, "Saldo"), no icon. A `top` snippet holds a month nav (category) and `children` replaces the amount (empty or multi-currency states). The account hero is `stock`; the others are `flow`.
- **Movement detail drawer (`MovementDetail`):** Detail and edit are one screen, a bottom drawer over the list (shallow route; the full `/movements/[id]` page renders the same component). Description (20px, 600) and amount (36px, coloured by type, no sign) sit centered on top as `InlineText`: tap to edit, Enter or blur saves, Escape cancels. Below, one card of rows (Fecha, Cuenta, Categoría; transfers: Fecha, Desde, Hacia, En destino, Cotización) whose pickers stack as nested drawers. Every change saves on its own (`autosave`) with a "Cambio guardado." toast and Deshacer; a rejected change shows the server message under the row and keeps the old value. Bottom: Eliminar (always confirms, never undoable) and Listo. The first row under the amount is Tipo (Gasto / Ingreso / Transferencia, a nested single-select list with a check on the current one; the amount colour follows it). A type change that needs a field the movement lacks (a category of the new kind, Hacia, or a Cotización) stays staged and opens that field; everything then saves in one post. Closing with it still staged saves nothing and toasts "No se guardó el cambio de tipo."
- **Inline-edit primitives:** `InlineText` (value as a tap-to-edit button labelled "Label: value", input labelled "Label", error below) and `autosave`/`submitAction` (`src/lib/autosave.ts`) are reusable by other screens.
- **ListRow / ListCard:** One row component for every list. `ListRow` is a `listitem` wrapping a stock `Item.Root` (link via `href`, `submit` button or plain block) with: an optional `lead` (`IconBadge`, a 2.25rem (36px) 10px-radius square with an 18px glyph, icon or letter, neutral when no colour); line 1 `Item.Title` (truncated) with the `value` (`.row-amount`, display font, top-aligned, right) beside it; line 2 `Item.Description` with a `StatusPill`, then `.row-meta` (truncating) and `metaEnd`; an optional full-width `footer` (a `Meter`, or on Avisos the alert's whole message, indented under the title); an optional `action` (the row's own controls, a column at its right end: the amount over a `RowPill`, or two `RowPill`s); with `href` and `action` the title becomes the link, stretched over the row (focus ring on the row, muted fill while pressed), so the controls sit above it; `stacked` puts the `StatusPill` alone on line 2 and the meta on line 3 (rows whose pill carries a long label, such as an import's "{categoría} · sugerido"); a `StatusPill` never grows past its row and truncates its label; `chevron` for navigation rows; `dimmed` mutes the lead, title and value (archived accounts and categories, inactive rules); archived accounts and categories also carry a neutral "Archivada" `StatusPill`, and Vinculaciones rows an `ok` ("Vinculado", "Configurado") or `bad` ("Reconectar") pill, with the muted next step ("Vincular", "Configurar") as the value when there is no status. The status pill never sits on line 1, so it cannot overlap an amount. `MovementRow` is a `ListRow`: lead is the category icon (or the description initial) in the category colour, neutral without a category, and a transfer uses the `transfer` colour on the glyph only (`IconBadge glyph`, neutral tile); with a `date`, line 2 is the date in meta and the account (or "Origen → Destino" for a transfer) end-aligned in `metaEnd`, without it the account or transfer pair is the meta; a neutral `StatusPill` with the category name sits before the meta (not on transfers); `Money tone="flow"`; an optional `secondary` amount (a cross-currency transfer's destination amount) renders in 12px muted under the amount.
- **Meter:** A 0.375rem track (`muted`) with a fill in a swatch colour; with a `label` it is `role="meter"` with `aria-valuetext` (limits). Used by plan limits, the Inicio category rows and the Categorías list (each spending category's share of its kind group's month spend in the selected currency; no bar under Ambas or without spending).
- **StatusPill:** A `Badge` with a 14% tint of the tone colour as fill and the tone colour as text: `ok` (positive, check), `warning` (amber, clock), `bad` (negative, alert circle), `neutral` (muted fill, muted text, no icon). Tone maps live in `#lib/plan` (`PLAN_TONE`, `DUE_TONE`); the label is always text.
- **SectionHeader / CardEyebrow:** `SectionHeader` (`.section-head`) is a flex row: the heading (h2, or h3 with `level={3}`; `variant="group"` is always an h2) at 0.8125rem/600 in `text-muted` (#6B6257), with an optional `aside` at the right of the same line: a group total (0.8125rem/600 ink) or a "+ Agregar" `ActionLink`. An `action` goes on its own line. Inicio's section heads use the same type with a 0.875rem gap below (its own `.section-head`, kept: `SectionHeader`'s 0.25rem gap and one-line ellipsis would change it). `CardEyebrow` is the single small uppercase muted label (0.75rem, 600, 0.06em tracking) used above figures and groups.
- **Currency pills:** `CurrencyTabs variant="pills" tone="primary"` (Inicio and Reportes, on the `TabBand`; Plan has no currency switch): "Pesos" and "Dólares" toggle buttons (`aria-pressed`), a 2rem pill (active: `--on-primary` fill with `--primary` text; inactive: `--on-primary` text with a 45% on-primary inset ring; focus outline `--on-primary`) inside a 2.75rem button. Tap only; it posts to `/currency` and swaps in place.
- **Mercado Pago pill (`MpPill`):** Right of the currency pills on Inicio, only when Mercado Pago is linked. A 2rem pill in a 2.75rem link to `/imports`: on the primary band: with pending items an `--on-primary` pill with `--primary` text and a `--primary` "MP" circle and "N para revisar"; with none a quiet "al día" in `--on-primary` with a 45% on-primary ring and an 8% on-primary badge (keeps its text at 4.5:1); focus outline `--on-primary`. Its aria-label spells out the count.
- **Mercado Pago:** Settings (`/profile/mercado-pago`) are one intro card with a single primary button when unlinked, and a `ListCard` of picker rows ("Entra en" `OptionPicker`, "Importar desde" `DatePicker`, both autosaving with Deshacer) plus an outline "Desvincular" when linked. The inbox opens with one 3.5rem sync card (last sync text left, an outline pill "Sincronizar" right; while running a spinner with "Sincronizando…" replaces it), then the full-width "Aprobar N sugeridos". `ImportRow` is a `ListRow` like a Movimientos row: a neutral letter or "?" badge, the title, a `StatusPill` for the item's state (`warning` "No sabemos qué es", or `ok` "<sugerencia> · sugerido") then the source and cuotas as meta, and as its `action` the flow-coloured amount over a `RowPill` (2rem, in a 44px tap area: "Aprobar" in the `--positive` tint, "Revisar" outlined); the title link stretches over the row. "No apareció en el resumen" rows and the "Aprobados automáticamente" list use the same `ListRow` with `RowPill`s (Descartar / Dejar; the amount over Deshacer). The sync line is a `Card.Root`. The review is the shallow-route `ImportItemDrawer` (a `Card.Root` summary, type segmented, a `DetailCard` of Descripción and Categoría or Origen / Destino rows, then Descartar / Aprobar side by side); `/imports/[id]` renders the same form as a page.
- **First-run checklist (`FirstRunChecklist`):** "Empezá en 3 pasos" card on Inicio while any of account, movement or plan is missing (derived from existing data). Numbered rows (2rem circle: `--primary` for the first open step, muted otherwise; a check glyph and muted title when done, not a link). Without an account only step 1 is a link and the rest are dimmed to 50%. Step 2 opens the new-movement drawer like the + button.
- **Profile:** An initial avatar (`--muted` circle, 3.5rem) beside the name and email, then separate cards: a `ListCard` of uniform `ListRow`s with an icon lead and a chevron and a muted value (Cuentas and Categorías with their counts, Mercado Pago with Vincular / Vinculado / Reconectar when connected); a `ListCard` with Nombre (an `InlineText` value, autosaved with Deshacer, no chevron) and Contraseña (opens the shallow-route `PasswordDrawer`); the Tema card (segmented control); a `ListCard` with the "Cerrar sesión" row; and "Darme de baja" as a quiet centered text link in `negative` (44px tall, no button), which opens the shallow-route `DeleteAccountDrawer` (bulleted list of what is erased, password row, bold "No se puede deshacer.", Cancelar / destructive `Button`). Both drawers keep a page variant at their route for direct URLs.
- **Reportes charts:** The 6-month income and outcome bars and the category donut are `aria-hidden` SVG/CSS; their text equivalents are the per-month link `aria-label` ("{mes}: ingresos X, gastos Y") and the visible slice list (name, %, amount). Tokens: income bar `--positive`, outcome bar `--negative` (income always left, outcome right, as in the legend, so colour is not the only cue), slices `--swatch-green`, `--swatch-orange`, `--swatch-blue`, `--swatch-plum` and `--text-muted` for "Otros". Bars keep full opacity (non-text 3:1); the selected month has a bold label and `aria-current="true"`. The bar row bleeds to the card edges so each month link is at least 2.75rem wide at 320px.
- **Pace chart (`PaceChart`, Inicio Disponible card):** 5.5rem tall, in plan pesos whatever the tab. An `aria-hidden` SVG (`viewBox="0 0 300 88"`, `preserveAspectRatio="none"`, `vector-effect="non-scaling-stroke"`, 8 units of top margin over the larger of budget and spending): the ideal pace is a dotted `--border-strong` line (1.5 wide, `stroke-dasharray="1 5"`, round caps) from 0 to the budget at month end; spending is a 2-wide `--pace` line up to today with a 12% `--pace` area under it. `--pace` is scoped to the chart: `--primary` in light, `oklch(0.72 0.12 166.913)` in dark (dark `--primary` is only 2.3:1 on the card; non-text needs 3:1). Today is a 0.75rem HTML dot (`--pace` fill, 3px `--surface` border, 1.5px `--pace` outline, no shadow) placed in %. No animation. The text equivalent is a visually hidden paragraph: "Gastaste X de Y al día N de M; el ritmo ideal a hoy es Z.", and the pill beside it states the gap in text.
- **Plan rule row (`/plan`):** A `ListRow` in a `ListCard`, a link to the rule detail (where the rule is edited): letter lead, description, `Money` value, a `StatusPill` (`DUE_TONE`: paid ok, pending neutral; inactive rules neutral with the reason) and "Día N · account" as meta; inactive rows are `dimmed`. Status is always text, never colour alone.

### Empty State

`EmptyState` (`#lib/components/EmptyState.svelte`, on shadcn `Empty`) is the one empty state of every list and screen (Inicio, Cuentas, Categorías, Movimientos, Importaciones, Plan, Reportes, Avisos, the new-movement sheet, the error page): an `icon` in a 2rem muted rounded square (1rem glyph) over a muted `description`, centered, entering with `in:appear`; its children (the action `Button`, e.g. "Crear cuenta", "Limpiar filtros") sit centered below the text. Pages never compose `Empty.*` parts themselves. Signed-out status screens are `AuthPage` instead (see Auth page).

### Icon and Wordmark

- **Icon:** Inline SVG, 24px by default, 24-unit viewBox, `currentColor` 1.75 stroke with round caps and joins, `aria-hidden`. Names: home, accounts, plus, movements, categories, profile, plan, chart, search, chevron-left, chevron-right, transfer, lock, tag, plus the category icons (tag, cart, food, transport, car, health, education, entertainment, gift, travel, services, clothing, pets, salary) and the account icons (bank, wallet, cash, card, piggy-bank, dollar, coins, safe, briefcase, phone).
- **Wordmark:** A rounded-square ledger mark (two horizontal strokes) plus "Gastar" in title type. Mark fill is primary and strokes are on-primary, so it flips in dark; the "Gastar" text is `--text` (primary on near-black was too faint in dark).

### Presentation: Sheet or Page

Every screen is one of four presentations, chosen by what the task is, never per screen:

- **Sheet:** Any short task that returns you where you were: create, edit or view-and-edit an entity (movement, account, category, fixed payment, limit), pick, filter. A `FormScreen` drawer opened by shallow routing (`openShallow`, a key in `(app)/drawers.ts`): the URL stays the screen below. It closes with the X, a swipe down, Cancelar or Guardar (or Listo on a detail), and a form saves through one path (`closeAfterSave`: refresh, close, toast). A sheet route that also exists as a page is only the deep-link and refresh fallback of the same sheet: the page renders the same component.
- **Page (push):** Navigation hierarchy only: the tabs, lists (Cuentas, Categorías), Perfil and its settings, reports. A child page goes back with its `‹ Parent` header link and the edge swipe; Ver movimientos from a sheet closes the sheet, then pushes the list.
- **Nested sheet:** Only for a sub-task that feeds the parent form (a picker, "Nueva categoría" from a movement, "Nueva cuenta" from the new-movement sheet), at most two levels. Nesting is derived: a `BottomDrawer` rendered inside another one stacks over it (vaul `NestedRoot`) without a prop; a sub-task form is a `FormScreen` with `bind:open` and an `onclose` that clears it.
- **Confirmations:** Always `ConfirmDialog` (archive, deactivate, delete, discard), never a hand-built `AlertDialog`.

### Bottom Drawer

A modal bottom drawer (`BottomDrawer`) composed of the generated shadcn-svelte `Drawer` (vaul-svelte) parts: popover fill, 22px top radius, centred up to 35rem, stock overlay. A centred grabber sits on top (40x5px, 3px radius, `--border-strong`, 8px above and 6px below), and a quiet X close button (`Drawer.Close`, ghost icon `Button`, 44px, 20px muted X, `aria-label="Cerrar"`) sits at the top right, beside the title (on its own row when the title is hidden). `Drawer.Title` is a 20px/600 heading (inline padding 20px) that names the dialog. The content hugs its height (no fixed height, capped at 85dvh with the body scrolling inside) and the body's bottom padding includes `env(safe-area-inset-bottom)`. No line separates the body from any actions. The X, dragging down, tapping the scrim or pressing Escape closes it, and focus returns to the opener.

### Pickers

Every picker is one shell, `Picker` (`#lib/components/pickers/Picker.svelte`): a 3.5rem `ghost` row (label left, value or muted placeholder right, chevron) that opens a Bottom Drawer titled with the label, with the drawer's X, scrim, swipe and Escape to close. Inside a drawer the sheet stacks over it (derived from context, no prop). The body is the picker's own: `OptionPicker` and the date shortcuts a list (`OptionList`), `DatePicker` a month calendar (with Hoy / Ayer / Otra fecha shortcuts when `presets`), `DateRangePicker` the Este mes / Mes pasado / Últimos 30 días / Personalizado list then a range calendar, `DayOfMonthPicker` the day grid, `MultiPicker` toggle rows. Single-choice pickers commit through the shell's `pick`: set the value, close the sheet, dispatch a bubbling `change` from the hidden input (so a filter form sees it), focus the row again; `MultiPicker` keeps its sheet open while toggling. Without JavaScript each falls back to native inputs (radios, `type=date`, a number). A detail screen's "Se usa para" (`CategoryKindRow`) opens the same `OptionList` sheet from a `DetailRow`, with blocked kinds disabled.

Each list row (`OptionList`) is a stock `Item` button in one bordered card: `Item.Media` with the icon badge, `Item.Title` (the name) and an optional `Item.Description` (such as " · Archivada"); the selected row (`aria-pressed`) shows a trailing check in `Item.Actions`. Hover fills the row `muted`; focus-visible is the stock 3px ring. Arrow Up/Down move focus between rows (wrapping), Home/End jump to the first/last. A disabled row is dimmed. Without JavaScript `OptionPicker` rows render inline as a plain radio group.

`MultiPicker` is a `Picker` row (value: "Todas", the one name, or "N cuentas" / "N categorías") whose sheet is a list of toggle rows (`Item` buttons, `aria-pressed`, icon badge, name, optional right-hand meta such as the account currency). The check sits left of the right-hand meta and only on selected rows; toggling keeps the list open, Escape or a swipe closes it.

### Filters

- **FilterBar:** Wrapping flex form with `space-2` by `space-3` gaps. The search field takes the full first row (search icon inset left); a segmented control or filters disclosure takes its own full row; a checkbox label stays compact (auto width) and shares a row when it fits. The form submits on native `change` and on a click of any checkbox or radio inside it (Bits controls fire no `change`). The Filtros pill button carries a count badge of the applied non-default filters (`active`, search excluded). `onfilters` opens the page's filter sheet; the bar renders none of its own.
- **FilterDrawer:** The one "Filtros" sheet of every list (a `bare` `BottomDrawer`): the filters scroll above pinned outline "Limpiar" (back to the defaults, still staged; the search term stays) and primary "Ver N …" (`count` and a singular/plural `noun`; "Ver movimientos" while `count` is null), which closes the sheet and replaces the URL with the staged `href`. Nothing navigates while it is open. Each list only configures it: `ListFilterDrawer` (Cuentas and Categorías: Tipo, Moneda, "Mostrar archivadas"; counted client-side) and `MovementFiltersDrawer` (below).
- **Movements filters (`MovementFiltersDrawer`, a `FilterDrawer`):** Moneda (Ambas / Pesos / Dólares) and Tipo (Todos / Gastos / Ingresos / Transf.) segmented controls, then one card of rows: Fechas (`DateRangePicker`, stacked; the value reads "Todas", a range or the preset label such as "Este mes"), Cuenta and Categoría (`MultiPicker`). N in "Ver N movimientos" is the server count for the staged filters (debounced); Limpiar also resets Fechas to this month. Moneda is disabled while any account is staged (the accounts decide it; mixed currencies read "Ambas"). There are no removable filter chips.

### Icon and Color Drawer

`IconColorDrawer` ("Ícono y color") is the one picker for account and category icon and color. It is not a `Picker`: it opens from the glyph (`GlyphRow`, `GlyphNameHead`) and stages a two-part choice behind Listo, in a Bottom Drawer that stacks when opened inside one: a large `IconBadge` preview, the icon grid (6 per row, rounded-square `IconBadge` cells) and the sixteen swatches (8 per row, 36px circles in 44px cells, each radio labelled with its Spanish name; the checked colour shows a ring, 2px surface gap then 2px in the swatch colour; focus-visible a 2px ring-coloured outline). The choice is staged; Listo hands it to the caller (detail screens autosave it with Deshacer, the new-account and new-category drawers keep it in the form) and Cancelar discards it. Requires JavaScript.

### Drawer Stack and New Movement

A picker or sub-task opened inside a drawer stacks over it (see Presentation): the one below stays put, a tap picks and closes, no confirm. `OptionPicker` takes an `extra` last row (e.g. "+ Nueva categoría", primary text) and optional item `balance`/`currency` shown at the row end. `BottomDrawer` also takes `hideTitle` (title kept for assistive technology) and `bare` (no padded wrapper, so the content pins its own actions). The "Nuevo movimiento" drawer (`NewMovementDrawer`, opened from the Nav FAB by shallow routing: URL unchanged, back closes it) is the first user (with no active account it shows a short note and "Crear cuenta", which stacks the "Nueva cuenta" form as a nested drawer and then reloads the movement form with the new account): segmented type, hero amount coloured by type (`--negative`, `--positive`, `--transfer`), a row of up to six "Categorías frecuentes" chips (the most used non-archived categories; hidden for transfers, without JS and for a user with no history; the amount input takes focus when the drawer opens), a rows card, and Cancelar / Guardar pills pinned below the scrolling fields. A chip is a 2.25rem pill (`--radius-pill`) with a 1.5rem `IconBadge` and the name (13px/500, truncated at 9rem) inside a 2.75rem hit area; the row scrolls horizontally (no scrollbar, `touch-action: pan-x`). Unselected: inset `--border-strong` edge (Control Edge Rule); selected (`aria-pressed`): fill of the swatch at 14% over `--surface`, a 2px swatch ring and `--text` label; focus: 2px `--primary` outline; press scales to 0.96 only without `prefers-reduced-motion`. A row with a missing value gets a full `--negative` border plus one line of the server's message; it clears when the row gets a value.

### Undo Toast and Highlight

`undoToast(message, undo)` (`src/lib/undo-toast.ts`) is the success toast with the single action "Deshacer" (5 s); `undoMovementSaved(id, ruleId)` wires it to the existing delete actions. A freshly saved movement is flagged by `highlightMovement(id)` (`src/lib/highlight.svelte.ts`) for 1.5 s: `MovementRow` holds a 14% primary tint (an overlay behind the row) and sets `data-highlighted="true"`, then the tint fades out over 1.2s (an opacity transition, also under reduced motion).

### Navigation

- **Style (`TabBar`):** A floating bar fixed above the home indicator (`--tabbar-bottom`, `space-4` from the sides, in the content column): a 4rem glass pill (`--card` at 62% with a 20px blur and saturation, a light inset edge and a soft drop; solid `--card` with reduced transparency or without backdrop-filter support) holding the four tabs (Inicio, Movimientos, Plan, Reportes), and the FAB beside it on the right. Each tab is an icon only (no visible label; the Spanish name is its `aria-label` and `title`), muted by default, at least 2.75rem tall. It shows only on the four tab screens and stays put during page transitions.
- **Item states:** `aria-current='page'` gives the tab a `muted` pill and turns its icon primary. Press scales to 0.96.
- **Pull-to-refresh:** In the installed iOS app (no native one there; Android and browser tabs keep their own) pulling down at the top of a tab screen reloads its data, with the indicator below the header (see Motion).
- **Top bar:** See PageHeader above.
- **Month stepper (`MonthNav`):** Two ghost icon `Button`s (chevron-left and chevron-right, `aria-label` "Mes anterior"/"Mes siguiente") around the `.month-label`; on the current month the forward button is `disabled` with `aria-disabled="true"`.
- **Auth tabs (`AuthTabs`):** A segmented track (`muted`, 3px padding) of two links (Ingresar, Crear cuenta, 2.75rem tall) in a `nav` labelled "Acceso"; the active one has the `background` fill and `text` colour (as the segmented control), with `aria-current="page"`. Cuentas and Categorías live in Profile, not in the tab bar.

### Plan Summary and Limit Row

The `/plan` summary is a `Card` with the "Disponible · {mes}" heading, a hero `Money`, a `StatusPill` (`PLAN_TONE`: ok, warning, bad) whose label is always text, and a `<dl>` of figures (muted term, 500 value, a hairline above the "Para gastar" and "Disponible" totals) that wraps at 320px. A limit row is a `ListRow` in a `ListCard`: name, a `StatusPill` flag ("Vas rápido" warning, "Te pasaste" bad), "{gastado} de {límite}" as the value and a `Meter` footer, so state never relies on colour.

The Inicio "Disponible" card reuses this pattern in compact form: a `Card` with a `CardEyebrow` h2 and the same `StatusPill` on the top row, the `HeroAmount`, the muted "por día · quedan N días" line and, below the box, a two-column row of "Saldo total" and "Resultado del mes". With a plan and a budget the box also holds the pace chart and a right-aligned `StatusPill` with the pace tag. With no plan the card is "Saldo total" plus a "Crear plan" `Button`.

**Próximos vencimientos (`UpcomingBills`):** An h2 section head with a "Ver plan" `ActionLink`, a `Card` reading "Pagaste X de Y" over a `Meter` (`--positive`, labelled "Pagos fijos pagados"), then a horizontally scrolling row (no visible scrollbar, `overscroll-behavior-x: contain`) of 8.5rem link cards to each unpaid rule still due: `--surface`, `--radius-card`, `--card-edge` border, `--shadow-1`, `space-3` padding, the description (13px/500, two lines), the `Money` (15px/600) and a `StatusPill` (`warning` when due today or tomorrow, else `neutral`). Follows the selected currency tab and never converts.

### Wizard Steps

The plan setup is one form with four sections. With JS a step list (3px top border: `--primary` when done or current) and Siguiente / Atrás show one section at a time and focus its heading; without JS every section shows and one "Guardar plan" submits. Rows are `ListRow`s, a `SwitchRow` in a `Card` or bordered fieldsets; two-field pairs use `auto-fit` columns so they stack at 320px and 200% text.

### Nav FAB

A 4rem primary circle (`--tabbar-height`) with a 24px plus icon, right of the tab pill; it opens the "Nuevo movimiento" sheet. It is the only element with `--shadow-lift`, and press scales it to 0.96.

### Touch

There is no grey WebKit tap flash (`-webkit-tap-highlight-color: transparent` on `html`); presses show through the `:active` styles above instead, which iOS Safari applies because the root layout listens to `touchstart`. Hover styles only apply where a pointer can hover (`@media (hover: hover)`, Tailwind's default for `hover:`), so a tap never leaves a sticky hover. Small controls keep their visual size and get a 44px hit area from an invisible `::after` centred on them (MonthNav arrows, the password eye, switches) or overhanging the segment (segmented controls, each segment at least 44px wide).

### Navigation Progress

A 3px `--primary` bar fixed at the top (`NavProgress`, below the safe area) appears only when a navigation's data takes longer than 150ms: a 40% segment sliding across in 1.1s on the page-transition curve, or a still full-width bar with reduced motion. It is gone before the page transition starts and is never part of its snapshots.

## Enforcement

`pnpm lint` (so CI) fails on these rules, all at error level (`eslint.config.js`, local rules in `eslint-rules/`):

- **`gastar/no-arbitrary-tailwind`**: no `[...]` arbitrary values or properties and no default-palette colours (`bg-red-500`, `text-white`) in `class`/`*Class` attributes, `class:` directives and `cn`/`clsx`/`twMerge`/`tv`/`cva` arguments. `(--token)` shorthand and arbitrary variants (`data-[state=open]:`) are allowed. `src/lib/components/ui/**` (upstream shadcn structure) is exempt from this rule only.
- **`gastar/no-raw-color`**: no hex or `rgb()`/`hsl()`/`oklch()`-style colours in strings, template strings, attributes or `<style>` under `src` (`.ts`, `.js`, `.svelte`). Colours live in `app.css` tokens.
- **`svelte/no-inline-styles`** (`allowTransitions: true`): no `style=` or `style:`. To pass a value to a component's CSS, use a component CSS prop (`<X --ratio={x}>`).
- **`no-restricted-imports`**: routes (`src/routes/**`) never import from `components/ui/`; they use the base components.
- **`gastar/no-literal-text`**: no literal text in Svelte markup, text expressions or the `placeholder`, `title`, `alt`, `label` and `aria-*` text attributes; text comes from `src/lib/copy/es.ts`. Symbols, digits and punctuation pass.

**Legacy allowlist.** Files not yet migrated are listed per rule in `eslint-legacy-allowlist.js` (rule off for those files only). Each phase removes the files it migrates; the last phase deletes the file. New files must comply and never go on the list.

Allowlist size at phase 1 (files per rule): `no-arbitrary-tailwind` 10, `no-raw-color` 4, `no-inline-styles` 9, `no-restricted-imports` 28, `no-literal-text` 90.

## Do's and Don'ts

### Do:

- **Do** use the theme tokens for every color, radius and spacing value.
- **Do** put `tabular-nums` on every amount; never show "+" or "-": income is `positive` (green), outcome `negative` (red), transfer `transfer` (blue).
- **Do** use the pill for action buttons, `--radius` for fields and `--radius-card` for cards.
- **Do** group lists, sections and form fields into surface cards (`Card`, `ListCard` or `DetailCard`) and pick the lowest elevation token that works; keep `--shadow-lift` for the FAB.
- **Do** keep primary for actions, selection, focus and the emerald band; use `border-strong` on control edges.
- **Do** animate with the motion tokens and `src/lib/motion.ts`, and check every motion under `prefers-reduced-motion`.
- **Do** pick a screen's presentation by the Presentation rule (sheet, page, nested sheet, `ConfirmDialog`), never per screen.

### Don't:

- **Don't** hardcode hex values in components.
- **Don't** underline links; inline text links use `--link` with no underline.
- **Don't** hardcode a `box-shadow` in a component (the tab bar's glass edge is the one exception) or add a shadow outside the elevation scale; don't use heavy black shadows in dark; don't add hover, press and disabled treatments beyond those described in Components (0.9 hover opacity, tints, press scale, 0.5 disabled).
- **Don't** treat these known gaps (documented, not decided) as settled: z-indices are not tokenized, and the tint percentage (8% `color-mix`) and the 0.96 and 0.98 press scales are repeated literals rather than tokens.
