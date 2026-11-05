// Chroma Body & Paint: kits, lights, wheels, paint, vinyl editor, neon & glass, interior.
import type { Game, Screen } from '../../game/game';
import type { CarBuild, PaintFinish, VinylLayer, VinylShape } from '../../core/types';
import { cloneBuild, uid } from '../../core/builds';
import { addOwned, currentCar, fmtMoney, owns, priceWithDiscount } from '../../core/state';
import { CARS } from '../../data/cars';
import { EXHAUST_FINISHES, VISUAL_SLOT_LABELS, visualPart, visualParts, WHEEL_DESIGNS, WHEEL_FINISHES, wheelPrice, type VisualSlot } from '../../data/visualParts';
import { INTERIOR_COLORS, INTERIOR_MATERIALS, INTERIOR_PARTS } from '../../data/perfParts';
import { unlockedTier } from '../../game/progression';
import { visualScore, styleLabel } from '../../game/style';
import { LOGO_IDS, SPONSORS } from '../../render/logos';
import { REGIONS, paintAtlas } from '../../render/vinyl';
import { ATLAS } from '../../render/bodyMesh';
import type { FocusPreset, GarageScene } from '../../render/garageScene';
import { audio } from '../../audio/audio';
import { btn, colorInput, confirmBox, h, select, slider, toast, append } from '../dom';
import { statsPanel, topBar } from '../common';
import { HubScreen } from './hub';

const PAINT_SWATCHES = ['#1c2154', '#d9dbe0', '#0f0f12', '#c4161c', '#e0b321', '#ff6a00', '#1f8fd8', '#2a6b3c', '#7a2bd8', '#ff3fa4', '#5c6773', '#24262b', '#8c949c', '#f2f2f2', '#30d0ff', '#19c37d'];
const VINYL_SWATCHES = ['#ffffff', '#111214', '#8fd3ff', '#c1121f', '#ffcc00', '#ff6a00', '#40ff90', '#b06aff', '#ff2a6a', '#7d8590', '#c9d1dc', '#1c2154'];
const FINISH_COST: Record<PaintFinish, number> = { solid: 500, metallic: 700, pearl: 1300, matte: 1100, candy: 1500, chrome: 3200, carbon: 3800 };

type Tab = 'kits' | 'lights' | 'wheels' | 'paint' | 'vinyls' | 'neon' | 'interior';
const KIT_SLOTS: VisualSlot[] = ['frontBumper', 'rearBumper', 'sideSkirts', 'frontFenders', 'rearFenders', 'hood', 'hoodScoop', 'spoiler', 'splitter', 'diffuser', 'canards', 'mirrors', 'roof', 'exhaust'];
const SLOT_CAM: Partial<Record<VisualSlot, FocusPreset>> = {
  frontBumper: 'front', rearBumper: 'rear', sideSkirts: 'side', frontFenders: 'front', rearFenders: 'rear', hood: 'hood', hoodScoop: 'hood',
  spoiler: 'rear', splitter: 'front', diffuser: 'exhaust', canards: 'front', mirrors: 'front', roof: 'roof', exhaust: 'exhaust', headlights: 'front', taillights: 'rear',
};

/** Cost of turning `cur` into `next`, given what the player already owns. */
export function visualCost(game: Game, cur: CarBuild, next: CarBuild): { total: number; items: string[] } {
  const p = game.profile!;
  const items: string[] = [];
  let total = 0;
  const add = (label: string, price: number) => { if (price > 0) { total += price; items.push(`${label} — ${fmtMoney(price)}`); } };
  const cv = cur.visual, nv = next.visual;
  for (const s of [...KIT_SLOTS, 'headlights', 'taillights'] as VisualSlot[]) {
    const id = (nv as any)[s];
    if (id !== (cv as any)[s] && !owns(p, cur.uid, s, id)) add(visualPart(s, id).name, visualPart(s, id).price);
  }
  const w0 = cv.wheels, w1 = nv.wheels;
  if (w1.design !== w0.design || w1.size !== w0.size) {
    const d = WHEEL_DESIGNS.find((w) => w.id === w1.design)!;
    if (!owns(p, cur.uid, 'wheels', `${w1.design}@${w1.size}`)) add(`${d.name} ${w1.size}"`, wheelPrice(d, w1.size) + (w1.size !== w0.size ? 300 : 0));
  }
  if (w1.finish !== w0.finish || w1.color !== w0.color) add('Wheel refinish', 250);
  if (w1.tireWidth !== w0.tireWidth || w1.profile !== w0.profile || w1.width !== w0.width) add('Tyres & fitment', 180 + Math.max(0, w1.tireWidth - 205) * 4);
  if (nv.paint.color !== cv.paint.color || nv.paint.finish !== cv.paint.finish || nv.paint.pearl !== cv.paint.pearl) add(`${nv.paint.finish} paint job`, FINISH_COST[nv.paint.finish]);
  if (nv.caliperColor !== cv.caliperColor) add('Caliper paint', 120);
  if (nv.spoilerFinish !== cv.spoilerFinish) add('Spoiler finish', 150);
  if (nv.exhaustFinish !== cv.exhaustFinish) add('Exhaust tips finish', 120);
  const oldV = new Map(cv.vinyls.map((l) => [l.id, JSON.stringify(l)]));
  const changed = nv.vinyls.filter((l) => oldV.get(l.id) !== JSON.stringify(l)).length;
  if (changed) add(`Vinyl work (${changed} layer${changed > 1 ? 's' : ''})`, changed * 45);
  if (nv.neon.enabled && !cv.neon.enabled) add('Neon underglow kit', 450);
  else if (nv.neon.enabled && (nv.neon.color !== cv.neon.color || nv.neon.mode !== cv.neon.mode)) add('Neon colour', 90);
  if (Math.abs(nv.windowTint - cv.windowTint) > 0.01 || nv.tintColor !== cv.tintColor) add('Window tint', 150);
  if (nv.plate !== cv.plate) add('Custom plate', 60);
  for (const ip of INTERIOR_PARTS) {
    const id = (nv.interior as any)[ip.slot];
    if (id === ip.id && id !== (cv.interior as any)[ip.slot] && !owns(p, cur.uid, 'int_' + ip.slot, id)) add(ip.name, ip.price);
  }
  if (nv.interior.color !== cv.interior.color || nv.interior.material !== cv.interior.material) add('Interior trim', 400);
  return { total: priceWithDiscount(p, total), items };
}

export class BodyShopScreen implements Screen {
  private draft!: CarBuild;
  private tab: Tab = 'kits';
  private slot: VisualSlot = 'frontBumper';
  private garage!: GarageScene;
  private left!: HTMLElement;
  private right!: HTMLElement;
  private rebuildT = 0;
  private selLayer: string | null = null;
  private vinylCanvas: HTMLCanvasElement | null = null;

  constructor(private game: Game) {}

  enter() {
    const g = this.game;
    this.draft = cloneBuild(currentCar(g.profile!));
    this.garage = g.garageScene('home');
    (g as any).currentGarage = this.garage;
    this.garage.setCar(this.draft);
    this.garage.focus('overview');
    this.left = h('div', { class: 'shop-left' });
    this.right = h('div', { class: 'shop-right scroll' });
    g.ui.append(topBar(g, 'Chroma Body & Paint', () => this.leave()), this.left, this.right,
      h('div', { class: 'shop-bottom' }, (['overview', 'front', 'side', 'rear', 'wheel', 'hood', 'roof', 'interior', 'top'] as FocusPreset[]).map((f) => btn(f, () => this.garage.focus(f), 'small ghost'))));
    this.renderLeft();
    this.renderRight();
  }

  private leave() {
    const g = this.game;
    const cost = visualCost(g, currentCar(g.profile!), this.draft);
    if (cost.items.length) confirmBox('Discard changes?', 'You have unpaid changes on the car.', 'Discard', () => g.setScreen(new HubScreen(g, 'body')));
    else g.setScreen(new HubScreen(g, 'body'));
  }

  /** Rebuild the 3D car after a change (debounced). */
  private changed(full = true) {
    window.clearTimeout(this.rebuildT);
    if (!full && this.garage.car) { this.garage.car.repaint(this.draft.visual); this.renderRight(); this.drawVinylPreview(); return; }
    this.rebuildT = window.setTimeout(() => { this.garage.setCar(this.draft); this.renderRight(); }, 60);
  }

  private renderRight() {
    const g = this.game;
    const cur = currentCar(g.profile!);
    const cost = visualCost(g, cur, this.draft);
    const vs = visualScore(this.draft);
    this.right.innerHTML = '';
    this.right.append(
      h('div', { class: 'panel' },
        h('div', { class: 'panel-title' }, 'Order', h('small', {}, `Style ${vs} · ${styleLabel(vs)}`)),
        cost.items.length ? cost.items.map((i) => h('div', { class: 'desc' }, '◆ ' + i)) : h('p', { class: 'dim' }, 'Select parts on the left to preview them on your car.'),
        h('div', { class: 'row between', style: { marginTop: '10px' } }, h('div', { class: 'bigstat', style: { fontSize: '26px', color: 'var(--green)' } }, fmtMoney(cost.total)), h('div', { class: 'dim' }, `Cash ${fmtMoney(g.profile!.money)}`)),
        h('div', { class: 'row end', style: { marginTop: '8px' } },
          btn('Reset', () => { this.draft = cloneBuild(cur); this.garage.setCar(this.draft); this.renderLeft(); this.renderRight(); }, 'ghost small'),
          btn('Buy & Install', () => this.purchase(), 'primary', !cost.items.length || cost.total > g.profile!.money)),
      ),
      statsPanel(g, cur, this.draft),
    );
  }

  private purchase() {
    const g = this.game;
    const p = g.profile!;
    const cur = currentCar(p);
    const cost = visualCost(g, cur, this.draft);
    if (cost.total > p.money) { toast('Not enough cash', 'bad'); audio.error(); return; }
    p.money -= cost.total;
    const v = this.draft.visual;
    for (const s of [...KIT_SLOTS, 'headlights', 'taillights'] as VisualSlot[]) addOwned(p, cur.uid, s, (v as any)[s]);
    addOwned(p, cur.uid, 'wheels', `${v.wheels.design}@${v.wheels.size}`);
    for (const ip of INTERIOR_PARTS) if ((v.interior as any)[ip.slot] === ip.id) addOwned(p, cur.uid, 'int_' + ip.slot, ip.id);
    cur.visual = cloneBuild(this.draft).visual;
    cur.tune.camberF = this.draft.tune.camberF;
    cur.tune.camberR = this.draft.tune.camberR;
    g.save();
    audio.cash();
    toast(`Installed — ${fmtMoney(cost.total)}`, 'good');
    this.draft = cloneBuild(cur);
    this.renderRight();
    this.renderLeft();
  }

  private renderLeft() {
    const tabs: [Tab, string][] = [['kits', 'Body'], ['lights', 'Lights'], ['wheels', 'Wheels'], ['paint', 'Paint'], ['vinyls', 'Vinyls'], ['neon', 'Neon & Glass'], ['interior', 'Interior']];
    this.left.innerHTML = '';
    const body = h('div', { class: 'panel scroll', style: { flex: '1' } });
    this.left.append(h('div', { class: 'panel tight' }, h('div', { class: 'tabs', style: { margin: 0 } }, tabs.map(([t, l]) => h('div', { class: `tab ${t === this.tab ? 'sel' : ''}`, onClick: () => { this.tab = t; if (t === 'wheels') this.garage.focus('wheel'); if (t === 'interior') this.garage.focus('interior'); if (t === 'vinyls') this.garage.focus('side'); this.renderLeft(); } }, l)))), body);
    this.vinylCanvas = null;
    switch (this.tab) {
      case 'kits': this.kitsTab(body, KIT_SLOTS); break;
      case 'lights': this.kitsTab(body, ['headlights', 'taillights']); break;
      case 'wheels': this.wheelsTab(body); break;
      case 'paint': this.paintTab(body); break;
      case 'vinyls': this.vinylTab(body); break;
      case 'neon': this.neonTab(body); break;
      case 'interior': this.interiorTab(body); break;
    }
  }

  private kitsTab(body: HTMLElement, slots: VisualSlot[]) {
    const g = this.game;
    const p = g.profile!;
    const model = CARS[this.draft.modelId];
    if (!slots.includes(this.slot)) this.slot = slots[0];
    body.append(h('div', { class: 'tabs' }, slots.map((s) => h('div', { class: `tab ${s === this.slot ? 'sel' : ''}`, style: { fontSize: '13px' }, onClick: () => { this.slot = s; const c = SLOT_CAM[s]; if (c) this.garage.focus(c); this.renderLeft(); } }, VISUAL_SLOT_LABELS[s]))));
    const tier = unlockedTier(p);
    const cur = currentCar(p);
    for (const part of visualParts(this.slot, model)) {
      const installed = (cur.visual as any)[this.slot] === part.id;
      const selected = (this.draft.visual as any)[this.slot] === part.id;
      const owned = owns(p, cur.uid, this.slot, part.id);
      const locked = part.tier > tier;
      body.append(h('div', { class: `item ${selected ? 'sel' : ''} ${locked ? 'locked' : ''}`, onClick: () => { if (locked) { toast(`Unlocks at tier ${part.tier + 1}`, 'bad'); return; } (this.draft.visual as any)[this.slot] = part.id; this.changed(); this.renderLeft(); } },
        h('div', { class: 'grow' }, h('div', { class: 'name' }, part.name), h('div', { class: 'desc' }, part.desc), part.brands ? h('div', { class: 'dim', style: { fontSize: '11px' } }, 'Brand fitment') : null),
        installed ? h('span', { class: 'tag inst' }, 'Installed') : owned ? h('span', { class: 'tag owned' }, 'Owned') : locked ? h('span', { class: 'tag' }, `Tier ${part.tier + 1}`) : h('span', { class: 'price' }, part.price ? fmtMoney(priceWithDiscount(p, part.price)) : 'Free')));
    }
    if (this.slot === 'spoiler') body.append(select('Spoiler finish', [{ value: 'body', label: 'Body colour' }, { value: 'carbon', label: 'Carbon' }, { value: 'black', label: 'Gloss black' }], this.draft.visual.spoilerFinish, (v) => { this.draft.visual.spoilerFinish = v; this.changed(); }));
    if (this.slot === 'exhaust') body.append(select('Tip finish', EXHAUST_FINISHES.map((f) => ({ value: f.id, label: f.name })), this.draft.visual.exhaustFinish, (v) => { this.draft.visual.exhaustFinish = v; this.changed(); }));
  }

  private wheelsTab(body: HTMLElement) {
    const p = this.game.profile!;
    const w = this.draft.visual.wheels;
    const model = CARS[this.draft.modelId];
    const tier = unlockedTier(p);
    body.append(h('h3', {}, 'Design'));
    for (const d of WHEEL_DESIGNS) {
      const locked = d.tier > tier;
      body.append(h('div', { class: `item ${w.design === d.id ? 'sel' : ''} ${locked ? 'locked' : ''}`, onClick: () => { if (locked) return; w.design = d.id; this.changed(); this.renderLeft(); } },
        h('div', { class: 'grow' }, h('div', { class: 'name' }, `${d.maker} ${d.name}`), h('div', { class: 'desc' }, d.desc)),
        h('span', { class: 'price' }, d.price ? fmtMoney(wheelPrice(d, w.size)) : 'Factory')));
    }
    body.append(h('h3', {}, 'Fitment'));
    const diam = model.stockWheelSize * 25.4 + (2 * model.stockTireWidth * model.stockTireProfile) / 100;
    const keepDiam = () => { w.profile = Math.max(25, Math.min(65, Math.round(((diam - w.size * 25.4) / 2 / w.tireWidth) * 100 / 5) * 5)); };
    append(body, [
      slider('Rim size', 15, 20, 1, w.size, (v) => { w.size = v; keepDiam(); this.changed(); }, (v) => `${v}"`),
      slider('Rim width', 6, 11.5, 0.5, w.width, (v) => { w.width = v; this.changed(); }, (v) => `${v}J`),
      slider('Tyre width', 185, 315, 10, w.tireWidth, (v) => { w.tireWidth = v; keepDiam(); this.changed(); }, (v) => `${v} mm`),
      slider('Tyre profile', 25, 65, 5, w.profile, (v) => { w.profile = v; this.changed(); }, (v) => `${v}`),
      slider('Offset', -10, 30, 1, w.offset, (v) => { w.offset = v; this.changed(); }, (v) => `${v} mm`),
      slider('Camber', -7, 0, 0.1, w.camber, (v) => { w.camber = v; this.draft.tune.camberF = v; this.draft.tune.camberR = v * 0.85; this.changed(); }, (v) => `${v.toFixed(1)}°`),
      h('h3', {}, 'Finish'),
      select('Finish', WHEEL_FINISHES.map((f) => ({ value: f.id, label: f.name })), w.finish, (v) => { w.finish = v; this.changed(); this.renderLeft(); }),
      w.finish === 'painted' ? colorInput('Wheel colour', w.color, (v) => { w.color = v; this.changed(); }, PAINT_SWATCHES) : null,
      colorInput('Calipers', this.draft.visual.caliperColor, (v) => { this.draft.visual.caliperColor = v; this.changed(); }, ['#b8b8b8', '#c1121f', '#f2c230', '#1f6fd1', '#111111', '#ff6a00', '#40ff90']),
      ]);
  }

  private paintTab(body: HTMLElement) {
    const pt = this.draft.visual.paint;
    const fins: PaintFinish[] = ['solid', 'metallic', 'pearl', 'matte', 'candy', 'chrome', 'carbon'];
    append(body, [
      h('h3', {}, 'Body paint'),
      h('div', { class: 'tabs' }, fins.map((f) => h('div', { class: `tab ${pt.finish === f ? 'sel' : ''}`, onClick: () => { pt.finish = f; this.changed(); this.renderLeft(); } }, `${f} ${fmtMoney(FINISH_COST[f])}`))),
      colorInput('Colour', pt.color, (v) => { pt.color = v; this.changed(false); }, PAINT_SWATCHES),
      pt.finish === 'pearl' ? colorInput('Pearl flip', pt.pearl, (v) => { pt.pearl = v; this.changed(); }, ['#ffffff', '#7fd0ff', '#ff7fd0', '#d0ff7f', '#ffd27f', '#b07fff']) : null,
      h('p', { class: 'dim', style: { fontSize: '12px' } }, 'Paint names from the catalogue: Midnight Indigo Metallic (#1C2154), Obsidian Graphite (#24262B), Pier Fog Silver, Kestrel Yellow… or mix your own.'),
      ]);
  }

  private neonTab(body: HTMLElement) {
    const v = this.draft.visual;
    body.append(
      h('h3', {}, 'Neon underglow'),
      select('Neon', [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }], v.neon.enabled ? 'on' : 'off', (x) => { v.neon.enabled = x === 'on'; this.changed(); }),
      colorInput('Neon colour', v.neon.color, (x) => { v.neon.color = x; this.changed(); }, ['#20a0ff', '#b030ff', '#30ff90', '#ff2a8a', '#ffffff', '#ff3020', '#ffcc00']),
      select('Mode', [{ value: 'steady', label: 'Steady' }, { value: 'pulse', label: 'Pulse' }, { value: 'strobe', label: 'Strobe' }], v.neon.mode, (x) => { v.neon.mode = x; this.changed(); }),
      h('h3', {}, 'Glass'),
      slider('Window tint', 0, 0.9, 0.05, v.windowTint, (x) => { v.windowTint = x; this.changed(); }, (x) => `${Math.round(x * 100)}%`),
      colorInput('Tint colour', v.tintColor, (x) => { v.tintColor = x; this.changed(); }, ['#101418', '#0a1a2a', '#1a0a20', '#0a200f', '#201a0a']),
      h('h3', {}, 'License plate'),
      (() => { const i = h('input', { type: 'text', value: v.plate, maxlength: 8, style: { width: '100%', fontSize: '18px', textTransform: 'uppercase' } }) as HTMLInputElement; i.addEventListener('change', () => { v.plate = i.value.toUpperCase().slice(0, 8); this.changed(); }); return i; })(),
    );
  }

  private interiorTab(body: HTMLElement) {
    const it = this.draft.visual.interior;
    const slots: [keyof typeof it, string][] = [['seats', 'Seats'], ['steering', 'Steering wheel'], ['dash', 'Dashboard'], ['gauges', 'Gauges'], ['cage', 'Roll cage'], ['shifter', 'Shifter']];
    for (const [slot, label] of slots) {
      body.append(h('h3', {}, label));
      for (const ip of INTERIOR_PARTS.filter((x) => x.slot === slot)) {
        body.append(h('div', { class: `item ${(it as any)[slot] === ip.id ? 'sel' : ''}`, onClick: () => { (it as any)[slot] = ip.id; this.changed(); this.renderLeft(); } },
          h('div', { class: 'grow' }, h('div', { class: 'name' }, ip.name), h('div', { class: 'desc' }, ip.desc + (ip.weight ? ` (${ip.weight > 0 ? '+' : ''}${ip.weight} kg)` : ''))),
          h('span', { class: 'price' }, ip.price ? fmtMoney(ip.price) : 'Stock')));
      }
    }
    body.append(h('h3', {}, 'Trim'), colorInput('Colour', it.color, (x) => { it.color = x; this.changed(); }, INTERIOR_COLORS),
      select('Material', INTERIOR_MATERIALS.map((m) => ({ value: m, label: m })), it.material, (x) => { it.material = x; this.changed(); }));
  }

  // ------------------------------------------------------------------ vinyl editor
  private vinylTab(body: HTMLElement) {
    const v = this.draft.visual;
    const layers = v.vinyls;
    const sel = layers.find((l) => l.id === this.selLayer) ?? layers[layers.length - 1];
    this.selLayer = sel?.id ?? null;
    const shapes: VinylShape[] = ['stripe', 'rect', 'slash', 'sweep', 'shards', 'shard', 'chevron', 'arrow', 'bolt', 'wave', 'hatch', 'dots', 'checker', 'hexgrid', 'fade', 'circuit', 'circle', 'ring', 'triangle', 'diamond', 'star', 'number', 'text', 'sponsor', 'logo'];
    const addLayer = (shape: VinylShape) => {
      const L: VinylLayer = { id: uid('v'), shape, region: this.lastRegion, mirror: this.lastRegion !== 'top', x: 0.5, y: 0.55, sx: shape === 'stripe' ? 0.9 : 0.25, sy: shape === 'stripe' ? 0.03 : 0.12, rot: 0, color: '#ffffff', color2: '#111214', opacity: 1,
        text: shape === 'number' ? '07' : shape === 'text' ? 'CUT THE WIND' : undefined, font: 'italic', sponsor: shape === 'sponsor' ? 'VOLTEX' : undefined, logo: shape === 'logo' ? 'ctw' : undefined };
      if (layers.length >= 24) { toast('Max 24 layers', 'bad'); return; }
      layers.push(L);
      this.selLayer = L.id;
      this.changed(false);
      this.renderLeft();
    };
    const cv = h('canvas', { class: 'vinyl-canvas', width: 680, height: 230 }) as HTMLCanvasElement;
    this.vinylCanvas = cv;
    this.bindVinylDrag(cv);
    body.append(
      h('div', { class: 'row' }, ...(['left', 'right', 'top'] as const).map((r) => btn(r === 'top' ? 'Hood / Roof' : r + ' side', () => { this.lastRegion = r; if (sel) { sel.region = r; this.changed(false); } this.garage.focus(r === 'top' ? 'top' : 'side'); this.renderLeft(); }, `small ${this.viewRegion(sel) === r ? 'sel' : 'ghost'}`))),
      cv,
      h('div', { class: 'dim', style: { fontSize: '11px', margin: '4px 0' } }, 'Drag on the preview to move the selected layer. Side views: front of the car is on the left (left side) / right (right side).'),
      h('h3', {}, 'Add layer'),
      h('div', {}, shapes.map((s) => h('span', { class: 'chip', onClick: () => addLayer(s) }, s))),
      h('h3', {}, `Layers (${layers.length})`),
      h('div', { class: 'layer-list scroll' }, [...layers].reverse().map((l) => h('div', { class: `item ${l.id === this.selLayer ? 'sel' : ''}`, onClick: () => { this.selLayer = l.id; this.renderLeft(); } },
        h('span', { class: 'swatch', style: { background: l.color } }), h('div', { class: 'name', style: { fontSize: '15px' } }, `${l.shape}${l.text ? ' "' + l.text + '"' : ''}${l.sponsor ? ' ' + l.sponsor : ''}`), h('span', { class: 'dim', style: { fontSize: '11px' } }, l.region + (l.mirror ? ' ⇄' : ''))))),
      sel ? this.layerProps(sel) : h('p', { class: 'dim' }, 'Add a layer to start designing your livery.'),
    );
    this.drawVinylPreview();
  }

  private lastRegion: 'left' | 'right' | 'top' = 'left';
  private viewRegion(sel?: VinylLayer) { return sel?.region ?? this.lastRegion; }

  private layerProps(L: VinylLayer): HTMLElement {
    const layers = this.draft.visual.vinyls;
    const up = () => this.changed(false);
    const idx = layers.indexOf(L);
    return h('div', { class: 'col', style: { marginTop: '8px' } },
      h('div', { class: 'row' },
        btn('▲', () => { if (idx < layers.length - 1) { [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]]; up(); this.renderLeft(); } }, 'small ghost'),
        btn('▼', () => { if (idx > 0) { [layers[idx], layers[idx - 1]] = [layers[idx - 1], layers[idx]]; up(); this.renderLeft(); } }, 'small ghost'),
        btn('Duplicate', () => { const c = { ...L, id: uid('v'), x: Math.min(1, L.x + 0.05) }; layers.push(c); this.selLayer = c.id; up(); this.renderLeft(); }, 'small ghost'),
        btn('Delete', () => { layers.splice(idx, 1); this.selLayer = null; up(); this.renderLeft(); }, 'small danger')),
      L.region !== 'top' ? select('Mirror', [{ value: 'yes', label: 'Both sides' }, { value: 'no', label: 'This side only (asymmetric)' }], L.mirror ? 'yes' : 'no', (v) => { L.mirror = v === 'yes'; up(); }) : null,
      slider('Position X', 0, 1, 0.005, L.x, (v) => { L.x = v; up(); }),
      slider('Position Y', 0, 1, 0.005, L.y, (v) => { L.y = v; up(); }),
      slider('Width', 0.01, 1.2, 0.005, L.sx, (v) => { L.sx = v; up(); }),
      slider('Height', 0.005, 1, 0.005, L.sy, (v) => { L.sy = v; up(); }),
      slider('Rotation', -180, 180, 1, L.rot, (v) => { L.rot = v; up(); }, (v) => `${v}°`),
      slider('Opacity', 0.05, 1, 0.05, L.opacity, (v) => { L.opacity = v; up(); }),
      select('Flip', [{ value: 'no', label: 'Normal' }, { value: 'yes', label: 'Flipped' }], L.flipX ? 'yes' : 'no', (v) => { L.flipX = v === 'yes'; up(); }),
      colorInput('Colour', L.color, (v) => { L.color = v; up(); }, VINYL_SWATCHES),
      colorInput('Accent', L.color2, (v) => { L.color2 = v; up(); }, VINYL_SWATCHES),
      L.shape === 'text' || L.shape === 'number' ? (() => { const i = h('input', { type: 'text', value: L.text ?? '', maxlength: 24, style: { width: '100%' } }) as HTMLInputElement; i.addEventListener('input', () => { L.text = i.value; up(); }); return i; })() : null,
      L.shape === 'text' || L.shape === 'number' ? select('Font', [{ value: 'block', label: 'Block' }, { value: 'italic', label: 'Italic' }, { value: 'outline', label: 'Outline' }, { value: 'stencil', label: 'Stencil' }], L.font ?? 'block', (v) => { L.font = v; up(); }) : null,
      L.shape === 'sponsor' ? select('Sponsor', SPONSORS.map((s) => ({ value: s, label: s })), L.sponsor ?? 'VOLTEX', (v) => { L.sponsor = v; up(); }) : null,
      L.shape === 'logo' ? select('Logo', LOGO_IDS.map((s) => ({ value: s, label: s })), L.logo ?? 'ctw', (v) => { L.logo = v; up(); }) : null,
    );
  }

  private previewCanvas: HTMLCanvasElement | null = null;
  private drawVinylPreview() {
    const cv = this.vinylCanvas;
    if (!cv || !cv.isConnected) return;
    const sel = this.draft.visual.vinyls.find((l) => l.id === this.selLayer);
    const region = this.viewRegion(sel);
    if (!this.previewCanvas) { this.previewCanvas = document.createElement('canvas'); this.previewCanvas.width = ATLAS; this.previewCanvas.height = ATLAS; }
    const pctx = this.previewCanvas.getContext('2d')!;
    const car = this.garage.car;
    if (car) paintAtlas(pctx, CARS[this.draft.modelId], this.draft.visual, car.shape);
    const R = REGIONS[region];
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(this.previewCanvas, R.x, R.y, R.w, R.h, 0, 0, cv.width, cv.height);
    if (sel && sel.region === region) {
      ctx.strokeStyle = '#2fd3ff';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.strokeRect((sel.x - sel.sx / 2) * cv.width, (sel.y - sel.sy / 2) * cv.height, sel.sx * cv.width, sel.sy * cv.height);
      ctx.setLineDash([]);
    }
  }

  private bindVinylDrag(cv: HTMLCanvasElement) {
    let drag = false;
    const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    cv.addEventListener('pointerdown', (e) => { drag = true; cv.setPointerCapture(e.pointerId); const L = this.draft.visual.vinyls.find((l) => l.id === this.selLayer); if (L) { const [x, y] = pos(e); L.x = x; L.y = y; this.changed(false); } });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; const L = this.draft.visual.vinyls.find((l) => l.id === this.selLayer); if (!L) return; const [x, y] = pos(e); L.x = Math.max(0, Math.min(1, x)); L.y = Math.max(0, Math.min(1, y)); this.changed(false); });
    cv.addEventListener('pointerup', () => { drag = false; this.renderLeft(); });
  }

  exit() { window.clearTimeout(this.rebuildT); }
}
