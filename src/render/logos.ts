// Procedural emblems for the fictional manufacturers, crews and sponsors (Canvas 2D).
import type { BrandId } from '../core/types';
import { BRANDS } from '../data/brands';

type Ctx = CanvasRenderingContext2D;

export const SPONSORS = ['VOLTEX', 'NIGHTGRID', 'HAKU', 'ZENRYU', 'KANSO', 'STRATA', 'ORBITAL', 'TORQUE HOUSE', 'AERFLO', 'REDLINE FM', 'RONIN', 'QUARTER MILE CO'] as const;
export const LOGO_IDS = ['kairo', 'mizuno', 'takeda', 'werkhaus', 'belladonna', 'ironclad', 'apex', 'ctw', 'serpent', 'wing', 'skull', 'crown'] as const;

/** Draws a brand emblem centred at (cx, cy), fitting in `size` px. mono: single colour override. */
export function drawLogo(ctx: Ctx, id: string, cx: number, cy: number, size: number, mono?: string, mono2?: string) {
  const r = size / 2;
  const brand = (BRANDS as any)[id] as (typeof BRANDS)[BrandId] | undefined;
  const c1 = mono ?? brand?.colors[0] ?? '#e8e8e8';
  const c2 = mono2 ?? mono ?? brand?.colors[1] ?? '#ff3b3b';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (id) {
    case 'kairo': {
      // kestrel wing inside a ring
      ctx.lineWidth = r * 0.12;
      ctx.strokeStyle = c1;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.62, r * 0.1);
      ctx.quadraticCurveTo(-r * 0.1, -r * 0.55, r * 0.66, -r * 0.42);
      ctx.quadraticCurveTo(r * 0.15, -r * 0.18, r * 0.12, r * 0.05);
      ctx.quadraticCurveTo(r * 0.4, -r * 0.02, r * 0.55, r * 0.05);
      ctx.quadraticCurveTo(r * 0.05, r * 0.2, -r * 0.1, r * 0.48);
      ctx.quadraticCurveTo(-r * 0.2, r * 0.15, -r * 0.62, r * 0.1);
      ctx.fill();
      break;
    }
    case 'mizuno': {
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const y = -r * 0.25 + k * r * 0.22;
        ctx.moveTo(-r * 0.7, y + r * 0.08);
        ctx.bezierCurveTo(-r * 0.35, y - r * 0.18, -r * 0.05, y + r * 0.22, r * 0.25, y - r * 0.02);
        ctx.bezierCurveTo(r * 0.45, y - r * 0.15, r * 0.6, y - r * 0.05, r * 0.72, y + r * 0.05);
        ctx.lineTo(r * 0.72, y + r * 0.12);
        ctx.bezierCurveTo(r * 0.55, y + 0.0, r * 0.45, y - r * 0.05, r * 0.25, y + r * 0.08);
        ctx.bezierCurveTo(-r * 0.05, y + r * 0.3, -r * 0.35, y - r * 0.08, -r * 0.7, y + r * 0.16);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'takeda': {
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.8); ctx.lineTo(r * 0.75, -r * 0.8); ctx.lineTo(r * 0.75, r * 0.1);
      ctx.quadraticCurveTo(r * 0.7, r * 0.75, 0, r * 0.95); ctx.quadraticCurveTo(-r * 0.7, r * 0.75, -r * 0.75, r * 0.1);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.2); ctx.lineTo(-r * 0.32, -r * 0.35); ctx.lineTo(-r * 0.12, r * 0.0); ctx.lineTo(0, -r * 0.6);
      ctx.lineTo(r * 0.12, r * 0.0); ctx.lineTo(r * 0.32, -r * 0.35); ctx.lineTo(r * 0.6, r * 0.2); ctx.closePath(); ctx.fill();
      break;
    }
    case 'werkhaus': {
      // cog ring with W
      ctx.fillStyle = c1;
      const teeth = 16;
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * Math.PI * 2;
        const rr = i % 2 === 0 ? r * 0.98 : r * 0.84;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c1; ctx.lineWidth = r * 0.13;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.3); ctx.lineTo(-r * 0.22, r * 0.32); ctx.lineTo(0, -r * 0.1); ctx.lineTo(r * 0.22, r * 0.32); ctx.lineTo(r * 0.45, -r * 0.3);
      ctx.stroke();
      break;
    }
    case 'belladonna': {
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.9, -r * 0.9, r * 0.8, -r * 0.1);
      ctx.quadraticCurveTo(r * 0.7, r * 0.6, 0, r); ctx.quadraticCurveTo(-r * 0.7, r * 0.6, -r * 0.8, -r * 0.1);
      ctx.quadraticCurveTo(-r * 0.9, -r * 0.9, 0, -r); ctx.fill();
      // chequer band
      ctx.save();
      ctx.clip();
      const sq = r * 0.18;
      for (let i = -6; i < 6; i++) for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? c1 : '#111';
        ctx.fillRect(i * sq, r * 0.35 + j * sq, sq, sq);
      }
      ctx.restore();
      // berry
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b0420';
      ctx.beginPath(); ctx.arc(-r * 0.08, -r * 0.22, r * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c1; ctx.lineWidth = r * 0.07;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.45); ctx.quadraticCurveTo(r * 0.1, -r * 0.7, r * 0.35, -r * 0.7); ctx.stroke();
      break;
    }
    case 'ironclad': {
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.7); ctx.lineTo(r * 0.85, -r * 0.7); ctx.lineTo(r * 0.7, r * 0.45); ctx.lineTo(0, r * 0.95); ctx.lineTo(-r * 0.7, r * 0.45);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.68, -r * 0.55); ctx.lineTo(r * 0.68, -r * 0.55); ctx.lineTo(r * 0.56, r * 0.38); ctx.lineTo(0, r * 0.78); ctx.lineTo(-r * 0.56, r * 0.38);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c1;
      for (const [x, y] of [[-0.55, -0.42], [0.55, -0.42], [-0.45, 0.3], [0.45, 0.3], [0, 0.62]]) { ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.07, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = `900 ${r * 0.7}px Impact, Arial Black, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('IC', 0, -r * 0.02);
      break;
    }
    case 'apex': {
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.95, r * 0.65); ctx.lineTo(r * 0.55, r * 0.65); ctx.lineTo(0, -r * 0.2); ctx.lineTo(-r * 0.55, r * 0.65); ctx.lineTo(-r * 0.95, r * 0.65); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.05); ctx.lineTo(r * 0.38, r * 0.65); ctx.lineTo(-r * 0.38, r * 0.65); ctx.closePath(); ctx.fill();
      break;
    }
    case 'ctw': {
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.3); ctx.lineTo(-r * 0.2, -r * 0.6); ctx.lineTo(r, -r * 0.6); ctx.lineTo(r * 0.2, r * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c1;
      ctx.font = `italic 900 ${r * 0.62}px Arial Black, Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CTW', 0, -r * 0.13);
      ctx.fillRect(-r * 0.9, r * 0.45, r * 1.5, r * 0.08);
      ctx.fillRect(-r * 0.7, r * 0.62, r * 1.1, r * 0.06);
      break;
    }
    case 'serpent': {
      ctx.strokeStyle = c1; ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.6);
      ctx.bezierCurveTo(-r * 0.2, r * 0.9, r * 0.4, r * 0.4, -r * 0.1, r * 0.05);
      ctx.bezierCurveTo(-r * 0.6, -r * 0.3, -r * 0.1, -r * 0.8, r * 0.45, -r * 0.55);
      ctx.stroke();
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.75); ctx.lineTo(r * 0.95, -r * 0.62); ctx.lineTo(r * 0.4, -r * 0.35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.6, r * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = r * 0.04;
      ctx.beginPath(); ctx.moveTo(r * 0.92, -r * 0.62); ctx.lineTo(r * 1.0, -r * 0.7); ctx.moveTo(r * 0.92, -r * 0.62); ctx.lineTo(r * 1.0, -r * 0.55); ctx.stroke();
      break;
    }
    case 'wing': {
      ctx.fillStyle = c1;
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.scale(sgn, 1);
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(r * 0.12, -r * 0.1 + k * r * 0.14);
          ctx.quadraticCurveTo(r * 0.6, -r * 0.5 + k * r * 0.12, r * (1 - k * 0.15), -r * 0.45 + k * r * 0.18);
          ctx.lineTo(r * 0.12, r * 0.05 + k * r * 0.14);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'skull': {
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.62, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(r * 0.35, r * 0.65); ctx.lineTo(-r * 0.35, r * 0.65); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.ellipse(-r * 0.24, -r * 0.1, r * 0.15, r * 0.19, 0, 0, Math.PI * 2); ctx.ellipse(r * 0.24, -r * 0.1, r * 0.15, r * 0.19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.lineTo(r * 0.08, r * 0.28); ctx.lineTo(-r * 0.08, r * 0.28); ctx.fill();
      for (let k = -2; k <= 2; k++) ctx.fillRect(k * r * 0.12 - r * 0.03, r * 0.42, r * 0.06, r * 0.2);
      break;
    }
    case 'crown': {
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.5); ctx.lineTo(-r * 0.9, -r * 0.45); ctx.lineTo(-r * 0.4, r * 0.0); ctx.lineTo(0, -r * 0.7); ctx.lineTo(r * 0.4, 0); ctx.lineTo(r * 0.9, -r * 0.45); ctx.lineTo(r * 0.8, r * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2; ctx.fillRect(-r * 0.8, r * 0.55, r * 1.6, r * 0.18);
      break;
    }
    default: {
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Fictional sponsor decal, drawn into a w×h box centred at (cx, cy). */
export function drawSponsor(ctx: Ctx, name: string, cx: number, cy: number, w: number, h: number, color = '#ffffff', color2 = '#111111') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fit = (txt: string, font: (px: number) => string, maxW: number, maxH: number) => {
    let px = maxH;
    ctx.font = font(px);
    const mw = ctx.measureText(txt).width;
    if (mw > maxW) px = (px * maxW) / mw;
    ctx.font = font(px);
    return px;
  };
  switch (name) {
    case 'VOLTEX': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2 + h * 0.4, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2 - h * 0.4, h / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = color2;
      fit('VOLTEX', (p) => `italic 900 ${p}px Arial Black, sans-serif`, w * 0.8, h * 0.72);
      ctx.fillText('VOLTEX', 0, h * 0.04);
      break;
    }
    case 'NIGHTGRID': {
      ctx.fillStyle = color;
      fit('NIGHTGRID', (p) => `900 ${p}px Arial Black, sans-serif`, w, h * 0.62);
      ctx.fillText('NIGHTGRID', 0, -h * 0.1);
      ctx.fillRect(-w * 0.45, h * 0.3, w * 0.9, h * 0.08);
      for (let i = 0; i < 9; i++) ctx.fillRect(-w * 0.45 + i * w * 0.11, h * 0.3, w * 0.012, -h * 0.05);
      break;
    }
    case 'HAKU': {
      ctx.strokeStyle = color; ctx.lineWidth = h * 0.09;
      ctx.strokeRect(-w / 2 + h * 0.05, -h / 2 + h * 0.05, w - h * 0.1, h - h * 0.1);
      ctx.fillStyle = color;
      fit('HAKU', (p) => `900 ${p}px Arial Black, sans-serif`, w * 0.8, h * 0.65);
      ctx.fillText('HAKU', 0, h * 0.04);
      break;
    }
    case 'ZENRYU': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(-w * 0.38, 0, h * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color2; ctx.beginPath(); ctx.arc(-w * 0.38, 0, h * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      fit('ZENRYU', (p) => `italic 800 ${p}px Arial, sans-serif`, w * 0.65, h * 0.7);
      ctx.textAlign = 'left';
      ctx.fillText('ZENRYU', -w * 0.24, h * 0.03);
      break;
    }
    case 'KANSO': {
      ctx.fillStyle = color;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = color2;
      fit('KANSO', (p) => `800 ${p}px Arial, sans-serif`, w * 0.8, h * 0.66);
      ctx.fillText('KANSO', 0, h * 0.04);
      break;
    }
    case 'STRATA': {
      ctx.fillStyle = color;
      fit('STRATA', (p) => `italic 900 ${p}px Arial Black, sans-serif`, w * 0.95, h * 0.7);
      ctx.fillText('STRATA', 0, 0);
      ctx.fillRect(-w / 2, h * 0.36, w * 0.6, h * 0.08);
      break;
    }
    case 'ORBITAL': {
      ctx.strokeStyle = color; ctx.lineWidth = h * 0.08;
      ctx.beginPath(); ctx.ellipse(0, 0, w * 0.48, h * 0.42, -0.12, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = color;
      fit('ORBITAL', (p) => `700 ${p}px Arial, sans-serif`, w * 0.72, h * 0.48);
      ctx.fillText('ORBITAL', 0, h * 0.03);
      break;
    }
    case 'TORQUE HOUSE': {
      ctx.fillStyle = color;
      fit('TORQUE', (p) => `900 ${p}px Impact, Arial Black, sans-serif`, w, h * 0.55);
      ctx.fillText('TORQUE', 0, -h * 0.2);
      fit('HOUSE', (p) => `700 ${p}px Arial, sans-serif`, w * 0.6, h * 0.35);
      ctx.fillText('HOUSE', 0, h * 0.28);
      break;
    }
    default: {
      ctx.fillStyle = color;
      fit(name, (p) => `italic 900 ${p}px Arial Black, sans-serif`, w, h * 0.7);
      ctx.fillText(name, 0, 0);
    }
  }
  ctx.restore();
}

/** Creates a canvas with the brand emblem (for UI). */
export function logoCanvas(id: string, size = 128): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  drawLogo(ctx, id, size / 2, size / 2, size * 0.9);
  return c;
}
