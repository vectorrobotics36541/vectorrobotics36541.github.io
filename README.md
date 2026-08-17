# Vector Robotics — FTC Team 36541

The team site. Static HTML, CSS and JavaScript with **no build step and no
dependencies** — push it and GitHub Pages serves it as-is.

## Structure

```
index.html            the whole page
css/
  base.css            tokens, reset, type scale, layout grid
  components.css      cursor, nav, buttons, reveals, callouts
  sections.css        per-chapter layout
js/
  main.js             entry point (ES module)
  cursor.js           custom cursor + magnetic buttons
  reveal.js           scroll reveals, line reveal, counters
  scroll.js           progress bar, sticky nav, section rail, timeline spine
  ui.js               preloader, subteam tabs, mobile menu
  webgl/
    gl.js             WebGL helpers (context, shaders, buffers)
    m4.js             4x4 matrix math
    geometry.js       the robot, generated as line segments
    scene.js          the persistent 3D scene
assets/logo.png       team logo (was base64 in the old page)
CONTENT.md            what still needs filling in
.nojekyll             stops GitHub Pages running files through Jekyll
```

## Deploying

Commit and push to the branch GitHub Pages serves. Nothing to build.
All paths are **relative**, so it works at `username.github.io` and at
`username.github.io/repo-name/` alike.

## Developing locally

ES modules need a real HTTP server — opening `index.html` from the
filesystem fails on CORS.

```bash
python -m http.server 8123
```

## The design

**The palette is sampled from the logo**, not picked by eye — `#B5FE2B`
lime, `#091E42` navy, `#1D4374` steel. The lime is the logo's dominant
colour, so it leads here too. Tokens live in `:root` in `css/base.css`.

**Type does the heavy lifting.** The scale is deliberately extreme:
display type up to `15rem` against `0.6rem` mono labels. That contrast,
plus asymmetric placement on a 12-column bed, is what carries the page —
not decoration.

**One 3D scene runs the whole site.** Instead of a canvas per section,
a single fixed canvas sits behind everything and scroll drives it:

| Chapter | What the scene does |
|---|---|
| Hero | Robot hangs back; the vector field is the main visual |
| Robot | Camera closes in, the assembly pulls apart, callouts attach |
| Team | Reassembled; the selected subteam's parts light up |
| Later | Recedes and dims out of the content's way |

**The cursor is a vector.** A head that tracks the pointer exactly, a
tail that eases behind, the arrow between them, and a live magnitude /
direction readout. The lag *is* the velocity vector.

Both 3D pieces are hand-rolled WebGL — no Three.js — so the site stays
dependency-free and nothing breaks if a CDN is unreachable.

## Accessibility and fallbacks

- Every animation respects `prefers-reduced-motion`
- Subteam selector is a real ARIA tablist with arrow-key navigation
- The headline keeps its `aria-label`, so it reads as one phrase
- Skip link, visible focus rings, semantic landmarks
- **No WebGL** → 3D is skipped, the page renders fully, the robot
  chapter shows an explanatory note
- **No JavaScript** → a `<noscript>` block drops the preloader, reveals
  all content, and un-sticks the robot chapter
- **`js/main.js` fails to load** → an inline classic script clears the
  preloader and reveals the headline after 6s, so the page can never
  stay covered

## Notes for future edits

Two things here are easy to break, both learned the hard way:

- **Percentage insets on full-width decorative pseudo-elements.**
  `.plate::before` once used `inset: -8% -14%`; on a phone that widened
  the layout viewport and pushed every fixed layer off-screen. Keep
  horizontal insets at `0`.
- **`threshold` on IntersectionObserver reveals.** `intersectionRatio`
  is relative to element size, so a ratio like `0.1` can never be met by
  an element much taller than the viewport, and it silently never
  reveals. `reveal.js` uses `threshold: 0` and gates with `rootMargin`.

`.claude/launch.json` only configures the local preview server. Safe to delete.
