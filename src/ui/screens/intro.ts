// Tutorial: the underground meet at Pier 9, before and after the first race.
import * as THREE from 'three';
import type { Game, Screen } from '../../game/game';
import { blackoutBuild, blueHourBuild } from '../../core/builds';
import { CarVisual } from '../../render/car';
import { LANE_X, StripScene } from '../../render/stripScene';
import { MARKS } from '../../sim/physics';
import { generateRival } from '../../game/rivals';
import { RNG } from '../../core/rng';
import { audio } from '../../audio/audio';
import { runDialog, type Line } from '../dialog';
import { btn, h } from '../dom';
import { RaceScreen, type RaceResult } from './race';
import type { RivalProfile } from '../../core/types';
import { earn, fmtMoney, addNews } from '../../core/state';
import { HubScreen } from './hub';

export const VOSS_COLOR = '#ff3b3b';
const P_COLOR = '#2fd3ff';
const RICO = '#ffcc00';

export function tutorialRival(): RivalProfile {
  return {
    id: 'voss_tutorial', name: 'Adrian Voss', nickname: 'BLACKOUT', crew: 'BLACKOUT', style: 'Professional', build: blackoutBuild(),
    skill: { reaction: 0.3, reactionVar: 0.04, launchAccuracy: 0.8, shiftAccuracy: 0.85, shiftBias: -0.12, nitroSkill: 0, mistakeChance: 0, throttleCap: [1, 0.9, 0.72, 0.66, 0.64, 0.64] },
    quote: 'We\'ll see how long that confidence lasts.', winQuote: 'Not bad. Maybe there\'s something under that hood after all.', loseQuote: 'Not bad. Maybe there\'s something under that hood after all.', targetEt: 12.1, boss: true,
  };
}

class MeetView {
  strip: StripScene;
  cars: CarVisual[] = [];
  t = 0;
  constructor(game: Game, after = false) {
    this.strip = new StripScene(game.renderer, 'pier9', MARKS.quarter, { meet: true });
    const p = new CarVisual(game.profile!.cars[0] ?? blueHourBuild(), { beams: true });
    p.root.position.set(LANE_X.player, 0, -1.2 - p.shape.zF);
    this.strip.scene.add(p.root);
    this.cars.push(p);
    if (!after) {
      const r = new CarVisual(blackoutBuild(), { beams: true });
      r.root.position.set(LANE_X.rival, 0, -1.2 - r.shape.zF);
      this.strip.scene.add(r.root);
      this.cars.push(r);
    }
    // parked meet cars along the sides
    const rng = new RNG(2004);
    for (let i = 0; i < 6; i++) {
      const rv = generateRival({ tier: i % 3, difficulty: rng.next(), playerEt: 14, playerStyle: 35 + i * 8, seed: 900 + i });
      const c = new CarVisual(rv.build, { beams: false });
      const sx = i % 2 ? 1 : -1;
      c.root.position.set(sx * (5.6 + (i % 3) * 0.2), 0, -14 - Math.floor(i / 2) * 5.5);
      c.root.rotation.y = sx * 0.9 + Math.PI;
      c.setLights(false);
      this.strip.scene.add(c.root);
      this.cars.push(c);
    }
    this.strip.setTree('player', { pre: false, stage: false, amber: 0, green: false, red: false });
    game.setView(this.strip.scene, this.strip.camera, (dt) => this.update(dt));
  }
  update(dt: number) {
    this.t += dt;
    const cam = this.strip.camera;
    const a = this.t * 0.07 + 0.6;
    cam.position.set(Math.sin(a) * 8.5, 1.6 + Math.sin(this.t * 0.3) * 0.2, -4 + Math.cos(a) * 8.5);
    cam.lookAt(0, 0.6, -3);
    cam.fov = 45;
    cam.updateProjectionMatrix();
    for (const c of this.cars) c.update(dt, { speed: 0, accel: 0, braking: false, rpm: 950, redline: 7000, nitro: false, throttle: 0.1 });
    this.strip.updateCarLights(this.cars.slice(0, 2).map((c) => c.root.position));
  }
  dispose() {
    for (const c of this.cars) c.dispose();
    this.strip.dispose();
  }
}

export class IntroScreen implements Screen {
  private view: MeetView | null = null;
  private stopDialog: (() => void) | null = null;
  constructor(private game: Game) {}

  enter() {
    const g = this.game;
    g.releaseGarage();
    audio.musicOn(false);
    audio.crowd(true);
    this.view = new MeetView(g);
    const name = g.profile!.name.toUpperCase();
    const lines: Line[] = [
      { who: 'PIER 9 · THURSDAY · 11:48 PM', text: 'Every Thursday the underground takes over the old container pier. Two lanes, one tree, a few hundred people and a lot of money changing hands.', color: '#8b9bb0' },
      { who: 'PIER 9 · THURSDAY · 11:48 PM', text: `${name} rolls in with a Kairo Kestrel 2.0T called BLUE HOUR — a 1998 coupe built in a rented garage, one weekend at a time.`, color: '#8b9bb0' },
      { who: 'RICO SALAZAR', text: 'Alright, alright! Who\'s running tonight? Pot\'s open, lanes are clean!', color: RICO },
      { who: 'ADRIAN VOSS', text: 'That\'s what you brought here?', color: VOSS_COLOR, side: 'right' },
      { who: name, text: 'Didn\'t think I\'d need much.', color: P_COLOR },
      { who: 'ADRIAN VOSS', text: 'We\'ll see how long that confidence lasts.', color: VOSS_COLOR, side: 'right' },
      { who: 'RICO SALAZAR', text: 'Werkhaus Strasse 600R versus Kairo Kestrel! Quarter mile! Stage \'em up, people!', color: RICO },
      { who: 'MAGS (on the phone)', text: `Kid, it's Mags. I heard. Listen to me and you might not embarrass yourself. I'll talk you through it.`, color: '#ff8a1f' },
    ];
    this.stopDialog = runDialog(g.ui, lines, () => this.toRace());
    g.ui.append(h('div', { style: { position: 'absolute', top: '16px', right: '16px' } }, btn('Skip ▸▸', () => { this.stopDialog?.(); this.toRace(); }, 'small ghost')));
  }

  private toRace() {
    const g = this.game;
    g.setScreen(new RaceScreen(g, {
      venue: 'pier9', distance: MARKS.quarter, rival: tutorialRival(), tutorial: true,
      onFinish: (res) => g.setScreen(new OutroScreen(g, res)),
    }));
  }

  exit() {
    this.stopDialog?.();
    this.view?.dispose();
    this.view = null;
  }
}

export class OutroScreen implements Screen {
  private view: MeetView | null = null;
  constructor(private game: Game, private res: RaceResult) {}
  enter() {
    const g = this.game;
    const p = g.profile!;
    this.view = new MeetView(g, true);
    const won = this.res.won;
    const name = p.name.toUpperCase();
    const prize = won ? 2500 : 1500;
    const lines: Line[] = [
      { who: 'ADRIAN VOSS', text: won ? 'Huh.' : 'Close. Closer than it should have been.', color: VOSS_COLOR, side: 'right' },
      { who: 'ADRIAN VOSS', text: 'Not bad. Maybe there\'s something under that hood after all.', color: VOSS_COLOR, side: 'right' },
      { who: 'PIER 9', text: 'The black Strasse idles away into the dark, quad exhausts crackling off the containers.', color: '#8b9bb0' },
      { who: 'RICO SALAZAR', text: won ? `${name}! You just beat Voss in a Kestrel! People bet on that. Here's your cut — ${fmtMoney(prize)}.` : `You lost, but nobody keeps up with Voss in a Kestrel. The crowd loved it. Take ${fmtMoney(prize)} from the side bets.`, color: RICO },
      { who: 'RICO SALAZAR', text: 'Come back to Pier 9 any night. Win, build a name, and the big crews will notice. Voss included.', color: RICO },
      { who: 'MAGS', text: 'Swing by Torque House tomorrow. That Kestrel can take a lot more boost — and you need money. I always need hands on the job board.', color: '#ff8a1f' },
      { who: name, text: 'Next time, Voss.', color: P_COLOR },
    ];
    runDialog(g.ui, lines, () => {
      earn(p, prize, won ? 300 : 120);
      p.tutorialDone = true;
      p.stats.races++;
      if (won) p.stats.wins++; else p.stats.losses++;
      if (this.res.player.et > 0) p.stats.bestEt = this.res.player.et;
      addNews(p, won ? 'RUMOUR: rookie in a Kestrel beat Adrian Voss at Pier 9' : 'Rookie in a Kestrel nearly kept up with Voss at Pier 9');
      addNews(p, 'Torque House is hiring: check the job board for daily work');
      g.save();
      g.setScreen(new HubScreen(g));
    });
    void THREE;
  }
  exit() {
    audio.crowd(false);
    this.view?.dispose();
    this.view = null;
  }
}
