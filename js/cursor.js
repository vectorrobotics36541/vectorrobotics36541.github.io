/* ============================================================
   cursor.js — the cursor as a vector.

   A precise head that tracks the pointer exactly, a lagging
   tail that eases behind it, and the arrow drawn between them.
   The gap between head and tail *is* the velocity vector, so
   the readout beside it prints real magnitude and direction.

   Pointer devices only. Touch, coarse pointers and
   prefers-reduced-motion all fall back to the native cursor.
   ============================================================ */

const HOVERABLE = 'a, button, [data-cursor], summary, input, textarea, select, label';

export function initCursor(){
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if(!fine.matches) return null;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- elements ---- */
  const root = document.createElement('div');
  root.className = 'cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="cursor-shaft"></div>
    <div class="cursor-ring"></div>
    <div class="cursor-dot"></div>
    <div class="cursor-readout"></div>
    <div class="cursor-label"></div>
  `;
  document.body.appendChild(root);
  document.body.classList.add('has-custom-cursor');

  const shaft   = root.querySelector('.cursor-shaft');
  const ring    = root.querySelector('.cursor-ring');
  const dot     = root.querySelector('.cursor-dot');
  const readout = root.querySelector('.cursor-readout');
  const label   = root.querySelector('.cursor-label');

  /* ---- state ---- */
  let px = window.innerWidth / 2, py = window.innerHeight / 2;   // pointer
  let rx = px, ry = py;                                          // ring (lagging)
  let ready = false;
  let stillTimer = 0;
  let raf = 0;

  /* ---- pointer tracking ---- */
  function onMove(e){
    px = e.clientX;
    py = e.clientY;
    if(!ready){
      ready = true;
      rx = px; ry = py;
      root.classList.add('is-ready');
    }
    root.classList.add('is-moving');
    clearTimeout(stillTimer);
    stillTimer = setTimeout(() => root.classList.remove('is-moving'), 340);
  }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup',   () => root.classList.remove('is-down'));
  document.addEventListener('pointerleave', () => root.classList.add('is-out'));
  document.addEventListener('pointerenter', () => root.classList.remove('is-out'));
  window.addEventListener('blur', () => root.classList.add('is-out'));

  /* ---- hover / label / grab states ---- */
  function applyTarget(el){
    if(!el){
      root.classList.remove('is-hover', 'is-labelled', 'is-grab');
      return;
    }
    const mode = el.getAttribute('data-cursor') || '';
    root.classList.add('is-hover');
    root.classList.toggle('is-grab', mode === 'grab');

    if(mode.startsWith('label:')){
      label.textContent = mode.slice(6);
      root.classList.add('is-labelled');
    }else{
      root.classList.remove('is-labelled');
    }
  }

  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    applyTarget(t instanceof Element ? t.closest(HOVERABLE) : null);
  }, { passive: true });

  document.addEventListener('pointerout', (e) => {
    const t = e.relatedTarget;
    applyTarget(t instanceof Element ? t.closest(HOVERABLE) : null);
  }, { passive: true });

  /* ---- render loop ---- */
  function frame(){
    raf = requestAnimationFrame(frame);

    // the tail eases toward the head; that lag is the vector
    const ease = reduce ? 1 : 0.19;
    rx += (px - rx) * ease;
    ry += (py - ry) * ease;

    const dx = px - rx, dy = py - ry;
    const mag = Math.hypot(dx, dy);

    dot.style.transform  = `translate3d(${px}px, ${py}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    readout.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    label.style.transform   = `translate3d(${px}px, ${py}px, 0)`;

    // arrow shaft from tail to head
    if(mag > 3){
      const deg = Math.atan2(dy, dx) * 180 / Math.PI;
      shaft.style.opacity = String(Math.min(mag / 46, 0.85));
      shaft.style.width = `${mag}px`;
      shaft.style.transform = `translate3d(${rx}px, ${ry}px, 0) rotate(${deg}deg)`;
    }else{
      shaft.style.opacity = '0';
    }

    // live magnitude / direction, in the same language as the team name
    if(root.classList.contains('is-moving')){
      let theta = Math.atan2(-dy, dx) * 180 / Math.PI;
      if(theta < 0) theta += 360;
      readout.textContent = `|v| ${String(Math.round(mag)).padStart(3,'0')}  θ ${String(Math.round(theta)).padStart(3,'0')}°`;
    }
  }
  raf = requestAnimationFrame(frame);

  /* ---- fall back to the native cursor if the device changes ---- */
  const onChange = (e) => {
    if(!e.matches){
      cancelAnimationFrame(raf);
      root.remove();
      document.body.classList.remove('has-custom-cursor');
    }
  };
  fine.addEventListener?.('change', onChange);

  return {
    destroy(){
      cancelAnimationFrame(raf);
      root.remove();
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', onMove);
    }
  };
}

/* ============================================================
   Magnetic elements — buttons lean toward the cursor.
   Opt in with data-magnetic on any element.
   ============================================================ */
export function initMagnetic(){
  if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const pull = parseFloat(el.getAttribute('data-magnetic')) || 0.3;
    let frame = 0;

    function move(e){
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`;
      });
    }
    function reset(){
      cancelAnimationFrame(frame);
      el.style.transform = '';
    }

    el.addEventListener('pointerenter', () => el.style.transition = 'transform .12s linear');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .45s cubic-bezier(.22,1,.36,1)';
      reset();
    });
  });
}
