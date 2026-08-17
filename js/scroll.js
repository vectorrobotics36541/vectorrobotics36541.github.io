/* ============================================================
   scroll.js — one passive scroll listener, one rAF tick.

   Everything scroll-linked (progress bar, sticky nav, section
   rail, timeline spine, hero parallax) is batched into a single
   frame so we never thrash layout or stack listeners.
   ============================================================ */

export function initScroll(){
  const nav      = document.querySelector('.nav');
  const progress = document.querySelector('.progress');
  const heroBody = document.querySelector('[data-parallax]');
  const timeline = document.querySelector('.timeline');
  const spine    = document.querySelector('.timeline .spine');

  const railLinks = Array.from(document.querySelectorAll('.rail a'));
  const navLinks  = Array.from(document.querySelectorAll('.nav-links a'));

  // resolve each rail/nav link to its section once
  const sections = railLinks
    .map(a => ({ link: a, el: document.querySelector(a.getAttribute('href')) }))
    .filter(s => s.el);

  let ticking = false;
  let lastActive = null;

  function read(){
    ticking = false;

    const y = window.scrollY;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;

    /* ---- progress bar ---- */
    if(progress){
      const p = docH > 0 ? Math.min(y / docH, 1) : 0;
      progress.style.transform = `scaleX(${p})`;
    }

    /* ---- nav condenses once you leave the hero ---- */
    if(nav) nav.classList.toggle('is-stuck', y > 40);

    /* ---- hero content drifts slower than the scroll ---- */
    if(heroBody && y < vh){
      heroBody.style.transform = `translate3d(0, ${y * 0.16}px, 0)`;
      heroBody.style.opacity = String(Math.max(0, 1 - y / (vh * 0.72)));
    }

    /* ---- the timeline spine fills as you pass through it ---- */
    if(spine && timeline){
      const r = timeline.getBoundingClientRect();
      // measured against a line ~62% down the viewport, so the fill
      // tracks a little ahead of the entry you are reading
      const passed = Math.min(Math.max(vh * 0.62 - r.top, 0), r.height);
      spine.style.height = `${passed}px`;
    }

    /* ---- which section owns the viewport right now ---- */
    let active = null;
    for(const s of sections){
      const r = s.el.getBoundingClientRect();
      if(r.top <= vh * 0.42 && r.bottom >= vh * 0.32){ active = s; break; }
      if(r.top <= vh * 0.42) active = s;
    }
    if(active && active !== lastActive){
      lastActive = active;
      const id = active.el.id;
      railLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
    }
  }

  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(read);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  read();
}
