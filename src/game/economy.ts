// Prices, car values and race reward application.
import type { CarBuild, RaceEvent } from '../core/types';
import { CARS } from '../data/cars';
import { ENGINES } from '../data/engines';
import { perfPart, INTERIOR_PARTS, type PerfSlot } from '../data/perfParts';
import { visualPart, WHEEL_DESIGNS, wheelPrice, type VisualSlot } from '../data/visualParts';
import { addNews, earn, fmtMoney, type Profile } from '../core/state';
import { BOSSES, VOSS } from './progression';
import { progressGigsRace } from './npc';
import type { RaceResult } from '../ui/screens/race';

const VSLOTS: VisualSlot[] = ['frontBumper', 'rearBumper', 'sideSkirts', 'frontFenders', 'rearFenders', 'hood', 'hoodScoop', 'spoiler', 'mirrors', 'headlights', 'taillights', 'roof', 'exhaust', 'splitter', 'diffuser', 'canards'];

export function installedPartsValue(b: CarBuild): number {
  let v = 0;
  for (const s of Object.keys(b.perf) as PerfSlot[]) {
    if (s === 'engineSwap') { const e = ENGINES[b.perf.engineSwap]; if (e) v += e.swapPrice; continue; }
    v += perfPart(s, (b.perf as any)[s]).price;
  }
  for (const s of VSLOTS) v += visualPart(s, (b.visual as any)[s]).price;
  const wd = WHEEL_DESIGNS.find((w) => w.id === b.visual.wheels.design);
  if (wd) v += wheelPrice(wd, b.visual.wheels.size);
  for (const ip of INTERIOR_PARTS) if ((b.visual.interior as any)[ip.slot] === ip.id) v += ip.price;
  return v;
}

export function carValue(b: CarBuild): number {
  return Math.round((CARS[b.modelId].price * 0.6 + installedPartsValue(b) * 0.4) / 50) * 50;
}

export interface RewardSummary { lines: string[]; money: number; rep: number }

/** Applies a finished race to the profile (money, rep, stats, gigs, bosses, bets). */
export function applyRaceResult(p: Profile, ev: RaceEvent, res: RaceResult, modelId: string): RewardSummary {
  const lines: string[] = [];
  let money = 0, rep = 0;
  p.stats.races++;
  if (res.won) {
    p.stats.wins++;
    money += ev.prize;
    rep += ev.rep;
    lines.push(`Prize: ${fmtMoney(ev.prize)}`);
  } else {
    p.stats.losses++;
    rep += Math.round(ev.rep * 0.15);
  }
  if (res.player.et > 0 && Math.abs(res.distance - 402.336) < 1) {
    if (!p.stats.bestEt || res.player.et < p.stats.bestEt) { p.stats.bestEt = res.player.et; lines.push(`New personal best: ${res.player.et.toFixed(3)} s`); }
    p.stats.bestTrap = Math.max(p.stats.bestTrap, res.player.trap);
  }
  p.stats.perfectShifts += res.player.perfect;
  if (res.player.perfect >= 3) { const b = 50 * (ev.tier + 1); money += b; lines.push(`Clean shifting bonus: ${fmtMoney(b)}`); }
  if (p.bet) {
    if (res.won) { money += p.bet.amount * 2; lines.push(`Rico's side bet pays out: ${fmtMoney(p.bet.amount * 2)}`); }
    else lines.push(`Lost the side bet (${fmtMoney(p.bet.amount)})`);
    p.bet = null;
  }
  ev.completed = res.won || ev.completed;
  if (res.won && ev.boss) {
    const boss = BOSSES.find((b) => b.name === ev.rival.name);
    if (boss && !p.bosses.includes(boss.id)) {
      p.bosses.push(boss.id);
      lines.push(`BOSS DEFEATED: ${boss.name} — next tier unlocked!`);
      addNews(p, `${p.name} took down ${boss.name} "${boss.nickname}"`);
    }
    if (ev.story && !p.bosses.includes(VOSS.id)) {
      p.bosses.push(VOSS.id);
      lines.push('You beat Adrian Voss. The city knows your name.');
      addNews(p, `${p.name} beats Adrian Voss in a rematch at Pier 9. The BLACKOUT era is over.`);
    }
  } else if (!res.won && ev.boss) addNews(p, `${ev.rival.name} holds off ${p.name}`);
  earn(p, money, rep);
  lines.push(...progressGigsRace(p, { won: res.won, venue: ev.venue, et: res.player.et, distance: res.distance, perfectShifts: res.player.perfect, modelId }));
  if (res.won) addNews(p, `${p.name} beats ${ev.rival.name} at ${ev.venue.toUpperCase()} — ${res.player.et.toFixed(3)} @ ${res.player.trap.toFixed(0)} km/h`);
  return { lines, money, rep };
}
