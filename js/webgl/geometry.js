/* ============================================================
   geometry.js — the robot, generated as line segments.

   No model file and no loader: the whole machine is described
   in code. Every segment carries the part it belongs to and
   that part's centroid, which is what lets the scene explode
   the assembly outward and highlight one subsystem at a time.

   The shape follows the reference CAD we're building from
   (FTC 19564's public V4 "Flower Mech" robot, Onshape): every
   dimension below is in millimetres in that model's own frame,
   and only the main silhouette is kept — no fasteners or holes.
   ============================================================ */

import { hexToRgb } from './gl.js';

/* Numeric ids are shared with index.html (`data-part` on each subteam
   tab) and with the shader, so renumbering means updating both. */
export const PART = {
  GROUND: 0,
  CHASSIS: 1,
  DRIVE: 2,
  ELECTRONICS: 3,
  TURRET: 4,
  SHOOTER: 5,
  TRANSFER: 6,
  INTAKE: 7
};

const CYAN  = hexToRgb('#5cc8ff');
const LIME  = hexToRgb('#c6ff3d');
const STEEL = hexToRgb('#2d5c99');
const DIM   = hexToRgb('#16324f');

/* CAD frame -> scene. In the CAD, +X runs from the intake (front) to the
   back, Y is across the robot and Z is up with the wheels' contact patch
   at Z = -205. The scene wants y up and the intake towards +z, centred on
   the frame. One scene unit is 48 mm, so the 18" frame is ~9.5 units —
   the scale the camera poses in scene.js were tuned for. */
const MM = 1 / 48;
const MID_X = 57.5, MID_Y = 526, FLOOR_Z = -205;
const P = (x, y, z) => [(MID_Y - y) * MM, (z - FLOOR_Z) * MM, (MID_X - x) * MM];

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

  /** Closed outline through scene-space points. */
  loop(pts, c, order){
    for(let i=0;i<pts.length;i++) this.seg(pts[i], pts[(i+1) % pts.length], c, order);
  }

  /** Axis-aligned box from two opposite CAD corners (mm). */
  box(a, b, c, order){
    const [x0,y0,z0] = P(...a), [x1,y1,z1] = P(...b);
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

/* Wheels and rollers all spin about the scene x axis (across the robot). */
const AX_U = [0,1,0], AX_V = [0,0,1];
const HORIZ_U = [1,0,0], HORIZ_V = [0,0,1];

/** Mecanum wheel: twin rims, hub, and the 45° roller pattern. */
function mecanum(W, c, R, hw, side, order){
  const [x, y, z] = c;
  W.circle([x - hw, y, z], AX_U, AX_V, R, 26, CYAN, order);
  W.circle([x + hw, y, z], AX_U, AX_V, R, 26, CYAN, order);
  W.circle([x, y, z], AX_U, AX_V, R*0.32, 12, STEEL, order);

  for(let i=0;i<12;i++){
    const a = (i/12)*Math.PI*2;
    const c0 = Math.cos(a)*R, s0 = Math.sin(a)*R;
    const a2 = a + side*0.44;
    const c1 = Math.cos(a2)*R, s1 = Math.sin(a2)*R;
    W.seg([x - hw, y + c0, z + s0], [x + hw, y + c1, z + s1], LIME, order);
    W.seg([x, y + c0*0.32, z + s0*0.32], [x, y + c0, z + s0], STEEL, order);
  }
}

/** Compliant intake wheel: a rim with swept flaps. */
function compliant(W, c, R, order){
  const [x, y, z] = c;
  W.circle(c, AX_U, AX_V, R, 18, LIME, order);
  W.circle(c, AX_U, AX_V, R*0.3, 8, STEEL, order);
  for(let i=0;i<8;i++){
    const a = (i/8)*Math.PI*2, b = a + 0.5;
    W.seg([x, y + Math.cos(a)*R*0.3, z + Math.sin(a)*R*0.3],
          [x, y + Math.cos(b)*R, z + Math.sin(b)*R], CYAN, order);
  }
}

/** A side profile (CAD X/Z pairs) extruded across Y as two outlines and ties. */
function plates(W, profile, yA, yB, c, tie, order){
  const a = profile.map(([x, z]) => P(x, yA, z));
  const b = profile.map(([x, z]) => P(x, yB, z));
  W.loop(a, c, order);
  W.loop(b, c, order + 0.02);
  if(tie) for(let i=0;i<a.length;i++) W.seg(a[i], b[i], tie, order + 0.04);
}

/* Outer side plate: flat top, long raked nose, short raked tail. */
const SIDE_PLATE = [
  [-171, 10], [25, 97], [212, 97], [286, -65], [286, -199],
  [20, -199], [-80, -172], [-160, -80], [-171, -45]
];
/* Shooter turret cheek plate: flywheel housing up front, hood rising aft. */
const TURRET_PLATE = [
  [46, 115], [46, 185], [58, 197], [140, 197], [188, 223], [209, 215], [209, 115]
];

export function buildRobot(){
  const W = new Wire();

  /* ---- ground reference plane ---- */
  W.group(PART.GROUND, [0,0,0]);
  const G = 7, step = 1.9;
  for(let i=-G;i<=G;i++){
    const t = i*step;
    W.seg([-G*step, 0, t], [G*step, 0, t], DIM, 0);
    W.seg([t, 0, -G*step], [t, 0, G*step], DIM, 0);
  }

  /* ---- chassis: twin side plates tied by six channels ---- */
  W.group(PART.CHASSIS, P(57, MID_Y, -50));
  plates(W, SIDE_PLATE, 307, 745, CYAN, null, 0.12);
  const channels = [                     // [x, z] of each channel's centre
    [-164, -15], [40, 72], [210, 72], [280, -89], [56, -193], [156, -193]
  ];
  channels.forEach(([x, z], i) => {
    const flat = z < -150;                // the two floor channels lie flat
    const hx = flat ? 24 : 6, hz = flat ? 6 : 24;
    W.box([x - hx, 314, z - hz], [x + hx, 738, z + hz], i % 2 ? STEEL : CYAN, 0.16 + i*0.01);
  });
  // deck plates the turrets sit on, and the belly pan below
  for(const [y0, y1] of [[314, 506], [546, 738]]) W.loop([
    P(34, y0, 97), P(219, y0, 97), P(219, y1, 97), P(34, y1, 97)
  ], STEEL, 0.22);
  W.loop([P(56, 369, -186), P(249, 369, -186), P(249, 683, -186), P(56, 683, -186)], STEEL, 0.23);

  /* ---- drivetrain: each wheel explodes along its own corner ---- */
  const R = 51.5 * MM, HW = 15 * MM;
  [[-19, 336, +1, 0.28], [-19, 716, -1, 0.32], [230, 336, -1, 0.36], [230, 716, +1, 0.40]]
    .forEach(([x, y, side, ord]) => {
      const c = P(x, y, -154);
      W.group(PART.DRIVE, c); mecanum(W, c, R, HW, side, ord);
    });

  /* ---- electronics: control + expansion hub on the belly pan ---- */
  W.group(PART.ELECTRONICS, P(134, MID_Y, -169));
  for(const y of [418, 634]){
    W.box([63, y - 51, -184], [205, y + 51, -154], CYAN, 0.48);
    for(let i=0;i<4;i++){
      const x = 80 + i*16;
      W.seg(P(x, y - 51, -154), P(x, y - 51, -138), LIME, 0.5);
    }
  }

  /* ---- twin turrets: slewing ring + cheek plates per side ---- */
  const TURRETS = [429, 623];
  TURRETS.forEach((yc, k) => {
    W.group(PART.TURRET, P(150, yc, 160));
    const ring = P(155, yc, 103);
    W.circle(ring, HORIZ_U, HORIZ_V, 62 * MM, 32, CYAN, 0.56 + k*0.04);
    W.circle(ring, HORIZ_U, HORIZ_V, 54 * MM, 32, STEEL, 0.57 + k*0.04);
    plates(W, TURRET_PLATE, yc - 51, yc + 51, CYAN, STEEL, 0.6 + k*0.04);
  });

  /* ---- shooters: a pair of flywheels in each turret's nose ---- */
  TURRETS.forEach((yc, k) => {
    W.group(PART.SHOOTER, P(88, yc, 152));
    const yw = yc + Math.sign(MID_Y - yc) * 15;   // wheels sit inboard of the ring
    for(const x of [76, 99]){
      const a = P(x, yw - 20, 152), b = P(x, yw + 20, 152);
      W.circle(a, AX_U, AX_V, 35 * MM, 22, LIME, 0.72 + k*0.05);
      W.circle(b, AX_U, AX_V, 35 * MM, 22, LIME, 0.73 + k*0.05);
      W.seg(P(x, yc - 51, 152), P(x, yc + 51, 152), STEEL, 0.74 + k*0.05);
    }
  });

  /* ---- transfer: second roller lifting game pieces to the turrets ---- */
  W.group(PART.TRANSFER, P(-14, MID_Y, -39));
  for(const y of [414, 464, 588, 638]) compliant(W, P(-14, y, -39), 52 * MM, 0.84);
  W.seg(P(-14, 384, -39), P(-14, 668, -39), STEEL, 0.86);

  /* ---- intake: compliant-wheel roller over a hinged scoop ---- */
  W.group(PART.INTAKE, P(-190, MID_Y, -120));
  for(const y of [415, 460, 505, 547, 592, 637]) compliant(W, P(-119, y, -89), 52 * MM, 0.9);
  W.seg(P(-119, 384, -89), P(-119, 668, -89), STEEL, 0.92);
  W.loop([P(-295, 303, -197), P(-167, 303, -176), P(-167, 749, -176), P(-295, 749, -197)], CYAN, 0.94);
  W.seg(P(-231, 303, -187), P(-231, 749, -187), STEEL, 0.95);
  for(const y of [301, 751]) W.loop([P(-292, y, -197), P(-118, y, -80), P(-100, y, -125)], CYAN, 0.97);

  return {
    pos:  new Float32Array(W.pos),
    col:  new Float32Array(W.col),
    ord:  new Float32Array(W.ord),
    part: new Float32Array(W.part),
    orig: new Float32Array(W.orig),
    count: W.pos.length / 3,
    /** label anchors, keyed to the part they describe; `orig` is that
        part's explode origin so the label travels with it */
    anchors: [
      { pos:P(190, 429, 240),   orig:P(150, 429, 160),   label:'Turret',      value:'×2',       part:PART.TURRET },
      { pos:P(70, 623, 205),    orig:P(88, 623, 152),    label:'Shooter',     value:'flywheel', part:PART.SHOOTER },
      { pos:P(-200, 526, -140), orig:P(-190, MID_Y, -120), label:'Intake',    value:'roller',   part:PART.INTAKE },
      { pos:P(-19, 336, -154),  orig:P(-19, 336, -154),  label:'Mecanum',     value:'×4',       part:PART.DRIVE },
      { pos:P(134, 418, -130),  orig:P(134, MID_Y, -169), label:'Control hub', value:'REV',     part:PART.ELECTRONICS }
    ]
  };
}
