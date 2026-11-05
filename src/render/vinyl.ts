// Paints the body atlas: base paint, carbon panels, multi-layer vinyls, panel lines.
import type { CarModel, VinylLayer, VisualConfig } from '../core/types';
import { visualPart } from '../data/visualParts';
import { ATLAS, SIDE_H, SIDE_REF_H, TOP_H, TOP_REF_W, TOP_Y0 } from './bodyMesh';
import { drawPanelLines } from './panels';
import type { BodyShape } from './bodyShape';
import { drawLogo, drawSponsor } from './logos';
import { fillCarbon } from './textures';

type Ctx = CanvasRenderingContext2D;

export interface Region { x: number; y: number; w: number; h: number }
export const REGIONS: Record<'left' | 'right' | 'top', Region> = {
  left: { x: 0, y: 0, w: ATLAS, h: SIDE_H },
  right: { x: 0, y: SIDE_H, w: ATLAS, h: SIDE_H },
  top: { x: 0, y: TOP_Y0, w: ATLAS, h: TOP_H },
};

function poly(ctx: Ctx, pts: number[][]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** Draws a single vinyl shape centred at origin into a w×h box (already transformed). */
export function drawVinylShape(ctx: Ctx, L: VinylLayer, w: number, h: number) {
  const c1 = L.color, c2 = L.color2;
  ctx.fillStyle = c1;
  ctx.strokeStyle = c1;
  const hw = w / 2, hh = h / 2;
  switch (L.shape) {
    case 'rect': ctx.fillRect(-hw, -hh, w, h); break;
    case 'stripe': ctx.fillRect(-hw, -hh, w, h); break;
    case 'circle': ctx.beginPath(); ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2); ctx.fill(); break;
    case 'ring': ctx.lineWidth = Math.min(w, h) * 0.12; ctx.beginPath(); ctx.ellipse(0, 0, hw * 0.92, hh * 0.92, 0, 0, Math.PI * 2); ctx.stroke(); break;
    case 'triangle': poly(ctx, [[-hw, hh], [hw, hh], [0, -hh]]); ctx.fill(); break;
    case 'diamond': poly(ctx, [[0, -hh], [hw, 0], [0, hh], [-hw, 0]]); ctx.fill(); ctx.fillStyle = c2; poly(ctx, [[0, -hh * 0.5], [hw * 0.5, 0], [0, hh * 0.5], [-hw * 0.5, 0]]); ctx.fill(); break;
    case 'chevron': poly(ctx, [[-hw, -hh], [0, 0], [-hw, hh], [-hw + w * 0.35, hh], [w * 0.35, 0], [-hw + w * 0.35, -hh]]); ctx.fill(); break;
    case 'slash': poly(ctx, [[-hw, hh], [-hw + h * 0.8, -hh], [hw, -hh], [hw - h * 0.8, hh]]); ctx.fill(); break;
    case 'arrow': poly(ctx, [[-hw, -hh * 0.4], [hw * 0.3, -hh * 0.4], [hw * 0.3, -hh], [hw, 0], [hw * 0.3, hh], [hw * 0.3, hh * 0.4], [-hw, hh * 0.4]]); ctx.fill(); break;
    case 'bolt': poly(ctx, [[-hw * 0.2, -hh], [hw * 0.5, -hh], [hw * 0.05, -hh * 0.1], [hw * 0.6, -hh * 0.1], [-hw * 0.4, hh], [-hw * 0.05, hh * 0.05], [-hw * 0.55, hh * 0.05]]); ctx.fill(); break;
    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 0.42 : 1; ctx.lineTo(Math.cos(a) * hw * r, Math.sin(a) * hh * r); }
      ctx.closePath(); ctx.fill(); break;
    }
    case 'shard': poly(ctx, [[-hw, hh * 0.3], [hw * 0.2, -hh], [hw, -hh * 0.6], [-hw * 0.1, hh]]); ctx.fill(); break;
    case 'shards': {
      const sh = [[-1, 0.6, -0.55, -0.9, -0.25, -0.6, -0.65, 0.9], [-0.5, 0.8, 0.0, -1.0, 0.4, -0.75, -0.15, 1.0], [0.1, 0.7, 0.55, -0.6, 1.0, -0.4, 0.4, 0.85]];
      sh.forEach((s, k) => {
        ctx.fillStyle = k === 1 ? c2 : c1;
        poly(ctx, [[s[0] * hw, s[1] * hh], [s[2] * hw, s[3] * hh], [s[4] * hw, s[5] * hh], [s[6] * hw, s[7] * hh]]);
        ctx.fill();
      });
      ctx.fillStyle = c1;
      ctx.fillRect(-hw, hh * 0.78, w * 0.9, hh * 0.12);
      break;
    }
    case 'sweep': {
      // long tapered sweep with an accent line
      ctx.beginPath();
      ctx.moveTo(-hw, hh * 0.2);
      ctx.bezierCurveTo(-hw * 0.4, -hh * 0.9, hw * 0.3, -hh * 0.7, hw, -hh * 0.15);
      ctx.lineTo(hw * 0.92, hh * 0.15);
      ctx.bezierCurveTo(hw * 0.3, -hh * 0.2, -hw * 0.3, -hh * 0.1, -hw * 0.8, hh * 0.9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.7, hh * 0.85);
      ctx.bezierCurveTo(-hw * 0.2, -hh * 0.05, hw * 0.4, 0, hw * 0.95, hh * 0.35);
      ctx.lineTo(hw * 0.9, hh * 0.5);
      ctx.bezierCurveTo(hw * 0.4, hh * 0.2, -hw * 0.2, hh * 0.15, -hw * 0.6, hh);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'wave': {
      ctx.beginPath();
      ctx.moveTo(-hw, hh);
      for (let i = 0; i <= 40; i++) { const x = -hw + (w * i) / 40; ctx.lineTo(x, Math.sin((i / 40) * Math.PI * 3) * hh * 0.45); }
      ctx.lineTo(hw, hh); ctx.closePath(); ctx.fill();
      break;
    }
    case 'hatch': {
      ctx.save(); ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();
      const step = Math.max(6, h * 0.22);
      for (let x = -hw - h; x < hw + h; x += step) { poly(ctx, [[x, hh], [x + h, -hh], [x + h + step * 0.45, -hh], [x + step * 0.45, hh]]); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'dots': {
      const cols = 14, rows = 5;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const r = (Math.min(w / cols, h / rows) / 2) * (1 - i / cols) * 0.95;
        ctx.beginPath(); ctx.arc(-hw + (i + 0.5) * (w / cols), -hh + (j + 0.5) * (h / rows), r, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'checker': {
      const n = Math.max(2, Math.round((w / h) * 3));
      const cw = w / n, ch = h / 3;
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? c1 : c2; ctx.fillRect(-hw + i * cw, -hh + j * ch, cw + 0.5, ch + 0.5); }
      break;
    }
    case 'hexgrid': {
      const s = Math.max(6, h / 4);
      ctx.lineWidth = Math.max(1.5, s * 0.12);
      ctx.save(); ctx.beginPath(); ctx.rect(-hw, -hh, w, h); ctx.clip();
      for (let yy = -hh; yy < hh + s; yy += s * 0.86) for (let xx = -hw + ((Math.round((yy + hh) / (s * 0.86)) % 2) * s) / 2; xx < hw + s; xx += s) {
        ctx.globalAlpha = Math.max(0, 1 - (xx + hw) / w) * L.opacity;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) ctx.lineTo(xx + Math.cos((k * Math.PI) / 3) * s * 0.5, yy + Math.sin((k * Math.PI) / 3) * s * 0.5);
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'fade': {
      const g = ctx.createLinearGradient(-hw, 0, hw, 0);
      g.addColorStop(0, c1); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-hw, -hh, w, h);
      break;
    }
    case 'circuit': {
      ctx.lineWidth = Math.max(2, h * 0.07);
      const lines = [[-1, -0.6, -0.3, -0.6, -0.1, -0.2, 0.6, -0.2], [-1, 0.1, -0.5, 0.1, -0.3, 0.5, 0.9, 0.5], [-0.8, 0.85, 0.2, 0.85, 0.4, 0.2, 1.0, 0.2]];
      for (const l of lines) {
        ctx.beginPath(); ctx.moveTo(l[0] * hw, l[1] * hh);
        for (let k = 2; k < l.length; k += 2) ctx.lineTo(l[k] * hw, l[k + 1] * hh);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(l[l.length - 2] * hw, l[l.length - 1] * hh, ctx.lineWidth * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'text':
    case 'number': {
      const txt = L.text || (L.shape === 'number' ? '00' : 'TEXT');
      const font = L.font ?? 'block';
      const weight = font === 'italic' ? 'italic 900' : '900';
      const family = font === 'stencil' ? '"Stencil", "Arial Black", sans-serif' : '"Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let px = h;
      ctx.font = `${weight} ${px}px ${family}`;
      const mw = ctx.measureText(txt).width;
      ctx.save();
      ctx.scale(w / Math.max(1, mw), 1);
      if (font === 'outline') {
        ctx.lineWidth = px * 0.08; ctx.strokeStyle = c1; ctx.strokeText(txt, 0, h * 0.04);
      } else {
        if (L.shape === 'number') { ctx.lineWidth = px * 0.14; ctx.strokeStyle = c2; ctx.lineJoin = 'round'; ctx.strokeText(txt, 0, h * 0.04); }
        ctx.fillText(txt, 0, h * 0.04);
      }
      ctx.restore();
      break;
    }
    case 'sponsor': drawSponsor(ctx, L.sponsor ?? 'VOLTEX', 0, 0, w, h, c1, c2); break;
    case 'logo': drawLogo(ctx, L.logo ?? 'ctw', 0, 0, Math.min(w, h * 2) * 0.98, c1, c2); break;
  }
}

/** Draws a vinyl layer into its atlas region (and mirrored side if requested). */
export function drawLayer(ctx: Ctx, L: VinylLayer, region: 'left' | 'right' | 'top', mirrored = false) {
  const R = REGIONS[region];
  ctx.save();
  ctx.beginPath();
  ctx.rect(R.x, R.y, R.w, R.h);
  ctx.clip();
  ctx.globalAlpha = L.opacity;
  // Left: x=0 front. Right: x=0 rear. Mirrored copies keep their position along the car.
  const xn = mirrored ? 1 - L.x : L.x;
  const cx = R.x + xn * R.w;
  const cy = R.y + L.y * R.h;
  ctx.translate(cx, cy);
  ctx.rotate(((mirrored ? -L.rot : L.rot) * Math.PI) / 180);
  const flip = (L.flipX ? -1 : 1) * (mirrored && !['text', 'number', 'sponsor', 'logo'].includes(L.shape) ? -1 : 1);
  ctx.scale(flip, 1);
  drawVinylShape(ctx, L, L.sx * R.w, L.sy * R.h);
  ctx.restore();
}

export function paintAtlas(ctx: Ctx, model: CarModel, v: VisualConfig, shape: BodyShape) {
  const S = ATLAS;
  const base = v.paint.finish === 'carbon' ? null : v.paint.color;
  ctx.clearRect(0, 0, S, S);
  if (base) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, S, S);
  } else fillCarbon(ctx, 0, 0, S, S, 2);

  const sx = (s: number) => s * S;
  const topY = (x: number) => TOP_Y0 + (0.5 - x / TOP_REF_W) * TOP_H;
  const sideY = (y: number, right: boolean) => (right ? SIDE_H : 0) + (1 - y / SIDE_REF_H) * SIDE_H;
  const sh = model.shape;

  // carbon hood / roof
  const hood = visualPart('hood', v.hood).p;
  if (hood.carbon) fillCarbon(ctx, sx(shape.hoodStart) - 4, TOP_Y0, sx(sh.wsBase) - sx(shape.hoodStart) + 8, TOP_H, 2);
  if (visualPart('roof', v.roof).p.kind === 'carbon') fillCarbon(ctx, sx(sh.roofStart) - 4, TOP_Y0, sx(sh.roofEnd) - sx(sh.roofStart) + 8, TOP_H, 2);

  // vinyl layers
  for (const L of v.vinyls) {
    if (L.region === 'top') drawLayer(ctx, L, 'top');
    else {
      drawLayer(ctx, L, L.region);
      if (L.mirror) drawLayer(ctx, L, L.region === 'left' ? 'right' : 'left', true);
    }
  }

  // ---- panel gaps (drawn last so vinyls appear cut at the gaps)
  drawPanelLines(ctx, shape, model, v);
}
