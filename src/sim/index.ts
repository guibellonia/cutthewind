import type { CarBuild, VehicleSpec } from '../core/types';
import { boostTargetAt, computeSpec } from './vehicle';
import { analyzeSpec, DragCar, MARKS, simulateRun } from './physics';

const specCache = new Map<string, VehicleSpec>();
const etCache = new Map<string, Estimate>();

export interface Estimate { et: number; trap: number; t60: number; et8: number; zeroTo100: number }

function keyOf(b: CarBuild): string {
  const v = b.visual;
  return JSON.stringify([b.modelId, b.perf, b.tune, v.wheels, v.frontBumper, v.rearBumper, v.sideSkirts, v.frontFenders, v.rearFenders,
    v.hood, v.spoiler, v.splitter, v.diffuser, v.canards, v.exhaust, v.roof, v.mirrors, v.hoodScoop, v.interior]);
}

export function buildSpec(b: CarBuild): VehicleSpec {
  const k = keyOf(b);
  let s = specCache.get(k);
  if (!s) {
    s = analyzeSpec(computeSpec(b));
    if (specCache.size > 300) specCache.clear();
    specCache.set(k, s);
  }
  return s;
}

/** Estimated quarter-mile performance with ideal driving (nitrous used from 2nd gear). */
export function estimate(b: CarBuild): Estimate {
  const k = keyOf(b);
  let r = etCache.get(k);
  if (!r) {
    const spec = buildSpec(b);
    const q = simulateRun(spec, { distance: MARKS.quarter });
    r = { et: q.et, trap: q.trap, t60: q.t60, et8: q.t660, zeroTo100: timeToSpeed(spec, 100 / 3.6) };
    if (etCache.size > 300) etCache.clear();
    etCache.set(k, r);
  }
  return r;
}

/** Performance rating 100..999 from quarter-mile ET (lower ET → higher rating). */
export function perfRating(et: number): number {
  return Math.round(Math.max(100, Math.min(999, 100 + (17.5 - et) * 105)));
}

export function timeToSpeed(spec: VehicleSpec, target: number): number {
  const car = new DragCar(spec, 5000);
  car.allowBlow = false;
  car.subDt = 1 / 400;
  car.x = 0;
  car.rpm = spec.launchOpt;
  car.boost = boostTargetAt(spec, spec.launchOpt) * 0.12;
  car.doLaunch();
  const input = { throttle: 1, launch: false, shiftUp: false, shiftDown: false, nitro: false };
  while (car.v < target && car.time < 30) {
    if (car.gear < spec.gears.length && !car.shifting && car.rpm >= spec.shiftRpms[car.gear - 1]) car.shiftUp();
    car.step(1 / 120, input);
  }
  return car.time;
}

export function topSpeedKmh(spec: VehicleSpec): number {
  const g = spec.gears[spec.gears.length - 1] * spec.finalDrive;
  const vLimiter = ((spec.revLimit * Math.PI) / 30 / g) * spec.tireRadius;
  const P = spec.peakHp * 745.7 * spec.driveEff;
  let v = 30;
  for (let i = 0; i < 60; i++) {
    const f = 0.5 * 1.2 * spec.cdA * v * v * v + spec.rollingRes * spec.mass * 9.81 * v - P;
    const df = 1.5 * 1.2 * spec.cdA * v * v + spec.rollingRes * spec.mass * 9.81;
    v -= f / df;
  }
  return Math.min(vLimiter, v) * 3.6;
}

export { MARKS };
