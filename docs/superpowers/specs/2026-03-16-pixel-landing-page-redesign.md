# Pixel-Inspired Landing Page Redesign

**Date**: 2026-03-16
**Status**: Approved
**Approach**: "Inventory Screen" — full pixel immersion Minecraft UI

## Overview

Complete redesign of the landing page (`/`) from the current green-gradient modern layout to a fully pixel-immersive Minecraft inventory-screen aesthetic. The existing ModForm/Builder functionality moves to a separate `/builder` route. The landing page becomes a marketing-focused entry point with a prominent AI prompt input, inspired by [orcaengine.ai](https://www.orcaengine.ai/) but with deeper Minecraft pixel theming.

## Key Decisions

- **Full landing page redesign** (not just a visual reskin)
- **Builder moves to `/builder`** as a separate page, accessible from nav
- **Amber/gold accent color** replaces green/emerald
- **Full pixel immersion** — pixel fonts for ALL text, beveled inventory borders, blocky everything
- **5 sections**: Hero, Showcase, How It Works, What You Can Create, Footer CTA

---

## 1. Global Styling & Theme

### Font
- **Font family**: `Press Start 2P` (Google Fonts) for ALL text
- **Import method**: Use `next/font/google` — `import { Press_Start_2P } from "next/font/google"` with `subsets: ["latin"]`, exposed as CSS variable `--font-pixel`
- **Remove** the `antialiased` class from `<body>` in `layout.tsx` to preserve crisp pixel rendering
- **Sizes**:
  - Headings: 20-28px
  - Subheadings: 14-16px
  - Body: 10-12px
  - Captions/labels: 8-10px

### Color Palette
| Token             | Value      | Usage                              |
|--------------------|------------|-------------------------------------|
| `bg-base`          | `#0a0a0a`  | Page background                    |
| `bg-panel`         | `#1a1a1a`  | Panel/card backgrounds             |
| `border-light`     | `#3d3d3d`  | Bevel highlight (top/left edge)    |
| `border-dark`      | `#0d0d0d`  | Bevel shadow (bottom/right edge)   |
| `accent-primary`   | `#d4a017`  | Amber/gold — primary accent        |
| `accent-hover`     | `#f0c040`  | Amber/gold hover state             |
| `text-primary`     | `#c0c0c0`  | Body text (light gray)             |
| `text-heading`     | `#d4a017`  | Heading text (gold)                |
| `text-secondary`   | `#808080`  | Subtitle/muted text (dark gray)    |
| `success`          | `#55ff55`  | Success/green states               |
| `danger`           | `#ff5555`  | Error/red states                   |
| `cat-weapon`       | `#ff5555`  | Weapon category (red)              |
| `cat-tool`         | `#ffaa00`  | Tool category (yellow)             |
| `cat-armor`        | `#5555ff`  | Armor category (blue)              |
| `cat-food`         | `#55ff55`  | Food category (green)              |
| `cat-block`        | `#aa55ff`  | Block category (purple)            |
| `cat-agent`        | `#d4a017`  | Agent category (amber)             |

### Minecraft Bevel Panel (`.mc-panel`)
Reusable CSS class for all cards/containers:
- Background: `#1a1a1a`
- Border: 2-3px solid
- Top/left border color: `#3d3d3d` (light)
- Bottom/right border color: `#0d0d0d` (dark)
- No border-radius (sharp corners everywhere)
- Creates the classic Minecraft inventory slot 3D bevel effect

### Inset Panel (`.mc-panel-inset`)
Reversed bevel for text inputs and recessed areas:
- Top/left border color: `#0d0d0d` (dark — looks pressed in)
- Bottom/right border color: `#3d3d3d` (light)

### Minecraft Button (`.mc-btn`)
- Raised `.mc-panel` with amber/gold text
- On hover: slightly brighter background, `accent-hover` text
- On click/active: bevel reverses to inset (pressed effect)
- `transition: none` — snappy, no smooth transitions

### Background
- Solid `#0a0a0a` base
- Subtle repeating 16x16px grid pattern at ~5% opacity via CSS `repeating-linear-gradient`
- No image assets required

### Global Rules
- `image-rendering: pixelated` on all images
- `border-radius: 0` everywhere
- No smooth CSS transitions (use `step()` timing or `transition: none`)
- All corners sharp, all edges hard

---

## 2. Header (Navigation Bar)

- **Position**: Fixed top, full width
- **Background**: `#0a0a0a` with bottom bevel border line
- **Height**: ~56px

### Left Side
- App name `"MODCRAFTER"` in Press Start 2P, 12px, amber/gold
- No logo image — pixel text IS the brand

### Right Side (nav links, 10px)
- `"Gallery"` → `/gallery`
- `"Builder"` → `/builder`
- `"Get Started"` → styled as `.mc-btn`, smooth-scrolls to `#hero-prompt` anchor

### Mobile (below `sm` / 640px)

- Hamburger icon: 3 stacked pixel blocks (CSS-drawn, 3 horizontal bars)
- Opens a full-width dropdown below header (not full-screen), `.mc-panel` styled
- Contains nav links stacked vertically
- Dismiss: closes on link click or tap outside the dropdown
- Uses `transition: none` per global rules (instant open/close, no animation)

---

## 3. Hero Section

- **Height**: Full viewport minus header (`100vh - 56px`)
- **Content**: Centered vertically and horizontally

### Headline
```
Create Minecraft Mods
with AI
```
- Press Start 2P, 24-28px, amber/gold
- Flat color, no gradients

### Subtitle
```
Describe what you want. Download a working mod.
Java & Bedrock supported.
```
- Press Start 2P, 10px, `text-secondary` (`#808080`)
- "Java" tinted green (`#55ff55`), "Bedrock" tinted blue (`#5555ff`)

### Prompt Input
- `.mc-panel-inset` container (recessed look), ~600px max width
- Placeholder: `Type your mod idea...` with blinking `_` cursor
- Submit button: `.mc-btn` with `>` arrow icon, inside the input on the right (aria-label: "Generate mod")
- On submit: button shows `...` and is disabled, input is read-only. On success: redirect to `/status/[jobId]`. On error: red `.mc-panel` error message below input with retry option.
- All Press Start 2P font

### Example Prompts (below input)
- 3-4 clickable `.mc-panel` slots styled as small inventory items:
  - `"Diamond sword that shoots lightning"`
  - `"Emerald armor with flight"`
  - `"Food that gives night vision"`
- Clicking fills the prompt input

### Demo Showcase (below examples)

- Large `.mc-panel` containing a screenshot/GIF of generated mods in-game
- Images: 4 static screenshots bundled as assets in `/public/demos/` (placeholder images for now)
- Below: 4 dot indicators as small inventory slots (active one amber-filled)
- Manual navigation only (click dots to switch), no auto-rotation
- On mobile: supports swipe left/right via touch events
- Keyboard: left/right arrow keys cycle when focused

---

## 4. Showcase Section — "Mods Created by Players"

- **Header**: `"Mods Created by Players"` in gold, 18px
- **Subtitle**: `"See what the community has built."` in gray

### Layout
- Horizontal scrollable row (like a Minecraft hotbar)
- Each card: `.mc-panel`, ~200px wide

### Mod Card Contents
- Texture preview (pixelated rendering) at top
- Mod name in gold, 10px
- Description in gray, 8px
- Category badge: tiny colored pixel tag (color per category)
- Edition badge: `J` (green) or `B` (blue) in a tiny square

### Data Source

- Pulls from existing gallery API (`/api/gallery` endpoint)
- Mod cards use category badges and edition badges from API response (no texture preview image — API does not return one)
- **Loading state**: Show 4 empty `.mc-panel` slots with a pulsing amber border
- **Error state**: Show fallback hardcoded mods (same as empty state)
- **Empty state**: Show 4-6 hardcoded example mods with placeholder data

---

## 5. "How It Works" — 3 Steps

- **Header**: `"How It Works"` in gold, 18px

### Layout
- 3 columns on desktop (>= `lg` / 1024px), stacked on mobile/tablet
- Each step: tall `.mc-panel` with amber top-border stripe (2px)

### Steps

| # | Title              | Icon (CSS/SVG)         | Description                                                                 |
|---|--------------------|------------------------|-----------------------------------------------------------------------------|
| 1 | Describe Your Mod  | Pixel chat bubble      | Tell the AI what items, weapons, armor, or blocks you want. Be creative.   |
| 2 | AI Builds It       | Pixel crafting table   | Textures, recipes, behaviors, and pack files generated. Java or Bedrock.   |
| 3 | Download & Play    | Pixel chest/download   | Drop the file into your mods folder. Works with vanilla Minecraft.         |

- Step numbers: large amber pixel numbers
- Icons: Simple pixel-art SVGs or CSS-drawn shapes
- Titles: gold, 12px
- Descriptions: gray, 8-10px

---

## 6. "What You Can Create" — Capabilities Grid

- **Header**: `"What You Can Create"` in gold, 18px

### Layout
- 2x3 grid on desktop (>= `lg` / 1024px), 2x2 on tablet (`md` / 768px), stacked on mobile (< `md`)
- Each cell: `.mc-panel` with colored left-border stripe (3px)

### Cells

| Category  | Title              | Description                                                    | Accent Color |
|-----------|--------------------|----------------------------------------------------------------|-------------|
| Weapons   | Swords & Bows      | Custom damage, enchantments, special abilities, and combos     | `#ff5555`   |
| Tools     | Pickaxes & Axes    | Custom mining speeds, durability, and harvest levels           | `#ffaa00`   |
| Armor     | Full Armor Sets    | Custom protection, effects, and set bonuses                    | `#5555ff`   |
| Food      | Custom Foods       | Hunger restoration, potion effects, and special abilities      | `#55ff55`   |
| Blocks    | Placeable Blocks   | Custom textures, hardness, drops, and behaviors                | `#aa55ff`   |
| Agents    | AI Companions      | Summonable entities with custom AI, gadgets, and abilities     | `#d4a017`   |

- Title in accent color, description in gray

---

## 7. Footer CTA + Footer

### CTA Block
- Full-width `.mc-panel`, centered content
- Headline: `"Build Your First Mod"` in gold, 18px
- Subtitle: `"No coding required. No downloads. Just describe and play."` in gray
- Button: Large `.mc-btn` — `"Get Started"` in amber, navigates to `/builder`

### Footer Bar
- Minimal dark bar
- Left: `"ModCrafter"` in 8px, dark gray
- Right: `"Gallery"` | `"Builder"` | `"GitHub"` links, 8px, gray
- No bloat

---

## Routing Changes

| Route      | Content                                    |
|------------|--------------------------------------------|
| `/`        | New pixel landing page (this spec)         |
| `/builder` | Builder mode (WeaponBuilder, ToolBuilder, etc.) — moved from home page |
| `/gallery` | Existing gallery page (apply pixel theme)  |
| `/status/[jobId]` | Existing status page (apply pixel theme) |

The Quick Create prompt on the landing page submits and redirects to `/status/[jobId]` just like the current flow.

---

## Files to Create/Modify

### New Files

- `frontend/src/app/builder/page.tsx` — Builder page (relocated from home)

### Modified Files

- `frontend/src/app/globals.css` — Append `.mc-panel`, `.mc-panel-inset`, `.mc-btn`, grid background classes (preserve existing Tailwind imports)
- `frontend/src/app/page.tsx` — Complete rewrite: new landing page
- `frontend/src/app/layout.tsx` — Swap Geist font for Press Start 2P, remove `antialiased` class
- `frontend/src/app/gallery/page.tsx` — Apply pixel theme styling
- `frontend/src/app/status/[jobId]/page.tsx` — Apply pixel theme styling

### Unchanged
- `frontend/src/components/builder/*` — All builder components remain, just imported from new `/builder` page
- `frontend/src/components/ModForm.tsx` — Quick Create logic reused in landing page prompt
- `frontend/src/lib/api.ts` — No API changes
