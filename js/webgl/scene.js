/* ============================================================
   scene.js — one persistent 3D scene behind the entire page.

   Rather than dropping a separate canvas into each section,
   the whole site shares a single fixed canvas. Scrolling flies
   the camera and drives the robot: it hangs in the hero, pulls
   apart into an exploded view through the robot chapter, then
   reassembles and recedes. Subsystems light up on demand.

   Two passes, both GL_LINES, depth test off:
     1. the ambient vector field (additive)
     2. the robot (premultiplied alpha, depth-faded)
   ============================================================ */

import { getContext, createProgram, createBuffer, bindAttrib, resizeToDisplay, hexToRgb } from './gl.js';
import { perspective, multiply, translation, rotationX, rotationY, transformPoint } from './m4.js';
import { buildRobot } from './geometry.js';

/* ------------------------------------------------------------ field */
const FIELD_VS = `
precision highp float;
attribute vec3 aCell;
attribute vec2 aMeta;

uniform mat4  uProj;
uniform float uTime, uAspect, uTanHalf, uCamZ, uZBack, uZSpan, uLen, uSpread, uFade;
uniform vec2  uMouse;
uniform float uPointer;

varying float vAlpha;
varying float vMix;

vec3 flow(vec3 p, float t){
  float a = sin(p.x * 0.58 + t * 0.32) + cos(p.z * 0.26 - t * 0.21);
  float b = cos(p.y * 0.54 - t * 0.27) + sin(p.x * 0.29 + t * 0.17);
  float c = sin(p.z * 0.41 + t * 0.24) + cos(p.y * 0.33 + t * 0.19);
  return normalize(vec3(a, b, c) + vec3(1e-5));
}

void main(){
  float role = aMeta.x, seed = aMeta.y;

  float t = fract(aCell.z + uTime * 0.021);
  float z = uZBack + t * uZSpan;
  float dist = uCamZ - z;
  float halfH = dist * uTanHalf * uSpread;
  vec2 cell = aCell.xy + vec2(seed - 0.5, fract(seed * 7.31) - 0.5) * 0.05;
  vec3 p = vec3(cell.x * halfH * uAspect, cell.y * halfH, z);

  // Cursor attraction, modelled on the flat original: a local pool of
  // attention rather than a field-wide pull. Two things keep it calm —
  // a tight radius, and the depth weight below, which limits the
  // response to the front layers. Letting all ~9 depth planes converge
  // on one point is what made this read as a vortex instead of a field.
  // (No backticks in here — this whole shader is a JS template literal.)
  vec2  scr  = vec2((cell.x - uMouse.x) * uAspect, cell.y - uMouse.y);
  float near = smoothstep(0.28, 0.86, t);
  float infl = uPointer * smoothstep(0.38, 0.0, length(scr)) * near;

  vec3 dir   = flow(p, uTime);
  vec3 toCur = normalize(vec3(-scr.x, -scr.y, 0.0) + vec3(1e-5));
  dir = normalize(mix(dir, toCur, infl * 0.9) + vec3(1e-6));

  float len = uLen * dist * (0.7 + 0.6 * seed) * (1.0 + 0.28 * infl);
  vec3 tip = p + dir * len;
  vec3 viewDir = normalize(vec3(0.0, 0.0, uCamZ) - p);
  vec3 cr = cross(dir, viewDir);
  float crl = length(cr);
  vec3 perp = crl > 0.001 ? cr / crl : vec3(1.0, 0.0, 0.0);

  vec3 pos;
  if      (role < 0.5) pos = p;
  else if (role < 2.5) pos = tip;
  else if (role < 3.5) pos = tip - dir * len * 0.28 + perp * len * 0.15;
  else if (role < 4.5) pos = tip;
  else                 pos = tip - dir * len * 0.28 - perp * len * 0.15;

  gl_Position = uProj * vec4(pos.x, pos.y, pos.z - uCamZ, 1.0);

  float fog   = 1.0 - smoothstep(uZSpan * 0.28, uZSpan * 1.02, dist);
  float birth = smoothstep(0.0, 0.15, t);
  float death = 1.0 - smoothstep(0.82, 1.0, t);

  // ease the field off behind the headline so type stays legible,
  // but only gently — over-damping this made it vanish entirely
  float r = length(vec2(cell.x * uAspect * 0.55, cell.y));
  float ring = mix(0.28, 1.0, smoothstep(0.08, 0.9, r));

  // most arrows sit quiet and a few carry weight; a uniform field
  // reads as noise rather than as something being measured
  float pop = 0.3 + 1.5 * seed * seed;

  // a modest lift near the cursor, not the spotlight it was before
  vAlpha = 0.62 * (1.0 + 0.70 * infl) * fog * birth * death * ring * pop * uFade;

  // a scattered minority is tinted lime regardless of the pointer, so
  // the brand reads in the field and the cursor isn't the only hot spot
  vMix   = max(smoothstep(0.86, 1.0, seed) * 0.85, infl * 0.7);
}
`;

const FIELD_FS = `
precision mediump float;
uniform vec3 uColorA, uColorB;
varying float vAlpha;
varying float vMix;
void main(){
  vec3 c = mix(uColorA, uColorB, clamp(vMix, 0.0, 1.0));
  gl_FragColor = vec4(c * vAlpha, vAlpha);
}
`;

/* ------------------------------------------------------------ robot */
const ROBOT_VS = `
precision highp float;
attribute vec3  aPos, aCol, aOrig;
attribute float aOrd, aPart;

uniform mat4  uMVP;
uniform float uBuild, uExplode, uHighlight, uCamDist, uGhost, uHlMix;
uniform vec3  uFlash;

varying vec3  vCol;
varying float vAlpha;

void main(){
  float edge = uBuild - aOrd;
  if(edge < 0.0){ gl_Position = vec4(2.0,2.0,2.0,1.0); vCol = aCol; vAlpha = 0.0; return; }

  vec3 p = aPos;

  // parts drift outward from the assembly centre; the ground plane stays put
  if(aPart > 0.5){
    vec3 dir = aOrig - vec3(0.0, 6.2, 0.0);
    float l = length(dir);
    dir = l > 0.001 ? dir / l : vec3(0.0, 1.0, 0.0);
    p += dir * uExplode * 4.6;
  }

  vec4 clip = uMVP * vec4(p, 1.0);
  gl_Position = clip;

  float depth = clamp((clip.w - uCamDist * 0.45) / (uCamDist * 1.25), 0.0, 1.0);
  float fog   = mix(1.0, 0.22, depth);
  float flash = smoothstep(0.10, 0.0, edge);

  // Subsystem spotlight. uHlMix scopes it to the team chapter — applied
  // globally it would dim the whole machine everywhere else on the page.
  float sel = 1.0;
  vec3  col = aCol;
  if(uHighlight >= 0.0 && uHlMix > 0.001){
    float on = step(abs(aPart - uHighlight), 0.5);
    sel = mix(1.0, mix(0.14, 1.0, on), uHlMix);
    col = mix(col, uFlash, on * 0.7 * uHlMix);
  }
  if(aPart < 0.5) sel *= 0.42;               // ground plane always recedes

  vCol   = mix(col, uFlash, flash);
  vAlpha = fog * sel * uGhost * (0.78 + 0.22 * flash) * smoothstep(0.0, 0.02, edge);
}
`;

const ROBOT_FS = `
precision mediump float;
varying vec3  vCol;
varying float vAlpha;
void main(){ gl_FragColor = vec4(vCol * vAlpha, vAlpha); }
`;

/* ------------------------------------------------------------ helpers */
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, t) => a + (b - a) * t;
function smoothstep(e0, e1, x){
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

const FOV = 42 * Math.PI / 180;
const CENTRE_Y = 6.2;

export function initScene(canvas, opts = {}){
  const { reduceMotion = false, calloutHost = null } = opts;

  const gl = getContext(canvas, { antialias: true, depth: false });
  if(!gl) return null;

  let fieldProg, robotProg;
  try{
    fieldProg = createProgram(gl, FIELD_VS, FIELD_FS);
    robotProg = createProgram(gl, ROBOT_VS, ROBOT_FS);
  }catch(err){
    console.warn('[scene] shader failed:', err.message);
    return null;
  }

  /* ---------------- field lattice ---------------- */
  const small = window.matchMedia('(max-width: 760px)').matches;
  const NX = small ? 14 : 22, NY = small ? 10 : 13, NZ = small ? 6 : 9;
  const arrows = NX * NY * NZ, fieldVerts = arrows * 6;
  const cells = new Float32Array(fieldVerts * 3);
  const metas = new Float32Array(fieldVerts * 2);

  let v = 0;
  for(let iz=0; iz<NZ; iz++) for(let iy=0; iy<NY; iy++) for(let ix=0; ix<NX; ix++){
    const u = NX > 1 ? (ix/(NX-1))*2 - 1 : 0;
    const w = NY > 1 ? (iy/(NY-1))*2 - 1 : 0;
    const layer = (iz + ((ix*0.37 + iy*0.19) % 1)) / NZ;
    const seed = Math.random();
    for(let r=0; r<6; r++){
      cells[v*3] = u; cells[v*3+1] = w; cells[v*3+2] = layer;
      metas[v*2] = r; metas[v*2+1] = seed;
      v++;
    }
  }
  const cellBuf = createBuffer(gl, cells);
  const metaBuf = createBuffer(gl, metas);

  /* ---------------- robot ---------------- */
  const geo = buildRobot();
  const posBuf  = createBuffer(gl, geo.pos);
  const colBuf  = createBuffer(gl, geo.col);
  const ordBuf  = createBuffer(gl, geo.ord);
  const partBuf = createBuffer(gl, geo.part);
  const origBuf = createBuffer(gl, geo.orig);

  const callouts = calloutHost ? geo.anchors.map(a => {
    const el = document.createElement('div');
    el.className = 'callout';
    el.innerHTML = `<span class="pip"></span><span class="txt">${a.label} <b>${a.value}</b></span>`;
    calloutHost.appendChild(el);
    return { ...a, el };
  }) : [];

  /* ---------------- matrices & colour ---------------- */
  const proj = new Float32Array(16), mv = new Float32Array(16);
  const tA = new Float32Array(16), tB = new Float32Array(16), mvp = new Float32Array(16);
  const clip = [0,0,0,0];
  const cyan = hexToRgb('#5cc8ff'), lime = hexToRgb('#c6ff3d');

  /* ---------------- animated state ---------------- */
  // `cur` chases `tgt` every frame, which is what keeps scroll-driven
  // changes feeling like camera moves rather than jump cuts.
  const tgt = { camDist: 46, offX: 0, offY: 0, pitch: 0.24, explode: 0, ghost: 1, field: 1, callouts: 0, hl: 0 };
  const cur = { ...tgt };

  let yaw = -0.6, build = 0, buildTarget = 0, highlight = -1, primed = false;
  let dragging = false, lastX = 0, lastY = 0, velYaw = 0, moved = false;
  let pitchUser = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let pointer = 0, pointerTarget = 0;
  let raf = 0, last = performance.now(), t0 = last, visible = true;

  /* ---------------- scroll model ---------------- */
  // Each chapter maps to a camera pose. Progress is measured from
  // element rects so it stays correct however the content reflows.
  let sections = {};
  function bindSections(){
    sections = {
      hero:  document.querySelector('.hero'),
      robot: document.querySelector('#robot'),
      team:  document.querySelector('#team'),
      tail:  document.querySelector('#journey')
    };
  }
  bindSections();

  function centreProgress(el){
    if(!el) return 0;
    const r = el.getBoundingClientRect();
    // a collapsed or display:none section has no rect; treating that as
    // "fully scrolled past" would wrongly dim the scene to its end state
    if(r.height < 1) return 0;
    return clamp01((window.innerHeight * 0.5 - r.top) / r.height);
  }

  function updateTargets(){
    const heroP  = centreProgress(sections.hero);
    const robotP = centreProgress(sections.robot);
    const teamP  = centreProgress(sections.team);
    const tailP  = centreProgress(sections.tail);

    // hero: robot sits right of the headline, far back and calm
    // robot chapter: camera closes in, assembly pulls apart
    // team chapter: reassembled, one subsystem lit
    // beyond: recedes and dims out of the way of the content
    const intoRobot = smoothstep(0.0, 0.55, robotP);
    const outRobot  = smoothstep(0.55, 1.0, robotP);
    const intoTeam  = smoothstep(0.0, 0.5, teamP);
    const intoTail  = smoothstep(0.0, 0.45, tailP);

    // Hero: the robot hangs back as a presence so the wordmark owns the
    // frame. The robot chapter is where it comes forward and opens up.
    tgt.camDist = lerp(lerp(58, 30, intoRobot), 62, Math.max(outRobot * 0.6, intoTail));
    tgt.explode = intoRobot * (1 - outRobot);
    tgt.offX    = lerp(lerp(5.2, 1.6, intoRobot), 0, intoTeam);
    tgt.offY    = lerp(1.2, 0.9, intoRobot);
    tgt.pitch   = lerp(0.34, 0.42, intoRobot) + pitchUser;
    tgt.ghost   = lerp(lerp(0.5, 1, intoRobot), 0.3, intoTail);
    tgt.field   = lerp(1, 0.10, smoothstep(0.55, 1.0, heroP));
    tgt.callouts= intoRobot * (1 - outRobot);
    // the spotlight only exists while the team chapter holds the frame
    tgt.hl      = intoTeam * (1 - smoothstep(0.72, 1.0, teamP));
  }

  /* ---------------- pointer: field attraction + drag to orbit ---------------- */
  function onMove(e){
    // the field follows a real cursor only — a touch drag shouldn't
    // light up the hero behind the finger
    if(e.pointerType !== 'touch' && e.pointerType !== 'pen'){
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      pointerTarget = 1;
    }
    if(!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if(Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    velYaw = dx * 0.006;
    yaw += velYaw;
    pitchUser = Math.max(-0.5, Math.min(0.6, pitchUser + dy * 0.003));
  }
  // bound unconditionally: gating this on a fine pointer meant the robot
  // could never be dragged on a touch screen
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', () => { pointerTarget = 0; }, { passive: true });
  window.addEventListener('blur', () => { pointerTarget = 0; });

  const stage = document.querySelector('[data-orbit]');
  if(stage){
    stage.addEventListener('pointerdown', (e) => {
      dragging = true; moved = false;
      lastX = e.clientX; lastY = e.clientY;
      stage.setPointerCapture?.(e.pointerId);
    });
    const release = (e) => {
      if(!dragging) return;
      dragging = false;
      stage.releasePointerCapture?.(e.pointerId);
      if(moved) stage.dispatchEvent(new CustomEvent('robot:interacted'));
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }

  /* ---------------- GL state ---------------- */
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  buildTarget = 1;

  /* ---------------- frame ---------------- */
  function frame(now){
    raf = requestAnimationFrame(frame);
    if(!visible) return;

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const time = (now - t0) / 1000;

    updateTargets();

    // Snap to the correct pose on the first frame. Without this the
    // camera visibly flies in from its default whenever someone lands
    // mid-page — on a reload, or following a link straight to #robot.
    if(!primed){
      Object.assign(cur, tgt);
      primed = true;
    }

    // frame-rate independent easing
    const k = 1 - Math.pow(0.008, dt);
    for(const key in tgt) cur[key] += (tgt[key] - cur[key]) * k;

    // reduced motion gets the finished machine, not the assembly reveal
    if(reduceMotion) build = buildTarget;
    else build += (buildTarget - build) * (1 - Math.pow(1e-5, dt));

    // quick enough to feel attached to the cursor, eased enough not to snap
    const kf = 1 - Math.pow(1e-7, dt);
    mouse.x += (mouse.tx - mouse.x) * kf;
    mouse.y += (mouse.ty - mouse.y) * kf;
    pointer += (pointerTarget - pointer) * (1 - Math.pow(0.02, dt));

    if(!dragging){
      velYaw *= Math.pow(0.02, dt);
      yaw += velYaw;
      if(!reduceMotion) yaw += dt * 0.1;
      pitchUser *= Math.pow(0.5, dt);
    }

    resizeToDisplay(gl, canvas, 1.75);
    const aspect = canvas.width / canvas.height || 1;
    perspective(FOV, aspect, 0.1, 400, proj);
    gl.clear(gl.COLOR_BUFFER_BIT);

    /* ---- pass 1: field (additive) ---- */
    if(cur.field > 0.01){
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(fieldProg.program);
      const { uniforms: u, attribs: a } = fieldProg;
      gl.uniformMatrix4fv(u.uProj, false, proj);
      gl.uniform1f(u.uTime, reduceMotion ? 0 : time);
      gl.uniform1f(u.uAspect, aspect);
      gl.uniform1f(u.uTanHalf, Math.tan(FOV / 2));
      gl.uniform1f(u.uCamZ, 16);
      gl.uniform1f(u.uZBack, -34);
      gl.uniform1f(u.uZSpan, 44);
      gl.uniform1f(u.uLen, 0.032);
      gl.uniform1f(u.uSpread, 1.08);
      gl.uniform1f(u.uFade, cur.field);
      gl.uniform2f(u.uMouse, mouse.x, mouse.y);
      gl.uniform1f(u.uPointer, pointer);
      gl.uniform3fv(u.uColorA, cyan);
      gl.uniform3fv(u.uColorB, lime);
      bindAttrib(gl, cellBuf, a.aCell, 3);
      bindAttrib(gl, metaBuf, a.aMeta, 2);
      gl.drawArrays(gl.LINES, 0, fieldVerts);
    }

    /* ---- pass 2: robot (premultiplied alpha) ---- */
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(robotProg.program);

    multiply(rotationY(yaw, tA), translation(0, -CENTRE_Y, 0, tB), mv);
    multiply(rotationX(cur.pitch, tA), mv, tB);
    multiply(translation(cur.offX, cur.offY, -cur.camDist, tA), tB, mv);
    multiply(proj, mv, mvp);

    const { uniforms: ru, attribs: ra } = robotProg;
    gl.uniformMatrix4fv(ru.uMVP, false, mvp);
    gl.uniform1f(ru.uBuild, build);
    gl.uniform1f(ru.uExplode, cur.explode);
    gl.uniform1f(ru.uHighlight, highlight);
    gl.uniform1f(ru.uHlMix, cur.hl);
    gl.uniform1f(ru.uCamDist, cur.camDist);
    gl.uniform1f(ru.uGhost, cur.ghost);
    gl.uniform3fv(ru.uFlash, lime);
    bindAttrib(gl, posBuf,  ra.aPos, 3);
    bindAttrib(gl, colBuf,  ra.aCol, 3);
    bindAttrib(gl, ordBuf,  ra.aOrd, 1);
    bindAttrib(gl, partBuf, ra.aPart, 1);
    bindAttrib(gl, origBuf, ra.aOrig, 3);
    gl.drawArrays(gl.LINES, 0, geo.count);

    /* ---- callouts follow their 3D anchors ---- */
    if(callouts.length){
      const show = cur.callouts > 0.55 && build > 0.97;
      const W = window.innerWidth, H = window.innerHeight;
      for(const c of callouts){
        if(!show){ c.el.classList.remove('is-on'); continue; }
        const dir = [c.pos[0], c.pos[1] - CENTRE_Y, c.pos[2]];
        const l = Math.hypot(...dir) || 1;
        const p = [
          c.pos[0] + dir[0] / l * cur.explode * 7,
          c.pos[1] + dir[1] / l * cur.explode * 7,
          c.pos[2] + dir[2] / l * cur.explode * 7
        ];
        transformPoint(mvp, p, clip);
        if(clip[3] <= 0.01){ c.el.classList.remove('is-on'); continue; }
        const px = ((clip[0] / clip[3]) * 0.5 + 0.5) * W;
        const py = (1 - ((clip[1] / clip[3]) * 0.5 + 0.5)) * H;
        c.el.style.transform = `translate(-50%,-50%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
        c.el.classList.add('is-on');
      }
    }
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); });
  window.addEventListener('resize', bindSections);
  raf = requestAnimationFrame(frame);

  return {
    /** Spotlight one PART id, or -1 to clear. */
    setHighlight(part){ highlight = typeof part === 'number' ? part : -1; },
    destroy(){
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    }
  };
}
