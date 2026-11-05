import type { EngineSpec } from '../core/types';

// All engine codes are fictional. Factory figures are plausible for their era.
const list: EngineSpec[] = [
  // ---------------- KAIRO ----------------
  {
    id: 'kr20dt', name: 'KR20-DT', brand: 'kairo', layout: 'I4', cylinders: 4, displacement: 2.0, aspiration: 'turbo',
    powerHp: 205, powerRpm: 6200, torqueNm: 265, torqueRpm: 4000, redline: 7200, idle: 850, stockBoost: 0.55,
    weight: 145, swapPrice: 4200,
    description: '2.0 L DOHC 16-valve turbo four. Iron block, forged crank from the factory — the tuner favourite.',
  },
  {
    id: 'kr20det', name: 'KR20-DET', brand: 'kairo', layout: 'I4', cylinders: 4, displacement: 2.0, aspiration: 'turbo',
    powerHp: 220, powerRpm: 6400, torqueNm: 280, torqueRpm: 4400, redline: 7400, idle: 850, stockBoost: 0.6,
    weight: 148, swapPrice: 4800,
    description: 'Revised KR20 with ball-bearing turbo and variable cam timing on the intake side.',
  },
  {
    id: 'kr23vt', name: 'KR23-VT', brand: 'kairo', layout: 'I4', cylinders: 4, displacement: 2.3, aspiration: 'turbo',
    powerHp: 300, powerRpm: 6800, torqueNm: 380, torqueRpm: 4600, redline: 7600, idle: 900, stockBoost: 1.0,
    weight: 152, swapPrice: 9500,
    description: 'Flagship 2.3 L closed-deck turbo four with twin-scroll turbo. Kairo\'s answer to the sixes.',
  },
  // ---------------- MIZUNO ----------------
  {
    id: 'mz16v', name: 'MZ16-V', brand: 'mizuno', layout: 'I4', cylinders: 4, displacement: 1.6, aspiration: 'NA',
    powerHp: 160, powerRpm: 7800, torqueNm: 160, torqueRpm: 6500, redline: 8400, idle: 900, stockBoost: 0,
    weight: 115, swapPrice: 2600,
    description: '1.6 L high-compression DOHC with two-stage variable valve lift. Screams to 8,400 rpm.',
  },
  {
    id: 'mz18vr', name: 'MZ18-VR', brand: 'mizuno', layout: 'I4', cylinders: 4, displacement: 1.8, aspiration: 'NA',
    powerHp: 175, powerRpm: 8000, torqueNm: 182, torqueRpm: 6800, redline: 8600, idle: 900, stockBoost: 0,
    weight: 118, swapPrice: 3400,
    description: 'Hand-ported 1.8 L from the MX-3 Type-R. Individual throttle bodies on race versions.',
  },
  {
    id: 'mz20t', name: 'MZ20-T', brand: 'mizuno', layout: 'I4', cylinders: 4, displacement: 2.0, aspiration: 'turbo',
    powerHp: 265, powerRpm: 6500, torqueNm: 340, torqueRpm: 4000, redline: 7500, idle: 850, stockBoost: 0.95,
    weight: 140, swapPrice: 6800,
    description: 'Rally-bred 2.0 L turbo with anti-lag-ready manifold. Built for the AWD Arashi.',
  },
  // ---------------- TAKEDA ----------------
  {
    id: 'tk26tt', name: 'TK26-TT', brand: 'takeda', layout: 'I6', cylinders: 6, displacement: 2.6, aspiration: 'twinturbo',
    powerHp: 330, powerRpm: 6800, torqueNm: 390, torqueRpm: 4400, redline: 8000, idle: 800, stockBoost: 0.8,
    weight: 225, swapPrice: 14000,
    description: '2.6 L twin-turbo straight six. Officially 280 hp, actually much more. Legendary bottom end.',
  },
  {
    id: 'tk30t', name: 'TK30-T', brand: 'takeda', layout: 'I6', cylinders: 6, displacement: 3.0, aspiration: 'turbo',
    powerHp: 280, powerRpm: 5800, torqueNm: 420, torqueRpm: 3600, redline: 7000, idle: 750, stockBoost: 0.6,
    weight: 235, swapPrice: 9800,
    description: '3.0 L single-turbo six from the Shogun sedan. Torque everywhere, iron block, unbreakable.',
  },
  {
    id: 'tk30n', name: 'TK30-N', brand: 'takeda', layout: 'I6', cylinders: 6, displacement: 3.0, aspiration: 'NA',
    powerHp: 230, powerRpm: 6000, torqueNm: 290, torqueRpm: 4600, redline: 7000, idle: 750, stockBoost: 0,
    weight: 220, swapPrice: 5200,
    description: 'Naturally aspirated 3.0 L six. Silky, simple and ready for boost.',
  },
  // ---------------- WERKHAUS ----------------
  {
    id: 'wh32n', name: 'W32 R6', brand: 'werkhaus', layout: 'I6', cylinders: 6, displacement: 3.2, aspiration: 'NA',
    powerHp: 240, powerRpm: 6200, torqueNm: 310, torqueRpm: 4300, redline: 7000, idle: 750, stockBoost: 0,
    weight: 215, swapPrice: 6500,
    description: 'Werkhaus 3.2 L inline-six with double-VANOS-style cam phasing. Precise and rev-happy.',
  },
  {
    id: 'wh32tt', name: 'W32-TT', brand: 'werkhaus', layout: 'I6', cylinders: 6, displacement: 3.2, aspiration: 'twinturbo',
    powerHp: 320, powerRpm: 6000, torqueNm: 420, torqueRpm: 3500, redline: 7000, idle: 750, stockBoost: 0.7,
    weight: 230, swapPrice: 13500,
    description: 'Twin-turbo 3.2 L six from the Strasse R. Forged internals, closed deck. Built for 600+.',
  },
  {
    id: 'wh44v8', name: 'W44 V8', brand: 'werkhaus', layout: 'V8', cylinders: 8, displacement: 4.4, aspiration: 'NA',
    powerHp: 400, powerRpm: 7200, torqueNm: 470, torqueRpm: 4800, redline: 7800, idle: 750, stockBoost: 0,
    weight: 245, swapPrice: 16500,
    description: 'High-revving 4.4 L quad-cam V8 with individual throttle bodies. The W8\'s heart.',
  },
  // ---------------- BELLADONNA ----------------
  {
    id: 'bd30v6', name: 'BD-V6 3.0', brand: 'belladonna', layout: 'V6', cylinders: 6, displacement: 3.0, aspiration: 'NA',
    powerHp: 290, powerRpm: 7000, torqueNm: 310, torqueRpm: 5000, redline: 7600, idle: 900, stockBoost: 0,
    weight: 190, swapPrice: 12000,
    description: 'Hand-built 60° V6 with titanium rods. Sings above 6,000 rpm.',
  },
  {
    id: 'bd36v8', name: 'BD-V8 3.6', brand: 'belladonna', layout: 'V8', cylinders: 8, displacement: 3.6, aspiration: 'NA',
    powerHp: 400, powerRpm: 8000, torqueNm: 380, torqueRpm: 5600, redline: 8600, idle: 950, stockBoost: 0,
    weight: 205, swapPrice: 21000,
    description: 'Flat-plane-crank 3.6 L V8 derived from the Corsa sports-prototype programme.',
  },
  {
    id: 'bd42v8', name: 'BD-V8 4.2', brand: 'belladonna', layout: 'V8', cylinders: 8, displacement: 4.2, aspiration: 'NA',
    powerHp: 500, powerRpm: 8200, torqueNm: 470, torqueRpm: 5800, redline: 8800, idle: 950, stockBoost: 0,
    weight: 215, swapPrice: 32000,
    description: 'Dry-sump 4.2 L flat-plane V8. 119 hp per litre without a turbo in sight.',
  },
  // ---------------- IRONCLAD ----------------
  {
    id: 'ic50v8', name: 'IC 302', brand: 'ironclad', layout: 'V8', cylinders: 8, displacement: 5.0, aspiration: 'NA',
    powerHp: 240, powerRpm: 4800, torqueNm: 410, torqueRpm: 3200, redline: 6000, idle: 700, stockBoost: 0,
    weight: 210, swapPrice: 3200,
    description: '5.0 L pushrod V8. Cheap, everywhere, and takes a supercharger like it was born with one.',
  },
  {
    id: 'ic70v8', name: 'IC 427 Hammerhead', brand: 'ironclad', layout: 'V8', cylinders: 8, displacement: 7.0, aspiration: 'NA',
    powerHp: 375, powerRpm: 5400, torqueNm: 610, torqueRpm: 3600, redline: 6200, idle: 700, stockBoost: 0,
    weight: 275, swapPrice: 11000,
    description: 'Big-block 7.0 L from 1970. Solid lifters, cross-ram intake, no apologies.',
  },
  {
    id: 'ic54sc', name: 'IC 5.4 Supercharged', brand: 'ironclad', layout: 'V8', cylinders: 8, displacement: 5.4, aspiration: 'supercharged',
    powerHp: 450, powerRpm: 6000, torqueNm: 600, torqueRpm: 4200, redline: 6500, idle: 750, stockBoost: 0.6,
    weight: 260, swapPrice: 15500,
    description: 'Four-valve 5.4 L V8 with factory twin-screw blower. The Viperock\'s snarl.',
  },
  // ---------------- APEX ----------------
  {
    id: 'ax20n', name: 'AX20', brand: 'apex', layout: 'I4', cylinders: 4, displacement: 2.0, aspiration: 'NA',
    powerHp: 140, powerRpm: 6000, torqueNm: 180, torqueRpm: 4400, redline: 6800, idle: 850, stockBoost: 0,
    weight: 120, swapPrice: 1600,
    description: 'Economy 2.0 L SOHC. Unremarkable, until someone bolts a turbo to it.',
  },
  {
    id: 'ax20t', name: 'AX20-T', brand: 'apex', layout: 'I4', cylinders: 4, displacement: 2.0, aspiration: 'turbo',
    powerHp: 205, powerRpm: 6000, torqueNm: 270, torqueRpm: 3800, redline: 7000, idle: 850, stockBoost: 0.75,
    weight: 132, swapPrice: 3600,
    description: '2.0 L turbo four with forged rods. Apex sells a dealer Stage 2 kit for it.',
  },
  {
    id: 'ax24t', name: 'AX24-T', brand: 'apex', layout: 'I4', cylinders: 4, displacement: 2.4, aspiration: 'turbo',
    powerHp: 260, powerRpm: 6000, torqueNm: 340, torqueRpm: 3600, redline: 6900, idle: 850, stockBoost: 0.85,
    weight: 140, swapPrice: 5800,
    description: '2.4 L long-stroke turbo four from the Sprint. Fat midrange, AWD-rated gearbox.',
  },
];

export const ENGINES: Record<string, EngineSpec> = Object.fromEntries(list.map((e) => [e.id, e]));
export const ENGINE_LIST = list;
