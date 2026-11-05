// Rival driver AI: staging, launch rpm control, reaction, shifting with errors, nitrous use.
import type { DriverSkill, VehicleSpec } from '../core/types';
import type { DragCar, DriveInput } from './physics';
import { RNG } from '../core/rng';

export class AIDriver {
  readonly skill: DriverSkill;
  readonly spec: VehicleSpec;
  readonly car: DragCar;
  private rng: RNG;
  reaction: number;
  private launchTarget: number;
  private shiftPlan: number[];
  private launchedFlag = false;
  private missPlanned: boolean[];
  private nitroGear: number;
  staged = false;

  constructor(car: DragCar, skill: DriverSkill, seed: number) {
    this.car = car;
    this.spec = car.spec;
    this.skill = skill;
    this.rng = new RNG(seed);
    const r = this.rng;
    this.reaction = Math.max(0.12, skill.reaction + r.gauss() * skill.reactionVar);
    const lerr = (1 - skill.launchAccuracy) * 0.3;
    const mid = (this.spec.launchLo + this.spec.launchHi) / 2;
    this.launchTarget = Math.min(this.spec.redline - 200, Math.max(this.spec.idle + 600, mid * (1 + r.gauss() * lerr)));
    if (this.spec.launchControl > 0) this.launchTarget = this.spec.launchControl;
    this.shiftPlan = this.spec.shiftRpms.map((opt) => {
      const err = (1 - skill.shiftAccuracy) * 0.09 * r.gauss();
      return Math.min(this.spec.revLimit - 40, opt * (1 + skill.shiftBias + err));
    });
    this.missPlanned = this.spec.gears.map(() => r.next() < skill.mistakeChance);
    this.nitroGear = skill.nitroSkill > 0.7 ? 2 : skill.nitroSkill > 0.35 ? 3 : 4;
  }

  /** Input while staging (creep to beams). */
  stagingInput(): { creep: number; throttle: number } {
    const x = this.car.x;
    if (this.staged) return { creep: 0, throttle: 0 };
    if (x < -0.12) return { creep: x < -0.8 ? 0.7 : 0.25, throttle: 0 };
    this.staged = true;
    return { creep: 0, throttle: 0 };
  }

  /** Input before green: hold launch rpm. */
  revInput(): DriveInput {
    const err = (this.launchTarget - this.car.rpm) / 900;
    const thr = Math.max(0, Math.min(1, 0.3 + err));
    return { throttle: thr, launch: false, shiftUp: false, shiftDown: false, nitro: false };
  }

  /** Input during race. sinceGreen: seconds since green light. */
  raceInput(sinceGreen: number): DriveInput {
    const c = this.car;
    const inp: DriveInput = { throttle: 1, launch: false, shiftUp: false, shiftDown: false, nitro: false };
    if (!c.launched) {
      const pre = this.revInput();
      if (sinceGreen >= this.reaction && !this.launchedFlag) {
        this.launchedFlag = true;
        pre.launch = true;
      }
      return pre;
    }
    const g = c.gear;
    const cap = this.skill.throttleCap?.[g - 1];
    if (cap !== undefined) inp.throttle = cap;
    // light traction management for skilled drivers
    if (c.slipSpeed > 3.5 && this.skill.launchAccuracy > 0.6) inp.throttle = Math.min(inp.throttle, 0.82);
    if (g > 0 && g < this.spec.gears.length && !c.shifting && c.rpm >= this.shiftPlan[g - 1]) {
      if (this.missPlanned[g - 1]) { this.missPlanned[g - 1] = false; c.missShift(0.3 + this.rng.next() * 0.3); }
      else inp.shiftUp = true;
    }
    inp.nitro = this.spec.nitroHp > 0 && g >= this.nitroGear && c.time > 0.7;
    return inp;
  }
}
