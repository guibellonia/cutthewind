// Ending after beating Adrian Voss in the final race.
import type { Game, Screen } from '../../game/game';
import { fmtMoney } from '../../core/state';
import { runDialog } from '../dialog';
import { btn, h } from '../dom';
import { HubScreen } from './hub';

export class EndingScreen implements Screen {
  constructor(private game: Game) {}
  enter() {
    const g = this.game;
    const p = g.profile!;
    const garage = g.garageScene('home');
    garage.focus('hero');
    const name = p.name.toUpperCase();
    runDialog(g.ui, [
      { who: 'PIER 9 · 3:12 AM', text: 'The crowd doesn\'t leave. They stand around the two cars in the shutdown lane, phones up, like they\'re waiting for someone to tell them what just happened.', color: '#8b9bb0' },
      { who: 'ADRIAN VOSS', text: 'Maybe there was something under that hood after all. More than something.', color: '#ff3b3b', side: 'right' },
      { who: 'ADRIAN VOSS', text: 'Same time next year. Bring something faster. I will.', color: '#ff3b3b', side: 'right' },
      { who: 'RICO SALAZAR', text: `Ladies and gentlemen — the new name at the top of the board: ${name}!`, color: '#ffcc00' },
      { who: 'MAGS', text: 'Told you. Now get that car back to the shop before you break it.', color: '#ff8a1f' },
    ], () => {
      g.ui.append(h('div', { class: 'results panel' },
        h('div', { class: 'banner win' }, 'CUT THE WIND'),
        h('p', { style: { fontSize: '20px' } }, `${p.name} — champion of the city's underground. Day ${p.day}.`),
        h('div', { class: 'desc' }, `Races ${p.stats.races} · Wins ${p.stats.wins} · Best quarter ${p.stats.bestEt ? p.stats.bestEt.toFixed(3) + ' s' : '—'} · Earned ${fmtMoney(p.stats.earned)} · Perfect shifts ${p.stats.perfectShifts}`),
        h('p', { class: 'dim' }, 'The scene goes on: keep racing, building and collecting. Every rival keeps scaling with you.'),
        h('div', { class: 'row end' }, btn('Keep playing', () => g.setScreen(new HubScreen(g)), 'primary big'))));
    });
  }
  exit() {}
}
