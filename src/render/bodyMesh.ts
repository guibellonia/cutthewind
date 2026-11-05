// Builds the body meshes (v2) from a BodyShape: lower body, cabin, fender flares, bumpers, skirts.
import * as THREE from 'three';
import { BodyShape, P_SHOULDER, SEC_N, lerp, sstep } from './bodyShape';

export const ATLAS = 2048;
export const SIDE_H = 640;
export const TOP_Y0 = 1280;
export const TOP_H = 704;
export const SOLID_Y = 2016;
export const SIDE_REF_H = 1.6;
export const TOP_REF_W = 2.3;

export type Bucket = 'side' | 'top' | 'hood' | 'roof' | 'glass' | 'pillar' | 'under';

export interface CapInfo { wc: number; yMin: number; yMax: number; z: number }
export interface BumperInfo { len: number; faceA: number; faceB: number; yBot: number; yTop: number; wc: number; z: number }

export interface BodyGeometry {
  shape: BodyShape;
  buckets: Partial<Record<Bucket, THREE.BufferGeometry>>;
  capF: THREE.BufferGeometry;
  capR: THREE.BufferGeometry;
  capFInfo: CapInfo;
  capRInfo: CapInfo;
  flares: THREE.BufferGeometry | null;
  skirts: THREE.BufferGeometry | null;
  bumperF: THREE.BufferGeometry;
  bumperR: THREE.BufferGeometry;
  bumperFInfo: BumperInfo;
  bumperRInfo: BumperInfo;
}

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
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const e1 = [P[b * 3] - ax, P[b * 3 + 1] - ay, P[b * 3 + 2] - az];
    const e2 = [P[c * 3] - ax, P[c * 3 + 1] - ay, P[c * 3 + 2] - az];
    const cx = e1[1] * e2[2] - e1[2] * e2[1];
    const cy = e1[2] * e2[0] - e1[0] * e2[2];
    const cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (Math.hypot(cx, cy, cz) < 1e-10) return;
    const nx = N[a * 3] + N[b * 3] + N[c * 3];
    const ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1];
    const nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
    if (cx * nx + cy * ny + cz * nz < 0) this.idx.push(a, c, b);
    else this.idx.push(a, b, c);
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

/** Normal on a point grid; columns jFrom..jTo form one smooth group (creases between groups). */
function gridNormal(P: number[][][], i: number, j: number, jFrom: number, jTo: number, hint: number[]): number[] {
  const ni = P.length;
  const i0 = Math.max(0, i - 1), i1 = Math.min(ni - 1, i + 1);
  const ta = sub(P[i1][j], P[i0][j]);
  const j0 = Math.max(jFrom, j - 1), j1 = Math.min(jTo, j + 1);
  let tb = sub(P[i][j1], P[i][j0]);
  if (Math.hypot(tb[0], tb[1], tb[2]) < 1e-7) tb = [0, 1, 0];
  let n = cross(ta, tb);
  if (Math.hypot(n[0], n[1], n[2]) < 1e-10) n = hint.slice();
  n = norm(n);
  if (dot(n, hint) < 0) n = [-n[0], -n[1], -n[2]];
  return n;
}

export function buildBodyGeometry(shape: BodyShape): BodyGeometry {
  const sh = shape.sh;
  const B: Record<Bucket, Builder> = {
    side: new Builder(), top: new Builder(), hood: new Builder(), roof: new Builder(), glass: new Builder(), pillar: new Builder(), under: new Builder(),
  };
  const crisp = sh.shoulder >= 0.45;

  // =============================================================== LOWER BODY
  const S = shape.stations();
  const grid = S.map((s) => shape.section(s));
  const ni = S.length;
  for (let i = 0; i < ni - 1; i++) {
    const sMid = (S[i] + S[i + 1]) / 2;
    for (let j = 0; j < SEC_N - 1; j++) {
      let b: Bucket;
      if (j === 0) b = 'under';
      else if (j < P_SHOULDER) b = 'side';
      else b = sMid >= shape.hoodStart && sMid < sh.wsBase ? 'hood' : 'top';
      const isTop = j >= P_SHOULDER;
      const jFrom = crisp ? (isTop ? P_SHOULDER : 0) : 0;
      const jTo = crisp ? (isTop ? SEC_N - 1 : P_SHOULDER) : SEC_N - 1;
      const bl = B[b];
      for (const right of [false, true]) {
        const ids: number[] = [];
        for (const [ii, jj] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]) {
          const p0 = grid[ii][jj];
          const hint = jj <= 1 ? [0, -1, 0] : jj < P_SHOULDER ? [1, 0, 0] : [0.15, 1, 0];
          const n0 = gridNormal(grid, ii, jj, jFrom, jTo, hint);
          const p = right ? [-p0[0], p0[1], p0[2]] : p0;
          const n = right ? [-n0[0], n0[1], n0[2]] : n0;
          const uv = b === 'side' ? sideUV(S[ii], p0[1], right) : b === 'under' ? SOLID_UV : topUV(S[ii], right ? -p0[0] : p0[0]);
          ids.push(bl.vert(`L${ii}_${jj}_${right ? 1 : 0}_${isTop ? 't' : 's'}`, p, n, uv));
        }
        bl.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
  }

  // =============================================================== CABIN
  const CS = shape.cabinStations();
  const CN = 11; // B, B', M, E', E, arc x6
  const ARC_U = [0.1, 0.28, 0.48, 0.68, 0.86, 1.0];
  const cgrid: number[][][] = CS.map((s) => {
    const b = shape.cabinBase(s);
    const e = shape.cabinEdge(s);
    const t = shape.cabinTop(s);
    const hgt = e[1] - b[1];
    const gh = sstep(0.0, 0.12, hgt);
    const bp = [lerp(b[0], e[0], 0.06), b[1] + Math.min(0.016, hgt * 0.2), b[2]];
    const m = [lerp(b[0], e[0], 0.5) + 0.007 * gh, lerp(b[1], e[1], 0.5), b[2]];
    const ep = [lerp(b[0], e[0], 0.93), e[1] - Math.min(0.014, hgt * 0.12), b[2]];
    const pts = [b, bp, m, ep, e];
    for (const u of ARC_U) {
      const x = e[0] * (1 - u);
      const r = x / Math.max(1e-4, e[0]);
      pts.push([x, t - (t - e[1]) * r * r, b[2]]);
    }
    return pts;
  });
  const winA = sh.wsBase + 0.016, winB = sh.sideWindowEnd;
  const bp0 = sh.bPillar > 0 ? sh.bPillar - 0.011 : -1, bp1 = sh.bPillar > 0 ? sh.bPillar + 0.011 : -1;
  const cabBucket = (s: number, j: number): Bucket => {
    if (j <= 3) {
      const inWin = s > winA && s < winB;
      if (!inWin) return 'side';
      if (s > bp0 && s < bp1) return sh.blackPillars ? 'pillar' : 'side';
      if (j === 0 || j === 3) return 'pillar';
      if (s < winA + 0.007 || s > winB - 0.007) return 'pillar';
      if (sh.bPillar > 0 && (Math.abs(s - bp0) < 0.006 || Math.abs(s - bp1) < 0.006)) return 'pillar';
      return 'glass';
    }
    if (s < sh.roofStart) {
      if (j === 4) return 'top';
      if (j === 5 || s < sh.wsBase + 0.01 || s > sh.roofStart - 0.007) return 'pillar';
      return 'glass';
    }
    if (s <= sh.roofEnd) return 'roof';
    if (j === 4) return 'top';
    if (j === 5 || s < sh.roofEnd + 0.007 || s > sh.rearGlassBase - 0.008) return 'pillar';
    return 'glass';
  };
  for (let i = 0; i < CS.length - 1; i++) {
    const sMid = (CS[i] + CS[i + 1]) / 2;
    for (let j = 0; j < CN - 1; j++) {
      const b = cabBucket(sMid, j);
      const isTop = j >= 4;
      const bl = B[b];
      for (const right of [false, true]) {
        const ids: number[] = [];
        for (const [ii, jj] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]) {
          const p0 = cgrid[ii][jj];
          const n0 = gridNormal(cgrid, ii, jj, isTop ? 4 : 0, isTop ? CN - 1 : 4, isTop ? [0.1, 1, 0] : [1, 0.25, 0]);
          const p = right ? [-p0[0], p0[1], p0[2]] : p0;
          const n = right ? [-n0[0], n0[1], n0[2]] : n0;
          const uv = b === 'side' ? sideUV(CS[ii], p0[1], right) : b === 'top' || b === 'roof' ? topUV(CS[ii], right ? -p0[0] : p0[0]) : [CS[ii], p0[1]];
          ids.push(bl.vert(`C${ii}_${jj}_${right ? 1 : 0}_${isTop ? 't' : 's'}`, p, n, uv));
        }
        bl.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
  }

  const buckets: Partial<Record<Bucket, THREE.BufferGeometry>> = {};
  for (const k of Object.keys(B) as Bucket[]) {
    const g = B[k].geometry();
    if (g) buckets[k] = g;
  }

  // =============================================================== CAPS
  const cap = (secIdx: number, front: boolean): [THREE.BufferGeometry, CapInfo] => {
    const half = grid[secIdx];
    const ring: number[][] = [];
    for (let j = 0; j < SEC_N; j++) ring.push(half[j]);
    for (let j = SEC_N - 2; j >= 1; j--) ring.push([-half[j][0], half[j][1], half[j][2]]);
    let wc = 0, yMin = Infinity, yMax = -Infinity, zc = 0;
    for (const p of ring) { wc = Math.max(wc, Math.abs(p[0])); yMin = Math.min(yMin, p[1]); yMax = Math.max(yMax, p[1]); zc += p[2]; }
    zc /= ring.length;
    const cy = (yMin + yMax) / 2;
    const bl = new Builder();
    const nz = front ? 1 : -1;
    const uvOf = (p: number[]) => [front ? (p[0] + wc) / (2 * wc) : (wc - p[0]) / (2 * wc), (p[1] - yMin) / (yMax - yMin)];
    const c = bl.vert('c', [0, cy, zc + nz * 0.004], [0, 0, nz], uvOf([0, cy]));
    const ids = ring.map((p, k) => bl.vert(`r${k}`, p, [0, 0, nz], uvOf(p)));
    for (let k = 0; k < ids.length; k++) bl.tri(c, ids[k], ids[(k + 1) % ids.length]);
    return [bl.geometry()!, { wc, yMin, yMax, z: zc }];
  };
  const [capF, capFInfo] = cap(0, true);
  const [capR, capRInfo] = cap(ni - 1, false);

  // =============================================================== FENDER FLARES
  const fl = new Builder();
  for (const [za, F] of [[shape.zFA, shape.flareF], [shape.zRA, shape.flareR]] as const) {
    const Ra = shape.archR;
    const ySill = sh.sill + 0.03;
    const phi0 = Math.asin(Math.max(-0.95, Math.min(0.2, (ySill - shape.wheelY) / Ra)));
    const phi1 = Math.PI - phi0;
    const NP = 30;
    const band = 0.1 + F * 1.3;
    const prof: [number, number][] = [[band, -0.004], [band * 0.6, F * 0.5], [0.035, F * 0.92], [0.01, F], [0, F - 0.006], [-0.014, F - 0.032]];
    const P: number[][][] = [];
    for (let a = 0; a <= NP; a++) {
      const phi = phi0 + ((phi1 - phi0) * a) / NP;
      const fade = sstep(phi0, phi0 + 0.3, phi) * (1 - sstep(phi1 - 0.3, phi1, phi)) * 0.7 + 0.3;
      const row: number[][] = [];
      const zTop = za + Ra * Math.cos(phi);
      const sTop = shape.sOf(zTop);
      const avail = Math.sin(phi) > 0.05 ? (shape.belt(sTop) - 0.035 - shape.wheelY) / Math.sin(phi) - Ra : band;
      const scale = Math.max(0.25, Math.min(1, avail / band));
      for (const [rho0, dx] of prof) {
        const rho = rho0 > 0 ? rho0 * scale : rho0;
        const r = Ra + rho;
        const z = za + r * Math.cos(phi);
        const y = shape.wheelY + r * Math.sin(phi);
        const s = shape.sOf(z);
        const x = shape.sideX(s, Math.max(y, ySill)) + dx * fade;
        row.push([x, y, z]);
      }
      P.push(row);
    }
    for (let a = 0; a < NP; a++) {
      for (let j = 0; j < prof.length - 1; j++) {
        for (const right of [false, true]) {
          const ids: number[] = [];
          for (const [aa, jj] of [[a, j], [a + 1, j], [a + 1, j + 1], [a, j + 1]]) {
            const p0 = P[aa][jj];
            const n0 = gridNormal(P, aa, jj, 0, prof.length - 1, [1, 0, 0]);
            const p = right ? [-p0[0], p0[1], p0[2]] : p0;
            const n = right ? [-n0[0], n0[1], n0[2]] : n0;
            ids.push(fl.vert(`F${za}_${aa}_${jj}_${right}`, p, n, sideUV(shape.sOf(p0[2]), p0[1], right)));
          }
          fl.quad(ids[0], ids[1], ids[2], ids[3]);
        }
      }
    }
  }
  const flares = fl.geometry();

  // =============================================================== BUMPERS
  const bumper = (front: boolean): [THREE.BufferGeometry, BumperInfo] => {
    const k = shape.k;
    const sEnd = front ? shape.sArchFront : shape.sArchRear;
    const sTip = front ? 0 : 1;
    const ext = front ? k.fbExt : k.rbExt;
    const chin = front ? k.fbChin : k.rbChin;
    const yTop = front ? shape.fBumperTop : shape.rBumperTop;
    const yBot = shape.bottom(sTip) - chin;
    const path: number[][] = [];
    const NS = 16;
    const yMid = (yTop + yBot) / 2;
    for (let i = 0; i <= NS; i++) {
      const t = i / NS;
      const s = lerp(sEnd, sTip, Math.pow(t, 0.8));
      path.push([shape.sideX(s, Math.max(yMid, shape.bottom(s) + 0.02)), shape.z(s)]);
    }
    const tipX = path[path.length - 1][0];
    const NF = 10;
    for (let i = 1; i < NF; i++) path.push([tipX * (1 - (2 * i) / NF), shape.z(sTip)]);
    for (let i = NS; i >= 0; i--) {
      const p = path[i];
      path.push([-p[0], p[1]]);
    }
    const n = path.length;
    const zc = front ? shape.zFA : shape.zRA;
    const arc = [0];
    for (let i = 1; i < n; i++) arc.push(arc[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const len = arc[n - 1];
    const faceA = arc[NS], faceB = arc[NS + NF];
    const H = yTop - yBot;
    const pk = front ? 1 : 0.75;
    const prof: [number, number][] = [[-0.035, 0.03], [0.004, 0.0], [0.03 * pk, 0.035], [0.042 * pk, 0.42], [0.037 * pk, 0.86], [0.02 * pk, 0.975], [-0.014, 1.0]];
    const P: number[][][] = [];
    const UV: number[][][] = [];
    for (let i = 0; i < n; i++) {
      const pPrev = path[Math.max(0, i - 1)], pNext = path[Math.min(n - 1, i + 1)];
      const tx = pNext[0] - pPrev[0], tz = pNext[1] - pPrev[1];
      let nx = tz, nz = -tx;
      const l = Math.hypot(nx, nz) || 1;
      nx /= l; nz /= l;
      if (nx * path[i][0] + nz * (path[i][1] - zc) < 0) { nx = -nx; nz = -nz; }
      const frontness = Math.abs(nz);
      const dEnd = Math.min(arc[i], len - arc[i]);
      const tau = sstep(0.0, 0.28, dEnd);
      const s = shape.sOf(path[i][1]);
      const yb = lerp(Math.max(sh.sill + 0.02, shape.bottom(s) + 0.005), yBot, tau);
      const yt = Math.min(yTop, shape.belt(s) - 0.05);
      const row: number[][] = [], uvr: number[][] = [];
      prof.forEach(([d0, fy], j) => {
        const lift = j >= 2 && j <= 5 ? ext * frontness : 0;
        const d = d0 * tau - 0.004 * (1 - tau) + lift;
        const y = lerp(yb, yt, fy);
        row.push([path[i][0] + nx * d, y, path[i][1] + nz * d]);
        uvr.push([front ? 1 - arc[i] / len : arc[i] / len, (y - yBot) / Math.max(0.05, H)]);
      });
      P.push(row);
      UV.push(uvr);
    }
    const bb = new Builder();
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < prof.length - 1; j++) {
        const ids: number[] = [];
        for (const [ii, jj] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]) {
          const p = P[ii][jj];
          const hint = [p[0], 0.1, (p[2] - zc) * 1.5];
          ids.push(bb.vert(`${ii}_${jj}`, p, gridNormal(P, ii, jj, 0, prof.length - 1, hint), UV[ii][jj]));
        }
        bb.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
    return [bb.geometry()!, { len, faceA, faceB, yBot, yTop, wc: tipX, z: shape.z(sTip) }];
  };
  const [bumperF, bumperFInfo] = bumper(true);
  const [bumperR, bumperRInfo] = bumper(false);

  // =============================================================== SKIRTS
  let skirts: THREE.BufferGeometry | null = null;
  if (shape.k.skirtDrop > 0 || shape.k.skirtOut > 0) {
    const sk = new Builder();
    const out = shape.k.skirtOut, drop = shape.k.skirtDrop;
    const z0 = shape.zRA + shape.archR + 0.01, z1 = shape.zFA - shape.archR - 0.01;
    const ys = sh.sill;
    const prof: [number, number][] = [[-0.012, ys + 0.1], [out * 0.7, ys + 0.075], [out, ys + 0.03], [out + 0.004, ys - drop + 0.014], [out - 0.012, ys - drop], [-0.035, ys - drop + 0.006]];
    const NZ = 16;
    const P: number[][][] = [];
    for (let i = 0; i <= NZ; i++) {
      const z = lerp(z0, z1, i / NZ);
      const s = shape.sOf(z);
      const xs = shape.sideX(s, ys + 0.04);
      const endT = Math.min(i, NZ - i) / NZ;
      const taper = Math.min(1, endT * 12);
      P.push(prof.map(([dx, y]) => [xs + dx * taper - 0.003 * (1 - taper), y + (ys - y) * (1 - taper) * 0.3, z]));
    }
    for (let i = 0; i < NZ; i++) for (let j = 0; j < prof.length - 1; j++) {
      for (const right of [false, true]) {
        const ids: number[] = [];
        for (const [ii, jj] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]) {
          const p0 = P[ii][jj];
          const n0 = gridNormal(P, ii, jj, 0, prof.length - 1, [1, 0, 0]);
          const p = right ? [-p0[0], p0[1], p0[2]] : p0;
          const nn = right ? [-n0[0], n0[1], n0[2]] : n0;
          ids.push(sk.vert(`${ii}_${jj}_${right}`, p, nn, sideUV(shape.sOf(p0[2]), p0[1], right)));
        }
        sk.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
    skirts = sk.geometry();
  }

  return { shape, buckets, capF, capR, capFInfo, capRInfo, flares, skirts, bumperF, bumperR, bumperFInfo, bumperRInfo };
}

/** Builds a surface patch following the body. `fn(u, v)` returns a point; normals computed numerically. */
export function surfacePatch(fn: (u: number, v: number) => number[], nu: number, nv: number, offset: number, hint: number[], flipU = false): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  const eps = 1e-3;
  for (let a = 0; a <= nu; a++) {
    for (let b = 0; b <= nv; b++) {
      const u = a / nu, v = b / nv;
      const pu1 = fn(Math.min(1, u + eps), v), pu0 = fn(Math.max(0, u - eps), v);
      const pv1 = fn(u, Math.min(1, v + eps)), pv0 = fn(u, Math.max(0, v - eps));
      let n = norm(cross(sub(pu1, pu0), sub(pv1, pv0)));
      if (dot(n, hint) < 0) n = [-n[0], -n[1], -n[2]];
      const p = fn(u, v);
      pos.push(p[0] + n[0] * offset, p[1] + n[1] * offset, p[2] + n[2] * offset);
      nrm.push(n[0], n[1], n[2]);
      uv.push(flipU ? 1 - u : u, v);
    }
  }
  for (let a = 0; a < nu; a++) {
    for (let b = 0; b < nv; b++) {
      const i0 = a * (nv + 1) + b, i1 = (a + 1) * (nv + 1) + b, i2 = (a + 1) * (nv + 1) + b + 1, i3 = a * (nv + 1) + b + 1;
      idx.push(i0, i1, i2, i0, i2, i3);
    }
  }
  const P = pos, N = nrm;
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    const cr = cross(sub([P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]]), sub([P[c * 3], P[c * 3 + 1], P[c * 3 + 2]], [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]]));
    if (cr[0] * N[a * 3] + cr[1] * N[a * 3 + 1] + cr[2] * N[a * 3 + 2] < 0) { idx[t + 1] = c; idx[t + 2] = b; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
