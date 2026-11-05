// Hangouts: talk to NPCs, take gigs, use their services.
import type { Game, Screen } from '../../game/game';
import { fmtMoney } from '../../core/state';
import { NPC_BY_ID } from '../../data/npcs';
import { LOCATIONS } from '../../game/venues';
import { affinityTier, chat, npcState, services } from '../../game/npc';
import { audio } from '../../audio/audio';
import { btn, h, toast } from '../dom';
import { topBar } from '../common';
import { HubScreen } from './hub';

export class HangoutScreen implements Screen {
  private npc: string;
  private body!: HTMLElement;
  private lines: string[] = [];
  constructor(private game: Game, private loc: string) {
    this.npc = LOCATIONS.find((l) => l.id === loc)?.npcs?.[0] ?? 'mags';
  }

  enter() {
    const g = this.game;
    const L = LOCATIONS.find((l) => l.id === this.loc)!;
    const garage = g.garageScene('home');
    garage.focus('overview');
    this.body = h('div', { style: { position: 'absolute', left: '16px', right: '16px', top: '64px', bottom: '16px', display: 'flex', gap: '12px' } });
    g.ui.append(topBar(g, L.name, () => g.setScreen(new HubScreen(g, this.loc))), this.body);
    this.talk();
  }

  private talk() {
    const r = chat(this.game.profile!, this.npc);
    this.lines = r.lines;
    this.game.save();
    this.render();
  }

  private render() {
    const g = this.game;
    const p = g.profile!;
    const L = LOCATIONS.find((l) => l.id === this.loc)!;
    const n = NPC_BY_ID[this.npc];
    const st = npcState(p, this.npc);
    this.body.innerHTML = '';
    const people = h('div', { class: 'panel', style: { width: '300px' } }, h('div', { class: 'panel-title' }, 'People'),
      (L.npcs ?? []).map((id) => {
        const nn = NPC_BY_ID[id];
        return h('div', { class: `item ${id === this.npc ? 'sel' : ''}`, onClick: () => { this.npc = id; this.talk(); } },
          h('div', { class: 'portrait', style: { background: nn.color, color: nn.accent, width: '42px', height: '42px', fontSize: '20px' } }, nn.name.replace(/".*?"\s*/, '').split(' ').map((w) => w[0]).join('').slice(0, 2)),
          h('div', { class: 'grow' }, h('div', { class: 'name', style: { fontSize: '15px' } }, nn.name), h('div', { class: 'dim', style: { fontSize: '11px' } }, nn.role)));
      }));
    const offers = services(p, this.npc, () => { g.save(); });
    const myGigs = p.gigs.filter((x) => x.npc === this.npc);
    const main = h('div', { class: 'panel grow col' },
      h('div', { class: 'row' },
        h('div', { class: 'portrait', style: { background: n.color, color: n.accent, width: '90px', height: '90px', fontSize: '40px' } }, n.name.replace(/".*?"\s*/, '').split(' ').map((w) => w[0]).join('').slice(0, 2)),
        h('div', { class: 'grow' }, h('h2', { style: { margin: 0 } }, n.name), h('div', { class: 'dim' }, n.role), h('div', { class: 'desc' }, n.bio),
          h('div', { style: { marginTop: '4px', color: 'var(--pink)' } }, `Relationship: ${'♦'.repeat(affinityTier(st.affinity) + 1)}${'◇'.repeat(3 - affinityTier(st.affinity))} (${st.affinity}/10)`))),
      h('div', { class: 'panel tight', style: { background: 'rgba(0,0,0,0.35)' } }, this.lines.map((l, i) => h('p', { style: { fontSize: i === 0 ? '20px' : '17px', fontStyle: 'italic', color: i === 0 ? '#fff' : '#cfdbe8' } }, `“${l}”`))),
      h('h3', {}, 'Options'),
      offers.map((o) => h('div', { class: 'row', style: { margin: '3px 0' } }, btn(o.label, () => { const msg = o.run(); toast(msg, 'good', 3800); audio.cash(); this.lines = [msg]; this.render(); }, 'small', !o.enabled), h('span', { class: 'desc grow' }, o.desc))),
      myGigs.length ? h('h3', {}, 'Active gigs from ' + n.name.split(' ')[0]) : null,
      myGigs.map((gg) => h('div', { class: 'desc' }, `◆ ${gg.title}: ${gg.desc} (${gg.progress}/${gg.goal}) — ${fmtMoney(gg.reward)}, until day ${gg.expiresDay}`)),
    );
    this.body.append(people, main);
  }

  exit() {}
}
