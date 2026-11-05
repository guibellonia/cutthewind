import type { CarBuild, PerfConfig, TuneConfig, VisualConfig, VinylLayer } from './types';
import { CARS } from '../data/cars';
import { ENGINES } from '../data/engines';

let uidCounter = 0;
export function uid(prefix = 'id'): string {
  uidCounter++;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function stockPerf(modelId: string): PerfConfig {
  const m = CARS[modelId];
  const e = ENGINES[m.engineId];
  const turbo = e.aspiration === 'turbo' || e.aspiration === 'twinturbo';
  return {
    engineSwap: 'stock', intake: 'stock', exhaust: 'stock', ecu: 'stock', fuel: 'stock',
    turbo: turbo ? 'stock' : 'none', supercharger: e.aspiration === 'supercharged' ? 'stock' : 'none',
    intercooler: 'stock', internals: 'stock', camshaft: 'stock', flywheel: 'stock', cooling: 'stock', nitrous: 'none',
    clutch: 'stock', gearbox: 'stock', diff: 'stock', driveshaft: 'stock', suspension: 'stock', brakes: 'stock',
    tires: 'tr_street', weight: 'stock',
  };
}

export function stockTune(): TuneConfig {
  return {
    boost: 0, gears: [], finalDrive: 0, nitroShot: 1, launchRpm: 0, revLimit: 0, tirePressure: 32,
    springF: 0.5, springR: 0.5, damping: 0.5, rideHeight: 0, camberF: 0, camberR: 0,
  };
}

export function stockVisual(modelId: string): VisualConfig {
  const m = CARS[modelId];
  const steel = m.tags.includes('cheap') && m.brand === 'apex';
  return {
    frontBumper: 'stock', rearBumper: 'stock', sideSkirts: 'stock', frontFenders: 'stock', rearFenders: 'stock',
    hood: 'stock', hoodScoop: 'none', spoiler: 'none', spoilerFinish: 'body', mirrors: 'stock', headlights: 'stock',
    taillights: 'stock', roof: 'stock', exhaust: 'stock', exhaustFinish: 'polished', splitter: 'none', diffuser: 'none',
    canards: 'none',
    wheels: {
      design: steel ? 'steel' : m.brand === 'ironclad' && m.year < 1980 ? 'mag' : 'oem5',
      size: m.stockWheelSize, width: Math.max(6, Math.round(m.stockTireWidth / 25.4 - 1)), offset: 0,
      profile: m.stockTireProfile, tireWidth: m.stockTireWidth, finish: steel ? 'black' : 'silver', color: '#ffffff', camber: 0,
    },
    paint: { color: m.stockPaint, finish: 'metallic', pearl: '#ffffff' },
    caliperColor: '#2a2a2a',
    vinyls: [],
    neon: { enabled: false, color: '#20a0ff', mode: 'steady' },
    windowTint: 0.15,
    tintColor: '#101418',
    plate: randomPlate(),
    interior: { seats: 'stock', steering: 'stock', dash: 'stock', gauges: 'stock', cage: 'none', shifter: 'stock', color: '#1a1a1c', material: 'cloth' },
  };
}

export function randomPlate(): string {
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const r = (n: number) => Math.floor(Math.random() * n);
  return `${L[r(L.length)]}${L[r(L.length)]}${L[r(L.length)]} ${r(10)}${r(10)}${r(10)}${r(10)}`;
}

export function stockBuild(modelId: string): CarBuild {
  return { uid: uid('car'), modelId, buildName: 'STOCK', visual: stockVisual(modelId), perf: stockPerf(modelId), tune: stockTune() };
}

export function cloneBuild(b: CarBuild): CarBuild {
  return JSON.parse(JSON.stringify(b));
}

const v = (o: Partial<VinylLayer>): VinylLayer => ({
  id: uid('v'), shape: 'rect', region: 'left', mirror: true, x: 0.5, y: 0.5, sx: 0.2, sy: 0.1, rot: 0,
  color: '#ffffff', color2: '#000000', opacity: 1, ...o,
});

/** The protagonist's tutorial car: Kairo Kestrel 2.0T "BLUE HOUR". */
export function blueHourBuild(): CarBuild {
  const b = stockBuild('kairo_kestrel');
  b.buildName = 'BLUE HOUR';
  Object.assign(b.visual, {
    frontBumper: 'fb_aero_s', sideSkirts: 'ss_v2', hood: 'hd_carbon', spoiler: 'sp_ducktail', spoilerFinish: 'body',
    exhaust: 'ex_twin', exhaustFinish: 'titanium',
  });
  b.visual.paint = { color: '#1c2154', finish: 'metallic', pearl: '#5a6cff' };
  b.visual.wheels = { design: 'kx07', size: 18, width: 8.5, offset: 5, profile: 40, tireWidth: 225, finish: 'darkbronze', color: '#ffffff', camber: -1.5 };
  b.visual.caliperColor = '#b8b8b8';
  b.visual.windowTint = 0.35;
  b.visual.plate = 'BLU 0707';
  b.visual.interior = { ...b.visual.interior, seats: 'seat_bucket', steering: 'sw_deep', gauges: 'ga_pod', color: '#1d3b78', material: 'alcantara' };
  // Asymmetric light-blue / silver sweep from the front fender across the doors, ending before the rear wheel.
  b.visual.vinyls = [
    v({ shape: 'sweep', region: 'left', mirror: false, x: 0.4, y: 0.6, sx: 0.5, sy: 0.12, color: '#8fd3ff', color2: '#c9d1dc', rot: 0 }),
    v({ shape: 'slash', region: 'left', mirror: false, x: 0.46, y: 0.555, sx: 0.3, sy: 0.035, color: '#c9d1dc', rot: -4 }),
    v({ shape: 'sweep', region: 'right', mirror: false, x: 0.6, y: 0.6, sx: 0.5, sy: 0.12, color: '#8fd3ff', color2: '#c9d1dc', flipX: true }),
    v({ shape: 'number', region: 'left', mirror: true, x: 0.52, y: 0.66, sx: 0.06, sy: 0.12, text: '07', font: 'italic', color: '#e6f4ff', color2: '#1c2154' }),
    v({ shape: 'diamond', region: 'top', mirror: false, x: 0.14, y: 0.36, sx: 0.06, sy: 0.14, color: '#8fd3ff', color2: '#c9d1dc', rot: 0 }),
    v({ shape: 'ring', region: 'top', mirror: false, x: 0.14, y: 0.36, sx: 0.09, sy: 0.21, color: '#c9d1dc', opacity: 0.85 }),
  ];
  Object.assign(b.perf, {
    ecu: 'ecu_piggy', intercooler: 'ic_fmic', exhaust: 'ex_headers', clutch: 'cl_s2', diff: 'df_1way',
    suspension: 'su_adj', tires: 'tr_semi', nitrous: 'n2o_50',
  });
  b.tune.boost = 0.85;
  b.tune.rideHeight = -45;
  b.tune.camberF = -1.5;
  b.tune.camberR = -1.0;
  b.tune.tirePressure = 30;
  return b;
}

/** The tutorial rival: Werkhaus Strasse 600R "BLACKOUT". */
export function blackoutBuild(): CarBuild {
  const b = stockBuild('werkhaus_strasse');
  b.buildName = 'BLACKOUT';
  Object.assign(b.visual, {
    frontBumper: 'fb_competition', rearBumper: 'rb_competition', frontFenders: 'fl_w600', rearFenders: 'fl_w600',
    sideSkirts: 'ss_blades', hood: 'hd_carbon_vented', spoiler: 'sp_gt', spoilerFinish: 'carbon', exhaust: 'ex_quad',
    exhaustFinish: 'titanium', diffuser: 'df_big', mirrors: 'mr_carbon', headlights: 'hl_smoked', taillights: 'tl_smoked',
  });
  b.visual.paint = { color: '#24262b', finish: 'metallic', pearl: '#4a4f58' };
  b.visual.wheels = { design: 'wr09', size: 19, width: 10, offset: 12, profile: 35, tireWidth: 275, finish: 'satin', color: '#ffffff', camber: -2 };
  b.visual.caliperColor = '#7a0f14';
  b.visual.windowTint = 0.6;
  b.visual.plate = 'WK 600R';
  b.visual.interior = { ...b.visual.interior, seats: 'seat_carbon', steering: 'sw_suede', gauges: 'ga_digital', cage: 'cage_half', color: '#7a1218', material: 'alcantara' };
  b.visual.vinyls = [
    v({ shape: 'shards', region: 'left', mirror: false, x: 0.45, y: 0.62, sx: 0.55, sy: 0.24, color: '#c1121f', color2: '#7d8590', rot: -3 }),
    v({ shape: 'circuit', region: 'left', mirror: true, x: 0.62, y: 0.42, sx: 0.36, sy: 0.12, color: '#7d8590', opacity: 0.8 }),
    v({ shape: 'shards', region: 'right', mirror: false, x: 0.58, y: 0.6, sx: 0.4, sy: 0.18, color: '#c1121f', color2: '#7d8590', rot: 4, flipX: true }),
    v({ shape: 'number', region: 'left', mirror: true, x: 0.47, y: 0.47, sx: 0.08, sy: 0.16, text: '06', font: 'block', color: '#f2f2f2', color2: '#c1121f' }),
    v({ shape: 'sponsor', region: 'left', mirror: true, x: 0.24, y: 0.7, sx: 0.09, sy: 0.05, sponsor: 'VOLTEX', color: '#f2f2f2' }),
    v({ shape: 'sponsor', region: 'left', mirror: true, x: 0.76, y: 0.72, sx: 0.08, sy: 0.045, sponsor: 'HAKU', color: '#f2f2f2' }),
    v({ shape: 'sponsor', region: 'left', mirror: true, x: 0.62, y: 0.72, sx: 0.08, sy: 0.045, sponsor: 'ORBITAL', color: '#c1121f' }),
    v({ shape: 'logo', region: 'top', mirror: false, x: 0.12, y: 0.5, sx: 0.07, sy: 0.3, logo: 'serpent', color: '#c1121f', color2: '#7d8590' }),
    v({ shape: 'stripe', region: 'top', mirror: false, x: 0.5, y: 0.66, sx: 1.0, sy: 0.03, color: '#c1121f', opacity: 0.9 }),
  ];
  Object.assign(b.perf, {
    turbo: 'tb_twin', intercooler: 'ic_comp', ecu: 'ecu_standalone', fuel: 'fu_inj', exhaust: 'ex_titan', clutch: 'cl_multi',
    diff: 'df_2way', gearbox: 'gb_six', suspension: 'su_race', tires: 'tr_semi', brakes: 'br_race', internals: 'int_forged',
  });
  b.tune.boost = 1.1;
  b.tune.finalDrive = 3.55;
  b.tune.rideHeight = -55;
  b.tune.camberF = -2;
  b.tune.camberR = -1.5;
  return b;
}
