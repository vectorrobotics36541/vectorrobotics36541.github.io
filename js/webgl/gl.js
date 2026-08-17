/* ============================================================
   gl.js — small WebGL1 helpers: context, shaders, buffers,
   DPR-aware resizing. Shared by the hero field and the robot.
   ============================================================ */

/** Get a WebGL1 context, or null if unsupported/blocked. */
export function getContext(canvas, opts = {}){
  const attrs = {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
    ...opts
  };
  try{
    return canvas.getContext('webgl', attrs) ||
           canvas.getContext('experimental-webgl', attrs);
  }catch{
    return null;
  }
}

function compile(gl, type, src){
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return sh;
}

/**
 * Build a program and pre-resolve every attribute and uniform
 * so draw loops never call getUniformLocation.
 */
export function createProgram(gl, vsSrc, fsSrc){
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link failed: ${log}`);
  }

  const attribs = {};
  const nAttr = gl.getProgramParameter(prog, gl.ACTIVE_ATTRIBUTES);
  for(let i=0;i<nAttr;i++){
    const { name } = gl.getActiveAttrib(prog, i);
    attribs[name] = gl.getAttribLocation(prog, name);
  }

  const uniforms = {};
  const nUni = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for(let i=0;i<nUni;i++){
    const { name } = gl.getActiveUniform(prog, i);
    const clean = name.replace(/\[0\]$/, '');
    uniforms[clean] = gl.getUniformLocation(prog, name);
  }

  return { program: prog, attribs, uniforms };
}

/** Upload a Float32Array as a static ARRAY_BUFFER. */
export function createBuffer(gl, data, usage){
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
  return buf;
}

/** Bind a buffer to an attribute slot. */
export function bindAttrib(gl, buffer, loc, size, stride = 0, offset = 0){
  if(loc === undefined || loc < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
}

/**
 * Resize the drawing buffer to match CSS size × DPR.
 * DPR is capped to keep large retina displays from melting.
 * Returns true when the size actually changed.
 */
export function resizeToDisplay(gl, canvas, maxDpr = 2){
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width  * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if(canvas.width !== w || canvas.height !== h){
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    return true;
  }
  return false;
}

/** Convert #rrggbb to a normalised [r,g,b] triple. */
export function hexToRgb(hex){
  const n = parseInt(hex.replace('#',''), 16);
  return [ (n>>16 & 255)/255, (n>>8 & 255)/255, (n & 255)/255 ];
}
