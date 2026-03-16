# Frontend Enhancements: Java Coming Soon, Lovable-Style Create, Creative Landing Page

**Date:** 2026-03-16
**Scope:** Frontend-only changes. Static/dummy data. No backend modifications.

---

## 1. Java Edition "Coming Soon"

### Goal
Disable Java Edition selection across the app and show a "Coming Soon" state. Bedrock becomes the only active edition.

### Changes

**`components/ModForm.tsx`:**
- Java Edition button becomes visually dimmed with a lock icon and "Coming Soon" badge
- Clicking Java triggers a brief shake animation + tooltip: "Java Edition is coming soon! Bedrock is fully supported."
- Tooltip auto-dismisses after ~3 seconds
- Edition state defaults to `"bedrock"` and cannot be changed to `"java"`
- No structural changes — just conditional styling and click handler on the Java button
- Note: ModForm currently uses smooth/rounded Tailwind styling (not pixel theme). The "Coming Soon" badge and tooltip should match ModForm's existing smooth style (rounded-lg, transitions, shadow), NOT the mc-panel pixel theme. The shake animation uses a standard CSS keyframe.

**`app/page.tsx` (Hero subtitle):**
- The green `Java` text in the subtitle gets a small "(soon)" suffix in dimmed text
- Bedrock badge remains as-is

### New components
None. Inline changes only.

### New CSS
- `@keyframes mc-shake` — horizontal shake for the Java button on click (3-4 frame shake, ~300ms)
- `.mc-tooltip` — positioned tooltip with arrow, auto-fade after 3s

---

## 2. `/create` — Lovable-Style Chat Interface

### Goal
New route with a split-pane chat + preview interface for conversational mod creation. All data is static/dummy — no real AI calls.

### Route
`/create` → `app/create/page.tsx`

### Layout

**Desktop (≥768px):** Horizontal split
```
┌──────────────────┬────────────────────────────┐
│   Chat (40%)     │      Preview (60%)         │
│                  │                             │
│  [messages...]   │  Mod Name + Edition Badge   │
│                  │  ┌─────┐ ┌─────┐ ┌─────┐   │
│                  │  │Item │ │Item │ │Item │   │
│                  │  │Card │ │Card │ │Card │   │
│                  │  └─────┘ └─────┘ └─────┘   │
│  ┌────────────┐  │                             │
│  │ Type here  │  │  [Generate Mod] button      │
│  └────────────┘  │                             │
└──────────────────┴────────────────────────────┘
```

**Mobile (<768px):** Stacked with toggle tabs
```
┌─────────────────────┐
│  [Chat] | [Preview] │  ← tab toggle
├─────────────────────┤
│  Active tab content  │
└─────────────────────┘
```

### Chat pane
- Message thread with alternating user/AI bubbles
- AI messages styled with pixel theme (mc-panel)
- User messages styled with mc-panel-inset
- Input bar at bottom: mc-panel-inset input + mc-btn send button
- Typing indicator: 3 bouncing dots in an mc-panel, appears for 1-2s before AI response

### Dummy conversation system
- Hardcoded response map: when user submits a prompt, match against keywords to pick a canned response
- Each AI response includes: text message + an array of item data to display in preview
- Example flow:
  1. User: "Diamond sword that shoots lightning"
  2. AI: "I'll create a Thunder Blade for you! Here's what I'm building..." → preview shows sword card
  3. User: "Make it do more damage"
  4. AI: "Upgraded! Damage increased to 25." → preview card updates
  5. User: "Add matching armor"
  6. AI: "Adding a full Thunder Armor set!" → preview shows sword + 4 armor cards
- Fallback: any unmatched prompt gets a generic response with a random item

### Preview pane
- Header: mod name (editable text field) + edition badge (Bedrock blue)
- Item cards in a responsive grid (1-3 columns depending on count)
- Each item card:
  - Category color stripe on left (red=weapon, blue=armor, orange=tool, green=food, purple=block)
  - Emoji/unicode icon matching category
  - Item name in gold
  - 2-3 key stats (e.g., Damage: 20, Effects: Lightning)
  - Description text in gray
- Running total: "3 items" counter
- "Generate Add-On" button (mc-btn, gold accent) — clicking shows a dummy success toast
- "Re-prompt" hint text below the button

### Integration with homepage
- Homepage hero form **keeps its existing `generateMod()` API call** — real mod generation remains functional
- Add a secondary CTA below the hero prompt: "or try conversational mode →" linking to `/create`
- If a user visits `/create?prompt=...` with a query param, the chat auto-submits that prompt on mount

### Header changes
- Add "Create" link to nav between Gallery and Builder
- "Get Started" button **keeps linking to `#hero-prompt`** (preserves the primary UX path)

### Page metadata
- Page title: "Create - ModCrafter"
- Meta description: "Create Minecraft mods through conversation"

### New files
- `app/create/page.tsx` — route wrapper
- `components/ChatInterface.tsx` — the split-pane chat + preview component
- `lib/dummyResponses.ts` — keyword-matched canned responses and item data

### Dummy response data shape

```typescript
interface ItemData {
  name: string;
  category: "weapon" | "tool" | "armor" | "food" | "block";
  icon: string; // emoji/unicode
  stats: Record<string, string | number>; // e.g., { Damage: 20, Effects: "Lightning" }
  description: string;
}

interface DummyResponse {
  keywords: string[];
  text: string;
  items: ItemData[];
}
```

### New CSS
- `.chat-bubble-user` / `.chat-bubble-ai` — message styling
- `@keyframes bounce-dots` — typing indicator
- `.preview-card` — item card in preview pane

---

## 3. Creative Landing Page with Minecraft Characters

### Goal
Transform the landing page from functional-but-plain to visually rich with Minecraft characters, pixel art scenes, and ambient animations.

### Hero Section overhaul

**Background scene:**
- CSS pixel-art landscape behind the headline: grass blocks along the bottom, dark sky, a few floating blocks
- Built with positioned divs using the pixel color palette from globals.css

**Characters (CSS pixel art):**
- **Steve-like character** — positioned left of the hero input, ~80px tall, built from colored div grid (skin tone head, blue shirt, gray legs)
- **Creeper** — positioned right of the hero input, ~80px tall, green div grid with iconic face pattern
- Both characters have a subtle idle bob animation (translateY oscillation, 2s loop)

**Floating particles:**
- Tiny items (swords, pickaxes, diamonds, emeralds) drift upward slowly across the hero area
- Each particle: 8-16px, semi-transparent, different speeds and delays
- CSS animation: `@keyframes float-up` — translateY from bottom to top over 8-15s, with slight horizontal drift

### Demo Showcase replacement
Replace placeholder SVGs with **interactive pixel-art mod scene cards:**

1. **"Thunder Blade"** — pixel sword with lightning bolt particles
2. **"Crystal Armor Set"** — pixel armor stand with 4 glowing pieces
3. **"Mystic Foods"** — pixel table with food items, steam particles rising
4. **"Neon Blocks"** — pixel block arrangement with glow effect

Each card:
- Built with CSS divs (pixel grid)
- Hover state triggers an activation effect (particles, glow pulse, color shift)
- Title and description overlay at bottom
- The old `/public/demos/demo1.svg` through `demo4.svg` files can be deleted after replacement

### Character accents throughout page

| Section | Character/Element | Behavior |
|---------|------------------|----------|
| "Mods Created by Players" | Tiny pixel chickens | Walk left-to-right across section bottom (CSS animation) |
| "How It Works" | Small Creeper | Peeks from behind section title (partially hidden, idle bob) |
| "What You Can Create" | Enderman | Holding a block, positioned near section edge |
| Footer CTA | XP orbs | 3-4 green orbs floating upward near the "Build Your First Mod" button |

### Subtle animations
- **Torch flicker:** Gold glow pulse on section top borders (already have `mc-pulse`, extend with a softer gold variant)
- **Block-break particles:** On hover of capability cards, tiny colored squares burst outward (CSS `@keyframes`)
- **XP orb float:** Small green circles with glow, drifting upward near CTA

### New files
- `components/PixelCharacters.tsx` — reusable pixel-art character components (Steve, Creeper, Enderman, Chicken, items)
- `components/PixelScenes.tsx` — composite scenes for demo showcase cards (ThunderBlade, CrystalArmor, MysticFoods, NeonBlocks)
- `components/FloatingParticles.tsx` — ambient floating items and XP orbs

### New CSS additions to `globals.css`
- `@keyframes float-up` — vertical drift for particles
- `@keyframes idle-bob` — character idle animation
- `@keyframes walk-cycle` — chicken walking
- `@keyframes block-break` — burst particles on hover
- `@keyframes xp-float` — XP orb rising
- `@keyframes torch-flicker` — gold glow pulse variant
- `.pixel-character` — base styles for pixel art grids
- `.floating-particle` — particle base styles

### Technical approach
- All characters are pure CSS — colored div grids, no images, no external assets
- Characters use `display: grid` with `grid-template-columns: repeat(N, 4px)` for pixel sizing
- Colors pulled from existing CSS variables where possible
- Animations are GPU-accelerated (transform + opacity only)
- All decorative elements are `pointer-events: none` and `aria-hidden="true"`

### Mobile behavior (< 768px)

- Pixel characters (Steve, Creeper, Enderman) are hidden on mobile (`hidden md:block`)
- Floating particles are reduced to 2-3 (from 6-8) on mobile
- Chickens walking animation is hidden on mobile
- Demo showcase cards scale down but remain functional
- Block-break and XP orb effects remain (lightweight)

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `components/ModForm.tsx` | Modify | Java "Coming Soon" on edition selector |
| `app/page.tsx` | Modify | Hero scene, characters, new demo cards, character accents, particles |
| `app/globals.css` | Modify | New keyframes and utility classes |
| `components/Header.tsx` | Modify | Add "Create" nav link |
| `app/create/page.tsx` | Create | New route wrapper |
| `components/ChatInterface.tsx` | Create | Split-pane chat + preview |
| `lib/dummyResponses.ts` | Create | Canned AI responses |
| `components/PixelCharacters.tsx` | Create | CSS pixel-art characters |
| `components/PixelScenes.tsx` | Create | Demo showcase scenes |
| `components/FloatingParticles.tsx` | Create | Ambient particles |

## Constraints
- Frontend-only. No backend changes.
- All data is static/dummy. No real API calls for the chat feature.
- No external image assets — all visuals are CSS-based.
- Must work within existing pixel theme (Press Start 2P font, mc-panel system, 0 border-radius, no CSS transitions). CSS `@keyframes` animations are allowed and used throughout.
- Mobile responsive.
