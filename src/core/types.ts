// Shared type definitions for CUT THE WIND.

export type BrandId = 'kairo' | 'mizuno' | 'takeda' | 'werkhaus' | 'belladonna' | 'ironclad' | 'apex';
export type Drivetrain = 'RWD' | 'FWD' | 'AWD';
export type Aspiration = 'NA' | 'turbo' | 'twinturbo' | 'supercharged';
export type EngineLayout = 'I4' | 'I6' | 'V6' | 'V8';
export type BodyType = 'coupe' | 'fastback' | 'notchback' | 'hatch' | 'sedan' | 'midengine' | 'muscle';

export interface Brand {
  id: BrandId;
  name: string;
  origin: 'Japan' | 'Germany' | 'Italy' | 'United States';
  founded: number;
  specialty: string;
  configs: string;
  philosophy: string;
  heritage: string;
  colors: [string, string]; // emblem colors
  styleRegion: 'jdm' | 'euro' | 'usdm';
}

export interface EngineSpec {
  id: string;
  name: string; // engine code, e.g. KR20-DT
  brand: BrandId;
  layout: EngineLayout;
  cylinders: number;
  displacement: number; // litres
  aspiration: Aspiration;
  powerHp: number; // factory peak power
  powerRpm: number;
  torqueNm: number; // factory peak torque
  torqueRpm: number;
  redline: number;
  idle: number;
  stockBoost: number; // bar (0 for NA)
  weight: number; // kg, approx engine mass (used for swaps)
  swapPrice: number;
  description: string;
}

/** Normalised body-shape description used by the procedural body generator. */
export interface ShapeParams {
  // heights (metres, at centreline unless noted)
  noseH: number; // top of nose at front tip
  hoodH: number; // hood height at cowl / windshield base
  roofH: number; // roof height
  deckH: number; // trunk / engine-cover height at rear glass base
  tailH: number; // top at rear tip
  beltF: number; // belt (shoulder) height near front
  beltR: number; // belt height near rear
  sill: number; // ground clearance of body bottom between wheels
  // stations, fraction of length measured from the front tip
  wsBase: number;
  roofStart: number;
  roofEnd: number;
  rearGlassBase: number;
  sideWindowEnd: number; // where side glass ends
  bPillar: number; // 0 = none
  // plan / section
  noseRound: number; // length fraction used to round the nose in plan view
  tailRound: number;
  frontTaper: number; // width fraction at the front tip
  rearTaper: number;
  tumble: number; // roof width as fraction of body width
  roofCrown: number; // metres
  hoodCrown: number;
  fenderF: number; // stock fender bulge (m)
  fenderR: number;
  shoulder: number; // 0..1 sharpness of shoulder line
  noseDrop: number; // how quickly the nose falls toward the tip (0..1)
  wedge: number; // tilts belt forward (0..1)
  // fascia features
  headlight: HeadlightStyle;
  taillight: TaillightStyle;
  grille: GrilleStyle;
  hoodVents: boolean;
  stockExhaust: string; // exhaust part id used when exhaust is 'stock'
  lightMount: 'corner' | 'face';
  blackPillars: boolean;
}

export type HeadlightStyle =
  | 'dualRound' | 'dualOval' | 'quadRound' | 'slimRect' | 'trapezoid' | 'teardrop' | 'sealedRect' | 'wideBar'
  | 'projector' | 'angelEyes' | 'smoked' | 'ledStrip' | 'blackQuad';
export type TaillightStyle =
  | 'threeSegment' | 'triangle' | 'roundQuad' | 'fullBar' | 'vertical' | 'wrap' | 'split' | 'boxy'
  | 'clearEuro' | 'smoked' | 'ledBar' | 'redClear' | 'roundQuadAfter';
export type GrilleStyle =
  | 'smallRect' | 'largeTwinIntake' | 'smile' | 'barGrille' | 'exoticMouth' | 'muscleWide' | 'honeycombSplit' | 'slot';

export interface CarModel {
  id: string;
  brand: BrandId;
  name: string; // without brand
  trim: string; // e.g. "2.0T"
  year: number;
  price: number;
  body: BodyType;
  drivetrain: Drivetrain;
  engineId: string;
  weight: number; // kg (curb)
  weightFront: number; // 0..1 front weight distribution
  cgHeight: number; // m
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  frontOverhang: number;
  stockWheelSize: number; // inches
  stockTireWidth: number; // mm
  stockTireProfile: number;
  gears: number[]; // stock ratios
  finalDrive: number;
  cd: number;
  frontalArea: number;
  shape: ShapeParams;
  description: string;
  stockPaint: string;
  tags: string[];
}

export type PaintFinish = 'solid' | 'metallic' | 'pearl' | 'matte' | 'candy' | 'chrome' | 'carbon';

export interface PaintConfig {
  color: string;
  finish: PaintFinish;
  pearl: string; // secondary/flip colour for pearl finishes
}

export type VinylRegion = 'left' | 'right' | 'top';
export type VinylShape =
  | 'stripe' | 'rect' | 'circle' | 'ring' | 'triangle' | 'chevron' | 'slash' | 'shard' | 'shards' | 'bolt' | 'star'
  | 'arrow' | 'wave' | 'hatch' | 'dots' | 'checker' | 'hexgrid' | 'fade' | 'sweep' | 'circuit' | 'diamond'
  | 'text' | 'number' | 'sponsor' | 'logo';

export interface VinylLayer {
  id: string;
  shape: VinylShape;
  region: VinylRegion;
  mirror: boolean; // also apply to the opposite side (left/right only)
  x: number; // 0..1 within region (left side: 0 = front; top: 0 = front)
  y: number; // 0..1 within region (0 = top of region)
  sx: number; // scale (fraction of region width)
  sy: number; // scale (fraction of region height)
  rot: number; // degrees
  color: string;
  color2: string;
  opacity: number;
  text?: string;
  font?: 'block' | 'italic' | 'outline' | 'stencil';
  sponsor?: string;
  logo?: string; // brand id or 'ctw'
  flipX?: boolean;
}

export interface WheelConfig {
  design: string;
  size: number; // inches
  width: number; // inches (rim)
  offset: number; // mm, +out / -in relative to stock fitment
  profile: number; // tire aspect ratio
  tireWidth: number; // mm
  finish: string; // finish id
  color: string; // custom colour (for painted finish)
  camber: number; // degrees, negative = top in
}

export interface InteriorConfig {
  seats: string;
  steering: string;
  dash: string;
  gauges: string;
  cage: string;
  shifter: string;
  color: string;
  material: string;
}

export interface VisualConfig {
  frontBumper: string;
  rearBumper: string;
  sideSkirts: string;
  frontFenders: string;
  rearFenders: string;
  hood: string;
  hoodScoop: string;
  spoiler: string;
  spoilerFinish: 'body' | 'carbon' | 'black';
  mirrors: string;
  headlights: string;
  taillights: string;
  roof: string;
  exhaust: string;
  exhaustFinish: string;
  splitter: string;
  diffuser: string;
  canards: string;
  wheels: WheelConfig;
  paint: PaintConfig;
  caliperColor: string;
  vinyls: VinylLayer[];
  neon: { enabled: boolean; color: string; mode: 'steady' | 'pulse' | 'strobe' };
  windowTint: number; // 0..0.85
  tintColor: string;
  plate: string;
  interior: InteriorConfig;
}

export interface PerfConfig {
  engineSwap: string; // 'stock' or engine id
  intake: string;
  exhaust: string;
  ecu: string;
  fuel: string;
  turbo: string; // 'stock' | 'none' | turbo kit id
  supercharger: string; // 'none' | sc id
  intercooler: string;
  internals: string;
  camshaft: string;
  flywheel: string;
  cooling: string;
  nitrous: string;
  clutch: string;
  gearbox: string;
  diff: string;
  driveshaft: string;
  suspension: string;
  brakes: string;
  tires: string;
  weight: string;
}

export interface TuneConfig {
  boost: number; // bar target (0 = part default)
  gears: number[]; // custom ratios (empty = stock / part default)
  finalDrive: number; // 0 = default
  nitroShot: number; // fraction 0.3..1 of nitrous kit max
  launchRpm: number; // 0 = off (requires launch control)
  revLimit: number; // 0 = default
  tirePressure: number; // psi
  springF: number; // 0..1 soft..stiff
  springR: number;
  damping: number; // 0..1
  rideHeight: number; // mm, negative = lower
  camberF: number;
  camberR: number;
}

export interface CarBuild {
  uid: string;
  modelId: string;
  buildName: string;
  visual: VisualConfig;
  perf: PerfConfig;
  tune: TuneConfig;
}

/** Physics-ready vehicle description derived from a build. */
export interface VehicleSpec {
  modelId: string;
  name: string;
  drivetrain: Drivetrain;
  engineName: string;
  layout: EngineLayout;
  cylinders: number;
  displacement: number;
  aspiration: Aspiration;
  // torque curve sampled every 100 rpm from 0 to (revLimit + 500), at full boost / NA
  torqueNA: Float32Array; // naturally aspirated base torque (Nm)
  boostCurve: Float32Array; // target boost (bar) per rpm sample at full throttle
  boostEff: number; // torque gain per bar
  turboLag: number; // seconds time constant for boost build
  scLoss: number; // supercharger parasitic fraction
  idle: number;
  redline: number;
  revLimit: number;
  shiftRpm: number; // optimal upshift rpm (computed)
  engineInertia: number; // kg m^2
  gears: number[];
  finalDrive: number;
  shiftTime: number; // seconds
  clutchTorque: number; // Nm capacity
  clutchEngage: number; // seconds for launch engagement
  driveEff: number;
  diffFactor: number; // traction multiplier from diff
  mass: number; // kg incl. driver
  weightFront: number;
  cgHeight: number;
  wheelbase: number;
  tireRadius: number;
  tireMu: number; // peak friction coefficient
  tireMuSlide: number;
  rollingRes: number;
  cdA: number;
  liftCoef: number; // downforce coefficient * area (negative lift)
  weightTransfer: number; // effectiveness multiplier (0.6..1.3)
  nitroHp: number; // 0 = none
  nitroCapacity: number; // seconds at full shot
  launchControl: number; // rpm (0 = none)
  coolingFactor: number;
  stress: number; // 0..1.5 engine stress (above 1 = risky)
  peakHp: number;
  peakHpRpm: number;
  peakTorque: number;
  peakTorqueRpm: number;
  peakBoost: number;
  shiftRpms: number[]; // optimal upshift rpm per gear (index 0 = 1st)
  launchOpt: number; // best launch rpm
  launchLo: number; // launch window
  launchHi: number;
  fuelLimited: boolean;
  clutchLimited: boolean;
  tireWidth: number;
  factoryHp: number;
}

export interface DriverSkill {
  reaction: number; // mean reaction time (s)
  reactionVar: number;
  launchAccuracy: number; // 0..1
  shiftAccuracy: number; // 0..1
  shiftBias: number; // fraction of rpm early(-)/late(+)
  nitroSkill: number; // 0..1
  mistakeChance: number; // per shift
  throttleCap?: number[]; // optional per-gear throttle cap (tutorial sandbagging)
}

export interface RivalProfile {
  id: string;
  name: string;
  nickname: string;
  crew: string;
  style: string;
  build: CarBuild;
  skill: DriverSkill;
  quote: string;
  winQuote: string;
  loseQuote: string;
  targetEt: number;
  boss?: boolean;
}

export type RaceDistance = 201.168 | 402.336 | 804.672;

export interface RaceEvent {
  id: string;
  venue: string;
  name: string;
  tier: number;
  distance: RaceDistance;
  entryFee: number;
  prize: number;
  rep: number;
  rival: RivalProfile;
  completed: boolean;
  boss?: boolean;
  story?: boolean;
}
