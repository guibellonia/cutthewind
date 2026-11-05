// Home garage: switch cars, tune, sell, end the day.
import type { Game, Screen } from '../../game/game';
import type { CarBuild } from '../../core/types';
import { cloneBuild } from '../../core/builds';
import { currentCar, earn, fmtMoney } from '../../core/state';
import { CARS, carFullName } from '../../data/cars';
import { effectivePart, engineOf, boostSetup } from '../../sim/vehicle';
import { buildSpec, estimate, perfRating } from '../../sim/index';
import { GEAR_SETS } from '../../data/perfParts';
import { endDay } from '../../game/progression';
import { carValue } from '../../game/economy';
import { btn, confirmBox, h, modal, slider, toast } from '../dom';
import { dynoChart, statsPanel, topBar } from '../common';
import { HubScreen } from './hub';
import type { FocusPreset } from '../../render/garageScene';

export function cameraButtons(game: Game, presets: FocusPreset[] = ['overview', 'front', 'side', 'rear', 'wheel', 'interior', 'top']): HTMLElement {
  const g = game.garageScene(game.renderer ? (undefined as never) : 'home');
  void g;
  return h('div', { class: 'cams' }, presets.map((p) => btn(p, () => (game as any).currentGarage?.focus(p), 'small ghost')));
}

export function tuningPanel(game: Game, build: CarBuild, onApply: (b: CarBuild) => void): () => void {
  const draft = cloneBuild(build);
  const e = engineOf(draft);
  const ecu = effectivePart('ecu', draft.perf.ecu, e).fx;
  const gb = effectivePart('gearbox', draft.perf.gearbox, e).fx;
  const susp = effectivePart('suspension', draft.perf.suspension, e).fx;
  const spec0 = buildSpec(draft);
  if (!draft.tune.gears.length || draft.tune.gears.length !== spec0.gears.length) draft.tune.gears = spec0.gears.slice();
  if (!draft.tune.finalDrive) draft.tune.finalDrive = spec0.finalDrive;
  const right = h('div', { class: 'col', style: { width: '340px' } });
  const refresh = () => {
    right.innerHTML = '';
    right.append(statsPanel(game, build, draft), h('div', { class: 'panel tight' }, h('h3', {}, 'Dyno'), dynoChart(build, draft, 310, 160)));
  };
  let t: number | undefined;
  const changed = () => { window.clearTimeout(t); t = window.setTimeout(refresh, 120); };
  const T = draft.tune;
  const left = h('div', { class: 'col grow scroll', style: { maxHeight: '70vh', paddingRight: '8px' } });
  const bs = boostSetup(draft);
  left.append(h('h3', {}, 'Engine'));
  if (bs.kind !== 'none') {
    if (bs.tunable) left.append(slider('Boost', 0.2, bs.max, 0.01, T.boost || bs.target, (v) => { T.boost = v; changed(); }, (v) => `${v.toFixed(2)} bar`));
    else left.append(h('p', { class: 'dim' }, `Boost fixed at ${bs.target.toFixed(2)} bar — install a Piggyback or Standalone ECU to tune it.`));
  }
  if (ecu.tuneRev) left.append(slider('Rev limit', spec0.redline - 600, spec0.redline + 600, 50, T.revLimit || spec0.revLimit, (v) => { T.revLimit = v; changed(); }, (v) => `${v.toFixed(0)} rpm`));
  if (ecu.launch) left.append(slider('Launch control', 0, spec0.redline - 500, 100, T.launchRpm, (v) => { T.launchRpm = v; changed(); }, (v) => (v ? `${v.toFixed(0)} rpm` : 'off')));
  if (draft.perf.nitrous !== 'none') left.append(slider('Nitrous shot', 0.3, 1, 0.05, T.nitroShot || 1, (v) => { T.nitroShot = v; changed(); }, (v) => `${Math.round(v * 100)}%`));
  left.append(h('h3', {}, 'Gearing'));
  if (gb.tuneGears) {
    T.gears.forEach((r, i) => left.append(slider(`Gear ${i + 1}`, 0.6, 4.6, 0.01, r, (v) => { T.gears[i] = v; changed(); }, (v) => v.toFixed(2))));
    left.append(btn('Reset ratios', () => { const set = gb.gearSet ? GEAR_SETS[gb.gearSet].gears : CARS[draft.modelId].gears; T.gears = set.slice(); closeFn(); tuningPanel(game, { ...draft, tune: { ...T } }, onApply); }, 'small ghost'));
  } else left.append(h('p', { class: 'dim' }, 'Gear ratios are fixed on the factory gearbox. Final drive can still be swapped.'));
  left.append(slider('Final drive', 2.5, 5.2, 0.01, T.finalDrive, (v) => { T.finalDrive = v; changed(); }, (v) => v.toFixed(2)));
  left.append(h('h3', {}, 'Chassis'));
  left.append(slider('Tyre pressure', 16, 40, 1, T.tirePressure || 32, (v) => { T.tirePressure = v; changed(); }, (v) => `${v} psi`));
  if (susp.tuneSusp) {
    left.append(slider('Front springs', 0, 1, 0.05, T.springF, (v) => { T.springF = v; changed(); }, (v) => (v < 0.35 ? 'soft' : v > 0.65 ? 'stiff' : 'medium')));
    left.append(slider('Rear springs', 0, 1, 0.05, T.springR, (v) => { T.springR = v; changed(); }, (v) => (v < 0.35 ? 'soft' : v > 0.65 ? 'stiff' : 'medium')));
    left.append(slider('Damping', 0, 1, 0.05, T.damping, (v) => { T.damping = v; changed(); }, (v) => `${Math.round(v * 100)}%`));
  }
  left.append(slider('Ride height', susp.lower ?? 0, 20, 1, Math.max(susp.lower ?? 0, T.rideHeight), (v) => { T.rideHeight = v; changed(); }, (v) => `${v} mm`));
  left.append(slider('Camber front', -6, 0, 0.1, T.camberF, (v) => { T.camberF = v; draft.visual.wheels.camber = v; changed(); }, (v) => `${v.toFixed(1)}°`));
  left.append(slider('Camber rear', -6, 0, 0.1, T.camberR, (v) => { T.camberR = v; changed(); }, (v) => `${v.toFixed(1)}°`));
  left.append(h('p', { class: 'dim', style: { fontSize: '12px' } }, 'Tips: soft rear + stiff front helps RWD launches (the reverse for FWD). Lower tyre pressure adds launch grip, especially on drag radials. Negative camber looks great but costs straight-line grip.'));
  let closeFn = () => {};
  const content = h('div', {},
    h('h2', {}, 'Tuning — ' + carFullName(draft.modelId)),
    h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '16px' } }, left, right),
    h('div', { class: 'row end', style: { marginTop: '12px' } }, btn('Cancel', () => closeFn(), 'ghost'), btn('Apply tune', () => { closeFn(); onApply(draft); }, 'primary')),
  );
  refresh();
  closeFn = modal(content, { wide: true });
  return closeFn;
}

export class GarageScreen implements Screen {
  constructor(private game: Game) {}

  enter() { this.render(); }

  private render() {
    const g = this.game;
    const p = g.profile!;
    g.ui.innerHTML = '';
    const garage = g.garageScene('home');
    (g as any).currentGarage = garage;
    const car = currentCar(p);
    if (garage.car?.build !== car) garage.setCar(car);
    const list = h('div', { class: 'panel scroll', style: { flex: '1' } },
      h('div', { class: 'panel-title' }, 'Your Cars', h('small', {}, `${p.cars.length} owned`)),
      p.cars.map((c) => {
        const est = estimate(c);
        return h('div', { class: `item ${c.uid === p.current ? 'sel' : ''}`, onClick: () => { p.current = c.uid; g.save(); this.render(); } },
          h('div', { class: 'grow' }, h('div', { class: 'name' }, carFullName(c.modelId)), h('div', { class: 'dim', style: { fontSize: '12px' } }, `"${c.buildName}" · PR ${perfRating(est.et)} · ${est.et.toFixed(2)} s`)),
          c.uid === p.current ? h('span', { class: 'tag inst' }, 'Driving') : null);
      }),
    );
    const actions = h('div', { class: 'panel col' },
      btn('Tuning', () => tuningPanel(g, car, (b) => { Object.assign(car, { tune: b.tune, visual: { ...car.visual, wheels: { ...car.visual.wheels, camber: b.visual.wheels.camber } } }); g.save(); garage.setCar(car); this.render(); toast('Tune applied', 'good'); })),
      btn('Rename build', () => {
        let close = () => {};
        const input = h('input', { type: 'text', value: car.buildName, maxlength: 20, style: { width: '100%', fontSize: '20px' } }) as HTMLInputElement;
        close = modal(h('div', {}, h('h2', {}, 'Build name'), input, h('div', { class: 'row end', style: { marginTop: '12px' } }, btn('Save', () => { car.buildName = input.value.trim().toUpperCase() || car.buildName; g.save(); close(); this.render(); }, 'primary'))));
      }),
      btn(`Sell (${fmtMoney(carValue(car))})`, () => {
        if (p.cars.length < 2) { toast('You need at least one car', 'bad'); return; }
        confirmBox('Sell car', `Sell your ${carFullName(car.modelId)} for ${fmtMoney(carValue(car))}? Installed parts are included.`, 'Sell', () => {
          earn(p, carValue(car));
          p.cars = p.cars.filter((c) => c.uid !== car.uid);
          p.current = p.cars[0].uid;
          g.save();
          garage.setCar(currentCar(p));
          this.render();
        });
      }, 'ghost'),
      btn('End day & sleep', () => confirmBox('End the day?', 'Jobs, races and gigs refresh tomorrow. Unfinished jobs are lost.', 'Sleep', () => {
        endDay(p);
        g.save();
        toast(`Day ${p.day}`, 'good');
        this.render();
      }), 'primary'),
    );
    const cams = h('div', { class: 'cams' }, (['overview', 'front', 'side', 'rear', 'wheel', 'interior', 'top'] as FocusPreset[]).map((f) => btn(f, () => garage.focus(f), 'small ghost')));
    g.ui.append(
      topBar(g, 'Garage', () => g.setScreen(new HubScreen(g, 'garage'))),
      h('div', { class: 'shop-left' }, list, actions),
      h('div', { class: 'shop-right' }, statsPanel(g, car), h('div', { class: 'panel tight' }, h('h3', {}, 'Dyno'), dynoChart(car))),
      h('div', { class: 'shop-bottom' }, cams),
    );
    void buildSpec;
  }

  exit() {}
}
