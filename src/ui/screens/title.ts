import type { Game, Screen } from '../../game/game';
import { blueHourBuild } from '../../core/builds';
import { currentCar, deleteProfile, newProfile, saveProfile } from '../../core/state';
import { audio } from '../../audio/audio';
import { BRAND_LIST } from '../../data/brands';
import { btn, confirmBox, h, modal, select, slider, toast } from '../dom';
import { brandLogo } from '../common';
import { HubScreen } from './hub';
import { IntroScreen } from './intro';

export function optionsModal(game: Game, onClose?: () => void) {
  const s = game.settings;
  let close = () => {};
  const apply = () => game.saveSettings();
  const content = h('div', {},
    h('h2', {}, 'Options'),
    h('h3', {}, 'Graphics'),
    select('Quality', [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }], s.graphics.quality, (v) => { s.graphics.quality = v; apply(); }),
    slider('Retro filter', 0, 1, 0.05, s.graphics.retro, (v) => { s.graphics.retro = v; apply(); }, (v) => `${Math.round(v * 100)}%`),
    select('Bloom', [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], s.graphics.bloom ? 'on' : 'off', (v) => { s.graphics.bloom = v === 'on'; apply(); }),
    select('Wet reflections', [{ value: 'on', label: 'On (applies on next scene)' }, { value: 'off', label: 'Off (faster)' }], s.graphics.reflections ? 'on' : 'off', (v) => { s.graphics.reflections = v === 'on'; apply(); }),
    h('h3', {}, 'Audio'),
    slider('Master', 0, 1, 0.05, s.audio.master, (v) => { s.audio.master = v; apply(); }, (v) => `${Math.round(v * 100)}%`),
    slider('Music', 0, 1, 0.05, s.audio.music, (v) => { s.audio.music = v; apply(); }, (v) => `${Math.round(v * 100)}%`),
    slider('Effects', 0, 1, 0.05, s.audio.sfx, (v) => { s.audio.sfx = v; apply(); }, (v) => `${Math.round(v * 100)}%`),
    h('h3', {}, 'Units'),
    select('Speed', [{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }], s.units, (v) => { s.units = v; apply(); }),
    h('h3', {}, 'Controls'),
    h('p', { class: 'dim', style: { fontSize: '13px' } }, 'Throttle W / ↑ · Launch & shift up E / → · Shift down Q / ← · Nitrous SPACE · Back up S / ↓ · Camera C · Touch buttons appear on touch screens.'),
    h('div', { class: 'row end' }, btn('Close', () => close(), 'primary')),
  );
  close = modal(content, { onClose });
}

export function aboutModal() {
  let close = () => {};
  const content = h('div', {},
    h('h2', {}, 'The Automotive Universe'),
    h('p', { class: 'dim' }, 'Every manufacturer, car, part and sponsor in CUT THE WIND is fictional.'),
    BRAND_LIST.map((b) => h('div', { class: 'row', style: { margin: '10px 0', alignItems: 'flex-start' } },
      brandLogo(b.id, 46),
      h('div', { class: 'grow' }, h('h3', { style: { margin: 0 } }, `${b.name} · ${b.origin} · ${b.founded}`), h('div', { class: 'desc' }, `${b.specialty}. ${b.philosophy}`), h('div', { class: 'desc dim' }, b.heritage)))),
    h('div', { class: 'row end' }, btn('Close', () => close(), 'primary')),
  );
  close = modal(content, { wide: true });
}

export class TitleScreen implements Screen {
  constructor(private game: Game) {}

  enter() {
    const g = this.game;
    const garage = g.garageScene('home');
    garage.setCar(g.profile ? currentCar(g.profile) : blueHourBuild());
    garage.focus('hero');
    audio.musicOn(true);
    const p = g.profile;
    const menu = h('div', { class: 'menu' },
      p ? btn(`Continue — ${p.name} · Day ${p.day}`, () => this.continue(), 'primary') : null,
      btn('New Career', () => this.newCareer(), p ? '' : 'primary'),
      btn('Options', () => optionsModal(g)),
      btn('Manufacturers', () => aboutModal()),
    );
    g.ui.append(h('div', { class: 'title-screen' },
      h('div', { class: 'game-logo' }, 'CUT', h('b', {}, 'THE WIND')),
      h('div', { class: 'tagline' }, 'Street drag · Tuning · Night culture · 2004'),
      menu,
      h('div', { class: 'dim', style: { marginTop: '22px', fontSize: '12px', letterSpacing: '0.1em' } }, 'DRAG TO ORBIT THE CAR · ALL BRANDS ARE FICTIONAL'),
    ));
  }

  private continue() {
    const g = this.game;
    if (!g.profile) return;
    if (!g.profile.tutorialDone) g.setScreen(new IntroScreen(g));
    else g.setScreen(new HubScreen(g));
  }

  private newCareer() {
    const g = this.game;
    const start = () => {
      let close = () => {};
      const input = h('input', { type: 'text', value: 'Kai', maxlength: 16, style: { width: '100%', fontSize: '22px' } }) as HTMLInputElement;
      const go = () => {
        const name = input.value.trim() || 'Kai';
        close();
        deleteProfile();
        g.profile = newProfile(name);
        saveProfile(g.profile);
        g.setScreen(new IntroScreen(g));
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      close = modal(h('div', {}, h('h2', {}, 'Driver Name'), h('p', { class: 'dim' }, 'What does the scene call you?'), input, h('div', { class: 'row end', style: { marginTop: '14px' } }, btn('Cancel', () => close(), 'ghost'), btn('Start', go, 'primary'))));
      setTimeout(() => input.focus(), 50);
    };
    if (g.profile) confirmBox('New Career', 'This will overwrite your current save.', 'Overwrite', start);
    else start();
    void toast;
  }

  exit() {}
}
