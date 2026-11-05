import type { CarModel, ShapeParams } from '../core/types';
import { BRANDS } from './brands';

const BASE_SHAPE: ShapeParams = {
  noseH: 0.62, hoodH: 0.86, roofH: 1.29, deckH: 0.96, tailH: 0.92,
  beltF: 0.74, beltR: 0.9, sill: 0.17,
  wsBase: 0.38, roofStart: 0.53, roofEnd: 0.68, rearGlassBase: 0.84, sideWindowEnd: 0.76, bPillar: 0,
  noseRound: 0.076, tailRound: 0.06, frontTaper: 0.725, rearTaper: 0.852, tumble: 0.78,
  roofCrown: 0.050, hoodCrown: 0.04, fenderF: 0.015, fenderR: 0.025, shoulder: 0.5, noseDrop: 0.6, wedge: 0.3,
  headlight: 'dualRound', taillight: 'threeSegment', grille: 'smallRect', hoodVents: false, stockExhaust: 'single',
  lightMount: 'corner', blackPillars: true,
};

const s = (o: Partial<ShapeParams>): ShapeParams => ({ ...BASE_SHAPE, ...o });

const models: CarModel[] = [
  // ======================= KAIRO =======================
  {
    id: 'kairo_kestrel', brand: 'kairo', name: 'Kestrel', trim: '2.0T', year: 1998, price: 14500, body: 'coupe',
    drivetrain: 'RWD', engineId: 'kr20dt', weight: 1260, weightFront: 0.54, cgHeight: 0.48,
    length: 4.38, width: 1.72, height: 1.29, wheelbase: 2.5, frontOverhang: 0.88,
    stockWheelSize: 16, stockTireWidth: 205, stockTireProfile: 55,
    gears: [3.32, 1.9, 1.31, 1.0, 0.76], finalDrive: 4.1, cd: 0.32, frontalArea: 1.88,
    shape: s({
      noseH: 0.6, hoodH: 0.86, roofH: 1.29, deckH: 0.97, tailH: 0.93, beltF: 0.72, beltR: 0.91,
      wsBase: 0.398, roofStart: 0.520, roofEnd: 0.730, rearGlassBase: 0.86, sideWindowEnd: 0.780,
      roofCrown: 0.050, tumble: 0.76, fenderF: 0.02, fenderR: 0.03,
      headlight: 'dualRound', taillight: 'threeSegment', grille: 'smallRect', stockExhaust: 'single',
    }),
    description:
      'A compact 1998 coupe with a long hood, short deck and a rounded roofline. Light, simple, RWD and boost-hungry — ' +
      'the KR20-DT has a forged crank from the factory. Every scene has one.',
    stockPaint: '#d9dbe0', tags: ['jdm', 'starter', 'tutorial'],
  },
  {
    id: 'kairo_s14', brand: 'kairo', name: 'S14', trim: 'Type-K', year: 1995, price: 16500, body: 'notchback',
    drivetrain: 'RWD', engineId: 'kr20det', weight: 1240, weightFront: 0.55, cgHeight: 0.48,
    length: 4.5, width: 1.73, height: 1.29, wheelbase: 2.53, frontOverhang: 0.92,
    stockWheelSize: 16, stockTireWidth: 205, stockTireProfile: 55,
    gears: [3.32, 1.9, 1.31, 1.0, 0.76], finalDrive: 4.08, cd: 0.31, frontalArea: 1.9,
    shape: s({
      noseH: 0.6, hoodH: 0.85, roofH: 1.29, deckH: 0.99, tailH: 0.97, beltF: 0.73, beltR: 0.93,
      wsBase: 0.368, roofStart: 0.490, roofEnd: 0.700, rearGlassBase: 0.79, sideWindowEnd: 0.750,
      frontTaper: 0.748, noseRound: 0.068, tumble: 0.8, roofCrown: 0.045, shoulder: 0.75,
      headlight: 'slimRect', taillight: 'wrap', grille: 'slot', stockExhaust: 'single',
    }),
    description:
      'Crisp three-box sport coupe with slim headlights and a flat trunk. The S14 is the drift crowd\'s weapon: ' +
      'balanced, rigid and backed by the strongest aftermarket in the city.',
    stockPaint: '#7b1d24', tags: ['jdm', 'starter'],
  },
  {
    id: 'kairo_rz9', brand: 'kairo', name: 'RZ-9', trim: 'Spec-R', year: 2002, price: 34000, body: 'fastback',
    drivetrain: 'RWD', engineId: 'kr23vt', weight: 1310, weightFront: 0.52, cgHeight: 0.46,
    length: 4.42, width: 1.78, height: 1.27, wheelbase: 2.57, frontOverhang: 0.86,
    stockWheelSize: 17, stockTireWidth: 235, stockTireProfile: 45,
    gears: [3.63, 2.19, 1.54, 1.21, 1.0, 0.79], finalDrive: 3.9, cd: 0.3, frontalArea: 1.9,
    shape: s({
      noseH: 0.56, hoodH: 0.83, roofH: 1.27, deckH: 1.0, tailH: 0.99, beltF: 0.7, beltR: 0.95,
      wsBase: 0.358, roofStart: 0.480, roofEnd: 0.670, rearGlassBase: 0.87, sideWindowEnd: 0.720,
      wedge: 0.7, frontTaper: 0.703, noseRound: 0.085, tumble: 0.74, fenderF: 0.03, fenderR: 0.04, shoulder: 0.8,
      headlight: 'trapezoid', taillight: 'split', grille: 'slot', stockExhaust: 'dual',
    }),
    description:
      'Kairo\'s 2002 flagship: a wedge-shaped fastback built around the closed-deck KR23-VT. Twin-scroll turbo, ' +
      'six-speed, factory LSD. The poster car of a generation.',
    stockPaint: '#e0b321', tags: ['jdm'],
  },
  // ======================= MIZUNO =======================
  {
    id: 'mizuno_pulse', brand: 'mizuno', name: 'Pulse', trim: 'VR', year: 1999, price: 9500, body: 'hatch',
    drivetrain: 'FWD', engineId: 'mz16v', weight: 1050, weightFront: 0.62, cgHeight: 0.5,
    length: 4.1, width: 1.7, height: 1.36, wheelbase: 2.57, frontOverhang: 0.85,
    stockWheelSize: 15, stockTireWidth: 195, stockTireProfile: 55,
    gears: [3.23, 1.9, 1.27, 0.97, 0.78], finalDrive: 4.4, cd: 0.33, frontalArea: 1.95,
    shape: s({
      noseH: 0.62, hoodH: 0.9, roofH: 1.36, deckH: 1.06, tailH: 0.98, beltF: 0.78, beltR: 0.95,
      wsBase: 0.298, roofStart: 0.450, roofEnd: 0.820, rearGlassBase: 0.97, sideWindowEnd: 0.860, bPillar: 0.62,
      frontTaper: 0.748, rearTaper: 0.907, tailRound: 0.04, tumble: 0.8, roofCrown: 0.040,
      headlight: 'wideBar', taillight: 'vertical', grille: 'smile', stockExhaust: 'single',
    }),
    description:
      'Featherweight three-door hatch with a screaming 1.6 L VTEC-style four. 8,400 rpm, 1,050 kg, and a chassis that ' +
      'makes people forget it is front-wheel drive.',
    stockPaint: '#1f8fd8', tags: ['jdm', 'starter', 'cheap'],
  },
  {
    id: 'mizuno_mx3', brand: 'mizuno', name: 'MX-3', trim: 'Type-R', year: 1996, price: 12500, body: 'coupe',
    drivetrain: 'RWD', engineId: 'mz18vr', weight: 1080, weightFront: 0.51, cgHeight: 0.45,
    length: 4.05, width: 1.69, height: 1.24, wheelbase: 2.32, frontOverhang: 0.82,
    stockWheelSize: 15, stockTireWidth: 195, stockTireProfile: 50,
    gears: [3.14, 1.89, 1.33, 1.0, 0.81], finalDrive: 4.3, cd: 0.34, frontalArea: 1.75,
    shape: s({
      noseH: 0.58, hoodH: 0.82, roofH: 1.24, deckH: 0.93, tailH: 0.9, beltF: 0.7, beltR: 0.87,
      wsBase: 0.408, roofStart: 0.520, roofEnd: 0.680, rearGlassBase: 0.77, sideWindowEnd: 0.715,
      noseRound: 0.093, frontTaper: 0.68, rearTaper: 0.844, tumble: 0.72, roofCrown: 0.050, fenderF: 0.03, fenderR: 0.04,
      shoulder: 0.25,
      headlight: 'teardrop', taillight: 'roundQuad', grille: 'smile', stockExhaust: 'dual',
    }),
    description:
      'Tiny, rounded, short-wheelbase RWD coupe with a hand-ported 1.8 L. Not much power, almost no weight. ' +
      'A momentum car that rewards perfect shifts.',
    stockPaint: '#c21f2c', tags: ['jdm', 'starter'],
  },
  {
    id: 'mizuno_arashi', brand: 'mizuno', name: 'Arashi', trim: 'WRT', year: 2001, price: 27000, body: 'sedan',
    drivetrain: 'AWD', engineId: 'mz20t', weight: 1340, weightFront: 0.58, cgHeight: 0.52,
    length: 4.4, width: 1.74, height: 1.42, wheelbase: 2.52, frontOverhang: 0.92,
    stockWheelSize: 17, stockTireWidth: 225, stockTireProfile: 45,
    gears: [3.45, 2.06, 1.47, 1.13, 0.91, 0.72], finalDrive: 4.1, cd: 0.33, frontalArea: 2.05,
    shape: s({
      noseH: 0.64, hoodH: 0.92, roofH: 1.42, deckH: 1.04, tailH: 1.01, beltF: 0.8, beltR: 0.98,
      wsBase: 0.328, roofStart: 0.460, roofEnd: 0.730, rearGlassBase: 0.8, sideWindowEnd: 0.780, bPillar: 0.55,
      frontTaper: 0.77, noseRound: 0.06, tumble: 0.82, roofCrown: 0.040, fenderF: 0.035, fenderR: 0.035,
      headlight: 'slimRect', taillight: 'boxy', grille: 'slot', hoodVents: true, stockExhaust: 'single',
    }),
    description:
      'Rally homologation sedan with AWD, a top-mount intercooler and a rally-bred 2.0 turbo. Launches like it was ' +
      'fired from a cannon — the weight is the only enemy.',
    stockPaint: '#1b3d8f', tags: ['jdm', 'awd'],
  },
  // ======================= TAKEDA =======================
  {
    id: 'takeda_gtrs', brand: 'takeda', name: 'GT-RS', trim: 'V-Spec', year: 2000, price: 48000, body: 'notchback',
    drivetrain: 'AWD', engineId: 'tk26tt', weight: 1540, weightFront: 0.56, cgHeight: 0.5,
    length: 4.6, width: 1.79, height: 1.36, wheelbase: 2.66, frontOverhang: 0.95,
    stockWheelSize: 18, stockTireWidth: 245, stockTireProfile: 40,
    gears: [3.83, 2.36, 1.69, 1.31, 1.0, 0.79], finalDrive: 3.55, cd: 0.34, frontalArea: 2.1,
    shape: s({
      noseH: 0.62, hoodH: 0.9, roofH: 1.36, deckH: 1.03, tailH: 1.02, beltF: 0.77, beltR: 0.97,
      wsBase: 0.358, roofStart: 0.480, roofEnd: 0.710, rearGlassBase: 0.81, sideWindowEnd: 0.760,
      frontTaper: 0.779, rearTaper: 0.894, noseRound: 0.06, tumble: 0.8, roofCrown: 0.045, fenderF: 0.04, fenderR: 0.05,
      shoulder: 0.85,
      headlight: 'trapezoid', taillight: 'roundQuad', grille: 'barGrille', stockExhaust: 'single', hoodVents: true,
    }),
    description:
      'The "bullet": a heavy, square-shouldered AWD coupe with a twin-turbo 2.6 L six and four round taillights. ' +
      'Officially 280 hp. Nobody believes that.',
    stockPaint: '#5c6773', tags: ['jdm', 'awd'],
  },
  {
    id: 'takeda_shogun', brand: 'takeda', name: 'Shogun', trim: '3.0 Turbo', year: 1997, price: 26000, body: 'sedan',
    drivetrain: 'RWD', engineId: 'tk30t', weight: 1590, weightFront: 0.53, cgHeight: 0.53,
    length: 4.9, width: 1.8, height: 1.42, wheelbase: 2.85, frontOverhang: 0.95,
    stockWheelSize: 17, stockTireWidth: 225, stockTireProfile: 50,
    gears: [3.25, 1.96, 1.31, 1.0, 0.75], finalDrive: 3.73, cd: 0.3, frontalArea: 2.15,
    shape: s({
      noseH: 0.66, hoodH: 0.92, roofH: 1.42, deckH: 1.05, tailH: 1.02, beltF: 0.8, beltR: 0.98,
      wsBase: 0.318, roofStart: 0.430, roofEnd: 0.700, rearGlassBase: 0.78, sideWindowEnd: 0.750, bPillar: 0.55,
      frontTaper: 0.815, rearTaper: 0.907, noseRound: 0.051, tailRound: 0.05, tumble: 0.82, roofCrown: 0.040, shoulder: 0.7,
      headlight: 'wideBar', taillight: 'fullBar', grille: 'barGrille', stockExhaust: 'dual', blackPillars: false,
    }),
    description:
      'Long-wheelbase executive sedan hiding a 3.0 L turbo six. The VIP crowd lowers it on air, the drag crowd ' +
      'throws a big single turbo at it. Both are right.',
    stockPaint: '#1c1c22', tags: ['jdm', 'sedan', 'vip'],
  },
  {
    id: 'takeda_tsx', brand: 'takeda', name: 'TSX', trim: '3.0', year: 1993, price: 15500, body: 'fastback',
    drivetrain: 'RWD', engineId: 'tk30n', weight: 1450, weightFront: 0.54, cgHeight: 0.48,
    length: 4.55, width: 1.79, height: 1.3, wheelbase: 2.45, frontOverhang: 0.98,
    stockWheelSize: 16, stockTireWidth: 225, stockTireProfile: 50,
    gears: [3.32, 1.9, 1.3, 1.0, 0.75], finalDrive: 3.9, cd: 0.31, frontalArea: 2.0,
    shape: s({
      noseH: 0.58, hoodH: 0.84, roofH: 1.3, deckH: 0.97, tailH: 0.95, beltF: 0.72, beltR: 0.9,
      wsBase: 0.358, roofStart: 0.470, roofEnd: 0.650, rearGlassBase: 0.9, sideWindowEnd: 0.700,
      frontTaper: 0.725, rearTaper: 0.878, noseRound: 0.085, tumble: 0.74, roofCrown: 0.050, fenderF: 0.025, fenderR: 0.04,
      shoulder: 0.35,
      headlight: 'wideBar', taillight: 'fullBar', grille: 'barGrille', stockExhaust: 'dual',
    }),
    description:
      'A smooth early-90s 2+2 grand tourer with a sweeping glass hatch. The naturally aspirated six is the perfect ' +
      'turbo candidate; the long wheelbase keeps it straight at 250 km/h.',
    stockPaint: '#2f5d3a', tags: ['jdm', 'gt'],
  },
  // ======================= WERKHAUS =======================
  {
    id: 'werkhaus_320t', brand: 'werkhaus', name: '320T', trim: 'Sport', year: 1996, price: 17000, body: 'sedan',
    drivetrain: 'RWD', engineId: 'wh32n', weight: 1420, weightFront: 0.51, cgHeight: 0.5,
    length: 4.45, width: 1.71, height: 1.4, wheelbase: 2.7, frontOverhang: 0.8,
    stockWheelSize: 16, stockTireWidth: 205, stockTireProfile: 55,
    gears: [4.2, 2.49, 1.66, 1.24, 1.0], finalDrive: 3.15, cd: 0.31, frontalArea: 2.0,
    shape: s({
      noseH: 0.66, hoodH: 0.9, roofH: 1.4, deckH: 1.04, tailH: 1.01, beltF: 0.8, beltR: 0.96,
      wsBase: 0.328, roofStart: 0.450, roofEnd: 0.720, rearGlassBase: 0.79, sideWindowEnd: 0.770, bPillar: 0.54,
      frontTaper: 0.806, rearTaper: 0.903, noseRound: 0.051, tailRound: 0.05, tumble: 0.82, roofCrown: 0.040, shoulder: 0.8,
      headlight: 'dualOval', taillight: 'split', grille: 'largeTwinIntake', stockExhaust: 'dual', blackPillars: true,
    }),
    description:
      'Compact four-door with a silky naturally aspirated 3.2 L six and perfect 51/49 balance. The sensible German ' +
      'sedan your uncle drives — until it isn\'t.',
    stockPaint: '#8c949c', tags: ['euro', 'sedan', 'starter'],
  },
  {
    id: 'werkhaus_w8', brand: 'werkhaus', name: 'W8', trim: '4.4', year: 2003, price: 62000, body: 'notchback',
    drivetrain: 'RWD', engineId: 'wh44v8', weight: 1640, weightFront: 0.52, cgHeight: 0.5,
    length: 4.7, width: 1.83, height: 1.33, wheelbase: 2.73, frontOverhang: 0.9,
    stockWheelSize: 18, stockTireWidth: 245, stockTireProfile: 40,
    gears: [4.06, 2.4, 1.58, 1.19, 1.0, 0.87], finalDrive: 3.46, cd: 0.32, frontalArea: 2.15,
    shape: s({
      noseH: 0.62, hoodH: 0.88, roofH: 1.33, deckH: 1.02, tailH: 1.0, beltF: 0.76, beltR: 0.95,
      wsBase: 0.388, roofStart: 0.510, roofEnd: 0.720, rearGlassBase: 0.82, sideWindowEnd: 0.770,
      frontTaper: 0.779, rearTaper: 0.886, noseRound: 0.06, tumble: 0.78, roofCrown: 0.050, fenderF: 0.03, fenderR: 0.04,
      shoulder: 0.7, hoodVents: true,
      headlight: 'dualOval', taillight: 'triangle', grille: 'largeTwinIntake', stockExhaust: 'quad',
    }),
    description:
      'Big, wide grand tourer with an 8,000 rpm quad-cam V8 and a cabin full of leather. Heavy, but the engine ' +
      'makes the weight feel like an opinion.',
    stockPaint: '#23364f', tags: ['euro', 'gt'],
  },
  {
    id: 'werkhaus_strasse', brand: 'werkhaus', name: 'Strasse', trim: '600R', year: 2001, price: 45000, body: 'notchback',
    drivetrain: 'RWD', engineId: 'wh32tt', weight: 1480, weightFront: 0.52, cgHeight: 0.49,
    length: 4.5, width: 1.8, height: 1.32, wheelbase: 2.69, frontOverhang: 0.86,
    stockWheelSize: 18, stockTireWidth: 235, stockTireProfile: 40,
    gears: [4.23, 2.53, 1.67, 1.23, 1.0, 0.83], finalDrive: 3.15, cd: 0.32, frontalArea: 2.05,
    shape: s({
      noseH: 0.6, hoodH: 0.86, roofH: 1.32, deckH: 1.0, tailH: 0.98, beltF: 0.74, beltR: 0.94,
      wsBase: 0.418, roofStart: 0.530, roofEnd: 0.730, rearGlassBase: 0.84, sideWindowEnd: 0.780,
      frontTaper: 0.77, rearTaper: 0.894, noseRound: 0.068, tumble: 0.76, roofCrown: 0.050, fenderF: 0.025, fenderR: 0.06,
      shoulder: 0.75, hoodVents: true,
      headlight: 'dualOval', taillight: 'triangle', grille: 'largeTwinIntake', stockExhaust: 'quad',
    }),
    description:
      'A sophisticated grand-touring coupe: long hood, muscular rear haunches, vented bonnet and quad exhausts. ' +
      'The 600R has a forged twin-turbo six built to handle twice its factory boost.',
    stockPaint: '#3a3d42', tags: ['euro', 'gt', 'rival'],
  },
  // ======================= BELLADONNA =======================
  {
    id: 'belladonna_veloce', brand: 'belladonna', name: 'Veloce', trim: 'V6', year: 1994, price: 55000, body: 'midengine',
    drivetrain: 'RWD', engineId: 'bd30v6', weight: 1350, weightFront: 0.42, cgHeight: 0.44,
    length: 4.25, width: 1.81, height: 1.17, wheelbase: 2.45, frontOverhang: 0.95,
    stockWheelSize: 17, stockTireWidth: 225, stockTireProfile: 45,
    gears: [3.21, 2.11, 1.46, 1.09, 0.86], finalDrive: 4.06, cd: 0.33, frontalArea: 1.85,
    shape: s({
      noseH: 0.56, hoodH: 0.8, roofH: 1.17, deckH: 0.96, tailH: 0.93, beltF: 0.68, beltR: 0.92, sill: 0.14,
      wsBase: 0.268, roofStart: 0.410, roofEnd: 0.600, rearGlassBase: 0.69, sideWindowEnd: 0.635,
      frontTaper: 0.703, rearTaper: 0.886, noseRound: 0.102, tumble: 0.7, roofCrown: 0.050, fenderF: 0.03, fenderR: 0.06,
      shoulder: 0.6, wedge: 0.6,
      headlight: 'slimRect', taillight: 'boxy', grille: 'exoticMouth', stockExhaust: 'dual',
    }),
    description:
      'A wedge-era mid-engine coupe with a hand-built V6 behind your ears. Fragile, beautiful, and the cheapest way ' +
      'into an Italian exotic.',
    stockPaint: '#c4161c', tags: ['euro', 'exotic'],
  },
  {
    id: 'belladonna_corsa8', brand: 'belladonna', name: 'Corsa 8', trim: '3.6', year: 1999, price: 95000, body: 'midengine',
    drivetrain: 'RWD', engineId: 'bd36v8', weight: 1390, weightFront: 0.42, cgHeight: 0.44,
    length: 4.4, width: 1.92, height: 1.16, wheelbase: 2.6, frontOverhang: 1.0,
    stockWheelSize: 18, stockTireWidth: 255, stockTireProfile: 40,
    gears: [3.15, 2.18, 1.62, 1.26, 1.03, 0.84], finalDrive: 4.1, cd: 0.34, frontalArea: 1.9,
    shape: s({
      noseH: 0.54, hoodH: 0.79, roofH: 1.16, deckH: 0.98, tailH: 0.95, beltF: 0.66, beltR: 0.94, sill: 0.13,
      wsBase: 0.258, roofStart: 0.400, roofEnd: 0.590, rearGlassBase: 0.72, sideWindowEnd: 0.635,
      frontTaper: 0.689, rearTaper: 0.907, noseRound: 0.111, tumble: 0.66, roofCrown: 0.050, fenderF: 0.045, fenderR: 0.08,
      shoulder: 0.4,
      headlight: 'teardrop', taillight: 'roundQuad', grille: 'exoticMouth', stockExhaust: 'quad',
    }),
    description:
      'Flat-plane V8, curvy haunches and four round taillights. The Corsa 8 is the poster on every bedroom wall in ' +
      'the scene. It drags surprisingly well once it hooks.',
    stockPaint: '#e8c21b', tags: ['euro', 'exotic'],
  },
  {
    id: 'belladonna_tempesta', brand: 'belladonna', name: 'Tempesta', trim: '4.2', year: 2003, price: 160000, body: 'midengine',
    drivetrain: 'RWD', engineId: 'bd42v8', weight: 1420, weightFront: 0.41, cgHeight: 0.43,
    length: 4.5, width: 1.95, height: 1.15, wheelbase: 2.65, frontOverhang: 1.02,
    stockWheelSize: 19, stockTireWidth: 265, stockTireProfile: 35,
    gears: [3.08, 2.13, 1.63, 1.3, 1.07, 0.88], finalDrive: 4.3, cd: 0.35, frontalArea: 1.95,
    shape: s({
      noseH: 0.52, hoodH: 0.78, roofH: 1.15, deckH: 0.99, tailH: 0.97, beltF: 0.65, beltR: 0.96, sill: 0.12,
      wsBase: 0.258, roofStart: 0.410, roofEnd: 0.590, rearGlassBase: 0.73, sideWindowEnd: 0.635,
      frontTaper: 0.68, rearTaper: 0.911, noseRound: 0.102, tumble: 0.66, roofCrown: 0.050, fenderF: 0.05, fenderR: 0.09,
      shoulder: 0.8, wedge: 0.5, hoodVents: true,
      headlight: 'teardrop', taillight: 'wrap', grille: 'exoticMouth', stockExhaust: 'center',
    }),
    description:
      'The flagship. Dry-sump 4.2 L V8 revving to 8,800 rpm, carbon tub, enormous rear tyres. Fast, rare, and ' +
      'the most expensive thing you will ever be afraid to park.',
    stockPaint: '#f2f2f2', tags: ['euro', 'exotic', 'hyper'],
  },
  // ======================= IRONCLAD =======================
  {
    id: 'ironclad_stallion', brand: 'ironclad', name: 'Stallion', trim: 'GT 5.0', year: 1995, price: 13000, body: 'muscle',
    drivetrain: 'RWD', engineId: 'ic50v8', weight: 1520, weightFront: 0.56, cgHeight: 0.53,
    length: 4.62, width: 1.83, height: 1.35, wheelbase: 2.57, frontOverhang: 1.02,
    stockWheelSize: 16, stockTireWidth: 225, stockTireProfile: 55,
    gears: [3.35, 1.99, 1.33, 1.0, 0.68], finalDrive: 3.27, cd: 0.38, frontalArea: 2.15,
    shape: s({
      noseH: 0.66, hoodH: 0.9, roofH: 1.35, deckH: 1.02, tailH: 1.0, beltF: 0.78, beltR: 0.96,
      wsBase: 0.418, roofStart: 0.540, roofEnd: 0.730, rearGlassBase: 0.83, sideWindowEnd: 0.765,
      frontTaper: 0.824, rearTaper: 0.907, noseRound: 0.051, tailRound: 0.04, tumble: 0.78, roofCrown: 0.040,
      fenderF: 0.02, fenderR: 0.035, shoulder: 0.6, lightMount: 'face',
      headlight: 'sealedRect', taillight: 'vertical', grille: 'muscleWide', stockExhaust: 'dual',
    }),
    description:
      'Mid-90s pony car with a cheap pushrod 5.0 and a solid rear axle. The most affordable V8 in the city, and the ' +
      'easiest one to supercharge.',
    stockPaint: '#2a6b3c', tags: ['usdm', 'muscle', 'starter', 'cheap'],
  },
  {
    id: 'ironclad_hammer', brand: 'ironclad', name: 'Hammer', trim: '427', year: 1970, price: 38000, body: 'muscle',
    drivetrain: 'RWD', engineId: 'ic70v8', weight: 1650, weightFront: 0.57, cgHeight: 0.55,
    length: 4.8, width: 1.88, height: 1.32, wheelbase: 2.8, frontOverhang: 1.05,
    stockWheelSize: 15, stockTireWidth: 235, stockTireProfile: 60,
    gears: [2.52, 1.88, 1.46, 1.0], finalDrive: 3.73, cd: 0.45, frontalArea: 2.2,
    shape: s({
      noseH: 0.76, hoodH: 0.93, roofH: 1.32, deckH: 1.0, tailH: 0.98, beltF: 0.82, beltR: 0.95, sill: 0.2,
      wsBase: 0.468, roofStart: 0.570, roofEnd: 0.730, rearGlassBase: 0.88, sideWindowEnd: 0.745,
      frontTaper: 0.905, rearTaper: 0.936, noseRound: 0.034, tailRound: 0.035, tumble: 0.74, roofCrown: 0.035,
      hoodCrown: 0.03, fenderF: 0.02, fenderR: 0.05, shoulder: 0.9, noseDrop: 0.2, wedge: 0.0, lightMount: 'face',
      headlight: 'quadRound', taillight: 'boxy', grille: 'muscleWide', stockExhaust: 'dual', blackPillars: false,
    }),
    description:
      'A 1970 big-block fastback: flat nose, quad round headlights, endless hood. The 7.0 L Hammerhead makes 610 Nm ' +
      'just off idle. Traction is a suggestion.',
    stockPaint: '#d65a12', tags: ['usdm', 'muscle', 'classic'],
  },
  {
    id: 'ironclad_viperock', brand: 'ironclad', name: 'Viperock', trim: 'SC', year: 2002, price: 52000, body: 'muscle',
    drivetrain: 'RWD', engineId: 'ic54sc', weight: 1700, weightFront: 0.55, cgHeight: 0.52,
    length: 4.75, width: 1.9, height: 1.34, wheelbase: 2.75, frontOverhang: 1.0,
    stockWheelSize: 18, stockTireWidth: 275, stockTireProfile: 40,
    gears: [2.66, 1.78, 1.3, 1.0, 0.8, 0.63], finalDrive: 3.55, cd: 0.37, frontalArea: 2.25,
    shape: s({
      noseH: 0.66, hoodH: 0.94, roofH: 1.34, deckH: 1.02, tailH: 1.0, beltF: 0.8, beltR: 0.97,
      wsBase: 0.458, roofStart: 0.560, roofEnd: 0.740, rearGlassBase: 0.84, sideWindowEnd: 0.765,
      frontTaper: 0.806, rearTaper: 0.907, noseRound: 0.06, tumble: 0.75, roofCrown: 0.045, hoodCrown: 0.07,
      fenderF: 0.04, fenderR: 0.05, shoulder: 0.85, lightMount: 'face', hoodVents: true,
      headlight: 'trapezoid', taillight: 'split', grille: 'muscleWide', stockExhaust: 'sideExit',
    }),
    description:
      'Modern muscle with a factory twin-screw supercharger, side-exit exhaust and a power-bulge hood. 600 Nm, ' +
      '1,700 kg, zero subtlety.',
    stockPaint: '#0f0f12', tags: ['usdm', 'muscle'],
  },
  // ======================= APEX =======================
  {
    id: 'apex_rook', brand: 'apex', name: 'Rook', trim: '2.0', year: 1997, price: 7000, body: 'coupe',
    drivetrain: 'FWD', engineId: 'ax20n', weight: 1180, weightFront: 0.62, cgHeight: 0.5,
    length: 4.3, width: 1.7, height: 1.33, wheelbase: 2.55, frontOverhang: 0.86,
    stockWheelSize: 15, stockTireWidth: 185, stockTireProfile: 60,
    gears: [3.31, 1.95, 1.36, 1.03, 0.81], finalDrive: 3.94, cd: 0.33, frontalArea: 1.9,
    shape: s({
      noseH: 0.62, hoodH: 0.88, roofH: 1.33, deckH: 1.0, tailH: 0.97, beltF: 0.76, beltR: 0.94,
      wsBase: 0.338, roofStart: 0.470, roofEnd: 0.720, rearGlassBase: 0.84, sideWindowEnd: 0.770,
      frontTaper: 0.725, noseRound: 0.076, tumble: 0.8, roofCrown: 0.050, shoulder: 0.4,
      headlight: 'slimRect', taillight: 'wrap', grille: 'slot', stockExhaust: 'single',
    }),
    description:
      'The cheapest new coupe in America in 1997. Economy engine, steel wheels, cloth seats. A blank canvas — and ' +
      'every turbo kit on earth bolts onto the AX block.',
    stockPaint: '#6e7f2f', tags: ['usdm', 'starter', 'cheap'],
  },
  {
    id: 'apex_vandal', brand: 'apex', name: 'Vandal', trim: 'Turbo', year: 2000, price: 15000, body: 'sedan',
    drivetrain: 'FWD', engineId: 'ax20t', weight: 1290, weightFront: 0.62, cgHeight: 0.52,
    length: 4.45, width: 1.72, height: 1.4, wheelbase: 2.62, frontOverhang: 0.9,
    stockWheelSize: 16, stockTireWidth: 205, stockTireProfile: 50,
    gears: [3.54, 2.13, 1.36, 1.03, 0.81], finalDrive: 4.06, cd: 0.32, frontalArea: 2.0,
    shape: s({
      noseH: 0.64, hoodH: 0.9, roofH: 1.4, deckH: 1.05, tailH: 1.03, beltF: 0.78, beltR: 0.98,
      wsBase: 0.318, roofStart: 0.450, roofEnd: 0.720, rearGlassBase: 0.8, sideWindowEnd: 0.770, bPillar: 0.54,
      frontTaper: 0.748, noseRound: 0.068, tumble: 0.82, roofCrown: 0.045, shoulder: 0.6, fenderF: 0.02,
      headlight: 'slimRect', taillight: 'boxy', grille: 'honeycombSplit', stockExhaust: 'single',
    }),
    description:
      'Four-door sport compact with a factory turbo, a big wing option and torque steer for days. The import-scene ' +
      'gateway drug.',
    stockPaint: '#d9d9d9', tags: ['usdm', 'sedan', 'starter'],
  },
  {
    id: 'apex_sprint', brand: 'apex', name: 'Sprint', trim: 'AWD-T', year: 2003, price: 24000, body: 'hatch',
    drivetrain: 'AWD', engineId: 'ax24t', weight: 1400, weightFront: 0.6, cgHeight: 0.52,
    length: 4.25, width: 1.75, height: 1.44, wheelbase: 2.6, frontOverhang: 0.88,
    stockWheelSize: 17, stockTireWidth: 225, stockTireProfile: 45,
    gears: [3.45, 2.06, 1.47, 1.13, 0.91, 0.72], finalDrive: 4.1, cd: 0.34, frontalArea: 2.1,
    shape: s({
      noseH: 0.66, hoodH: 0.94, roofH: 1.44, deckH: 1.1, tailH: 1.02, beltF: 0.8, beltR: 1.0,
      wsBase: 0.298, roofStart: 0.440, roofEnd: 0.840, rearGlassBase: 0.97, sideWindowEnd: 0.860, bPillar: 0.6,
      frontTaper: 0.77, rearTaper: 0.92, noseRound: 0.06, tailRound: 0.035, tumble: 0.82, roofCrown: 0.035,
      fenderF: 0.04, fenderR: 0.045, shoulder: 0.7, hoodVents: true,
      headlight: 'wideBar', taillight: 'vertical', grille: 'honeycombSplit', stockExhaust: 'single',
    }),
    description:
      'A five-door AWD hot hatch with a 2.4 L turbo and a hood scoop. Practical enough for groceries, violent enough ' +
      'to shame sports cars off the line.',
    stockPaint: '#ff6a00', tags: ['usdm', 'awd'],
  },
];

export const CARS: Record<string, CarModel> = Object.fromEntries(models.map((m) => [m.id, m]));
export const CAR_LIST = models;

export function carFullName(modelId: string): string {
  const m = CARS[modelId];
  const brand = BRANDS[m.brand].name.split(' ')[0];
  return `${brand.charAt(0)}${brand.slice(1).toLowerCase()} ${m.name}`;
}
