// Shared UI widgets: top bar, car stats panel, dyno chart, logos.
import type { CarBuild } from '../core/types';
import type { Game } from '../game/game';
import { CARS, carFullName } from '../data/cars';
import { BRANDS } from '../data/brands';
import { buildSpec, estimate, perfRating, topSpeedKmh } from '../sim/index';
import { fullTorqueAt } from '../sim/vehicle';
import { visualScore, styleLabel } from '../game/style';
import { fmtMoney } from '../core/state';
import { logoCanvas } from '../render/logos';
import { unlockedTier } from '../game/progression';
import { TIERS } from '../game/rivals';
import { bar, btn, h } from './dom';

export function topBar(game: Game, title: string, onBack?: () => void): HTMLElement {
  const p = game.profile;
  return h('div', { class: 'topbar' },
    onBack ? btn('◀ Back', onBack, 'small') : null,
    h('div', { class: 'logo' }, 'CUT ', h('b', {}, 'THE'), ' WIND'),
    h('div', { style: { fontSize: '22px', color: 'var(--cyan2)' } }, '// ' + title),
    h('div', { class: 'grow' }),
    p ? [
      h('div', { class: 'stat' }, h('small', {}, 'Day'), h('span', {}, String(p.day))),
      h('div', { class: 'stat' }, h('small', {}, 'Tier'), h('span', {}, TIERS[unlockedTier(p)].name)),
      h('div', { class: 'stat' }, h('small', {}, 'Rep'), h('span', { class: 'rep' }, p.rep.toLocaleString('en-US'))),
      h('div', { class: 'stat' }, h('small', {}, 'Cash'), h('span', { class: 'money' }, fmtMoney(p.money))),
    ] : null,
  );
}

export function brandLogo(brandOrId: string, size = 40): HTMLCanvasElement {
  const c = logoCanvas(brandOrId, size * 2);
  c.style.width = c.style.height = size + 'px';
  return c;
}

export function speedStr(game: Game, kmh: number): string {
  return game.settings.units === 'mph' ? `${(kmh * 0.6214).toFixed(0)} MPH` : `${kmh.toFixed(0)} KM/H`;
}

/** Car stats with optional comparison build (deltas shown as green/red). */
export function statsPanel(game: Game, b: CarBuild, cmp?: CarBuild): HTMLElement {
  const s = buildSpec(b), e = estimate(b);
  const s2 = cmp ? buildSpec(cmp) : null, e2 = cmp ? estimate(cmp) : null;
  const m = CARS[b.modelId];
  const row = (k: string, v: number, v2: number | null, max: number, fmt: (x: number) => string, lowerBetter = false) => {
    const better = v2 !== null && Math.abs(v2 - v) > 1e-3 ? (lowerBetter ? v2 < v : v2 > v) : null;
    return h('div', { class: 'statrow' },
      h('span', { class: 'k' }, k),
      bar(lowerBetter ? max - v : v, max, '', v2 !== null ? (lowerBetter ? max - v2 : v2) : undefined),
      h('span', { class: 'v' }, v2 !== null && better !== null ? h('span', { class: better ? 'up' : 'down' }, fmt(v2)) : fmt(v)));
  };
  const pr = perfRating(e.et), pr2 = e2 ? perfRating(e2.et) : null;
  const vs = visualScore(b), vs2 = cmp ? visualScore(cmp) : null;
  return h('div', { class: 'panel tight' },
    h('div', { class: 'row between' },
      h('div', {}, h('h3', { style: { margin: 0 } }, carFullName(b.modelId)), h('div', { class: 'dim', style: { fontSize: '12px' } }, `${m.year} · ${s.engineName} · ${s.drivetrain} · "${b.buildName}"`)),
      brandLogo(m.brand, 38)),
    h('div', { class: 'row', style: { margin: '8px 0', gap: '18px' } },
      h('div', {}, h('div', { class: 'dim', style: { fontSize: '11px' } }, 'PERFORMANCE'), h('div', { class: 'bigstat' }, String(pr2 ?? pr), pr2 !== null && pr2 !== pr ? h('span', { style: { fontSize: '16px', color: pr2 > pr ? 'var(--green)' : 'var(--red)' } }, ` ${pr2 > pr ? '+' : ''}${pr2 - pr}`) : null)),
      h('div', {}, h('div', { class: 'dim', style: { fontSize: '11px' } }, 'STYLE'), h('div', { class: 'bigstat', style: { color: 'var(--pink)' } }, String(vs2 ?? vs)), h('div', { class: 'dim', style: { fontSize: '11px' } }, styleLabel(vs2 ?? vs)))),
    row('Power', s.peakHp, s2?.peakHp ?? null, 1100, (x) => `${x.toFixed(0)} hp`),
    row('Torque', s.peakTorque, s2?.peakTorque ?? null, 1300, (x) => `${x.toFixed(0)} Nm`),
    row('Weight', s.mass, s2?.mass ?? null, 2000, (x) => `${x.toFixed(0)} kg`, true),
    row('Grip', s.tireMu * s.diffFactor, s2 ? s2.tireMu * s2.diffFactor : null, 2.1, (x) => x.toFixed(2)),
    row('0-100', e.zeroTo100, e2?.zeroTo100 ?? null, 12, (x) => `${x.toFixed(2)} s`, true),
    row('1/4 Mile', e.et, e2?.et ?? null, 19, (x) => `${x.toFixed(2)} s`, true),
    row('Trap', e.trap, e2?.trap ?? null, 320, (x) => speedStr(game, x)),
    row('Top Speed', topSpeedKmh(s), s2 ? topSpeedKmh(s2) : null, 380, (x) => speedStr(game, x)),
    (s2 ?? s).stress > 1 ? h('div', { style: { color: 'var(--red)', fontSize: '13px', marginTop: '6px' } }, `⚠ ENGINE STRESS ${((s2 ?? s).stress * 100).toFixed(0)}% — risk of overheating / engine failure`) : null,
    (s2 ?? s).fuelLimited ? h('div', { style: { color: 'var(--orange)', fontSize: '13px' } }, '⚠ Fuel system is limiting power') : null,
    (s2 ?? s).clutchLimited ? h('div', { style: { color: 'var(--orange)', fontSize: '13px' } }, '⚠ Clutch can\'t hold peak torque — it will slip') : null,
  );
}

/** Draws a dyno chart (power & torque) into a canvas; optional comparison build. */
export function dynoChart(b: CarBuild, cmp?: CarBuild, w = 320, hgt = 170): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = hgt * 2;
  c.style.width = w + 'px'; c.style.height = hgt + 'px';
  const ctx = c.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.fillStyle = '#05080e'; ctx.fillRect(0, 0, w, hgt);
  const specs = [buildSpec(b), cmp ? buildSpec(cmp) : null].filter(Boolean) as ReturnType<typeof buildSpec>[];
  const maxRpm = Math.max(...specs.map((s) => s.revLimit)) + 300;
  let maxHp = 0, maxTq = 0;
  for (const s of specs) { maxHp = Math.max(maxHp, s.peakHp); maxTq = Math.max(maxTq, s.peakTorque); }
  const top = Math.max(maxHp, maxTq) * 1.15;
  ctx.strokeStyle = 'rgba(120,200,255,0.12)'; ctx.lineWidth = 1;
  for (let r = 1000; r < maxRpm; r += 1000) { const x = 30 + ((w - 40) * r) / maxRpm; ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, hgt - 20); ctx.stroke(); ctx.fillStyle = '#6a7a8a'; ctx.font = '9px Arial'; ctx.fillText(String(r / 1000), x - 3, hgt - 8); }
  const plot = (s: ReturnType<typeof buildSpec>, kind: 'hp' | 'tq', color: string, dash: number[]) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath();
    for (let r = 1000; r <= s.revLimit; r += 100) {
      const tq = fullTorqueAt(s, r);
      const val = kind === 'tq' ? tq : (tq * r * Math.PI) / 30 / 745.7;
      const x = 30 + ((w - 40) * r) / maxRpm, y = hgt - 20 - ((hgt - 30) * val) / top;
      r === 1000 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  };
  specs.forEach((s, i) => {
    plot(s, 'hp', i === 0 && specs.length > 1 ? 'rgba(47,211,255,0.4)' : '#2fd3ff', i === 0 && specs.length > 1 ? [4, 3] : []);
    plot(s, 'tq', i === 0 && specs.length > 1 ? 'rgba(255,138,31,0.4)' : '#ff8a1f', i === 0 && specs.length > 1 ? [4, 3] : []);
  });
  const s = specs[specs.length - 1];
  ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#2fd3ff'; ctx.fillText(`${s.peakHp.toFixed(0)} HP @ ${s.peakHpRpm}`, 34, 20);
  ctx.fillStyle = '#ff8a1f'; ctx.fillText(`${s.peakTorque.toFixed(0)} NM @ ${s.peakTorqueRpm}`, 34, 34);
  if (s.peakBoost > 0) { ctx.fillStyle = '#ff2f8e'; ctx.fillText(`${s.peakBoost.toFixed(2)} BAR`, w - 70, 20); }
  return c;
}

export function brandName(brand: string) { return (BRANDS as any)[brand]?.name ?? brand; }
