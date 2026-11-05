// Converts a CarBuild into a physics-ready VehicleSpec.
import type { CarBuild, EngineSpec, VehicleSpec } from '../core/types';
import { CARS } from '../data/cars';
import { ENGINES } from '../data/engines';
import { GEAR_SETS, INTERIOR_PARTS, perfPart, perfParts, type PerfFx, type PerfPart, type PerfSlot, type SuperchargerSpec, type TurboSpec } from '../data/perfParts';
import { visualPart, type VisualSlot } from '../data/visualParts';

export const RPM_STEP = 50;
export const RPM_SAMPLES = 220; // up to 10,950 rpm
const HP = 745.7;
const BOOST_EFF = 0.85;

/** Engines with stronger-than-usual factory bottom ends. */
const STRENGTH: Record<string, number> = { kr20dt: 1.6, kr20det: 1.6, wh32tt: 1.65, tk26tt: 1.85, tk30t: 1.75, ax20t: 1.5 };

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Monotone cubic (Fritsch–Carlson) interpolation through points. */
export function monotoneCurve(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * 0 ;
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/** Normalised naturally-aspirated torque shape for an engine (peak ≈ 1). */
function naShape(e: EngineSpec, rev: number): (rpm: number) => number {
  const forced = e.aspiration !== 'NA';
  const tq = forced ? (e.torqueRpm + e.powerRpm) / 2 : e.torqueRpm;
  const pw = e.powerRpm + rev * 0.8;
  const red = e.redline + rev;
  const tAtPw = Math.min(0.97, Math.max(0.74, (e.powerHp * HP) / ((e.powerRpm * Math.PI) / 30) / e.torqueNm));
  const tRed = Math.min(tAtPw * 0.97, (tAtPw * 0.9 * pw) / red);
  const xs = [0, e.idle, Math.min(tq, pw - 400), pw, red, red + 1800];
  const ys = [0.42, forced ? 0.58 : 0.64, 1.0, tAtPw, tRed, tRed * 0.55];
  return monotoneCurve(xs, ys);
}

export function turboFor(build: CarBuild, e: EngineSpec, fx: PerfFx[]): TurboSpec | null {
  const t = effectivePart('turbo', build.perf.turbo, e);
  if (t.fx.turbo) return t.fx.turbo;
  if (t.id === 'stock' && (e.aspiration === 'turbo' || e.aspiration === 'twinturbo')) {
    return { maxBoost: e.stockBoost + 0.45, defBoost: e.stockBoost, spoolStart: 0.28, spoolFull: e.aspiration === 'twinturbo' ? 0.5 : 0.46, lag: e.aspiration === 'twinturbo' ? 0.38 : 0.42, twin: e.aspiration === 'twinturbo' };
  }
  return null;
}

export function superchargerFor(build: CarBuild, e: EngineSpec): SuperchargerSpec | null {
  const s = effectivePart('supercharger', build.perf.supercharger, e);
  if (s.fx.sc) return s.fx.sc;
  if (e.aspiration === 'supercharged') {
    const pulley = s.fx.scBoost ?? 0;
    return { kind: 'twinscrew', maxBoost: e.stockBoost + 0.3 + pulley, defBoost: e.stockBoost + pulley, loss: 0.08 };
  }
  return null;
}

export function engineOf(build: CarBuild): EngineSpec {
  const m = CARS[build.modelId];
  return build.perf.engineSwap && build.perf.engineSwap !== 'stock' && ENGINES[build.perf.engineSwap]
    ? ENGINES[build.perf.engineSwap]
    : ENGINES[m.engineId];
}

/** Returns the installed part if it fits the current engine, else the slot default. */
export function effectivePart(slot: PerfSlot, id: string, e: EngineSpec): PerfPart {
  const list = perfParts(slot, e);
  return list.find((p) => p.id === id) ?? list[0];
}

export function tireRadius(size: number, tireWidth: number, profile: number) {
  return (size * 0.0254) / 2 + (tireWidth * profile) / 100 / 1000;
}

const VSLOTS: VisualSlot[] = ['frontBumper', 'rearBumper', 'sideSkirts', 'frontFenders', 'rearFenders', 'hood', 'hoodScoop', 'spoiler', 'mirrors', 'headlights', 'taillights', 'roof', 'exhaust', 'splitter', 'diffuser', 'canards'];

export interface BoostSetup { kind: 'none' | 'turbo' | 'sc'; spec: TurboSpec | SuperchargerSpec | null; target: number; max: number; tunable: boolean }

export function boostSetup(build: CarBuild): BoostSetup {
  const e = engineOf(build);
  const ecu = effectivePart('ecu', build.perf.ecu, e).fx;
  const t = turboFor(build, e, []);
  const sc = t ? null : superchargerFor(build, e);
  const tunable = !!ecu.tuneBoost;
  if (t) {
    const isFactory = effectivePart('turbo', build.perf.turbo, e).id === 'stock';
    const max = t.maxBoost + (isFactory ? ecu.boostAdd ?? 0 : 0);
    let target = t.defBoost + (isFactory ? Math.min(ecu.boostAdd ?? 0, 0.15) : 0);
    if (tunable && build.tune.boost > 0) target = Math.min(max, Math.max(0.2, build.tune.boost));
    return { kind: 'turbo', spec: t, target, max, tunable };
  }
  if (sc) {
    const max = sc.maxBoost;
    let target = sc.defBoost;
    if (tunable && build.tune.boost > 0) target = Math.min(max, Math.max(0.2, build.tune.boost));
    return { kind: 'sc', spec: sc, target, max, tunable };
  }
  return { kind: 'none', spec: null, target: 0, max: 0, tunable: false };
}

export function computeSpec(build: CarBuild): VehicleSpec {
  const m = CARS[build.modelId];
  const stockEngine = ENGINES[m.engineId];
  const e = engineOf(build);
  const p = build.perf;
  const slots = Object.keys(p) as PerfSlot[];
  const parts: PerfPart[] = slots.filter((s) => s !== 'engineSwap').map((s) => effectivePart(s, p[s], e));
  const fx = parts.map((x) => x.fx);
  const prod = (k: keyof PerfFx, def = 1) => fx.reduce((a, f) => a * ((f[k] as number | undefined) ?? def), 1);
  const sum = (k: keyof PerfFx) => fx.reduce((a, f) => a + ((f[k] as number | undefined) ?? 0), 0);
  const ecu = effectivePart('ecu', p.ecu, e).fx;

  const rev = sum('rev');
  const redline = e.redline + rev;
  let revLimit = redline + 200;
  if (ecu.tuneRev && build.tune.revLimit) revLimit = Math.min(redline + 600, Math.max(redline - 800, build.tune.revLimit));

  // ---------------- boost
  const bs = boostSetup(build);
  const ic = prod('ic');
  const isForcedStock = e.aspiration !== 'NA';
  const boostEff = BOOST_EFF * (bs.kind === 'none' ? 1 : ic);
  const boostCurve = new Float32Array(RPM_SAMPLES);
  const torqueNA = new Float32Array(RPM_SAMPLES);
  let scLoss = 0;
  let turboLag = 0.05;
  for (let i = 0; i < RPM_SAMPLES; i++) {
    const rpm = i * RPM_STEP;
    let b = 0;
    if (bs.kind === 'turbo') {
      const t = bs.spec as TurboSpec;
      b = bs.target * smoothstep(t.spoolStart * e.redline, t.spoolFull * e.redline, rpm);
    } else if (bs.kind === 'sc') {
      const s = bs.spec as SuperchargerSpec;
      if (s.kind === 'centrifugal') b = bs.target * Math.pow(Math.min(1.1, rpm / e.redline), 1.6);
      else b = bs.target * (0.72 + 0.28 * smoothstep(e.idle, e.redline * 0.45, rpm));
    }
    boostCurve[i] = b;
  }
  if (bs.kind === 'turbo') turboLag = (bs.spec as TurboSpec).lag * prod('icLag');
  if (bs.kind === 'sc') scLoss = (bs.spec as SuperchargerSpec).loss;

  // ---------------- calibrate NA base to factory power
  const shape0 = naShape(e, 0);
  const factoryBoost = (rpm: number) => {
    if (e.aspiration === 'turbo' || e.aspiration === 'twinturbo')
      return e.stockBoost * smoothstep(0.28 * e.redline, (e.aspiration === 'twinturbo' ? 0.5 : 0.46) * e.redline, rpm);
    if (e.aspiration === 'supercharged') return e.stockBoost * (0.72 + 0.28 * smoothstep(e.idle, e.redline * 0.45, rpm));
    return 0;
  };
  const factoryLoss = e.aspiration === 'supercharged' ? 0.08 : 0;
  let maxP = 0;
  for (let rpm = 1000; rpm <= e.redline + 300; rpm += 50) {
    const tq = shape0(rpm) * (1 + factoryBoost(rpm) * BOOST_EFF) * (1 - factoryLoss * (0.5 + 0.5 * rpm / e.redline));
    maxP = Math.max(maxP, tq * rpm);
  }
  const k = (e.powerHp * HP) / ((maxP * Math.PI) / 30);
  const shape = naShape(e, rev);
  const na = prod('na') * prod('disp');
  const low = prod('low');
  const top = prod('top');
  for (let i = 0; i < RPM_SAMPLES; i++) {
    const rpm = i * RPM_STEP;
    const t = smoothstep(0.25, 0.85, rpm / redline);
    const lt = Math.pow(low, 1 - t) * Math.pow(top, t);
    torqueNA[i] = k * shape(rpm) * na * lt;
  }

  // ---------------- fuel limit
  const fuelCap = (effectivePart('fuel', p.fuel, e).fx.fuelCap ?? 1.3) * e.powerHp;
  const fullTorque = (i: number) => torqueNA[i] * (1 + boostCurve[i] * boostEff) * (1 - scLoss * (0.5 + (0.5 * i * RPM_STEP) / redline));
  let peakHp = 0, peakHpRpm = 0, peakTorque = 0, peakTorqueRpm = 0;
  const scan = () => {
    peakHp = 0; peakTorque = 0;
    for (let i = 20; i < RPM_SAMPLES && i * RPM_STEP <= revLimit; i++) {
      const tq = fullTorque(i);
      const hp = (tq * i * RPM_STEP * Math.PI) / 30 / HP;
      if (hp > peakHp) { peakHp = hp; peakHpRpm = i * RPM_STEP; }
      if (tq > peakTorque) { peakTorque = tq; peakTorqueRpm = i * RPM_STEP; }
    }
  };
  scan();
  let fuelLimited = false;
  if (peakHp > fuelCap) {
    const f = fuelCap / peakHp;
    for (let i = 0; i < RPM_SAMPLES; i++) torqueNA[i] *= f;
    fuelLimited = true;
    scan();
  }

  // ---------------- drivetrain
  const gb = effectivePart('gearbox', p.gearbox, e).fx;
  let gears = m.gears.slice();
  if (gb.gearSet) gears = GEAR_SETS[gb.gearSet].gears.slice();
  if (gb.tuneGears && build.tune.gears.length === gears.length) gears = build.tune.gears.slice();
  let finalDrive = m.finalDrive;
  if (gb.tuneGears && build.tune.finalDrive > 0) finalDrive = build.tune.finalDrive;
  else if (build.tune.finalDrive > 0 && p.gearbox === 'stock') finalDrive = build.tune.finalDrive; // final drive swap allowed on stock box
  const interior = build.visual.interior;
  const shifterPart = INTERIOR_PARTS.find((x) => x.slot === 'shifter' && x.id === interior.shifter);
  const shiftTime = Math.max(0.06, (gb.shift ?? 0.34) + (shifterPart?.shift ?? 0));
  const cl = effectivePart('clutch', p.clutch, e).fx;
  const clutchTorque = Math.max(stockEngine.torqueNm, e.torqueNm) * (cl.clutch ?? 1.2);
  const clutchEngage = cl.engage ?? 0.32;
  const baseEff = m.drivetrain === 'RWD' ? 0.86 : m.drivetrain === 'FWD' ? 0.89 : 0.8;
  const driveEff = baseEff + sum('eff');
  let diffFactor = effectivePart('diff', p.diff, e).fx.diff ?? 0.94;
  if (m.drivetrain === 'AWD' && p.diff === 'stock') diffFactor = 0.97;
  if (m.drivetrain === 'FWD') diffFactor *= 0.97;

  // ---------------- mass
  let mass = m.weight + 75 + sum('weight') + (e.weight - stockEngine.weight);
  for (const s of VSLOTS) mass += visualPart(s, (build.visual as any)[s]).weight ?? 0;
  for (const ip of INTERIOR_PARTS) if ((interior as any)[ip.slot] === ip.id) mass += ip.weight ?? 0;
  const w = build.visual.wheels;
  mass += (w.size - m.stockWheelSize) * 1.1 * 4 + (w.width - 7.5) * 0.8 * 4;
  const engineDelta = e.weight - stockEngine.weight;
  const weightFront = Math.min(0.68, Math.max(0.36, (m.weightFront * m.weight + engineDelta * (m.body === 'midengine' ? 0.1 : 0.85)) / (m.weight + engineDelta)));

  // ---------------- tyres & chassis
  const tires = effectivePart('tires', p.tires, e).fx;
  const psi = Math.min(40, Math.max(14, build.tune.tirePressure || 32));
  const dragTire = p.tires === 'tr_dragr' || p.tires === 'tr_slick';
  const pressureF = 1 + (32 - psi) * (dragTire ? 0.009 : 0.004) - Math.max(0, 22 - psi) * (dragTire ? 0 : 0.01);
  const camber = (Math.abs(build.tune.camberF || w.camber) + Math.abs(build.tune.camberR || w.camber)) / 2;
  const camberF = 1 - camber * 0.012;
  const widthF = Math.pow(w.tireWidth / 225, 0.22);
  const tireMu = (tires.mu ?? 1.2) * widthF * pressureF * camberF;
  const tireMuSlide = (tires.muSlide ?? 1.05) * widthF * pressureF * camberF;
  const rollingRes = (tires.roll ?? 0.013) * (1 + Math.max(0, 32 - psi) * 0.02);
  const susp = effectivePart('suspension', p.suspension, e).fx;
  const cage = INTERIOR_PARTS.find((x) => x.slot === 'cage' && x.id === interior.cage);
  let weightTransfer = (susp.wt ?? 1) * (cage?.wt ?? 1);
  if (susp.tuneSusp) {
    const bias = build.tune.springF - build.tune.springR;
    if (m.drivetrain === 'RWD') weightTransfer *= 1 + bias * 0.16;
    else if (m.drivetrain === 'FWD') weightTransfer *= 1 - bias * 0.16;
    weightTransfer *= 1 + (0.5 - Math.abs(build.tune.damping - 0.4)) * 0.04;
  }
  const lowerMin = susp.lower ?? 0;
  const ride = Math.min(20, Math.max(lowerMin, build.tune.rideHeight));
  const cgHeight = m.cgHeight + ride / 1000 * 0.8;

  // ---------------- aero
  let cd = m.cd, down = 0;
  for (const s of VSLOTS) {
    const vp = visualPart(s, (build.visual as any)[s]);
    cd += vp.cd ?? 0;
    down += vp.down ?? 0;
  }
  const flare = (visualPart('frontFenders', build.visual.frontFenders).p.flare + visualPart('rearFenders', build.visual.rearFenders).p.flare) / 2;
  const cdA = cd * (m.frontalArea + flare * 2 * m.height * 0.5) * (1 + ride / 1000 * 0.3);

  // ---------------- nitrous / misc
  const nos = effectivePart('nitrous', p.nitrous, e).fx;
  const shot = Math.min(1, Math.max(0.3, build.tune.nitroShot || 1));
  const nitroHp = (nos.nitro ?? 0) * shot;
  const nitroCapacity = nos.nitroCap ? nos.nitroCap / shot : 0;
  const coolingFactor = prod('cool');
  const strength = (STRENGTH[e.id] ?? (e.aspiration === 'NA' ? 1.3 : 1.45)) * (effectivePart('internals', p.internals, e).fx.safe ?? 1);
  const safeTorque = e.torqueNm * strength;
  const nitroT = nitroHp > 0 ? (nitroHp * HP) / ((4500 * Math.PI) / 30) : 0;
  let stress = (peakTorque + nitroT * 0.6) / safeTorque;
  stress += Math.max(0, revLimit - (e.redline + sum('rev') + 300)) / 2000;

  const radius = tireRadius(w.size, w.tireWidth, w.profile);
  const engineInertia = (0.06 + 0.025 * e.displacement * prod('disp') + 0.01 * e.cylinders) * prod('inertia');
  const clutchLimited = peakTorque > clutchTorque;

  return {
    modelId: m.id,
    name: `${m.name}`,
    drivetrain: m.drivetrain,
    engineName: e.name,
    layout: e.layout,
    cylinders: e.cylinders,
    displacement: e.displacement * prod('disp'),
    aspiration: bs.kind === 'turbo' ? ((bs.spec as TurboSpec).twin ? 'twinturbo' : 'turbo') : bs.kind === 'sc' ? 'supercharged' : 'NA',
    torqueNA,
    boostCurve,
    boostEff,
    turboLag: bs.kind === 'sc' ? 0.05 : turboLag,
    scLoss,
    idle: e.idle,
    redline,
    revLimit,
    shiftRpm: redline,
    engineInertia,
    gears,
    finalDrive,
    shiftTime,
    clutchTorque,
    clutchEngage,
    driveEff,
    diffFactor,
    mass,
    weightFront,
    cgHeight,
    wheelbase: m.wheelbase,
    tireRadius: radius,
    tireMu,
    tireMuSlide,
    rollingRes,
    cdA,
    liftCoef: down,
    weightTransfer,
    nitroHp,
    nitroCapacity,
    launchControl: ecu.launch ? (build.tune.launchRpm || 0) : 0,
    coolingFactor,
    stress,
    peakHp,
    peakHpRpm,
    peakTorque,
    peakTorqueRpm,
    peakBoost: bs.target,
    shiftRpms: gears.map(() => redline),
    launchOpt: e.idle + (redline - e.idle) * 0.45,
    launchLo: 0,
    launchHi: 0,
    fuelLimited,
    clutchLimited,
    tireWidth: w.tireWidth,
    factoryHp: e.powerHp,
  };
}

/** Full-throttle steady-state torque at rpm. */
export function fullTorqueAt(s: VehicleSpec, rpm: number): number {
  const f = Math.min(RPM_SAMPLES - 1.001, Math.max(0, rpm / RPM_STEP));
  const i = Math.floor(f);
  const t = f - i;
  const na = s.torqueNA[i] * (1 - t) + s.torqueNA[i + 1] * t;
  const b = s.boostCurve[i] * (1 - t) + s.boostCurve[i + 1] * t;
  return na * (1 + b * s.boostEff) * (1 - s.scLoss * (0.5 + 0.5 * rpm / s.redline));
}

export function naTorqueAt(s: VehicleSpec, rpm: number): number {
  const f = Math.min(RPM_SAMPLES - 1.001, Math.max(0, rpm / RPM_STEP));
  const i = Math.floor(f);
  const t = f - i;
  return s.torqueNA[i] * (1 - t) + s.torqueNA[i + 1] * t;
}

export function boostTargetAt(s: VehicleSpec, rpm: number): number {
  const f = Math.min(RPM_SAMPLES - 1.001, Math.max(0, rpm / RPM_STEP));
  const i = Math.floor(f);
  const t = f - i;
  return s.boostCurve[i] * (1 - t) + s.boostCurve[i + 1] * t;
}

/** Compute optimal upshift rpm per gear by comparing wheel force before/after the shift. */
export function computeShiftPoints(s: VehicleSpec): number[] {
  const out: number[] = [];
  for (let g = 0; g < s.gears.length; g++) {
    if (g === s.gears.length - 1) { out.push(s.redline); continue; }
    const r1 = s.gears[g], r2 = s.gears[g + 1];
    let best = s.revLimit - 120;
    for (let rpm = Math.max(s.peakTorqueRpm, s.idle + 1500); rpm < s.revLimit - 100; rpm += 25) {
      const f1 = fullTorqueAt(s, rpm) * r1;
      const f2 = fullTorqueAt(s, (rpm * r2) / r1) * r2;
      if (f2 >= f1) { best = rpm; break; }
    }
    out.push(Math.min(s.revLimit - 120, best));
  }
  return out;
}
