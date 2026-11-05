// Window masks for the glass overlays: side daylight openings in (s, y) space and the windshield / rear glass
// in (s, x) space. Outlines follow smoothed belt / roof-rail lines of the body, so the openings stay clean
// regardless of the shell's mesh resolution.
import * as THREE from 'three';
import type { BodyShape } from './bodyShape';
import type { GlassFrame } from './bodyMesh';
import { canvas, tex } from './textures';

const PX_PER_M = 420;

function smoothCurve(f: (s: number) => number, s0: number, s1: number, n: number, win: number): (s: number) => number {
  const xs: number[] = [], raw: number[] = [];
  for (let i = 0; i <= n; i++) { const s = s0 + ((s1 - s0) * i) / n; xs.push(s); raw.push(f(s)); }
  const k = Math.max(1, Math.round((win / (s1 - s0)) * n));
  const sm = raw.map((_, i) => {
    let a = 0, c = 0;
    for (let d = -k; d <= k; d++) { const j = i + d; if (j < 0 || j > n) continue; const w = 1 - Math.abs(d) / (k + 1); a += raw[j] * w; c += w; }
    return a / c;
  });
  return (s: number) => {
    const t = Math.min(n, Math.max(0, ((s - s0) / (s1 - s0)) * n));
    const i = Math.min(n - 1, Math.floor(t)), f2 = t - i;
    return sm[i] + (sm[i + 1] - sm[i]) * f2;
  };
}

/** Least-squares polynomial fit of f over [a, b]; evaluated with clamping to [lo, hi]. */
function polyFit(f: (s: number) => number, a: number, b: number, deg: 1 | 2, lo = a, hi = b): (s: number) => number {
  const n = 40, m = deg + 1;
  const A: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const r: number[] = new Array(m).fill(0);
  const c = (a + b) / 2, k = 2 / (b - a);
  for (let i = 0; i <= n; i++) {
    const s = a + ((b - a) * i) / n, t = (s - c) * k, y = f(s);
    const p = [1, t, t * t];
    for (let u = 0; u < m; u++) { r[u] += p[u] * y; for (let w = 0; w < m; w++) A[u][w] += p[u] * p[w]; }
  }
  for (let u = 0; u < m; u++) for (let w = u + 1; w < m; w++) { const q = A[w][u] / A[u][u]; for (let z = u; z < m; z++) A[w][z] -= q * A[u][z]; r[w] -= q * r[u]; }
  const co = new Array(m).fill(0);
  for (let u = m - 1; u >= 0; u--) { let acc = r[u]; for (let w = u + 1; w < m; w++) acc -= A[u][w] * co[w]; co[u] = acc / A[u][u]; }
  return (s: number) => { const t = (Math.min(hi, Math.max(lo, s)) - c) * k; return co[0] + co[1] * t + (deg === 2 ? co[2] * t * t : 0); };
}

export interface GlassStyle { tint: string; tintAmount: number; blackPillars: boolean }

export function glassMasks(shape: BodyShape, F: GlassFrame, st: GlassStyle): { side: THREE.CanvasTexture; top: THREE.CanvasTexture } {
  const sh = shape.sh;
  const L = shape.L;
  // belt and roof-rail lines are fitted with low-order polynomials over the side-window span so the
  // openings have clean, continuous edges
  const wA = sh.wsBase + 0.03, wB = Math.max(sh.sideWindowEnd, sh.roofStart + 0.12);
  const belt = polyFit((s) => shape.belt(s), wA, wB, 1);
  const rail = polyFit((s) => shape.cabinEdge(s)[1], sh.roofStart - 0.02, Math.min(wB, sh.roofEnd + 0.04), 2, wA, wB);
  const railX = smoothCurve((s) => shape.cabinEdge(s)[0], F.s0, F.s1, 160, 0.025);
  const glassCol = new THREE.Color(st.tint).lerp(new THREE.Color(0x020304), 0.55 + st.tintAmount * 0.35);
  const glassHex = '#' + glassCol.getHexString();
  const hi = '#' + glassCol.clone().lerp(new THREE.Color(0x8fa3b8), 0.22).getHexString();
  const TRIM = '#07080a';

  // ---- side
  const W = Math.round((F.s1 - F.s0) * L * PX_PER_M);
  const HS = Math.round((F.y1 - F.y0) * PX_PER_M);
  const [cs, x] = canvas(W, HS);
  x.clearRect(0, 0, W, HS);
  const SX = (s: number) => ((s - F.s0) / (F.s1 - F.s0)) * W;
  const SY = (y: number) => HS * (1 - (y - F.y0) / (F.y1 - F.y0));
  const m = (v: number) => v * PX_PER_M;
  const sA = sh.wsBase + 0.03, sAt = sh.roofStart + 0.005;
  const sR = Math.max(sh.sideWindowEnd, sAt + 0.1), sRt = Math.max(sAt + 0.06, Math.min(sh.roofEnd - 0.005, sR - 0.015));
  const bot = (s: number) => belt(s) + 0.02;
  const top = (s: number) => rail(s) - 0.03;
  const dlo = () => {
    x.beginPath();
    x.moveTo(SX(sA), SY(bot(sA)));
    const n = 40;
    for (let i = 1; i <= n; i++) { const s = sA + ((sR - sA) * i) / n; x.lineTo(SX(s), SY(bot(s))); }
    x.lineTo(SX(sRt), SY(top(sRt)));
    for (let i = 1; i <= n; i++) { const s = sRt + ((sAt - sRt) * i) / n; x.lineTo(SX(s), SY(top(s))); }
    x.closePath();
  };
  x.lineJoin = 'round';
  dlo();
  x.strokeStyle = TRIM; x.lineWidth = m(st.blackPillars ? 0.05 : 0.03); x.stroke();
  x.fillStyle = TRIM; x.fill();
  dlo();
  x.save(); x.clip();
  const g = x.createLinearGradient(0, SY(rail(sh.roofStart)), 0, SY(belt(sh.roofStart)));
  g.addColorStop(0, hi); g.addColorStop(0.45, glassHex); g.addColorStop(1, glassHex);
  x.fillStyle = g;
  x.fillRect(0, 0, W, HS);
  x.restore();
  // inner lip of the opening
  dlo();
  x.strokeStyle = TRIM; x.lineWidth = m(0.012); x.stroke();
  if (sh.bPillar > 0 && sh.bPillar > sA + 0.04 && sh.bPillar < sR - 0.04) {
    const bw = m(0.065);
    const bx = SX(sh.bPillar);
    if (st.blackPillars) {
      x.fillStyle = TRIM; x.fillRect(bx - bw / 2, SY(top(sh.bPillar)) - m(0.025), bw, SY(bot(sh.bPillar)) - SY(top(sh.bPillar)) + m(0.05));
    } else {
      x.save(); x.globalCompositeOperation = 'destination-out'; x.fillRect(bx - bw / 2, 0, bw, HS); x.restore();
      x.fillStyle = TRIM; x.fillRect(bx - bw / 2 - m(0.012), SY(top(sh.bPillar)) - m(0.02), m(0.012), SY(bot(sh.bPillar)) - SY(top(sh.bPillar)) + m(0.04));
      x.fillRect(bx + bw / 2, SY(top(sh.bPillar)) - m(0.02), m(0.012), SY(bot(sh.bPillar)) - SY(top(sh.bPillar)) + m(0.04));
      // trim the transparent band to the opening only
      x.save(); x.globalCompositeOperation = 'destination-out';
      x.fillRect(bx - bw / 2 - m(0.03), 0, bw + m(0.06), SY(top(sh.bPillar)) - m(0.02));
      x.fillRect(bx - bw / 2 - m(0.03), SY(bot(sh.bPillar)) + m(0.02), bw + m(0.06), HS);
      x.restore();
    }
  }

  // ---- windshield & rear glass
  const HT = Math.round(2 * F.xw * PX_PER_M);
  const [ct, t] = canvas(W, HT);
  t.clearRect(0, 0, W, HT);
  const TX = (s: number) => ((s - F.s0) / (F.s1 - F.s0)) * W;
  const TY = (xm: number) => HT * (0.5 - xm / (2 * F.xw)) ;
  const pane = (a: number, b: number, inset: number) => {
    t.beginPath();
    const n = 30;
    for (let i = 0; i <= n; i++) { const s = a + ((b - a) * i) / n; const w = Math.max(0.05, railX(s) - inset); if (i === 0) t.moveTo(TX(s), TY(w)); else t.lineTo(TX(s), TY(w)); }
    for (let i = n; i >= 0; i--) { const s = a + ((b - a) * i) / n; const w = Math.max(0.05, railX(s) - inset); t.lineTo(TX(s), TY(-w)); }
    t.closePath();
  };
  t.lineJoin = 'round';
  const panes: [number, number, number][] = [[sh.wsBase + 0.004, sh.roofStart - 0.004, 0.035]];
  if (sh.rearGlassBase - sh.roofEnd > 0.03) panes.push([sh.roofEnd + 0.006, sh.rearGlassBase - 0.008, 0.045]);
  for (const [a, b, inset] of panes) {
    pane(a, b, inset);
    t.strokeStyle = TRIM; t.lineWidth = m(0.035); t.stroke();
    t.fillStyle = TRIM; t.fill();
    pane(a, b, inset + 0.012);
    const gg = t.createLinearGradient(TX(a), 0, TX(b), 0);
    gg.addColorStop(0, glassHex); gg.addColorStop(0.5, hi); gg.addColorStop(1, glassHex);
    t.fillStyle = gg; t.fill();
  }
  const side = tex(cs), topT = tex(ct);
  side.anisotropy = topT.anisotropy = 8;
  return { side, top: topT };
}
