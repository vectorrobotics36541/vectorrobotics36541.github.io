/* ============================================================
   m4.js — minimal column-major 4x4 matrix math.
   Just the operations this site actually needs; no library.
   ============================================================ */

export function identity(out = new Float32Array(16)){
  out[0]=1; out[1]=0; out[2]=0; out[3]=0;
  out[4]=0; out[5]=1; out[6]=0; out[7]=0;
  out[8]=0; out[9]=0; out[10]=1; out[11]=0;
  out[12]=0; out[13]=0; out[14]=0; out[15]=1;
  return out;
}

/** Standard perspective projection (right-handed, looking down -Z). */
export function perspective(fovy, aspect, near, far, out = new Float32Array(16)){
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  out[0]=f/aspect; out[1]=0; out[2]=0; out[3]=0;
  out[4]=0; out[5]=f; out[6]=0; out[7]=0;
  out[8]=0; out[9]=0; out[10]=(far+near)*nf; out[11]=-1;
  out[12]=0; out[13]=0; out[14]=2*far*near*nf; out[15]=0;
  return out;
}

/** out = a * b */
export function multiply(a, b, out = new Float32Array(16)){
  const
    a00=a[0],a01=a[1],a02=a[2],a03=a[3],
    a10=a[4],a11=a[5],a12=a[6],a13=a[7],
    a20=a[8],a21=a[9],a22=a[10],a23=a[11],
    a30=a[12],a31=a[13],a32=a[14],a33=a[15];

  for(let i=0;i<4;i++){
    const b0=b[i*4], b1=b[i*4+1], b2=b[i*4+2], b3=b[i*4+3];
    out[i*4]   = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[i*4+1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[i*4+2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[i*4+3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  }
  return out;
}

export function translation(x, y, z, out = new Float32Array(16)){
  identity(out);
  out[12]=x; out[13]=y; out[14]=z;
  return out;
}

export function rotationX(rad, out = new Float32Array(16)){
  const c = Math.cos(rad), s = Math.sin(rad);
  identity(out);
  out[5]=c; out[6]=s; out[9]=-s; out[10]=c;
  return out;
}

export function rotationY(rad, out = new Float32Array(16)){
  const c = Math.cos(rad), s = Math.sin(rad);
  identity(out);
  out[0]=c; out[2]=-s; out[8]=s; out[10]=c;
  return out;
}

/**
 * Project a world-space point through a matrix.
 * Returns clip-space [x, y, z, w]; divide by w for NDC.
 */
export function transformPoint(m, p, out = [0,0,0,0]){
  const [x,y,z] = p;
  out[0] = m[0]*x + m[4]*y + m[8]*z  + m[12];
  out[1] = m[1]*x + m[5]*y + m[9]*z  + m[13];
  out[2] = m[2]*x + m[6]*y + m[10]*z + m[14];
  out[3] = m[3]*x + m[7]*y + m[11]*z + m[15];
  return out;
}
