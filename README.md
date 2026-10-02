# replicationstory

Static portfolio site. Deploy on Vercel with Framework Preset "Other" and no build command.


Static single-page site: plain HTML + Tailwind (Play CDN build), GSAP 3.12.2
(ScrollTrigger, Draggable), Lenis smooth scroll, Lucide icons, Tone.js audio,
Google Fonts + cdnfonts.

## Run locally

    python3 -m http.server 8000   # from this folder, then open http://localhost:8000

Serve over HTTP — opening index.html via file:// blocks the vendored scripts
(they carry `crossorigin` + SRI attributes).

## Differences from the live site

- Cloudflare-injected scripts removed (email-decode, challenge platform) and
  obfuscated emails restored to plain `mailto:` links.
- JS libraries are vendored in `vendor/` instead of loaded from CDNs.
- Lucide is pinned to 0.439.0: the live site references 0.435.0, which was
  never published, so the live icon script 404s.
