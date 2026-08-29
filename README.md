# RAV3N — Studio Journal

Editorial-style personal/studio portfolio. A single scrolling page — no build step, no framework.

## Structure

```
index.html      The whole journal: Cover → 01 Studio → 02 Practice → 03 Work →
                04 Feature case study → 05 CV → 06 Tools → 07 Colophon
404.html        Not-found page
assets/
  css/style.css   all styles, incl. responsive breakpoints + reveal animation
  js/main.js      mobile nav, Lenis/GSAP scroll wiring, scrollspy, count-up, back-to-top
  fonts/          self-hosted Switzer / Instrument Serif / Inter / JetBrains Mono (.woff2)
  img/            project stills + favicon.svg
  video/          project motion pieces (muted/autoplay/loop)
```

**Fonts**: Switzer for display/headings (a free, self-hostable grotesque from Fontshare, built as an
open alternative to Söhne / Neue Haas Grotesk), Instrument Serif italic for the gold accent words,
Inter for body copy, JetBrains Mono for labels/nav/mono details. All self-hosted as `.woff2` files
rather than loaded from Google Fonts/Fontshare's CDN at runtime, so there's no extra external
request for type.

**Scroll**: Lenis (inertia smooth-scroll) + GSAP ScrollTrigger drive the feel, matching that same
reference build, loaded via CDN (`index.html`, just above `main.js`). Everything in `main.js` checks
for their presence first and falls back to plain browser scrolling + a CSS-only reveal if either
fails to load, JS is disabled, or the visitor has "reduce motion" turned on — reduced motion always
skips both, per `prefers-reduced-motion`.

Nav links, the "See the selected work" CTA, and the footer are in-page anchors (`#work`, `#cv`,
`#colophon`) intercepted by `main.js` to scroll smoothly through Lenis; the nav also highlights
whichever section is currently in view.

## Local preview

```
cd walkwithrav3n
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

**Netlify** — drag the whole `walkwithrav3n` folder onto app.netlify.com/drop, or `netlify deploy --prod`.

**Vercel** — `vercel --prod` from inside this folder.

**GitHub Pages** — push this folder to a repo and enable Pages on the `main` branch (or `/docs`).

All three work with zero extra config since it's just static files plus two CDN `<script>` tags.

## Before going fully live — things to confirm

- **Contact details** in the Colophon section / footer: `hello@rav3n.tech`, `@walkwithrav3n`,
  `rav3n.tech` — confirm these are the real, current handles/domain.
- **`sitemap.xml` / canonical tag** use `https://rav3n.tech` — update if the real domain differs.
- **Social preview image** — no `og:image` is set (no image tool was available to generate one in
  this environment). Drop a 1200×630 image into `assets/img/og-cover.jpg` and add
  `<meta property="og:image" content="...">` to `<head>` when you have one.
- **Plate 08 (FairFare)** still uses CSS-gradient placeholder art (no real screenshot was found for
  it on this machine) — swap in a real screenshot the same way the other plates were done: drop an
  image in `assets/img/`, replace the `<div class="art g5">…</div>` block with an `<img>`.
- Several plates now cycle through multiple shots on hover/click via `data-rotate='["a.jpg","b.jpg"]'`
  on the `.art` element (see `main.js`) — add more shots to any plate the same way, or apply the
  pattern to a new one.
- The motion plates autoplay ~10MB of video combined (`assets/video/`) — fine for a portfolio, but
  re-encode/compress further if you want a lighter first load.
