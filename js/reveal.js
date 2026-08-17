/* ============================================================
   reveal.js — entrance choreography.

   Everything here is IntersectionObserver-driven, so nothing
   runs on the scroll thread. Under prefers-reduced-motion the
   observers still fire, but the CSS collapses to zero duration
   and content simply appears.
   ============================================================ */

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   Staggered reveals for anything marked [data-reveal].
   data-stagger on a parent cascades its children.
   ------------------------------------------------------------ */
export function initReveals(){
  const items = document.querySelectorAll('[data-reveal]');
  if(!items.length) return;

  items.forEach((el) => {
    const group = el.closest('[data-stagger]');
    if(!group) return;
    const step = parseInt(group.getAttribute('data-stagger'), 10) || 80;
    const sibs = Array.from(group.querySelectorAll('[data-reveal]'));
    el.style.setProperty('--reveal-delay', `${sibs.indexOf(el) * step}ms`);
  });

  const io = new IntersectionObserver((entries) => {
    for(const entry of entries){
      if(!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
    // threshold 0 rather than a ratio: intersectionRatio is relative to
    // element size, so a tall element can never reach a ratio like 0.1
    // and would silently never reveal. The rootMargin does the gating.
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

  items.forEach(el => io.observe(el));
}

/* ------------------------------------------------------------
   Headline reveal, per line.

   Each line is wrapped in a clipping mask and its contents slide
   up out of it. Deliberately per-line rather than per-character:
   one transform per line instead of dozens, and no way to leave
   a headline as scattered fragments if timing slips.
   ------------------------------------------------------------ */
export function initSplitText(){
  document.querySelectorAll('[data-split]').forEach((el) => {
    const lines = Array.from(el.querySelectorAll('[data-line]'));
    const targets = lines.length ? lines : [el];
    const full = el.textContent.replace(/\s+/g, ' ').trim();

    targets.forEach((line, i) => {
      const mask = document.createElement('span');
      mask.className = 'line-mask';
      const inner = document.createElement('span');
      inner.className = 'line-inner';
      inner.style.setProperty('--line-delay', `${i * 120}ms`);

      while(line.firstChild) inner.appendChild(line.firstChild);
      mask.appendChild(inner);
      line.appendChild(mask);
    });

    // don't clobber an aria-label the markup already supplies —
    // joined line text ("VectorRobotics") reads worse than the author's
    if(!el.hasAttribute('aria-label')) el.setAttribute('aria-label', full);
  });
}

/** Trigger a split-text element. */
export function lightUp(selector){
  document.querySelectorAll(selector).forEach(el => el.classList.add('is-lit'));
}

/* ------------------------------------------------------------
   Count-up numbers for [data-count].
   ------------------------------------------------------------ */
export function initCounters(){
  const nodes = document.querySelectorAll('[data-count]');
  if(!nodes.length) return;

  const io = new IntersectionObserver((entries) => {
    for(const entry of entries){
      if(!entry.isIntersecting) continue;
      const el = entry.target;
      io.unobserve(el);

      const raw = el.getAttribute('data-count') || '';
      const target = parseFloat(raw);
      const pad = raw.replace('-', '').length;

      if(REDUCE || !Number.isFinite(target)){
        el.textContent = raw;
        continue;
      }

      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);   // easeOutExpo
        el.textContent = String(Math.round(target * e)).padStart(pad, '0');
        if(p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.5 });

  nodes.forEach(el => io.observe(el));
}

/* ------------------------------------------------------------
   Timeline nodes light while their entry holds the middle of the
   viewport, so the lit node tracks the filling spine.
   ------------------------------------------------------------ */
export function initTimeline(){
  const items = document.querySelectorAll('.tl-item');
  if(!items.length) return;

  const io = new IntersectionObserver((entries) => {
    for(const entry of entries){
      entry.target.classList.toggle('is-in', entry.isIntersecting);
    }
  }, { rootMargin: '-25% 0px -35% 0px' });

  items.forEach(el => io.observe(el));
}
