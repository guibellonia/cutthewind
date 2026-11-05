// Minimal DOM helpers for the game UI.
import { audio } from '../audio/audio';

type Attrs = Record<string, any>;
type Child = Node | string | number | null | undefined | false | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      const ev = k.slice(2).toLowerCase();
      if (ev === 'click') {
        el.addEventListener('click', (e) => { audio.click(); v(e); });
        el.addEventListener('mouseenter', () => audio.hover());
      } else el.addEventListener(ev, v);
    } else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') (el as any)[k] = v;
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

export function append(el: HTMLElement, children: Child[]) {
  for (const c of children.flat(4 as 1)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: HTMLElement) { while (el.firstChild) el.removeChild(el.firstChild); }

export function btn(label: Child, onClick: () => void, cls = '', disabled = false): HTMLButtonElement {
  return h('button', { class: `btn ${cls}`, onClick: () => { if (!disabled) onClick(); }, disabled }, label);
}

export function slider(label: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void, fmt: (v: number) => string = (v) => v.toFixed(2)): HTMLElement {
  const val = h('span', { class: 'slider-val' }, fmt(value));
  const input = h('input', { type: 'range', min, max, step, value: String(value) }) as HTMLInputElement;
  input.addEventListener('input', () => { const v = Number(input.value); val.textContent = fmt(v); onInput(v); });
  return h('label', { class: 'slider' }, h('span', { class: 'slider-label' }, label), input, val);
}

export function colorInput(label: string, value: string, onInput: (v: string) => void, swatches: string[] = []): HTMLElement {
  const input = h('input', { type: 'color', value }) as HTMLInputElement;
  input.addEventListener('input', () => onInput(input.value));
  const sw = swatches.map((c) => h('button', { class: 'swatch', style: { background: c }, title: c, onClick: () => { input.value = c; onInput(c); } }));
  return h('div', { class: 'color-row' }, h('span', { class: 'slider-label' }, label), input, h('div', { class: 'swatches' }, sw));
}

export function select<T extends string>(label: string, options: { value: T; label: string }[], value: T, onChange: (v: T) => void): HTMLElement {
  const s = h('select', {}, options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label))) as HTMLSelectElement;
  s.addEventListener('change', () => onChange(s.value as T));
  return h('label', { class: 'select' }, h('span', { class: 'slider-label' }, label), s);
}

let toastHost: HTMLElement | null = null;
export function toast(msg: string, kind: 'info' | 'good' | 'bad' = 'info', ms = 2600) {
  if (!toastHost) { toastHost = h('div', { class: 'toasts' }); document.body.append(toastHost); }
  const t = h('div', { class: `toast ${kind}` }, msg);
  toastHost.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 500);
}

export function modal(content: HTMLElement, opts: { onClose?: () => void; wide?: boolean } = {}): () => void {
  const host = document.getElementById('ui')!;
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: `modal ${opts.wide ? 'wide' : ''}` }, content);
  back.append(box);
  host.append(back);
  const close = () => { back.remove(); opts.onClose?.(); };
  return close;
}

export function confirmBox(title: string, text: string, ok: string, onOk: () => void, cancel = 'Cancel') {
  let close = () => {};
  const content = h('div', {}, h('h2', {}, title), h('p', {}, text), h('div', { class: 'row end' }, btn(cancel, () => close(), 'ghost'), btn(ok, () => { close(); onOk(); }, 'primary')));
  close = modal(content);
}

export function bar(value: number, max: number, cls = '', after?: number): HTMLElement {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const el = h('div', { class: `bar ${cls}` }, h('div', { class: 'fill', style: { width: pct + '%' } }));
  if (after !== undefined && Math.abs(after - value) > 1e-6) {
    const p2 = Math.max(0, Math.min(100, (after / max) * 100));
    el.append(h('div', { class: `delta ${after > value ? 'up' : 'down'}`, style: { left: Math.min(pct, p2) + '%', width: Math.abs(p2 - pct) + '%' } }));
  }
  return el;
}

export function isTouch(): boolean { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }
