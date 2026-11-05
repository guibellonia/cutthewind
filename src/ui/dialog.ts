// Visual-novel style dialogue box with typewriter text.
import { h } from './dom';
import { audio } from '../audio/audio';

export interface Line { who: string; text: string; color?: string; side?: 'left' | 'right' }

export function runDialog(host: HTMLElement, lines: Line[], onDone: () => void): () => void {
  let i = 0;
  let shown = 0;
  let timer = 0;
  const speaker = h('div', { class: 'speaker' });
  const text = h('div', { class: 'line' });
  const box = h('div', { class: 'dialog' }, speaker, h('div', { class: 'panel' }, text, h('div', { class: 'hint' }, 'Click / Enter / Space ▸')));
  host.append(box);
  const show = () => {
    const L = lines[i];
    speaker.textContent = L.who;
    speaker.style.background = L.color ?? 'var(--cyan)';
    speaker.style.color = '#05080e';
    speaker.style.marginLeft = L.side === 'right' ? 'auto' : '0';
    box.style.textAlign = L.side === 'right' ? 'right' : 'left';
    shown = 0;
    text.textContent = '';
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      shown += 2;
      text.textContent = L.text.slice(0, shown);
      if (shown % 6 === 0) audio.beep(900 + Math.random() * 200, 0.015, 0.02, 'square');
      if (shown >= L.text.length) window.clearInterval(timer);
    }, 22);
  };
  const next = () => {
    const L = lines[i];
    if (shown < L.text.length) { shown = L.text.length; text.textContent = L.text; window.clearInterval(timer); return; }
    i++;
    if (i >= lines.length) { cleanup(); onDone(); return; }
    show();
  };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
  const click = () => next();
  box.addEventListener('click', click);
  window.addEventListener('keydown', key);
  const cleanup = () => { window.clearInterval(timer); window.removeEventListener('keydown', key); box.remove(); };
  show();
  return cleanup;
}
