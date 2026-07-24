---
name: apple-minimalist-ui
description: >
  Design system discipline for Vouga-os: Apple-grade minimalism without AI slop.
  Activate for ALL UI/CSS changes across the product. Enforces clarity, restraint,
  warm materiality, and the Vouga visual identity.
---

# Apple Minimalist UI — Anti-Slop Design System

## Core Philosophy

> **Clarity · Deference · Depth**
>
> The interface exists to serve the content. Every pixel must earn its place.
> If a visual element does not help the user understand or act, remove it.

---

## The "AI Slop" Checklist — Things We NEVER Do

Before committing any UI change, verify it does **not** contain:

| Red Flag | Why It's Slop |
|---|---|
| Purple-to-blue gradients, neon glows, aurora backgrounds | Generic AI default palette. Vouga uses warm, earthy tones. |
| Three-column feature grids with centered icons | SaaS landing page cliché. |
| Overuse of emojis in headings or labels | Masks lack of real content hierarchy. |
| Perfectly symmetrical hero + CTA + testimonial layouts | Statistically average = visually forgettable. |
| `box-shadow: 0 25px 50px …` (heavy elevation) | Cheap depth trick. Use subtle, diffused shadows. |
| Glassmorphism/blur on every surface | One frosted layer is elegant; five is a gimmick. |
| Gratuitous micro-animations on everything | Motion must have purpose — feedback, transition, hierarchy. |
| `border-radius: 9999px` on cards or containers | Pills belong on small elements (badges, dots). Cards use tight radii. |
| Excessive color variety within a single view | 2-3 hues max. Let spacing and type do the work. |
| Text that could belong to any product after a logo swap | Copy must reflect Vouga's Portuguese-English voice and specific context. |

---

## Vouga Visual Identity — Non-Negotiable Tokens

These are already defined in `design-tokens.css`. **Never override them inline.**

### Color

- **Accent:** `--vouga-orange` (#d98218) — warm amber, used sparingly for actions and active states.
- **Backgrounds (dark):** Near-black with olive undertone (`#111210` → `#1a1b19`).
- **Backgrounds (light):** Warm parchment (`#f1f0eb` → `#e5e4de`).
- **Text:** Off-white/off-black — never pure `#fff` or `#000`.
- **Borders:** Very low-alpha white/black overlays — borders should whisper, not shout.

### Typography

- **Sans:** Inter — always antialiased (`-webkit-font-smoothing: antialiased`).
- **Mono:** System monospace stack — for labels, metadata, and technical context.
- **Scale:** From `--text-xs` (0.6875rem) through `--text-page-title` (clamp 1.875–2.125rem). Do not invent sizes outside this scale.
- **Tracking:** Negative for titles (`-0.015em`), neutral for body, positive for uppercase labels (`0.03em`).
- **Weight:** Only 400 (regular), 500 (medium), 600 (semibold). Never use bold (700+).

### Spacing

- **System:** 4px base (`--space-1: 0.25rem`) through `--space-10: 4rem`.
- **Rule:** Always use token variables. Never write raw `px` or `rem` values in component CSS.
- **Rhythm:** Generous vertical spacing between sections; tight spacing within components.

### Shape

- **Radii:** `--radius-xs` (2px) through `--radius-lg` (8px). Cards and panels use `--radius-sm` or `--radius-md`. Never use large radii on structural elements.
- **Borders:** 1px, always via `--border-width`. Borders use low-alpha color tokens.
- **Shadows:** `--shadow-subtle` for inline elevation; `--shadow-overlay` only for floating panels/dialogs.

---

## Design Principles Applied to Components

### 1. Page Headers (`.module-heading`)

- **Title:** `display` class, medium weight, tight tracking. No decorative elements.
- **Subtitle (`.workspace-intro`):** Secondary color, relaxed leading, one sentence max.
- **Actions:** Aligned right on desktop, stacked below on mobile. Compact, never oversized.
- **Whitespace:** Generous top padding (`clamp(space-5, 2.5vw, space-7)`). The title should breathe.

### 2. Navigation Cards (`.intent-card`)

- **Material:** Elevated background with panel border — subtle distinction from page bg.
- **Layout:** Icon + text side by side, left-aligned. Never centered.
- **Icon:** Accent color, `--space-6` size. Single stroke-weight. Never filled.
- **Hover:** Background shift only — no scale transforms, no shadow changes.
- **Sizing:** Comfortable but not oversized. `min-height` ensures touch targets without wasting space.

### 3. Data Lists (`.task-list`, `.company-row`, etc.)

- **Structure:** Border-separated rows, no alternating backgrounds.
- **Density:** Tight vertical rhythm — content-rich views should feel efficient, not airy.
- **Status indicators:** Small colored dots (`0.55rem`), not badges or pills.
- **Hover:** Title color shifts to accent — subtle, reversible signal.
- **Meta:** Right-aligned, tertiary color, small text. Dots (`·`) as inline separators.

### 4. Empty States (`.empty-state`)

- **Tone:** Helpful, not cute. One heading, one sentence, one CTA.
- **Border:** Standard panel border, no special effects.
- **No illustrations:** Unless custom and brand-aligned. Generic SVG illustrations are slop.

### 5. Buttons

- **Primary (`.button-primary`):** Accent background, inverse text. Small border-radius. Subtle press feedback (1px translateY).
- **Secondary (`.button-secondary`):** Transparent bg, strong border. Hover fills with surface-hover.
- **Sizing:** `--control-height-md` (2.375rem). Never oversized. Padding: `space-2` vertical, `space-4` horizontal.

### 6. Panels and Cards

- **Material:** Use the panel material system (`--panel-from`/`--panel-to`) for semantic color tinting.
- **Borders:** `--color-panel-border` (low-alpha white). Single pixel.
- **Elevation:** Avoid shadows on inline cards. Reserve `box-shadow` for overlays and floating elements.

---

## Layout Principles

### Whitespace as a Design Tool

- Sections are separated by spacing, not by dividers or boxes.
- When in doubt, add more whitespace — never less.
- Maximum content width (`--content-max-width: 92rem`) prevents eye strain on ultra-wide screens.
- Module pages that are text-heavy should use `max-width: 58rem`.

### Grid System

- Use the existing editorial grid (`--grid-columns-mobile/tablet/desktop`).
- Intent grids: 1 column mobile, 2 columns tablet+.
- Never use more than 3 columns for navigation cards.

### Responsive Strategy

- Mobile-first CSS with `min-width` breakpoints.
- Touch targets: minimum `--control-height-md` (2.375rem).
- Bottom navigation on mobile (`--bottom-navigation-height: 4rem`).
- Sidebar appears only on desktop (`display: none` → `display: grid` at breakpoint).

---

## Motion Guidelines

- **Duration:** Fast (160ms) for hover/focus. Base (240ms) for transitions. Slow (360ms) for entry animations.
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` — Apple-style deceleration curve.
- **What to animate:** `background-color`, `border-color`, `color`, `opacity`, `transform`.
- **What NOT to animate:** `width`, `height`, `padding`, `margin` (cause layout thrashing).
- **Respect `prefers-reduced-motion`:** Already handled globally.

---

## Writing CSS for Vouga-os

### Rules

1. **Use design tokens.** Every color, spacing, font-size, radius, and shadow must reference a CSS variable.
2. **No utility classes.** Use semantic class names that describe the component, not the style.
3. **No Tailwind-style composition.** Classes go in `globals.css`, not inline.
4. **Mobile-first.** Base styles are mobile; desktop overrides live in `@media (min-width: 48rem)` and `@media (min-width: 64rem)`.
5. **Flat specificity.** Single class selectors. Avoid nesting beyond `.parent .child`.
6. **Transitions on interactive elements only.** Non-interactive elements should not transition.

### Naming Convention

```
.{module}-{element}          → .task-list-row
.{module}-{element}-{state}  → .task-list-row-blocked
.{module}-{variant}          → .task-list-section-secondary
```

---

## The Final Test

Before shipping any UI change, ask:

1. **Could this design belong to a generic SaaS template?** If yes, it needs more Vouga identity.
2. **Is every element earning its space?** If not, remove it.
3. **Does it feel warm?** Vouga's palette is earthy, not clinical. Check your surface colors.
4. **Is the typography doing the heavy lifting?** Great minimal design relies on type hierarchy, not decoration.
5. **Would Dieter Rams approve?** "Good design is as little design as possible."
