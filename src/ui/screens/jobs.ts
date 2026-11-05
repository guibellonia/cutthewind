// Job board + mini-games for daily work.
import type { Game, Screen } from '../../game/game';
import type { DailyJob } from '../../core/state';
import { earn, fmtMoney } from '../../core/state';
import { DIAGNOSE_CASES, jobPayout } from '../../game/jobs';
import { progressGigsJob } from '../../game/npc';
import { RNG } from '../../core/rng';
import { stockBuild } from '../../core/builds';
import { buildSpec } from '../../sim/index';
import { DragCar, MARKS } from '../../sim/physics';
import { audio } from '../../audio/audio';
import { btn, h, modal, toast } from '../dom';
import { topBar } from '../common';
import { HubScreen } from './hub';

type Finish = (score: number) => void;

/** Generic canvas mini-game runner: returns a cleanup function. */
function canvasGame(host: HTMLElement, w: number, hgt: number, frame: (ctx: CanvasRenderingContext2D, dt: number, t: number) => void, onKey?: (k: string) => void, onPointer?: (x: number, y: number, down: boolean) => void): () => void {
  const c = h('canvas', { class: 'mg-canvas', width: w, height: hgt }) as HTMLCanvasElement;
  host.append(c);
  const ctx = c.getContext('2d')!;
  let last = performance.now(), t = 0, alive = true;
  const loop = () => {
    if (!alive) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    frame(ctx, dt, t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const kd = (e: KeyboardEvent) => { if (e.key === ' ') e.preventDefault(); onKey?.(e.key.toLowerCase()); };
  window.addEventListener('keydown', kd);
  let down = false;
  const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * w, ((e.clientY - r.top) / r.height) * hgt]; };
  c.addEventListener('pointerdown', (e) => { down = true; const [x, y] = pos(e); onPointer?.(x, y, true); onKey?.(' '); });
  c.addEventListener('pointermove', (e) => { if (!down) return; const [x, y] = pos(e); onPointer?.(x, y, true); });
  window.addEventListener('pointerup', () => (down = false));
  return () => { alive = false; window.removeEventListener('keydown', kd); };
}

function dynoGame(host: HTMLElement, done: Finish) {
  let pull = 0, rpm = 1000, scores: number[] = [], wait = 0;
  const target = 6400 + Math.random() * 800;
  host.append(h('p', {}, 'Press SPACE (or click) exactly when the needle hits the blue shift window. Three pulls.'));
  const stop = canvasGame(host, 640, 220, (ctx, dt) => {
    if (wait > 0) { wait -= dt; } else if (pull < 3) { rpm += (900 + rpm * 0.35) * dt * (1 + pull * 0.25); if (rpm > 8200) { scores.push(0); pull++; rpm = 1000; wait = 0.6; audio.error(); } }
    ctx.fillStyle = '#05080e'; ctx.fillRect(0, 0, 640, 220);
    const X = (r: number) => 30 + (r / 8500) * 580;
    ctx.fillStyle = '#c01818'; ctx.fillRect(X(7600), 90, X(8500) - X(7600), 40);
    ctx.fillStyle = '#2fd3ff'; ctx.fillRect(X(target - 150), 90, X(target + 150) - X(target - 150), 40);
    ctx.strokeStyle = '#334'; ctx.strokeRect(30, 90, 580, 40);
    ctx.fillStyle = '#ff3a1a'; ctx.fillRect(X(rpm) - 3, 80, 6, 60);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Orbitron, Arial'; ctx.fillText(`PULL ${Math.min(3, pull + 1)}/3   ${Math.round(rpm)} RPM`, 30, 50);
    ctx.font = '16px Arial'; ctx.fillStyle = '#8ae8ff'; ctx.fillText(scores.map((s) => `${Math.round(s * 100)}%`).join('  '), 30, 180);
    if (pull >= 3) { stop(); done(scores.reduce((a, b) => a + b, 0) / 3); }
  }, (k) => {
    if (k !== ' ' || wait > 0 || pull >= 3) return;
    const err = Math.abs(rpm - target);
    const s = Math.max(0, 1 - err / 900);
    scores.push(s); pull++; rpm = 1000; wait = 0.6;
    audio.beep(s > 0.8 ? 1200 : 500, 0.1);
  });
}

function timingGame(host: HTMLElement, done: Finish) {
  let round = 0, pos = 0, dir = 1, scores: number[] = [];
  host.append(h('p', {}, 'Stop the timing light inside the green window (SPACE / click). The window shrinks every round.'));
  const stop = canvasGame(host, 640, 180, (ctx, dt) => {
    pos += dir * dt * (0.8 + round * 0.4);
    if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
    const win = 0.16 - round * 0.04, c = 0.3 + round * 0.18;
    ctx.fillStyle = '#05080e'; ctx.fillRect(0, 0, 640, 180);
    ctx.fillStyle = '#1f6f2f'; ctx.fillRect(30 + (c - win / 2) * 580, 70, win * 580, 40);
    ctx.strokeStyle = '#334'; ctx.strokeRect(30, 70, 580, 40);
    ctx.fillStyle = '#ffe066'; ctx.fillRect(30 + pos * 580 - 3, 60, 6, 60);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Orbitron, Arial'; ctx.fillText(`ENGINE ${Math.min(3, round + 1)}/3`, 30, 40);
    if (round >= 3) { stop(); done(scores.reduce((a, b) => a + b, 0) / 3); }
  }, (k) => {
    if (k !== ' ' || round >= 3) return;
    const win = 0.16 - round * 0.04, c = 0.3 + round * 0.18;
    const s = Math.max(0, 1 - Math.abs(pos - c) / (win * 1.2));
    scores.push(s); round++; audio.beep(s > 0.6 ? 1200 : 400, 0.08);
  });
}

function detailGame(host: HTMLElement, done: Finish) {
  const W = 640, H = 300;
  const rng = new RNG(Date.now() & 0xffff);
  const marks = Array.from({ length: 70 }, () => ({ x: rng.range(30, W - 30), y: rng.range(30, H - 30), r: rng.range(8, 26), a: 1 }));
  let time = 15;
  host.append(h('p', {}, 'Drag the polisher over the swirl marks before the owner arrives (15 s).'));
  let px = -100, py = -100;
  const stop = canvasGame(host, W, H, (ctx, dt) => {
    time -= dt;
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1c2154'); g.addColorStop(1, '#2a3580');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const m of marks) { if (m.a <= 0) continue; ctx.strokeStyle = `rgba(220,230,255,${m.a * 0.5})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 1.7); ctx.stroke(); ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 0.6, 0.5, Math.PI * 1.9); ctx.stroke(); }
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 30, 0, Math.PI * 2); ctx.stroke();
    const left = marks.filter((m) => m.a > 0.05).length;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Orbitron, Arial'; ctx.fillText(`${Math.max(0, time).toFixed(1)} s   swirls left ${left}`, 20, 30);
    if (time <= 0 || left === 0) { stop(); done(1 - left / marks.length); }
  }, undefined, (x, y) => { px = x; py = y; for (const m of marks) if (Math.hypot(m.x - x, m.y - y) < 34) m.a -= 0.08; });
}

function tiresGame(host: HTMLElement, done: Finish) {
  const order = [1, 3, 5, 2, 4];
  let wheel = 0, step = 0, time = 14, errors = 0;
  host.append(h('p', {}, 'Tighten the lug nuts in STAR order. Press the number shown on the highlighted nut (keys 1–5). Three wheels, 14 seconds.'));
  const stop = canvasGame(host, 640, 300, (ctx, dt) => {
    time -= dt;
    ctx.fillStyle = '#05080e'; ctx.fillRect(0, 0, 640, 300);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(320, 160, 110, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(320, 160, 70, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const x = 320 + Math.cos(a) * 45, y = 160 + Math.sin(a) * 45;
      const idx = order.indexOf(i + 1);
      const doneNut = idx < step;
      ctx.fillStyle = doneNut ? '#45ff8f' : idx === step ? '#ffcc00' : '#999';
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x, y + 6); ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Orbitron, Arial'; ctx.fillText(`WHEEL ${Math.min(3, wheel + 1)}/3   ${Math.max(0, time).toFixed(1)} s   errors ${errors}`, 20, 30);
    if (wheel >= 3 || time <= 0) { stop(); done(Math.max(0, (wheel + step / 5) / 3 - errors * 0.08)); }
  }, (k) => {
    const n = Number(k);
    if (!(n >= 1 && n <= 5) || wheel >= 3) return;
    if (n === order[step]) { step++; audio.beep(900 + step * 80, 0.05); if (step >= 5) { step = 0; wheel++; audio.cash(); } } else { errors++; audio.error(); }
  });
}

function diagnoseGame(host: HTMLElement, done: Finish) {
  const rng = new RNG(Date.now() & 0xffff);
  const cases = rng.shuffle([...DIAGNOSE_CASES]).slice(0, 3);
  let i = 0, right = 0;
  const box = h('div', {});
  host.append(box);
  const show = () => {
    box.innerHTML = '';
    if (i >= cases.length) { done(right / cases.length); return; }
    const c = cases[i];
    box.append(h('h3', {}, `Customer ${i + 1}/3`), h('p', { style: { fontSize: '18px' } }, c.symptom),
      ...c.options.map((o, k) => h('div', { style: { margin: '4px 0' } }, btn(o, () => { const ok = k === c.answer; if (ok) { right++; audio.cash(); } else audio.error(); toast(ok ? 'Correct! ' + c.explain : 'Wrong. ' + c.explain, ok ? 'good' : 'bad', 3500); i++; show(); }, 'small'))));
  };
  show();
}

function deliveryGame(host: HTMLElement, done: Finish) {
  const spec = buildSpec(stockBuild('apex_vandal'));
  const car = new DragCar(spec, MARKS.eighth);
  car.allowBlow = false;
  car.x = 0; car.rpm = 3000;
  let started = false, t = 0;
  const target = 10.4;
  host.append(h('p', {}, `Courier sprint in the shop's Apex Vandal: 1/8 mile under ${target.toFixed(1)} s. Hold W/↑ for throttle, E/SPACE to launch and shift when the bar turns blue.`));
  let thr = false;
  const ku = (e: KeyboardEvent) => { if (['w', 'arrowup'].includes(e.key.toLowerCase())) thr = false; };
  const kd = (e: KeyboardEvent) => { if (['w', 'arrowup'].includes(e.key.toLowerCase())) thr = true; };
  window.addEventListener('keyup', ku); window.addEventListener('keydown', kd);
  const stop = canvasGame(host, 640, 220, (ctx, dt) => {
    if (started) { car.step(dt, { throttle: thr ? 1 : 0.15, launch: false, shiftUp: false, shiftDown: false, nitro: false }); t += dt; }
    else car.revFree(dt, thr ? 0.6 : 0);
    const shiftAt = car.launched ? spec.shiftRpms[car.gear - 1] : spec.launchHi;
    ctx.fillStyle = '#05080e'; ctx.fillRect(0, 0, 640, 220);
    const f = Math.min(1, car.rpm / spec.revLimit);
    ctx.fillStyle = car.rpm > shiftAt * 0.96 ? '#2fd3ff' : '#ff8a1f'; ctx.fillRect(30, 60, 580 * f, 28);
    ctx.strokeStyle = '#334'; ctx.strokeRect(30, 60, 580, 28);
    ctx.fillStyle = '#45ff8f'; ctx.fillRect(30, 130, Math.min(580, (car.x / MARKS.eighth) * 580), 14);
    ctx.strokeRect(30, 130, 580, 14);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Orbitron, Arial';
    ctx.fillText(`${started ? t.toFixed(2) : 'READY — press E'}   GEAR ${car.launched ? car.gear : 'N'}   ${car.speedKmh.toFixed(0)} km/h`, 30, 40);
    if (car.finished) { stop(); window.removeEventListener('keyup', ku); window.removeEventListener('keydown', kd); done(Math.max(0, Math.min(1.2, (target + 1.6 - car.et) / 1.6))); }
  }, (k) => {
    if (k === 'e' || k === ' ' || k === 'arrowright') {
      if (!started) { started = true; car.doLaunch(); }
      else { const ev = car.shiftUp(); if (ev) audio.shift(); }
    }
  });
}

const GAMES: Record<DailyJob['type'], (host: HTMLElement, done: Finish) => void> = {
  dyno: dynoGame, timing: timingGame, detail: detailGame, tires: tiresGame, diagnose: diagnoseGame, delivery: deliveryGame,
};

export class JobsScreen implements Screen {
  private body!: HTMLElement;
  constructor(private game: Game) {}
  enter() {
    const g = this.game;
    g.garageScene('home').focus('overview');
    this.body = h('div', { class: 'panel scroll', style: { position: 'absolute', left: '16px', top: '64px', width: 'min(720px, calc(100% - 32px))', bottom: '16px' } });
    g.ui.append(topBar(g, 'Job Board', () => g.setScreen(new HubScreen(g, 'jobs'))), this.body);
    this.render();
  }
  private render() {
    const p = this.game.profile!;
    this.body.innerHTML = '';
    this.body.append(h('div', { class: 'panel-title' }, `Today's work`, h('small', {}, `Day ${p.day} · refreshes when you sleep`)));
    for (const j of p.jobs) {
      this.body.append(h('div', { class: `item ${j.done ? 'locked' : ''}`, style: { alignItems: 'flex-start' } },
        h('div', { class: 'grow' }, h('div', { class: 'name' }, j.title), h('div', { class: 'dim', style: { fontSize: '12px' } }, `Client: ${j.client}`), h('div', { class: 'desc' }, j.desc)),
        h('div', { class: 'col', style: { alignItems: 'flex-end' } }, h('span', { class: 'price' }, `up to ${fmtMoney(j.pay * 1.25)}`), j.done ? h('span', { class: 'tag owned' }, `Done ${Math.round((j.result ?? 0) * 100)}%`) : btn('Start', () => this.play(j), 'primary small'))));
    }
    this.body.append(h('p', { class: 'dim', style: { marginTop: '12px' } }, 'Jobs pay according to how well you do. Some NPC gigs also count finished jobs.'));
  }
  private play(j: DailyJob) {
    const g = this.game;
    const host = h('div', {});
    let close = () => {};
    const content = h('div', {}, h('h2', {}, j.title), host);
    close = modal(content, { wide: true });
    GAMES[j.type](host, (score) => {
      const pay = jobPayout(j, score);
      const p = g.profile!;
      j.done = true;
      j.result = score;
      earn(p, pay, Math.round(j.rep * Math.max(0.3, score)));
      p.stats.jobs++;
      const gigMsgs = progressGigsJob(p);
      g.save();
      audio.cash();
      host.innerHTML = '';
      host.append(h('div', { class: 'banner', style: { color: score > 0.7 ? 'var(--green)' : 'var(--orange)', fontSize: '44px' } }, score > 0.9 ? 'FLAWLESS' : score > 0.6 ? 'GOOD JOB' : 'DONE'),
        h('p', { style: { fontSize: '20px' } }, `Score ${Math.round(score * 100)}% — paid ${fmtMoney(pay)}`),
        ...gigMsgs.map((m) => h('div', { class: 'desc' }, '◆ ' + m)),
        h('div', { class: 'row end' }, btn('Close', () => { close(); this.render(); }, 'primary')));
    });
  }
  exit() {}
}
