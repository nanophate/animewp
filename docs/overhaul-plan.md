# Overhaul plan v2 — few examples, deep elements, one harmony

**Product idea in one line:** a calm white/black/gray base where every element is deeply customizable, everything stays in harmony because it all reads the same design tokens, and motion is an optional layer you apply to a group once and every child follows.

What we are *not* building: a huge template library. We ship **10–15 examples** that prove what's possible, not 50 layouts to pick from.

---

## 1. What the reference sites teach

From a2me "今期のアニメサイト 2026 SUM" and the sites' source:

| Site | Signature | Technique |
| --- | --- | --- |
| goodbyelara.com | Water surface, bubbles, a clione appearing on scroll | Opening animation, section reveals, scroll-linked character, story/episode carousels, smooth scroll |
| kakekoi (Shochiku) | The logo's **blur** becomes the site's transition language | Blur-in reveals, **header logo morphs to the short title on scroll**, marquee, clip-path, canvas |
| kimishinu-anime.com | Quiet palette, European type, petals and clouds drifting with scroll | Scroll-linked decorations, living video background behind the movie carousel |
| yanisuu.com | Orange line art on blue, **smoky wavering text** | Opening logo animation, parallax, text distortion, tabs, modal |

**The lesson:** each site chooses *one* motion idea that comes from its world (water / blur / petals / smoke) and applies it everywhere with the same timing. That's what makes them feel designed. So our system must make "one idea, applied consistently" the easy path.

---

## 2. Three layers

### Layer 1 — Harmony (tokens)

One place defines the design language; every element reads it. Change one token and the whole page moves together.

- **Default scheme: white / black / gray** (kept). It's a quick start, not a limit.
- Tokens: color roles (base, surface, text, muted, border, accent, on-accent, contrast), type scale (8 sizes), 5 font roles (body, heading, display EN, accent JA, mono), spacing scale + section rhythm, radius, shadow, line weight, **motion (duration, easing, distance, stagger)**.
- Edited in Site Editor → Styles (colors, fonts, sizes). Tokens without a Styles UI (radius, motion, line weight) are `--wp--custom--*` variables, editable in Additional CSS. Optional later: a small "Design tokens" screen that writes them into user Global Styles so non-CSS users can edit them too.
- Rule in code: component CSS never contains literal colors, sizes, radii or durations. Only tokens.

### Layer 2 — Elements (deep customization, global + local)

Each element has **a global default** (Styles → Blocks → element) and **local overrides** (block sidebar with reset). Overriding locally never breaks harmony because the local controls offer the *token presets* first, with custom values as a secondary option.

| Element | What you can control |
| --- | --- |
| **Section** (Group + section styles) | Background (color / gradient / image / video), padding rhythm, width, divider shape (none / wave / diagonal / torn / line), decoration layer slot |
| **Section Title** *(new)* | EN word + JA label, order, size, ghost background word, ornament line, alignment, image logotype option |
| **Text styles** | Eyebrow, Lead, Catchphrase, Vertical (縦書き), Caption, Number: each with its own font role, size, tracking, line height |
| **Button / Link** | Fill, Outline, Arrow link (PREV/NEXT/MORE style), Pill: icon, hover style, size |
| **Card** | Image ratio, frame, radius, shadow, hover, caption position |
| **Image frame** | Fade edge, mask shape, tilt, duotone, per-device focal point |
| **Movie Gallery** *(new)* | Items (YouTube / Vimeo / file); carousel / grid / featured; living background (blurred poster / looping file / muted YouTube); play icon; card style; full-screen player |
| **Key Visual** *(new)* | Slides, catchphrase overlay, thumbnail nav, on-air badge |
| **Character** *(new)* | Tabs or carousel; art, name, CV, profile, color per character |
| **Header** | Logo → short title morph on scroll, transparent over hero, sticky, menu style |
| **Decoration** *(new)* | Place SVG/PNG shapes (petals, bubbles, lines, your own art) on a section's decoration layer: position, size, rotation, opacity, blend, behind/in front |
| Existing Panel / Image & Text / Video / Rotated Text | Kept; controls rebuilt to native style (ToolsPanel + reset), panel's 3-way color mode replaced by standard color controls |

Making "Styles → Blocks → Movie Gallery" change every card requires each block to declare `supports` and map inner parts (card, play icon, title) with block.json `selectors`. That's a build requirement, not optional.

### Layer 3 — Motion (optional, applied to groups)

Motion is an add-on module. It can be fully switched off site-wide, and content is complete without it.

**The key idea: Choreography.** Put motion on a *Group / Section*, not on 20 blocks one by one:

- **Apply to group:** select a section → Motion → "Rise". Every direct child animates in, staggered by the token `motion.stagger`. Override per child if wanted ("this heading: Blur-in instead", "skip this one").
- **Inherit down:** a page-level setting ("Page motion: Blur") becomes the default for every section on that page, so a whole site gets kakekoi-style consistency from one choice.
- **Motion presets = named, reusable, editable.** Built-in presets inspired by the references; users duplicate and edit them (duration, easing, distance, blur amount) and the edit applies everywhere the preset is used.

| Preset | Inspired by | What it does |
| --- | --- | --- |
| Fade / Rise / Slide | standard | Entrance on scroll |
| **Blur-in** | kakekoi | Elements sharpen into focus |
| **Mask wipe** | many | Clip-path reveal left→right / bottom→top |
| **Split text** | many | Heading reveals by character/word (accessible: real text stays intact) |
| **Smoke** | yanisuu | Gentle wavering distortion on text (SVG turbulence) |
| **Drift** | kimishinu | Decoration-layer items float with scroll (petals, clouds, bubbles) |
| **Parallax** | yanisuu / many | Background or image moves slower than the page |
| **Marquee** | kakekoi | Endless scrolling text band |
| **Hover set** | – | Lift / zoom / glow / underline-grow, applied to all cards in a group |

**Site-level moments (optional toggles):**
- **Opening:** logo reveal on first visit (once per session, skippable, off under reduced motion).
- **Page transitions:** CSS cross-document View Transitions (`@view-transition`) for fades/blur between pages, with zero JavaScript and graceful no-op in unsupported browsers.
- **Header morph:** full logo → short title on scroll.
- **Smooth scroll:** off by default (accessibility); opt-in.

**Technical rules for motion:**
- Settings stored as block attributes; classes / data attributes added at render time (`render_block` + `WP_HTML_Tag_Processor`), so deactivating the plugin never invalidates saved blocks.
- CSS scroll-driven animations where supported, IntersectionObserver fallback, Interactivity API for state. No GSAP/jQuery.
- `prefers-reduced-motion` → everything static. Editor shows a "preview motion" button rather than animating while you edit.

---

## 3. The 10–15 examples

Each example exists to demonstrate capabilities, not to be a template catalog. Together they cover every element and every motion preset once.

**Sections (patterns), 10:**
1. Key Visual: slider with catchphrase + on-air badge
2. Introduction: Section Title + lead + image with fade edge
3. Story: vertical catchphrase + text + episode tabs
4. **Movie: carousel with living background** (the kimishinu treatment)
5. Character: tabs with profile + CV
6. Cast & Staff: two-column credits
7. Music / Release: jacket cards with hover set
8. On Air & Streaming: schedule table + Countdown
9. News: query loop, arrow-link "MORE"
10. Footer: key visual + share buttons + credits

**Full example pages, 3** (same sections, different token + motion choices, to show harmony):
- **Monochrome** (default): no motion, pure typography
- **Blur** (kakekoi-like): Blur-in choreography + header morph + page transitions
- **Drift** (kimishinu-like): muted palette, petals decoration + Drift + living movie background

**Plus 1 Style Guide page:** every element, text style and motion preset on one page. Doubles as our QA page.

Total: 14.

---

## 4. Engineering baseline

- `@wordpress/scripts` build, one folder per block, Interactivity API for front-end behavior.
- English source strings + Japanese translation.
- **Compatibility:** block IDs (`animewp/panel`, `animewp/text-group`, `animewp/media`, `animewp/video`) never change. Old style classes in saved content (`is-style-animewp-kicker`, `-short-vertical`, `-reveal`, `-portrait`, `-fade-*`, …) stay registered or aliased. Deprecations for every save-format change; keep the v1.x fixture tests.
- Remove: separate fonts admin screen (migrate saved roles into Global Styles), fake "用途：…" font families, `data-animewp-default-*` header overrides (runtime-only, safe to delete), the 57 existing patterns (replaced by the 14 above).
- YouTube thumbnails: editor calls a REST endpoint (nonce + `upload_files`, `i.ytimg.com` only) that sideloads the image into the Media Library once. Visitors don't contact YouTube until they play, except when a site deliberately picks the muted-YouTube background.

---

## 5. Phases

| Phase | Scope | Done when |
| --- | --- | --- |
| 0 — Foundation | Build tooling, per-block folders, English strings, rebuild 4 existing blocks with identical saved output | All v1.x fixtures pass |
| 1 — Harmony | Token set, font roles as real presets, text styles, section styles, CSS variable reference | Changing one token visibly updates every element |
| 2 — Elements | Section Title, Movie Gallery, Key Visual, Character, Decoration, header morph; native controls on existing blocks | Each element has global + local controls |
| 3 — Motion | Choreography (group apply + inherit + per-child override), preset editor, 9 presets, opening, page transitions | One click on a section animates its children in harmony |
| 4 — Examples | 10 sections, 3 example pages, style guide | 14 examples, every element and preset shown once |
| 5 — Polish | Onboarding screen, docs, screenshots, accessibility + performance pass | Ready to share or sell |

---

## 6. Open decisions

1. Product name (decide before anyone installs it; renaming the theme folder later loses users' Site Editor changes).
2. Where user-edited motion presets live: plugin settings screen (recommended) or CSS-only.
3. Minimum WordPress version (6.6 now; 6.8 would reduce fallbacks).
