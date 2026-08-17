/* ============================================================
   ui.js — preloader, subteam tabs, and small page details.
   ============================================================ */

/* ------------------------------------------------------------
   Preloader.

   Deliberately short and self-cancelling: it hides on window
   load, and a hard timeout dismisses it regardless, so a slow
   or failed asset can never leave a visitor staring at a
   blank screen.
   ------------------------------------------------------------ */
export function initPreloader(onDone){
  const el = document.querySelector('.preloader');
  if(!el){ onDone?.(); return; }

  const fill = el.querySelector('.pre-fill');
  const pct  = el.querySelector('[data-pre-pct]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let done = false;
  let value = 0;

  function set(v){
    value = Math.min(100, v);
    if(fill) fill.style.width = `${value}%`;
    if(pct)  pct.textContent = String(Math.round(value)).padStart(3, '0');
  }

  function finish(){
    if(done) return;
    done = true;
    set(100);
    clearInterval(creep);
    setTimeout(() => {
      el.classList.add('is-done');
      document.body.classList.remove('is-loading');
      onDone?.();
      setTimeout(() => el.remove(), 800);
    }, reduce ? 0 : 260);
  }

  // creep forward so the bar always feels alive
  const creep = setInterval(() => {
    if(done) return;
    set(value + Math.random() * 18 + 9);
    if(value >= 92) clearInterval(creep);
  }, 70);

  if(document.readyState === 'complete'){
    setTimeout(finish, reduce ? 0 : 200);
  }else{
    window.addEventListener('load', () => setTimeout(finish, reduce ? 0 : 180), { once: true });
  }
  // absolute backstop — never hold content behind the loader
  setTimeout(finish, 1600);
}

/* ------------------------------------------------------------
   Subteam selector, wired as a proper tablist so it works
   with a keyboard and announces correctly.
   ------------------------------------------------------------ */
export function initTeams(onChange){
  const list = document.querySelector('[data-teams]');
  if(!list) return;

  const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
  if(!tabs.length) return;

  function select(idx, focus = false){
    // each subteam owns a part of the robot; tell the scene to light it
    const part = parseInt(tabs[idx].getAttribute('data-part'), 10);
    if(onChange) onChange(Number.isFinite(part) ? part : -1);

    tabs.forEach((tab, i) => {
      const on = i === idx;
      tab.classList.toggle('is-on', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;

      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if(panel){
        panel.classList.toggle('is-on', on);
        panel.hidden = !on;
      }
    });
    if(focus) tabs[idx].focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const map = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };
      if(e.key in map){
        e.preventDefault();
        select((i + map[e.key] + tabs.length) % tabs.length, true);
      }else if(e.key === 'Home'){
        e.preventDefault(); select(0, true);
      }else if(e.key === 'End'){
        e.preventDefault(); select(tabs.length - 1, true);
      }
    });
  });

  select(0);
}

/* ------------------------------------------------------------
   Fullscreen menu for small screens.
   Closes on selection, on Escape, and whenever the viewport
   grows past the breakpoint that hides the toggle.
   ------------------------------------------------------------ */
export function initMenu(){
  const toggle = document.querySelector('.nav-toggle');
  const menu   = document.getElementById('menu');
  if(!toggle || !menu) return;

  function setOpen(open){
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-menu-open', open);
    if(open){
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
    }else{
      menu.classList.remove('is-open');
      setTimeout(() => { if(!menu.classList.contains('is-open')) menu.hidden = true; }, 620);
    }
  }

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true'){
      setOpen(false);
      toggle.focus();
    }
  });

  const wide = window.matchMedia('(min-width: 901px)');
  wide.addEventListener?.('change', (e) => { if(e.matches) setOpen(false); });
}

/** Hide the "drag to orbit" hint once the visitor has done it. */
export function initStageHint(){
  const stage = document.querySelector('[data-orbit]');
  const hint  = document.querySelector('.stage-hint');
  if(!stage || !hint) return;

  const off = () => hint.classList.add('is-off');
  stage.addEventListener('robot:interacted', off, { once: true });
  setTimeout(off, 12000);
}

/** Current year in the footer. */
export function initYear(){
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}
