// City map hub: locations, daily status, gigs and news.
import type { Game, Screen } from '../../game/game';
import { LOCATIONS, type HubLocation } from '../../game/venues';
import { ensureDay, unlockedTier, BOSSES, finalUnlocked } from '../../game/progression';
import { audio } from '../../audio/audio';
import { currentCar, fmtMoney } from '../../core/state';
import { carFullName } from '../../data/cars';
import { NPC_BY_ID } from '../../data/npcs';
import { estimate, perfRating } from '../../sim/index';
import { visualScore } from '../../game/style';
import { btn, h } from '../dom';
import { topBar } from '../common';
import { optionsModal, TitleScreen } from './title';
import { GarageScreen } from './garage';
import { BodyShopScreen } from './bodyshop';
import { PerfShopScreen } from './perfshop';
import { DealerScreen } from './dealer';
import { JobsScreen } from './jobs';
import { HangoutScreen } from './hangout';
import { VenueScreen } from './venue';

export class HubScreen implements Screen {
  private sel: HubLocation | null = null;
  private side!: HTMLElement;
  constructor(private game: Game, private focus?: string) {}

  enter() {
    const g = this.game;
    const p = g.profile!;
    ensureDay(p);
    g.save();
    audio.musicOn(true);
    const garage = g.garageScene('home');
    garage.setCar(currentCar(p));
    garage.focus('overview');
    const map = h('div', { class: 'map' });
    map.append(this.mapSvg());
    const tier = unlockedTier(p);
    for (const loc of LOCATIONS) {
      const locked = loc.kind === 'venue' && (loc.tier ?? 0) > tier;
      const evCount = loc.kind === 'venue' ? p.events.filter((e) => e.venue === loc.id && !e.completed).length : loc.kind === 'jobs' ? p.jobs.filter((j) => !j.done).length : 0;
      const boss = loc.kind === 'venue' && p.events.some((e) => e.venue === loc.id && e.boss && !e.completed);
      const m = h('div', { class: `marker ${loc.kind === 'venue' ? 'venue' : loc.kind === 'hangout' ? 'hangout' : ''} ${locked ? 'locked' : ''}`, style: { left: loc.x * 100 + '%', top: loc.y * 100 + '%' }, onClick: () => this.select(loc) },
        h('div', { class: 'dot' }), h('div', { class: 'lbl' }, loc.name),
        evCount ? h('div', { class: 'badge', style: boss ? { background: '#ff2f8e' } : {} }, boss ? 'BOSS' : String(evCount)) : null);
      map.append(m);
    }
    this.side = h('div', { class: 'sidebar' });
    const news = p.news.length ? p.news.join('   ◆   ') : 'Welcome to the scene.';
    g.ui.append(h('div', { class: 'hub' },
      topBar(g, 'City', undefined),
      map, this.side,
      h('div', { class: 'ticker' }, h('div', { class: 'tape' }, news)),
      h('div', { style: { position: 'absolute', top: '12px', right: '380px' } }, btn('Options', () => optionsModal(g), 'small ghost'), ' ', btn('Title', () => { g.save(); g.setScreen(new TitleScreen(g)); }, 'small ghost')),
    ));
    const start = LOCATIONS.find((l) => l.id === (this.focus ?? 'garage'))!;
    this.select(start);
  }

  private mapSvg(): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 1000 700');
    svg.setAttribute('preserveAspectRatio', 'none');
    const add = (tag: string, attrs: Record<string, string | number>) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); svg.append(e); return e; };
    add('path', { d: 'M 760 0 C 720 160 900 260 860 420 C 830 540 940 620 1000 700 L 1000 0 Z', fill: '#06243a', opacity: 0.9 });
    add('path', { d: 'M 0 560 C 200 520 300 640 520 600 C 700 570 760 680 800 700 L 0 700 Z', fill: '#06243a', opacity: 0.7 });
    for (let i = 0; i < 30; i++) {
      const x = (i * 97) % 1000, y = (i * 53) % 700;
      add('rect', { x, y, width: 60 + (i % 5) * 20, height: 40 + (i % 4) * 18, fill: '#0b1626', stroke: '#13243a' });
    }
    const roads = ['M 0 430 L 1000 380', 'M 120 0 L 260 700', 'M 0 160 C 300 200 600 120 1000 200', 'M 480 0 L 520 700', 'M 300 700 C 400 520 650 520 760 300', 'M 700 0 L 640 700'];
    for (const d of roads) { add('path', { d, stroke: '#1d3a5a', 'stroke-width': 12, fill: 'none' }); add('path', { d, stroke: '#2fd3ff', 'stroke-width': 1.2, fill: 'none', opacity: 0.35, 'stroke-dasharray': '14 10' }); }
    return svg;
  }

  private select(loc: HubLocation) {
    const g = this.game;
    const p = g.profile!;
    this.sel = loc;
    document.querySelectorAll('.marker').forEach((m, i) => m.classList.toggle('sel', LOCATIONS[i] === loc));
    const tier = unlockedTier(p);
    const locked = loc.kind === 'venue' && (loc.tier ?? 0) > tier;
    const car = currentCar(p);
    const est = estimate(car);
    this.side.innerHTML = '';
    const go = () => this.enterLoc(loc);
    const bossInfo = loc.kind === 'venue' ? BOSSES.find((b) => b.venue === loc.id) : undefined;
    this.side.append(
      h('div', { class: 'panel' },
        h('div', { class: 'panel-title' }, loc.name),
        h('p', {}, loc.desc),
        loc.npcs ? h('p', { class: 'dim' }, 'Here: ' + loc.npcs.map((n) => NPC_BY_ID[n].name).join(', ')) : null,
        locked ? h('p', { style: { color: 'var(--red)' } }, `Locked — beat ${BOSSES[(loc.tier ?? 1) - 1]?.name ?? 'the previous boss'} to unlock this tier.`) : null,
        bossInfo && !locked ? h('p', { class: 'dim', style: { fontSize: '13px' } }, p.bosses.includes(bossInfo.id) ? `Boss ${bossInfo.nickname} beaten ✓` : `Boss: ${bossInfo.name} "${bossInfo.nickname}" — needs ${bossInfo.rep.toLocaleString('en-US')} rep.`) : null,
        h('div', { class: 'row end' }, btn(loc.kind === 'garage' ? 'Enter Garage' : 'Go', go, 'primary', locked)),
      ),
      h('div', { class: 'panel tight' },
        h('h3', {}, 'Current car'),
        h('div', { style: { fontFamily: 'var(--font)', fontWeight: '800', fontSize: '20px', fontStyle: 'italic' } }, `${carFullName(car.modelId)} "${car.buildName}"`),
        h('div', { class: 'dim', style: { fontSize: '13px' } }, `PR ${perfRating(est.et)} · 1/4 mile ~${est.et.toFixed(2)} s · Style ${visualScore(car)}`),
      ),
      h('div', { class: 'panel tight scroll', style: { flex: '1' } },
        h('h3', {}, `Day ${p.day} — To do`),
        h('div', { class: 'desc' }, `Jobs left: ${p.jobs.filter((j) => !j.done).length} · Races today: ${p.events.filter((e) => !e.completed).length}`),
        finalUnlocked(p) ? h('div', { style: { color: 'var(--red)', fontWeight: '800', margin: '6px 0' } }, '⚠ ADRIAN VOSS is waiting at Pier 9.') : null,
        p.gigs.length ? h('h3', { style: { marginTop: '10px' } }, 'Active gigs') : null,
        ...p.gigs.map((gg) => h('div', { class: 'desc', style: { margin: '4px 0' } }, `◆ ${gg.title} (${NPC_BY_ID[gg.npc].name.split(' ')[0]}) — ${gg.desc} ${gg.progress}/${gg.goal} · ${fmtMoney(gg.reward)} · until day ${gg.expiresDay}`)),
        p.bet ? h('div', { class: 'desc', style: { color: 'var(--orange)' } }, `Side bet with Rico: ${fmtMoney(p.bet.amount)} on your next race.`) : null,
      ),
    );
  }

  private enterLoc(loc: HubLocation) {
    const g = this.game;
    switch (loc.kind) {
      case 'garage': g.setScreen(new GarageScreen(g)); break;
      case 'body': g.setScreen(new BodyShopScreen(g)); break;
      case 'perf': g.setScreen(new PerfShopScreen(g)); break;
      case 'dealer': g.setScreen(new DealerScreen(g)); break;
      case 'jobs': g.setScreen(new JobsScreen(g)); break;
      case 'hangout': g.setScreen(new HangoutScreen(g, loc.id)); break;
      case 'venue': g.setScreen(new VenueScreen(g, loc.id)); break;
    }
  }

  exit() {}
}
