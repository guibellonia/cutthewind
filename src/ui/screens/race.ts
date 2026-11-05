// Drag race: staging, christmas tree, launch, shifting, nitrous, finish & results. Includes the tutorial.
import * as THREE from 'three';
import type { Game, Screen } from '../../game/game';
import type { RaceEvent, RivalProfile, VehicleSpec } from '../../core/types';
import { currentCar } from '../../core/state';
import { CarVisual, radialGlowTexture } from '../../render/car';
import { LANE_X, StripScene } from '../../render/stripScene';
import { buildSpec } from '../../sim/index';
import { DragCar, MARKS, type DriveInput, type ShiftEvent } from '../../sim/physics';
import { AIDriver } from '../../sim/ai';
import { audio, type EngineSound } from '../../audio/audio';
import { CARS, carFullName } from '../../data/cars';
import { btn, h, isTouch } from '../dom';
import { brandLogo, speedStr } from '../common';
import { visualScore } from '../../game/style';
import { perfRating, estimate } from '../../sim/index';

export interface RunStats { rt: number; et: number; trap: number; t60: number; t660: number; total: number; shifts: ShiftEvent[]; perfect: number; foul: boolean; blown: boolean; finished: boolean }
export interface RaceResult { won: boolean; player: RunStats; rival: RunStats; distance: number; venue: string }

export interface RaceSetup {
  venue: string;
  distance: number;
  rival: RivalProfile;
  event?: RaceEvent;
  tutorial?: boolean;
  onFinish: (r: RaceResult) => void;
  onResultsUi?: (r: RaceResult, host: HTMLElement) => void;
}

type Phase = 'intro' | 'staging' | 'armed' | 'tree' | 'race' | 'finish' | 'results';

class Smoke {
  private pool: THREE.Sprite[] = [];
  private life: number[] = [];
  private vel: THREE.Vector3[] = [];
  private i = 0;
  constructor(scene: THREE.Scene) {
    const mat = new THREE.SpriteMaterial({ map: radialGlowTexture('soft'), color: 0xb8bcc4, transparent: true, opacity: 0, depthWrite: false });
    for (let k = 0; k < 90; k++) {
      const s = new THREE.Sprite(mat.clone());
      s.visible = false;
      scene.add(s);
      this.pool.push(s);
      this.life.push(0);
      this.vel.push(new THREE.Vector3());
    }
  }
  emit(p: THREE.Vector3, strength: number, carSpeed: number) {
    const s = this.pool[this.i];
    this.life[this.i] = 1;
    s.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.25, (Math.random() - 0.5) * 0.4));
    s.scale.setScalar(0.8 + strength * 0.6);
    s.visible = true;
    this.vel[this.i].set((Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 0.8, carSpeed * 0.15 - 1);
    this.i = (this.i + 1) % this.pool.length;
  }
  update(dt: number) {
    this.pool.forEach((s, k) => {
      if (this.life[k] <= 0) { s.visible = false; return; }
      this.life[k] -= dt * 0.45;
      s.position.addScaledVector(this.vel[k], dt);
      s.scale.multiplyScalar(1 + dt * 1.4);
      (s.material as THREE.SpriteMaterial).opacity = Math.max(0, this.life[k] * 0.55);
    });
  }
}

interface Runner {
  car: DragCar;
  vis: CarVisual;
  spec: VehicleSpec;
  lane: number;
  engine: EngineSound | null;
  finishTotal: number;
  staged: boolean;
  lastGear: number;
}

const TREE_STEP = 0.5;

export class RaceScreen implements Screen {
  private strip!: StripScene;
  private p!: Runner;
  private r!: Runner;
  private ai!: AIDriver;
  private phase: Phase = 'intro';
  private t = 0; // phase timer
  private raceT = 0; // since green
  private keys = new Set<string>();
  private edges = new Set<string>();
  private throttle = 0;
  private hud!: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  private tach!: HTMLCanvasElement;
  private camMode = 0;
  private shake = 0;
  private smoke!: Smoke;
  private msgTimer = 0;
  private treeAmber = 0;
  private green = false;
  private playerFoul = false;
  private rivalFoul = false;
  private lessonStep = 0;
  private lessonHold = 0;
  private slowmo = 0;
  private finishedAt = -1;
  private cleanup: (() => void)[] = [];
  private launchMsgShown = false;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private stageTimer = 0;
  private result: RaceResult | null = null;

  constructor(private game: Game, private setup: RaceSetup) {}

  enter() {
    const g = this.game;
    g.releaseGarage();
    audio.musicOn(false);
    audio.crowd(true);
    const st = this.setup;
    this.strip = new StripScene(g.renderer, st.venue, st.distance, { meet: !!st.tutorial });
    const pb = currentCar(g.profile!);
    const pSpec = buildSpec(pb);
    const rSpec = buildSpec(st.rival.build);
    const mk = (spec: VehicleSpec, build: typeof pb, lane: number, vol: number, pan: number): Runner => {
      const car = new DragCar(spec, st.distance);
      car.x = -2.6;
      car.allowBlow = !st.tutorial;
      const vis = new CarVisual(build, { beams: true });
      this.strip.scene.add(vis.root);
      vis.root.position.set(lane, 0, car.x - vis.shape.zF);
      return { car, vis, spec, lane, engine: audio.engine(spec.cylinders, vol, pan), finishTotal: 0, staged: false, lastGear: 0 };
    };
    this.p = mk(pSpec, pb, LANE_X.player, 1, -0.1);
    this.r = mk(rSpec, st.rival.build, LANE_X.rival, 0.45, 0.5);
    this.ai = new AIDriver(this.r.car, st.rival.skill, Math.floor(Math.random() * 1e6));
    this.smoke = new Smoke(this.strip.scene);
    const cam = this.strip.camera;
    g.setView(this.strip.scene, cam);
    this.buildHud();
    this.bindInput();
    this.phase = st.tutorial ? 'staging' : 'intro';
    this.t = 0;
    if (st.tutorial) this.lesson(1);
    this.camPos.set(0, 3, -12);
    this.camLook.set(0, 0.6, 0);
  }

  // =============================================================== input
  private bindInput() {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) this.edges.add(k);
      this.keys.add(k);
      if (k === 'c') this.camMode = (this.camMode + 1) % 3;
      if (k === 'escape' && this.phase !== 'results') this.abort();
      if ((k === 'enter' || k === ' ') && this.phase === 'intro') this.toStaging();
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    this.cleanup.push(() => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });
  }

  private held(...ks: string[]) { return ks.some((k) => this.keys.has(k)); }
  private pressed(...ks: string[]) { return ks.some((k) => this.edges.has(k)); }

  // =============================================================== HUD
  private buildHud() {
    const g = this.game;
    this.tach = h('canvas', { width: 480, height: 480, style: { width: '240px', height: '240px' } }) as HTMLCanvasElement;
    const bulb = (cls: string) => h('div', { class: `bulb ${cls}` });
    const tree = h('div', { class: 'tree2d' });
    const tb: Record<string, HTMLElement> = {};
    for (const [k, cls] of [['pre', 'small w'], ['stage', 'small w'], ['a1', 'a'], ['a2', 'a'], ['a3', 'a'], ['g', 'g'], ['r', 'r']] as const) {
      for (const lane of ['p', 'r']) { const b = bulb(cls); tb[`${lane}_${k}`] = b; tree.append(b); }
    }
    this.els.tree = tree;
    Object.assign(this.els, Object.fromEntries(Object.entries(tb).map(([k, v]) => ['tb_' + k, v])));
    const progress = h('div', { class: 'progress' },
      ...[MARKS.ft60, MARKS.eighth, MARKS.ft1000, MARKS.quarter].filter((m) => m <= this.setup.distance + 1).map((m) => h('div', { class: 'mark', style: { left: (m / this.setup.distance) * 100 + '%' } })),
    );
    this.els.pcar = h('div', { class: 'car p' });
    this.els.rcar = h('div', { class: 'car r' });
    progress.append(this.els.pcar, this.els.rcar);
    this.els.gear = h('div', { class: 'gearbox' }, 'N');
    this.els.speed = h('div', { class: 'speed' }, '0', h('small', {}, g.settings.units === 'mph' ? 'MPH' : 'KM/H'));
    this.els.timer = h('div', { class: 'timer' }, '0.000');
    this.els.msg = h('div', { class: 'msg' });
    const gauge = (cls: string, label: string) => {
      const fill = h('div', { class: 'fill' });
      const el = h('div', { class: `gauge ${cls}` }, label, h('div', { class: 'bar' }, fill));
      return [el, fill] as const;
    };
    const [gb, fb] = gauge('boost', 'Boost');
    const [gn, fn] = gauge('nos', 'Nitrous');
    const [gt, ft] = gauge('temp', 'Engine temp');
    this.els.boostFill = fb; this.els.nosFill = fn; this.els.tempFill = ft;
    this.els.lesson = h('div', { class: 'lesson' });
    const keys = h('div', { class: 'keys' },
      h('div', {}, h('kbd', {}, 'W'), ' / ', h('kbd', {}, '↑'), ' throttle · creep'),
      h('div', {}, h('kbd', {}, 'E'), ' / ', h('kbd', {}, '→'), ' launch · shift up'),
      h('div', {}, h('kbd', {}, 'Q'), ' / ', h('kbd', {}, '←'), ' shift down'),
      h('div', {}, h('kbd', {}, 'SPACE'), ' nitrous · ', h('kbd', {}, 'S'), ' back up'),
      h('div', {}, h('kbd', {}, 'C'), ' camera · ', h('kbd', {}, 'ESC'), ' forfeit'),
    );
    this.hud = h('div', { class: 'hud' },
      keys, tree, progress, this.els.timer, this.els.msg, this.els.lesson,
      h('div', { class: 'tach' }, this.tach), this.els.gear, this.els.speed,
      h('div', { class: 'gauges' }, this.p.spec.peakBoost > 0 ? gb : null, this.p.spec.nitroHp > 0 ? gn : null, gt),
    );
    g.ui.append(this.hud);
    if (!this.setup.tutorial) g.ui.append(this.rivalCard());
    if (isTouch()) this.touchControls();
  }

  private rivalCard(): HTMLElement {
    const rv = this.setup.rival;
    const m = CARS[rv.build.modelId];
    const card = h('div', { class: 'rival-card panel' },
      h('div', { class: 'row' }, brandLogo(m.brand, 44), h('div', {}, h('h2', { style: { margin: 0, color: rv.boss ? 'var(--red)' : '#fff' } }, rv.name), h('div', { class: 'dim' }, `"${rv.nickname}" · ${rv.crew}`))),
      h('div', { style: { margin: '8px 0', fontFamily: 'var(--font)', fontWeight: '800', fontSize: '20px', fontStyle: 'italic' } }, `${carFullName(m.id)} — "${rv.build.buildName}"`),
      h('div', { class: 'dim' }, `${rv.style} · Style ${visualScore(rv.build)} · PR ${perfRating(estimate(rv.build).et)}`),
      h('p', { style: { fontSize: '19px', fontStyle: 'italic', color: '#fff' } }, `“${rv.quote}”`),
      h('div', { class: 'dim', style: { fontSize: '12px' } }, 'ENTER / SPACE to stage'),
    );
    this.els.card = card;
    return card;
  }

  private touchControls() {
    const pad = h('div', { class: 'touchpad' });
    const mkBtn = (label: string, style: Record<string, string>, key: string) => {
      const b = h('button', { style }, label);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!this.keys.has(key)) this.edges.add(key); this.keys.add(key); });
      const upf = () => this.keys.delete(key);
      b.addEventListener('pointerup', upf);
      b.addEventListener('pointerleave', upf);
      return b;
    };
    pad.append(
      mkBtn('GAS', { left: '30px' }, 'w'),
      mkBtn('BACK', { left: '30px', bottom: '140px', width: '64px', height: '64px' }, 's'),
      mkBtn('SHIFT', { left: '150px' }, 'e'),
      mkBtn('NOS', { right: '290px' }, ' '),
    );
    this.game.ui.append(pad);
  }

  private lesson(step: number) {
    this.lessonStep = step;
    const L = this.els.lesson;
    L.innerHTML = '';
    const T: Record<number, [string, string]> = {
      1: ['STEP 1/5 — STAGING', 'Tap <b>W</b> to creep forward. When your front tyres break the beams, the <b>PRE-STAGE</b> and then the <b>STAGE</b> bulbs light up on the tree (left of the screen). Roll too far and you\'re out of the beams — back up with <b>S</b>.'],
      2: ['STEP 2/5 — THROTTLE', 'You\'re staged. Now <b>feather W</b> to hold the needle inside the <b>GREEN launch window</b> on the tachometer. Too low and you bog. Too high and the tyres just spin.'],
      3: ['STEP 3/5 — READING THE TACH', 'Green arc = launch window. The <b>blue marker</b> is the perfect shift point for the current gear. Red = rev limiter. Keep holding the revs — the ambers are coming.'],
      4: ['STEP 4/5 — LAUNCH & SHIFT', 'When the light turns <b>GREEN</b>, press <b>E</b> to drop the clutch. Then press <b>E</b> again to shift up each time the needle hits the blue marker and the SHIFT light flashes.'],
      5: ['STEP 5/5 — NITROUS', 'Mags installed a small 50-shot for tonight. Hold <b>SPACE</b> to spray it — best after 1st gear, when the tyres can take it.'],
      6: ['RACE!', 'Keep the throttle pinned, shift on the marker, and use what\'s left of the nitrous. Voss is pulling away — he\'s faster, but he\'s not trying yet.'],
    };
    const t = T[step];
    if (!t) return;
    L.append(h('div', { class: 'panel' }, h('h3', { style: { margin: '0 0 4px' } }, t[0]), h('div', { html: t[1], style: { fontSize: '16px', lineHeight: '1.4' } })));
  }

  private flash(text: string, color = '#fff', time = 1.2, small = false) {
    const m = this.els.msg;
    m.textContent = text;
    m.style.color = color;
    m.style.opacity = '1';
    m.className = small ? 'msg small' : 'msg';
    this.msgTimer = time;
  }

  // =============================================================== phases
  private toStaging() {
    this.els.card?.remove();
    this.phase = 'staging';
    this.t = 0;
  }

  update(dt: number) {
    this.t += dt;
    const P = this.p, R = this.r;
    const pc = P.car, rc = R.car;
    const thrKey = this.held('w', 'arrowup');
    // analog throttle ramp
    this.throttle = Math.max(0, Math.min(1, this.throttle + (thrKey ? 5.5 : -7) * dt));

    switch (this.phase) {
      case 'intro':
        if (this.t > 6) this.toStaging();
        pc.revFree(dt, 0); rc.revFree(dt, 0);
        break;
      case 'staging': {
        const creep = this.held('s', 'arrowdown') ? -1 : this.held('w', 'arrowup') ? 0.6 : 0;
        if (!P.staged) pc.stageStep(dt, creep, 0); else pc.revFree(dt, this.throttle);
        const ai = this.ai.stagingInput();
        if (this.t > 1.2 && !R.staged) rc.stageStep(dt, ai.creep, 0); else rc.revFree(dt, 0.0);
        const inStage = pc.x > -0.07 && pc.x < 0.2;
        if (pc.x > 0.26 && !P.staged) this.flash('TOO DEEP — BACK UP (S)', '#ff3b3b', 0.3, true);
        if (inStage && Math.abs(pc.v) < 0.02 && !this.held('w', 'arrowup')) {
          this.stageTimer += dt;
          if (this.stageTimer > 0.35 && !P.staged) { P.staged = true; pc.v = 0; this.flash('STAGED', '#fff6d0', 0.8, true); audio.beep(700, 0.08); if (this.setup.tutorial) this.lesson(2); }
        } else this.stageTimer = 0;
        if (rc.x >= -0.12 && !R.staged) { R.staged = true; rc.v = 0; }
        if (P.staged && R.staged) { this.phase = 'armed'; this.t = 0; this.lessonHold = 0; }
        break;
      }
      case 'armed': {
        pc.revFree(dt, this.throttle);
        rc.revFree(dt, this.ai.revInput().throttle);
        if (this.pressed('e', 'arrowright')) this.foul();
        if (this.setup.tutorial) {
          const inWin = pc.rpm >= P.spec.launchLo && pc.rpm <= P.spec.launchHi;
          this.lessonHold = inWin ? this.lessonHold + dt : Math.max(0, this.lessonHold - dt * 0.5);
          if (this.lessonStep === 2 && this.lessonHold > 1.2) { this.lesson(3); this.lessonHold = 0; }
          if (this.lessonStep === 3 && this.t > 2.5 && this.lessonHold > 0.6) { this.lesson(4); this.phase = 'tree'; this.t = 0; }
        } else if (this.t > 1.0) { this.phase = 'tree'; this.t = 0; }
        break;
      }
      case 'tree': {
        pc.revFree(dt, this.throttle);
        rc.revFree(dt, this.ai.revInput().throttle);
        const amber = Math.min(3, Math.floor(this.t / TREE_STEP) + 1);
        if (amber !== this.treeAmber) { this.treeAmber = amber; audio.beep(820, 0.09, 0.12); }
        if (this.pressed('e', 'arrowright')) { this.foul(); break; }
        if (this.t >= TREE_STEP * 3) {
          this.green = true;
          this.phase = 'race';
          this.raceT = 0;
          this.t = 0;
          audio.beep(1250, 0.25, 0.16);
        }
        break;
      }
      case 'race':
        this.raceStep(dt);
        break;
      case 'finish':
        this.raceStep(dt);
        if (this.t > 2.2) this.showResults();
        break;
      case 'results':
        pc.step(dt, { throttle: 0, launch: false, shiftUp: false, shiftDown: false, nitro: false });
        rc.step(dt, { throttle: 0, launch: false, shiftUp: false, shiftDown: false, nitro: false });
        break;
    }
    this.updateTree();
    this.updateVisuals(dt);
    this.updateHud(dt);
    this.edges.clear();
  }

  private foul() {
    if (this.setup.tutorial) {
      this.flash('TOO EARLY! WAIT FOR GREEN', '#ff3b3b', 1.6);
      this.phase = 'armed';
      this.t = 0;
      this.treeAmber = 0;
      this.lesson(4);
      audio.error();
      return;
    }
    this.playerFoul = true;
    this.flash('RED LIGHT — FOUL START', '#ff3b3b', 2.5);
    audio.error();
    this.green = true;
    this.phase = 'race';
    this.raceT = 0;
    this.t = 0;
    this.p.car.doLaunch();
    this.p.car.reaction = -0.1;
  }

  private raceStep(dt: number) {
    const P = this.p, R = this.r;
    const pc = P.car, rc = R.car;
    this.raceT += dt;
    // ---- player
    const inp: DriveInput = { throttle: this.throttle, launch: false, shiftUp: false, shiftDown: false, nitro: this.held(' ') };
    if (!pc.launched) {
      if (this.pressed('e', 'arrowright')) {
        pc.doLaunch();
        pc.reaction = this.raceT;
        this.shake = 0.07;
        this.rateLaunch();
        if (this.setup.tutorial && this.lessonStep === 4) this.lesson(4);
      } else if (this.raceT > 4 && !this.setup.tutorial) {
        pc.doLaunch();
        pc.reaction = this.raceT;
      }
      pc.revFree(dt, this.throttle);
    } else {
      if (this.pressed('e', 'arrowright')) {
        const ev = pc.shiftUp();
        if (ev) this.onShift(ev);
      }
      if (this.pressed('q', 'arrowleft')) pc.shiftDown();
      pc.step(dt, inp);
    }
    // ---- rival
    const ri = this.ai.raceInput(this.raceT);
    if (ri.launch && !rc.launched) { rc.doLaunch(); rc.reaction = this.raceT; }
    if (ri.shiftUp && rc.launched) { const ev = rc.shiftUp(); if (ev) { this.r.engine?.blowOff(rc.boost); if (Math.random() < 0.3) this.r.vis.triggerBackfire(); } }
    if (rc.launched) rc.step(dt, ri); else rc.revFree(dt, ri.throttle);
    // ---- finish bookkeeping
    if (pc.finished && !P.finishTotal) { P.finishTotal = Math.max(0, pc.reaction) + pc.et; }
    if (rc.finished && !R.finishTotal) { R.finishTotal = Math.max(0, rc.reaction) + rc.et; }
    if (pc.blown && this.phase === 'race') { this.flash('ENGINE BLOWN!', '#ff3b3b', 3); }
    // tutorial pacing
    if (this.setup.tutorial) this.tutorialRace(dt);
    const pDone = pc.finished || pc.blown || this.playerFoul && this.raceT > 3;
    const rDone = rc.finished;
    if (this.phase === 'race' && ((pDone && (rDone || this.raceT > 30)) || (rDone && this.raceT > 28) || (pDone && rDone))) {
      this.phase = 'finish';
      this.t = 0;
      audio.cheer();
      const won = this.didWin();
      this.flash(won ? 'WIN' : 'LOSE', won ? '#45ff8f' : '#ff3b3b', 2.2);
    }
    if (this.phase === 'race' && pc.finished && !rc.finished && this.finishedAt < 0) { this.finishedAt = this.raceT; }
  }

  private tutorialRace(dt: number) {
    const pc = this.p.car;
    const g = this.game;
    if (!pc.launched) return;
    if (pc.gear === 1 && pc.rpm > this.p.spec.shiftRpms[0] * 0.9 && this.lessonStep < 5 && !pc.shifting) {
      g.timeScale = 0.3;
      this.flash('SHIFT NOW — E', '#2fd3ff', 0.2, true);
    } else if (this.lessonStep < 5 && g.timeScale < 1 && pc.gear >= 2) {
      g.timeScale = 1;
    }
    if (pc.gear >= 2 && this.lessonStep === 4 && pc.time > 1.0) this.lesson(5);
    if (this.lessonStep === 5) {
      if (pc.nitroActive || this.slowmo > 3) { this.lesson(6); g.timeScale = 1; this.slowmo = 0; }
      else { g.timeScale = 0.35; this.slowmo += dt / 0.35; this.flash('NITROUS — HOLD SPACE', '#49c2ff', 0.2, true); }
    }
    if (pc.finished) g.timeScale = 1;
  }

  private rateLaunch() {
    const pc = this.p.car, s = this.p.spec;
    const r = pc.launchRpm;
    let txt = 'GOOD LAUNCH', col = '#45ff8f';
    if (r >= s.launchLo && r <= s.launchHi) { txt = 'PERFECT LAUNCH'; col = '#2fd3ff'; }
    else if (r < s.launchLo - 600) { txt = 'BOGGED'; col = '#ff8a1f'; }
    else if (r > s.launchHi + 900) { txt = 'TOO MANY REVS'; col = '#ff8a1f'; }
    const rt = pc.reaction;
    this.flash(`${txt} · RT ${rt.toFixed(3)}`, col, 1.4, true);
  }

  private onShift(ev: ShiftEvent) {
    const col = { perfect: '#2fd3ff', good: '#45ff8f', early: '#ff8a1f', late: '#ff8a1f', missed: '#ff3b3b' }[ev.quality];
    this.flash(`${ev.quality.toUpperCase()} SHIFT`, col, 0.9, true);
    audio.shift();
    this.p.engine?.blowOff(this.p.car.boost);
    if (ev.quality === 'late' || Math.random() < 0.25) { this.p.vis.triggerBackfire(); this.p.engine?.backfire(); }
    this.shake = Math.max(this.shake, 0.035);
    if (this.setup.tutorial && this.game.timeScale < 1) this.game.timeScale = 1;
  }

  private didWin(): boolean {
    const P = this.p, R = this.r;
    if (this.playerFoul && !this.rivalFoul) return false;
    if (P.car.blown) return false;
    if (P.car.finished && !R.car.finished) return true;
    if (!P.car.finished) return false;
    return P.finishTotal <= R.finishTotal;
  }

  private stats(run: Runner, foul: boolean): RunStats {
    const c = run.car;
    return {
      rt: Math.max(0, c.reaction), et: c.finished ? c.et : 0, trap: (c.splits.v1320 ?? (c.finished ? c.v : 0)) * 3.6, t60: c.splits.t60 ?? 0, t660: c.splits.t660 ?? 0,
      total: run.finishTotal, shifts: c.shifts, perfect: c.shifts.filter((s) => s.quality === 'perfect').length, foul, blown: c.blown, finished: c.finished,
    };
  }

  private showResults() {
    if (this.phase === 'results') return;
    this.phase = 'results';
    const g = this.game;
    g.timeScale = 1;
    const won = this.didWin();
    const res: RaceResult = { won, player: this.stats(this.p, this.playerFoul), rival: this.stats(this.r, this.rivalFoul), distance: this.setup.distance, venue: this.setup.venue };
    this.result = res;
    const fmt = (x: number, d = 3) => (x > 0 ? x.toFixed(d) : '—');
    const sp = (x: number) => (x > 0 ? speedStr(g, x) : '—');
    this.strip.setBoard(fmt(res.player.et), res.player.trap ? res.player.trap.toFixed(0) : '---', fmt(res.rival.et), res.rival.trap ? res.rival.trap.toFixed(0) : '---', won ? 'R' : 'L');
    const rv = this.setup.rival;
    const table = h('table', {},
      h('tr', {}, h('th', {}, ''), h('th', {}, g.profile!.name), h('th', {}, rv.name)),
      ...([
        ['Reaction', fmt(res.player.rt), fmt(res.rival.rt)],
        ['60 ft', fmt(res.player.t60), fmt(res.rival.t60)],
        ['1/8 mile', fmt(res.player.t660), fmt(res.rival.t660)],
        ['Elapsed time', fmt(res.player.et), fmt(res.rival.et)],
        ['Trap speed', sp(res.player.trap), sp(res.rival.trap)],
        ['Perfect shifts', String(res.player.perfect), String(res.rival.perfect)],
        ['Finish (incl. RT)', fmt(res.player.total), fmt(res.rival.total)],
      ] as [string, string, string][]).map(([k, a, b]) => h('tr', {}, h('td', {}, k), h('td', {}, a), h('td', {}, b))),
    );
    const host = h('div', { class: 'col' });
    const panel = h('div', { class: 'results panel' },
      h('div', { class: `banner ${won ? 'win' : 'lose'}` }, won ? 'YOU WIN' : res.player.foul ? 'RED LIGHT' : res.player.blown ? 'ENGINE BLOWN' : 'YOU LOSE'),
      h('p', { style: { fontStyle: 'italic', fontSize: '18px' } }, `${rv.name}: “${won ? rv.loseQuote : rv.winQuote}”`),
      table, host,
      h('div', { class: 'row end', style: { marginTop: '10px' } }, btn('Continue', () => this.finishRace(), 'primary big')),
    );
    if (!this.setup.tutorial) this.setup.onResultsUi?.(res, host);
    this.hud.style.opacity = '0.25';
    g.ui.append(panel);
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter') this.finishRace(); };
    window.addEventListener('keydown', key);
    this.cleanup.push(() => window.removeEventListener('keydown', key));
  }

  private finished = false;
  private finishRace() {
    if (this.finished || !this.result) return;
    this.finished = true;
    this.setup.onFinish(this.result);
  }

  private abort() {
    if (this.setup.tutorial) return;
    this.playerFoul = true;
    const res: RaceResult = { won: false, player: this.stats(this.p, true), rival: this.stats(this.r, false), distance: this.setup.distance, venue: this.setup.venue };
    this.result = res;
    this.finishRace();
  }

  // =============================================================== visuals
  private updateTree() {
    const P = this.p, R = this.r;
    const set = (lane: 'player' | 'rival', run: Runner, foul: boolean) => {
      const x = run.car.x;
      const launched = run.car.launched;
      const st = { pre: !launched && x > -0.34 && x < 0.26, stage: !launched && x > -0.07 && x < 0.2, amber: this.phase === 'tree' ? this.treeAmber : 0, green: this.green && !foul, red: foul };
      this.strip.setTree(lane, st);
      const pre = lane === 'player' ? 'tb_p_' : 'tb_r_';
      const tog = (k: string, on: boolean) => this.els[pre + k]?.classList.toggle('on', on);
      tog('pre', st.pre); tog('stage', st.stage); tog('a1', st.amber >= 1); tog('a2', st.amber >= 2); tog('a3', st.amber >= 3); tog('g', st.green); tog('r', st.red);
    };
    set('player', P, this.playerFoul);
    set('rival', R, this.rivalFoul);
  }

  private updateVisuals(dt: number) {
    const g = this.game;
    for (const run of [this.p, this.r]) {
      const c = run.car;
      run.vis.root.position.z = c.x - run.vis.shape.zF;
      run.vis.update(dt, { speed: c.v, wheelSpin: c.omegaW * c.spec.tireRadius, accel: c.a, braking: c.braking, rpm: c.rpm, redline: c.spec.redline, nitro: c.nitroActive, throttle: c.throttle });
      if (c.slipSpeed > 1.5 && c.launched) {
        for (const w of run.vis.wheels) {
          if ((c.spec.drivetrain === 'RWD' && w.front) || (c.spec.drivetrain === 'FWD' && !w.front)) continue;
          if (Math.random() < Math.min(0.9, c.slipSpeed / 8)) this.smoke.emit(new THREE.Vector3(run.lane + w.x, 0.1, run.vis.root.position.z + w.z), Math.min(1, c.slipSpeed / 6), c.v);
        }
      }
      run.engine?.update(c.rpm, c.throttle, c.boost, c.nitroActive, c.limiterCut);
      if (c.gear !== run.lastGear) run.lastGear = c.gear;
    }
    this.smoke.update(dt);
    this.strip.updateCarLights([this.p.vis.root.position, this.r.vis.root.position]);
    // camera
    const cam = this.strip.camera;
    const pc = this.p.car;
    const pz = this.p.vis.root.position.z;
    const kmh = pc.v * 3.6;
    let pos = new THREE.Vector3(), look = new THREE.Vector3();
    if (this.phase === 'intro') {
      const a = this.t * 0.25 + 2.2;
      pos.set(Math.sin(a) * 9, 2.2, -3 + Math.cos(a) * 9);
      look.set(0, 0.6, -3);
    } else if (this.phase === 'staging' || this.phase === 'armed' || (this.phase === 'tree')) {
      pos.set(this.p.lane - 3.6, 1.15, 3.2);
      look.set(this.p.lane + 0.3, 0.45, -1.8);
      if (this.phase !== 'staging') { pos.set(this.p.lane - 0.4, 1.5, pz - 5.6); look.set(0, 1.2, pz + 6); }
    } else if (this.phase === 'finish' || this.phase === 'results') {
      pos.set(-9, 1.6, this.setup.distance + 25);
      look.copy(this.p.vis.root.position).add(new THREE.Vector3(0, 0.6, 0));
    } else {
      if (this.camMode === 0) { pos.set(this.p.lane * 0.55, 1.4 + kmh * 0.002, pz - 5.4 - kmh * 0.008); look.set(this.p.lane * 0.4, 0.85, pz + 9); }
      else if (this.camMode === 1) { pos.set(this.p.lane, 1.18, pz + 0.5); look.set(this.p.lane, 1.0, pz + 20); }
      else { pos.set(this.p.lane * 0.2, 2.6, pz - 9.5); look.set(0, 0.8, pz + 8); }
    }
    const k = this.phase === 'race' ? 1 : Math.min(1, dt * 3.5);
    this.camPos.lerp(pos, this.phase === 'race' && this.camMode === 1 ? 1 : Math.max(k, this.phase === 'race' ? 0.25 : 0));
    this.camLook.lerp(look, Math.max(k, this.phase === 'race' ? 0.3 : 0));
    this.shake = Math.max(0, this.shake - dt * 0.12) + (pc.nitroActive ? 0.004 : 0) + (pc.limiterCut ? 0.003 : 0);
    const sh = this.shake;
    cam.position.copy(this.camPos).add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0));
    cam.lookAt(this.camLook);
    const fov = this.phase === 'race' ? 58 + Math.min(20, kmh * 0.075) + (pc.nitroActive ? 4 : 0) : 50;
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
    g.renderer.speedBlur = this.phase === 'race' ? Math.max(0, Math.min(0.55, (kmh - 70) / 260)) + (pc.nitroActive ? 0.18 : 0) : 0;
  }

  private updateHud(dt: number) {
    const pc = this.p.car, rc = this.r.car, s = this.p.spec;
    // message fade
    if (this.msgTimer > 0) { this.msgTimer -= dt; if (this.msgTimer <= 0) this.els.msg.style.opacity = '0'; }
    this.els.gear.textContent = pc.launched ? (pc.shifting ? '·' : String(pc.gear)) : 'N';
    const sp = this.game.settings.units === 'mph' ? pc.speedKmh * 0.6214 : pc.speedKmh;
    this.els.speed.firstChild!.textContent = sp.toFixed(0);
    this.els.timer.textContent = this.green ? (pc.finished ? (Math.max(0, pc.reaction) + pc.et) : this.raceT).toFixed(3) : '0.000';
    this.els.pcar.style.left = Math.max(0, Math.min(100, (pc.x / this.setup.distance) * 100)) + '%';
    this.els.rcar.style.left = Math.max(0, Math.min(100, (rc.x / this.setup.distance) * 100)) + '%';
    if (this.els.boostFill) this.els.boostFill.style.width = Math.max(0, Math.min(100, (pc.boost / Math.max(0.3, s.peakBoost * 1.1)) * 100)) + '%';
    if (this.els.nosFill) this.els.nosFill.style.width = (s.nitroCapacity > 0 ? (pc.nitroLeft / s.nitroCapacity) * 100 : 0) + '%';
    this.els.tempFill.style.width = Math.min(100, ((pc.temp - 0.3) / 0.7) * 100) + '%';
    this.drawTach();
  }

  private drawTach() {
    const c = this.tach, ctx = c.getContext('2d')!;
    const s = this.p.spec, pc = this.p.car;
    const W = 480, cx = 240, cy = 250, R = 200;
    ctx.clearRect(0, 0, W, W);
    const maxR = Math.ceil((s.revLimit + 600) / 1000) * 1000;
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const ang = (rpm: number) => a0 + (a1 - a0) * Math.min(1, Math.max(0, rpm / maxR));
    ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, Math.PI * 2); ctx.fillStyle = 'rgba(4,8,14,0.78)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(47,211,255,0.5)'; ctx.stroke();
    const arc = (r0: number, r1: number, col: string, w = 16) => { ctx.beginPath(); ctx.arc(cx, cy, R - 8, ang(r0), ang(r1)); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
    arc(0, maxR, 'rgba(255,255,255,0.06)');
    arc(s.redline, maxR, '#c01818');
    if (!pc.launched) arc(s.launchLo, s.launchHi, '#2bd65c', 22);
    const shiftAt = pc.launched && pc.gear > 0 ? s.shiftRpms[pc.gear - 1] : s.shiftRpms[0];
    arc(shiftAt * 0.965, Math.min(shiftAt * 1.025, s.revLimit), '#2fd3ff', 22);
    ctx.fillStyle = '#e8f1fb'; ctx.font = 'bold 24px Orbitron, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let r = 0; r <= maxR; r += 1000) {
      const a = ang(r);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30)); ctx.lineTo(cx + Math.cos(a) * (R - 46), cy + Math.sin(a) * (R - 46)); ctx.stroke();
      ctx.fillText(String(r / 1000), cx + Math.cos(a) * (R - 70), cy + Math.sin(a) * (R - 70));
    }
    // needle
    const a = ang(pc.rpm);
    ctx.strokeStyle = '#ff3a1a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 20, cy - Math.sin(a) * 20); ctx.lineTo(cx + Math.cos(a) * (R - 22), cy + Math.sin(a) * (R - 22)); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fillStyle = '#222'; ctx.fill();
    ctx.fillStyle = '#8ae8ff'; ctx.font = 'bold 20px Orbitron, Arial'; ctx.fillText('x1000 RPM', cx, cy + 70);
    ctx.font = 'bold 30px Orbitron, Arial'; ctx.fillStyle = '#fff'; ctx.fillText(String(Math.round(pc.rpm / 10) * 10), cx, cy + 110);
    // shift light
    const near = pc.launched ? pc.rpm >= shiftAt * 0.95 : pc.rpm >= s.launchLo && pc.rpm <= s.launchHi;
    const blink = Math.floor(performance.now() / 70) % 2 === 0;
    ctx.fillStyle = near && blink ? (pc.launched ? '#2fd3ff' : '#2bd65c') : 'rgba(255,255,255,0.08)';
    ctx.font = 'italic 900 34px "Saira Condensed", Arial';
    ctx.fillText(pc.launched ? 'SHIFT' : 'LAUNCH', cx, cy - 70);
    if (pc.limiterCut) { ctx.fillStyle = '#ff3030'; ctx.font = 'bold 20px Arial'; ctx.fillText('LIMITER', cx, cy - 36); }
    if (pc.tireSlip && pc.slipSpeed > 1.5) { ctx.fillStyle = '#ff8a1f'; ctx.font = 'bold 20px Arial'; ctx.fillText('WHEELSPIN', cx, cy - 36); }
    if (pc.nitroActive) { ctx.fillStyle = '#49c2ff'; ctx.font = 'bold 20px Arial'; ctx.fillText('NITROUS', cx, cy + 40); }
  }

  exit() {
    for (const c of this.cleanup) c();
    this.game.timeScale = 1;
    this.game.renderer.speedBlur = 0;
    this.p.engine?.stop();
    this.r.engine?.stop();
    audio.crowd(false);
    this.p.vis.dispose();
    this.r.vis.dispose();
    this.strip.dispose();
  }
}
