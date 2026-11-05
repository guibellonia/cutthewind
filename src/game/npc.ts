// NPC interactions: daily chats, services and gigs (side jobs that pay money and rep).
import { addNews, currentCar, earn, fmtMoney, type Gig, type NpcState, type Profile } from '../core/state';
import { RNG } from '../core/rng';
import { uid } from '../core/builds';
import { NPC_BY_ID } from '../data/npcs';
import { CARS } from '../data/cars';
import { BRANDS } from '../data/brands';
import { visualScore } from './style';
import { unlockedTier, TIERS_VENUES } from './venues';

export function npcState(p: Profile, id: string): NpcState {
  if (!p.npcs[id]) p.npcs[id] = { affinity: 0, lastTalk: 0, lastGig: -9, flags: [] };
  return p.npcs[id];
}

export function affinityTier(a: number) { return a >= 8 ? 3 : a >= 4 ? 2 : a >= 1 ? 1 : 0; }

export interface ChatResult { lines: string[]; money?: number; rep?: number }

export function chat(p: Profile, id: string): ChatResult {
  const n = NPC_BY_ID[id];
  const st = npcState(p, id);
  const lines: string[] = [];
  const first = st.lastTalk !== p.day;
  lines.push(n.greet[affinityTier(st.affinity)]);
  lines.push(n.lore[(p.day + st.affinity) % n.lore.length]);
  if (first) {
    st.affinity = Math.min(10, st.affinity + 1);
    st.lastTalk = p.day;
  }
  return { lines };
}

export interface ServiceOffer { label: string; desc: string; enabled: boolean; run: () => string }

function makeGig(p: Profile, npc: string, rng: RNG): Gig {
  const tier = unlockedTier(p);
  const base = 600 * (1 + tier * 0.9);
  const kinds: Gig['kind'][] = ['winAt', 'winOrigin', 'perfect', 'et', 'jobs'];
  const kind = rng.pick(kinds);
  const exp = p.day + 3;
  switch (kind) {
    case 'winAt': {
      const v = rng.pick(TIERS_VENUES.slice(0, tier + 1));
      return { id: uid('gig'), npc, title: `Show up at ${v.name}`, desc: `Win 2 races at ${v.name}.`, kind, target: v.id, progress: 0, goal: 2, reward: Math.round(base * 1.2 / 50) * 50, rep: 80, expiresDay: exp };
    }
    case 'winOrigin': {
      const o = rng.pick(['Japan', 'Germany', 'Italy', 'United States'] as const);
      return { id: uid('gig'), npc, title: `${o === 'United States' ? 'American' : o === 'Japan' ? 'Japanese' : o === 'Germany' ? 'German' : 'Italian'} pride`, desc: `Win a race driving a car from ${o}.`, kind, target: o, progress: 0, goal: 1, reward: Math.round(base / 50) * 50, rep: 60, expiresDay: exp };
    }
    case 'perfect':
      return { id: uid('gig'), npc, title: 'Clean shifts', desc: 'Make 3 PERFECT shifts in a single race.', kind, target: 3, progress: 0, goal: 3, reward: Math.round(base * 0.8 / 50) * 50, rep: 50, expiresDay: exp };
    case 'et': {
      const et = +(Math.max(9.5, 15.2 - tier * 1.25)).toFixed(1);
      return { id: uid('gig'), npc, title: `Break ${et.toFixed(1)}`, desc: `Run a quarter mile in under ${et.toFixed(1)} s.`, kind, target: et, progress: 0, goal: 1, reward: Math.round(base * 1.3 / 50) * 50, rep: 90, expiresDay: exp };
    }
    default:
      return { id: uid('gig'), npc, title: 'Extra hands', desc: 'Finish 2 daily jobs.', kind: 'jobs', target: 2, progress: 0, goal: 2, reward: Math.round(base * 0.6 / 50) * 50, rep: 40, expiresDay: exp };
  }
}

export function services(p: Profile, id: string, onChange: () => void): ServiceOffer[] {
  const n = NPC_BY_ID[id];
  const st = npcState(p, id);
  const tier = unlockedTier(p);
  const rng = new RNG(p.day * 977 + id.length * 31);
  const out: ServiceOffer[] = [];
  const done = (msg: string) => { onChange(); return msg; };
  const canGig = p.day - st.lastGig >= 2 && !p.gigs.some((g) => g.npc === id);
  if (n.service === 'gig' || n.service === 'loan' || n.service === 'bet') {
    out.push({
      label: 'Ask for work', desc: canGig ? 'Take a side gig. Finish it within 3 days for cash and rep.' : 'Come back in a couple of days.', enabled: canGig,
      run: () => { const g = makeGig(p, id, rng); p.gigs.push(g); st.lastGig = p.day; addNews(p, `New gig from ${n.name.split(' ')[0]}: ${g.title}`); return done(`"${g.desc}" Reward: ${fmtMoney(g.reward)}.`); },
    });
  }
  switch (n.service) {
    case 'discount': {
      const pct = st.affinity >= 2 ? Math.min(25, 10 + Math.floor(st.affinity / 3) * 5) : 0;
      out.push({
        label: `Ask for a deal (${pct || 0}% off today)`, desc: pct ? 'Mags knocks a percentage off every shop purchase today.' : 'Mags doesn\'t do favours for strangers. Talk to her more.', enabled: pct > 0 && !(p.discountDay === p.day && p.discount >= pct / 100),
        run: () => { p.discount = pct / 100; p.discountDay = p.day; return done(`"Fine. ${pct}% off today. Don\'t tell anyone."`); },
      });
      out.push({
        label: 'Help around the shop', desc: 'Sweep floors, sort bolts. $150 and Mags likes you more. Once a day.', enabled: !st.flags.includes('help' + p.day),
        run: () => { st.flags = st.flags.filter((f) => !f.startsWith('help')); st.flags.push('help' + p.day); st.affinity = Math.min(10, st.affinity + 1); earn(p, 150, 5); return done('"Not bad. Here\'s $150. Same time tomorrow?"'); },
      });
      break;
    }
    case 'bet': {
      for (const amt of [500, 1500, 4000].filter((a) => a <= 500 * (tier + 1) * 2)) {
        out.push({
          label: `Side bet: ${fmtMoney(amt)} on your next race`, desc: 'Double or nothing on your next race. Rico holds the cash.', enabled: !p.bet && p.money >= amt,
          run: () => { p.bet = { amount: amt, eventId: '' }; p.money -= amt; return done(`"${fmtMoney(amt)} on the rookie. Don\'t embarrass me."`); },
        });
      }
      break;
    }
    case 'loan': {
      const can = p.money < 800 && !st.flags.some((f) => f.startsWith('loan') && p.day - Number(f.slice(4)) < 5);
      out.push({
        label: 'Ask Earl for help ($1,200)', desc: 'If you\'re broke, Earl spots you some cash. No interest. Once every 5 days.', enabled: can,
        run: () => { st.flags.push('loan' + p.day); earn(p, 1200); return done('"Pay it forward someday, champ."'); },
      });
      break;
    }
    case 'photo': {
      const car = currentCar(p);
      const score = visualScore(car);
      const pay = Math.round((score * score * 0.9 + st.affinity * 40) / 10) * 10;
      const can = score >= 25 && !st.flags.includes('photo' + p.day);
      out.push({
        label: `Photo shoot (style ${score})`, desc: score >= 25 ? `Juno pays for a feature shoot of your current car: ${fmtMoney(pay)}.` : 'Juno needs a style rating of at least 25. Visit the body shop.', enabled: can,
        run: () => { st.flags = st.flags.filter((f) => !f.startsWith('photo')); st.flags.push('photo' + p.day); earn(p, pay, Math.round(score)); const m = CARS[car.modelId]; return done(`"Perfect light. The ${BRANDS[m.brand].name.split(' ')[0]} ${m.name} is going in the next issue." +${fmtMoney(pay)}`); },
      });
      break;
    }
    case 'intel': {
      const cost = 150 * (tier + 1);
      out.push({
        label: `Buy rival intel (${fmtMoney(cost)})`, desc: 'Reveals ET, power and driver skill for all of today\'s rivals.', enabled: p.money >= cost && p.intel.length === 0,
        run: () => { p.money -= cost; p.intel = p.events.map((e) => e.id); return done('"Here. Don\'t say where you got it."'); },
      });
      break;
    }
  }
  return out;
}

export interface RaceOutcomeForGigs { won: boolean; venue: string; et: number; distance: number; perfectShifts: number; modelId: string }

/** Updates gig progress after a race; returns completion messages. */
export function progressGigsRace(p: Profile, r: RaceOutcomeForGigs): string[] {
  const msgs: string[] = [];
  for (const g of p.gigs) {
    if (g.kind === 'winAt' && r.won && r.venue === g.target) g.progress++;
    if (g.kind === 'winOrigin' && r.won && BRANDS[CARS[r.modelId].brand].origin === g.target) g.progress++;
    if (g.kind === 'perfect' && r.perfectShifts >= Number(g.target)) g.progress = g.goal;
    if (g.kind === 'et' && Math.abs(r.distance - 402.336) < 1 && r.et > 0 && r.et <= Number(g.target)) g.progress = g.goal;
  }
  return payGigs(p, msgs);
}

export function progressGigsJob(p: Profile): string[] {
  for (const g of p.gigs) if (g.kind === 'jobs') g.progress++;
  return payGigs(p, []);
}

function payGigs(p: Profile, msgs: string[]): string[] {
  const done = p.gigs.filter((g) => g.progress >= g.goal);
  for (const g of done) {
    earn(p, g.reward, g.rep);
    const st = npcState(p, g.npc);
    st.affinity = Math.min(10, st.affinity + 2);
    const m = `Gig complete: ${g.title} — ${fmtMoney(g.reward)} from ${NPC_BY_ID[g.npc].name.split(' ')[0]}`;
    msgs.push(m);
    addNews(p, m);
  }
  p.gigs = p.gigs.filter((g) => g.progress < g.goal);
  return msgs;
}
