// Hub locations and venues.
import { TIERS } from './rivals';
import { unlockedTier as ut } from './progression';

export interface HubLocation { id: string; name: string; kind: 'garage' | 'body' | 'perf' | 'dealer' | 'jobs' | 'venue' | 'hangout'; x: number; y: number; desc: string; tier?: number; npcs?: string[] }

export const LOCATIONS: HubLocation[] = [
  { id: 'garage', name: 'YOUR GARAGE', kind: 'garage', x: 0.18, y: 0.62, desc: 'Your cars, tuning and the end of the day.' },
  { id: 'body', name: 'CHROMA BODY & PAINT', kind: 'body', x: 0.34, y: 0.4, desc: 'Body kits, wheels, paint, vinyls, neon, interior.' },
  { id: 'perf', name: 'TORQUE HOUSE', kind: 'perf', x: 0.5, y: 0.6, desc: 'Performance parts, dyno and tuning. Ask for Mags.', npcs: ['mags'] },
  { id: 'dealer', name: 'PREMIER AUTO', kind: 'dealer', x: 0.66, y: 0.32, desc: 'New and used cars. Trade-ins welcome.' },
  { id: 'jobs', name: 'JOB BOARD', kind: 'jobs', x: 0.28, y: 0.8, desc: 'Daily mechanic and courier jobs. Reliable money.' },
  { id: 'diner', name: 'EARL\'S 24H DINER', kind: 'hangout', x: 0.44, y: 0.18, desc: 'Coffee, pie and gossip. Big Earl and Juno hang out here.', npcs: ['earl', 'juno'] },
  { id: 'docks', name: 'CONTAINER YARD', kind: 'hangout', x: 0.82, y: 0.78, desc: 'Hana\'s imports and Dex\'s information business.', npcs: ['hana', 'dex'] },
  { id: 'pier9', name: 'PIER 9 DOCKS', kind: 'venue', x: 0.7, y: 0.62, desc: 'Street tier drags. Where everybody starts.', tier: 0, npcs: ['rico'] },
  { id: 'foundry', name: 'FOUNDRY ROW', kind: 'venue', x: 0.12, y: 0.24, desc: 'Underground tier. Industrial strip between the smelters.', tier: 1 },
  { id: 'airfield', name: 'KESSLER AIRFIELD', kind: 'venue', x: 0.88, y: 0.2, desc: 'Pro circuit on the old runway. Half-mile runs.', tier: 2 },
  { id: 'canal', name: 'CANAL EXPRESSWAY', kind: 'venue', x: 0.58, y: 0.88, desc: 'Legend tier under the overpasses.', tier: 3 },
];

export const TIERS_VENUES = TIERS.slice(0, 4).map((t) => ({ id: t.venue, name: LOCATIONS.find((l) => l.id === t.venue)!.name, tier: t.id }));
export const unlockedTier = ut;
