// Builds the body meshes from a BodyShape (real-car blend sections): one lofted shell split into material
// buckets with atlas UVs, end caps, optional fender-flare sweeps, and helpers for projected surface patches.
import * as THREE from 'three';
import { BodyShape, NA, sstep } from './bodyShape';

export const ATLAS = 2048;
export const SIDE_H = 640;
export const TOP_Y0 = 1280;
export const TOP_H = 704;
export const SOLID_Y = 2016;
export const SIDE_REF_H = 1.6;
export const TOP_REF_W = 2.3;

export type Bucket = 'side' | 'top' | 'hood' | 'roof' | 'under';

export interface CapInfo { wc: number; yMin: number; yMax: number; z: number }
export interface BumperInfo { wc: number; yBot: number; yTop: number; z: number; len: number; faceA: number; faceB: number }

export interface BodyGeometry {
  shape: BodyShape;
  buckets: Partial<Record<Bucket, THREE.BufferGeometry>>;
  capF: THREE.BufferGeometry;
  capR: THREE.BufferGeometry;
  flares: THREE.BufferGeometry | null;
  frontInfo: BumperInfo;
  rearInfo: BumperInfo;
  /** greenhouse overlay with uv = (s, y) for the side windows */
  glassSide: THREE.BufferGeometry | null;
  /** greenhouse overlay with uv = (s, x) for the windshield and rear glass */
  glassTop: THREE.BufferGeometry | null;
  glassFrame: GlassFrame;
}

/** Mapping of the glass overlay uvs: u = (s - s0)/(s1 - s0); side v = (y - y0)/(y1 - y0); top v = 0.5 + x/(2 xw). */
export interface GlassFrame { s0: number; s1: number; y0: number; y1: number; xw: number }

class Builder {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  map = new Map<string, number>();
  vert(key: string, p: number[], n: number[], uv: number[]): number {
    let i = this.map.get(key);
    if (i !== undefined) return i;
    i = this.pos.length / 3;
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.uv.push(uv[0], uv[1]);
    this.map.set(key, i);
    return i;
  }
  tri(a: number, b: number, c: number) {
    const P = this.pos, N = this.nrm;
    const e1 = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]];
    const e2 = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (Math.hypot(cx, cy, cz) < 1e-10) return;
    const nx = N[a * 3] + N[b * 3] + N[c * 3], ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
    if (cx * nx + cy * ny + cz * nz < 0) this.idx.push(a, c, b); else this.idx.push(a, b, c);
  }
  quad(a: number, b: number, c: number, d: number) { this.tri(a, b, c); this.tri(a, c, d); }
  geometry(): THREE.BufferGeometry | null {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    return g;
  }
}

const norm = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function sideUV(s: number, y: number, right: boolean): number[] {
  const u = right ? 1 - s : s;
  const py = (right ? SIDE_H : 0) + (1 - Math.min(1, Math.max(0, y / SIDE_REF_H))) * SIDE_H;
  return [u, 1 - py / ATLAS];
}
export function topUV(s: number, x: number): number[] {
  const py = TOP_Y0 + (0.5 - x / TOP_REF_W) * TOP_H;
  return [s, 1 - py / ATLAS];
}
const SOLID_UV = [0.5, 1 - SOLID_Y / ATLAS];

function gridNormal(P: number[][][], i: number, j: number, hint: number[]): number[] {
  const ni = P.length, nj = P[0].length;
  const ta = sub(P[Math.min(ni - 1, i + 1)][j], P[Math.max(0, i - 1)][j]);
  let tb = sub(P[i][Math.min(nj - 1, j + 1)], P[i][Math.max(0, j - 1)]);
  if (Math.hypot(tb[0], tb[1], tb[2]) < 1e-7) tb = [0, 1, 0];
  let n = cross(ta, tb);
  if (Math.hypot(n[0], n[1], n[2]) < 1e-10) n = hint.slice();
  n = norm(n);
  if (dot(n, hint) < 0) n = [-n[0], -n[1], -n[2]];
  return n;
}

export function buildBodyGeometry(shape: BodyShape): BodyGeometry {
  const sh = shape.sh;
  const B: Record<Bucket, Builder> = { side: new Builder(), top: new Builder(), hood: new Builder(), roof: new Builder(), under: new Builder() };
  const S = shape.stations();
  const grid = S.map((s) => shape.section(s));
  const infos = S.map((s) => shape.info(s));
  const ni = S.length;
  const bucketFor = (s: number, j: number, inf: { shoulder: number; belt: number; edge: number }, yMid: number, xMid: number, ny = 0): Bucket => {
    if (j <= 1 && yMid < shape.base + 0.08 && xMid < shape.w0 * 0.75) return 'under';
    // wheel-well ceiling (points lifted onto the arch tunnel) stays dark
    if (j < inf.shoulder) { const at = shape.archTop(shape.z(s)); if (at > -Infinity && yMid < at + 0.004 && xMid > shape.w0 - 0.4) return 'under'; }
    const cabin = s > sh.wsBase && s < sh.rearGlassBase;
    if (!cabin) {
      // upward-facing panels use the top projection even below the detected shoulder (sloped noses, wings)
      if (j <= inf.shoulder && ny < 0.7) return 'side';
      return s >= shape.hoodStart && s < sh.wsBase ? 'hood' : 'top';
    }
    if (j < inf.edge) return 'side';
    return s >= sh.roofStart && s <= sh.roofEnd ? 'roof' : 'top';
  };

  // outward hint from the section contour (bottom centre → side → top centre runs counter-clockwise in x/y),
  // so folded areas such as wheel-well ceilings and wings over the tyres keep consistent normals
  const normals = grid.map((row, i) => row.map((_p0, j) => {
    const a = row[Math.max(0, j - 1)], b = row[Math.min(NA - 1, j + 1)];
    let hint = [b[1] - a[1], -(b[0] - a[0]), 0];
    if (Math.hypot(hint[0], hint[1]) < 1e-6) hint = j < NA / 2 ? [0, -1, 0] : [0, 1, 0];
    return gridNormal(grid, i, j, hint);
  }));

  for (let i = 0; i < ni - 1; i++) {
    const sMid = (S[i] + S[i + 1]) / 2;
    const inf = infos[i + (S[i + 1] - sMid < sMid - S[i] ? 1 : 0)];
    for (let j = 0; j < NA - 1; j++) {
      const pA = grid[i][j], pB = grid[i + 1][j + 1];
      const ny = (normals[i][j][1] + normals[i + 1][j][1] + normals[i][j + 1][1] + normals[i + 1][j + 1][1]) / 4;
      const b = bucketFor(sMid, j, inf, (pA[1] + pB[1]) / 2, (pA[0] + pB[0]) / 2, ny);
      const bl = B[b];
      for (const right of [false, true]) {
        const ids: number[] = [];
        for (const [ii, jj] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]) {
          const p0 = grid[ii][jj];
          const n0 = normals[ii][jj];
          const p = right ? [-p0[0], p0[1], p0[2]] : p0;
          const n = right ? [-n0[0], n0[1], n0[2]] : n0;
          const uv = b === 'side' ? sideUV(S[ii], p0[1], right) : b === 'top' || b === 'hood' || b === 'roof' ? topUV(S[ii], right ? -p0[0] : p0[0]) : SOLID_UV;
          ids.push(bl.vert(`${ii}_${jj}_${right ? 1 : 0}`, p, n, uv));
        }
        bl.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
  }

  // ---- glass overlays: thin shells over the greenhouse whose masks (drawn in glass.ts) define the openings
  const gs0 = sh.wsBase - 0.02, gs1 = sh.rearGlassBase + 0.02;
  let gy0 = Infinity;
  for (let i = 0; i < ni; i++) if (S[i] >= gs0 && S[i] <= gs1) gy0 = Math.min(gy0, grid[i][infos[i].belt][1]);
  gy0 -= 0.12;
  const gy1 = shape.H + 0.03;
  const glassFrame: GlassFrame = { s0: gs0, s1: gs1, y0: gy0, y1: gy1, xw: shape.w0 + 0.05 };
  const gSide = new Builder(), gTop = new Builder();
  for (let i = 0; i < ni - 1; i++) {
    if (S[i + 1] < gs0 || S[i] > gs1) continue;
    const inf = infos[i];
    for (let j = 0; j < NA - 1; j++) {
      const side = j >= Math.max(1, inf.belt - 3) && j <= Math.min(NA - 2, inf.edge + 1);
      const top = j >= inf.edge - 1;
      for (const [bl, isTop] of [[gSide, false], [gTop, true]] as const) {
        if (isTop ? !top : !side) continue;
        for (const right of [false, true]) {
          const ids: number[] = [];
          for (const [ii, jj] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]) {
            const p0 = grid[ii][jj], n0 = normals[ii][jj];
            const q = [p0[0] + n0[0] * 0.003, p0[1] + n0[1] * 0.003, p0[2] + n0[2] * 0.003];
            const p = right ? [-q[0], q[1], q[2]] : q;
            const n = right ? [-n0[0], n0[1], n0[2]] : n0;
            const u = (S[ii] - gs0) / (gs1 - gs0);
            const uv = isTop ? [u, 0.5 + p[0] / (2 * glassFrame.xw)] : [u, (p0[1] - gy0) / (gy1 - gy0)];
            ids.push(bl.vert(`${ii}_${jj}_${right ? 1 : 0}`, p, n, uv));
          }
          bl.quad(ids[0], ids[1], ids[2], ids[3]);
        }
      }
    }
  }
  const buckets: Partial<Record<Bucket, THREE.BufferGeometry>> = {};
  for (const k of Object.keys(B) as Bucket[]) { const g = B[k].geometry(); if (g) buckets[k] = g; }

  const cap = (sec: number[][], front: boolean): THREE.BufferGeometry => {
    const ring: number[][] = [];
    for (let j = 0; j < NA; j++) ring.push(sec[j]);
    for (let j = NA - 2; j >= 1; j--) ring.push([-sec[j][0], sec[j][1], sec[j][2]]);
    let cy = 0, cz = 0;
    for (const p of ring) { cy += p[1]; cz += p[2]; }
    cy /= ring.length; cz /= ring.length;
    const bl = new Builder();
    const nz = front ? 1 : -1;
    const c = bl.vert('c', [0, cy, cz - nz * 0.03], [0, 0, nz], SOLID_UV); // slightly concave so end decals stay in front
    const ids = ring.map((p, k) => bl.vert(`r${k}`, p, [0, 0, nz], SOLID_UV));
    for (let k = 0; k < ids.length; k++) bl.tri(c, ids[k], ids[(k + 1) % ids.length]);
    return bl.geometry()!;
  };
  const capF = cap(grid[0], true);
  const capR = cap(grid[ni - 1], false);

  // ---- fender flares (kits)
  const fl = new Builder();
  for (const [za, F] of [[shape.zFA, shape.flareF], [shape.zRA, shape.flareR]] as const) {
    if (F < 0.005) continue;
    const Ra = shape.archR + F * 0.4;
    const ySill = shape.base + 0.05;
    const phi0 = Math.asin(Math.max(-0.95, Math.min(0.2, (ySill - shape.wheelY) / Ra)));
    const phi1 = Math.PI - phi0;
    const NP = 30;
    const band = 0.1 + F * 1.3;
    const prof: [number, number][] = [[band, -0.004], [band * 0.6, F * 0.5], [0.035, F * 0.92], [0.01, F], [0, F - 0.006], [-0.014, F - 0.032]];
    const P: number[][][] = [];
    for (let a = 0; a <= NP; a++) {
      const phi = phi0 + ((phi1 - phi0) * a) / NP;
      const fade = sstep(phi0, phi0 + 0.3, phi) * (1 - sstep(phi1 - 0.3, phi1, phi)) * 0.7 + 0.3;
      const zTop = za + Ra * Math.cos(phi);
      const sTop = shape.sOf(zTop);
      const avail = Math.sin(phi) > 0.05 ? (shape.shoulderPoint(sTop)[1] - 0.03 - shape.wheelY) / Math.sin(phi) - Ra : band;
      const scale = Math.max(0.25, Math.min(1, avail / band));
      P.push(prof.map(([rho0, dx]) => {
        const rho = rho0 > 0 ? rho0 * scale : rho0;
        const r = Ra + rho;
        const z = za + r * Math.cos(phi);
        const y = shape.wheelY + r * Math.sin(phi);
        const s = shape.sOf(z);
        return [shape.halfWidth(s) - 0.01 + dx * fade, y, z];
      }));
    }
    for (let a = 0; a < NP; a++) for (let j = 0; j < prof.length - 1; j++) for (const right of [false, true]) {
      const ids: number[] = [];
      for (const [aa, jj] of [[a, j], [a + 1, j], [a + 1, j + 1], [a, j + 1]]) {
        const p0 = P[aa][jj];
        const n0 = gridNormal(P, aa, jj, [1, 0, 0]);
        const p = right ? [-p0[0], p0[1], p0[2]] : p0;
        const n = right ? [-n0[0], n0[1], n0[2]] : n0;
        ids.push(fl.vert(`F${za}_${aa}_${jj}_${right}`, p, n, sideUV(shape.sOf(p0[2]), p0[1], right)));
      }
      fl.quad(ids[0], ids[1], ids[2], ids[3]);
    }
  }

  const F = shape.face(true), R = shape.face(false);
  const fw = F.halfW(F.yBot + 0.08, 0.25), rw = R.halfW(R.yBot + 0.1, 0.3);
  const frontInfo: BumperInfo = { wc: fw * 0.9, yBot: F.yBot, yTop: F.yTop - 0.2, z: shape.zF, len: fw * 2, faceA: 0, faceB: fw * 2 };
  const rearInfo: BumperInfo = { wc: rw * 0.85, yBot: R.yBot, yTop: R.yTop - 0.36, z: shape.zR, len: rw * 2, faceA: 0, faceB: rw * 2 };
  return { shape, buckets, capF, capR, flares: fl.geometry(), frontInfo, rearInfo, glassSide: gSide.geometry(), glassTop: gTop.geometry(), glassFrame };
}

/** Surface patch; `fn(u, v)` returns a point; normals computed numerically and flipped toward `hint`. */
export function surfacePatch(fn: (u: number, v: number) => number[], nu: number, nv: number, offset: number, hint: number[], flipU = false, keep?: (a: number, b: number) => boolean, maxEdge = Infinity): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  const eps = 1e-3;
  for (let a = 0; a <= nu; a++) {
    for (let b = 0; b <= nv; b++) {
      const u = a / nu, v = b / nv;
      const pu1 = fn(Math.min(1, u + eps), v), pu0 = fn(Math.max(0, u - eps), v);
      const pv1 = fn(u, Math.min(1, v + eps)), pv0 = fn(u, Math.max(0, v - eps));
      let n = norm(cross(sub(pu1, pu0), sub(pv1, pv0)));
      if (!isFinite(n[0]) || Math.hypot(n[0], n[1], n[2]) < 0.5) n = norm(hint);
      if (dot(n, hint) < 0) n = [-n[0], -n[1], -n[2]];
      const p = fn(u, v);
      pos.push(p[0] + n[0] * offset, p[1] + n[1] * offset, p[2] + n[2] * offset);
      nrm.push(n[0], n[1], n[2]);
      uv.push(flipU ? 1 - u : u, v);
    }
  }
  const P = (i: number) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const len = (i: number, j: number) => { const p = P(i), q = P(j); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
    if (keep && !(keep(a, b) && keep(a + 1, b) && keep(a, b + 1) && keep(a + 1, b + 1))) continue;
    const i0 = a * (nv + 1) + b, i1 = (a + 1) * (nv + 1) + b, i2 = (a + 1) * (nv + 1) + b + 1, i3 = a * (nv + 1) + b + 1;
    if (maxEdge < Infinity && Math.max(len(i0, i1), len(i1, i2), len(i2, i3), len(i3, i0)) > maxEdge) continue;
    idx.push(i0, i1, i2, i0, i2, i3);
  }
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    const cr = cross(sub([pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]], [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]]), sub([pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]], [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]]));
    if (cr[0] * nrm[a * 3] + cr[1] * nrm[a * 3 + 1] + cr[2] * nrm[a * 3 + 2] < 0) { idx[t + 1] = c; idx[t + 2] = b; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * Projected end-face decal (front or rear): a grid over (x, y) whose z follows the body's end surface.
 * Returns the geometry plus the metric extents so a texture can be drawn in (x, y) space.
 */
export function endDecal(shape: BodyShape, front: boolean): { geo: THREE.BufferGeometry; xw: number; yLo: number; yHi: number } {
  const sA = front ? 0.07 : 0.93;
  const xw = shape.halfWidth(sA) * 1.02;
  const yLo = (front ? shape.bottom(0.012) : shape.bottom(0.988)) - 0.02;
  const yHi = front ? shape.top(0.07) + 0.02 : shape.top(0.93) + 0.02;
  const NU = 72, NV = 44;
  const Z: number[][] = [];
  const valid: boolean[][] = [];
  for (let a = 0; a <= NU; a++) {
    const col: number[] = [];
    const x = (a / NU - 0.5) * 2 * xw;
    for (let b = 0; b <= NV; b++) {
      const y = lerpN(yLo, yHi, b / NV);
      col.push(shape.endZ(x, y, front, 0.25));
    }
    valid.push(col.map((z) => !isNaN(z)));
    // fill gaps (above the hood line / outside the outline) with the nearest valid value pushed inward
    let last = NaN;
    for (let b = 0; b <= NV; b++) { if (isNaN(col[b])) col[b] = isNaN(last) ? NaN : last + (front ? -0.03 : 0.03); else last = col[b]; }
    last = NaN;
    for (let b = NV; b >= 0; b--) { if (isNaN(col[b])) col[b] = isNaN(last) ? (front ? shape.zF - 0.3 : shape.zR + 0.3) : last + (front ? -0.03 : 0.03); else last = col[b]; }
    Z.push(col);
  }
  const fn = (u: number, v: number) => {
    const a = Math.min(NU - 1e-6, u * NU), b = Math.min(NV - 1e-6, v * NV);
    const ia = Math.floor(a), ib = Math.floor(b), ta = a - ia, tb = b - ib;
    const z = lerpN(lerpN(Z[ia][ib], Z[ia + 1][ib], ta), lerpN(Z[ia][ib + 1], Z[ia + 1][ib + 1], ta), tb);
    const x = (front ? u - 0.5 : 0.5 - u) * 2 * xw;
    return [x, lerpN(yLo, yHi, v), z];
  };
  const cell = Math.hypot((2 * xw) / NU, (yHi - yLo) / NV);
  const geo = surfacePatch(fn, NU, NV, 0.007, [0, 0, front ? 1 : -1], false, (a, b) => valid[a][b], cell * 4);
  return { geo, xw, yLo, yHi };
}

function lerpN(a: number, b: number, t: number) { return a + (b - a) * t; }

/**
 * Decal projected onto the body along -n: a w×h rectangle centred on C in the plane spanned by U (u axis)
 * and V (v axis). Rays that miss the body are pulled just inside it so their texels stay hidden.
 */
export function projectedPatch(shape: BodyShape, C: number[], n: number[], U: number[], V: number[], w: number, h: number, nu = 16, nv = 8, offset = 0.004): THREE.BufferGeometry {
  const G: number[][][] = [];
  const ok: boolean[] = [];
  const back = [-n[0], -n[1], -n[2]];
  for (let a = 0; a <= nu; a++) {
    const col: number[][] = [];
    for (let b = 0; b <= nv; b++) {
      const du = (a / nu - 0.5) * w, dv = (b / nv - 0.5) * h;
      const q = [C[0] + U[0] * du + V[0] * dv, C[1] + U[1] * du + V[1] * dv, C[2] + U[2] * du + V[2] * dv];
      const o = [q[0] + n[0] * 0.3, q[1] + n[1] * 0.3, q[2] + n[2] * 0.3];
      const hit = shape.raycast(o, back, 0.75);
      ok.push(!!hit);
      col.push(hit ?? [q[0] - n[0] * 0.06, q[1] - n[1] * 0.06, q[2] - n[2] * 0.06]);
    }
    G.push(col);
  }
  const fn = (u: number, v: number) => {
    const fa = Math.min(nu - 1e-6, u * nu), fb = Math.min(nv - 1e-6, v * nv);
    const ia = Math.floor(fa), ib = Math.floor(fb), ta = fa - ia, tb = fb - ib;
    const p00 = G[ia][ib], p10 = G[ia + 1][ib], p01 = G[ia][ib + 1], p11 = G[ia + 1][ib + 1];
    return [0, 1, 2].map((k) => lerpN(lerpN(p00[k], p10[k], ta), lerpN(p01[k], p11[k], ta), tb));
  };
  const cell = Math.hypot(w / nu, h / nv);
  return surfacePatch(fn, nu, nv, offset, n, false, (a, b) => ok[a * (nv + 1) + b], cell * 2.2);
}

/** Mirror a geometry across x = 0 (positions, normals and winding). */
export function mirrorX(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const m = g.clone();
  m.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  const idx = m.getIndex();
  if (idx) {
    const arr = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) { const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t; }
    idx.needsUpdate = true;
  }
  return m;
}
