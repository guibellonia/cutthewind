import type { BrandId, CarModel } from '../core/types';

export type VisualSlot =
  | 'frontBumper' | 'rearBumper' | 'sideSkirts' | 'frontFenders' | 'rearFenders' | 'hood' | 'hoodScoop' | 'spoiler'
  | 'mirrors' | 'headlights' | 'taillights' | 'roof' | 'exhaust' | 'splitter' | 'diffuser' | 'canards';

export interface VisualPart {
  id: string;
  slot: VisualSlot;
  name: string;
  price: number;
  style: number; // style points contributed to the visual rating
  tier: number;
  desc: string;
  brands?: BrandId[]; // brand-specific fitment
  weight?: number; // kg delta
  cd?: number; // drag coefficient delta
  down?: number; // downforce coefficient * area
  p: Record<string, any>; // geometry parameters, interpreted by the renderer
}

const P: VisualPart[] = [];
const add = (slot: VisualSlot, parts: Omit<VisualPart, 'slot'>[]) => parts.forEach((x) => P.push({ ...x, slot }));

// ------------------------------------------------------------------ FRONT BUMPERS
add('frontBumper', [
  { id: 'stock', name: 'Factory Bumper', price: 0, style: 0, tier: 0, desc: 'The bumper it left the factory with.', p: { ext: 0, chin: 0, intake: 'stock', lip: 0, fog: 0 } },
  { id: 'fb_lip', name: 'Street Lip', price: 380, style: 2, tier: 0, desc: 'Factory bumper with a urethane lip spoiler.', p: { ext: 0.01, chin: 0.025, intake: 'stock', lip: 1, fog: 0 } },
  { id: 'fb_aero_s', name: 'Kairo Aero Type-S', price: 1100, style: 5, tier: 0, brands: ['kairo'], desc: 'Factory-option aero bumper with a wide centre intake and brake ducts. Subtle but purposeful.', cd: -0.005, p: { ext: 0.035, chin: 0.04, intake: 'center', lip: 1, fog: 1 } },
  { id: 'fb_sport', name: 'Vortice Sport Fascia', price: 900, style: 4, tier: 0, desc: 'Lower, sharper fascia with triple intakes.', p: { ext: 0.03, chin: 0.045, intake: 'triple', lip: 0, fog: 1 } },
  { id: 'fb_wave', name: 'Wavecrest Aero', price: 1400, style: 6, tier: 1, desc: 'Big-mouth tuner bumper with mesh intakes and integrated canard ledges.', p: { ext: 0.05, chin: 0.06, intake: 'wide', lip: 1, fog: 0 } },
  { id: 'fb_competition', name: 'Werkhaus Competition', price: 2400, style: 7, tier: 1, brands: ['werkhaus'], desc: 'R-division competition bumper. Large twin intakes, carbon lip, oil-cooler ducts.', cd: -0.01, down: 0.04, p: { ext: 0.05, chin: 0.06, intake: 'dualSide', lip: 2, fog: 0 } },
  { id: 'fb_ta', name: 'Time Attack Front', price: 2800, style: 8, tier: 2, desc: 'Extreme front clip with radiator exit and splitter mounts.', down: 0.08, p: { ext: 0.07, chin: 0.075, intake: 'mesh', lip: 2, fog: 0 } },
  { id: 'fb_vip', name: 'Kuro VIP Executive', price: 1600, style: 6, tier: 1, desc: 'Long, low and wide. Chrome fog surrounds, slatted intake.', p: { ext: 0.06, chin: 0.08, intake: 'slats', lip: 0, fog: 2 } },
  { id: 'fb_drag', name: 'Strip Smooth Nose', price: 1200, style: 5, tier: 1, desc: 'Smoothed drag nose with a single cooling slot. Low drag.', cd: -0.015, p: { ext: 0.02, chin: 0.03, intake: 'slot', lip: 0, fog: 0 } },
  { id: 'fb_rally', name: 'Gravel Spec Front', price: 1300, style: 5, tier: 1, desc: 'Rally-inspired bumper with big round fog lamps.', p: { ext: 0.03, chin: 0.03, intake: 'center', lip: 0, fog: 3 } },
]);

// ------------------------------------------------------------------ REAR BUMPERS
add('rearBumper', [
  { id: 'stock', name: 'Factory Bumper', price: 0, style: 0, tier: 0, desc: 'Stock rear bumper.', p: { ext: 0, chin: 0, vents: 0, style: 'stock' } },
  { id: 'rb_sport', name: 'Vortice Sport Rear', price: 700, style: 3, tier: 0, desc: 'Lower valance with side vents.', p: { ext: 0.02, chin: 0.035, vents: 1, style: 'sport' } },
  { id: 'rb_aero', name: 'Aero Valance', price: 1100, style: 5, tier: 1, desc: 'Deep valance with an integrated diffuser tray.', p: { ext: 0.03, chin: 0.05, vents: 2, style: 'aero' } },
  { id: 'rb_competition', name: 'Werkhaus Competition Rear', price: 1900, style: 6, tier: 1, brands: ['werkhaus'], desc: 'Quad-exhaust cut-outs and carbon diffuser surround.', p: { ext: 0.035, chin: 0.05, vents: 2, style: 'competition' } },
  { id: 'rb_ta', name: 'Time Attack Rear', price: 2200, style: 7, tier: 2, desc: 'Cut-away rear with exposed crash bar and huge diffuser opening.', p: { ext: 0.02, chin: 0.06, vents: 3, style: 'ta' } },
  { id: 'rb_vip', name: 'Kuro VIP Rear', price: 1300, style: 5, tier: 1, desc: 'Long rear skirt that almost touches the ground.', p: { ext: 0.05, chin: 0.08, vents: 0, style: 'vip' } },
]);

// ------------------------------------------------------------------ SIDE SKIRTS
add('sideSkirts', [
  { id: 'stock', name: 'Factory Sills', price: 0, style: 0, tier: 0, desc: 'Stock rocker panels.', p: { drop: 0, out: 0, blade: 0 } },
  { id: 'ss_v2', name: 'Kestrel Side Skirt V2', price: 650, style: 3, tier: 0, brands: ['kairo'], desc: 'Second-generation Kairo skirts. Clean, low, factory fit.', p: { drop: 0.035, out: 0.012, blade: 0 } },
  { id: 'ss_sport', name: 'Vortice Sport Skirts', price: 600, style: 3, tier: 0, desc: 'Simple squared-off skirts.', p: { drop: 0.04, out: 0.015, blade: 0 } },
  { id: 'ss_aero', name: 'Aero Vent Skirts', price: 950, style: 5, tier: 1, desc: 'Skirts with rear brake-cooling vents.', p: { drop: 0.05, out: 0.02, blade: 0, vent: 1 } },
  { id: 'ss_blades', name: 'Competition Side Blades', price: 1400, style: 6, tier: 1, desc: 'Carbon side blades that stick out past the body line.', down: 0.02, p: { drop: 0.04, out: 0.018, blade: 1 } },
  { id: 'ss_vip', name: 'Kuro VIP Skirts', price: 900, style: 4, tier: 1, desc: 'Deep VIP-style skirts.', p: { drop: 0.075, out: 0.02, blade: 0 } },
]);

// ------------------------------------------------------------------ FENDERS (front & rear share designs)
const fenders = (slot: VisualSlot, rear: boolean) =>
  add(slot, [
    { id: 'stock', name: 'Factory Fenders', price: 0, style: 0, tier: 0, desc: 'Stock arches.', p: { flare: 0, rivets: 0, seam: 0 } },
    { id: 'fl_sport', name: 'Sport Flares', price: rear ? 700 : 600, style: 2, tier: 0, desc: 'Subtle rolled flares for wider wheels (+20 mm).', p: { flare: 0.02, rivets: 0, seam: 0 } },
    { id: 'fl_wide', name: 'Wide Flares', price: rear ? 1300 : 1100, style: 4, tier: 1, desc: 'Steel wide flares welded in (+40 mm).', p: { flare: 0.04, rivets: 0, seam: 1 } },
    { id: 'fl_over', name: 'Bolt-On Overfenders', price: rear ? 1800 : 1500, style: 6, tier: 1, desc: 'Riveted FRP overfenders (+60 mm). Old-school JDM.', p: { flare: 0.06, rivets: 1, seam: 1 } },
    { id: 'fl_w600', name: 'W600 Widebody', price: rear ? 3200 : 2600, style: 7, tier: 1, brands: ['werkhaus'], desc: 'Factory-look Werkhaus widebody (+70 mm), seamless.', p: { flare: 0.07, rivets: 0, seam: 0 } },
    { id: 'fl_ta', name: 'Time Attack Widebody', price: rear ? 3800 : 3100, style: 8, tier: 2, desc: 'Massive riveted widebody (+90 mm) with vented arches.', p: { flare: 0.09, rivets: 1, seam: 1, vent: 1 } },
  ]);
fenders('frontFenders', false);
fenders('rearFenders', true);

// ------------------------------------------------------------------ HOODS
add('hood', [
  { id: 'stock', name: 'Factory Hood', price: 0, style: 0, tier: 0, desc: 'Stock steel hood.', p: { bulge: 0, vents: 'stock', carbon: 0 } },
  { id: 'hd_vented', name: 'Twin-Vent Hood', price: 800, style: 3, tier: 0, desc: 'Steel hood with two heat-extraction vents.', p: { bulge: 0, vents: 'twin', carbon: 0 }, weight: -2 },
  { id: 'hd_carbon', name: 'Carbon OEM Hood', price: 1200, style: 4, tier: 0, desc: 'Exposed carbon fibre, factory shape. −9 kg.', p: { bulge: 0, vents: 'none', carbon: 1 }, weight: -9 },
  { id: 'hd_carbon_vented', name: 'Vented Carbon Hood', price: 1700, style: 6, tier: 1, desc: 'Exposed carbon with large twin vents. −10 kg.', p: { bulge: 0, vents: 'twin', carbon: 1 }, weight: -10 },
  { id: 'hd_cowl', name: 'Cowl Induction Hood', price: 1000, style: 4, tier: 0, desc: 'Raised rear cowl for intake clearance.', p: { bulge: 0.05, vents: 'none', carbon: 0 } },
  { id: 'hd_extractor', name: 'Heat Extractor Hood', price: 1500, style: 5, tier: 1, desc: 'Full louvred centre section.', p: { bulge: 0.01, vents: 'louver', carbon: 0 }, weight: -3 },
  { id: 'hd_ramair', name: 'Ram-Air Bulge Hood', price: 1300, style: 5, tier: 1, desc: 'Power bulge with forward-facing opening.', p: { bulge: 0.07, vents: 'ram', carbon: 0 } },
  { id: 'hd_gill', name: 'Carbon Gill Hood', price: 2100, style: 7, tier: 2, desc: 'Carbon hood with side gills and a centre vent.', p: { bulge: 0.015, vents: 'gill', carbon: 1 }, weight: -11 },
]);

// ------------------------------------------------------------------ HOOD SCOOPS
add('hoodScoop', [
  { id: 'none', name: 'None', price: 0, style: 0, tier: 0, desc: 'No scoop.', p: { kind: 'none' } },
  { id: 'hs_naca', name: 'NACA Duct', price: 300, style: 2, tier: 0, desc: 'Flush NACA duct.', p: { kind: 'naca' } },
  { id: 'hs_ram', name: 'Ram Scoop', price: 450, style: 3, tier: 0, desc: 'Forward-facing ram scoop.', p: { kind: 'ram' } },
  { id: 'hs_tmic', name: 'Top-Mount Scoop', price: 550, style: 3, tier: 0, desc: 'Wide rally-style scoop feeding a top-mount intercooler.', p: { kind: 'tmic' } },
  { id: 'hs_cowl', name: 'Rear-Facing Cowl', price: 500, style: 3, tier: 1, desc: 'Classic cowl scoop facing the windshield.', p: { kind: 'cowl' } },
  { id: 'hs_shaker', name: 'Shaker Scoop', price: 900, style: 5, tier: 1, desc: 'Engine-mounted scoop poking through the hood. It shakes at idle.', p: { kind: 'shaker' } },
  { id: 'hs_twin', name: 'Twin Snorkels', price: 750, style: 4, tier: 1, desc: 'Two small forward-facing snorkels.', p: { kind: 'twin' } },
]);

// ------------------------------------------------------------------ SPOILERS
add('spoiler', [
  { id: 'none', name: 'None', price: 0, style: 0, tier: 0, desc: 'Clean deck lid.', p: { kind: 'none' } },
  { id: 'sp_lip', name: 'Trunk Lip', price: 300, style: 2, tier: 0, desc: 'Small lip spoiler on the trunk edge.', p: { kind: 'lip' } },
  { id: 'sp_ducktail', name: 'Subtle Ducktail', price: 650, style: 3, tier: 0, desc: 'Gently raised trunk edge. Period-correct and tasteful.', down: 0.02, p: { kind: 'ducktail', h: 0.045 } },
  { id: 'sp_low', name: 'Low Pedestal Wing', price: 700, style: 3, tier: 0, desc: 'Factory-style low wing.', down: 0.02, cd: 0.005, p: { kind: 'wing', h: 0.07, span: 0.82, chord: 0.18, end: 0, legs: 'pedestal' } },
  { id: 'sp_mid', name: 'Mid-Rise Wing', price: 1100, style: 5, tier: 1, desc: 'Taller wing with endplates.', down: 0.05, cd: 0.01, p: { kind: 'wing', h: 0.16, span: 0.9, chord: 0.22, end: 1, legs: 'pedestal' } },
  { id: 'sp_gt', name: 'Adjustable GT Wing', price: 2200, style: 7, tier: 1, desc: 'Full-width carbon GT wing on aluminium uprights. Adjustable angle.', down: 0.1, cd: 0.02, p: { kind: 'wing', h: 0.26, span: 1.0, chord: 0.28, end: 2, legs: 'upright' } },
  { id: 'sp_swan', name: 'Swan-Neck GT', price: 2800, style: 8, tier: 2, desc: 'Swan-neck mounts hang the wing from above for clean airflow.', down: 0.12, cd: 0.018, p: { kind: 'wing', h: 0.3, span: 1.02, chord: 0.3, end: 2, legs: 'swan' } },
  { id: 'sp_double', name: 'Double-Deck Wing', price: 1900, style: 6, tier: 1, desc: 'Two-element wing for maximum early-2000s energy.', down: 0.09, cd: 0.025, p: { kind: 'wing', h: 0.22, span: 0.94, chord: 0.2, end: 1, legs: 'pedestal', double: 1 } },
  { id: 'sp_drag', name: 'Drag Wicker Wing', price: 1500, style: 5, tier: 1, desc: 'Wide, high, flat drag wing with a wicker bill.', down: 0.06, cd: 0.012, p: { kind: 'wing', h: 0.34, span: 1.04, chord: 0.16, end: 1, legs: 'upright' } },
]);

// ------------------------------------------------------------------ MIRRORS
add('mirrors', [
  { id: 'stock', name: 'Factory Mirrors', price: 0, style: 0, tier: 0, desc: 'Stock door mirrors.', p: { kind: 'stock' } },
  { id: 'mr_aero', name: 'Aero Mirrors', price: 350, style: 2, tier: 0, desc: 'Slim mirrors on a thin stalk.', p: { kind: 'aero' } },
  { id: 'mr_carbon', name: 'Carbon Aero Mirrors', price: 600, style: 3, tier: 1, desc: 'Carbon-shell aero mirrors.', p: { kind: 'aero', carbon: 1 } },
  { id: 'mr_fender', name: 'Fender Mirrors', price: 450, style: 4, tier: 1, desc: 'Old-school JDM fender-mounted mirrors.', p: { kind: 'fender' } },
]);

// ------------------------------------------------------------------ LIGHTS
add('headlights', [
  { id: 'stock', name: 'Factory Headlights', price: 0, style: 0, tier: 0, desc: 'Stock lamps.', p: { style: 'stock' } },
  { id: 'hl_projector', name: 'Retro Projectors', price: 600, style: 3, tier: 0, desc: 'Clear lenses with chrome projector bowls.', p: { style: 'projector' } },
  { id: 'hl_angel', name: 'Angel Eye Rings', price: 800, style: 4, tier: 0, desc: 'Glowing halo rings. Very 2003.', p: { style: 'angelEyes' } },
  { id: 'hl_smoked', name: 'Smoked Lenses', price: 450, style: 3, tier: 0, desc: 'Tinted lenses, black reflectors.', p: { style: 'smoked' } },
  { id: 'hl_led', name: 'LED Strip Lamps', price: 1100, style: 5, tier: 1, desc: 'Black housings with a row of LEDs.', p: { style: 'ledStrip' } },
  { id: 'hl_blackquad', name: 'Black Quad Housings', price: 900, style: 4, tier: 1, desc: 'Four small projectors in black housings.', p: { style: 'blackQuad' } },
]);
add('taillights', [
  { id: 'stock', name: 'Factory Taillights', price: 0, style: 0, tier: 0, desc: 'Stock lamps.', p: { style: 'stock' } },
  { id: 'tl_clear', name: 'Clear Euro Lamps', price: 500, style: 3, tier: 0, desc: 'Clear lenses with chrome inserts. The year 2001 in a lamp.', p: { style: 'clearEuro' } },
  { id: 'tl_smoked', name: 'Smoked Taillights', price: 450, style: 3, tier: 0, desc: 'Dark-tinted lenses.', p: { style: 'smoked' } },
  { id: 'tl_led', name: 'LED Bar Lamps', price: 900, style: 4, tier: 1, desc: 'Red LED arrays.', p: { style: 'ledBar' } },
  { id: 'tl_redclear', name: 'Red-Clear Split', price: 600, style: 3, tier: 0, desc: 'Half red, half clear.', p: { style: 'redClear' } },
  { id: 'tl_round', name: 'Round Quad Conversion', price: 800, style: 4, tier: 1, desc: 'Four round lamps in a black panel.', p: { style: 'roundQuadAfter' } },
]);

// ------------------------------------------------------------------ ROOF
add('roof', [
  { id: 'stock', name: 'Factory Roof', price: 0, style: 0, tier: 0, desc: 'Plain roof.', p: { kind: 'none' } },
  { id: 'rf_scoop', name: 'Roof Scoop', price: 500, style: 3, tier: 0, desc: 'Rally-style roof air scoop.', p: { kind: 'scoop' } },
  { id: 'rf_fin', name: 'Shark Fin Antenna', price: 200, style: 1, tier: 0, desc: 'Small aero antenna.', p: { kind: 'fin' } },
  { id: 'rf_vortex', name: 'Vortex Generators', price: 400, style: 3, tier: 1, desc: 'Row of vortex generators at the roof trailing edge.', p: { kind: 'vortex' } },
  { id: 'rf_carbon', name: 'Carbon Roof Skin', price: 1500, style: 4, tier: 1, desc: 'Exposed carbon roof. Lowers the centre of gravity.', weight: -6, p: { kind: 'carbon' } },
  { id: 'rf_spoiler', name: 'Roof Spoiler', price: 600, style: 3, tier: 0, desc: 'Spoiler at the roof edge.', p: { kind: 'spoiler' } },
]);

// ------------------------------------------------------------------ EXHAUST TIPS
add('exhaust', [
  { id: 'stock', name: 'Factory Exhaust', price: 0, style: 0, tier: 0, desc: 'Stock tailpipes.', p: { kind: 'stock' } },
  { id: 'ex_single', name: 'Single Round Tip', price: 200, style: 1, tier: 0, desc: 'One big round tip.', p: { kind: 'single', r: 0.045 } },
  { id: 'ex_dual', name: 'Dual Tips', price: 400, style: 2, tier: 0, desc: 'Two tips on one side.', p: { kind: 'dual', r: 0.04 } },
  { id: 'ex_twin', name: 'Dual Split Tips', price: 550, style: 3, tier: 0, desc: 'One tip each side.', p: { kind: 'twin', r: 0.045 } },
  { id: 'ex_quad', name: 'Quad Tips', price: 800, style: 4, tier: 0, desc: 'Two tips each side.', p: { kind: 'quad', r: 0.038 } },
  { id: 'ex_center', name: 'Centre Exit', price: 900, style: 4, tier: 1, desc: 'Twin tips out of the centre of the bumper.', p: { kind: 'center', r: 0.045 } },
  { id: 'ex_can', name: 'Kanjo Canister', price: 650, style: 4, tier: 0, desc: 'Huge single canister muffler. JDM loud.', p: { kind: 'can', r: 0.07 } },
  { id: 'ex_oval', name: 'Big Oval Tips', price: 600, style: 3, tier: 0, desc: 'Twin wide oval outlets.', p: { kind: 'oval', r: 0.05 } },
  { id: 'ex_hex', name: 'Hex Tips', price: 700, style: 3, tier: 1, desc: 'Hexagonal twin tips.', p: { kind: 'hex', r: 0.045 } },
  { id: 'ex_side', name: 'Side Exit', price: 1100, style: 5, tier: 1, desc: 'Pipes exit ahead of the rear wheels.', p: { kind: 'sideExit', r: 0.04 } },
  { id: 'ex_stack', name: 'Takeyari Stacks', price: 1300, style: 6, tier: 2, desc: 'Ridiculous upward bamboo-spear pipes. Pure bosozoku.', cd: 0.01, p: { kind: 'stack', r: 0.04 } },
]);

// ------------------------------------------------------------------ AERO ADD-ONS
add('splitter', [
  { id: 'none', name: 'None', price: 0, style: 0, tier: 0, desc: 'No splitter.', p: { kind: 'none' } },
  { id: 'spl_carbon', name: 'Carbon Splitter', price: 700, style: 3, tier: 0, desc: 'Flat carbon splitter.', down: 0.03, p: { kind: 'flat', ext: 0.06 } },
  { id: 'spl_alu', name: 'Aluminium Blade', price: 500, style: 2, tier: 0, desc: 'Bare aluminium splitter blade.', down: 0.02, p: { kind: 'flat', ext: 0.04, alu: 1 } },
  { id: 'spl_rods', name: 'Big Splitter + Rods', price: 1300, style: 5, tier: 1, desc: 'Huge splitter with adjustable support rods.', down: 0.06, p: { kind: 'rods', ext: 0.11 } },
]);
add('diffuser', [
  { id: 'none', name: 'None', price: 0, style: 0, tier: 0, desc: 'No diffuser.', p: { kind: 'none' } },
  { id: 'df_small', name: '3-Fin Diffuser', price: 600, style: 2, tier: 0, desc: 'Small three-fin diffuser.', down: 0.02, p: { kind: 'fins', fins: 3 } },
  { id: 'df_big', name: '5-Fin Carbon Diffuser', price: 1300, style: 5, tier: 1, desc: 'Big five-fin carbon diffuser.', down: 0.05, p: { kind: 'fins', fins: 5 } },
  { id: 'df_chute', name: 'Drag Chute Pack', price: 900, style: 4, tier: 1, desc: 'Parachute pack and mount. Mostly for looks under 300 km/h.', p: { kind: 'chute' } },
]);
add('canards', [
  { id: 'none', name: 'None', price: 0, style: 0, tier: 0, desc: 'No canards.', p: { kind: 'none' } },
  { id: 'cn_single', name: 'Single Canards', price: 300, style: 2, tier: 0, desc: 'One pair of dive planes.', down: 0.01, p: { count: 1 } },
  { id: 'cn_double', name: 'Double Canards', price: 500, style: 3, tier: 1, desc: 'Two pairs of dive planes.', down: 0.02, cd: 0.004, p: { count: 2 } },
  { id: 'cn_carbon', name: 'Carbon Dive Planes', price: 700, style: 4, tier: 1, desc: 'Two pairs of carbon dive planes.', down: 0.025, cd: 0.004, p: { count: 2, carbon: 1 } },
]);

export const VISUAL_PARTS = P;

export function visualParts(slot: VisualSlot, model?: CarModel): VisualPart[] {
  return P.filter((p) => p.slot === slot && (!p.brands || !model || p.brands.includes(model.brand)));
}

export function visualPart(slot: VisualSlot, id: string): VisualPart {
  return P.find((p) => p.slot === slot && p.id === id) ?? P.find((p) => p.slot === slot)!;
}

export const VISUAL_SLOT_LABELS: Record<VisualSlot, string> = {
  frontBumper: 'Front Bumper',
  rearBumper: 'Rear Bumper',
  sideSkirts: 'Side Skirts',
  frontFenders: 'Front Fenders',
  rearFenders: 'Rear Fenders',
  hood: 'Hood',
  hoodScoop: 'Hood Scoop',
  spoiler: 'Spoiler',
  mirrors: 'Mirrors',
  headlights: 'Headlights',
  taillights: 'Taillights',
  roof: 'Roof',
  exhaust: 'Exhaust Tips',
  splitter: 'Splitter',
  diffuser: 'Diffuser',
  canards: 'Canards',
};

// ------------------------------------------------------------------ WHEELS
export interface WheelDesign {
  id: string;
  name: string;
  maker: string;
  price: number; // per set at 17"
  style: number;
  tier: number;
  kind: string; // geometry generator
  spokes: number;
  dish: number; // lip depth 0..1
  desc: string;
}

export const WHEEL_DESIGNS: WheelDesign[] = [
  { id: 'oem5', name: 'OEM Five', maker: 'Factory', price: 0, style: 0, tier: 0, kind: 'spoke', spokes: 5, dish: 0.1, desc: 'Plain factory five-spoke.' },
  { id: 'steel', name: 'Steelie', maker: 'Factory', price: 0, style: 0, tier: 0, kind: 'steel', spokes: 0, dish: 0.05, desc: 'Black steel wheel with a hubcap-less centre.' },
  { id: 'mag', name: 'Slot Mag', maker: 'Ironclad Heritage', price: 1100, style: 3, tier: 0, kind: 'slot', spokes: 5, dish: 0.25, desc: 'Classic five-slot mag wheel.' },
  { id: 'kx07', name: 'KX-07', maker: 'Kairo Sport', price: 1400, style: 4, tier: 0, kind: 'split', spokes: 7, dish: 0.15, desc: 'Seven split spokes, light cast construction.' },
  { id: 'wr09', name: 'WR-09', maker: 'Werkhaus R', price: 2200, style: 5, tier: 1, kind: 'spoke', spokes: 9, dish: 0.12, desc: 'Nine thin concave spokes, flow-formed barrel.' },
  { id: 'lattice', name: 'Lattice M10', maker: 'Ostwerk', price: 1900, style: 5, tier: 0, kind: 'mesh', spokes: 10, dish: 0.3, desc: 'Cross-spoke mesh with polished lip.' },
  { id: 'mono5', name: 'Mono-5', maker: 'Ronin Forged', price: 2600, style: 5, tier: 1, kind: 'mono', spokes: 5, dish: 0.08, desc: 'Monoblock forged five-spoke. Thick, light, brutal.' },
  { id: 'deep6', name: 'Deep Six', maker: 'Shiro Wheels', price: 2400, style: 6, tier: 1, kind: 'spoke', spokes: 6, dish: 0.65, desc: 'Six-spoke with a ridiculously deep lip.' },
  { id: 'turbofan', name: 'Turbofan TF-1', maker: 'Aerodisc', price: 2000, style: 5, tier: 1, kind: 'fan', spokes: 12, dish: 0.1, desc: 'Aero disc with fan blades. Very 80s motorsport.' },
  { id: 'strip', name: 'Strip Star', maker: 'Quarter Mile Co.', price: 1700, style: 4, tier: 0, kind: 'star', spokes: 5, dish: 0.2, desc: 'Skinny drag star wheel.' },
  { id: 'twin5', name: 'Twin-5', maker: 'Vortice', price: 1600, style: 4, tier: 0, kind: 'twin', spokes: 5, dish: 0.15, desc: 'Five double spokes.' },
  { id: 'hydra', name: 'Hydra Y-10', maker: 'Vortice', price: 2100, style: 5, tier: 1, kind: 'y', spokes: 5, dish: 0.15, desc: 'Y-split spokes.' },
  { id: 'cyclone', name: 'Cyclone', maker: 'Aerodisc', price: 2300, style: 6, tier: 1, kind: 'spiral', spokes: 6, dish: 0.12, desc: 'Directional spiral spokes.' },
  { id: 'gravel6', name: 'Gravel Six', maker: 'Rally Tech', price: 1300, style: 4, tier: 0, kind: 'mono', spokes: 6, dish: 0.05, desc: 'Strong six-spoke rally wheel.' },
  { id: 'blade20', name: 'Blade 20', maker: 'Ostwerk', price: 3200, style: 7, tier: 2, kind: 'spoke', spokes: 20, dish: 0.2, desc: 'Twenty razor spokes. Show-car only.' },
];

export interface WheelFinish { id: string; name: string; color: string; metal: number; rough: number; lip?: string }
export const WHEEL_FINISHES: WheelFinish[] = [
  { id: 'silver', name: 'Silver', color: '#c9ccd1', metal: 0.9, rough: 0.3 },
  { id: 'gunmetal', name: 'Gunmetal', color: '#4a4e55', metal: 0.85, rough: 0.35 },
  { id: 'black', name: 'Gloss Black', color: '#111214', metal: 0.4, rough: 0.15 },
  { id: 'satin', name: 'Satin Black', color: '#17181a', metal: 0.3, rough: 0.55 },
  { id: 'bronze', name: 'Bronze', color: '#9a6a32', metal: 0.85, rough: 0.35 },
  { id: 'darkbronze', name: 'Dark Bronze', color: '#5b3f22', metal: 0.85, rough: 0.4 },
  { id: 'gold', name: 'Gold', color: '#c9a03a', metal: 0.95, rough: 0.25 },
  { id: 'white', name: 'White', color: '#eceef0', metal: 0.1, rough: 0.3 },
  { id: 'chrome', name: 'Chrome', color: '#f2f4f7', metal: 1.0, rough: 0.04 },
  { id: 'polishedlip', name: 'Black / Polished Lip', color: '#141518', metal: 0.5, rough: 0.25, lip: '#e6e8ec' },
  { id: 'painted', name: 'Custom Paint', color: '#ffffff', metal: 0.4, rough: 0.3 },
];

export function wheelPrice(design: WheelDesign, size: number): number {
  if (design.price === 0) return 0;
  return Math.round((design.price * (1 + (size - 17) * 0.14)) / 10) * 10;
}

export const EXHAUST_FINISHES = [
  { id: 'chrome', name: 'Chrome', color: '#e9ecf0' },
  { id: 'titanium', name: 'Burnt Titanium', color: '#6b5fa8' },
  { id: 'black', name: 'Black Ceramic', color: '#1a1b1e' },
  { id: 'carbon', name: 'Carbon Sleeve', color: '#222' },
  { id: 'polished', name: 'Polished Steel', color: '#b9bec6' },
];
