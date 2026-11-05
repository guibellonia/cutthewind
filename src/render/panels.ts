// Body panel layout: shut lines of the bumpers, fenders, doors, skirts, hood and trunk lid, door handles and
// the fuel door. Drawn twice in atlas space: into the paint (dark gaps that also cut through vinyls) and
// into a height map that becomes a normal map, so the gaps read as real grooves under the clear coat.
import * as THREE from 'three';
import type { CarModel, VisualConfig } from '../core/types';
import { visualPart } from '../data/visualParts';
import type { BodyShape } from './bodyShape';
import { ATLAS, SIDE_H, SIDE_REF_H, TOP_H, TOP_REF_W, TOP_Y0 } from './bodyMesh';
import { canvas, headlightBox, taillightBox, tex } from './textures';

type P2 = [number, number];
type Ctx = CanvasRenderingContext2D;

export interface PanelLayout {
  /** polylines on the body side in (s, y), drawn on both sides */
  side: P2[][];
  /** polylines on the top surfaces in (s, x) */
  top: P2[][];
  /** recessed door-handle pockets: centre (s, y), size in metres */
  handles: { s: number; y: number; w: number; h: number }[];
  /** fuel door on the car's right side */
  fuel: { s: number; y: number; r: number } | null;
  /** feature line along the shoulder (s, y) */
  crease: P2[];
  /** heights shared with the end decals */
  frontSeamY: number;
  rearSeamY: number;
  lidHalfW: number;
  bodyL: number;
}

const layoutCache = new WeakMap<BodyShape, PanelLayout>();

export function panelLayout(shape: BodyShape, model: CarModel, v: VisualConfig): PanelLayout {
  const hit = layoutCache.get(shape);
  if (hit) return hit;
  const sh = shape.sh;
  const L = shape.L;
  const sOf = (z: number) => shape.sOf(z);
  const side: P2[][] = [], top: P2[][] = [];
  const hb = headlightBox(shape, model, v);
  const tb = taillightBox(shape);
  const F = shape.face(true);
  const ra = shape.archR + 0.012;

  // rocker / skirt seam between the arches
  const sA0 = sOf(shape.zFA - shape.archR - 0.02), sA1 = sOf(shape.zRA + shape.archR + 0.02);
  let ySill = Infinity;
  for (let s = sA0; s <= sA1; s += 0.02) ySill = Math.min(ySill, shape.bottom(s));
  ySill += 0.115 - (shape.k.skirtDrop > 0 ? shape.k.skirtDrop * 0.5 : 0);
  side.push([[sA0, ySill], [sA1, ySill]]);

  // front bumper / fender: from the arch (about 40° up its front edge) up to just under the headlight, then forward
  const frontSeamY = hb.yc - hb.h / 2 - 0.018;
  {
    const phi = (40 * Math.PI) / 180;
    const a: P2 = [sOf(shape.zFA + ra * Math.cos(phi)), shape.wheelY + ra * Math.sin(phi)];
    const zl = shape.endZ(hb.xo, frontSeamY, true, 0.3);
    const sLamp = isNaN(zl) ? 0.05 : Math.max(0.015, (shape.zF - zl) / L + 0.012);
    const b: P2 = [Math.min(a[0] - 0.01, sLamp + 0.015), frontSeamY];
    side.push([a, [lerp(a[0], b[0], 0.55), lerp(a[1], b[1], 0.8)], b, [0.0, frontSeamY]]);
  }
  // rear bumper / quarter: from the arch's rear-top up to under the taillights, then backward
  const rearSeamY = tb.yc - tb.h / 2 - 0.012;
  {
    const phi = (140 * Math.PI) / 180;
    const a: P2 = [sOf(shape.zRA + ra * Math.cos(phi)), shape.wheelY + ra * Math.sin(phi)];
    const zl = shape.endZ(tb.xo, rearSeamY, false, 0.3);
    const sLamp = isNaN(zl) ? 0.95 : Math.min(0.985, 1 - (zl - shape.zR) / L - 0.012);
    const b: P2 = [Math.max(a[0] + 0.01, sLamp - 0.015), rearSeamY];
    side.push([a, [lerp(a[0], b[0], 0.55), lerp(a[1], b[1], 0.8)], b, [1.0, rearSeamY]]);
  }

  // doors
  const handles: PanelLayout['handles'] = [];
  const beltAt = (s: number) => shape.belt(s);
  const d0 = Math.max(sh.wsBase - 0.004, sOf(shape.zFA - shape.archR - 0.07));
  side.push([[d0, ySill], [d0 - 0.004, beltAt(d0) + 0.012]]);
  const archCut = (sEnd: number): P2[] => {
    // rear edge of the last door: down from the belt, following the rear arch when it gets in the way
    const R = shape.archR + 0.05;
    const zEnd = shape.z(sEnd);
    const pts: P2[] = [[sEnd, beltAt(sEnd) + 0.01]];
    if (zEnd > shape.zRA + R * 0.98) { pts.push([sEnd, ySill]); return pts; }
    const phiTop = Math.acos(Math.max(-1, Math.min(1, (zEnd - shape.zRA) / R)));
    const yTop = shape.wheelY + R * Math.sin(phiTop);
    pts.push([sEnd, yTop]);
    for (let k = 1; k <= 10; k++) {
      const phi = phiTop * (1 - k / 10);
      const y = shape.wheelY + R * Math.sin(phi);
      if (y < ySill) break;
      pts.push([sOf(shape.zRA + R * Math.cos(phi)), y]);
    }
    return pts;
  };
  if (sh.bPillar > 0) {
    const d1 = sh.bPillar + 0.004;
    side.push([[d1, ySill], [d1 + 0.002, beltAt(d1) + 0.012]]);
    const d2 = Math.min(sh.sideWindowEnd + 0.008, sh.rearGlassBase - 0.01);
    side.push(archCut(d2));
    handles.push({ s: d1 - 0.035, y: beltAt(d1) - 0.07, w: 0.13, h: 0.028 }, { s: d2 - 0.035, y: beltAt(d2) - 0.07, w: 0.13, h: 0.028 });
  } else {
    const d1 = Math.min(sh.sideWindowEnd + 0.006, sOf(shape.zRA + shape.archR + 0.1));
    side.push(archCut(d1));
    handles.push({ s: d1 - 0.04, y: beltAt(d1) - 0.07, w: 0.13, h: 0.028 });
  }

  // hood: front edge where the nose turns onto the top, sides inboard of the fender tops, cowl at the screen
  {
    const zt = shape.endZ(0, F.yTop + 0.01, true, 0.3);
    const sHF = Math.max(0.02, Math.min(0.12, isNaN(zt) ? 0.05 : (shape.zF - zt) / L + 0.006));
    const sCowl = sh.wsBase - 0.012;
    const hx = (s: number) => {
      let a = 0;
      for (const d of [-0.03, -0.015, 0, 0.015, 0.03]) a += shape.shoulderPoint(Math.min(sh.wsBase, Math.max(0.01, s + d)))[0];
      return Math.max(0.2, a / 5 - 0.07);
    };
    const n = 16;
    for (const sg of [1, -1]) {
      const line: P2[] = [];
      for (let i = 0; i <= n; i++) { const s = lerp(sHF + 0.004, sCowl, i / n); line.push([s, sg * hx(s)]); }
      top.push(line);
    }
    const front: P2[] = [];
    const w0 = hx(sHF + 0.004);
    for (let i = 0; i <= n; i++) { const x = lerp(-w0, w0, i / n); front.push([sHF + 0.004 - 0.006 * (1 - (x / w0) ** 2), x]); }
    top.push(front);
    const cw = hx(sCowl);
    top.push([[sCowl, -cw], [sCowl, cw]]);
  }

  // trunk lid / hatch
  const lidHalfW = Math.max(0.2, tb.xi - 0.012);
  {
    const hatch = sh.rearGlassBase > 0.93;
    const sT = hatch ? sh.roofEnd + 0.004 : sh.rearGlassBase + 0.012;
    const lx = (s: number) => {
      if (hatch && s < sh.rearGlassBase) return Math.max(0.2, shape.cabinEdge(s)[0] - 0.008);
      const t = Math.min(1, Math.max(0, (s - sT) / Math.max(0.02, 0.99 - sT)));
      return lerp(Math.max(lidHalfW, shape.shoulderPoint(s)[0] - 0.09), lidHalfW, t);
    };
    const n = 14;
    for (const sg of [1, -1]) {
      const line: P2[] = [];
      for (let i = 0; i <= n; i++) { const s = lerp(sT, 0.995, i / n); line.push([s, sg * lx(s)]); }
      top.push(line);
    }
    top.push([[sT, -lx(sT)], [sT, lx(sT)]]);
  }

  // fuel door above the rear arch (right side)
  const fs = sOf(shape.zRA + 0.05);
  const fuel = { s: fs, y: Math.min(beltAt(fs) - 0.1, shape.wheelY + shape.archR + 0.16), r: 0.075 };

  // shoulder feature line
  const crease: P2[] = [];
  for (let s = 0.06; s <= 0.95; s += 0.01) crease.push([s, shape.shoulderPoint(s)[1] - 0.012]);
  for (let i = 2; i < crease.length - 2; i++) crease[i][1] = (crease[i - 2][1] + crease[i - 1][1] + crease[i][1] + crease[i + 1][1] + crease[i + 2][1]) / 5;

  const out = { side, top, handles, fuel, crease, frontSeamY, rearSeamY, lidHalfW, bodyL: L };
  layoutCache.set(shape, out);
  return out;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------------------------------- atlas drawing

const SX = (s: number, right: boolean) => (right ? 1 - s : s) * ATLAS;
const SY = (y: number, right: boolean) => (right ? SIDE_H : 0) + (1 - y / SIDE_REF_H) * SIDE_H;
const TX = (s: number) => s * ATLAS;
const TY = (x: number) => TOP_Y0 + (0.5 - x / TOP_REF_W) * TOP_H;

function strokeAll(ctx: Ctx, L: PanelLayout, width: number, style: string, dy = 0) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  for (const right of [false, true]) {
    for (const line of L.side) {
      ctx.beginPath();
      line.forEach(([s, y], i) => (i ? ctx.lineTo(SX(s, right), SY(y, right) + dy) : ctx.moveTo(SX(s, right), SY(y, right) + dy)));
      ctx.stroke();
    }
    if (L.fuel && right) { ctx.beginPath(); ctx.arc(SX(L.fuel.s, true), SY(L.fuel.y, true) + dy, (L.fuel.r / SIDE_REF_H) * SIDE_H, 0, Math.PI * 2); ctx.stroke(); }
  }
  for (const line of L.top) {
    ctx.beginPath();
    line.forEach(([s, x], i) => (i ? ctx.lineTo(TX(s), TY(x) + dy) : ctx.moveTo(TX(s), TY(x) + dy)));
    ctx.stroke();
  }
  ctx.restore();
}

function handleRects(L: PanelLayout, right: boolean) {
  return L.handles.map((h) => {
    const w = (h.w / L.bodyL) * ATLAS, hh = (h.h / SIDE_REF_H) * SIDE_H;
    return { x: SX(h.s, right) - w / 2, y: SY(h.y, right) - hh / 2, w, h: hh };
  });
}

/** Paint-side rendering: dark gaps with a faint lit lip, door handles, widebody seams/rivets. */
export function drawPanelLines(ctx: Ctx, shape: BodyShape, model: CarModel, v: VisualConfig) {
  const L = panelLayout(shape, model, v);
  strokeAll(ctx, L, 4.5, 'rgba(0,0,0,0.28)');
  strokeAll(ctx, L, 2.4, 'rgba(4,4,6,0.92)');
  strokeAll(ctx, L, 1, 'rgba(255,255,255,0.16)', -2.2);
  for (const right of [false, true]) {
    for (const r of handleRects(L, right)) {
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.6, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, r.h / 2); ctx.fill();
      ctx.fillStyle = 'rgba(210,216,224,0.5)';
      ctx.fillRect(r.x + r.w * 0.12, r.y + r.h * 0.35, r.w * 0.76, Math.max(1.5, r.h * 0.28));
    }
  }
  // widebody seams / rivets
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineWidth = 2.5;
  for (const [slot, za] of [['frontFenders', shape.zFA], ['rearFenders', shape.zRA]] as const) {
    const p = visualPart(slot, (v as unknown as Record<string, string>)[slot]).p;
    if (!p.seam && !p.rivets) continue;
    const sc = shape.sOf(za);
    const R = shape.archR + (p.flare ?? 0) * 0.35 + 0.07;
    for (const right of [false, true]) {
      const cxp = SX(sc, right), cyp = SY(shape.wheelY, right);
      const rx = (R / shape.L) * ATLAS, ry = (R / SIDE_REF_H) * SIDE_H;
      if (p.seam) { ctx.beginPath(); ctx.ellipse(cxp, cyp, rx, ry, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); }
      if (p.rivets) {
        ctx.fillStyle = '#c9ced4';
        for (let k = 0; k <= 10; k++) {
          const a = Math.PI * (1.06 + (k / 10) * 0.88);
          ctx.beginPath(); ctx.arc(cxp + Math.cos(a) * rx * 0.94, cyp + Math.sin(a) * ry * 0.94, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

/** Tangent-space normal map of the panel gaps, handle pockets and shoulder crease (atlas layout). */
export function panelNormalMap(shape: BodyShape, model: CarModel, v: VisualConfig): THREE.CanvasTexture {
  const L = panelLayout(shape, model, v);
  const N = ATLAS / 2;
  const [hc, h] = canvas(N, N, true);
  h.fillStyle = 'rgb(128,128,128)';
  h.fillRect(0, 0, N, N);
  h.save();
  h.scale(0.5, 0.5);
  h.strokeStyle = 'rgb(160,160,160)';
  h.lineWidth = 8;
  for (const right of [false, true]) {
    h.beginPath();
    L.crease.forEach(([s, y], i) => (i ? h.lineTo(SX(s, right), SY(y, right)) : h.moveTo(SX(s, right), SY(y, right))));
    h.stroke();
  }
  strokeAll(h, L, 4, 'rgb(20,20,20)');
  for (const right of [false, true]) for (const r of handleRects(L, right)) { h.fillStyle = 'rgb(40,40,40)'; h.beginPath(); h.roundRect(r.x, r.y, r.w, r.h, r.h / 2); h.fill(); }
  h.restore();
  // height → separable [1 2 1] blur (twice) → central differences
  const src = h.getImageData(0, 0, N, N).data;
  let A = new Float32Array(N * N), B = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) A[i] = src[i * 4];
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < N; y++) { const o = y * N; for (let x = 0; x < N; x++) B[o + x] = (A[o + Math.max(0, x - 1)] + 2 * A[o + x] + A[o + Math.min(N - 1, x + 1)]) * 0.25; }
    for (let y = 0; y < N; y++) { const o = y * N, up = Math.max(0, y - 1) * N, dn = Math.min(N - 1, y + 1) * N; for (let x = 0; x < N; x++) A[o + x] = (B[up + x] + 2 * B[o + x] + B[dn + x]) * 0.25; }
  }
  const out = h.createImageData(N, N);
  const d = out.data;
  const k = 2.6 / 255;
  for (let y = 0; y < N; y++) {
    const o = y * N, up = Math.max(0, y - 1) * N, dn = Math.min(N - 1, y + 1) * N;
    for (let x = 0; x < N; x++) {
      const dx = (A[o + Math.min(N - 1, x + 1)] - A[o + Math.max(0, x - 1)]) * k;
      const dy = (A[dn + x] - A[up + x]) * k; // canvas rows run toward -v
      const il = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (o + x) * 4;
      d[i] = (-dx * il * 0.5 + 0.5) * 255; d[i + 1] = (dy * il * 0.5 + 0.5) * 255; d[i + 2] = (il * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  void B; B = A;
  h.putImageData(out, 0, 0);
  const t = tex(hc, false);
  t.anisotropy = 8;
  return t;
}
