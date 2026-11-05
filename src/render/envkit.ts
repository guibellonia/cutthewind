// Shared environment building blocks: sky, wet asphalt, neon signs, crowd, skyline, light pools.
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { canvas, tex } from './textures';
import { drawLogo, drawSponsor } from './logos';

export function skyDome(top: number, horizon: number, glow = 0x40304a): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) }, glow: { value: new THREE.Color(glow) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 glow; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){ vec3 d = normalize(vP); float y = d.y;
        vec3 c = mix(horizon, top, smoothstep(-0.05, 0.45, y));
        c += glow * exp(-max(y, 0.0) * 9.0) * 0.9;
        vec2 g = floor(d.xz / max(0.2, d.y + 0.25) * 220.0);
        float st = step(0.9975, h(g)) * smoothstep(0.15, 0.5, y);
        c += vec3(st) * 0.8;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

let asphaltCanvas: HTMLCanvasElement | null = null;
export function asphaltTexture(): THREE.CanvasTexture {
  if (!asphaltCanvas) {
    const [c, ctx] = canvas(512, 512);
    ctx.fillStyle = '#2a2b2e';
    ctx.fillRect(0, 0, 512, 512);
    const img = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 38;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n + 2;
    }
    ctx.putImageData(img, 0, 0);
    // tar seams and patches
    for (let k = 0; k < 14; k++) {
      ctx.strokeStyle = `rgba(10,10,12,${0.3 + Math.random() * 0.3})`;
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      let x = Math.random() * 512, y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += (Math.random() - 0.5) * 120; y += (Math.random() - 0.5) * 120; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let k = 0; k < 10; k++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '15,15,18' : '60,60,64'},0.25)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 90, 20 + Math.random() * 60);
    }
    asphaltCanvas = c;
  }
  const t = tex(asphaltCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Wet ground: a reflector under a semi-transparent asphalt layer. */
export function wetGround(width: number, length: number, centerZ: number, reflections: boolean, repeat: [number, number], opacity = 0.8): THREE.Group {
  const g = new THREE.Group();
  if (reflections) {
    const refl = new Reflector(new THREE.PlaneGeometry(width, length), {
      textureWidth: Math.floor(window.innerWidth * 0.5),
      textureHeight: Math.floor(window.innerHeight * 0.5),
      color: 0x777a80,
      clipBias: 0.003,
    });
    refl.rotation.x = -Math.PI / 2;
    refl.position.set(0, -0.01, centerZ);
    g.add(refl);
  }
  const t = asphaltTexture();
  t.repeat.set(repeat[0], repeat[1]);
  const mat = new THREE.MeshStandardMaterial({ map: t, color: 0xb8bcc6, roughness: 0.55, metalness: 0.1, transparent: reflections, opacity: reflections ? opacity : 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, centerZ);
  g.add(ground);
  return g;
}

/** Neon sign mesh with glowing text. */
export function neonSign(text: string, color: string, opts: { w?: number; h?: number; sub?: string; logo?: string; box?: boolean; font?: string } = {}): THREE.Group {
  const W = 1024, H = 256;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = opts.box ? '#0a0a0f' : 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.strokeStyle = color;
  ctx.fillStyle = '#ffffff';
  let px = opts.sub ? 120 : 150;
  ctx.font = `${opts.font ?? 'italic 900'} ${px}px "Saira Condensed", "Arial Black", sans-serif`;
  const mw = ctx.measureText(text).width;
  if (mw > W * 0.9) { px *= (W * 0.9) / mw; ctx.font = `${opts.font ?? 'italic 900'} ${px}px "Saira Condensed", "Arial Black", sans-serif`; }
  const ty = opts.sub ? H * 0.4 : H * 0.52;
  ctx.lineWidth = 10;
  ctx.strokeText(text, W / 2, ty);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(text, W / 2, ty);
  if (opts.sub) {
    ctx.font = `700 54px "Saira Condensed", Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(opts.sub, W / 2, H * 0.82);
  }
  const t = tex(c);
  const w = opts.w ?? 6, h = opts.h ?? 1.5;
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: !opts.box, color: new THREE.Color(1.8, 1.8, 1.8), depthWrite: !!opts.box, side: THREE.DoubleSide });
  const g = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  g.add(plane);
  return g;
}

export function bannerTexture(kind: string, bg: string, fg: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 128);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  if (['kairo', 'mizuno', 'takeda', 'werkhaus', 'belladonna', 'ironclad', 'apex', 'ctw'].includes(kind)) {
    drawLogo(ctx, kind, 70, 64, 100);
    ctx.fillStyle = fg;
    ctx.font = 'italic 900 56px "Arial Black", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(kind === 'ctw' ? 'CUT THE WIND' : kind.toUpperCase(), 140, 66);
  } else drawSponsor(ctx, kind, 256, 64, 440, 96, fg, bg);
  return tex(c);
}

const crowdCache: { tex?: THREE.CanvasTexture } = {};
function crowdAtlas(): THREE.CanvasTexture {
  if (crowdCache.tex) return crowdCache.tex;
  const [c, ctx] = canvas(1024, 256);
  ctx.clearRect(0, 0, 1024, 256);
  for (let i = 0; i < 8; i++) {
    const x0 = i * 128;
    const shirt = ['#1a1c22', '#2a1f1f', '#14202a', '#2b2b2b', '#30242e', '#182218', '#3a2c18', '#20203a'][i];
    ctx.fillStyle = shirt;
    const w = 40 + (i % 3) * 8;
    const cx = x0 + 64;
    // legs
    ctx.fillStyle = '#121216';
    ctx.fillRect(cx - w * 0.3, 160, w * 0.26, 96);
    ctx.fillRect(cx + w * 0.04, 160, w * 0.26, 96);
    // torso
    ctx.fillStyle = shirt;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, 78, w, 92, 14); ctx.fill();
    // arms
    if (i % 2 === 0) { ctx.fillRect(cx - w / 2 - 10, 84, 12, 70); ctx.fillRect(cx + w / 2 - 2, 84, 12, 70); }
    else { ctx.save(); ctx.translate(cx + w / 2, 90); ctx.rotate(-0.9); ctx.fillRect(0, 0, 12, 60); ctx.restore(); ctx.fillRect(cx - w / 2 - 10, 84, 12, 70); }
    // head
    ctx.fillStyle = '#2a2220';
    ctx.beginPath(); ctx.arc(cx, 58, 19, 0, Math.PI * 2); ctx.fill();
    if (i % 3 === 1) { ctx.fillStyle = '#0c0c0e'; ctx.fillRect(cx - 22, 36, 44, 12); } // cap
    // phone screen glow
    if (i % 4 === 1) { ctx.fillStyle = '#cfe8ff'; ctx.fillRect(cx + w / 2 + 14, 40, 10, 16); }
    // rim light
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(x0, 0, x0 + 128, 0);
    g.addColorStop(0, 'rgba(255,160,80,0.25)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(80,160,255,0.25)');
    ctx.fillStyle = g; ctx.fillRect(x0, 0, 128, 256);
    ctx.globalCompositeOperation = 'source-over';
  }
  crowdCache.tex = tex(c);
  return crowdCache.tex;
}

/** Crowd of billboard people. `spots` are [x, z, facingAngle]. */
export function crowd(spots: number[][], scale = 1): THREE.Group {
  const g = new THREE.Group();
  const t = crowdAtlas();
  const mats = Array.from({ length: 8 }, (_, i) => {
    const tt = t.clone();
    tt.repeat.set(1 / 8, 1);
    tt.offset.set(i / 8, 0);
    tt.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map: tt, transparent: true, alphaTest: 0.4, color: 0xb0b0b8, side: THREE.DoubleSide });
  });
  const geo = new THREE.PlaneGeometry(0.85 * scale, 1.75 * scale);
  geo.translate(0, 0.875 * scale, 0);
  const groups: number[][][] = Array.from({ length: 8 }, () => []);
  spots.forEach((s, i) => groups[(i * 7 + Math.floor(s[0] * 13)) % 8 >= 0 ? Math.abs((i * 7 + Math.floor(s[0] * 13)) % 8) : 0].push(s));
  groups.forEach((list, k) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mats[k], list.length);
    const m = new THREE.Matrix4();
    list.forEach((s, i) => {
      const sc = 0.9 + ((i * 37) % 10) / 40;
      m.compose(new THREE.Vector3(s[0], 0, s[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s[2], 0)), new THREE.Vector3(sc, sc, sc));
      im.setMatrixAt(i, m);
    });
    g.add(im);
  });
  return g;
}

/** Distant skyline ring with lit windows. */
export function skyline(radius: number, height: number, tint: string, seed = 1): THREE.Mesh {
  const [c, ctx] = canvas(2048, 256);
  ctx.clearRect(0, 0, 2048, 256);
  let r = seed;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  let x = 0;
  while (x < 2048) {
    const w = 30 + rnd() * 90;
    const h = 40 + rnd() * 200;
    ctx.fillStyle = '#07080c';
    ctx.fillRect(x, 256 - h, w, h);
    for (let wy = 256 - h + 8; wy < 250; wy += 9) for (let wx = x + 5; wx < x + w - 5; wx += 8) {
      if (rnd() < 0.35) { ctx.fillStyle = rnd() < 0.8 ? tint : '#9fd0ff'; ctx.globalAlpha = 0.4 + rnd() * 0.6; ctx.fillRect(wx, wy, 3, 4); ctx.globalAlpha = 1; }
    }
    if (rnd() < 0.15) { ctx.fillStyle = '#ff2030'; ctx.fillRect(x + w / 2 - 2, 256 - h - 6, 4, 4); }
    x += w + rnd() * 8;
  }
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  const geo = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, color: new THREE.Color(1.2, 1.2, 1.2) });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = height / 2 - 2;
  m.renderOrder = -5;
  return m;
}

/** Soft additive light pool decal on the ground. */
export function lightPool(color: number, size: number, intensity = 0.5): THREE.Mesh {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex(c), color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}

/** Corrugated metal / brick / concrete wall textures. */
export function wallTexture(kind: 'corrugated' | 'brick' | 'concrete', tint = '#5a5f66'): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, 512, 512);
  if (kind === 'corrugated') {
    for (let x = 0; x < 512; x += 16) {
      const g = ctx.createLinearGradient(x, 0, x + 16, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g; ctx.fillRect(x, 0, 16, 512);
    }
    for (let k = 0; k < 30; k++) { ctx.fillStyle = `rgba(90,50,20,${Math.random() * 0.25})`; ctx.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 40, 30 + Math.random() * 120); }
  } else if (kind === 'brick') {
    for (let y = 0; y < 512; y += 24) for (let x = (y / 24) % 2 ? -24 : 0; x < 512; x += 48) {
      ctx.fillStyle = `hsl(${12 + Math.random() * 10}, ${30 + Math.random() * 20}%, ${18 + Math.random() * 10}%)`;
      ctx.fillRect(x + 1, y + 1, 46, 22);
    }
  } else {
    const img = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 22; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function windowFacadeTexture(lit: string, seed: number): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = '#121318';
  ctx.fillRect(0, 0, 256, 512);
  let r = seed;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let y = 16; y < 500; y += 40) for (let x = 12; x < 244; x += 36) {
    const on = rnd() < 0.3;
    ctx.fillStyle = on ? lit : '#1c1e26';
    ctx.globalAlpha = on ? 0.6 + rnd() * 0.4 : 1;
    ctx.fillRect(x, y, 24, 26);
    ctx.globalAlpha = 1;
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
