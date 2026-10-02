# Hardik Gupta — portfolio

Personal site for Hardik Gupta, UI/UX & visual designer. Plain static site: no build step.

## Stack

- **HTML + CSS** — `index.html`, `styles.css` (custom properties, sticky stacking, responsive at 900px)
- **GSAP 3.12 + ScrollTrigger + Draggable** — intro, pinned horizontal work shelf, scroll-lit text, timeline, draggable stickers
- **Lenis** — smooth scrolling, also feeds scroll speed into the hero ripples
- **Canvas** — the contour ripples. `assets/hardik-field.png` stores each pixel's distance to the silhouette; `main.js` draws rings that flow outward from it
- **Web Audio** — tiny interface sounds, off until the visitor turns them on
- Fonts: Bricolage Grotesque + JetBrains Mono (Google Fonts)

## Run locally

    python3 -m http.server 8000   # then open http://localhost:8000

## Deploy on Vercel

Import the repo, Framework Preset **Other**, no build command, output directory = root.
