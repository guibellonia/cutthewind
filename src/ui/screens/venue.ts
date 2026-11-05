// Race venue: today's events, rival cards, entry.
import type { Game, Screen } from '../../game/game';
import type { RaceEvent } from '../../core/types';
import { currentCar, fmtMoney } from '../../core/state';
import { CARS, carFullName } from '../../data/cars';
import { LOCATIONS } from '../../game/venues';
import { buildSpec, estimate, perfRating } from '../../sim/index';
import { visualScore, styleLabel } from '../../game/style';
import { applyRaceResult } from '../../game/economy';
import { BOSSES } from '../../game/progression';
import { MARKS } from '../../sim/physics';
import { CarVisual } from '../../render/car';
import { btn, h, toast } from '../dom';
import { brandLogo, statsPanel, topBar } from '../common';
import { HubScreen } from './hub';
import { RaceScreen } from './race';
import { HangoutScreen } from './hangout';
import { EndingScreen } from './ending';

function distLabel(d: number) {
  return Math.abs(d - MARKS.eighth) < 1 ? '1/8 MILE' : Math.abs(d - MARKS.half) < 1 ? '1/2 MILE' : '1/4 MILE';
}

export class VenueScreen implements Screen {
  private sel: RaceEvent | null = null;
  private right!: HTMLElement;
  constructor(private game: Game, private venue: string) {}

  enter() {
    const g = this.game;
    const p = g.profile!;
    const loc = LOCATIONS.find((l) => l.id === this.venue)!;
    const garage = g.garageScene('home');
    (g as any).currentGarage = garage;
    const events = p.events.filter((e) => e.venue === this.venue);
    const boss = BOSSES.find((b) => b.venue === this.venue);
    const list = h('div', { class: 'panel scroll', style: { flex: '1' } },
      h('div', { class: 'panel-title' }, loc.name, h('small', {}, `Day ${p.day}`)),
      events.length ? null : h('p', { class: 'dim' }, 'No races here today.'),
      boss && !p.bosses.includes(boss.id) && !events.some((e) => e.boss) ? h('p', { class: 'dim', style: { fontSize: '13px' } }, `${boss.name} "${boss.nickname}" will race you at ${boss.rep.toLocaleString('en-US')} rep (you have ${p.rep.toLocaleString('en-US')}).`) : null,
      events.map((ev) => {
        const m = CARS[ev.rival.build.modelId];
        const it = h('div', { class: `item ${ev.completed ? 'locked' : ''}`, onClick: () => this.select(ev, it) },
          brandLogo(m.brand, 30),
          h('div', { class: 'grow' },
            h('div', { class: 'name', style: ev.boss ? { color: 'var(--pink)' } : {} }, ev.name),
            h('div', { class: 'dim', style: { fontSize: '12px' } }, `${ev.rival.name} · ${carFullName(m.id)} · ${distLabel(ev.distance)}`)),
          ev.completed ? h('span', { class: 'tag owned' }, 'Won') : h('span', { class: 'price' }, fmtMoney(ev.prize)));
        return it;
      }),
    );
    this.right = h('div', { class: 'col' });
    g.ui.append(
      topBar(g, loc.name, () => g.setScreen(new HubScreen(g, this.venue))),
      h('div', { class: 'shop-left' }, list, loc.npcs ? h('div', { class: 'panel tight' }, btn('Talk to ' + loc.npcs.map((n) => n).join(', ').toUpperCase(), () => g.setScreen(new HangoutScreen(g, this.venue)))) : null),
      h('div', { class: 'shop-right scroll' }, this.right),
    );
    const first = events.find((e) => !e.completed) ?? events[0];
    if (first) this.select(first, list.querySelectorAll('.item')[events.indexOf(first)] as HTMLElement);
  }

  private select(ev: RaceEvent, el?: HTMLElement) {
    const g = this.game;
    const p = g.profile!;
    this.sel = ev;
    document.querySelectorAll('.shop-left .item').forEach((x) => x.classList.remove('sel'));
    el?.classList.add('sel');
    const garage = (g as any).currentGarage;
    garage?.setCar(ev.rival.build);
    garage?.focus('hero');
    const r = ev.rival;
    const intel = p.intel.includes(ev.id);
    const est = estimate(r.build);
    const s = buildSpec(r.build);
    const mine = estimate(currentCar(p));
    const canPay = p.money >= ev.entryFee;
    this.right.innerHTML = '';
    this.right.append(
      h('div', { class: 'panel' },
        h('div', { class: 'panel-title' }, r.name, h('small', {}, `"${r.nickname}"`)),
        h('div', { class: 'dim' }, `${r.crew} · ${r.style} · Style ${visualScore(r.build)} (${styleLabel(visualScore(r.build))})`),
        h('div', { style: { fontFamily: 'var(--font)', fontWeight: '800', fontStyle: 'italic', fontSize: '20px', margin: '6px 0' } }, `${carFullName(r.build.modelId)} — "${r.build.buildName}"`),
        h('p', { style: { fontStyle: 'italic' } }, `“${r.quote}”`),
        h('div', { class: 'statrow' }, h('span', { class: 'k' }, 'Distance'), h('span', {}), h('span', { class: 'v' }, distLabel(ev.distance))),
        h('div', { class: 'statrow' }, h('span', { class: 'k' }, 'Entry fee'), h('span', {}), h('span', { class: 'v' }, fmtMoney(ev.entryFee))),
        h('div', { class: 'statrow' }, h('span', { class: 'k' }, 'Prize'), h('span', {}), h('span', { class: 'v', style: { color: 'var(--green)' } }, fmtMoney(ev.prize))),
        h('div', { class: 'statrow' }, h('span', { class: 'k' }, 'Reputation'), h('span', {}), h('span', { class: 'v', style: { color: 'var(--orange)' } }, `+${ev.rep}`)),
        intel
          ? h('div', { style: { marginTop: '8px', fontSize: '14px' } },
            h('div', {}, `INTEL: ~${s.peakHp.toFixed(0)} hp · ${s.mass.toFixed(0)} kg · ${s.drivetrain}`),
            h('div', {}, `Best possible 1/4: ${est.et.toFixed(2)} s (yours: ${mine.et.toFixed(2)} s) · PR ${perfRating(est.et)}`),
            h('div', {}, `Reaction ~${r.skill.reaction.toFixed(2)} s · Shift accuracy ${Math.round(r.skill.shiftAccuracy * 100)}% · Mistakes ${Math.round(r.skill.mistakeChance * 100)}%`))
          : h('p', { class: 'dim', style: { fontSize: '13px' } }, `Unknown performance. Buy intel from Dex at the Container Yard. Your car: PR ${perfRating(mine.et)} (${mine.et.toFixed(2)} s).`),
        h('div', { class: 'row end', style: { marginTop: '10px' } },
          btn(ev.completed ? 'Race again (no prize)' : `Race (${fmtMoney(ev.entryFee)})`, () => this.race(ev), 'primary', !canPay && !ev.completed)),
      ),
      statsPanel(g, currentCar(p)),
    );
  }

  private race(ev: RaceEvent) {
    const g = this.game;
    const p = g.profile!;
    if (!ev.completed) {
      if (p.money < ev.entryFee) { toast('Not enough cash for the entry fee', 'bad'); return; }
      p.money -= ev.entryFee;
    }
    g.save();
    const modelId = currentCar(p).modelId;
    const wasCompleted = ev.completed;
    g.setScreen(new RaceScreen(g, {
      venue: ev.venue, distance: ev.distance, rival: ev.rival, event: ev,
      onResultsUi: (res, host) => {
        if (wasCompleted) { host.append(h('p', { class: 'dim' }, 'Rematch — no prize money.')); return; }
        const sum = applyRaceResult(p, ev, res, modelId);
        g.save();
        host.append(h('div', { class: 'panel tight', style: { marginTop: '8px' } },
          h('div', { class: 'row', style: { gap: '20px' } }, h('div', { style: { color: 'var(--green)', fontSize: '22px', fontWeight: '800' } }, `+${'$' + sum.money.toLocaleString('en-US')}`), h('div', { style: { color: 'var(--orange)', fontSize: '22px', fontWeight: '800' } }, `+${sum.rep} REP`)),
          ...sum.lines.map((l) => h('div', { class: 'desc' }, '◆ ' + l))));
      },
      onFinish: (res) => {
        if (ev.story && res.won) g.setScreen(new EndingScreen(g));
        else g.setScreen(new VenueScreen(g, this.venue));
      },
    }));
    void CarVisual;
  }

  exit() {}
}
