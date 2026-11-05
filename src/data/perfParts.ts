import type { EngineSpec, PerfConfig } from '../core/types';

export type PerfSlot = keyof PerfConfig;

export interface TurboSpec {
  maxBoost: number; // bar
  defBoost: number;
  spoolStart: number; // fraction of redline where boost starts building
  spoolFull: number; // fraction of redline at full boost
  lag: number; // seconds
  twin?: boolean;
}

export interface SuperchargerSpec {
  kind: 'centrifugal' | 'roots' | 'twinscrew';
  maxBoost: number;
  defBoost: number;
  loss: number; // parasitic fraction
}

export interface PerfFx {
  na?: number; // NA airflow multiplier
  top?: number; // top-end multiplier (scaled by rpm fraction)
  low?: number; // low-end multiplier
  rev?: number; // redline delta
  boostAdd?: number; // extra boost allowance for factory turbo
  turbo?: TurboSpec;
  sc?: SuperchargerSpec;
  scBoost?: number; // pulley upgrade
  ic?: number; // boost efficiency multiplier
  icLag?: number; // lag multiplier
  safe?: number; // safe-torque multiplier (internals)
  disp?: number; // displacement multiplier (stroker)
  fuelCap?: number; // supported power multiple of factory
  cool?: number; // cooling multiplier
  inertia?: number;
  weight?: number;
  shift?: number; // shift time (absolute, gearbox)
  gearSet?: 'close' | 'six' | 'seq' | 'drag';
  clutch?: number; // capacity multiplier
  engage?: number; // engagement time
  diff?: number;
  eff?: number; // driveline efficiency delta
  mu?: number;
  muSlide?: number;
  roll?: number;
  wt?: number; // weight transfer multiplier
  lower?: number; // ride height mm range allowed (negative)
  nitro?: number; // hp
  nitroCap?: number; // seconds
  launch?: boolean;
  tuneBoost?: boolean;
  tuneRev?: boolean;
  tuneGears?: boolean;
  tuneSusp?: boolean;
}

export interface PerfPart {
  id: string;
  slot: PerfSlot;
  name: string;
  maker: string;
  price: number;
  tier: number;
  desc: string;
  fx: PerfFx;
  fits?: (e: EngineSpec) => boolean;
  requires?: string;
}

const L: PerfPart[] = [];
const add = (slot: PerfSlot, parts: Omit<PerfPart, 'slot'>[]) => parts.forEach((p) => L.push({ ...p, slot }));
const isTurbo = (e: EngineSpec) => e.aspiration === 'turbo' || e.aspiration === 'twinturbo';
const isNA = (e: EngineSpec) => e.aspiration === 'NA';
const isSC = (e: EngineSpec) => e.aspiration === 'supercharged';

// ---------------------------------------------------------------- ENGINE
add('intake', [
  { id: 'stock', name: 'Factory Airbox', maker: 'OEM', price: 0, tier: 0, desc: 'Paper filter, long snorkel.', fx: {} },
  { id: 'in_cai', name: 'Cold Air Intake', maker: 'Aerflo', price: 350, tier: 0, desc: 'Cone filter in a heat shield. +3% airflow.', fx: { na: 1.03 } },
  { id: 'in_ram', name: 'Short Ram Intake', maker: 'Aerflo', price: 300, tier: 0, desc: 'Short pipe, loud induction. +2% airflow, sharper response.', fx: { na: 1.02, low: 1.01 } },
  { id: 'in_itb', name: 'Velocity Stack ITBs', maker: 'Kanso Racing', price: 2400, tier: 2, desc: 'Individual throttle bodies. +7% top end. NA engines only.', fx: { na: 1.03, top: 1.06, rev: 200 }, fits: isNA },
]);
add('exhaust', [
  { id: 'stock', name: 'Factory Exhaust', maker: 'OEM', price: 0, tier: 0, desc: 'Two cats, two mufflers, quiet.', fx: {} },
  { id: 'ex_catback', name: 'Cat-Back System', maker: 'Strata', price: 600, tier: 0, desc: 'Mandrel-bent 2.5" cat-back. +3%.', fx: { na: 1.03, weight: -4 } },
  { id: 'ex_headers', name: 'Headers / Turbo-Back', maker: 'Strata', price: 1200, tier: 0, desc: 'Equal-length headers (NA) or 3" turbo-back with high-flow downpipe (turbo). +6%.', fx: { na: 1.06, weight: -6 } },
  { id: 'ex_titan', name: 'Full Titanium Race', maker: 'Voltex', price: 2600, tier: 1, desc: 'Full titanium system with merge collector. +9%, −12 kg.', fx: { na: 1.09, top: 1.01, weight: -12 } },
  { id: 'ex_straight', name: 'Straight Pipe', maker: 'Backyard Fab', price: 450, tier: 1, desc: 'No mufflers, no cats, no friends. +10%, deafening.', fx: { na: 1.1, low: 0.98, weight: -14 } },
]);
add('ecu', [
  { id: 'stock', name: 'Factory ECU', maker: 'OEM', price: 0, tier: 0, desc: 'Conservative timing, rich fuel maps.', fx: {} },
  { id: 'ecu_remap', name: 'Stage 1 Remap', maker: 'NightGrid Tuning', price: 500, tier: 0, desc: 'Re-flashed maps. +5%, +0.15 bar allowed on factory turbos.', fx: { na: 1.05, boostAdd: 0.15 } },
  { id: 'ecu_piggy', name: 'Piggyback Controller', maker: 'NightGrid Tuning', price: 1100, tier: 1, desc: 'Adjustable fuel and boost. +6%. Unlocks boost tuning.', fx: { na: 1.06, boostAdd: 0.25, tuneBoost: true } },
  { id: 'ecu_standalone', name: 'Standalone ECU', maker: 'Orbital Engineering', price: 2400, tier: 1, desc: 'Full programmable engine management. +9%, launch control, boost & rev-limit tuning.', fx: { na: 1.09, boostAdd: 0.35, tuneBoost: true, tuneRev: true, launch: true } },
]);
add('fuel', [
  { id: 'stock', name: 'Factory Fuel System', maker: 'OEM', price: 0, tier: 0, desc: 'Supports about 30% over factory power.', fx: { fuelCap: 1.3 } },
  { id: 'fu_pump', name: 'High-Flow Pump', maker: 'Strata', price: 300, tier: 0, desc: 'In-tank 255 lph pump. Supports +60%.', fx: { fuelCap: 1.6, na: 1.01 } },
  { id: 'fu_inj', name: 'Injectors + Rail', maker: 'Strata', price: 900, tier: 1, desc: 'Big injectors, billet rail, adjustable regulator. Supports +120%.', fx: { fuelCap: 2.2, na: 1.03 } },
  { id: 'fu_race', name: 'Race Fuel System', maker: 'Voltex', price: 1800, tier: 2, desc: 'Surge tank, twin pumps, 110-octane race fuel. Supports +160%, +5%.', fx: { fuelCap: 2.6, na: 1.05, cool: 1.05 } },
  { id: 'fu_e85', name: 'E85 Flex Conversion', maker: 'Voltex', price: 2200, tier: 2, desc: 'Ethanol cools the charge and resists knock. Supports +200%, +8%.', fx: { fuelCap: 3.0, na: 1.08, cool: 1.1 } },
]);
add('turbo', [
  { id: 'stock', name: 'Factory Turbo', maker: 'OEM', price: 0, tier: 0, desc: 'The turbo(s) the engine came with.', fx: {} },
  { id: 'none', name: 'No Turbo', maker: '—', price: 0, tier: 0, desc: 'Naturally aspirated.', fx: {} },
  { id: 'tb_hybrid', name: 'Hybrid Turbo', maker: 'Zenryu', price: 1400, tier: 0, desc: 'Bigger compressor wheel on the factory housing. Same spool, more top end.', fx: { turbo: { maxBoost: 1.35, defBoost: 1.0, spoolStart: 0.3, spoolFull: 0.52, lag: 0.45 } }, fits: isTurbo },
  { id: 'tb_twin', name: 'Twin-Turbo Conversion', maker: 'Zenryu', price: 3800, tier: 1, desc: 'Two medium turbos. Strong midrange.', fx: { turbo: { maxBoost: 1.6, defBoost: 1.15, spoolStart: 0.32, spoolFull: 0.55, lag: 0.5, twin: true } }, fits: isTurbo },
  { id: 'tb_big', name: 'Big Single 67mm', maker: 'Zenryu', price: 3200, tier: 1, desc: 'Big single on a tubular manifold. Laggy, then violent.', fx: { turbo: { maxBoost: 2.0, defBoost: 1.4, spoolStart: 0.4, spoolFull: 0.66, lag: 0.75 } }, fits: isTurbo },
  { id: 'tb_gt', name: 'GT Big Frame 76mm', maker: 'Zenryu', price: 5600, tier: 2, desc: 'Drag-only turbo. Nothing below 5,000 rpm, everything above it.', fx: { turbo: { maxBoost: 2.6, defBoost: 1.9, spoolStart: 0.5, spoolFull: 0.74, lag: 1.0 } }, fits: isTurbo },
  { id: 'tk_small', name: 'Street Turbo Kit', maker: 'Zenryu', price: 2600, tier: 0, desc: 'Complete bolt-on turbo kit with a small, quick turbo. NA engines.', fx: { turbo: { maxBoost: 0.8, defBoost: 0.55, spoolStart: 0.3, spoolFull: 0.5, lag: 0.4 }, icLag: 1 }, fits: isNA },
  { id: 'tk_medium', name: 'Stage 2 Turbo Kit', maker: 'Zenryu', price: 4200, tier: 1, desc: 'Medium turbo, manifold, wastegate, oil lines. NA engines.', fx: { turbo: { maxBoost: 1.2, defBoost: 0.85, spoolStart: 0.36, spoolFull: 0.58, lag: 0.6 } }, fits: isNA },
  { id: 'tk_large', name: 'Stage 3 Big Turbo Kit', maker: 'Zenryu', price: 6400, tier: 2, desc: 'Large turbo kit for built engines. NA engines.', fx: { turbo: { maxBoost: 1.9, defBoost: 1.3, spoolStart: 0.45, spoolFull: 0.68, lag: 0.85 } }, fits: isNA },
]);
add('supercharger', [
  { id: 'none', name: 'No Supercharger', maker: '—', price: 0, tier: 0, desc: 'No blower.', fx: {} },
  { id: 'stock', name: 'Factory Blower', maker: 'OEM', price: 0, tier: 0, desc: 'Factory supercharger.', fx: {} },
  { id: 'sc_pulley', name: 'Small Pulley Upgrade', maker: 'Ironclad Performance', price: 600, tier: 0, desc: 'Spins the factory blower harder. +0.3 bar.', fx: { scBoost: 0.3 }, fits: isSC },
  { id: 'sc_centri', name: 'Centrifugal Supercharger', maker: 'Torque House', price: 3600, tier: 1, desc: 'Belt-driven centrifugal. Boost climbs with rpm, little parasitic loss. NA engines.', fx: { sc: { kind: 'centrifugal', maxBoost: 1.0, defBoost: 0.75, loss: 0.05 } }, fits: isNA },
  { id: 'sc_roots', name: 'Roots Blower 6-71', maker: 'Torque House', price: 4400, tier: 1, desc: 'Classic roots blower sticking out of the hood. Instant boost, big losses. NA engines.', fx: { sc: { kind: 'roots', maxBoost: 0.8, defBoost: 0.6, loss: 0.12 } }, fits: isNA },
  { id: 'sc_screw', name: 'Twin-Screw Blower', maker: 'Torque House', price: 5200, tier: 2, desc: 'Efficient twin-screw. Flat boost from idle. NA engines.', fx: { sc: { kind: 'twinscrew', maxBoost: 1.1, defBoost: 0.8, loss: 0.08 } }, fits: isNA },
]);
add('intercooler', [
  { id: 'stock', name: 'Factory Intercooler', maker: 'OEM', price: 0, tier: 0, desc: 'Small side-mount core (if forced induction).', fx: {} },
  { id: 'ic_fmic', name: 'Front-Mount Intercooler', maker: 'Kanso Racing', price: 800, tier: 0, desc: 'Big front-mount core. +7% boost efficiency, slightly more lag.', fx: { ic: 1.07, icLag: 1.05 } },
  { id: 'ic_comp', name: 'Competition Intercooler', maker: 'Kanso Racing', price: 1600, tier: 1, desc: 'Bar-and-plate race core. +12% efficiency.', fx: { ic: 1.12, icLag: 1.08, cool: 1.05 } },
  { id: 'ic_w2a', name: 'Water-to-Air Intercooler', maker: 'Orbital Engineering', price: 2200, tier: 2, desc: 'Short charge pipes, chilled core. +11% efficiency, less lag.', fx: { ic: 1.11, icLag: 0.9 } },
]);
add('internals', [
  { id: 'stock', name: 'Factory Internals', maker: 'OEM', price: 0, tier: 0, desc: 'Cast pistons, factory rods.', fx: { safe: 1 } },
  { id: 'int_forged', name: 'Forged Pistons & Rods', maker: 'Ronin Forged', price: 2200, tier: 1, desc: 'Forged internals. Engine can safely take ~70% more torque. +200 rpm.', fx: { safe: 1.7, rev: 200 } },
  { id: 'int_stroker', name: 'Stroker Kit', maker: 'Ronin Forged', price: 3400, tier: 1, desc: 'Longer stroke crank, forged rods. +12% displacement.', fx: { safe: 1.55, disp: 1.12, rev: -200 } },
  { id: 'int_billet', name: 'Billet Race Bottom End', maker: 'Ronin Forged', price: 5200, tier: 2, desc: 'Billet crank, H-beam rods, sleeved block. Built for 2.5× factory torque. +500 rpm.', fx: { safe: 2.5, rev: 500 } },
]);
add('camshaft', [
  { id: 'stock', name: 'Factory Cams', maker: 'OEM', price: 0, tier: 0, desc: 'Mild, smooth.', fx: {} },
  { id: 'cam_street', name: 'Street Cams', maker: 'Kanso Racing', price: 700, tier: 0, desc: 'More lift and duration. +4% top end, +300 rpm.', fx: { top: 1.04, low: 0.99, rev: 300 } },
  { id: 'cam_race', name: 'Race Cams', maker: 'Kanso Racing', price: 1500, tier: 1, desc: 'Aggressive profile, lumpy idle. +8% top end, +600 rpm, soft bottom end.', fx: { top: 1.08, low: 0.95, rev: 600 } },
]);
add('flywheel', [
  { id: 'stock', name: 'Factory Flywheel', maker: 'OEM', price: 0, tier: 0, desc: 'Heavy dual-mass flywheel.', fx: {} },
  { id: 'fw_light', name: 'Lightweight Flywheel', maker: 'Haku', price: 450, tier: 0, desc: 'Chromoly flywheel. Revs climb faster.', fx: { inertia: 0.78, weight: -4 } },
  { id: 'fw_alu', name: 'Aluminium Flywheel', maker: 'Haku', price: 800, tier: 1, desc: 'Ultra-light. Revs like a motorcycle; easy to bog.', fx: { inertia: 0.6, weight: -6 } },
]);
add('cooling', [
  { id: 'stock', name: 'Factory Cooling', maker: 'OEM', price: 0, tier: 0, desc: 'Plastic tank radiator.', fx: {} },
  { id: 'co_rad', name: 'Aluminium Radiator', maker: 'Kanso Racing', price: 450, tier: 0, desc: '+25% heat rejection.', fx: { cool: 1.25 } },
  { id: 'co_oil', name: 'Radiator + Oil Cooler', maker: 'Kanso Racing', price: 850, tier: 0, desc: '+45% heat rejection.', fx: { cool: 1.45 } },
  { id: 'co_race', name: 'Race Cooling Package', maker: 'Orbital Engineering', price: 1600, tier: 1, desc: 'Radiator, oil and transmission coolers, ducting. +75%.', fx: { cool: 1.75 } },
]);
add('engineSwap', [{ id: 'stock', name: 'Factory Engine', maker: 'OEM', price: 0, tier: 0, desc: 'The engine it came with.', fx: {} }]);
add('nitrous', [
  { id: 'none', name: 'No Nitrous', maker: '—', price: 0, tier: 0, desc: 'No bottle.', fx: {} },
  { id: 'n2o_50', name: 'Dry 50 Shot', maker: 'Nightgrid N2O', price: 700, tier: 0, desc: '+50 hp for about 9 seconds.', fx: { nitro: 50, nitroCap: 9, weight: 10 } },
  { id: 'n2o_100', name: 'Wet 100 Shot', maker: 'Nightgrid N2O', price: 1300, tier: 0, desc: '+100 hp for about 7 seconds.', fx: { nitro: 100, nitroCap: 7, weight: 12 } },
  { id: 'n2o_150', name: 'Wet 150 Shot', maker: 'Nightgrid N2O', price: 2000, tier: 1, desc: '+150 hp for about 6 seconds.', fx: { nitro: 150, nitroCap: 6, weight: 14 } },
  { id: 'n2o_250', name: 'Direct-Port 250', maker: 'Nightgrid N2O', price: 3600, tier: 2, desc: 'Nozzle per cylinder. +250 hp for about 5 seconds.', fx: { nitro: 250, nitroCap: 5, weight: 16 } },
]);

// ---------------------------------------------------------------- DRIVETRAIN
add('clutch', [
  { id: 'stock', name: 'Factory Clutch', maker: 'OEM', price: 0, tier: 0, desc: 'Holds about 20% over factory torque.', fx: { clutch: 1.2, engage: 0.32 } },
  { id: 'cl_s1', name: 'Stage 1 Organic', maker: 'Haku', price: 400, tier: 0, desc: 'Holds +50%. Smooth.', fx: { clutch: 1.5, engage: 0.28 } },
  { id: 'cl_s2', name: 'Stage 2 Reinforced', maker: 'Haku', price: 750, tier: 0, desc: 'Reinforced ceramic-paddle clutch. Holds +100%.', fx: { clutch: 2.0, engage: 0.24 } },
  { id: 'cl_twin', name: 'Twin-Plate', maker: 'Haku', price: 1600, tier: 1, desc: 'Twin-plate. Holds +180%. Aggressive bite.', fx: { clutch: 2.8, engage: 0.19, inertia: 0.95 } },
  { id: 'cl_multi', name: 'Multi-Plate Race', maker: 'Haku', price: 2600, tier: 2, desc: 'Triple-plate carbon clutch. Holds +260%, instant engagement.', fx: { clutch: 3.6, engage: 0.15, inertia: 0.9 } },
]);
add('gearbox', [
  { id: 'stock', name: 'Factory Gearbox', maker: 'OEM', price: 0, tier: 0, desc: 'Stock ratios, H-pattern.', fx: { shift: 0.34 } },
  { id: 'gb_close', name: 'Close-Ratio Gearset', maker: 'Kanso Racing', price: 1800, tier: 0, desc: 'Tighter ratios, faster synchros. Ratios tunable.', fx: { shift: 0.3, gearSet: 'close', tuneGears: true } },
  { id: 'gb_six', name: '6-Speed Swap', maker: 'Orbital Engineering', price: 2600, tier: 1, desc: 'Six-speed box with a short first gear. Ratios tunable.', fx: { shift: 0.3, gearSet: 'six', tuneGears: true, weight: 8 } },
  { id: 'gb_drag', name: 'Drag Gearbox', maker: 'Quarter Mile Co.', price: 3400, tier: 1, desc: 'Five-speed drag box with straight-cut gears. Fast shifts, tunable.', fx: { shift: 0.18, gearSet: 'drag', tuneGears: true } },
  { id: 'gb_seq', name: 'Sequential Dog Box', maker: 'Orbital Engineering', price: 6200, tier: 2, desc: 'Six-speed sequential. 80 ms shifts. Ratios tunable.', fx: { shift: 0.08, gearSet: 'seq', tuneGears: true, weight: 4 } },
]);
add('diff', [
  { id: 'stock', name: 'Factory Differential', maker: 'OEM', price: 0, tier: 0, desc: 'Open differential.', fx: { diff: 0.94 } },
  { id: 'df_1way', name: '1-Way LSD', maker: 'Kanso Racing', price: 900, tier: 0, desc: 'Locks under power. Better launches.', fx: { diff: 0.98 } },
  { id: 'df_2way', name: '2-Way LSD', maker: 'Kanso Racing', price: 1300, tier: 1, desc: 'Locks under power and on lift-off.', fx: { diff: 0.99 } },
  { id: 'df_spool', name: 'Drag Spool', maker: 'Quarter Mile Co.', price: 1100, tier: 1, desc: 'Fully locked axle. Perfect for straight lines only.', fx: { diff: 1.0, eff: 0.005 } },
]);
add('driveshaft', [
  { id: 'stock', name: 'Factory Driveshaft', maker: 'OEM', price: 0, tier: 0, desc: 'Two-piece steel shaft.', fx: {} },
  { id: 'ds_carbon', name: 'Carbon Driveshaft', maker: 'Orbital Engineering', price: 1200, tier: 1, desc: 'One-piece carbon. Less rotating mass, +1% efficiency.', fx: { eff: 0.01, inertia: 0.96, weight: -6 } },
]);

// ---------------------------------------------------------------- CHASSIS
add('suspension', [
  { id: 'stock', name: 'Factory Suspension', maker: 'OEM', price: 0, tier: 0, desc: 'Soft, tall, comfortable.', fx: { wt: 1.0, lower: 0 } },
  { id: 'su_springs', name: 'Lowering Springs', maker: 'Kanso Suspension', price: 350, tier: 0, desc: 'Drops 30 mm. Cheap and cheerful.', fx: { wt: 0.98, lower: -30 } },
  { id: 'su_street', name: 'Street Coilovers', maker: 'Kanso Suspension', price: 900, tier: 0, desc: 'Height-adjustable street coilovers.', fx: { wt: 1.02, lower: -50, tuneSusp: true } },
  { id: 'su_adj', name: 'Adjustable Coilovers', maker: 'Kanso Suspension', price: 1600, tier: 0, desc: 'Height, rebound and spring preload adjustable.', fx: { wt: 1.05, lower: -70, tuneSusp: true } },
  { id: 'su_race', name: 'Racing Coilovers', maker: 'Kanso Suspension', price: 2600, tier: 1, desc: 'Remote-reservoir race coilovers.', fx: { wt: 1.07, lower: -90, tuneSusp: true } },
  { id: 'su_drag', name: 'Drag Suspension', maker: 'Quarter Mile Co.', price: 2200, tier: 1, desc: 'Soft rear, stiff front, traction bars. Maximum squat on launch.', fx: { wt: 1.22, lower: -40, tuneSusp: true } },
]);
add('brakes', [
  { id: 'stock', name: 'Factory Brakes', maker: 'OEM', price: 0, tier: 0, desc: 'Single-piston sliding calipers.', fx: {} },
  { id: 'br_pads', name: 'Sport Pads & Lines', maker: 'Haku', price: 300, tier: 0, desc: 'Better bite, braided lines.', fx: {} },
  { id: 'br_bbk', name: 'Big Brake Kit 4-Pot', maker: 'Haku', price: 1800, tier: 0, desc: 'Four-piston calipers, 330 mm rotors.', fx: { weight: 3 } },
  { id: 'br_race', name: 'Race 6-Pot', maker: 'Haku', price: 3200, tier: 1, desc: 'Six-piston monoblock calipers, two-piece floating rotors.', fx: { weight: -2 } },
]);
add('tires', [
  { id: 'tr_street', name: 'Street Tyres', maker: 'Zenryu', price: 0, tier: 0, desc: 'Hard compound all-season tyres.', fx: { mu: 1.2, muSlide: 1.05, roll: 0.013 } },
  { id: 'tr_sport', name: 'Sport Tyres', maker: 'Zenryu', price: 700, tier: 0, desc: 'Summer performance compound.', fx: { mu: 1.3, muSlide: 1.12, roll: 0.013 } },
  { id: 'tr_semi', name: 'Street Semi-Slicks', maker: 'Zenryu', price: 1200, tier: 0, desc: 'Barely-legal semi-slicks. Huge grip once warm.', fx: { mu: 1.42, muSlide: 1.2, roll: 0.014 } },
  { id: 'tr_dragr', name: 'Drag Radials', maker: 'Quarter Mile Co.', price: 1500, tier: 1, desc: 'Soft sidewall, sticky compound. Made for launching.', fx: { mu: 1.6, muSlide: 1.3, roll: 0.016 } },
  { id: 'tr_slick', name: 'Drag Slicks', maker: 'Quarter Mile Co.', price: 2400, tier: 2, desc: 'Full slicks. Not street legal. Neither are you.', fx: { mu: 1.85, muSlide: 1.45, roll: 0.018 } },
]);
add('weight', [
  { id: 'stock', name: 'Factory Weight', maker: 'OEM', price: 0, tier: 0, desc: 'Spare wheel, sound deadening, rear seats.', fx: {} },
  { id: 'wr_1', name: 'Stage 1 Reduction', maker: 'Garage', price: 300, tier: 0, desc: 'Spare, jack, rear seats out. −40 kg.', fx: { weight: -40 } },
  { id: 'wr_2', name: 'Stage 2 Reduction', maker: 'Garage', price: 1100, tier: 1, desc: 'Interior strip, deadening removed. −80 kg.', fx: { weight: -80 } },
  { id: 'wr_3', name: 'Stage 3 Reduction', maker: 'Orbital Engineering', price: 3800, tier: 2, desc: 'Lexan windows, carbon doors and trunk. −130 kg.', fx: { weight: -130 } },
]);

export const PERF_PARTS = L;

export function perfParts(slot: PerfSlot, engine: EngineSpec): PerfPart[] {
  return L.filter((p) => {
    if (p.slot !== slot) return false;
    if (slot === 'turbo') {
      if (p.id === 'stock') return isTurbo(engine);
      if (p.id === 'none') return !isTurbo(engine);
    }
    if (slot === 'supercharger') {
      if (p.id === 'stock') return isSC(engine);
      if (p.id === 'none') return !isSC(engine);
    }
    return !p.fits || p.fits(engine);
  });
}

export function perfPart(slot: PerfSlot, id: string): PerfPart {
  return L.find((p) => p.slot === slot && p.id === id) ?? L.find((p) => p.slot === slot)!;
}

export const PERF_GROUPS: { title: string; slots: { slot: PerfSlot; label: string }[] }[] = [
  {
    title: 'ENGINE',
    slots: [
      { slot: 'engineSwap', label: 'Engine Swap' },
      { slot: 'intake', label: 'Intake' },
      { slot: 'exhaust', label: 'Exhaust System' },
      { slot: 'ecu', label: 'ECU' },
      { slot: 'fuel', label: 'Fuel System' },
      { slot: 'camshaft', label: 'Camshafts' },
      { slot: 'internals', label: 'Internals' },
      { slot: 'flywheel', label: 'Flywheel' },
      { slot: 'cooling', label: 'Cooling' },
    ],
  },
  {
    title: 'FORCED INDUCTION',
    slots: [
      { slot: 'turbo', label: 'Turbocharger' },
      { slot: 'supercharger', label: 'Supercharger' },
      { slot: 'intercooler', label: 'Intercooler' },
      { slot: 'nitrous', label: 'Nitrous Oxide' },
    ],
  },
  {
    title: 'DRIVETRAIN',
    slots: [
      { slot: 'clutch', label: 'Clutch' },
      { slot: 'gearbox', label: 'Gearbox' },
      { slot: 'diff', label: 'Differential' },
      { slot: 'driveshaft', label: 'Driveshaft' },
    ],
  },
  {
    title: 'CHASSIS',
    slots: [
      { slot: 'suspension', label: 'Suspension' },
      { slot: 'brakes', label: 'Brakes' },
      { slot: 'tires', label: 'Tyre Compound' },
      { slot: 'weight', label: 'Weight Reduction' },
    ],
  },
];

// Gear sets for gearbox upgrades (ratios before final drive)
export const GEAR_SETS: Record<string, { gears: number[]; final?: number }> = {
  close: { gears: [3.1, 2.05, 1.5, 1.18, 0.96] },
  six: { gears: [3.6, 2.3, 1.68, 1.3, 1.06, 0.86] },
  drag: { gears: [2.9, 1.95, 1.45, 1.15, 0.94] },
  seq: { gears: [3.2, 2.25, 1.75, 1.42, 1.18, 1.0] },
};

// Interior parts (visual + minor weight)
export interface InteriorPart { id: string; slot: keyof import('../core/types').InteriorConfig; name: string; price: number; style: number; weight?: number; shift?: number; wt?: number; desc: string }
export const INTERIOR_PARTS: InteriorPart[] = [
  { id: 'stock', slot: 'seats', name: 'Factory Seats', price: 0, style: 0, desc: 'Cloth comfort seats.' },
  { id: 'seat_bucket', slot: 'seats', name: 'Fixed Buckets', price: 900, style: 2, weight: -12, desc: 'FRP fixed-back bucket seats.' },
  { id: 'seat_carbon', slot: 'seats', name: 'Carbon Shells', price: 1800, style: 3, weight: -20, desc: 'Carbon-kevlar race shells.' },
  { id: 'stock', slot: 'steering', name: 'Factory Wheel', price: 0, style: 0, desc: 'Airbag wheel.' },
  { id: 'sw_deep', slot: 'steering', name: 'Deep Dish Wheel', price: 280, style: 1, desc: '350 mm deep-dish suede wheel.' },
  { id: 'sw_suede', slot: 'steering', name: 'Flat-Bottom Race Wheel', price: 450, style: 2, desc: 'Flat-bottom with quick release.' },
  { id: 'stock', slot: 'dash', name: 'Factory Dash', price: 0, style: 0, desc: 'Grey plastic.' },
  { id: 'dash_carbon', slot: 'dash', name: 'Carbon Dash Trim', price: 600, style: 2, desc: 'Carbon-look trim panels.' },
  { id: 'dash_alu', slot: 'dash', name: 'Brushed Alu Trim', price: 450, style: 1, desc: 'Brushed aluminium trim.' },
  { id: 'stock', slot: 'gauges', name: 'Factory Cluster', price: 0, style: 0, desc: 'Analogue cluster.' },
  { id: 'ga_pod', slot: 'gauges', name: 'A-Pillar Gauge Pod', price: 350, style: 2, desc: 'Boost, oil pressure, AFR.' },
  { id: 'ga_digital', slot: 'gauges', name: 'Digital Dash', price: 1200, style: 3, desc: 'Programmable digital display with shift lights.' },
  { id: 'none', slot: 'cage', name: 'No Cage', price: 0, style: 0, desc: 'No roll protection.' },
  { id: 'cage_half', slot: 'cage', name: 'Bolt-in Half Cage', price: 1100, style: 2, weight: 18, wt: 1.03, desc: 'Rear hoop and harness bar. Stiffer chassis.' },
  { id: 'cage_full', slot: 'cage', name: 'Welded Full Cage', price: 2600, style: 4, weight: 35, wt: 1.07, desc: 'Full chromoly cage. Much stiffer chassis, better launches.' },
  { id: 'stock', slot: 'shifter', name: 'Factory Shifter', price: 0, style: 0, desc: 'Long throw.' },
  { id: 'sh_short', slot: 'shifter', name: 'Short Shifter', price: 350, style: 1, shift: -0.04, desc: 'Shorter throw, faster shifts.' },
  { id: 'sh_billet', slot: 'shifter', name: 'Billet Short Shifter', price: 700, style: 2, shift: -0.06, desc: 'Billet, zero slop.' },
];
export const INTERIOR_COLORS = ['#1a1a1c', '#3a3d44', '#7a1218', '#1d3b78', '#c9b48a', '#e8e8e8', '#0d4d3a', '#ff6a00'];
export const INTERIOR_MATERIALS = ['cloth', 'leather', 'alcantara', 'carbon'];
