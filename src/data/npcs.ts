// Non-player characters: who they are, where they hang out, how they talk.
export interface NpcDef {
  id: string;
  name: string;
  role: string;
  location: string; // hub location id
  color: string;
  accent: string;
  bio: string;
  greet: string[]; // by affinity tier (0 low .. 3 high)
  lore: string[]; // things they tell you (tips + world building)
  service: 'discount' | 'gig' | 'intel' | 'bet' | 'photo' | 'parts' | 'loan';
}

export const NPCS: NpcDef[] = [
  {
    id: 'mags', name: 'Marguerite "Mags" Okonkwo', role: 'Owner, Torque House', location: 'perf', color: '#ff8a20', accent: '#2a1a0a',
    bio: 'Ex-endurance mechanic who opened Torque House in a former bus depot. Knows every engine in the city by sound.',
    greet: ['You again. Wipe your shoes.', 'Hey, kid. What did you break this time?', 'There she is — my favourite customer.', 'Coffee\'s on. Sit. Tell me everything.'],
    lore: [
      'Shift lights lie. Shift where the next gear gives you more push, not at the limiter. The tach on the HUD shows you the perfect window.',
      'Turbo cars want revs before the green. Hold it in the launch window — no boost, no launch.',
      'An open diff spins one wheel. A 1-way LSD is the cheapest launch upgrade you\'ll ever buy.',
      'Engine stress over 100% means you\'re borrowing horsepower from the future. Forged internals pay that loan back.',
      'Clutch slipping on the dyno? Your engine out-torques it. Upgrade the clutch before you add boost.',
      'The Kairo KR20 block takes double its factory boost with a forged crank. Everyone in Japan knew that in \'98.',
    ],
    service: 'discount',
  },
  {
    id: 'rico', name: 'Rico Salazar', role: 'Race promoter', location: 'pier9', color: '#ffcc00', accent: '#2a2200',
    bio: 'Runs the Pier 9 nights with a clipboard, a megaphone and three phones. Always has a side bet going.',
    greet: ['Who let you in?', 'The rookie! Crowd liked you.', 'My headliner! Talk to me.', 'Partner. You\'re good for business.'],
    lore: [
      'Bosses only race people with a name. Win races, build rep, and they\'ll come to you.',
      'Each tier has its own spot. Pier 9 is the bottom. Foundry Row, the airfield, the canal… then the big leagues.',
      'Entry fees go to the pot. Win and you take it home. Lose and you buy the next round.',
      'Voss? He shows up when someone\'s worth his time. Don\'t rush it.',
    ],
    service: 'bet',
  },
  {
    id: 'hana', name: 'Hana Mori', role: 'JDM parts importer', location: 'docks', color: '#ff2a8a', accent: '#2a0a1a',
    bio: 'Brings containers of rare Japanese parts through Pier 9 every Thursday. Pays well for drivers who don\'t ask questions.',
    greet: ['I don\'t know you.', 'Ah, the Kestrel kid.', 'Good timing. I have work.', 'My favourite courier!'],
    lore: [
      'The Kairo Aero Type-S bumper was a factory option in Japan only. I can get them. For a price.',
      'Mizuno engines rev to 8,600. Use every rpm — short-shifting a Mizuno is a crime.',
      'Takeda says the GT-RS makes 280 horsepower. Takeda is lying. Everyone knows.',
    ],
    service: 'gig',
  },
  {
    id: 'earl', name: 'Big Earl Washington', role: 'Diner owner, retired drag racer', location: 'diner', color: '#ff3020', accent: '#2a0a08',
    bio: 'Ran nines in a \'70 Hammer before you were born. Now he fries eggs and tells stories, and sometimes lends money to people he likes.',
    greet: ['Booth\'s open. Order something.', 'Look who\'s hungry.', 'Sit down, champ. Pie\'s fresh.', 'My best customer and my best racer!'],
    lore: [
      'In my day we launched on bias-ply slicks and prayer. Get drag radials, kid. Prayer is cheaper but it doesn\'t work.',
      'Weight transfer is free horsepower. Soft rear springs, stiff front. Let the car squat.',
      'The Canal record? Razor\'s Hammer. My old Hammer. Long story.',
      'Reaction time wins more races than horsepower. Watch the ambers, not the green.',
    ],
    service: 'loan',
  },
  {
    id: 'juno', name: 'Juno Park', role: 'Photographer, IMPORT NIGHT magazine', location: 'diner', color: '#30d0ff', accent: '#06202a',
    bio: 'Shoots covers for the city\'s biggest tuner magazine. Pays for cars that look the part.',
    greet: ['Not now, I\'m editing.', 'Oh, the blue Kestrel! Nice.', 'Got anything new for my lens?', 'My cover star!'],
    lore: [
      'Magazines want a theme. A wild body kit with factory wheels looks unfinished.',
      'Vinyls, wheels, stance — it all adds up. Your style rating tells you what my editor thinks.',
      'Neon reads great at night. Just don\'t pick a colour that fights your paint.',
    ],
    service: 'photo',
  },
  {
    id: 'dex', name: 'Dex', role: 'Street informant', location: 'docks', color: '#40ff90', accent: '#062a14',
    bio: 'Nobody knows Dex\'s last name. Everybody knows Dex knows things.',
    greet: ['What.', 'You again.', 'My best client.', 'For you? Discount.'],
    lore: [
      'Every crew has a weak spot. Some miss shifts under pressure, some bog off the line.',
      'I hear Voss shipped his Strasse to Stuttgart for a new bottom end. Nine-second car now. Maybe.',
      'Rivals scale with you. Get faster, they get faster. Get prettier — they bring their show cars.',
    ],
    service: 'intel',
  },
];

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));
