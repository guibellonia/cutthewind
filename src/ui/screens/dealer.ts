// Premier Auto: buy cars from the seven fictional manufacturers.
import type { Game, Screen } from '../../game/game';
import { stockBuild } from '../../core/builds';
import { fmtMoney } from '../../core/state';
import { BRANDS, BRAND_LIST } from '../../data/brands';
import { CAR_LIST, CARS } from '../../data/cars';
import { ENGINES } from '../../data/engines';
import { audio } from '../../audio/audio';
import { btn, confirmBox, h, toast } from '../dom';
import { brandLogo, statsPanel, topBar } from '../common';
import { HubScreen } from './hub';

export class DealerScreen implements Screen {
  private sel = CAR_LIST[0].id;
  private left!: HTMLElement;
  private right!: HTMLElement;
  constructor(private game: Game) {}

  enter() {
    const g = this.game;
    const garage = g.garageScene('showroom');
    (g as any).currentGarage = garage;
    this.left = h('div', { class: 'shop-left' });
    this.right = h('div', { class: 'shop-right scroll' });
    g.ui.append(topBar(g, 'Premier Auto', () => { g.releaseGarage(); g.setScreen(new HubScreen(g, 'dealer')); }), this.left, this.right,
      h('div', { class: 'shop-bottom' }, (['hero', 'front', 'side', 'rear', 'interior'] as const).map((f) => btn(f, () => garage.focus(f), 'small ghost'))));
    this.render();
  }

  private render() {
    const g = this.game;
    const p = g.profile!;
    this.left.innerHTML = '';
    const list = h('div', { class: 'panel scroll', style: { flex: '1' } }, h('div', { class: 'panel-title' }, 'Showroom', h('small', {}, `${CAR_LIST.length} models`)));
    for (const b of BRAND_LIST) {
      list.append(h('div', { class: 'row', style: { margin: '10px 0 4px' } }, brandLogo(b.id, 26), h('h3', { style: { margin: 0 } }, b.name)));
      for (const m of CAR_LIST.filter((c) => c.brand === b.id)) {
        const ownedN = p.cars.filter((c) => c.modelId === m.id).length;
        list.append(h('div', { class: `item ${m.id === this.sel ? 'sel' : ''}`, onClick: () => { this.sel = m.id; this.render(); } },
          h('div', { class: 'grow' }, h('div', { class: 'name' }, `${m.name} ${m.trim}`), h('div', { class: 'dim', style: { fontSize: '12px' } }, `${m.year} · ${ENGINES[m.engineId].powerHp} hp · ${m.drivetrain}`)),
          ownedN ? h('span', { class: 'tag owned' }, `Owned ×${ownedN}`) : null,
          h('span', { class: 'price' }, fmtMoney(m.price))));
      }
    }
    this.left.append(list);
    const m = CARS[this.sel];
    const b = BRANDS[m.brand];
    const build = stockBuild(m.id);
    (g as any).currentGarage?.setCar(build);
    (g as any).currentGarage?.focus('hero');
    this.right.innerHTML = '';
    this.right.append(
      h('div', { class: 'panel' },
        h('div', { class: 'row' }, brandLogo(m.brand, 48), h('div', {}, h('h2', { style: { margin: 0 } }, `${m.name} ${m.trim}`), h('div', { class: 'dim' }, `${b.name} · ${b.origin} · ${m.year}`))),
        h('p', {}, m.description),
        h('div', { class: 'desc' }, `Engine: ${ENGINES[m.engineId].name} — ${ENGINES[m.engineId].description}`),
        h('div', { class: 'row between', style: { marginTop: '10px' } }, h('div', { class: 'bigstat', style: { fontSize: '28px', color: 'var(--green)' } }, fmtMoney(m.price)), h('div', { class: 'dim' }, `Cash ${fmtMoney(p.money)}`)),
        h('div', { class: 'row end', style: { marginTop: '8px' } }, btn('Buy', () => this.buy(), 'primary', p.money < m.price))),
      statsPanel(g, build),
    );
  }

  private buy() {
    const g = this.game;
    const p = g.profile!;
    const m = CARS[this.sel];
    if (p.money < m.price) { toast('Not enough cash', 'bad'); audio.error(); return; }
    confirmBox('Buy car', `Buy a ${m.year} ${BRANDS[m.brand].name.split(' ')[0]} ${m.name} ${m.trim} for ${fmtMoney(m.price)}?`, 'Buy', () => {
      p.money -= m.price;
      const c = stockBuild(m.id);
      p.cars.push(c);
      p.current = c.uid;
      g.save();
      audio.cash();
      toast(`${m.name} delivered to your garage`, 'good');
      this.render();
    });
  }

  exit() {}
}
