# HANDOFF — Vector Robotics (FTC 36541) website

**Last verified:** 2026-09-02 21:48 (re-verified twice against files on disk, not from memory).
**Project root:** `C:\Users\aggar\Documents\FTC\vector-robotics-website`

> Companion docs — read after this file; they are not duplicated here:
> - `README.md` — architecture, design rationale, a11y/fallbacks, edit traps
> - `CONTENT.md` — the placeholder-filling checklist, section by section

---

## 1. Orientation

A public website for **Vector Robotics, FIRST Tech Challenge team 36541** (Lathrop, CA).
Its audience is prospective student members, mentors, and — most importantly — **sponsors**,
so it doubles as a pitch surface with sponsorship tiers and contact routes.

It is a **static site: plain HTML/CSS/JS, no build step, no dependencies, no framework**,
designed so GitHub Pages can serve it exactly as it sits on disk. The distinguishing feature is
a hand-rolled WebGL scene (no Three.js): an ambient 3D vector field plus a wireframe FTC robot
that assembles, explodes into an annotated exploded view, and highlights subsystems — all driven
by scroll position.

**Stage:** design and engineering are essentially complete and working end to end. What remains
is content entry (the team owner has started this himself) and deployment — **the project has
never been committed to git and is not yet published.**

---

## 2. Mission & scope

**Original ask, in the owner's words:**
> "take our FTC team's current website and give it an absolute rework from the ground-up, making
> it look so much cooler and cleaner than it was before... design revolutionary, where the
> aesthetic, design, versatility, and everything is as clean as possible. this app should have
> clean animations, a cool custom cursor effect, and potentially 3d objects."

Plus a hard constraint: *"keep it in a format that will allow it to still work with github pages
like i am right now"* — multiple files are fine, but it must stay statically servable.

**How it evolved:**
1. Starting point was a single 64KB `index.html` with the logo inlined as base64, a 2D canvas
   vector field, and mostly `[placeholder]` copy.
2. Four scoping questions were asked; the owner answered all four with *"Whichever one results in
   the best, coolest website with the most aura."* — i.e. **full discretion, favour maximum impact.**
3. The first rebuild was rejected: *"I had asked you to completely REVAMP the website, not just add
   a couple more little things."* It had kept the old section order and stacked-card rhythm. The
   second pass replaced the visual language wholesale (near-black ground, extreme type scale,
   asymmetric 12-column bed, one persistent 3D scene behind the whole page).
4. Two later rounds of targeted feedback — see §6 and §7.

**Explicitly out of scope / deliberately not done:**
- **No invented facts.** No fake awards, results, dates, roster names, or sponsors were written.
- No framework, bundler, package manager, or npm dependency. No Three.js.
- No CMS, backend, forms, or analytics.
- A multi-page structure was considered and rejected in favour of one scroll-driven page.

---

## 3. Current state

### Works end to end (verified this session by live headless render)
- Page renders fully; WebGL initialises (`no-webgl` class absent from the rendered DOM).
- Persistent 3D scene: ambient vector field + wireframe robot, scroll-driven camera across
  hero → robot → team → later chapters.
- Robot chapter: assembly, exploded view, 5 HTML callouts welded to projected 3D anchor points.
- Team chapter: ARIA tablist (click, arrow keys, Home/End); selecting a subteam spotlights that
  part of the robot in 3D.
- Custom vector cursor with live magnitude/direction readout; magnetic buttons.
- Journey timeline with a spine that fills on scroll and nodes that light as you reach them.
- Scroll progress bar, sticky/condensing nav, section rail, mobile menu, preloader, counters.
- Responsive to 375px with zero horizontal overflow; mobile menu toggle fully on-screen.
- Fallbacks: no-WebGL, no-JS (`<noscript>`), and a failsafe inline classic script that clears the
  preloader after 6s if `js/main.js` never loads.

### Half-built / needs the owner
- **Content is partially filled.** The owner edited `index.html` on Aug 20 — *after* the build
  session — and entered real values. Genuine placeholders remain in the **timeline (all 4
  entries)**, **sponsor slots (all 4)**, and the **robot revision number**. Full table in §9.

### Broken / actively wrong
- **Cosmetic bug: real content is styled as placeholder.** The owner filled in values but left
  `class="todo"` on the spans, so **BIOBUZZ, Pocketed Carbon Fiber, Java, the real email, and
  Lathrop, CA all render in lime with a dashed underline** — the deliberate "unfilled" styling.
  Confirmed visually in a render. Fix = remove the `todo` class from those spans (§10, step 1).
- **Not under version control.** `git status` returns `fatal: not a git repository`; there is no
  `.git` directory. Nothing is committed or pushed, and there is **no undo history** — the working
  directory is the only copy of this work.
- **Not deployed.** No GitHub remote and no Pages configuration observed.
- `og:image` is the relative path `assets/logo.png`; most platforms require an absolute URL, so
  link previews will likely show no image (procedure in `CONTENT.md` §6).

### Memory-vs-repo discrepancies found while verifying
- I recalled leaving 13 `.todo` markers; the file has **12**, and their *content* changed —
  because the owner edited the file after the session. The repo wins; §9 reflects disk.
- I recalled `[team36541@example.com]` as the contact; the file now has the owner's real address
  `vectorrobotics36541@gmail.com` in **both** required places (contact line and the `mailto:`
  href) — that pairing is correctly done.
- Drivetrain read `Mecanum [confirm]` when written; the owner removed `[confirm]`, so **mecanum is
  confirmed** and the existing 3D wheel geometry is correct — no rebuild needed.

---

## 4. Architecture map

**Stack:** HTML5, CSS3 (custom properties, no preprocessor), vanilla JS ES modules, raw WebGL 1.
**Zero runtime dependencies.** The only external request is Google Fonts (Space Grotesk, Inter,
JetBrains Mono).

**Entry points:** `index.html` → three stylesheets → `<script type="module" src="js/main.js">`.
`main.js` initialises page chrome synchronously, then **dynamically imports** `js/webgl/scene.js`,
so 3D never blocks first paint and a WebGL failure degrades gracefully.

**Data flow (scroll → 3D):** `scene.js` `updateTargets()` reads each chapter's
`getBoundingClientRect()` every frame, converts it to 0–1 progress, and writes camera/effect
*targets*. The frame loop eases current values toward those targets (frame-rate independent), then
uploads them as uniforms. Nothing is stored in the DOM and the scene never listens to scroll
events. Separately, `scroll.js` runs **one** passive scroll listener plus one rAF tick for all
DOM-side scroll effects.

| Path | Role | Why it matters |
|---|---|---|
| `index.html` | The entire page markup | The only file the owner edits for content; **hand-edited Aug 20** |
| `css/base.css` | Design tokens, reset, type scale, 12-col grid, ambient layers | Palette sampled from the logo; all colour lives in `:root` here |
| `css/components.css` | Cursor, nav, buttons, reveals, callouts, marquee, panels | Holds the `.todo` placeholder style behind the §3 cosmetic bug |
| `css/sections.css` | Per-chapter layout (hero, robot, team, journey, …) | The robot chapter's sticky tall-bay layout lives here |
| `js/main.js` | Entry point; wires modules; lazy-loads the 3D | Routes subteam tab → `scene.setHighlight(part)` via a holder variable |
| `js/webgl/scene.js` | **The persistent 3D scene** (both shader pairs, camera, frame loop) | Largest and most delicate file (18KB); shaders are JS template literals |
| `js/webgl/geometry.js` | Builds the robot as line segments; `PART` enum; label anchors | Change the robot here — `buildRobot()`; there is no model file |
| `js/webgl/gl.js` | WebGL helpers: context, shader compile/link, buffers, DPR resize | Pre-resolves all uniforms/attribs so the draw loop never queries |
| `js/webgl/m4.js` | 4×4 matrix math (perspective, rotate, translate, project) | `transformPoint` is what pins HTML callouts to 3D points |
| `js/cursor.js` | Vector cursor + magnetic buttons | Pointer-device only; disabled on coarse pointers |
| `js/reveal.js` | Scroll reveals, per-line headline reveal, counters, timeline nodes | `threshold: 0` here is deliberate — see §8 |
| `js/scroll.js` | Progress bar, sticky nav, rail, hero parallax, **timeline spine fill** | Single scroll listener for the whole page |
| `js/ui.js` | Preloader, subteam tablist, mobile menu, stage hint, year | Preloader has a hard 1.6s backstop so it can never trap a visitor |
| `assets/logo.png` | Team logo, 551×507 RGBA | Extracted from base64 in the old page; **the palette derives from it** |
| `.nojekyll` | Stops GitHub Pages running the site through Jekyll | Empty file; must stay |
| `.claude/launch.json` | Local preview server config (port 8123) | Tooling only; safe to delete |

---

## 5. Environment & runbook

**Machine:** Windows 11, PowerShell. No Node, no npm, no `package.json` — none required.

```powershell
# From a clean copy — there is nothing to install.
cd C:\Users\aggar\Documents\FTC\vector-robotics-website

# Run locally. ES modules need real HTTP; opening index.html via file:// fails on CORS.
python -m http.server 8123
# then open http://localhost:8123/
```

- **Required env vars:** none. **Services:** none. **Port:** 8123 (local preview only).
- **Tests:** none exist (no test framework). Verification is visual plus DOM assertions.
- **Build:** none. What is on disk is what deploys.

**Windows-specific gotchas hit this session:**
- Both a Bash tool (Git Bash) and PowerShell are available; Bash was used throughout. PowerShell
  5.1 has no `&&` / `||` chaining — use `;` or `if ($?) { }`.
- The `Edit` tool repeatedly failed with *"String to replace not found in file"* on
  `js/reveal.js` despite the text matching visually — a line-ending mismatch.
  **Workaround: rewrite the whole file** rather than fighting the matcher.
- Writing this file with a bash heredoc failed (`unexpected EOF while looking for matching quote`)
  because of quotes inside the embedded code samples. Use the `Write` tool for long documents.

**Headless screenshots (this is how the design was iterated):**

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader --hide-scrollbars \
  --virtual-time-budget=12000 --window-size=1440,900 \
  --screenshot=out.png "http://localhost:8123/"
```

The SwiftShader flags are **mandatory** — without them headless Chrome has no WebGL and the scene
silently renders nothing. See §8 for the limits of this technique.

---

## 6. Decisions & rationale

**Palette is sampled from the logo, not chosen.** `assets/logo.png` was decoded and its dominant
colours counted: `#B5FE2B` lime (26k px), `#091E42` navy (54k px), `#1D4374` steel, `#64B51B`
deep lime. The site's tokens derive from those, which is why lime leads. Rejected: inventing a
palette, and keeping the old site's `#4fb3e8` blueprint blue as primary.

**One persistent 3D scene, not a canvas per section.** A single fixed canvas sits behind
everything, with scroll driving camera / explode / highlight. Rationale: one GL context instead of
several, the robot becomes a continuous character across chapters, and sections can be added
without touching GL. Rejected: separate hero-field and robot-viewer canvases — that was the first
implementation (`js/webgl/field.js` + `js/webgl/robot.js`), both since deleted and merged into
`scene.js`. **Those two files no longer exist; do not look for them.**

**Hand-rolled WebGL over Three.js.** Keeps the site dependency-free and immune to a CDN outage,
which matters because GitHub Pages sites are often opened on locked-down school networks. Cost:
roughly 500 lines of shader and matrix code we own outright. Accepted deliberately.

**The robot is generated in code, not loaded from a model file.** `buildRobot()` emits line
segments. No loader, no asset to 404, trivially diffable, and each part is tagged via
`W.group(PART.X, origin)` — that tag drives both explode direction and subteam highlighting.
Rejected: authoring and exporting a mesh.

**Vector-field arrows: pointing restored, but depth-limited.** The owner said the 3D version felt
"aggressive" / "edgy" versus the flat original. Diagnosis: the old 2D canvas had *one* layer with
a ~340px attraction radius; the 3D field ran the same rule across ~9 depth planes, so every plane
converged on one screen point and stacked into a vortex. Fix, in `FIELD_VS`:
- a depth weight, `float near = smoothstep(0.28, 0.86, t)`, so **only front layers respond**;
- a tighter radius, `smoothstep(0.38, 0.0, length(scr))`;
- gentler reactions — length `+28%` (was `+120%`), alpha `+70%` (was more than double).

**Important:** removing the attraction entirely was tried first and explicitly rejected —
*"you completely removed the arrows pointing at the cursor, which is what I didn't want."*
The pointing must stay; only its intensity is tunable.

**The headline reveal is per-line, not per-character.** Per-character was implemented first and
looked broken in practice — captures showed the headline as scattered grey fragments mid-flight.
Per-line uses one transform per line inside a clipping mask, and characters are **visible by
default**, animating only once `.is-lit` is added — so a JS failure can never blank the headline.

**The subsystem spotlight is scoped to the team chapter (`uHlMix`).** Originally the highlight was
global, so the initial tab selection dimmed every non-selected part to 16% *across the whole page*
and the robot chapter rendered as little more than the ground grid. `uHlMix` ramps the effect in
only while the team section holds the viewport.

**Timeline: a vertical scroll-filled spine.** An intermediate version used a horizontal
snap-scrolling rail; the owner asked for the earlier vertical spine back — *"I liked the effect of
scrolling and seeing the timeline move forward as you scroll."* It was restored and restyled to the
current design system rather than pasted back verbatim.

**Placeholders are visibly marked** (`.todo` → lime with a dashed underline) so unfilled fields are
impossible to miss and can never be mistaken for real content — chosen over silently plausible
filler text. This is exactly what now mis-styles the owner's real entries; see §3.

---

## 7. Conventions & working preferences

**How the owner works — learned directly this session:**
- **Wants boldness, not caution.** Offered four scoping choices, he answered *"Whichever one
  results in the best, coolest website with the most aura."* Make the ambitious call and proceed.
- **Will say plainly when you have under-delivered** — the first rebuild was rejected as "just a
  couple more little things." Refinement is not revamp.
- **Feedback is precise and should be read literally.** "Make it less aggressive" meant *tame it*,
  not *delete it*; deleting it was a second, separate mistake. When a note is about degree, change
  the degree — do not remove the feature.
- Gives feedback by referencing earlier iterations ("the very old website", "our second
  iteration"), so keep track of what each version looked like.
- **Edits `index.html` directly between sessions.** Never overwrite it wholesale without diffing
  first — you will destroy real content.

**Code style (match what exists):**
- 2-space indent; single quotes in JS; semicolons.
- Comments explain **why**, not what — several encode hard-won bugs. Do not strip them.
- CSS: custom properties in `:root`; flat, BEM-ish class names (`.tl-item`, `.team-btn`); sections
  separated by banner comments.
- JS: one concern per module, each exporting `init*()` functions; no globals; no framework.
- Accessibility is not optional — ARIA roles, `prefers-reduced-motion`, focus rings, a skip link
  and graceful degradation are already in place and must survive edits.

**Commit/PR format:** N/A — no git history exists yet to match (see §10, step 2).

---

## 8. Dead ends & known traps

**Real errors seen, with causes:**

1. `SyntaxError: Unexpected identifier 'near'` → **the entire 3D scene silently failed to load.**
   Cause: a comment inside the GLSL used **backticks** around a variable name, and the shaders are
   JavaScript template literals — the backtick terminated the string early and spilled GLSL into
   JS. **Trap: never use a backtick or a backslash inside the shader source in `scene.js`.**
   Counting backticks in the file is NOT a valid check (legitimate template literals and one JS
   comment also contain them). Run this guard after any shader edit — it prints nothing when clean:

   ```bash
   python -c "s=open('js/webgl/scene.js',encoding='utf-8').read(); B=chr(96); K=chr(92)
   [print('BAD char inside',n) for n in ['FIELD_VS','FIELD_FS','ROBOT_VS','ROBOT_FS']
    if any(c in s.split('const '+n+' = '+B)[1].split(B+';')[0] for c in (B,K))]"
   ```

   Then confirm the scene still builds: `initScene()` must return non-null (a null return means a
   shader failed to compile). Verified clean on 2026-09-02.

2. **IntersectionObserver reveals never fired** (`is-in` count 0) — whole sections stayed invisible.
   Cause: `threshold: 0.1`. `intersectionRatio` is relative to *element* size, so an element much
   taller than the viewport can never reach 0.1. **Use `threshold: 0` and gate with `rootMargin`.**

3. **Mobile: the fixed nav was 404px wide in a 375px viewport**, pushing the menu button
   off-screen. Cause: `.plate::before { inset: -8% -14%; }` — a percentage *horizontal* inset on a
   full-width decorative pseudo-element widened the layout viewport. **Keep horizontal insets at
   `0`.** Contributing: `.brand { flex-shrink: 0 }` stopped the nav compressing.
   Note: adding `overflow-x: clip` to `html` *masked the measurement* without fixing the cause —
   verify overflow with clipping temporarily lifted.

4. **The subsystem spotlight applied globally**, leaving the robot chapter nearly blank. Fixed via
   `uHlMix` (§6). Symptom to watch for: only the ground grid visible.

5. **Zero-height sections broke the scene's scroll math.** `centreProgress()` returned 1 for a
   `display:none` or collapsed element, so the scene believed it was past the end and dimmed out.
   It now returns 0 when `rect.height < 1`.

**Headless screenshot limitations (these cost hours — read before trusting a capture):**
- Scrolled captures **do not work**. Under `--virtual-time-budget` the software compositor only
  rasterises the first viewport; anchors like `#robot` and JS scrolling both produced identical
  5,848-byte all-black PNGs. `--force-prefers-reduced-motion` did not help.
  **Working technique:** generate a temporary `dbg-*.html` copy that *collapses* preceding sections
  to ~36px (collapse — do **not** `display:none`, that breaks scroll-progress math) and force
  `[data-reveal]{opacity:1}`. Delete these temp files afterwards; none remain on disk now.
- rAF and IntersectionObserver are **starved** under virtual time, so reveals, counters and eased
  camera values may not converge — a capture can look mid-animation even when the page is fine.
- Headless has **no cursor**, so cursor-dependent effects need a synthetic
  `PointerEvent('pointermove', {pointerType:'mouse'})` dispatched on a timer.

**Other traps:**
- The MCP browser served a **stale cached page** and produced a completely wrong diagnosis (it
  reported old-page selectors that no longer existed). **Always cache-bust:
  `http://localhost:8123/?v=<n>`.** Console messages there can be stale too — re-navigate before
  trusting them.
- `js/webgl/scene.js` is the fragile file. The shaders, the eased-state object and the scroll model
  are interdependent; after changing a uniform, verify the scene still compiles (`initScene`
  returns non-null) before moving on.

---

## 9. Open threads

Ranked by priority.

**P1 — Real content is styled as placeholder (cosmetic bug, user-visible right now).**
Remove the `todo` class from these spans in `index.html`:

| Line | Content | Status |
|---|---|---|
| 162 | `BIOBUZZ` (hero season) | real → unmark |
| 257 | `Pocketed Carbon Fiber` | real → unmark |
| 259 | `Java` | real → unmark |
| 260 | `BIOBUZZ` (spec season) | real → unmark |
| 449 | `vectorrobotics36541@gmail.com` | real → unmark |
| 450 | `Lathrop, CA` | real → unmark |

**P2 — Put the project under version control, then deploy.** No `.git` exists and this is the only
copy of the work. Init, commit, push, enable GitHub Pages. Do not commit without asking first
(§10, step 2).

**P3 — Genuine placeholders still needing the owner's facts:**
- Line 264: robot revision, `REV [0]`
- Lines 347–363: **all four timeline entries** — `[FOUNDING YEAR]`, `[school / sponsor]`,
  `[ROOKIE SEASON]`, `[CURRENT SEASON]`, `[NEXT]`
- Lines 408–411: **four `[ SPONSOR LOGO ]` slots** (drop images into `assets/sponsors/`)

**P4 — `og:image` needs an absolute URL** once the Pages URL is known, or link previews stay
imageless. Ideally a 1200×630 `assets/og.png`. Procedure in `CONTENT.md` §6.

**Open questions for the owner (do not guess):**
- Is "BIOBUZZ" the season name, or a team/robot nickname? It is currently shown in the hero **and**
  the spec sheet under the label "Season" — confirm that label is right. UNVERIFIED.
- What is the GitHub repo name / target Pages URL? Needed for `og:image`, and to confirm path
  behaviour (all paths are already relative, so a project-path URL will work).
- Are the three sponsorship tier perk lists accurate to what the team actually offers? They were
  written as plausible defaults, and `CONTENT.md` flags them for review before sending to sponsors.

---

## 10. Immediate next steps

1. **Fix the P1 `.todo` mis-styling** — remove the `todo` class from the six real values listed in
   §9. Verify at `http://localhost:8123/?v=1` that BIOBUZZ, Java, the email and Lathrop, CA render
   in normal white/`--paper-2` and **not** lime-dashed, while the timeline and sponsor placeholders
   still show lime-dashed.
2. **Offer to initialise git** (`git init`, a `.gitignore`, first commit). Do **not** commit or push
   unprompted — outward-facing and hard-to-reverse actions need confirmation, and the owner has not
   yet been asked. Ask which GitHub repo and branch Pages should serve.
3. **Ask the owner for the P3 facts** — founding year, rookie-season results, current-season
   milestones, robot revision, sponsor names and logos. These are the last blockers to a "real" site.
4. **Re-verify responsive and a11y after any markup edits:** 375px width with zero horizontal
   overflow, nav toggle fully on-screen, tablist arrow-key navigation, and `initScene` returning
   non-null. Cache-bust the URL when checking.
5. Optional polish once content lands: absolute `og:image`, and a sponsor-logo grid pass.

---

## 11. External references

- **Google Fonts** (the only external runtime request): Space Grotesk, Inter, JetBrains Mono —
  `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`
- **GitHub Pages** — the intended host. Repo and URL **UNKNOWN**; not yet created or configured.
- Local preview: `http://localhost:8123/` (`python -m http.server 8123`).
- Contact address embedded in the site: `vectorrobotics36541@gmail.com`.
- No dashboards, tickets, or CI. N/A.
