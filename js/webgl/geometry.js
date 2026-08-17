/* ============================================================
   geometry.js — the robot, generated as line segments.

   No model file and no loader: the whole machine is described
   in code. Every segment carries the part it belongs to and
   that part's centroid, which is what lets the scene explode
   the assembly outward and highlight one subsystem at a time.
   ============================================================ */

import { hexToRgb } from './gl.js';

export const PART = {
  GROUND: 0,
  CHASSIS: 1,
  DRIVE: 2,
  ELECTRONICS: 3,
  LIFT: 4,
  ARM: 5,
  GRIPPER: 6,
  INTAKE: 7
};

const CYAN  = hexToRgb('#5cc8ff');
const LIME  = hexToRgb('#c6ff3d');
const STEEL = hexToRgb('#2d5c99');
const DIM   = hexToRgb('#16324f');

class Wire{
  constructor(){
    this.pos = []; this.col = []; this.ord = [];
    this.part = []; this.orig = [];
    this._part = 0; this._origin = [0,0,0];
  }

  /** Everything pushed after this belongs to `part`, exploding from `origin`. */
  group(part, origin){
    this._part = part;
    this._origin = origin;
    return this;
  }

  seg(a, b, c, order){
    const [ox,oy,oz] = this._origin;
    this.pos.push(a[0],a[1],a[2], b[0],b[1],b[2]);
    this.col.push(c[0],c[1],c[2], c[0],c[1],c[2]);
    this.ord.push(order, order);
    this.part.push(this._part, this._part);
    this.orig.push(ox,oy,oz, ox,oy,oz);
  }

  box(cx, cy, cz, hx, hy, hz, c, order){
    const x0=cx-hx, x1=cx+hx, y0=cy-hy, y1=cy+hy, z0=cz-hz, z1=cz+hz;
    const p = [
      [x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],
      [x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]
    ];
    const e = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    for(const [i,j] of e) this.seg(p[i], p[j], c, order);
  }

  circle(centre, u, w, r, n, c, order){
    let prev = null;
    for(let i=0;i<=n;i++){
      const a = (i/n)*Math.PI*2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const p = [
        centre[0] + (ca*u[0] + sa*w[0]) * r,
        centre[1] + (ca*u[1] + sa*w[1]) * r,
        centre[2] + (ca*u[2] + sa*w[2]) * r
      ];
      if(prev) this.seg(prev, p, c, order);
      prev = p;
    }
  }
}

/** Mecanum wheel: twin rims, hub, and the 45° roller pattern. */
function wheel(W, x, z, side, order){
  const R = 1.62, y = R, w = 0.46;
  const U = [0,1,0], V = [0,0,1];
  W.circle([x - w, y, z], U, V, R, 26, CYAN, order);
  W.circle([x + w, y, z], U, V, R, 26, CYAN, order);
  W.circle([x, y, z], U, V, R*0.32, 12, STEEL, order);

  for(let i=0;i<12;i++){
    const a = (i/12)*Math.PI*2;
    const c0 = Math.cos(a)*R, s0 = Math.sin(a)*R;
    const a2 = a + side*0.44;
    const c1 = Math.cos(a2)*R, s1 = Math.sin(a2)*R;
    W.seg([x - w, y + c0, z + s0], [x + w, y + c1, z + s1], LIME, order);
    W.seg([x, y + c0*0.32, z + s0*0.32], [x, y + c0, z + s0], STEEL, order);
  }
}

export function buildRobot(){
  const W = new Wire();
  const CY = 2.8;                       // chassis centre height
  const TY0 = CY + 1.2, TY1 = 12.8;     // lift tower span
  const TZ = -3.6;                      // tower depth
  const AY = 9.6;                       // arm height

  /* ---- ground reference plane ---- */
  W.group(PART.GROUND, [0,0,0]);
  const G = 7, step = 1.9;
  for(let i=-G;i<=G;i++){
    const t = i*step;
    W.seg([-G*step, 0, t], [G*step, 0, t], DIM, 0);
    W.seg([t, 0, -G*step], [t, 0, G*step], DIM, 0);
  }

  /* ---- chassis ---- */
  W.group(PART.CHASSIS, [0, CY, 0]);
  W.box(0, CY, 0, 4.7, 1.2, 4.7, CYAN, 0.12);
  W.seg([-4.7, CY+1.2, -4.7], [4.7, CY+1.2, 4.7], STEEL, 0.18);
  W.seg([ 4.7, CY+1.2, -4.7], [-4.7, CY+1.2, 4.7], STEEL, 0.18);
  W.seg([-4.7, CY, -4.7], [-4.7, CY, 4.7], LIME, 0.2);
  W.seg([ 4.7, CY, -4.7], [ 4.7, CY, 4.7], LIME, 0.2);
  for(let i=-1;i<=1;i++){
    W.seg([-4.7, CY-1.2, i*2.6], [4.7, CY-1.2, i*2.6], STEEL, 0.22);
  }

  /* ---- drivetrain: each wheel explodes along its own corner ---- */
  W.group(PART.DRIVE, [-5.2, 1.6, -3.2]); wheel(W, -5.2, -3.2, +1, 0.28);
  W.group(PART.DRIVE, [ 5.2, 1.6, -3.2]); wheel(W,  5.2, -3.2, -1, 0.32);
  W.group(PART.DRIVE, [-5.2, 1.6,  3.2]); wheel(W, -5.2,  3.2, -1, 0.36);
  W.group(PART.DRIVE, [ 5.2, 1.6,  3.2]); wheel(W,  5.2,  3.2, +1, 0.40);

  /* ---- electronics bay ---- */
  W.group(PART.ELECTRONICS, [-2.3, CY+2.0, -1.9]);
  W.box(-2.3, CY+1.85, -1.9, 1.95, 0.62, 1.45, CYAN, 0.48);
  W.box( 2.2, CY+1.7,  -2.0, 1.35, 0.48, 1.15, STEEL, 0.5);
  for(let i=0;i<4;i++){
    const x = -3.6 + i*0.85;
    W.seg([x, CY+2.47, -1.9], [x, CY+3.1, -1.9], LIME, 0.52);
  }

  /* ---- lift tower ---- */
  W.group(PART.LIFT, [0, (TY0+TY1)/2, TZ]);
  for(const rx of [-2.6, 2.6]) W.box(rx, (TY0+TY1)/2, TZ, 0.36, (TY1-TY0)/2, 0.36, CYAN, 0.56);
  for(let i=0;i<5;i++){
    const y0 = TY0 + (TY1-TY0)*(i/5), y1 = TY0 + (TY1-TY0)*((i+1)/5);
    W.seg([-2.6, y0, TZ], [2.6, y1, TZ], STEEL, 0.6 + i*0.012);
    W.seg([ 2.6, y0, TZ], [-2.6, y1, TZ], STEEL, 0.6 + i*0.012);
  }
  W.seg([-2.6, TY1, TZ], [2.6, TY1, TZ], LIME, 0.68);

  /* ---- carriage + arm ---- */
  W.group(PART.ARM, [0, AY, -1.0]);
  W.box(0, AY, TZ+0.15, 3.0, 0.58, 0.72, LIME, 0.72);
  W.box(0, AY, -0.4, 0.58, 0.36, 3.3, CYAN, 0.76);

  /* ---- end effector ---- */
  W.group(PART.GRIPPER, [0, AY, 3.4]);
  W.box(0, AY, 3.1, 1.55, 0.78, 0.92, CYAN, 0.82);
  const claw = [
    [[-1.55, AY-0.78, 4.0], [-2.3, AY-1.75, 4.6]],
    [[ 1.55, AY-0.78, 4.0], [ 2.3, AY-1.75, 4.6]],
    [[-2.3, AY-1.75, 4.6], [-1.95, AY-2.4, 4.15]],
    [[ 2.3, AY-1.75, 4.6], [ 1.95, AY-2.4, 4.15]]
  ];
  for(const [a,b] of claw) W.seg(a, b, LIME, 0.86);

  /* ---- intake roller ---- */
  W.group(PART.INTAKE, [0, 1.55, 5.1]);
  const IZ = 5.1, IY = 1.55, IR = 0.9;
  W.circle([-3.5, IY, IZ], [0,1,0], [0,0,1], IR, 16, LIME, 0.92);
  W.circle([ 3.5, IY, IZ], [0,1,0], [0,0,1], IR, 16, LIME, 0.92);
  for(let i=0;i<10;i++){
    const a = (i/10)*Math.PI*2;
    W.seg([-3.5, IY+Math.cos(a)*IR, IZ+Math.sin(a)*IR],
          [ 3.5, IY+Math.cos(a)*IR, IZ+Math.sin(a)*IR], STEEL, 0.94);
  }
  W.seg([-3.5, IY, IZ], [-4.6, CY, 3.5], CYAN, 0.97);
  W.seg([ 3.5, IY, IZ], [ 4.6, CY, 3.5], CYAN, 0.97);

  return {
    pos:  new Float32Array(W.pos),
    col:  new Float32Array(W.col),
    ord:  new Float32Array(W.ord),
    part: new Float32Array(W.part),
    orig: new Float32Array(W.orig),
    count: W.pos.length / 3,
    /** label anchors, keyed to the part they describe */
    anchors: [
      { pos:[0, TY1+0.7, TZ],  label:'Linear lift',  value:'2-stage', part:PART.LIFT },
      { pos:[0, AY, 4.6],      label:'End effector', value:'claw',    part:PART.GRIPPER },
      { pos:[0, IY, IZ+1.5],   label:'Intake',       value:'roller',  part:PART.INTAKE },
      { pos:[-5.2, 1.6, 3.2],  label:'Mecanum',      value:'×4',      part:PART.DRIVE },
      { pos:[-2.3, CY+3.4, -1.9], label:'Control hub', value:'REV',   part:PART.ELECTRONICS }
    ]
  };
}
