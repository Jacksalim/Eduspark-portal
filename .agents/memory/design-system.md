---
name: Design system
description: CSS variables, fonts, and component conventions for EduSpark
---

## CSS Variables (in src/index.css)
- `--teal: #1a6b6b` — primary brand colour
- `--gold: #c9a84c` — accent / CTA colour  
- `--ink: #0d0d0d` — dark text
- `--cream: #faf7f2` — light section background
- `--mist: #e8edf3` — borders/dividers
- `--teal-light: #e6f4f4` — teal pill backgrounds

## Fonts
Playfair Display (serif) — headings, logo, big numbers
DM Sans (sans-serif) — body, buttons, labels

## No Tailwind
All styling is inline styles or CSS in `<style>` tags within components.

## Animation conventions (framer-motion v11)
- `FU(delay)` helper — fadeUp with whileInView, once: true, margin: -60px
- Blobs: `animate={{ scale:[1,1.15,0.9,1], x:[...], y:[...] }}` repeat Infinity
- Section reveals: whileInView with viewport once: true
- AnimatePresence mode="wait" for tab/mode switches
