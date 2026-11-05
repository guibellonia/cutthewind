// Visual rating of a build (used by the shop UI, rival generation and photo-shoot gigs).
import type { CarBuild } from '../core/types';
import { visualPart, WHEEL_DESIGNS, type VisualSlot } from '../data/visualParts';
import { INTERIOR_PARTS } from '../data/perfParts';
import { CARS } from '../data/cars';

const SLOTS: VisualSlot[] = ['frontBumper', 'rearBumper', 'sideSkirts', 'frontFenders', 'rearFenders', 'hood', 'hoodScoop', 'spoiler', 'mirrors', 'headlights', 'taillights', 'roof', 'exhaust', 'splitter', 'diffuser', 'canards'];

export function visualScore(b: CarBuild): number {
  const v = b.visual;
  let raw = 0;
  for (const s of SLOTS) raw += visualPart(s, (v as any)[s]).style;
  const wd = WHEEL_DESIGNS.find((w) => w.id === v.wheels.design);
  raw += (wd?.style ?? 0) * 1.4;
  raw += Math.max(0, v.wheels.size - CARS[b.modelId].stockWheelSize) * 1.5;
  raw += Math.min(14, v.vinyls.length * 1.6);
  raw += { solid: 0, metallic: 1, pearl: 4, matte: 3, candy: 4, chrome: 6, carbon: 5 }[v.paint.finish] ?? 0;
  if (v.neon.enabled) raw += 4;
  if (v.windowTint > 0.3) raw += 1;
  if (Math.abs(v.wheels.camber) > 1.2) raw += 1;
  if (b.tune.rideHeight < -30) raw += 2;
  for (const ip of INTERIOR_PARTS) if ((v.interior as any)[ip.slot] === ip.id) raw += ip.style * 0.5;
  return Math.max(0, Math.min(100, Math.round(raw * 0.95)));
}

export function styleLabel(score: number): string {
  if (score < 10) return 'FACTORY';
  if (score < 25) return 'MILD';
  if (score < 45) return 'STREET';
  if (score < 65) return 'TUNER';
  if (score < 82) return 'SHOW';
  return 'MAGAZINE COVER';
}
