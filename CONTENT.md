# Content checklist

Everything still needing your real information is marked in the page with
`class="todo"` — it renders in **lime with a dashed underline**, so you can spot
every one by scrolling the site.

To find them all in the code:

```bash
grep -n "todo" index.html
```

---

## 1. Hero — `index.html`, "HERO" section

| What | Current | Where |
|---|---|---|
| Season | `[SEASON]` | `.hero-stats` → third `.hstat` |

Team number (36541) and subteam count (4) are already real and count up on load.

---

## 2. Robot — "ROBOT" section

| What | Current |
|---|---|
| Revision number | `REV [##]` (top-right of the 3D stage) |
| Drivetrain | `Mecanum [confirm]` — I assumed mecanum because the 3D model draws mecanum wheels. If you run something else, tell me and I'll rebuild the wheel geometry. |
| Chassis material | `[add material]` |
| Language | `[Java / Kotlin / Blocks]` |
| Season | `[add season]` |

Control system is set to **REV Control Hub** and status to **In active iteration**
— both carried over from your old site. Change if wrong.

### Changing the 3D robot itself

The model is generated in code, not loaded from a file:
`js/webgl/geometry.js` → `buildRobot()`. Useful knobs:

- Chassis size — the `W.box(0, CY, 0, 4.7, 1.2, 4.7, ...)` call (half-extents)
- Wheels — the four `wheel(W, x, z, side, order)` calls
- Lift height — `TY1`
- Labels — the `anchors` array at the bottom; each is a 3D point plus text

Each `W.group(PART.X, origin)` call tags everything after it as one part.
That tag drives two things: which direction the piece flies when the
assembly explodes, and which subteam tab lights it up. The tab→part
mapping is the `data-part` attribute on each `[role="tab"]` in
`index.html`, matching the `PART` enum at the top of `geometry.js`.

Camera framing per chapter lives in `updateTargets()` in
`js/webgl/scene.js` — `camDist`, `explode`, `offX/offY`, `ghost`.

---

## 3. Journey — "JOURNEY" section

All three entries are placeholders:

- `[FOUNDING YEAR]` and `[school / sponsor]`
- `[ROOKIE SEASON]` — plus real results
- `[CURRENT SEASON]`

Add more entries by copying an `<article class="tl-item">` block. The timeline
spine fills automatically as you scroll, however many you add.

---

## 4. Members — "MEMBERS" section

Nine headshots from `assets/team-headshots/` are in, one card each — Vyom
first, the rest alphabetical by first name. Each card's role is still a
placeholder:

```html
<div class="member-meta"><h4 class="d4">Advik</h4><span class="v todo">[ROLE]</span></div>
```

Replace `[ROLE]` with each person's actual title (e.g. "Team Captain",
"Programming Lead", "Mentor") — grep for it the same way as everything else:

```bash
grep -n "member-meta" index.html
```

Add more people by copying a whole `<article class="member">…</article>` block
and dropping a matching photo into `assets/team-headshots/`. Cards are square
(`object-fit: cover`), so a roughly centred face crops cleanly.

---

## 5. Sponsors — "SPONSORS" section

Four `[ SPONSOR LOGO ]` slots. Replace each `<div class="slot">…</div>` with:

```html
<div class="slot"><img src="assets/sponsors/acme.png" alt="Acme Robotics"></div>
```

Put logo files in `assets/sponsors/`. Slots are 16:9; light-on-dark logos
(white or transparent PNG/SVG) will look best.

The three sponsorship tiers are written and ready — check the perks match what
you actually offer before sending this to anyone.

---

## 6. Join — "JOIN" section

| What | Current |
|---|---|
| Email | `[team36541@example.com]` |
| Location | `[add your city / school]` |

**Two places to change the email**: the `.contact-line` text *and* the
`href="mailto:…"` on the "Email the team" button.

---

## 7. Social preview image (optional)

`og:image` currently points at the logo. For a proper link preview, make a
1200×630 image, save it as `assets/og.png`, and set an absolute URL:

```html
<meta property="og:image" content="https://YOURNAME.github.io/REPO/assets/og.png">
```

Open Graph images generally need an absolute URL to work on most platforms.

---

## Things I deliberately did **not** invent

I wrote no fake awards, results, dates, roster names, sponsor names, or member
roles. The mission and subteam copy is expanded from your original text;
everything factual is either real or visibly marked as a placeholder.
