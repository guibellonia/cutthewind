// Canvas-generated textures: carbon, headlights, front/rear end decals, vents, tyres, plates.
import * as THREE from 'three';
import type { CarModel, GrilleStyle, HeadlightStyle, TaillightStyle, VisualConfig } from '../core/types';
import { visualPart } from '../data/visualParts';
import { drawLogo } from './logos';
import type { BodyShape } from './bodyShape';
import { panelLayout } from './panels';

type Ctx = CanvasRenderingContext2D;

export function canvas(w: number, h: number, willReadFrequently = false): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently })!];
}

export function tex(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let carbonTile: HTMLCanvasElement | null = null;
export function carbonCanvas(): HTMLCanvasElement {
  if (carbonTile) return carbonTile;
  const [c, ctx] = canvas(32, 32);
  ctx.fillStyle = '#0d0e10';
  ctx.fillRect(0, 0, 32, 32);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const horiz = (x + y) % 2 === 0;
    const g = ctx.createLinearGradient(x * 8, y * 8, horiz ? x * 8 : x * 8 + 8, horiz ? y * 8 + 8 : y * 8);
    g.addColorStop(0, '#1d2024');
    g.addColorStop(0.5, '#3a3f46');
    g.addColorStop(1, '#16181b');
    ctx.fillStyle = g;
    ctx.fillRect(x * 8 + 0.5, y * 8 + 0.5, 7, 7);
  }
  carbonTile = c;
  return c;
}

export function fillCarbon(ctx: Ctx, x: number, y: number, w: number, h: number, scale = 1) {
  const pat = ctx.createPattern(carbonCanvas(), 'repeat')!;
  ctx.save();
  ctx.fillStyle = pat;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillRect(0, 0, w / scale, h / scale);
  ctx.restore();
}

let carbonTex: THREE.CanvasTexture | null = null;
export function carbonTexture(): THREE.CanvasTexture {
  if (carbonTex) return carbonTex;
  const [c, ctx] = canvas(128, 128);
  fillCarbon(ctx, 0, 0, 128, 128, 1);
  carbonTex = tex(c);
  carbonTex.wrapS = carbonTex.wrapT = THREE.RepeatWrapping;
  carbonTex.repeat.set(6, 6);
  return carbonTex;
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function chromeBowl(ctx: Ctx, x: number, y: number, r: number, tint = '#dfe6ee') {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, tint);
  g.addColorStop(0.8, '#5a6068');
  g.addColorStop(1, '#22262b');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function meshFill(ctx: Ctx, x: number, y: number, w: number, h: number, kind: 'mesh' | 'honey' | 'bars' | 'slats' = 'mesh', base = '#08090a', line = '#2c2f34') {
  ctx.save();
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.2;
  if (kind === 'bars' || kind === 'slats') {
    const n = Math.max(2, Math.round(h / (kind === 'bars' ? 7 : 9)));
    for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(x, y + (h * i) / n); ctx.lineTo(x + w, y + (h * i) / n); ctx.lineWidth = kind === 'slats' ? 3 : 1.6; ctx.strokeStyle = kind === 'slats' ? '#4a4f56' : line; ctx.stroke(); }
  } else if (kind === 'honey') {
    const s = 7;
    for (let yy = y; yy < y + h + s; yy += s * 0.86) for (let xx = x + ((Math.round((yy - y) / (s * 0.86)) % 2) * s) / 2; xx < x + w + s; xx += s) {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) ctx.lineTo(xx + Math.cos((k * Math.PI) / 3) * s * 0.5, yy + Math.sin((k * Math.PI) / 3) * s * 0.5);
      ctx.closePath(); ctx.stroke();
    }
  } else {
    for (let i = -h; i < w; i += 6) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + i + h, y); ctx.lineTo(x + i, y + h); ctx.stroke(); }
  }
  ctx.restore();
}

// --------------------------------------------------------------------------- HEADLIGHT PATCHES

const headCache = new Map<string, { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture }>();

/** Headlight texture for a corner patch. Left side orientation: u=0 inboard/top edge... drawn as seen from the front-left. */
export function headlightTextures(style: HeadlightStyle): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const hit = headCache.get(style);
  if (hit) return hit;
  const W = 256, H = 128;
  const [c, ctx] = canvas(W, H);
  const [e, ex] = canvas(W, H);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const housing = (shape: () => void, fill: string | CanvasGradient = '#1a1d22') => {
    // socket: the gap between the lamp and the body panels around it
    shape();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12; ctx.strokeStyle = '#020203'; ctx.stroke();
    ctx.fillStyle = fill; ctx.fill();
    ctx.save();
    shape(); ctx.clip();
    const sg = ctx.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(0.3, 'rgba(0,0,0,0)'); sg.addColorStop(0.85, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,0.18)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    shape();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(200,210,220,0.35)'; ctx.stroke();
  };
  const glow = (x: number, y: number, r: number, col = '#ffffff', a = 1) => {
    const g = ex.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(0.6, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ex.globalAlpha = a; ex.fillStyle = g; ex.beginPath(); ex.arc(x, y, r, 0, Math.PI * 2); ex.fill(); ex.globalAlpha = 1;
  };
  const glass = ctx.createLinearGradient(0, 0, 0, H);
  glass.addColorStop(0, '#5f6a75'); glass.addColorStop(0.5, '#2a3036'); glass.addColorStop(1, '#14171a');
  const darkGlass = ctx.createLinearGradient(0, 0, 0, H);
  darkGlass.addColorStop(0, '#2a2e33'); darkGlass.addColorStop(1, '#07080a');
  switch (style) {
    case 'dualRound':
    case 'projector':
    case 'angelEyes':
    case 'smoked': {
      housing(() => rrect(ctx, 10, 16, 236, 96, 40), style === 'smoked' ? darkGlass : glass);
      for (const x of [72, 180]) {
        chromeBowl(ctx, x, 64, 40, style === 'smoked' ? '#5a6068' : '#dfe6ee');
        ctx.fillStyle = style === 'projector' ? '#bfe0ff' : '#f6f9ff';
        ctx.beginPath(); ctx.arc(x, 64, style === 'projector' ? 18 : 12, 0, Math.PI * 2); ctx.fill();
        glow(x, 64, 34, '#fffbe8');
        if (style === 'angelEyes') {
          ctx.strokeStyle = '#d8f0ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, 64, 42, 0, Math.PI * 2); ctx.stroke();
          ex.strokeStyle = '#bfe6ff'; ex.lineWidth = 8; ex.beginPath(); ex.arc(x, 64, 42, 0, Math.PI * 2); ex.stroke();
        }
      }
      if (style === 'smoked') { ctx.fillStyle = 'rgba(0,0,0,0.45)'; rrect(ctx, 10, 16, 236, 96, 40); ctx.fill(); }
      break;
    }
    case 'dualOval': {
      housing(() => rrect(ctx, 10, 20, 236, 88, 40), glass);
      for (const x of [72, 180]) {
        ctx.save(); ctx.translate(x, 64); ctx.scale(1.35, 1); chromeBowl(ctx, 0, 0, 30); ctx.restore();
        ctx.fillStyle = '#f6f9ff'; ctx.beginPath(); ctx.ellipse(x, 64, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
        glow(x, 64, 32, '#fffbe8');
      }
      break;
    }
    case 'quadRound':
    case 'sealedRect': {
      housing(() => rrect(ctx, 6, 14, 244, 100, 10), '#121416');
      if (style === 'quadRound') {
        for (const x of [68, 188]) { chromeBowl(ctx, x, 64, 44); ctx.fillStyle = '#f0f4f8'; ctx.beginPath(); ctx.arc(x, 64, 12, 0, Math.PI * 2); ctx.fill(); glow(x, 64, 40, '#fff6dc'); }
      } else {
        const g = ctx.createLinearGradient(0, 20, 0, 108); g.addColorStop(0, '#e9eef3'); g.addColorStop(1, '#6b737c');
        ctx.fillStyle = g; rrect(ctx, 22, 24, 212, 80, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(40,46,52,0.6)'; ctx.lineWidth = 1.5;
        for (let x = 30; x < 230; x += 12) { ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, 102); ctx.stroke(); }
        glow(128, 64, 70, '#fff3d6', 0.9);
      }
      break;
    }
    case 'slimRect': {
      housing(() => { ctx.beginPath(); ctx.moveTo(8, 40); ctx.lineTo(248, 24); ctx.lineTo(244, 96); ctx.lineTo(14, 104); ctx.closePath(); }, glass);
      chromeBowl(ctx, 70, 66, 26);
      ctx.fillStyle = '#f6f9ff'; ctx.beginPath(); ctx.arc(70, 66, 10, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(110, 0, 240, 0); g.addColorStop(0, '#c9d1da'); g.addColorStop(1, '#68717b');
      ctx.fillStyle = g; ctx.fillRect(112, 44, 120, 46);
      ctx.fillStyle = '#ff9a1f'; ctx.fillRect(200, 78, 34, 10);
      glow(70, 66, 30, '#fffbe8'); glow(170, 66, 30, '#fff3d6', 0.6);
      break;
    }
    case 'trapezoid': {
      housing(() => { ctx.beginPath(); ctx.moveTo(6, 26); ctx.lineTo(250, 18); ctx.lineTo(230, 108); ctx.lineTo(28, 110); ctx.closePath(); }, glass);
      chromeBowl(ctx, 80, 64, 30);
      ctx.fillStyle = '#bfe0ff'; ctx.beginPath(); ctx.arc(80, 64, 15, 0, Math.PI * 2); ctx.fill();
      chromeBowl(ctx, 168, 62, 24);
      ctx.fillStyle = '#ff9a1f'; ctx.fillRect(206, 30, 34, 70);
      glow(80, 64, 32, '#ffffff'); glow(168, 62, 24, '#fff3d6', 0.7);
      break;
    }
    case 'teardrop': {
      housing(() => { ctx.beginPath(); ctx.moveTo(10, 64); ctx.quadraticCurveTo(40, 14, 150, 18); ctx.quadraticCurveTo(250, 22, 246, 64); ctx.quadraticCurveTo(250, 106, 150, 110); ctx.quadraticCurveTo(40, 112, 10, 64); ctx.closePath(); }, glass);
      chromeBowl(ctx, 176, 64, 30);
      ctx.fillStyle = '#f6f9ff'; ctx.beginPath(); ctx.arc(176, 64, 12, 0, Math.PI * 2); ctx.fill();
      chromeBowl(ctx, 96, 64, 22);
      glow(176, 64, 34, '#ffffff'); glow(96, 64, 22, '#fff3d6', 0.6);
      break;
    }
    case 'wideBar': {
      housing(() => rrect(ctx, 6, 30, 244, 70, 12), glass);
      for (const [x, w] of [[16, 110], [132, 108]] as const) {
        const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#dfe6ee'); g.addColorStop(1, '#5d656d');
        ctx.fillStyle = g; rrect(ctx, x, 40, w, 50, 6); ctx.fill();
        glow(x + w / 2, 65, 44, '#fff7e0', 0.85);
      }
      break;
    }
    case 'ledStrip': {
      housing(() => rrect(ctx, 8, 30, 240, 68, 16), '#0c0d0f');
      chromeBowl(ctx, 190, 64, 22, '#9aa3ad');
      ctx.fillStyle = '#e8f4ff'; ctx.beginPath(); ctx.arc(190, 64, 9, 0, Math.PI * 2); ctx.fill();
      glow(190, 64, 24, '#ffffff');
      for (let i = 0; i < 8; i++) {
        const x = 26 + i * 17;
        ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(x, 82, 4, 0, Math.PI * 2); ctx.fill();
        glow(x, 82, 9, '#cfe9ff');
      }
      break;
    }
    case 'blackQuad': {
      housing(() => rrect(ctx, 8, 24, 240, 80, 20), '#0b0c0e');
      for (let i = 0; i < 4; i++) {
        const x = 44 + i * 56;
        chromeBowl(ctx, x, 64, 20, '#8d96a0');
        ctx.fillStyle = '#e8f4ff'; ctx.beginPath(); ctx.arc(x, 64, 8, 0, Math.PI * 2); ctx.fill();
        glow(x, 64, 20, '#ffffff');
      }
      break;
    }
  }
  const r = { map: tex(c), emissive: tex(e) };
  headCache.set(style, r);
  return r;
}

// --------------------------------------------------------------------------- FRONT / REAR END DECALS
// The body ends come from real-car shells, so lights, grilles, intakes and plates are drawn into transparent
// textures in the car's own metric (x, y) frame and projected onto the front and rear faces.

export function resolveHeadlight(model: CarModel, v: VisualConfig): HeadlightStyle {
  const p = visualPart('headlights', v.headlights).p.style as string;
  if (p === 'stock') return model.shape.headlight;
  if (p === 'smoked') return 'smoked';
  return p as HeadlightStyle;
}
export function resolveTaillight(model: CarModel, v: VisualConfig): TaillightStyle {
  const p = visualPart('taillights', v.taillights).p.style as string;
  return p === 'stock' ? model.shape.taillight : (p as TaillightStyle);
}

export function drawPlate(ctx: Ctx, cx: number, cy: number, w: number, h: number, text: string, jp = false) {
  ctx.save();
  ctx.fillStyle = '#16181b';
  rrect(ctx, cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4, 3); ctx.fill();
  ctx.fillStyle = jp ? '#f2f2ea' : '#e9edf2';
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, 3); ctx.fill();
  ctx.fillStyle = '#1a2a6a';
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.16);
  ctx.fillStyle = '#16181b';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let px = h * 0.62;
  ctx.font = `bold ${px}px "Arial Narrow", Arial, sans-serif`;
  const mw = ctx.measureText(text).width;
  if (mw > w * 0.9) { px *= (w * 0.9) / mw; ctx.font = `bold ${px}px "Arial Narrow", Arial, sans-serif`; }
  ctx.fillText(text, cx, cy + h * 0.08);
  ctx.restore();
}

type Dark = (x0: number, y0: number, x1: number, y1: number, kind?: 'mesh' | 'honey' | 'bars' | 'slats', r?: number) => void;
function darkFn(ctx: Ctx, X: (m: number) => number, Y: (m: number) => number): Dark {
  return (x0, y0, x1, y1, kind = 'mesh', r = 8) => {
    const ax = Math.min(X(x0), X(x1)), bx = Math.max(X(x0), X(x1));
    const ay = Math.min(Y(y0), Y(y1)), by = Math.max(Y(y0), Y(y1));
    ctx.save();
    rrect(ctx, ax, ay, bx - ax, by - ay, r);
    ctx.clip();
    meshFill(ctx, ax, ay, bx - ax, by - ay, kind);
    const g = ctx.createLinearGradient(0, ay, 0, by);
    g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(0.35, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(ax, ay, bx - ax, by - ay);
    ctx.restore();
    ctx.strokeStyle = '#030304'; ctx.lineWidth = 9;
    rrect(ctx, ax, ay, bx - ax, by - ay, r); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,198,208,0.28)'; ctx.lineWidth = 2;
    rrect(ctx, ax + 4, ay + 4, bx - ax - 8, by - ay - 8, Math.max(0, r - 3)); ctx.stroke();
  };
}

const jpPlate = (model: CarModel) => model.brand === 'kairo' || model.brand === 'mizuno' || model.brand === 'takeda';

/** Metric extents of an end decal (see bodyMesh.endDecal). */
export interface DecalFrame { xw: number; yLo: number; yHi: number }

/** Placement of the left headlight on the front face (mirrored for the right). */
export interface LampBox { xi: number; xo: number; yc: number; h: number }

export function headlightBox(shape: BodyShape, model: CarModel, v: VisualConfig): LampBox {
  const style = resolveHeadlight(model, v);
  const F = shape.face(true);
  const h = style === 'slimRect' || style === 'ledStrip' ? 0.15 : style === 'quadRound' || style === 'sealedRect' || style === 'blackQuad' ? 0.2 : 0.18;
  const yc = F.yTop - h * 0.3;
  const xo = Math.max(0.34, F.halfW(yc, 0.36) - 0.01);
  const wide = model.shape.grille === 'muscleWide';
  const w = Math.min(0.56, Math.max(0.33, xo * (wide ? 0.66 : 0.62)));
  return { xi: xo - w, xo, yc, h };
}

/** Placement of the left taillight cluster on the rear face. */
export function taillightBox(shape: BodyShape): LampBox {
  const R = shape.face(false);
  const h = Math.min(0.21, Math.max(0.14, (R.yTop - R.yBot) * 0.32));
  const yc = R.yTop - 0.025 - h / 2;
  const xo = Math.max(0.34, R.halfW(yc, 0.22) - 0.01);
  return { xi: xo * 0.36, xo, yc, h };
}

function decalCanvas(D: DecalFrame) {
  const W = 1024;
  const H = Math.max(160, Math.min(560, Math.round((W * (D.yHi - D.yLo)) / (2 * D.xw))));
  const [c, ctx] = canvas(W, H);
  const [e, ex] = canvas(W, H);
  ctx.clearRect(0, 0, W, H);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  return { c, ctx, e, ex, W, H };
}

/** Front face: grille, bumper intakes, fog lights, plate, lip and badge (headlights are separate patches). */
export function frontDecalTextures(model: CarModel, v: VisualConfig, shape: BodyShape, D: DecalFrame): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const { c, ctx, e, ex, W, H } = decalCanvas(D);
  const X = (x: number) => (W * (x + D.xw)) / (2 * D.xw);
  const Y = (y: number) => H * (1 - (y - D.yLo) / (D.yHi - D.yLo));
  const px = (m: number) => (W * m) / (2 * D.xw);
  const F = shape.face(true);
  const hb = headlightBox(shape, model, v);
  const sh = model.shape;
  const dark = darkFn(ctx, X, Y);
  // ---- upper grille between the headlights
  const gTop = F.yTop - 0.012;
  const gBot = Math.max(F.yBot + 0.17, Math.min(hb.yc - hb.h / 2 - 0.01, F.yTop - 0.2));
  const gw = Math.max(0.15, hb.xi - 0.03);
  const gY = (f: number) => gBot + (gTop - gBot) * f;
  switch (sh.grille) {
    case 'smallRect': dark(-gw * 0.8, gY(0.1), gw * 0.8, gY(0.9), 'bars', 8); break;
    case 'largeTwinIntake': dark(-gw * 0.95, gY(0.05), -gw * 0.08, gY(0.92), 'bars', 10); dark(gw * 0.08, gY(0.05), gw * 0.95, gY(0.92), 'bars', 10); break;
    case 'smile': dark(-gw * 0.95, gY(0.08), gw * 0.95, gY(0.62), 'mesh', 30); break;
    case 'barGrille': dark(-gw * 0.95, gY(0.12), gw * 0.95, gY(0.88), 'bars', 6); break;
    case 'exoticMouth': break;
    case 'muscleWide': {
      const mw = hb.xo + 0.01;
      dark(-mw, hb.yc - hb.h * 0.62, mw, hb.yc + hb.h * 0.62, 'bars', 8);
      ctx.strokeStyle = '#c9ced4'; ctx.lineWidth = 4; rrect(ctx, X(-mw), Y(hb.yc + hb.h * 0.62), px(2 * mw), Y(hb.yc - hb.h * 0.62) - Y(hb.yc + hb.h * 0.62), 8); ctx.stroke();
      break;
    }
    case 'honeycombSplit': dark(-gw * 0.95, gY(0.12), -gw * 0.1, gY(0.86), 'honey', 6); dark(gw * 0.1, gY(0.12), gw * 0.95, gY(0.86), 'honey', 6); break;
    case 'slot': dark(-gw * 0.98, gY(0.32), gw * 0.98, gY(0.7), 'bars', 6); break;
  }
  // ---- bumper
  const kit = visualPart('frontBumper', v.frontBumper).p;
  const bTop = gBot - 0.03, bBot = F.yBot + 0.025;
  // bumper cover seam: under the headlights, out to the fenders (continues on the sides in the paint atlas)
  {
    const L = panelLayout(shape, model, v);
    ctx.save();
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      ctx.strokeStyle = '#040405'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(X(sd * (hb.xi + 0.02)), Y(L.frontSeamY)); ctx.lineTo(X(sd * D.xw), Y(L.frontSeamY)); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(sd * (hb.xi + 0.02)), Y(L.frontSeamY) - 3); ctx.lineTo(X(sd * D.xw), Y(L.frontSeamY) - 3); ctx.stroke();
    }
    ctx.restore();
  }
  const bY = (f: number) => bBot + (bTop - bBot) * f;
  const wc = F.halfW(bY(0.4), 0.2) * 0.9;
  const intake = kit.intake === 'stock' ? (sh.grille === 'exoticMouth' ? 'exotic' : sh.grille === 'slot' ? 'center' : 'slot') : kit.intake;
  // fc: top of whatever intake sits behind the plate (fraction of the bumper height); the plate goes above it
  let plateX = 0, fc = 0.36;
  switch (intake) {
    case 'center': dark(-wc * 0.45, bY(0.06), wc * 0.45, bY(0.42), 'mesh', 14); fc = 0.42; break;
    case 'triple': dark(-wc * 0.3, bY(0.06), wc * 0.3, bY(0.42), 'mesh', 10); dark(-wc * 0.88, bY(0.08), -wc * 0.45, bY(0.5), 'mesh', 10); dark(wc * 0.45, bY(0.08), wc * 0.88, bY(0.5), 'mesh', 10); fc = 0.42; break;
    case 'wide': dark(-wc * 0.9, bY(0.06), wc * 0.9, bY(0.46), 'mesh', 16); fc = 0.46; break;
    case 'dualSide': dark(-wc * 0.94, bY(0.08), -wc * 0.46, bY(0.62), 'honey', 10); dark(wc * 0.46, bY(0.08), wc * 0.94, bY(0.62), 'honey', 10); dark(-wc * 0.34, bY(0.06), wc * 0.34, bY(0.3), 'honey', 6); fc = 0.3; break;
    case 'mesh': dark(-wc * 0.94, bY(0.06), wc * 0.94, bY(0.5), 'mesh', 12); fc = 0.5; break;
    case 'slats': dark(-wc * 0.8, bY(0.06), wc * 0.8, bY(0.42), 'slats', 18); fc = 0.42; break;
    case 'exotic': dark(-wc * 0.55, bY(0.08), wc * 0.55, bY(0.55), 'mesh', 26); dark(-wc * 1.0, bY(0.1), -wc * 0.65, bY(0.66), 'mesh', 14); dark(wc * 0.65, bY(0.1), wc * 1.0, bY(0.66), 'mesh', 14); fc = 0.55; break;
    case 'slot': default: dark(-wc * 0.72, bY(0.06), wc * 0.72, bY(0.34), 'bars', 10); fc = 0.34;
  }
  void plateX;
  // fogs
  const fog = kit.fog ?? 0;
  if (fog) for (const side of [-1, 1]) {
    const cx = X(side * wc * 0.78), cy = Y(bY(fog === 3 ? 0.55 : 0.4));
    const r = px(fog === 3 ? 0.05 : 0.032);
    if (fog === 2) { ctx.fillStyle = '#c9ced4'; rrect(ctx, cx - r * 1.7, cy - r * 1.1, r * 3.4, r * 2.2, 4); ctx.fill(); }
    chromeBowl(ctx, cx, cy, r, '#fff6d0');
    const g = ex.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3);
    g.addColorStop(0, '#fff2c0'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ex.fillStyle = g; ex.beginPath(); ex.arc(cx, cy, r * 1.3, 0, Math.PI * 2); ex.fill();
  }
  // lip
  if (kit.lip) { ctx.fillStyle = kit.lip === 2 ? '#15171a' : '#0d0e10'; ctx.fillRect(0, Y(F.yBot + 0.035), W, H - Y(F.yBot + 0.035)); }
  // plate
  const jp = jpPlate(model);
  const room = bTop - 0.008 - (bY(fc) + 0.018);
  const ps = Math.max(0.62, Math.min(1, room / (jp ? 0.15 : 0.11)));
  const pw = (jp ? 0.33 : 0.44) * ps, ph = (jp ? 0.15 : 0.11) * ps;
  const pyc = Math.min(bTop - 0.008 - ph / 2, bY(fc) + 0.018 + ph / 2);
  ctx.fillStyle = '#060607'; rrect(ctx, X(-pw / 2 - 0.01), Y(pyc + ph / 2 + 0.01), px(pw + 0.02), px(ph + 0.02), 6); ctx.fill();
  drawPlate(ctx, X(0), Y(pyc), px(pw), px(ph), v.plate, jp);
  // badge
  const badgeY = sh.grille === 'smile' ? gY(0.78) : sh.grille === 'exoticMouth' ? gY(0.55) : sh.grille === 'slot' ? gY(0.86) : sh.grille === 'muscleWide' ? hb.yc : gY(0.5);
  drawLogo(ctx, model.brand, X(0), Y(badgeY), Math.min(px(0.075), Math.abs(Y(gY(0.9)) - Y(gY(0.1))) * 0.75));
  return { map: tex(c), emissive: tex(e) };
}

export function exhaustLayout(kind: string, wc: number): { x: number; r: number; oval?: boolean }[] {
  switch (kind) {
    case 'single': return [{ x: wc * 0.55, r: 1 }];
    case 'dual': return [{ x: wc * 0.5, r: 0.9 }, { x: wc * 0.68, r: 0.9 }];
    case 'twin': return [{ x: wc * 0.6, r: 1 }, { x: -wc * 0.6, r: 1 }];
    case 'quad': return [{ x: wc * 0.5, r: 0.85 }, { x: wc * 0.68, r: 0.85 }, { x: -wc * 0.5, r: 0.85 }, { x: -wc * 0.68, r: 0.85 }];
    case 'center': return [{ x: 0.07, r: 1 }, { x: -0.07, r: 1 }];
    case 'can': return [{ x: wc * 0.55, r: 1.5 }];
    case 'oval': return [{ x: wc * 0.6, r: 1.1, oval: true }, { x: -wc * 0.6, r: 1.1, oval: true }];
    case 'hex': return [{ x: wc * 0.58, r: 1 }, { x: -wc * 0.58, r: 1 }];
    case 'stack': return [{ x: wc * 0.7, r: 0.9 }, { x: -wc * 0.7, r: 0.9 }];
    default: return [];
  }
}

/** Rear face: taillights, badge, model name, plate, reflectors, exhaust cut-outs and diffuser area. */
export function rearDecalTextures(model: CarModel, v: VisualConfig, shape: BodyShape, D: DecalFrame, exhaustKind: string, ex0: { wc: number; yBot: number; r: number }): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const { c, ctx, e, ex, W, H } = decalCanvas(D);
  const X = (xm: number) => (W * (D.xw - xm)) / (2 * D.xw);
  const Y = (ym: number) => H * (1 - (ym - D.yLo) / (D.yHi - D.yLo));
  const px = (m: number) => (W * m) / (2 * D.xw);
  const RF = shape.face(false);
  const tb = taillightBox(shape);
  // the band [yc-h/2, yc+h/2] maps to fractions 0.3..0.8 of gY so the per-style layouts stay readable
  const hh = tb.h / 0.5;
  const y0 = tb.yc - tb.h / 2 - 0.3 * hh;
  const gY = (f: number) => y0 + hh * f;
  const wc = tb.xo;
  const style = resolveTaillight(model, v);
  const box = (sd: number, a: number, b: number) => (sd > 0 ? [wc * b, wc * a] : [-wc * a, -wc * b]);
  const R = (x0: number, yy0: number, x1: number, yy1: number) => { const ax = Math.min(X(x0), X(x1)), bx = Math.max(X(x0), X(x1)); const ay = Math.min(Y(yy0), Y(yy1)), by = Math.max(Y(yy0), Y(yy1)); return [ax, ay, bx - ax, by - ay]; };
  const red = (x0: number, a: number, x1: number, b: number, r = 6) => {
    const [qx, qy, qw, qh] = R(x0, a, x1, b);
    const g = ctx.createLinearGradient(0, qy, 0, qy + qh);
    g.addColorStop(0, '#ff4a40'); g.addColorStop(0.5, '#b00e14'); g.addColorStop(1, '#5c0306');
    ctx.fillStyle = g; rrect(ctx, qx, qy, qw, qh, r); ctx.fill();
    ex.fillStyle = '#ff2a2a'; rrect(ex, qx, qy, qw, qh, r); ex.fill();
  };
  const clear = (x0: number, a: number, x1: number, b: number, r = 5) => {
    const [qx, qy, qw, qh] = R(x0, a, x1, b);
    const g = ctx.createLinearGradient(0, qy, 0, qy + qh);
    g.addColorStop(0, '#eef2f6'); g.addColorStop(1, '#7c858f');
    ctx.fillStyle = g; rrect(ctx, qx, qy, qw, qh, r); ctx.fill();
  };
  const amber = (x0: number, a: number, x1: number, b: number) => { const [qx, qy, qw, qh] = R(x0, a, x1, b); ctx.fillStyle = '#d97a12'; rrect(ctx, qx, qy, qw, qh, 4); ctx.fill(); };
  const housing = (x0: number, a: number, x1: number, b: number, r = 8) => {
    const [qx, qy, qw, qh] = R(x0, a, x1, b);
    ctx.fillStyle = '#020203'; rrect(ctx, qx - 9, qy - 9, qw + 18, qh + 18, r + 4); ctx.fill();
    ctx.fillStyle = '#0b0c0e'; rrect(ctx, qx - 4, qy - 4, qw + 8, qh + 8, r); ctx.fill();
    ctx.strokeStyle = 'rgba(200,205,215,0.25)'; ctx.lineWidth = 1.5; rrect(ctx, qx - 4, qy - 4, qw + 8, qh + 8, r); ctx.stroke();
  };
  const both = (fn: (sd: number) => void) => { fn(1); fn(-1); };
  const lo = 0.3, hi = 0.8;
  switch (style) {
    case 'threeSegment':
      both((sd) => {
        const [x0, x1] = box(sd, 0.4, 0.98);
        housing(x0, gY(lo), x1, gY(hi));
        const seg = (x1 - x0) / 3;
        for (let k = 0; k < 3; k++) {
          const a = x0 + seg * k + 0.006, b = x0 + seg * (k + 1) - 0.006;
          const outer = sd > 0 ? k === 2 : k === 0;
          if (outer) red(a, gY(lo + 0.04), b, gY(hi - 0.04)); else if (k === 1) amber(a, gY(lo + 0.04), b, gY(hi - 0.04)); else clear(a, gY(lo + 0.04), b, gY(hi - 0.04));
        }
      });
      break;
    case 'triangle':
      both((sd) => {
        const xo = X(sd * wc * 0.99), xi = X(sd * wc * 0.42);
        ctx.fillStyle = '#0b0c0e'; ctx.beginPath(); ctx.moveTo(xo, Y(gY(0.9))); ctx.lineTo(xi, Y(gY(0.86))); ctx.lineTo(xo, Y(gY(0.2))); ctx.closePath(); ctx.fill();
        const g = ctx.createLinearGradient(xi, 0, xo, 0); g.addColorStop(0, '#ff3b3b'); g.addColorStop(1, '#6c0508');
        const tri = (cx: CanvasRenderingContext2D) => { cx.beginPath(); cx.moveTo(xo - (xo - xi) * 0.03, Y(gY(0.84))); cx.lineTo(xi + (xo - xi) * 0.1, Y(gY(0.8))); cx.lineTo(xo - (xo - xi) * 0.03, Y(gY(0.28))); cx.closePath(); };
        ctx.fillStyle = g; tri(ctx); ctx.fill();
        ex.fillStyle = '#ff2a2a'; tri(ex); ex.fill();
      });
      break;
    case 'roundQuad':
    case 'roundQuadAfter':
      both((sd) => {
        if (style === 'roundQuadAfter') { const [x0, x1] = box(sd, 0.38, 0.98); housing(x0, gY(0.24), x1, gY(0.86), 10); }
        for (const f of [0.56, 0.84]) {
          const cx = X(sd * wc * f), cy = Y(gY(0.55)), r = Math.min(Math.abs(Y(gY(0.82)) - Y(gY(0.28))) / 2, px(wc * 0.12));
          ctx.fillStyle = '#0b0c0e'; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill();
          const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r); g.addColorStop(0, '#ff6b5b'); g.addColorStop(0.7, '#c0101a'); g.addColorStop(1, '#5c0306');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
          ex.fillStyle = '#ff2a2a'; ex.beginPath(); ex.arc(cx, cy, r, 0, Math.PI * 2); ex.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2); ctx.fill();
        }
      });
      break;
    case 'fullBar':
      housing(-wc * 0.97, gY(0.36), wc * 0.97, gY(0.75), 6);
      red(-wc * 0.96, gY(0.4), wc * 0.96, gY(0.71), 4);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; for (let k = 0; k < 28; k++) ctx.fillRect(X(-wc) + k * (px(2 * wc) / 28), Y(gY(0.71)), 1.5, Y(gY(0.4)) - Y(gY(0.71)));
      clear(-wc * 0.12, gY(0.43), wc * 0.12, gY(0.68), 3);
      break;
    case 'vertical':
      both((sd) => {
        const [x0, x1] = box(sd, 0.66, 0.97);
        housing(x0, gY(0.1), x1, gY(0.9), 6);
        const w3 = (x1 - x0) / 3;
        for (let k = 0; k < 3; k++) red(x0 + w3 * k + 0.005, gY(0.14), x0 + w3 * (k + 1) - 0.005, gY(0.86), 3);
      });
      break;
    default:
      both((sd) => {
        const [x0, x1] = box(sd, style === 'split' ? 0.5 : 0.42, 0.98);
        housing(x0, gY(lo), x1, gY(hi), style === 'wrap' ? 14 : 6);
        if (style === 'clearEuro') {
          clear(x0, gY(lo + 0.03), x1, gY(hi - 0.03), 10);
          for (const f of [0.25, 0.72]) { const cx = X(x0) + (X(x1) - X(x0)) * f, cy = Y(gY((lo + hi) / 2)), r = Math.abs(Y(gY(hi)) - Y(gY(lo))) * 0.32; ctx.fillStyle = '#c0101a'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ex.fillStyle = '#ff2a2a'; ex.beginPath(); ex.arc(cx, cy, r, 0, Math.PI * 2); ex.fill(); }
        } else if (style === 'redClear') {
          red(x0, gY(0.52), x1, gY(hi - 0.03), 6); clear(x0, gY(lo + 0.03), x1, gY(0.5), 6);
        } else if (style === 'ledBar') {
          const [qx, qy, qw, qh] = R(x0, gY(lo + 0.03), x1, gY(hi - 0.03));
          ctx.fillStyle = '#2a0204'; rrect(ctx, qx, qy, qw, qh, 6); ctx.fill();
          for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
            const cx = qx + (qw * (i + 0.5)) / 9, cy = qy + (qh * (j + 0.5)) / 3;
            ctx.fillStyle = '#ff4040'; ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, Math.PI * 2); ctx.fill();
            ex.fillStyle = '#ff2a2a'; ex.beginPath(); ex.arc(cx, cy, 4.5, 0, Math.PI * 2); ex.fill();
          }
        } else if (style === 'split') {
          red(x0, gY(0.55), x1, gY(hi - 0.03), 5);
          const inner = sd > 0 ? [x0 + (x1 - x0) * 0.55, x1] : [x0, x1 - (x1 - x0) * 0.55];
          red(inner[0], gY(lo + 0.03), inner[1], gY(0.52), 4);
          clear(sd > 0 ? x0 : x1 - (x1 - x0) * 0.42, gY(lo + 0.03), sd > 0 ? x0 + (x1 - x0) * 0.42 : x1, gY(0.52), 4);
        } else {
          red(x0, gY(lo + 0.03), x1, gY(hi - 0.03), style === 'wrap' ? 12 : 5);
          if (style === 'boxy') { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; for (let k = 1; k < 4; k++) { const xx = X(x0) + ((X(x1) - X(x0)) * k) / 4; ctx.beginPath(); ctx.moveTo(xx, Y(gY(hi))); ctx.lineTo(xx, Y(gY(lo))); ctx.stroke(); } }
          const ci = sd > 0 ? [x0, x0 + (x1 - x0) * 0.28] : [x1 - (x1 - x0) * 0.28, x1];
          clear(ci[0], gY(lo + 0.06), ci[1], gY(0.45), 3);
          if (style === 'smoked') { const [qx, qy, qw, qh] = R(x0, gY(lo), x1, gY(hi)); ctx.fillStyle = 'rgba(10,10,12,0.55)'; rrect(ctx, qx, qy, qw, qh, 6); ctx.fill(); }
        }
      });
  }
  // badge and lettering on the lid between/below the lamps
  drawLogo(ctx, model.brand, X(0), Y(tb.yc), Math.min(px(0.08), Math.abs(Y(tb.yc + tb.h * 0.4) - Y(tb.yc - tb.h * 0.4))));
  const textY = Y(tb.yc - tb.h / 2 - 0.035);
  ctx.save();
  ctx.fillStyle = '#d7dce2';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 800 ${Math.max(10, px(0.035))}px Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(model.name.toUpperCase(), X(-wc * 0.42), textY);
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.max(9, px(0.026))}px Arial, sans-serif`;
  ctx.fillText(model.trim.toUpperCase(), X(wc * 0.42), textY);
  ctx.restore();
  // trunk lid shut lines and the bumper cover seam (continue on the sides and deck in the paint atlas)
  {
    const L = panelLayout(shape, model, v);
    const seam = (pts: [number, number][]) => {
      for (const [col, w, dy] of [['#040405', 4, 0], ['rgba(255,255,255,0.14)', 1.5, -3]] as const) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); pts.forEach(([xm, ym], i) => (i ? ctx.lineTo(X(xm), Y(ym) + dy) : ctx.moveTo(X(xm), Y(ym) + dy))); ctx.stroke();
      }
    };
    seam([[-D.xw, L.rearSeamY], [D.xw, L.rearSeamY]]);
    for (const sd of [-1, 1]) seam([[sd * L.lidHalfW, L.rearSeamY], [sd * L.lidHalfW, D.yHi]]);
  }
  // plate (on the lid when there is room, else in the bumper)
  const jp = jpPlate(model);
  const pw = jp ? 0.33 : 0.44, ph = jp ? 0.15 : 0.11;
  const plateY = Math.max(RF.yBot + 0.2, tb.yc - tb.h / 2 - 0.06 - ph / 2);
  ctx.fillStyle = '#060607'; rrect(ctx, X(pw / 2 + 0.012), Y(plateY + ph / 2 + 0.012), px(pw + 0.024), px(ph + 0.024), 6); ctx.fill();
  drawPlate(ctx, X(0), Y(plateY), px(pw), px(ph), v.plate, jp);
  ex.fillStyle = 'rgba(255,255,230,0.3)'; ex.fillRect(X(0.1), Y(plateY + ph / 2 + 0.012), px(0.2), px(0.01));
  // bumper: reflectors, diffuser area, exhaust cut-outs
  const bw = RF.halfW(RF.yBot + 0.12, 0.25) * 0.92;
  const reflY = Math.min(plateY - 0.02, RF.yBot + 0.15);
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#8a0d10'; rrect(ctx, X(sd * bw * 0.84) - px(0.05), Y(reflY), px(0.1), px(0.022), 2); ctx.fill();
    ex.fillStyle = '#400'; rrect(ex, X(sd * bw * 0.84) - px(0.05), Y(reflY), px(0.1), px(0.022), 2); ex.fill();
  }
  const rb = visualPart('rearBumper', v.rearBumper).p;
  if (rb.style !== 'stock') {
    ctx.fillStyle = rb.style === 'competition' || rb.style === 'ta' ? '#121315' : 'rgba(0,0,0,0.6)';
    ctx.fillRect(X(bw * 0.72), Y(RF.yBot + 0.1), px(bw * 1.44), Y(D.yLo) - Y(RF.yBot + 0.1));
    if (rb.vents) for (const sd of [-1, 1]) { ctx.fillStyle = '#060708'; rrect(ctx, X(sd * bw * 0.92) - px(0.03), Y(RF.yBot + 0.2), px(0.06), px(0.08), 4); ctx.fill(); }
  }
  for (const t of exhaustLayout(exhaustKind, ex0.wc)) {
    ctx.fillStyle = '#050506';
    ctx.beginPath(); ctx.ellipse(X(t.x), Y(ex0.yBot + 0.075), px(ex0.r * t.r * 1.35 * (t.oval ? 1.5 : 1)), px(ex0.r * t.r * 1.3), 0, 0, Math.PI * 2); ctx.fill();
  }
  return { map: tex(c), emissive: tex(e) };
}

// --------------------------------------------------------------------------- VENTS, TYRES

const ventCache = new Map<string, THREE.CanvasTexture>();
export function ventTexture(kind: 'slots' | 'louver' | 'gill' | 'naca' | 'mesh'): THREE.CanvasTexture {
  const hit = ventCache.get(kind);
  if (hit) return hit;
  const [c, ctx] = canvas(256, 128);
  ctx.clearRect(0, 0, 256, 128);
  if (kind === 'naca') {
    ctx.fillStyle = '#060607';
    ctx.beginPath(); ctx.moveTo(20, 64 - 8); ctx.quadraticCurveTo(160, 64 - 20, 240, 20); ctx.lineTo(240, 108); ctx.quadraticCurveTo(160, 84, 20, 72); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2b2e33'; ctx.lineWidth = 3; ctx.stroke();
  } else if (kind === 'mesh') {
    rrect(ctx, 6, 6, 244, 116, 14); ctx.save(); ctx.clip(); meshFill(ctx, 0, 0, 256, 128, 'mesh'); ctx.restore();
  } else {
    const n = kind === 'louver' ? 12 : kind === 'gill' ? 5 : 6;
    for (let i = 0; i < n; i++) {
      const y = 10 + (i * 108) / n;
      const h = (108 / n) * 0.55;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#000'); g.addColorStop(0.7, '#141518'); g.addColorStop(1, '#3a3e44');
      ctx.fillStyle = g;
      rrect(ctx, kind === 'gill' ? 12 + i * 6 : 12, y, kind === 'gill' ? 232 - i * 12 : 232, h, h / 2); ctx.fill();
    }
  }
  const t = tex(c);
  ventCache.set(kind, t);
  return t;
}

const tireCache = new Map<string, THREE.CanvasTexture>();
export function tireSidewallTexture(label: string, letters: boolean): THREE.CanvasTexture {
  const key = label + letters;
  const hit = tireCache.get(key);
  if (hit) return hit;
  const [c, ctx] = canvas(1024, 64);
  ctx.fillStyle = '#141416';
  ctx.fillRect(0, 0, 1024, 64);
  ctx.fillStyle = '#1d1e21';
  for (let i = 0; i < 1024; i += 4) ctx.fillRect(i, 0, 1, 64);
  ctx.fillStyle = letters ? '#e8e8e8' : '#3a3b40';
  ctx.font = 'italic 900 26px Arial Black, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < 2; k++) {
    ctx.fillText(label, 40 + k * 512, 34);
    ctx.font = '700 18px Arial, sans-serif';
    ctx.fillText('RADIAL · TUBELESS', 300 + k * 512, 34);
    ctx.font = 'italic 900 34px Arial Black, Arial, sans-serif';
  }
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  tireCache.set(key, t);
  return t;
}
