// Procedural body description (v2). Car-local coordinates: +Z forward, +Y up, +X = car's left side.
// Origin on the ground, midway between the axles. The car is assembled from distinct parts:
// a lower body (monocoque below the beltline), a separate cabin (greenhouse), bumpers, fender
// flares and skirts. This class provides the shared geometric description all parts are built from.
import type { CarModel, ShapeParams, VisualConfig } from '../core/types';
import { visualPart } from '../data/visualParts';

export const SEC_N = 13; // points per half section of the lower body
export const P_SHOULDER = 6;
const TOP_U = [0.1, 0.28, 0.48, 0.68, 0.86, 1.0];

export const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

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

export class BodyShape {
  readonly m: CarModel;
  readonly sh: ShapeParams;
  readonly k: KitParams;
  readonly L: number;
  readonly W: number;
  readonly zF: number;
  readonly zR: number;
  readonly zFA: number;
  readonly zRA: number;
  readonly archR: number;
  readonly wheelY: number;
  readonly w0: number;
  readonly hoodStart: number;
  /** total fender flare (stock + kit), metres */
  readonly flareF: number;
  readonly flareR: number;
  readonly hoodCrown: number;
  readonly deckCrown = 0.028;
  readonly cabinCrown = 0.012;
  readonly fBumperTop: number;
  readonly rBumperTop: number;
  readonly sArchFront: number; // s at the front edge of the front arch
  readonly sArchRear: number; // s at the rear edge of the rear arch
  private sA: number;
  private yA: number;
  private yBr: number;

  constructor(model: CarModel, kit: KitParams) {
    this.m = model;
    this.sh = model.shape;
    this.k = kit;
    const sh = this.sh;
    this.L = model.length;
    this.W = model.width;
    this.zFA = model.wheelbase / 2;
    this.zRA = -model.wheelbase / 2;
    this.zF = this.zFA + model.frontOverhang;
    this.zR = this.zF - this.L;
    const tr = (model.stockWheelSize * 0.0254) / 2 + (model.stockTireWidth * model.stockTireProfile) / 100000;
    this.wheelY = tr;
    this.archR = Math.max(0.33, tr + 0.04);
    this.flareF = Math.max(0.012, sh.fenderF + kit.flareF);
    this.flareR = Math.max(0.012, sh.fenderR + kit.flareR);
    this.w0 = this.W / 2 - Math.max(sh.fenderF, sh.fenderR, 0.012) - 0.004;
    this.hoodStart = Math.max(0.035, sh.noseRound * 0.55);
    this.sA = Math.max(0.09, sh.noseRound * 1.25);
    this.yA = sh.beltF;
    this.yBr = sh.deckH - this.deckCrown;
    this.hoodCrown = 0.04;
    this.hoodCrown = Math.min(0.07, Math.max(0.018, sh.hoodH - this.beltRaw(sh.wsBase)));
    const faceLights = sh.lightMount === 'face';
    this.fBumperTop = sh.noseH - (faceLights ? 0.2 : 0.13);
    this.rBumperTop = sh.sill + 0.1 + (sh.tailH - sh.sill - 0.1) * 0.4;
    this.sArchFront = this.sOf(this.zFA + this.archR + 0.03);
    this.sArchRear = this.sOf(this.zRA - this.archR - 0.03);
  }

  z(s: number) { return this.zF - s * this.L; }
  sOf(z: number) { return (this.zF - z) / this.L; }

  plan(s: number): number {
    const sh = this.sh;
    let f = 1;
    const p = 2.4;
    if (s < sh.noseRound) {
      const u = 1 - s / sh.noseRound;
      f = sh.frontTaper + (1 - sh.frontTaper) * Math.pow(Math.max(0, 1 - Math.pow(u, p)), 1 / p);
    } else if (s > 1 - sh.tailRound) {
      const u = 1 - (1 - s) / sh.tailRound;
      f = sh.rearTaper + (1 - sh.rearTaper) * Math.pow(Math.max(0, 1 - Math.pow(u, p)), 1 / p);
    }
    f *= 1 - 0.025 * clamp01((0.35 - s) / 0.35);
    return f;
  }

  halfWidth(s: number) { return this.w0 * this.plan(s); }

  private beltRaw(s: number): number {
    const sh = this.sh;
    const sA = this.sA, sB = sh.rearGlassBase;
    const slope = (this.yBr - this.yA) / Math.max(0.2, sB - sA);
    if (s <= sA) {
      const t = s / sA;
      const y0 = sh.noseH - 0.03;
      return y0 + (this.yA - y0) * (1 - (1 - t) * (1 - t));
    }
    if (s <= sB) return this.yA + slope * (s - sA);
    let y = this.yBr + slope * 0.25 * (s - sB);
    const sT = 1 - sh.tailRound * 1.4;
    if (s > sT) {
      const t = (s - sT) / (1 - sT);
      y -= Math.max(0.055, this.yBr - (sh.tailH - this.deckCrown)) * t * t;
    }
    return y;
  }

  /** Shoulder (beltline) height. */
  belt(s: number): number {
    let y = this.beltRaw(s);
    if (this.k.duck > 0) y += this.k.duck * sstep(0.88, 0.995, s);
    return y;
  }

  /** Crown of the top surface above the shoulder line. */
  crown(s: number): number {
    const sh = this.sh;
    const hood = this.hoodCrown * sstep(0.0, this.sA, s);
    const tCab = sstep(sh.wsBase - 0.025, sh.wsBase + 0.005, s);
    const tDeck = sstep(sh.rearGlassBase - 0.005, sh.rearGlassBase + 0.025, s);
    let c = lerp(hood, this.cabinCrown, tCab);
    c = lerp(c, this.deckCrown * (1 - 0.6 * sstep(1 - sh.tailRound, 1, s)), tDeck);
    return c;
  }

  top(s: number) { return this.belt(s) + this.crown(s); }

  bottom(s: number): number {
    const sh = this.sh;
    let y = sh.sill + 0.06 * (1 - sstep(0.0, 0.08, s)) + 0.1 * sstep(0.9, 1.0, s);
    const z = this.z(s);
    for (const za of [this.zFA, this.zRA]) {
      const R = this.archR;
      const dz = z - za;
      if (Math.abs(dz) < R) y = Math.max(y, this.wheelY + Math.sqrt(R * R - dz * dz));
    }
    return Math.min(y, this.belt(s) - 0.06);
  }

  /** Fender flare amount near station s (used for wheel fitment). */
  flare(s: number): number {
    const z = this.z(s);
    const nearF = Math.abs(z - this.zFA) < this.archR * 1.2 ? this.flareF : 0;
    const nearR = Math.abs(z - this.zRA) < this.archR * 1.2 ? this.flareR : 0;
    return Math.max(nearF, nearR);
  }

  skirtOut(s: number): number {
    const z = this.z(s);
    const inside = z > this.zRA + this.archR && z < this.zFA - this.archR;
    return inside ? this.k.skirtOut : 0;
  }

  hoodBulgeAt(s: number, x: number, w: number): number {
    if (this.k.hoodBulge <= 0) return 0;
    const sh = this.sh;
    const along = sstep(this.hoodStart + 0.03, this.hoodStart + 0.14, s) * (1 - sstep(sh.wsBase - 0.02, sh.wsBase - 0.004, s));
    const ramp = 0.35 + 0.65 * sstep(this.hoodStart, sh.wsBase, s);
    const across = Math.max(0, 1 - Math.pow(Math.abs(x) / (w * 0.4), 4));
    return this.k.hoodBulge * along * ramp * across;
  }

  /** Lower-body half section (left side). Returns [x, y, z] for SEC_N points. */
  section(s: number): number[][] {
    const sh = this.sh;
    const yB = this.belt(s);
    const yb = this.bottom(s);
    const w = this.halfWidth(s);
    const cr = this.crown(s);
    const hb = Math.max(0.06, yB - yb);
    const shp = sh.shoulder;
    const pts: number[][] = [];
    pts.push([0, yb]);
    pts.push([Math.max(0.05, w - 0.11), yb]);
    pts.push([w - 0.03, yb + Math.min(0.012, hb * 0.1)]);
    pts.push([w - 0.007, yb + Math.min(0.065, hb * 0.3)]);
    pts.push([w, yb + hb * 0.6]);
    pts.push([w - 0.004 - 0.012 * (1 - shp), yB - Math.min(0.03, hb * 0.2)]);
    const xs = w - 0.016 - 0.03 * (1 - shp);
    pts.push([xs, yB]);
    for (const u of TOP_U) {
      const x = xs * (1 - u);
      const e = x / xs;
      let y = yB + cr * (1 - e * e);
      y += this.hoodBulgeAt(s, x, w);
      pts.push([x, y]);
    }
    const z = this.z(s);
    return pts.map(([x, y]) => [x, y, z]);
  }

  /** Body side x at height y for station s (interpolated on the side polyline). */
  sideX(s: number, y: number): number {
    const sec = this.section(s);
    for (let i = 2; i < P_SHOULDER; i++) {
      const a = sec[i], b = sec[i + 1];
      if (y >= a[1] && y <= b[1]) {
        const t = (y - a[1]) / Math.max(1e-5, b[1] - a[1]);
        return lerp(a[0], b[0], t);
      }
    }
    return y < sec[2][1] ? sec[2][0] : sec[P_SHOULDER][0];
  }

  // ------------------------------------------------------------------ cabin
  /** Cabin centreline height (windshield / roof / rear glass), for s in [wsBase, rearGlassBase]. */
  cabinTop(s: number): number {
    const sh = this.sh;
    const ws = sh.wsBase, rs = sh.roofStart, re = sh.roofEnd, rg = sh.rearGlassBase;
    const base0 = this.top(ws) + 0.004;
    const base1 = this.top(rg) + 0.004;
    if (s <= ws) return base0;
    if (s < rs) {
      const t = (s - ws) / (rs - ws);
      return base0 + (sh.roofH - base0) * (1 - Math.pow(1 - t, 1.55));
    }
    if (s <= re) {
      const t = (s - rs) / Math.max(1e-4, re - rs);
      return sh.roofH + 0.007 * Math.sin(Math.PI * t) - 0.004 * t;
    }
    if (s < rg) {
      const t = (s - re) / (rg - re);
      const fast = rg - re > 0.16 ? 1.25 : 1.6;
      return sh.roofH - 0.004 + (base1 - sh.roofH + 0.004) * Math.pow(t, fast);
    }
    return base1;
  }

  /** Cabin window-sill line (inset from the shoulder). */
  cabinBase(s: number): number[] {
    const w = this.halfWidth(s);
    const xs = w - 0.016 - 0.03 * (1 - this.sh.shoulder);
    return [xs - 0.045, this.top(s) - this.cabinCrown * 0.3, this.z(s)];
  }

  /** Roof-edge (top of the daylight opening) point on the left side. */
  cabinEdge(s: number): number[] {
    const sh = this.sh;
    const b = this.cabinBase(s);
    const t = this.cabinTop(s);
    const yE = Math.max(b[1], t - sh.roofCrown);
    const gh = sstep(0.0, 0.14, yE - b[1]);
    const xE = lerp(b[0], this.halfWidth(s) * sh.tumble, gh);
    return [xE, yE, b[2]];
  }

  /** Point on the top surface (cabin or lower body) at lateral position x (>= 0). */
  topPoint(s: number, x: number): number[] {
    const sh = this.sh;
    x = Math.abs(x);
    if (s > sh.wsBase + 0.004 && s < sh.rearGlassBase - 0.004) {
      const e = this.cabinEdge(s);
      if (x <= e[0]) {
        const t = this.cabinTop(s);
        const u = x / Math.max(1e-4, e[0]);
        return [x, t - (t - e[1]) * u * u, e[2]];
      }
    }
    const sec = this.section(s);
    for (let i = P_SHOULDER; i < SEC_N - 1; i++) {
      const a = sec[i], b = sec[i + 1];
      if (x <= a[0] && x >= b[0]) {
        const t = (a[0] - x) / Math.max(1e-6, a[0] - b[0]);
        return [x, lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      }
    }
    return x > sec[P_SHOULDER][0] ? sec[P_SHOULDER].slice() : sec[SEC_N - 1].slice();
  }

  stations(): number[] {
    const out: number[] = [];
    const n = 110;
    for (let i = 0; i <= n; i++) out.push(i / n);
    for (const s of [0.002, 0.006, 0.012, 0.02, 0.03, 0.97, 0.98, 0.988, 0.994, 0.998]) out.push(s);
    const sh = this.sh;
    for (const b of [this.hoodStart, sh.wsBase, sh.rearGlassBase, this.sArchFront, this.sArchRear]) out.push(b - 0.001, b + 0.001);
    return Array.from(new Set(out.map((x) => Math.round(x * 100000) / 100000))).filter((x) => x >= 0 && x <= 1).sort((a, b) => a - b);
  }

  cabinStations(): number[] {
    const sh = this.sh;
    const out: number[] = [];
    const n = 44;
    for (let i = 0; i <= n; i++) out.push(sh.wsBase + ((sh.rearGlassBase - sh.wsBase) * i) / n);
    const add = [sh.roofStart, sh.roofEnd, sh.sideWindowEnd, sh.wsBase + 0.016];
    if (sh.bPillar > 0) add.push(sh.bPillar - 0.011, sh.bPillar + 0.011);
    for (const b of add) out.push(b - 0.0012, b + 0.0012);
    return Array.from(new Set(out.map((x) => Math.round(x * 100000) / 100000))).filter((x) => x >= sh.wsBase && x <= sh.rearGlassBase).sort((a, b) => a - b);
  }
}
