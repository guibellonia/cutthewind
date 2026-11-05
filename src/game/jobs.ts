// Daily jobs: short mini-games that pay reliable money.
import type { DailyJob } from '../core/state';
import { RNG } from '../core/rng';
import { uid } from '../core/builds';

interface JobTemplate { type: DailyJob['type']; titles: string[]; desc: string; base: number; rep: number }

const TEMPLATES: JobTemplate[] = [
  { type: 'dyno', titles: ['Dyno Pull for a Customer', 'Power Run: Torque House', 'Baseline Dyno Session'], desc: 'Hold the throttle and shift at the exact peak. Three pulls; the customer pays for clean numbers.', base: 420, rep: 15 },
  { type: 'timing', titles: ['Ignition Timing Job', 'Set the Cam Timing', 'Distributor Tune-Up'], desc: 'Stop the timing light inside the green window. Three engines, three tries.', base: 360, rep: 12 },
  { type: 'detail', titles: ['Show Car Detailing', 'Swirl-Mark Correction', 'Meet Prep Polish'], desc: 'Polish out the swirl marks before the owner shows up. Scrub with the mouse.', base: 320, rep: 10 },
  { type: 'tires', titles: ['Pit Crew Tyre Change', 'Wheel Swap Rush Job', 'Lug-Nut Sprint'], desc: 'Hit the keys in star pattern order before the clock runs out.', base: 380, rep: 12 },
  { type: 'diagnose', titles: ['Diagnose a Misfire', 'Mystery Noise', 'Check-Engine Light'], desc: 'Read the symptoms and pick the faulty part. Wrong answers cost the customer money — and you.', base: 450, rep: 18 },
  { type: 'delivery', titles: ['Parts Delivery Run', 'Courier: Midnight Express', 'Rush Order Across Town'], desc: 'Drive a 1/8-mile sprint under the target time. The faster, the bigger the tip.', base: 520, rep: 20 },
];

const CLIENTS = ['Mags @ Torque House', 'Hana Mori Imports', 'Big Earl', 'Rico Salazar', 'a nervous dentist', 'a VIP sedan collector', 'Pier 9 security chief', 'a delivery company', 'a college kid with a turbo Rook', 'the Kaze Union crew'];

export function generateJobs(day: number, tier: number): DailyJob[] {
  const rng = new RNG(day * 4241 + 17);
  const types = rng.shuffle([...TEMPLATES]).slice(0, 3);
  return types.map((t) => {
    const pay = Math.round((t.base * (1 + tier * 0.55) * rng.range(0.85, 1.2)) / 10) * 10;
    return { id: uid('job'), type: t.type, title: rng.pick(t.titles), client: rng.pick(CLIENTS), desc: t.desc, pay, rep: t.rep * (tier + 1), done: false };
  });
}

/** Payout from a mini-game score 0..1 (half pay at 0.3, full at 0.9+, bonus above). */
export function jobPayout(job: DailyJob, score: number): number {
  const k = score < 0.15 ? 0.15 : score < 0.9 ? 0.3 + (score - 0.15) * (0.7 / 0.75) : 1 + (score - 0.9) * 2.5;
  return Math.round((job.pay * k) / 10) * 10;
}

export interface DiagnoseCase { symptom: string; options: string[]; answer: number; explain: string }
export const DIAGNOSE_CASES: DiagnoseCase[] = [
  { symptom: 'Turbo car. Boost reads 0.3 bar max, loud hiss under load, slow spool.', options: ['Boost leak at the intercooler coupler', 'Worn clutch', 'Bad spark plugs', 'Low tyre pressure'], answer: 0, explain: 'A hiss plus low boost is a classic charge-pipe leak.' },
  { symptom: 'Revs flare when shifting into 3rd and 4th, car barely accelerates on boost.', options: ['Clogged fuel filter', 'Slipping clutch', 'Weak battery', 'Bent wheel'], answer: 1, explain: 'RPM rising without speed = clutch slip.' },
  { symptom: 'Engine pings under full throttle, power fades on hot nights.', options: ['Wheel alignment', 'Knock from too much timing / low octane', 'Loose exhaust tip', 'Old wiper blades'], answer: 1, explain: 'Pinging is detonation: pull timing or run better fuel.' },
  { symptom: 'Car pulls hard to one side launching and one rear tyre spins.', options: ['Open differential', 'Blown head gasket', 'Bad alternator', 'Clogged air filter'], answer: 0, explain: 'An open diff sends torque to the wheel with least grip. An LSD fixes it.' },
  { symptom: 'Coolant temp climbs fast at the strip, white sweet-smelling smoke from the exhaust.', options: ['Blown head gasket', 'Worn brake pads', 'Low fuel', 'Loose mirror'], answer: 0, explain: 'Sweet white smoke + overheating = coolant in the cylinders.' },
  { symptom: 'Rough idle, check-engine light, smells rich, black smoke on decel.', options: ['Leaking injector', 'Bad tyre', 'Worn shifter bushing', 'Weak headlights'], answer: 0, explain: 'A stuck-open injector floods the cylinder: rich, rough, black smoke.' },
  { symptom: 'Grinding noise when shifting fast into 2nd, fine when shifting slowly.', options: ['Worn synchros', 'Turbo lag', 'Low brake fluid', 'Bad ECU map'], answer: 0, explain: 'Synchro wear shows up on fast shifts. Short-shifting or a dog box helps.' },
  { symptom: 'Supercharged V8 squeals under load, boost drops at high rpm.', options: ['Blower belt slipping', 'Too much tyre pressure', 'Cracked windshield', 'Wrong oil filter'], answer: 0, explain: 'A slipping belt squeals and can\'t spin the blower at high rpm.' },
];
