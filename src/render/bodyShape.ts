// Car body description (v3): each fictional model's surface is a blend of 2–3 landmark-aligned real car
// shells from the ShapeNetCar reference set (CC-BY 4.0), stored as normalised cross-sections in
// bodyBlends.json. Car-local coordinates: +Z forward, +Y up, +X = car's left side. Origin on the ground,
// midway between the axles.
import type { CarModel, ShapeParams, VisualConfig } from '../core/types';
import { visualPart } from '../data/visualParts';
import BLENDS from '../data/bodyBlends.json';

export const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Index of the shoulder point in `compatSection` (used by add-on parts). */
export const P_SHOULDER = 6;

export interface KitParams {
  fbExt: number; fbChin: number; rbExt: number; rbChin: number;
  skirtDrop: number; skirtOut: number; flareF: number; flareR: number;
  hoodBulge: number; duck: number;
}

export function kitParams(v: VisualConfig): KitParams {
  const fb = visualPart('frontBumper', v.frontBumper).p;
  const rb = visualPart('rearBumper', v.rearBumper).p;
  const sk = visualPart('sideSkirts', v.sideSkirts).p;
  const hd = visualPart('hood', v.hood).p;
  const sp = visualPart('spoiler', v.spoiler).p;
  return {
    fbExt: fb.ext ?? 0, fbChin: fb.chin ?? 0, rbExt: rb.ext ?? 0, rbChin: rb.chin ?? 0,
    skirtDrop: sk.drop ?? 0, skirtOut: sk.out ?? 0,
    flareF: visualPart('frontFenders', v.frontFenders).p.flare ?? 0,
    flareR: visualPart('rearFenders', v.rearFenders).p.flare ?? 0,
    hoodBulge: hd.bulge ?? 0,
    duck: sp.kind === 'ducktail' ? sp.h ?? 0.04 : 0,
  };
}

interface BlendData { canon: Record<string, { ws: number; rs: number; re: number; rg: number }>; models: Record<string, { cls: string; secs: number[][][] }> }
const DATA = BLENDS as unknown as BlendData;

export const NA = 33; // points per half section (bottom centre → top centre)

interface RowInfo { shoulder: number; belt: number; edge: number }

export interface FaceInfo {
  /** lowest point of the face */
  yBot: number;
  /** where the near-vertical face turns into the hood (front) or deck lid (rear) */
  yTop: number;
  /** height of the most protruding point */
  yMin: number;
  /** half width of the face at height y (points no more than maxSb behind the tip) */
  halfW: (y: number, maxSb?: number) => number;
}

export class BodyShape {
  readonly m: CarModel;
  readonly sh: ShapeParams;
  readonly k: KitParams;
  readonly L: number;
  readonly W: number;
  readonly H: number;
  readonly base = 0.14;
  readonly zF: number;
  readonly zR: number;
  readonly zFA: number;
  readonly zRA: number;
  readonly archR: number;
  readonly wheelY: number;
  readonly w0: number;
  readonly hoodStart = 0.07;
  readonly flareF: number;
  readonly flareR: number;
  readonly fBumperTop: number;
  readonly rBumperTop: number;
  readonly sArchFront: number;
  readonly sArchRear: number;
  readonly cls: string;
  private grid: number[][][];
  private rows: RowInfo[];
  private canon: { ws: number; rs: number; re: number; rg: number };
  private secCache = new Map<number, number[][]>();

  constructor(model: CarModel, kit: KitParams) {
    this.m = model;
    this.sh = model.shape;
    this.k = kit;
    this.L = model.length;
    this.W = model.width;
    this.H = model.height;
    this.zFA = model.wheelbase / 2;
    this.zRA = -model.wheelbase / 2;
    this.zF = this.zFA + model.frontOverhang;
    this.zR = this.zF - this.L;
    const tr = (model.stockWheelSize * 0.0254) / 2 + (model.stockTireWidth * model.stockTireProfile) / 100000;
    this.wheelY = tr;
    this.archR = Math.max(0.32, tr + 0.035);
    this.flareF = kit.flareF;
    this.flareR = kit.flareR;
    this.w0 = this.W / 2;
    const entry = DATA.models[model.id] ?? Object.values(DATA.models)[0];
    this.cls = entry.cls;
    this.grid = entry.secs;
    this.canon = DATA.canon[entry.cls];
    this.rows = this.grid.map((row, i) => this.analyseRow(row, (i + 0.5) / this.grid.length));
    for (const key of ['shoulder', 'belt', 'edge'] as const) {
      const v = this.rows.map((r) => r[key]);
      this.rows.forEach((r, i) => {
        const win = v.slice(Math.max(0, i - 2), i + 3).sort((a, b) => a - b);
        r[key] = win[Math.floor(win.length / 2)];
      });
    }
    this.fBumperTop = this.top(0.02) - 0.1;
    this.rBumperTop = this.base + (this.top(0.985) - this.base) * 0.45;
    this.sArchFront = this.sOf(this.zFA + this.archR + 0.03);
    this.sArchRear = this.sOf(this.zRA - this.archR - 0.03);
  }

  z(s: number) { return this.zF - s * this.L; }
  sOf(z: number) { return (this.zF - z) / this.L; }

  /** Model station → canonical template station (piecewise-linear landmark alignment). */
  private canonS(s: number): number {
    const sh = this.sh, c = this.canon;
    const xs = [0, sh.wsBase, sh.roofStart, sh.roofEnd, sh.rearGlassBase, 1];
    const ys = [0, c.ws, c.rs, c.re, c.rg, 1];
    for (let i = 1; i < xs.length; i++) if (xs[i] <= xs[i - 1]) xs[i] = xs[i - 1] + 1e-3;
    if (s <= 0) return 0;
    if (s >= 1) return 1;
    let i = 1;
    while (i < xs.length - 1 && s > xs[i]) i++;
    const t = (s - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
  }

  private analyseRow(row: number[][], sc: number): RowInfo {
    let shoulder = 12, best = -1;
    for (let j = 6; j < NA - 4; j++) { const [x, y] = row[j]; if (y > 0.3 && y < 0.82 && x > best) { best = x; shoulder = j; } }
    const c = this.canon;
    const inCabin = sc > c.ws - 0.02 && sc < c.rg + 0.02;
    let belt = Math.min(NA - 3, shoulder + 1);
    let edge = NA - 2;
    if (inCabin) {
      for (let j = shoulder + 1; j < NA - 3; j++) if (row[j][0] < best - 0.035) { belt = j; break; }
      // roof rail: first point (at least ~22 cm above the belt) where the surface turns flatter than 45°
      const hs = this.H - this.base;
      for (let j = belt + 1; j < NA - 1; j++) {
        const dx = (row[j][0] - row[j + 1][0]) * this.w0, dy = (row[j + 1][1] - row[j][1]) * hs;
        if (dx > dy && (row[j][1] - row[belt][1]) * hs > Math.min(0.22, 0.55 * (row[NA - 1][1] - row[belt][1]) * hs)) { edge = j; break; }
      }
      edge = Math.max(belt + 2, Math.min(NA - 3, edge));
    }
    return { shoulder, belt, edge };
  }

  private rowAt(s: number): { row: number[][]; info: RowInfo } {
    const n = this.grid.length;
    const f = Math.min(n - 1, Math.max(0, this.canonS(Math.min(1, Math.max(0, s))) * n - 0.5));
    const i = Math.floor(f), t = f - i;
    const a = this.grid[i], b = this.grid[Math.min(n - 1, i + 1)];
    const row = a.map((p, j) => [lerp(p[0], b[j][0], t), lerp(p[1], b[j][1], t)]);
    const info = t < 0.5 ? this.rows[i] : this.rows[Math.min(n - 1, i + 1)];
    return { row, info };
  }

  /** Wheel arch tunnel height at z (or -Infinity outside the arches). */
  archTop(z: number): number {
    let y = -Infinity;
    for (const za of [this.zFA, this.zRA]) {
      const fl = za === this.zFA ? this.flareF : this.flareR;
      const R = this.archR + fl * 0.4;
      const dz = z - za;
      if (Math.abs(dz) < R) y = Math.max(y, this.wheelY + Math.sqrt(R * R - dz * dz));
    }
    return y;
  }

  /** Full half section at station s: NA points [x, y, z] from bottom centre to top centre (left side). */
  section(s: number): number[][] {
    const key = Math.round(s * 20000);
    const hit = this.secCache.get(key);
    if (hit) return hit;
    const { row, info } = this.rowAt(s);
    const z0 = this.z(s);
    const hs = this.H - this.base;
    const k = this.k;
    const arch = this.archTop(z0);
    const between = z0 > this.zRA + this.archR && z0 < this.zFA - this.archR ? 1 : 0;
    const pts = row.map(([xn, yn], j) => {
      let x = xn * this.w0;
      let y = this.base + yn * hs;
      let z = z0;
      const lowW = 1 - sstep(this.base + 0.12, this.base + 0.32, y);
      if (k.fbChin > 0 && s < 0.16) y -= k.fbChin * (1 - sstep(0.07, 0.16, s)) * lowW;
      if (k.rbChin > 0 && s > 0.86) y -= k.rbChin * sstep(0.86, 0.94, s) * lowW;
      if (k.fbExt > 0) z += k.fbExt * (1 - sstep(0.0, 0.09, s)) * lowW;
      if (k.rbExt > 0) z -= k.rbExt * sstep(0.91, 1.0, s) * lowW;
      if (between && j <= info.shoulder - 3) {
        y -= k.skirtDrop * lowW;
        if (xn > 0.6) x += k.skirtOut * lowW;
      }
      if (j > info.shoulder) {
        if (k.hoodBulge > 0 && s > this.hoodStart && s < this.sh.wsBase) {
          const along = sstep(this.hoodStart + 0.03, this.hoodStart + 0.12, s) * (1 - sstep(this.sh.wsBase - 0.03, this.sh.wsBase - 0.005, s));
          y += k.hoodBulge * along * Math.max(0, 1 - Math.pow(x / (this.w0 * 0.42), 4));
        }
        if (k.duck > 0 && s > this.sh.rearGlassBase) y += k.duck * sstep(0.9, 0.995, s);
      }
      if (arch > -Infinity && y < arch && j <= info.shoulder) y = arch;
      return [x, y, z];
    });
    if (this.secCache.size > 4000) this.secCache.clear();
    this.secCache.set(key, pts);
    return pts;
  }

  info(s: number): RowInfo { return this.rowAt(s).info; }
  shoulderPoint(s: number): number[] { return this.section(s)[this.info(s).shoulder].slice(); }

  halfWidth(s: number): number {
    const sec = this.section(s);
    let mx = 0;
    const sj = this.info(s).shoulder;
    for (let j = 0; j <= sj; j++) mx = Math.max(mx, sec[j][0]);
    return mx;
  }

  belt(s: number): number { return this.section(s)[this.info(s).belt][1]; }
  top(s: number): number { return this.section(s)[NA - 1][1]; }
  bottom(s: number): number { return this.section(s)[0][1]; }
  crown(s: number): number { return this.top(s) - this.belt(s); }

  flare(s: number): number {
    const z = this.z(s);
    const nearF = Math.abs(z - this.zFA) < this.archR * 1.3 ? this.flareF : 0;
    const nearR = Math.abs(z - this.zRA) < this.archR * 1.3 ? this.flareR : 0;
    return Math.max(nearF, nearR);
  }

  skirtOut(s: number): number {
    const z = this.z(s);
    return z > this.zRA + this.archR && z < this.zFA - this.archR ? this.k.skirtOut : 0;
  }

  /** Body side x at height y (left side). */
  sideX(s: number, y: number): number {
    const sec = this.section(s);
    const sj = this.info(s).shoulder;
    let best = sec[sj][0];
    for (let j = 1; j <= sj; j++) {
      const a = sec[j - 1], b = sec[j];
      if ((y >= a[1] && y <= b[1]) || (y <= a[1] && y >= b[1])) {
        const t = (y - a[1]) / Math.max(1e-5, b[1] - a[1]);
        best = lerp(a[0], b[0], t);
      }
    }
    return best;
  }

  /** Outer side x at height y from the unmodified blend row (ignores arch cut-outs and kit deformations). */
  outerX(s: number, y: number): number {
    const { row, info } = this.rowAt(s);
    const hs = this.H - this.base;
    let best = row[info.shoulder][0] * this.w0;
    for (let j = 1; j <= info.shoulder; j++) {
      const ya = this.base + row[j - 1][1] * hs, yb = this.base + row[j][1] * hs;
      if ((y >= ya && y <= yb) || (y <= ya && y >= yb)) best = lerp(row[j - 1][0], row[j][0], (y - ya) / Math.max(1e-5, yb - ya)) * this.w0;
    }
    return best;
  }

  cabinTop(s: number): number { return this.top(s); }
  cabinBase(s: number): number[] { return this.section(s)[this.info(s).belt].slice(); }
  cabinEdge(s: number): number[] { return this.section(s)[this.info(s).edge].slice(); }

  /** Point on the top surface (hood, roof, deck) at lateral position x >= 0. */
  topPoint(s: number, x: number): number[] {
    x = Math.abs(x);
    const sec = this.section(s);
    const sj = this.info(s).shoulder;
    if (x >= sec[sj][0]) return sec[sj].slice();
    for (let j = sj; j < NA - 1; j++) {
      const a = sec[j], b = sec[j + 1];
      if (x <= a[0] && x >= b[0]) {
        const t = (a[0] - x) / Math.max(1e-6, a[0] - b[0]);
        return [x, lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      }
    }
    return sec[NA - 1].slice();
  }

  /** 13-point section used by add-on parts (index 6 = shoulder). */
  compatSection(s: number): number[][] {
    const sec = this.section(s);
    const sj = this.info(s).shoulder;
    const out: number[][] = [];
    for (let k = 0; k <= 6; k++) out.push(sec[Math.round((sj * k) / 6)]);
    for (let k = 1; k <= 6; k++) out.push(sec[Math.round(sj + ((NA - 1 - sj) * k) / 6)]);
    return out;
  }

  /** z of the front/rear end surface at (x, y), scanning inward from the tip; NaN if not on the end face. */
  endZ(x: number, y: number, front: boolean, maxS = 0.16): number {
    const ax = Math.abs(x);
    const zAt = (ss: number): number => {
      const sec = this.section(ss);
      if (y < sec[0][1] - 0.002 || y > sec[NA - 1][1] + 0.002) return NaN;
      for (let j = 1; j < NA; j++) {
        const a = sec[j - 1], b = sec[j];
        if ((y >= a[1] && y <= b[1]) || (y <= a[1] && y >= b[1])) {
          const t = (y - a[1]) / Math.max(1e-5, b[1] - a[1]);
          if (ax <= lerp(a[0], b[0], t) + 1e-4) return lerp(a[2], b[2], t);
        }
      }
      return NaN;
    };
    let prev = -1;
    for (let s = 0; s <= maxS; s += 0.0025) {
      const z = zAt(front ? s : 1 - s);
      if (!isNaN(z)) {
        if (prev < 0) return z;
        // refine between the last miss and this hit
        let a = prev, b = s, zb = z;
        for (let k = 0; k < 6; k++) {
          const m = (a + b) / 2;
          const zm = zAt(front ? m : 1 - m);
          if (isNaN(zm)) a = m; else { b = m; zb = zm; }
        }
        return zb;
      }
      prev = s;
    }
    return NaN;
  }

  /** True if (x, y, z) lies inside the body (half-section point-in-polygon at that station). */
  inside(x: number, y: number, z: number): boolean {
    const s = this.sOf(z);
    if (s < 0 || s > 1) return false;
    const sec = this.section(s);
    const px = Math.abs(x);
    let c = false;
    for (let j = 0, k = NA - 1; j < NA; k = j++) {
      const a = sec[j], b = sec[k];
      if ((a[1] > y) !== (b[1] > y) && px < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }

  /** First body-surface hit along o + t·d (d normalised), or null. */
  raycast(o: number[], d: number[], maxT = 1, step = 0.008): number[] | null {
    const at = (t: number) => [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    let prev = 0;
    for (let t = step; t <= maxT; t += step) {
      const p = at(t);
      if (this.inside(p[0], p[1], p[2])) {
        let a = prev, b = t;
        for (let k = 0; k < 9; k++) { const m = (a + b) / 2; const q = at(m); if (this.inside(q[0], q[1], q[2])) b = m; else a = m; }
        return at((a + b) / 2);
      }
      prev = t;
    }
    return null;
  }

  /** Distance of the end surface behind the tip at (x, y): 0 at the very nose/tail, NaN off the face. */
  setback(x: number, y: number, front: boolean): number {
    const z = this.endZ(x, y, front, 0.3);
    return isNaN(z) ? NaN : front ? this.zF - z : z - this.zR;
  }

  private faceCache = new Map<string, FaceInfo>();

  /**
   * Layout of the front or rear face as seen along the car's axis: the height where the near-vertical face
   * turns into the hood / deck (`yTop`), its lowest point (`yBot`) and its half width at a given height.
   */
  face(front: boolean): FaceInfo {
    const key = front ? 'f' : 'r';
    const hit = this.faceCache.get(key);
    if (hit) return hit;
    const lim = front ? 0.13 : 0.17;
    let yBot = NaN, yTop = NaN, yMin = Infinity, sbMin = Infinity;
    for (let y = this.base; y < this.H; y += 0.01) {
      const sb = this.setback(0, y, front);
      if (isNaN(sb)) { if (!isNaN(yBot) && y > yMin + 0.1) break; continue; }
      if (isNaN(yBot) && sb < 0.3) yBot = y;
      if (sb < sbMin) { sbMin = sb; yMin = y; }
      if (!isNaN(yBot) && y > yMin && sb > sbMin + lim) { yTop = y; break; }
    }
    if (isNaN(yBot)) yBot = this.bottom(front ? 0.01 : 0.99);
    if (isNaN(yTop)) yTop = front ? this.top(0.04) - 0.04 : this.top(0.96) - 0.04;
    const widthCache = new Map<number, number>();
    const halfW = (y: number, maxSb = 0.24) => {
      const k = Math.round(y * 100) * 1000 + Math.round(maxSb * 100);
      const c = widthCache.get(k);
      if (c !== undefined) return c;
      let w = 0;
      for (let x = 0; x < this.w0 + 0.1; x += 0.01) {
        const sb = this.setback(x, y, front);
        if (isNaN(sb) || sb > maxSb) break;
        w = x;
      }
      widthCache.set(k, w);
      return w;
    };
    const info: FaceInfo = { yBot, yTop, yMin, halfW };
    this.faceCache.set(key, info);
    return info;
  }

  /** Outward normal of the end surface at (x, y), from finite differences of the setback. */
  faceNormal(x: number, y: number, front: boolean): number[] {
    const e = 0.02;
    const zc = this.endZ(x, y, front, 0.3);
    const zx = this.endZ(x + e, y, front, 0.3), zy = this.endZ(x, y + e, front, 0.3);
    const zx2 = this.endZ(x - e, y, front, 0.3), zy2 = this.endZ(x, y - e, front, 0.3);
    const dzdx = !isNaN(zx) && !isNaN(zx2) ? (zx - zx2) / (2 * e) : !isNaN(zx) && !isNaN(zc) ? (zx - zc) / e : 0;
    const dzdy = !isNaN(zy) && !isNaN(zy2) ? (zy - zy2) / (2 * e) : !isNaN(zy) && !isNaN(zc) ? (zy - zc) / e : 0;
    const n = front ? [-dzdx, -dzdy, 1] : [dzdx, dzdy, -1];
    const l = Math.hypot(n[0], n[1], n[2]);
    return [n[0] / l, n[1] / l, n[2] / l];
  }

  stations(): number[] {
    const out: number[] = [];
    const n = 120;
    for (let i = 0; i <= n; i++) out.push(i / n);
    const sh = this.sh;
    for (const b of [this.hoodStart, sh.wsBase, sh.roofStart, sh.roofEnd, sh.rearGlassBase, sh.sideWindowEnd, sh.wsBase + 0.018, this.sArchFront, this.sArchRear]) out.push(b - 0.0012, b + 0.0012);
    if (sh.bPillar > 0) out.push(sh.bPillar - 0.011, sh.bPillar + 0.011);
    for (const za of [this.zFA, this.zRA]) for (let k = -12; k <= 12; k++) out.push(this.sOf(za + (k / 12) * (this.archR + 0.08)));
    return Array.from(new Set(out.map((x) => Math.round(x * 100000) / 100000))).filter((x) => x >= 0 && x <= 1).sort((a, b) => a - b);
  }
}
