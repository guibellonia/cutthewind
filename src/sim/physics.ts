// Longitudinal drag-racing physics: engine, clutch, gearbox, tyre slip, aero, nitrous, heat.
import type { VehicleSpec } from '../core/types';
import { boostTargetAt, computeShiftPoints, naTorqueAt } from './vehicle';

const G_ACC = 9.81;
const RHO = 1.2;
const HP = 745.7;
const SUB_DT = 1 / 1000;
const FAST_DT = 1 / 400;

export const MARKS = { ft60: 18.288, ft330: 100.584, eighth: 201.168, ft1000: 304.8, quarter: 402.336, half: 804.672 };

export interface DriveInput {
  throttle: number; // 0..1
  launch: boolean; // clutch dump (edge)
  shiftUp: boolean; // edge
  shiftDown: boolean; // edge
  nitro: boolean; // held
  creep?: number; // staging: -1..1
}

export type ShiftQuality = 'perfect' | 'good' | 'early' | 'late' | 'missed';
export interface ShiftEvent { gear: number; rpm: number; quality: ShiftQuality; t: number }

export interface RunSplits {
  t60?: number; t330?: number; t660?: number; v660?: number; t1000?: number; t1320?: number; v1320?: number;
}

export class DragCar {
  spec: VehicleSpec;
  x = -2.2; // front of car relative to start line
  v = 0;
  a = 0;
  rpm: number;
  omegaW = 0;
  gear = 0;
  clutch = 0;
  clutchLocked = false;
  tireSlip = false;
  slipSpeed = 0;
  boost = 0;
  throttle = 0;
  nitroLeft: number;
  nitroActive = false;
  temp = 0.42;
  blown = false;
  allowBlow = true;
  limiterCut = false;
  shiftTimer = 0;
  shiftHalfDone = true;
  reengage = 0; // seconds remaining for clutch re-engagement after a shift
  launchT = 0; // seconds since launch
  launched = false;
  launchRpm = 0;
  finished = false;
  finishTime = 0; // since green (includes reaction)
  et = 0; // since launch
  reaction = 0;
  splits: RunSplits = {};
  shifts: ShiftEvent[] = [];
  maxSpeed = 0;
  distance: number;
  time = 0; // since launch
  lastShift: ShiftEvent | null = null;
  wheelspinTime = 0;
  bogTime = 0;
  missedTimer = 0;
  braking = false;
  subDt = SUB_DT;
  private aSmooth = 0;
  private readonly iw: number;

  constructor(spec: VehicleSpec, distance = MARKS.quarter) {
    this.spec = spec;
    this.rpm = spec.idle;
    this.nitroLeft = spec.nitroCapacity;
    this.distance = distance;
    this.iw = spec.drivetrain === 'AWD' ? 5.2 : 2.8;
  }

  get speedKmh() { return this.v * 3.6; }
  get ratio() { return this.gear > 0 ? this.spec.gears[this.gear - 1] * this.spec.finalDrive : 0; }
  get shifting() { return this.shiftTimer > 0; }

  /** Engine torque (combustion + nitrous) at current state with throttle. */
  private engineTorque(thr: number): number {
    const s = this.spec;
    const rpm = Math.max(this.rpm, 300);
    let tq = naTorqueAt(s, rpm) * (1 + this.boost * s.boostEff) * (1 - s.scLoss * (0.5 + 0.5 * rpm / s.redline)) * thr;
    if (this.temp > 0.88) tq *= 1 - Math.min(0.3, (this.temp - 0.88) * 2.5);
    if (this.nitroActive && rpm > 1800) tq += (s.nitroHp * HP) / ((rpm * Math.PI) / 30);
    return tq;
  }

  private friction(): number {
    const s = this.spec;
    return 6 + 5 * s.displacement + 0.0022 * s.displacement * this.rpm + (this.rpm > s.redline ? (this.rpm - s.redline) * 0.03 : 0);
  }

  /** Staging creep: simple kinematic movement toward the beams. */
  stageStep(dt: number, creep: number, throttle: number) {
    const target = creep > 0 ? 0.35 + creep * 0.9 : creep < 0 ? -0.5 : 0;
    const acc = target === 0 ? 3 : 1.5;
    this.v += Math.sign(target - this.v) * Math.min(Math.abs(target - this.v), acc * dt);
    this.x += this.v * dt;
    this.gear = creep < 0 ? 0 : 1;
    this.revFree(dt, Math.max(throttle, creep > 0 ? 0.06 : 0));
  }

  /** Engine free-revving with the clutch in (pre-launch). */
  revFree(dt: number, throttle: number) {
    const s = this.spec;
    const steps = Math.max(1, Math.round(dt / SUB_DT));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      let thr = this.blown ? 0 : throttle;
      if (s.launchControl > 0 && this.rpm > s.launchControl) thr = Math.min(thr, 0.15);
      thr = this.limiter(thr);
      this.throttle = thr;
      const target = boostTargetAt(s, this.rpm) * thr * 0.45; // little load, little boost
      const tau = target > this.boost ? s.turboLag * 1.2 : 0.18;
      this.boost += (target - this.boost) * Math.min(1, h / tau);
      const te = this.engineTorque(thr) - this.friction();
      const idleAssist = !this.blown && this.rpm < s.idle ? (s.idle - this.rpm) * 0.08 : 0;
      this.rpm += (((te + idleAssist) / s.engineInertia) * h * 30) / Math.PI;
      this.rpm = Math.max(this.blown ? 0 : s.idle * 0.8, this.rpm);
    }
    this.heat(dt, throttle * 0.15);
  }

  private limiter(thr: number): number {
    const s = this.spec;
    if (this.rpm >= s.revLimit) this.limiterCut = true;
    else if (this.rpm < s.revLimit - 220) this.limiterCut = false;
    return this.limiterCut ? 0 : thr;
  }

  private heat(dt: number, load: number) {
    const s = this.spec;
    const stressTerm = 0.012 + 0.2 * Math.max(0, s.stress - 0.72) ** 2;
    let dT = (load * stressTerm) / s.coolingFactor;
    if (this.limiterCut) dT += 0.035;
    if (this.nitroActive) dT += 0.012 + s.nitroHp / 20000;
    dT -= 0.006 * s.coolingFactor * (this.temp - 0.4);
    this.temp = Math.max(0.3, this.temp + dT * dt);
    if (this.temp >= 1 && this.allowBlow && !this.blown) {
      this.blown = true;
    }
    if (!this.allowBlow) this.temp = Math.min(0.97, this.temp);
  }

  doLaunch() {
    if (this.launched) return;
    this.launched = true;
    this.gear = 1;
    this.clutch = 0;
    this.clutchLocked = false;
    this.launchRpm = this.rpm;
    this.everLocked = false;
    this.omegaW = this.v / this.spec.tireRadius;
  }

  shiftUp(): ShiftEvent | null {
    const s = this.spec;
    if (!this.launched || this.shifting || this.gear >= s.gears.length || this.blown) return null;
    const opt = s.shiftRpms[this.gear - 1] ?? s.redline;
    const f = this.rpm / opt;
    let q: ShiftQuality;
    if (this.rpm >= s.revLimit - 60) q = 'late';
    else if (f >= 0.965 && f <= 1.025) q = 'perfect';
    else if (f >= 0.92 && f <= 1.06) q = 'good';
    else q = f < 0.92 ? 'early' : 'late';
    const ev: ShiftEvent = { gear: this.gear, rpm: this.rpm, quality: q, t: this.time };
    this.beginShift(this.gear + 1, q === 'perfect' ? 0.7 : 1);
    this.shifts.push(ev);
    this.lastShift = ev;
    return ev;
  }

  shiftDown() {
    if (!this.launched || this.shifting || this.gear <= 1) return;
    this.beginShift(this.gear - 1, 1);
  }

  missShift(duration = 0.45) {
    if (!this.launched || this.shifting) return;
    this.shiftTimer = duration;
    this.shiftHalfDone = true;
    this.clutch = 0;
    this.clutchLocked = false;
    const ev: ShiftEvent = { gear: this.gear, rpm: this.rpm, quality: 'missed', t: this.time };
    this.shifts.push(ev);
    this.lastShift = ev;
    this.pendingGear = this.gear;
  }

  private pendingGear = 0;
  private everLocked = false;
  private beginShift(to: number, timeMul: number) {
    this.pendingGear = to;
    this.shiftTimer = this.spec.shiftTime * timeMul;
    this.shiftHalfDone = false;
    this.clutch = 0;
    this.clutchLocked = false;
    this.nitroActive = false;
  }

  /** Main race integration. Call every frame after launch (or before for free-revving). */
  step(dt: number, input: DriveInput) {
    if (!this.launched) { this.revFree(dt, input.throttle); return; }
    const steps = Math.max(1, Math.round(dt / this.subDt));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.sub(h, input);
    if (!this.finished) this.time += dt;
    this.maxSpeed = Math.max(this.maxSpeed, this.v);
    this.heat(dt, this.braking || this.blown ? 0 : this.throttle * (this.clutch > 0.5 ? 1 : 0.2));
  }

  private sub(h: number, input: DriveInput) {
    const s = this.spec;
    const r = s.tireRadius;
    this.launchT += h;

    // ---- shift timing
    if (this.shiftTimer > 0) {
      this.shiftTimer -= h;
      if (!this.shiftHalfDone && this.shiftTimer < s.shiftTime * 0.45) {
        this.gear = this.pendingGear;
        this.shiftHalfDone = true;
      }
      if (this.shiftTimer <= 0) { this.shiftTimer = 0; this.reengage = 0.07; this.gear = this.pendingGear || this.gear; }
    }

    // ---- clutch engagement
    if (this.shiftTimer > 0) this.clutch = 0;
    else if (this.reengage > 0) {
      this.reengage -= h;
      this.clutch = Math.min(1, this.clutch + h / 0.07);
    } else if (this.launchT < s.clutchEngage + 0.02) {
      const t = Math.min(1, this.launchT / s.clutchEngage);
      this.clutch = Math.max(this.clutch, 0.3 + 0.7 * t);
    } else this.clutch = 1;

    // ---- throttle & boost
    let thr = this.finished || this.blown || this.braking ? 0 : input.throttle;
    if (this.shiftTimer > 0) thr = 0;
    thr = this.limiter(thr);
    this.throttle = thr;
    const bt = boostTargetAt(s, this.rpm) * thr;
    const tau = bt > this.boost ? s.turboLag : 0.14;
    this.boost += (bt - this.boost) * Math.min(1, h / tau);

    // ---- nitrous
    this.nitroActive = input.nitro && !this.finished && !this.blown && this.nitroLeft > 0 && this.gear >= 1 && this.shiftTimer <= 0 && thr > 0.5;
    if (this.nitroActive) this.nitroLeft = Math.max(0, this.nitroLeft - h);

    const te = this.engineTorque(thr) - this.friction() + (!this.blown && this.rpm < s.idle ? (s.idle - this.rpm) * 0.08 : 0);
    const G = this.ratio;
    const eta = s.driveEff;
    const m = s.mass;

    // ---- loads
    const down = 0.5 * RHO * s.liftCoef * this.v * this.v;
    const transfer = (m * this.aSmooth * s.cgHeight / s.wheelbase) * s.weightTransfer;
    let fz: number;
    if (s.drivetrain === 'RWD') fz = m * G_ACC * (1 - s.weightFront) + transfer + down * 0.55;
    else if (s.drivetrain === 'FWD') fz = m * G_ACC * s.weightFront - transfer + down * 0.45;
    else fz = (m * G_ACC + down) * 0.97;
    fz = Math.max(fz, m * G_ACC * 0.15);
    const muP = s.tireMu * s.diffFactor;
    const muS = s.tireMuSlide * s.diffFactor;
    const fMax = muP * fz;
    const fres = (this.v > 0.01 ? 0.5 * RHO * s.cdA * this.v * this.v + s.rollingRes * m * G_ACC : 0) + (this.braking ? m * 7 : 0);

    let we = (this.rpm * Math.PI) / 30;
    let ft = 0;

    if (G === 0 || this.clutch <= 0) {
      // engine free, driveline rolls with the car
      we += (te / s.engineInertia) * h;
      this.omegaW += ((this.v / r - this.omegaW) * Math.min(1, h * 30));
      this.tireSlip = false;
      ft = 0;
    } else {
      const launchHold = this.gear === 1 && !this.everLocked;
      let cc = s.clutchTorque * this.clutch;
      // Launch: the clutch is feathered so the engine holds its launch rpm until the car catches up.
      if (launchHold) cc = Math.min(cc, Math.max(0, te) * 1.03 + 4);
      if (this.clutchLocked) {
        const J = this.iw + s.engineInertia * G * G;
        if (!this.tireSlip) {
          // rolling without slip; whole system accelerates together
          const a = (te * G * eta / r - fres) / (m + J / (r * r));
          ft = m * a + fres;
          const tcReq = te - s.engineInertia * G * (a / r);
          if (ft > fMax) { this.tireSlip = true; ft = this.slipForce(fz, muP, muS, 0.6); }
          if (Math.abs(tcReq) > cc * 1.02 || (launchHold && this.tireSlip)) this.clutchLocked = false;
          if (!this.tireSlip) {
            this.omegaW = this.v / r + (a / r) * h;
            we = this.omegaW * G;
          }
        }
        if (this.tireSlip && this.clutchLocked) {
          this.slipSpeed = this.omegaW * r - this.v;
          ft = this.slipForce(fz, muP, muS, this.slipSpeed);
          const dw = (te * G * eta - ft * r) / J;
          const tcReq = te - s.engineInertia * G * dw;
          this.omegaW += dw * h;
          we = this.omegaW * G;
          if (Math.abs(tcReq) > cc * 1.02) this.clutchLocked = false;
          if (this.omegaW * r <= this.v) { this.tireSlip = false; this.omegaW = this.v / r; we = this.omegaW * G; }
        }
      }
      if (!this.clutchLocked) {
        // Clutch slipping: solve the friction torque as a constraint so stiff clutches stay stable.
        const wG = this.omegaW * G;
        const delta = we - wG;
        const iweq = this.tireSlip ? this.iw : this.iw + m * r * r;
        const twRes = this.tireSlip ? this.slipForce(fz, muP, muS, this.omegaW * r - this.v) * r : fres * r;
        const tc0 = (delta / h + te / s.engineInertia + (G * twRes) / iweq) / (1 / s.engineInertia + (G * G * eta) / iweq);
        const tc = Math.max(-cc, Math.min(cc, tc0));
        we += ((te - tc) / s.engineInertia) * h;
        if (!this.tireSlip) {
          const a = (tc * G * eta / r - fres) / (m + this.iw / (r * r));
          ft = m * a + fres;
          if (ft > fMax) { this.tireSlip = true; ft = this.slipForce(fz, muP, muS, 0.6); }
          else this.omegaW = this.v / r + (a / r) * h;
        }
        if (this.tireSlip) {
          this.slipSpeed = this.omegaW * r - this.v;
          ft = this.slipForce(fz, muP, muS, this.slipSpeed);
          this.omegaW += ((tc * G * eta - ft * r) / this.iw) * h;
          if (this.omegaW * r <= this.v) { this.tireSlip = false; this.omegaW = this.v / r; }
        }
        if (this.clutch >= 0.999 && Math.abs(tc0) <= cc && !(launchHold && this.tireSlip)) {
          this.clutchLocked = true;
          if (!this.tireSlip) this.everLocked = true;
          we = this.omegaW * G;
        }
      }
    }
    if (!this.tireSlip) this.slipSpeed = 0;
    else if (this.launchT < 2.5) this.wheelspinTime += h;

    // ---- car
    let a = (ft - fres) / m;
    if (this.v <= 0 && a < 0) a = 0;
    this.v = Math.max(0, this.v + a * h);
    this.a = a;
    this.aSmooth += (a - this.aSmooth) * Math.min(1, h * 12);
    this.x += this.v * h;
    this.rpm = Math.max(this.blown ? 0 : 400, (we * 30) / Math.PI);
    if (this.launchT > 0.25 && this.launchT < 2 && this.gear === 1 && this.rpm < s.idle + 900 && this.v < 8) this.bogTime += h;

    // ---- splits
    const t = this.time;
    const sp = this.splits;
    if (sp.t60 === undefined && this.x >= MARKS.ft60) sp.t60 = t;
    if (sp.t330 === undefined && this.x >= MARKS.ft330) sp.t330 = t;
    if (sp.t660 === undefined && this.x >= MARKS.eighth) { sp.t660 = t; sp.v660 = this.v; }
    if (sp.t1000 === undefined && this.x >= MARKS.ft1000) sp.t1000 = t;
    if (sp.t1320 === undefined && this.x >= MARKS.quarter) { sp.t1320 = t; sp.v1320 = this.v; }
    if (!this.finished && this.x >= this.distance) {
      this.finished = true;
      this.et = t;
      this.braking = true;
    }
  }

  private slipForce(fz: number, muP: number, muS: number, slip: number): number {
    const sgn = slip >= 0 ? 1 : -1;
    const s = Math.abs(slip);
    const mu = s < 0.6 ? muP : muS + (muP - muS) * Math.exp(-(s - 0.6) / 4);
    return sgn * mu * fz;
  }
}

// ------------------------------------------------------------------ analysis helpers

export interface SimResult { et: number; trap: number; t60: number; t660: number; v660: number; finished: boolean; blown: boolean; car: DragCar }

/** Simulate a run with near-perfect driving inputs. */
export function simulateRun(spec: VehicleSpec, opts: { distance?: number; launchRpm?: number; nitro?: boolean; maxTime?: number; shiftMul?: number } = {}): SimResult {
  const car = new DragCar(spec, opts.distance ?? MARKS.quarter);
  car.allowBlow = false;
  car.subDt = FAST_DT;
  car.x = 0;
  const lr = opts.launchRpm ?? spec.launchOpt;
  car.rpm = lr;
  car.boost = boostTargetAt(spec, lr) * 0.12;
  car.doLaunch();
  const dt = 1 / 120;
  const maxT = opts.maxTime ?? 40;
  const input: DriveInput = { throttle: 1, launch: false, shiftUp: false, shiftDown: false, nitro: false };
  while (!car.finished && car.time < maxT) {
    const g = car.gear;
    if (g > 0 && g < spec.gears.length && !car.shifting && car.rpm >= (spec.shiftRpms[g - 1] ?? spec.redline) * (opts.shiftMul ?? 1)) car.shiftUp();
    input.nitro = (opts.nitro ?? true) && g >= 2 && car.time > 0.6;
    car.step(dt, input);
  }
  return { et: car.et || maxT, trap: car.v * 3.6, t60: car.splits.t60 ?? 99, t660: car.splits.t660 ?? 99, v660: (car.splits.v660 ?? 0) * 3.6, finished: car.finished, blown: car.blown, car };
}

/** Distance covered in a short launch test. */
function launchDistance(spec: VehicleSpec, rpm: number): number {
  const car = new DragCar(spec, 1000);
  car.allowBlow = false;
  car.subDt = FAST_DT;
  car.x = 0;
  car.rpm = rpm;
  car.boost = boostTargetAt(spec, rpm) * 0.12;
  car.doLaunch();
  const input: DriveInput = { throttle: 1, launch: false, shiftUp: false, shiftDown: false, nitro: false };
  const dt = 1 / 240;
  while (car.time < 1.6) {
    if (car.gear < spec.gears.length && !car.shifting && car.rpm >= spec.shiftRpms[car.gear - 1]) car.shiftUp();
    car.step(dt, input);
  }
  return car.x;
}

/** Fill in shift points and launch window. Mutates & returns spec. */
export function analyzeSpec(spec: VehicleSpec): VehicleSpec {
  spec.shiftRpms = computeShiftPoints(spec);
  spec.shiftRpm = spec.shiftRpms[0];
  const lo = Math.max(spec.idle + 1000, spec.redline * 0.25);
  const hi = spec.redline - 300;
  const results: { rpm: number; d: number }[] = [];
  for (let rpm = lo; rpm <= hi; rpm += 300) results.push({ rpm, d: launchDistance(spec, rpm) });
  let best = results[0];
  for (const r of results) if (r.d > best.d) best = r;
  const ok = results.filter((r) => r.d >= best.d - Math.max(0.12, best.d * 0.012));
  spec.launchOpt = best.rpm;
  spec.launchLo = Math.min(...ok.map((r) => r.rpm)) - 100;
  spec.launchHi = Math.max(...ok.map((r) => r.rpm)) + 100;
  if (spec.launchHi - spec.launchLo < 600) {
    const c = (spec.launchHi + spec.launchLo) / 2;
    spec.launchLo = c - 300;
    spec.launchHi = c + 300;
  }
  return spec;
}
