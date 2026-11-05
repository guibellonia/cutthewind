// Player profile, persistence and economy helpers.
import type { CarBuild, RaceEvent } from './types';
import { blueHourBuild } from './builds';
import type { GraphicsSettings } from '../render/renderer';

export interface Gig {
  id: string;
  npc: string;
  title: string;
  desc: string;
  kind: 'winAt' | 'winOrigin' | 'style' | 'et' | 'perfect' | 'jobs' | 'winTier';
  target: string | number;
  progress: number;
  goal: number;
  reward: number;
  rep: number;
  expiresDay: number;
}

export interface DailyJob {
  id: string;
  type: 'dyno' | 'timing' | 'detail' | 'tires' | 'diagnose' | 'delivery';
  title: string;
  client: string;
  desc: string;
  pay: number;
  rep: number;
  done: boolean;
  result?: number; // 0..1 performance
}

export interface NpcState { affinity: number; lastTalk: number; lastGig: number; flags: string[] }

export interface Profile {
  version: number;
  name: string;
  money: number;
  rep: number;
  day: number;
  cars: CarBuild[];
  current: string;
  owned: string[]; // `${carUid}|${slot}|${partId}`
  tutorialDone: boolean;
  bosses: string[];
  stats: { races: number; wins: number; losses: number; bestEt: number; bestTrap: number; earned: number; jobs: number; perfectShifts: number };
  jobs: DailyJob[];
  jobsDay: number;
  events: RaceEvent[];
  eventsDay: number;
  npcs: Record<string, NpcState>;
  gigs: Gig[];
  news: string[];
  intel: string[]; // event ids with purchased rival intel
  bet: { amount: number; eventId: string } | null;
  discount: number; // fraction, today only
  discountDay: number;
}

export interface Settings {
  graphics: GraphicsSettings;
  audio: { master: number; music: number; sfx: number };
  units: 'kmh' | 'mph';
}

const SAVE_KEY = 'ctw_save_v1';
const SETTINGS_KEY = 'ctw_settings_v1';

export function newProfile(name: string): Profile {
  const car = blueHourBuild();
  return {
    version: 1,
    name,
    money: 0,
    rep: 0,
    day: 1,
    cars: [car],
    current: car.uid,
    owned: [],
    tutorialDone: false,
    bosses: [],
    stats: { races: 0, wins: 0, losses: 0, bestEt: 0, bestTrap: 0, earned: 0, jobs: 0, perfectShifts: 0 },
    jobs: [],
    jobsDay: 0,
    events: [],
    eventsDay: 0,
    npcs: {},
    gigs: [],
    news: [],
    intel: [],
    bet: null,
    discount: 0,
    discountDay: 0,
  };
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    if (!p || p.version !== 1 || !Array.isArray(p.cars) || !p.cars.length) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

export function deleteProfile() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function defaultSettings(): Settings {
  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4;
  return {
    graphics: { quality: lowEnd ? 'medium' : 'high', retro: 0.35, bloom: true, reflections: !lowEnd },
    audio: { master: 0.8, music: 0.5, sfx: 0.9 },
    units: 'kmh',
  };
}

export function loadSettings(): Settings {
  const d = defaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    return { graphics: { ...d.graphics, ...s.graphics }, audio: { ...d.audio, ...s.audio }, units: s.units ?? d.units };
  } catch {
    return d;
  }
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function currentCar(p: Profile): CarBuild {
  return p.cars.find((c) => c.uid === p.current) ?? p.cars[0];
}

export function owns(p: Profile, carUid: string, slot: string, id: string): boolean {
  if (id === 'stock' || id === 'none') return true;
  return p.owned.includes(`${carUid}|${slot}|${id}`);
}

export function addOwned(p: Profile, carUid: string, slot: string, id: string) {
  const k = `${carUid}|${slot}|${id}`;
  if (!p.owned.includes(k)) p.owned.push(k);
}

export function earn(p: Profile, amount: number, rep = 0) {
  p.money += amount;
  p.rep += rep;
  if (amount > 0) p.stats.earned += amount;
}

export function priceWithDiscount(p: Profile, price: number): number {
  const d = p.discountDay === p.day ? p.discount : 0;
  return Math.round(price * (1 - d));
}

export function fmtMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function addNews(p: Profile, msg: string) {
  p.news.unshift(msg);
  if (p.news.length > 30) p.news.length = 30;
}
