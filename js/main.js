/* ============================================================
   main.js — entry point.

   Loaded as a module, so it defers by default. Every subsystem
   is optional: if WebGL is missing or a shader fails, the page
   still renders completely — just without the 3D.
   ============================================================ */

import { initCursor, initMagnetic } from './cursor.js';
import { initReveals, initSplitText, lightUp, initCounters, initTimeline } from './reveal.js';
import { initScroll } from './scroll.js';
import { initPreloader, initTeams, initMenu, initStageHint, initYear } from './ui.js';

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* the scene may not exist yet when the tabs first fire, so route
   highlight requests through a holder rather than binding directly */
let scene = null;
const setHighlight = (part) => scene?.setHighlight(part);

initSplitText();

initYear();
initTeams(setHighlight);
initMenu();
initReveals();
initCounters();
initTimeline();
initScroll();
initStageHint();
initCursor();
initMagnetic();

initPreloader(() => {
  requestAnimationFrame(() => lightUp('[data-split]'));
});

/* ------------------------------------------------------------
   The persistent 3D scene, loaded lazily so it never blocks paint.
   ------------------------------------------------------------ */
async function initGL(){
  const canvas = document.getElementById('scene');
  if(!canvas) return;

  const probe = document.createElement('canvas');
  const supported = !!(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
  if(!supported){
    document.documentElement.classList.add('no-webgl');
    return;
  }

  try{
    const { initScene } = await import('./webgl/scene.js');
    scene = initScene(canvas, {
      reduceMotion: REDUCE,
      calloutHost: document.querySelector('[data-callouts]')
    });
    if(!scene){
      document.documentElement.classList.add('no-webgl');
      return;
    }
    // apply whatever subteam is already selected
    const active = document.querySelector('[data-teams] [aria-selected="true"]');
    const part = active && parseInt(active.getAttribute('data-part'), 10);
    if(Number.isFinite(part)) scene.setHighlight(part);
  }catch(err){
    console.warn('[vector] 3D scene unavailable:', err);
    document.documentElement.classList.add('no-webgl');
  }
}

initGL();
