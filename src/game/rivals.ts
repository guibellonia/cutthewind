// Procedural rival generation: picks a plausible car, upgrades it to a target ET, and dresses it
// in a coherent visual style scaled to the player's own customisation level.
import type { CarBuild, DriverSkill, RivalProfile, VinylLayer } from '../core/types';
import { RNG } from '../core/rng';
import { cloneBuild, stockBuild, uid } from '../core/builds';
import { CAR_LIST, CARS } from '../data/cars';
import { BRANDS } from '../data/brands';
import { ENGINES } from '../data/engines';
import { visualParts, WHEEL_DESIGNS, type VisualSlot } from '../data/visualParts';
import { boostSetup, effectivePart } from '../sim/vehicle';
import type { PerfSlot } from '../data/perfParts';
import { estimate } from '../sim/index';
import { BUILD_NAMES, CREWS, FIRST_NAMES, LAST_NAMES, LOSE_QUOTES, NICKNAMES, TRASH_TALK, WIN_QUOTES } from '../data/names';
import { SPONSORS } from '../render/logos';
import { visualScore } from './style';

export interface TierDef { id: number; name: string; venue: string; etMin: number; etMax: number; budget: number; prize: [number, number]; fee: [number, number]; repWin: number }
export const TIERS: TierDef[] = [
  { id: 0, name: 'STREET', venue: 'pier9', etMin: 13.9, etMax: 16.2, budget: 32000, prize: [900, 1600], fee: [100, 250], repWin: 120 },
  { id: 1, name: 'UNDERGROUND', venue: 'foundry', etMin: 12.6, etMax: 14.3, budget: 60000, prize: [2200, 3800], fee: [300, 600], repWin: 220 },
  { id: 2, name: 'PRO CIRCUIT', venue: 'airfield', etMin: 11.3, etMax: 12.9, budget: 110000, prize: [5000, 8500], fee: [700, 1200], repWin: 380 },
  { id: 3, name: 'LEGEND', venue: 'canal', etMin: 10.1, etMax: 11.7, budget: 220000, prize: [10000, 16000], fee: [1500, 2500], repWin: 600 },
  { id: 4, name: 'FINAL', venue: 'pier9', etMin: 9.2, etMax: 10.4, budget: 400000, prize: [40000, 40000], fee: [0, 0], repWin: 2000 },
];

type Step = [PerfSlot, string];
const TURBO_SEQ: Step[] = [
  ['ecu', 'ecu_remap'], ['exhaust', 'ex_catback'], ['intake', 'in_cai'], ['tires', 'tr_sport'], ['intercooler', 'ic_fmic'], ['clutch', 'cl_s1'],
  ['diff', 'df_1way'], ['exhaust', 'ex_headers'], ['ecu', 'ecu_piggy'], ['fuel', 'fu_pump'], ['tires', 'tr_semi'], ['suspension', 'su_adj'],
  ['clutch', 'cl_s2'], ['turbo', 'tb_hybrid'], ['internals', 'int_forged'], ['flywheel', 'fw_light'], ['nitrous', 'n2o_50'], ['weight', 'wr_1'],
  ['fuel', 'fu_inj'], ['ecu', 'ecu_standalone'], ['turbo', 'tb_twin'], ['exhaust', 'ex_titan'], ['intercooler', 'ic_comp'], ['gearbox', 'gb_close'],
  ['clutch', 'cl_twin'], ['tires', 'tr_dragr'], ['nitrous', 'n2o_100'], ['turbo', 'tb_big'], ['suspension', 'su_drag'], ['weight', 'wr_2'],
  ['fuel', 'fu_e85'], ['internals', 'int_billet'], ['clutch', 'cl_multi'], ['turbo', 'tb_gt'], ['tires', 'tr_slick'], ['nitrous', 'n2o_150'],
  ['gearbox', 'gb_seq'], ['weight', 'wr_3'], ['nitrous', 'n2o_250'],
];
const NA_SEQ = (muscle: boolean): Step[] => [
  ['intake', 'in_cai'], ['exhaust', 'ex_catback'], ['ecu', 'ecu_remap'], ['tires', 'tr_sport'], ['camshaft', 'cam_street'], ['exhaust', 'ex_headers'],
  ['clutch', 'cl_s1'], ['diff', 'df_1way'], ['flywheel', 'fw_light'], ['tires', 'tr_semi'], ['nitrous', 'n2o_50'], ['suspension', 'su_adj'],
  ['fuel', 'fu_pump'], muscle ? ['supercharger', 'sc_roots'] : ['turbo', 'tk_small'], ['clutch', 'cl_s2'], ['intercooler', 'ic_fmic'], ['ecu', 'ecu_piggy'],
  ['weight', 'wr_1'], ['internals', 'int_forged'], ['fuel', 'fu_inj'], muscle ? ['supercharger', 'sc_screw'] : ['turbo', 'tk_medium'], ['nitrous', 'n2o_100'],
  ['ecu', 'ecu_standalone'], ['tires', 'tr_dragr'], ['gearbox', 'gb_close'], ['clutch', 'cl_twin'], ['camshaft', 'cam_race'], ['weight', 'wr_2'],
  ['suspension', 'su_drag'], muscle ? ['nitrous', 'n2o_150'] : ['turbo', 'tk_large'], ['fuel', 'fu_e85'], ['internals', 'int_billet'], ['clutch', 'cl_multi'],
  ['tires', 'tr_slick'], ['nitrous', 'n2o_150'], ['gearbox', 'gb_seq'], ['weight', 'wr_3'], ['nitrous', 'n2o_250'],
];
const SC_SEQ: Step[] = [
  ['intake', 'in_cai'], ['exhaust', 'ex_catback'], ['ecu', 'ecu_remap'], ['tires', 'tr_sport'], ['supercharger', 'sc_pulley'], ['exhaust', 'ex_headers'],
  ['clutch', 'cl_s2'], ['diff', 'df_1way'], ['tires', 'tr_semi'], ['fuel', 'fu_pump'], ['intercooler', 'ic_fmic'], ['nitrous', 'n2o_50'],
  ['ecu', 'ecu_piggy'], ['suspension', 'su_adj'], ['internals', 'int_forged'], ['fuel', 'fu_inj'], ['weight', 'wr_1'], ['ecu', 'ecu_standalone'],
  ['tires', 'tr_dragr'], ['nitrous', 'n2o_100'], ['clutch', 'cl_twin'], ['gearbox', 'gb_close'], ['suspension', 'su_drag'], ['weight', 'wr_2'],
  ['fuel', 'fu_e85'], ['internals', 'int_billet'], ['clutch', 'cl_multi'], ['tires', 'tr_slick'], ['nitrous', 'n2o_250'], ['gearbox', 'gb_seq'], ['weight', 'wr_3'],
];

function sequenceFor(modelId: string): Step[] {
  const m = CARS[modelId];
  const e = ENGINES[m.engineId];
  const seq = e.aspiration === 'NA' ? NA_SEQ(m.body === 'muscle') : e.aspiration === 'supercharged' ? SC_SEQ : TURBO_SEQ;
  return seq.filter(([slot, id]) => effectivePart(slot, id, e).id === id);
}

/** Applies the first k upgrade steps to a stock build. */
export function applyUpgrades(base: CarBuild, k: number): CarBuild {
  const b = cloneBuild(base);
  const seq = sequenceFor(b.modelId);
  for (let i = 0; i < Math.min(k, seq.length); i++) {
    const [slot, id] = seq[i];
    (b.perf as any)[slot] = id;
  }
  const bs = boostSetup(b);
  if (bs.tunable) b.tune.boost = +(bs.max * 0.94).toFixed(2);
  return b;
}

const maxEtCache = new Map<string, number>();
const stockEtCache = new Map<string, number>();
export function modelEtRange(modelId: string): [number, number] {
  let st = stockEtCache.get(modelId);
  if (st === undefined) { st = estimate(stockBuild(modelId)).et; stockEtCache.set(modelId, st); }
  let mx = maxEtCache.get(modelId);
  if (mx === undefined) { mx = estimate(applyUpgrades(stockBuild(modelId), 999)).et; maxEtCache.set(modelId, mx); }
  return [mx, st];
}

/** Upgrade a build until its estimated ET is close to target. Returns the build and its ET. */
export function tuneToTarget(base: CarBuild, target: number): { build: CarBuild; et: number } {
  const n = sequenceFor(base.modelId).length;
  let lo = 0, hi = n;
  let etLo = estimate(applyUpgrades(base, 0)).et;
  if (etLo <= target) return { build: applyUpgrades(base, 0), et: etLo };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const et = estimate(applyUpgrades(base, mid)).et;
    if (et <= target) hi = mid; else { lo = mid; etLo = et; }
  }
  const bHi = applyUpgrades(base, hi);
  const etHi = estimate(bHi).et;
  if (Math.abs(etLo - target) < Math.abs(etHi - target)) return { build: applyUpgrades(base, lo), et: etLo };
  return { build: bHi, et: etHi };
}

// ------------------------------------------------------------------ visual styles

interface StyleDef {
  id: string;
  label: string;
  regions: string[];
  paints: string[];
  finishes: string[];
  wheels: string[];
  wheelFinish: string[];
  parts: Partial<Record<VisualSlot, string[]>>;
  neon: number;
  neonColors: string[];
  vinyl: 'tuner' | 'euro' | 'muscle' | 'ta' | 'vip' | 'none';
  ride: [number, number];
  camber: [number, number];
  tint: [number, number];
}

const STYLES: StyleDef[] = [
  {
    id: 'tuner', label: 'Import Tuner', regions: ['jdm', 'usdm'],
    paints: ['#e8e8ea', '#1f6fd1', '#ffcc00', '#ff6a00', '#7a2bd8', '#19c37d', '#d4153b', '#30d0ff', '#ff3fa4', '#c0c4cc'],
    finishes: ['pearl', 'metallic', 'candy', 'solid'],
    wheels: ['kx07', 'lattice', 'turbofan', 'twin5', 'hydra', 'cyclone', 'deep6', 'blade20'],
    wheelFinish: ['white', 'bronze', 'gold', 'gunmetal', 'chrome', 'polishedlip', 'black'],
    parts: {
      frontBumper: ['fb_lip', 'fb_sport', 'fb_aero_s', 'fb_wave', 'fb_ta'], rearBumper: ['rb_sport', 'rb_aero'], sideSkirts: ['ss_sport', 'ss_v2', 'ss_aero'],
      spoiler: ['sp_low', 'sp_mid', 'sp_double', 'sp_gt'], hood: ['hd_vented', 'hd_carbon', 'hd_carbon_vented', 'hd_gill'], exhaust: ['ex_single', 'ex_twin', 'ex_oval', 'ex_can'],
      headlights: ['hl_projector', 'hl_angel', 'hl_led'], taillights: ['tl_clear', 'tl_redclear', 'tl_led'], canards: ['cn_single', 'cn_double'],
      splitter: ['spl_carbon'], roof: ['rf_fin', 'rf_scoop', 'rf_vortex'], mirrors: ['mr_aero', 'mr_carbon'], hoodScoop: ['hs_naca', 'hs_ram'],
      frontFenders: ['fl_sport', 'fl_wide'], rearFenders: ['fl_sport', 'fl_wide'],
    },
    neon: 0.7, neonColors: ['#20a0ff', '#b030ff', '#30ff90', '#ff2a8a', '#ffffff'], vinyl: 'tuner', ride: [-70, -35], camber: [-2.5, -1], tint: [0.3, 0.7],
  },
  {
    id: 'euro', label: 'Euro Clean', regions: ['euro'],
    paints: ['#1d2230', '#2b2e33', '#d9dbe0', '#0d3b66', '#4a4f58', '#6b0f1a', '#1e3a2a', '#9aa0a8'],
    finishes: ['metallic', 'metallic', 'pearl', 'matte'],
    wheels: ['wr09', 'mono5', 'lattice', 'blade20', 'oem5'], wheelFinish: ['satin', 'gunmetal', 'silver', 'black', 'polishedlip'],
    parts: {
      frontBumper: ['fb_lip', 'fb_sport', 'fb_competition'], rearBumper: ['rb_sport', 'rb_competition'], sideSkirts: ['ss_sport', 'ss_blades'],
      spoiler: ['sp_lip', 'sp_ducktail', 'sp_gt'], hood: ['hd_carbon', 'hd_carbon_vented'], exhaust: ['ex_twin', 'ex_quad', 'ex_center'],
      headlights: ['hl_smoked', 'hl_angel'], taillights: ['tl_smoked', 'tl_led'], mirrors: ['mr_carbon'], diffuser: ['df_small', 'df_big'],
      splitter: ['spl_carbon'], frontFenders: ['fl_sport', 'fl_w600'], rearFenders: ['fl_sport', 'fl_w600'],
    },
    neon: 0.15, neonColors: ['#ffffff', '#40a0ff'], vinyl: 'euro', ride: [-55, -25], camber: [-2, -0.8], tint: [0.5, 0.8],
  },
  {
    id: 'muscle', label: 'Muscle Drag', regions: ['usdm'],
    paints: ['#d65a12', '#0f0f12', '#b3121b', '#1b4fa8', '#f2c230', '#2a6b3c', '#eaeaea', '#5b2a86'],
    finishes: ['solid', 'metallic', 'candy'],
    wheels: ['strip', 'mag', 'mono5', 'deep6'], wheelFinish: ['chrome', 'polishedlip', 'silver', 'black'],
    parts: {
      frontBumper: ['fb_drag', 'fb_lip'], hood: ['hd_cowl', 'hd_ramair', 'hd_extractor'], hoodScoop: ['hs_shaker', 'hs_cowl', 'hs_ram', 'hs_twin'],
      exhaust: ['ex_twin', 'ex_side', 'ex_quad'], spoiler: ['sp_ducktail', 'sp_drag'], diffuser: ['df_chute'], rearFenders: ['fl_sport', 'fl_wide'],
      taillights: ['tl_smoked', 'tl_led'], headlights: ['hl_blackquad', 'hl_smoked'],
    },
    neon: 0.2, neonColors: ['#ff3020', '#ffffff'], vinyl: 'muscle', ride: [-40, -10], camber: [-0.5, 0], tint: [0.2, 0.6],
  },
  {
    id: 'ta', label: 'Time Attack', regions: ['jdm', 'euro', 'usdm'],
    paints: ['#f2f2f2', '#111214', '#ffcc00', '#ff4a1c', '#1a9c5a', '#2a5bd7'],
    finishes: ['solid', 'matte', 'metallic'],
    wheels: ['mono5', 'gravel6', 'turbofan', 'wr09', 'kx07'], wheelFinish: ['bronze', 'white', 'gold', 'satin', 'gunmetal'],
    parts: {
      frontBumper: ['fb_ta', 'fb_wave', 'fb_competition'], rearBumper: ['rb_ta', 'rb_aero'], sideSkirts: ['ss_blades', 'ss_aero'], spoiler: ['sp_gt', 'sp_swan'],
      hood: ['hd_carbon_vented', 'hd_gill', 'hd_extractor'], splitter: ['spl_rods', 'spl_carbon'], diffuser: ['df_big'], canards: ['cn_double', 'cn_carbon'],
      frontFenders: ['fl_over', 'fl_ta', 'fl_wide'], rearFenders: ['fl_over', 'fl_ta', 'fl_wide'], roof: ['rf_vortex', 'rf_scoop', 'rf_carbon'],
      mirrors: ['mr_carbon'], exhaust: ['ex_single', 'ex_side', 'ex_center'], headlights: ['hl_led', 'hl_projector'],
    },
    neon: 0.05, neonColors: ['#ffffff'], vinyl: 'ta', ride: [-80, -50], camber: [-3, -2], tint: [0.4, 0.8],
  },
  {
    id: 'vip', label: 'VIP Stance', regions: ['jdm'],
    paints: ['#0a0a0c', '#e9e9eb', '#2a1a3a', '#3a3d42', '#5a0f14'],
    finishes: ['pearl', 'candy', 'metallic'],
    wheels: ['deep6', 'blade20', 'lattice', 'mono5'], wheelFinish: ['chrome', 'polishedlip', 'gold'],
    parts: { frontBumper: ['fb_vip'], rearBumper: ['rb_vip'], sideSkirts: ['ss_vip'], spoiler: ['sp_lip', 'sp_ducktail'], exhaust: ['ex_oval', 'ex_quad'], headlights: ['hl_angel', 'hl_smoked'], taillights: ['tl_led', 'tl_smoked'], mirrors: ['mr_fender', 'mr_aero'], frontFenders: ['fl_sport'], rearFenders: ['fl_sport'] },
    neon: 0.8, neonColors: ['#b030ff', '#20a0ff', '#ffffff'], vinyl: 'vip', ride: [-90, -60], camber: [-6, -3.5], tint: [0.7, 0.9],
  },
  {
    id: 'sleeper', label: 'Sleeper', regions: ['jdm', 'euro', 'usdm'],
    paints: ['#8c949c', '#5c6773', '#d9d9d9', '#6e7f2f', '#3a3d42'],
    finishes: ['solid', 'metallic'],
    wheels: ['oem5', 'steel', 'gravel6'], wheelFinish: ['silver', 'black', 'gunmetal'],
    parts: { exhaust: ['ex_single'] },
    neon: 0, neonColors: [], vinyl: 'none', ride: [-20, 0], camber: [-0.5, 0], tint: [0.1, 0.4],
  },
];

function styleFor(modelId: string, rng: RNG, level: number): StyleDef {
  const m = CARS[modelId];
  const region = BRANDS[m.brand].styleRegion;
  const candidates = STYLES.filter((s) => s.regions.includes(region) && !(s.id === 'vip' && !(m.body === 'sedan' || m.tags.includes('vip'))) && !(s.id === 'muscle' && m.body !== 'muscle'));
  const weights = candidates.map((s) => {
    if (s.id === 'sleeper') return level < 20 ? 3 : 0.4;
    if (s.id === 'muscle') return 10;
    if (s.id === 'ta') return level > 45 ? 2 : 0.5;
    if (s.id === 'vip') return 2;
    return 3;
  });
  return rng.weighted(candidates, weights);
}

const vl = (o: Partial<VinylLayer>): VinylLayer => ({ id: uid('v'), shape: 'rect', region: 'left', mirror: true, x: 0.5, y: 0.6, sx: 0.2, sy: 0.08, rot: 0, color: '#ffffff', color2: '#000000', opacity: 1, ...o });

function accentFor(paint: string, rng: RNG): [string, string] {
  const c = paint.toLowerCase();
  const dark = parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16) < 300;
  const brights = ['#30d0ff', '#ff2a6a', '#ffcc00', '#40ff90', '#ff6a00', '#b06aff', '#ffffff', '#e8e8e8'];
  const darks = ['#111214', '#1c2154', '#5a0f14', '#2a2d33', '#0a3a5a'];
  const a = dark ? rng.pick(brights) : rng.pick(rng.chance(0.5) ? darks : brights);
  let b = rng.pick(dark ? ['#c9d1dc', '#7d8590', '#ffffff'] : ['#111214', '#7d8590', '#c9d1dc']);
  if (b === a) b = '#7d8590';
  return [a, b];
}

function vinylsFor(style: StyleDef, level: number, rng: RNG, paint: string): VinylLayer[] {
  const [a, b] = accentFor(paint, rng);
  const out: VinylLayer[] = [];
  const n = level / 100;
  const num = String(rng.int(1, 99)).padStart(2, '0');
  switch (style.vinyl) {
    case 'tuner': {
      const shape = rng.pick(['sweep', 'shards', 'slash', 'wave', 'chevron', 'hatch'] as const);
      out.push(vl({ shape, x: 0.45 + rng.range(-0.05, 0.05), y: 0.58, sx: 0.4 + n * 0.3, sy: 0.1 + n * 0.08, color: a, color2: b, rot: rng.range(-6, 6) }));
      if (n > 0.3) out.push(vl({ shape: 'number', x: 0.5, y: 0.5, sx: 0.06, sy: 0.12, text: num, font: rng.pick(['italic', 'block'] as const), color: '#ffffff', color2: b }));
      const sp = rng.shuffle([...SPONSORS]).slice(0, Math.round(1 + n * 4));
      sp.forEach((s, i) => out.push(vl({ shape: 'sponsor', sponsor: s, x: 0.25 + i * 0.13, y: 0.68 + (i % 2) * 0.04, sx: 0.08, sy: 0.04, color: i % 2 ? b : '#ffffff', color2: paint })));
      if (n > 0.5) out.push(vl({ shape: rng.pick(['logo', 'star', 'bolt'] as const), region: 'top', mirror: false, x: 0.14, y: 0.5, sx: 0.07, sy: 0.3, logo: rng.pick(['ctw', 'wing', 'skull', 'crown']), color: a, color2: b }));
      if (n > 0.65) out.push(vl({ shape: 'hexgrid', x: 0.78, y: 0.5, sx: 0.2, sy: 0.15, color: a, opacity: 0.7 }));
      break;
    }
    case 'euro':
      out.push(vl({ shape: 'stripe', x: 0.5, y: 0.47, sx: 0.8, sy: 0.012, color: a }));
      if (n > 0.4) out.push(vl({ shape: 'number', x: 0.5, y: 0.6, sx: 0.05, sy: 0.1, text: num, font: 'block', color: b === '#111214' ? '#e8e8e8' : '#111214', color2: a }));
      if (n > 0.3) out.push(vl({ shape: 'sponsor', sponsor: rng.pick([...SPONSORS]), x: 0.3, y: 0.7, sx: 0.07, sy: 0.035, color: '#ffffff' }));
      if (n > 0.6) out.push(vl({ shape: 'stripe', region: 'top', mirror: false, x: 0.5, y: 0.6, sx: 1, sy: 0.02, color: a }));
      break;
    case 'muscle':
      out.push(vl({ shape: 'stripe', region: 'top', mirror: false, x: 0.5, y: 0.44, sx: 1, sy: 0.07, color: a }));
      out.push(vl({ shape: 'stripe', region: 'top', mirror: false, x: 0.5, y: 0.56, sx: 1, sy: 0.07, color: a }));
      if (n > 0.3) out.push(vl({ shape: 'stripe', x: 0.5, y: 0.7, sx: 0.85, sy: 0.03, color: a }));
      if (n > 0.5) out.push(vl({ shape: 'number', x: 0.52, y: 0.56, sx: 0.07, sy: 0.14, text: num, font: 'block', color: '#ffffff', color2: '#111214' }));
      break;
    case 'ta': {
      out.push(vl({ shape: rng.pick(['shards', 'hexgrid', 'slash'] as const), x: 0.5, y: 0.6, sx: 0.6, sy: 0.22, color: a, color2: b, rot: rng.range(-4, 4) }));
      out.push(vl({ shape: 'number', x: 0.5, y: 0.48, sx: 0.08, sy: 0.16, text: num, font: 'block', color: '#ffffff', color2: '#111214' }));
      rng.shuffle([...SPONSORS]).slice(0, 5).forEach((s, i) => out.push(vl({ shape: 'sponsor', sponsor: s, x: 0.2 + i * 0.14, y: 0.72, sx: 0.08, sy: 0.04, color: '#ffffff', color2: '#111214' })));
      out.push(vl({ shape: 'stripe', region: 'top', mirror: false, x: 0.5, y: 0.5, sx: 1, sy: 0.1, color: a }));
      out.push(vl({ shape: 'sponsor', region: 'top', mirror: false, sponsor: rng.pick([...SPONSORS]), x: 0.16, y: 0.5, sx: 0.06, sy: 0.18, rot: 90, color: '#ffffff', color2: '#111214' }));
      break;
    }
    case 'vip':
      if (n > 0.4) out.push(vl({ shape: 'fade', x: 0.7, y: 0.75, sx: 0.5, sy: 0.25, color: a, opacity: 0.5 }));
      break;
  }
  return out;
}

function pickPart(list: string[] | undefined, level: number, rng: RNG): string | undefined {
  if (!list || !list.length) return undefined;
  const idx = Math.min(list.length - 1, Math.max(0, Math.floor((level / 100) * list.length + rng.range(-1, 0.8))));
  return list[idx];
}

export function dressBuild(b: CarBuild, level: number, rng: RNG, style?: StyleDef): string {
  const st = style ?? styleFor(b.modelId, rng, level);
  const m = CARS[b.modelId];
  const v = b.visual;
  v.paint = { color: rng.pick(st.paints), finish: rng.pick(st.finishes) as any, pearl: rng.pick(['#ffffff', '#7fd0ff', '#ff7fd0', '#d0ff7f']) };
  // parts
  const slots = Object.keys(st.parts) as VisualSlot[];
  const nSlots = Math.round((level / 100) * slots.length * 1.1);
  rng.shuffle(slots);
  for (const slot of slots.slice(0, nSlots)) {
    const avail = visualParts(slot, m).map((p) => p.id);
    const list = st.parts[slot]!.filter((id) => avail.includes(id));
    const id = pickPart(list, level, rng);
    if (id) (v as any)[slot] = id;
  }
  v.spoilerFinish = rng.pick(st.id === 'ta' || st.id === 'euro' ? ['carbon', 'carbon', 'body'] : ['body', 'carbon', 'black']) as any;
  v.exhaustFinish = rng.pick(st.id === 'euro' || st.id === 'ta' ? ['titanium', 'black', 'carbon'] : ['chrome', 'titanium', 'polished']);
  // wheels
  if (level > 8 || st.id !== 'sleeper') {
    const wid = rng.pick(st.wheels);
    const design = WHEEL_DESIGNS.find((w) => w.id === wid) ?? WHEEL_DESIGNS[0];
    const up = st.id === 'sleeper' ? 0 : Math.min(3, Math.round((level / 100) * 3 + rng.range(-0.5, 0.8)));
    const size = Math.min(20, Math.max(15, m.stockWheelSize + up));
    const diam = m.stockWheelSize * 25.4 + (2 * m.stockTireWidth * m.stockTireProfile) / 100;
    const tw = Math.min(295, m.stockTireWidth + up * 10 + (st.id === 'ta' || st.id === 'muscle' ? 20 : 0));
    const profile = Math.max(30, Math.min(65, Math.round(((diam - size * 25.4) / 2 / tw) * 100 / 5) * 5));
    v.wheels = { design: design.id, size, width: Math.round(tw / 25.4 - 0.5 + 0.5), offset: rng.int(0, 15), profile, tireWidth: tw, finish: rng.pick(st.wheelFinish), color: '#ffffff', camber: rng.range(st.camber[0], st.camber[1]) };
  }
  v.caliperColor = rng.pick(['#b8b8b8', '#c1121f', '#f2c230', '#1f6fd1', '#111111', '#ff6a00']);
  v.vinyls = vinylsFor(st, level, rng, v.paint.color);
  v.neon = { enabled: rng.chance(st.neon * Math.min(1, level / 50)), color: st.neonColors.length ? rng.pick(st.neonColors) : '#ffffff', mode: rng.pick(['steady', 'steady', 'pulse']) as any };
  v.windowTint = rng.range(st.tint[0], st.tint[1]);
  b.tune.rideHeight = Math.round(rng.range(st.ride[0], st.ride[1]) * Math.min(1, 0.4 + level / 80));
  b.tune.camberF = v.wheels.camber;
  b.tune.camberR = v.wheels.camber * 0.8;
  if (level > 55 && rng.chance(0.5)) v.interior = { ...v.interior, seats: 'seat_bucket', steering: 'sw_deep', gauges: 'ga_pod', cage: level > 75 ? 'cage_half' : 'none', color: rng.pick(['#7a1218', '#1d3b78', '#1a1a1c']), material: 'alcantara' };
  return st.label;
}

export interface RivalRequest {
  tier: number;
  difficulty: number; // 0..1
  playerEt: number;
  playerStyle: number;
  seed: number;
  modelId?: string;
  styleId?: string;
  name?: string;
  nickname?: string;
  crew?: string;
  boss?: boolean;
  quote?: string;
}

export function skillFor(tier: number, difficulty: number, boss = false): DriverSkill {
  const k = Math.min(1, (tier + difficulty * 1.2) / 4.2 + (boss ? 0.15 : 0));
  return {
    reaction: 0.46 - k * 0.24,
    reactionVar: 0.07 - k * 0.04,
    launchAccuracy: 0.5 + k * 0.45,
    shiftAccuracy: 0.55 + k * 0.42,
    shiftBias: 0.03 - k * 0.03,
    nitroSkill: 0.3 + k * 0.7,
    mistakeChance: Math.max(0, 0.14 - k * 0.16),
  };
}

export function generateRival(req: RivalRequest): RivalProfile {
  const rng = new RNG(req.seed);
  const tier = TIERS[Math.min(req.tier, TIERS.length - 1)];
  const margin = 0.055 - req.difficulty * 0.075 - (req.boss ? 0.02 : 0);
  const target = Math.min(tier.etMax, Math.max(tier.etMin, req.playerEt * (1 + margin)));
  // choose model
  let modelId = req.modelId;
  if (!modelId) {
    const pool = CAR_LIST.filter((m) => m.price <= tier.budget && !m.tags.includes('tutorial'));
    const scored = pool.map((m) => {
      const [mx, st] = modelEtRange(m.id);
      const reachable = mx <= target + 0.15;
      const needsWork = st > target - 0.3;
      return { m, w: (reachable ? 1 : 0.02) * (needsWork ? 1 : 0.3) * (m.price < tier.budget * 0.15 && req.tier > 1 ? 0.3 : 1) };
    });
    modelId = rng.weighted(scored.map((x) => x.m.id), scored.map((x) => x.w + 0.001));
  }
  const base = stockBuild(modelId);
  const { build, et } = tuneToTarget(base, target);
  build.uid = uid('rival');
  const level = Math.max(4, Math.min(98, req.playerStyle * rng.range(0.85, 1.2) + req.tier * 9 + req.difficulty * 10 + (req.boss ? 20 : 0)));
  const style = req.styleId ? STYLES.find((s) => s.id === req.styleId) : undefined;
  const label = dressBuild(build, level, rng, style);
  build.buildName = rng.pick(BUILD_NAMES);
  const first = rng.pick(FIRST_NAMES), last = rng.pick(LAST_NAMES);
  return {
    id: uid('r'),
    name: req.name ?? `${first} ${last}`,
    nickname: req.nickname ?? rng.pick(NICKNAMES),
    crew: req.crew ?? rng.pick(CREWS),
    style: label,
    build,
    skill: skillFor(req.tier, req.difficulty, req.boss),
    quote: req.quote ?? rng.pick(TRASH_TALK),
    winQuote: rng.pick(WIN_QUOTES),
    loseQuote: rng.pick(LOSE_QUOTES),
    targetEt: et,
    boss: req.boss,
  };
}

export function rivalVisualScore(r: RivalProfile) { return visualScore(r.build); }
export { STYLES };
export type { StyleDef };
