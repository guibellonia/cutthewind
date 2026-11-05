import type { Brand, BrandId } from '../core/types';

export const BRANDS: Record<BrandId, Brand> = {
  kairo: {
    id: 'kairo',
    name: 'KAIRO MOTORWORKS',
    origin: 'Japan',
    founded: 1978,
    specialty: 'Lightweight performance coupes and turbocharged engines',
    configs: 'Inline-4 · RWD · Turbocharged',
    philosophy: 'Affordable performance and extensive aftermarket potential.',
    heritage:
      'Founded in Hamamatsu by former motorcycle engineers who believed a turbo four could embarrass any six. ' +
      'Kairo built its name in the 1980s touge scene, and its KR-series engines are famous for holding twice their ' +
      'factory boost on stock bottom ends. The kestrel-wing emblem became a symbol of the garage tuner.',
    colors: ['#d8dde6', '#1f6fd1'],
    styleRegion: 'jdm',
  },
  mizuno: {
    id: 'mizuno',
    name: 'MIZUNO AUTOMOTIVE',
    origin: 'Japan',
    founded: 1969,
    specialty: 'Compact sports cars and lightweight hatchbacks',
    configs: 'NA & turbo four-cylinders · FWD/RWD/AWD',
    philosophy: 'High-revving engines, low weight and agile handling.',
    heritage:
      'Mizuno started as a scooter maker in Osaka and never lost its obsession with weight. Its MZ engines rev past ' +
      '8,000 rpm with variable valve timing, and the brand dominated small-displacement rallying through the 90s. ' +
      'The wave emblem represents the coastal mountain roads where its cars were developed.',
    colors: ['#f2f2f2', '#d42a2a'],
    styleRegion: 'jdm',
  },
  takeda: {
    id: 'takeda',
    name: 'TAKEDA MOTOR COMPANY',
    origin: 'Japan',
    founded: 1962,
    specialty: 'Grand touring coupes and performance sedans',
    configs: 'Inline-6 · RWD & AWD',
    philosophy: 'Stability, refinement and high-speed performance.',
    heritage:
      'Takeda grew out of a Nagoya aircraft-parts supplier. Its TK inline-sixes are smooth, overbuilt and endlessly ' +
      'tunable, and the GT-RS earned the nickname "the bullet" on the Wangan-style expressways. The three-peak shield ' +
      'stands for the mountains the company tested on before it ever had a proving ground.',
    colors: ['#c9ced6', '#7a1010'],
    styleRegion: 'jdm',
  },
  werkhaus: {
    id: 'werkhaus',
    name: 'WERKHAUS',
    origin: 'Germany',
    founded: 1954,
    specialty: 'Performance sedans and grand touring coupes',
    configs: 'Inline-6 & V8 · RWD',
    philosophy: 'Engineering precision, torque and refined performance.',
    heritage:
      'Werkhaus began as a machine-tool workshop in Stuttgart-Feuerbach and still treats a crankshaft like a ' +
      'precision instrument. Its R-division builds homologation coupes in tiny numbers. The cog-ring emblem is ' +
      'the old workshop stamp, unchanged since 1954.',
    colors: ['#e4e4e4', '#0b4ea2'],
    styleRegion: 'euro',
  },
  belladonna: {
    id: 'belladonna',
    name: 'BELLADONNA AUTOMOBILI',
    origin: 'Italy',
    founded: 1971,
    specialty: 'Exotic sports cars and high-performance coupes',
    configs: 'V6 & V8 · mid- and front-engine · RWD',
    philosophy: 'Dramatic styling, exotic proportions and high performance.',
    heritage:
      'Founded near Modena by a coachbuilder and a former race mechanic, Belladonna named itself after the beautiful ' +
      'and dangerous nightshade. Every engine is hand-assembled and signed. The crest shows the nightshade berry ' +
      'over a racing chequer.',
    colors: ['#f0c419', '#3b0a45'],
    styleRegion: 'euro',
  },
  ironclad: {
    id: 'ironclad',
    name: 'IRONCLAD MOTORS',
    origin: 'United States',
    founded: 1965,
    specialty: 'Muscle cars and drag racing platforms',
    configs: 'NA & supercharged V8 · RWD',
    philosophy: 'Displacement, torque and aggressive proportions.',
    heritage:
      'Ironclad was born in Detroit at the height of the horsepower wars. Its pushrod V8s are simple, cheap and ' +
      'brutally strong, which is why half the cars at any drag strip in America run Ironclad blocks. The riveted ' +
      'shield emblem comes from the steel plant that cast its first engines.',
    colors: ['#cfcfcf', '#b3121b'],
    styleRegion: 'usdm',
  },
  apex: {
    id: 'apex',
    name: 'APEX AUTOMOTIVE',
    origin: 'United States',
    founded: 1987,
    specialty: 'Sport compacts and affordable performance cars',
    configs: 'Turbocharged four-cylinders · FWD/AWD',
    philosophy: 'Lightweight platforms, accessibility and aftermarket potential.',
    heritage:
      'Apex was spun out of a Midwestern truck maker to sell cheap, light compacts to young drivers. Then the tuners ' +
      'found them. By the late 90s Apex shipped factory turbo kits through dealers and sponsored half the import ' +
      'drag events in the country. The peak-chevron logo is everywhere at the strip.',
    colors: ['#ffffff', '#ff7a00'],
    styleRegion: 'usdm',
  },
};

export const BRAND_LIST = Object.values(BRANDS);
