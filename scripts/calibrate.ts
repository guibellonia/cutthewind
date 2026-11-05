// Prints simulated performance for every stock car and the tutorial builds.
import { CAR_LIST } from '../src/data/cars';
import { blackoutBuild, blueHourBuild, stockBuild } from '../src/core/builds';
import { buildSpec, estimate, perfRating, topSpeedKmh } from '../src/sim/index';

const rows: string[] = [];
const fmt = (n: number, d = 2) => n.toFixed(d).padStart(6);
function line(label: string, b: ReturnType<typeof stockBuild>) {
  const t0 = performance.now();
  const s = buildSpec(b);
  const e = estimate(b);
  const ms = performance.now() - t0;
  rows.push(
    `${label.padEnd(28)} ${fmt(s.peakHp, 0)}hp@${s.peakHpRpm} ${fmt(s.peakTorque, 0)}Nm@${s.peakTorqueRpm} m=${s.mass.toFixed(0)} ` +
      `ET=${fmt(e.et)} trap=${fmt(e.trap, 1)} 60ft=${fmt(e.t60)} 0-100=${fmt(e.zeroTo100)} vmax=${fmt(topSpeedKmh(s), 0)} ` +
      `PR=${perfRating(e.et)} launch=${s.launchLo.toFixed(0)}-${s.launchHi.toFixed(0)} shift=${s.shiftRpms.map((x) => x.toFixed(0)).join('/')} stress=${s.stress.toFixed(2)} (${ms.toFixed(0)}ms)`,
  );
}
for (const m of CAR_LIST) line(m.id, stockBuild(m.id));
line('BLUE HOUR', blueHourBuild());
line('BLACKOUT', blackoutBuild());
console.log(rows.join('\n'));
