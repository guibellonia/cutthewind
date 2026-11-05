// Torque House: performance parts, engine swaps, dyno and tuning.
import type { Game, Screen } from '../../game/game';
import type { CarBuild } from '../../core/types';
import { cloneBuild } from '../../core/builds';
import { addOwned, currentCar, fmtMoney, owns, priceWithDiscount } from '../../core/state';
import { ENGINE_LIST, ENGINES } from '../../data/engines';
import { PERF_GROUPS, perfParts, type PerfSlot } from '../../data/perfParts';
import { engineOf, effectivePart } from '../../sim/vehicle';
import { unlockedTier } from '../../game/progression';
import { audio } from '../../audio/audio';
import { btn, h, toast } from '../dom';
import { dynoChart, statsPanel, topBar } from '../common';
import { HubScreen } from './hub';
import { HangoutScreen } from './hangout';
import { tuningPanel } from './garage';

export class PerfShopScreen implements Screen {
  private draft!: CarBuild;
  private group = 0;
  private slot: PerfSlot = 'intake';
  private left!: HTMLElement;
  private right!: HTMLElement;
  constructor(private game: Game) {}

  enter() {
    const g = this.game;
    this.draft = cloneBuild(currentCar(g.profile!));
    const garage = g.garageScene('home');
    (g as any).currentGarage = garage;
    garage.setCar(currentCar(g.profile!));
    garage.focus('front');
    this.left = h('div', { class: 'shop-left' });
    this.right = h('div', { class: 'shop-right scroll' });
    g.ui.append(topBar(g, 'Torque House — Performance', () => g.setScreen(new HubScreen(g, 'perf'))), this.left, this.right,
      h('div', { class: 'shop-bottom' },
        btn('Talk to Mags', () => g.setScreen(new HangoutScreen(g, 'perf')), 'small'),
        btn('Tuning', () => tuningPanel(g, currentCar(g.profile!), (b) => { Object.assign(currentCar(g.profile!), { tune: b.tune }); g.save(); this.draft = cloneBuild(currentCar(g.profile!)); this.render(); toast('Tune applied', 'good'); }), 'small'),
        btn('Dyno run', () => this.dyno(), 'small')));
    this.render();
  }

  private cost(slot: PerfSlot, id: string): number {
    const p = this.game.profile!;
    const cur = currentCar(p);
    if (slot === 'engineSwap') return id === 'stock' || owns(p, cur.uid, slot, id) ? 0 : priceWithDiscount(p, ENGINES[id]?.swapPrice ?? 0);
    const e = engineOf(this.draft);
    const part = perfParts(slot, e).find((x) => x.id === id);
    if (!part || owns(p, cur.uid, slot, id)) return 0;
    return priceWithDiscount(p, part.price);
  }

  private render() {
    const g = this.game;
    const p = g.profile!;
    const cur = currentCar(p);
    const tier = unlockedTier(p);
    const grp = PERF_GROUPS[this.group];
    if (!grp.slots.some((s) => s.slot === this.slot)) this.slot = grp.slots[0].slot;
    this.left.innerHTML = '';
    const list = h('div', { class: 'panel scroll', style: { flex: '1' } });
    this.left.append(
      h('div', { class: 'panel tight' },
        h('div', { class: 'tabs' }, PERF_GROUPS.map((gg, i) => h('div', { class: `tab ${i === this.group ? 'sel' : ''}`, onClick: () => { this.group = i; this.render(); } }, gg.title))),
        h('div', { class: 'tabs', style: { marginBottom: 0 } }, grp.slots.map((s) => h('div', { class: `tab ${s.slot === this.slot ? 'sel' : ''}`, style: { fontSize: '13px' }, onClick: () => { this.slot = s.slot; this.draft = cloneBuild(cur); this.render(); } }, s.label)))),
      list);
    const e = engineOf(cur);
    if (this.slot === 'engineSwap') {
      const opts = [{ id: 'stock', name: `Factory engine`, desc: 'Return to the original engine.', price: 0, tier: 0 }, ...ENGINE_LIST.map((en) => ({ id: en.id, name: `${en.name} — ${en.displacement.toFixed(1)} L ${en.layout} ${en.aspiration}`, desc: `${en.powerHp} hp / ${en.torqueNm} Nm · ${en.weight} kg · ${en.description}`, price: en.swapPrice, tier: en.swapPrice > 15000 ? 2 : en.swapPrice > 8000 ? 1 : 0 }))];
      for (const o of opts) list.append(this.row(o.id, o.name, o.desc, o.price, o.tier, tier, cur));
    } else {
      for (const part of perfParts(this.slot, e)) list.append(this.row(part.id, part.name, `${part.maker} — ${part.desc}`, part.price, part.tier, tier, cur));
    }
    this.renderRight();
  }

  private row(id: string, name: string, desc: string, price: number, ptier: number, tier: number, cur: CarBuild): HTMLElement {
    const p = this.game.profile!;
    const installed = (cur.perf as any)[this.slot] === id;
    const selected = (this.draft.perf as any)[this.slot] === id;
    const owned = owns(p, cur.uid, this.slot, id);
    const locked = ptier > tier;
    return h('div', { class: `item ${selected ? 'sel' : ''} ${locked ? 'locked' : ''}`, onClick: () => { if (locked) { toast(`Unlocks at tier ${ptier + 1}`, 'bad'); return; } (this.draft.perf as any)[this.slot] = id; this.render(); } },
      h('div', { class: 'grow' }, h('div', { class: 'name' }, name), h('div', { class: 'desc' }, desc)),
      installed ? h('span', { class: 'tag inst' }, 'Installed') : owned ? h('span', { class: 'tag owned' }, 'Owned') : locked ? h('span', { class: 'tag' }, `Tier ${ptier + 1}`) : h('span', { class: 'price' }, price ? fmtMoney(priceWithDiscount(p, price)) : '—'));
  }

  private renderRight() {
    const g = this.game;
    const p = g.profile!;
    const cur = currentCar(p);
    const id = (this.draft.perf as any)[this.slot];
    const changed = id !== (cur.perf as any)[this.slot];
    const cost = changed ? this.cost(this.slot, id) : 0;
    this.right.innerHTML = '';
    this.right.append(
      h('div', { class: 'panel' },
        h('div', { class: 'panel-title' }, changed ? 'Preview' : 'Installed', h('small', {}, p.discountDay === p.day && p.discount ? `Mags' deal: ${Math.round(p.discount * 100)}% off` : '')),
        h('div', { class: 'row between' }, h('div', { class: 'bigstat', style: { fontSize: '26px', color: 'var(--green)' } }, changed ? fmtMoney(cost) : '—'), h('div', { class: 'dim' }, `Cash ${fmtMoney(p.money)}`)),
        h('div', { class: 'row end', style: { marginTop: '8px' } }, btn(cost ? 'Buy & Install' : 'Install', () => this.install(), 'primary', !changed || cost > p.money))),
      statsPanel(g, cur, changed ? this.draft : undefined),
      h('div', { class: 'panel tight' }, h('h3', {}, 'Dyno'), dynoChart(cur, changed ? this.draft : undefined, 300, 160)),
    );
  }

  private install() {
    const g = this.game;
    const p = g.profile!;
    const cur = currentCar(p);
    const id = (this.draft.perf as any)[this.slot];
    const cost = this.cost(this.slot, id);
    if (cost > p.money) { toast('Not enough cash', 'bad'); audio.error(); return; }
    p.money -= cost;
    addOwned(p, cur.uid, this.slot, id);
    (cur.perf as any)[this.slot] = id;
    // keep dependent slots valid (e.g. turbo kit after an engine swap)
    const e = engineOf(cur);
    for (const s of ['turbo', 'supercharger', 'intake'] as PerfSlot[]) (cur.perf as any)[s] = effectivePart(s, (cur.perf as any)[s], e).id;
    if (cur.perf.turbo !== 'none' && cur.perf.turbo !== 'stock') cur.perf.supercharger = e.aspiration === 'supercharged' ? 'stock' : 'none';
    g.save();
    audio.cash();
    toast(`Installed ${id === 'stock' ? 'factory part' : ''} — ${fmtMoney(cost)}`, 'good');
    this.draft = cloneBuild(cur);
    this.render();
  }

  private dyno() {
    const g = this.game;
    const cur = currentCar(g.profile!);
    import('../dom').then(({ modal }) => {
      let close = () => {};
      const c = dynoChart(cur, undefined, 640, 320);
      close = modal(h('div', {}, h('h2', {}, 'Dyno run'), c, h('p', { class: 'dim' }, 'Wheel-independent crank figures at full boost. Blue: power. Orange: torque.'), h('div', { class: 'row end' }, btn('Close', () => close(), 'primary'))), { wide: true });
    });
  }

  exit() {}
}
