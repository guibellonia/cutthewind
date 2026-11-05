// Procedural body description (v2). Car-local coordinates: +Z forward, +Y up, +X = car's left side.
// Origin on the ground, midway between the axles. The car is assembled from distinct parts:
// a lower body (monocoque below the beltline), a separate cabin (greenhouse), bumpers, fender
// flares and skirts. This class provides the shared geometric description all parts are built from.
import type { CarModel, ShapeParams, VisualConfig } from '../core/types';
import { visualPart } from '../data/visualParts';
import { monotoneCurve } from '../sim/vehicle';

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
  /** centreline top profile (nose → hood → windshield → roof → rear glass → deck → tail) */
  readonly prof: (s: number) => number;
  readonly H: number;

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
    this.hoodStart = Math.max(0.035, sh.noseRound * 0.45);
    this.H = model.height;
    this.hoodCrown = Math.max(0.035, Math.min(0.07, sh.hoodCrown + 0.015));
    // Longitudinal centreline profile. Landmark shape follows the median of 28 real sedans/coupes
    // (ShapeNetCar reference set), warped to each model's stations and heights.
    {
      const H = this.H;
      const ws = sh.wsBase, rs = sh.roofStart, re = sh.roofEnd, rg = sh.rearGlassBase;
      const hatch = rg > 0.93;
      const nose = sh.noseH, hood = sh.hoodH, roof = sh.roofH, deck = sh.deckH, tail = sh.tailH;
      const flatNose = sh.frontTaper > 0.62;
      const hf = nose + (hood - nose) * (flatNose ? 0.45 : 0.57);
      const d = rs - ws, r = roof - hood, g = rg - re;
      const reY = roof - 0.03 * H;
      const pts: [number, number][] = [
        [0, nose],
        [0.016, nose + (hf - nose) * (flatNose ? 0.55 : 0.3)],
        [0.038, nose + (hf - nose) * (flatNose ? 0.92 : 0.74)],
        [0.065, hf],
        [ws, hood],
        [ws + 0.25 * d, hood + 0.26 * r],
        [ws + 0.5 * d, hood + 0.54 * r],
        [ws + 0.78 * d, hood + 0.86 * r],
        [rs, roof - 0.012 * H],
        [rs + 0.42 * (re - rs), roof],
        [re, reY],
      ];
      if (hatch) {
        pts.push([re + 0.45 * g, reY + (deck - reY) * 0.38], [rg, deck], [1, deck - 0.07 * H]);
      } else {
        pts.push([re + 0.35 * g, reY + (deck - reY) * 0.3], [re + 0.7 * g, reY + (deck - reY) * 0.7], [rg, deck]);
        pts.push([rg + (0.97 - rg) * 0.55, deck - (deck - tail) * 0.55], [0.97, tail], [0.99, tail - 0.07 * H], [1, tail - 0.13 * H]);
      }
      for (let i = 1; i < pts.length; i++) if (pts[i][0] <= pts[i - 1][0]) pts[i][0] = pts[i - 1][0] + 0.003;
      this.prof = monotoneCurve(pts.map((p) => p[0]), pts.map((p) => p[1]));
    }
    const faceLights = sh.lightMount === 'face';
    this.fBumperTop = sh.noseH - (faceLights ? 0.2 : 0.055);
    const tailTip = this.prof(1);
    this.rBumperTop = sh.sill + 0.16 + (tailTip - sh.sill - 0.16) * 0.42;
    this.sArchFront = this.sOf(this.zFA + this.archR + 0.03);
    this.sArchRear = this.sOf(this.zRA - this.archR - 0.03);
  }

  z(s: number) { return this.zF - s * this.L; }
  sOf(z: number) { return (this.zF - z) / this.L; }

  plan(s: number): number {
    const sh = this.sh;
    let f = 1;
    if (s < sh.noseRound) {
      const u = 1 - s / sh.noseRound;
      f = sh.frontTaper + (1 - sh.frontTaper) * (1 - u * u);
    } else if (s > 1 - sh.tailRound) {
      const u = 1 - (1 - s) / sh.tailRound;
      f = sh.rearTaper + (1 - sh.rearTaper) * (1 - u * u);
    }
    // subtle "coke bottle": fuller over the front fenders and rear haunches
    const z = this.z(s);
    const hump = (za: number, span: number) => Math.max(0, 1 - ((z - za) / span) ** 2);
    f *= 0.975 + 0.025 * Math.max(hump(this.zFA, 0.9), hump(this.zRA, 1.1));
    return f;
  }

  halfWidth(s: number) { return this.w0 * this.plan(s); }

  /** Shoulder (beltline) height. */
  belt(s: number): number {
    const sh = this.sh;
    const ws = sh.wsBase, rg = sh.rearGlassBase;
    let y: number;
    if (s <= ws) {
      const k = sstep(0, 0.09, s);
      y = this.prof(s) - this.hoodCrown * k - 0.014 * (1 - k);
    } else if (s >= rg) {
      y = this.prof(s) - this.deckCrown * (1 - 0.5 * sstep(0.95, 1, s));
    } else {
      const b0 = this.prof(ws) - this.hoodCrown, b1 = this.prof(rg) - this.deckCrown;
      y = lerp(b0, b1, (s - ws) / (rg - ws));
    }
    if (this.k.duck > 0) y += this.k.duck * sstep(0.88, 0.995, s);
    return y;
  }

  /** Top surface centreline (lower body). Under the cabin it sits just above the beltline. */
  top(s: number): number {
    const sh = this.sh;
    let y: number;
    if (s <= sh.wsBase || s >= sh.rearGlassBase) y = this.prof(s);
    else y = this.belt(s) + this.cabinCrown;
    if (this.k.duck > 0 && s > sh.rearGlassBase) y += this.k.duck * sstep(0.88, 0.995, s);
    return y;
  }

  /** Crown of the top surface above the shoulder line. */
  crown(s: number): number {
    return Math.max(0.006, this.top(s) - this.belt(s));
  }

  bottom(s: number): number {
    const sh = this.sh;
    let y = sh.sill + 0.06 * (1 - sstep(0.0, 0.08, s)) + 0.17 * sstep(0.88, 1.0, s) ** 1.4;
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
    return Math.max(this.prof(s), this.belt(s) + this.cabinCrown + 0.004);
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
