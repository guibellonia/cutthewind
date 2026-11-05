// Day cycle: race events, bosses, unlocks.
import type { RaceDistance, RaceEvent, RivalProfile } from '../core/types';
import { RNG } from '../core/rng';
import { blackoutBuild, uid } from '../core/builds';
import { currentCar, type Profile } from '../core/state';
import { estimate } from '../sim/index';
import { MARKS } from '../sim/physics';
import { visualScore } from './style';
import { generateRival, skillFor, TIERS, tuneToTarget } from './rivals';
import { generateJobs } from './jobs';

export interface BossDef {
  id: string;
  tier: number;
  name: string;
  nickname: string;
  crew: string;
  modelId: string;
  styleId: string;
  venue: string;
  distance: RaceDistance;
  rep: number; // rep needed to challenge
  intro: string;
  quote: string;
  winQuote: string;
  loseQuote: string;
}

export const BOSSES: BossDef[] = [
  { id: 'boss_brick', tier: 0, name: 'Marlo Brickman', nickname: 'BRICK', crew: 'DOCKSIDE', modelId: 'ironclad_stallion', styleId: 'muscle', venue: 'pier9', distance: MARKS.quarter as RaceDistance, rep: 500,
    intro: 'Runs Pier 9 like he owns the concrete. Blown pushrod V8, no apologies.', quote: 'Kid, this pier has a pecking order. You\'re at the bottom.', winQuote: 'Pecking order stays.', loseQuote: 'Fine. Foundry Row is all yours. Don\'t get burned.' },
  { id: 'boss_kage', tier: 1, name: 'Yuna Kage', nickname: 'KAGE', crew: 'KAZE UNION', modelId: 'mizuno_arashi', styleId: 'ta', venue: 'foundry', distance: MARKS.quarter as RaceDistance, rep: 1600,
    intro: 'Rally-bred AWD launches. Never misses a shift. Never talks before a race.', quote: '...', winQuote: 'Practice.', loseQuote: 'Clean run. The airfield crowd will want to see you.' },
  { id: 'boss_surgeon', tier: 2, name: 'Ilse Brandt', nickname: 'THE SURGEON', crew: 'SILENT FLEET', modelId: 'belladonna_corsa8', styleId: 'euro', venue: 'airfield', distance: MARKS.half as RaceDistance, rep: 3600,
    intro: 'Tunes by the millisecond. Her Corsa 8 is worth more than your entire street.', quote: 'Precision beats bravado. Every time.', winQuote: 'As calculated.', loseQuote: 'Interesting. Your margins are thinner than mine. Respect.' },
  { id: 'boss_razor', tier: 3, name: 'Razor Reyes', nickname: 'RAZOR', crew: 'IRON SAINTS', modelId: 'ironclad_hammer', styleId: 'muscle', venue: 'canal', distance: MARKS.quarter as RaceDistance, rep: 6500,
    intro: 'Nine-second big block on slicks. Holds the canal record since \'99.', quote: 'This Hammer\'s older than you, and it\'s still faster.', winQuote: 'Record stands.', loseQuote: 'Record\'s yours. Voss is going to come looking.' },
];

export const VOSS = {
  id: 'boss_voss', name: 'Adrian Voss', nickname: 'BLACKOUT', crew: 'BLACKOUT', rep: 9000,
  quote: 'Remember the pier? I do. Let\'s finish it.', winQuote: 'Still not enough. Not yet.', loseQuote: 'Maybe there was something under that hood after all. More than something.',
};

export function unlockedTier(p: Profile): number {
  let t = 0;
  for (const b of BOSSES) if (p.bosses.includes(b.id)) t = Math.max(t, b.tier + 1);
  return Math.min(3, t);
}

export function finalUnlocked(p: Profile): boolean {
  return BOSSES.every((b) => p.bosses.includes(b.id)) && p.rep >= VOSS.rep && !p.bosses.includes(VOSS.id);
}

function distanceFor(tier: number, rng: RNG): RaceDistance {
  if (tier === 0) return (rng.chance(0.35) ? MARKS.eighth : MARKS.quarter) as RaceDistance;
  if (tier === 2) return (rng.chance(0.3) ? MARKS.half : MARKS.quarter) as RaceDistance;
  if (tier === 3) return (rng.chance(0.4) ? MARKS.half : MARKS.quarter) as RaceDistance;
  return MARKS.quarter as RaceDistance;
}

export function bossRival(b: BossDef, playerEt: number, playerStyle: number, seed: number): RivalProfile {
  const r = generateRival({ tier: b.tier, difficulty: 1, playerEt, playerStyle: Math.max(playerStyle, 60), seed, modelId: b.modelId, styleId: b.styleId, name: b.name, nickname: b.nickname, crew: b.crew, boss: true, quote: b.quote });
  r.winQuote = b.winQuote;
  r.loseQuote = b.loseQuote;
  return r;
}

export function vossRival(): RivalProfile {
  const base = blackoutBuild();
  base.buildName = 'BLACKOUT II';
  const { build, et } = tuneToTarget(base, TIERS[4].etMin + 0.25);
  build.visual = blackoutBuild().visual;
  build.visual.wheels.size = 19;
  return {
    id: uid('r'), name: VOSS.name, nickname: VOSS.nickname, crew: VOSS.crew, style: 'Professional', build,
    skill: { reaction: 0.17, reactionVar: 0.02, launchAccuracy: 0.97, shiftAccuracy: 0.98, shiftBias: 0, nitroSkill: 1, mistakeChance: 0 },
    quote: VOSS.quote, winQuote: VOSS.winQuote, loseQuote: VOSS.loseQuote, targetEt: et, boss: true,
  };
}

/** Regenerates daily content when the day changes. */
export function ensureDay(p: Profile) {
  if (p.eventsDay !== p.day) {
    const car = currentCar(p);
    const pe = estimate(car).et;
    const ps = visualScore(car);
    const events: RaceEvent[] = [];
    const top = unlockedTier(p);
    for (let t = 0; t <= top; t++) {
      const tier = TIERS[t];
      const diffs = t === top ? [0.15, 0.5, 0.85] : [0.6];
      diffs.forEach((d, i) => {
        const seed = p.day * 7919 + t * 101 + i * 13;
        const rng = new RNG(seed);
        const rival = generateRival({ tier: t, difficulty: d, playerEt: pe, playerStyle: ps, seed });
        const prize = Math.round(rng.range(tier.prize[0], tier.prize[1]) * (0.8 + d * 0.5) / 50) * 50;
        events.push({
          id: uid('ev'), venue: tier.venue, name: `${tier.name} · ${['OPEN', 'GRUDGE', 'CASH DAYS'][i % 3]}`, tier: t,
          distance: distanceFor(t, rng), entryFee: Math.round(rng.range(tier.fee[0], tier.fee[1]) / 10) * 10, prize, rep: Math.round(tier.repWin * (0.8 + d * 0.5)),
          rival, completed: false,
        });
      });
      const boss = BOSSES.find((b) => b.tier === t);
      if (boss && !p.bosses.includes(boss.id) && p.rep >= boss.rep) {
        const rival = bossRival(boss, pe, ps, p.day * 31 + t);
        events.push({ id: uid('ev'), venue: boss.venue, name: `BOSS · ${boss.nickname}`, tier: t, distance: boss.distance, entryFee: 0, prize: Math.round(tier.prize[1] * 2.5 / 100) * 100, rep: tier.repWin * 3, rival, completed: false, boss: true });
      }
    }
    if (finalUnlocked(p)) {
      events.push({ id: uid('ev'), venue: 'pier9', name: 'FINAL · BLACKOUT', tier: 4, distance: MARKS.quarter as RaceDistance, entryFee: 0, prize: 40000, rep: 3000, rival: vossRival(), completed: false, boss: true, story: true });
    }
    p.events = events;
    p.eventsDay = p.day;
    p.intel = [];
  }
  if (p.jobsDay !== p.day) {
    p.jobs = generateJobs(p.day, unlockedTier(p));
    p.jobsDay = p.day;
  }
}

export function endDay(p: Profile) {
  p.day++;
  p.gigs = p.gigs.filter((g) => g.expiresDay >= p.day);
  p.bet = null;
  ensureDay(p);
}

export { skillFor };
