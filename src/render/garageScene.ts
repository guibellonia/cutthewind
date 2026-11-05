// Garage / showroom scene with an orbit camera, used for menus, customisation and the dealership.
import * as THREE from 'three';
import type { CarBuild } from '../core/types';
import { CarVisual } from './car';
import type { Renderer } from './renderer';
import { bannerTexture, lightPool, neonSign, wallTexture, wetGround } from './envkit';
import { canvas, tex } from './textures';
import { drawLogo } from './logos';

export type GarageTheme = 'home' | 'showroom' | 'shop';
export type FocusPreset = 'overview' | 'front' | 'rear' | 'side' | 'wheel' | 'hood' | 'roof' | 'interior' | 'exhaust' | 'top' | 'hero';

interface Orbit { yaw: number; pitch: number; dist: number; target: THREE.Vector3 }

const PRESETS: Record<FocusPreset, Orbit> = {
  overview: { yaw: 0.75, pitch: 0.2, dist: 6.6, target: new THREE.Vector3(0, 0.6, 0) },
  hero: { yaw: 0.55, pitch: 0.08, dist: 5.4, target: new THREE.Vector3(0, 0.55, 0.2) },
  front: { yaw: 0.35, pitch: 0.12, dist: 4.4, target: new THREE.Vector3(0, 0.5, 1.6) },
  rear: { yaw: Math.PI - 0.4, pitch: 0.14, dist: 4.4, target: new THREE.Vector3(0, 0.6, -1.6) },
  side: { yaw: Math.PI / 2, pitch: 0.06, dist: 6.0, target: new THREE.Vector3(0, 0.6, 0) },
  wheel: { yaw: 1.2, pitch: 0.05, dist: 2.6, target: new THREE.Vector3(0.8, 0.35, 1.3) },
  hood: { yaw: 0.2, pitch: 0.45, dist: 3.8, target: new THREE.Vector3(0, 0.8, 1.2) },
  roof: { yaw: 0.9, pitch: 0.75, dist: 4.6, target: new THREE.Vector3(0, 1.1, -0.2) },
  interior: { yaw: 1.35, pitch: 0.3, dist: 2.2, target: new THREE.Vector3(0.2, 0.95, 0.1) },
  exhaust: { yaw: Math.PI - 0.25, pitch: 0.02, dist: 2.8, target: new THREE.Vector3(0, 0.35, -2.0) },
  top: { yaw: 0.0001, pitch: 1.35, dist: 7, target: new THREE.Vector3(0, 0.6, 0) },
};

export class GarageScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  car: CarVisual | null = null;
  private orbit: Orbit = { ...PRESETS.overview, target: PRESETS.overview.target.clone() };
  private goal: Orbit = { ...PRESETS.overview, target: PRESETS.overview.target.clone() };
  private turntable: THREE.Mesh;
  autoRotate = true;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private idle = 0;
  private cleanup: (() => void)[] = [];
  private t = 0;
  private neonMats: THREE.MeshBasicMaterial[] = [];
  theme: GarageTheme;

  constructor(r: Renderer, theme: GarageTheme = 'home') {
    this.theme = theme;
    const s = this.scene;
    const showroom = theme === 'showroom';
    s.background = new THREE.Color(showroom ? 0x0d0f14 : 0x07080b);
    s.fog = new THREE.Fog(s.background as THREE.Color, 14, 34);
    s.environment = r.nightEnv(showroom ? 'showroom' : 'garage', showroom
      ? { sky: 0x3a4250, ground: 0x15171c, lights: [0xffffff, 0xdde8ff, 0xffffff, 0xffe6cc], strips: 8 }
      : { sky: 0x1a1f2a, ground: 0x0a0b0e, lights: [0x20c0ff, 0xff2a8a, 0xffa030, 0x30ffb0], strips: 5 });

    // floor
    s.add(wetGround(30, 30, 0, r.settings.reflections, [6, 6], showroom ? 0.72 : 0.84));
    // turntable
    const ttMat = new THREE.MeshStandardMaterial({ color: showroom ? 0x2a2d33 : 0x1a1b1f, metalness: 0.7, roughness: 0.35 });
    this.turntable = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.35, 0.06, 64), ttMat);
    this.turntable.position.y = 0.03;
    s.add(this.turntable);
    const ringMat = new THREE.MeshBasicMaterial({ color: showroom ? new THREE.Color(1.2, 1.2, 1.3) : new THREE.Color(0.2, 0.9, 1.4) });
    this.neonMats.push(ringMat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.34, 0.02, 6, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    s.add(ring);

    // lights
    s.add(new THREE.HemisphereLight(0x8090b0, 0x101012, showroom ? 1.0 : 0.55));
    const key = new THREE.DirectionalLight(0xfff2e0, showroom ? 2.2 : 1.4);
    key.position.set(4, 8, 5);
    s.add(key);
    const rim = new THREE.DirectionalLight(showroom ? 0xd0e0ff : 0x40a0ff, showroom ? 1.2 : 1.6);
    rim.position.set(-6, 3, -5);
    s.add(rim);
    const fill = new THREE.PointLight(showroom ? 0xffffff : 0xff3a8a, showroom ? 20 : 26, 14, 1.5);
    fill.position.set(-5, 2.5, 3);
    s.add(fill);
    const fill2 = new THREE.PointLight(showroom ? 0xffffff : 0x20c0ff, showroom ? 20 : 24, 14, 1.5);
    fill2.position.set(5, 2.5, -3);
    s.add(fill2);

    // ceiling tubes
    const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.3, 1.2) });
    for (let i = -1; i <= 1; i++) {
      for (const z of [-2.5, 2.5]) {
        const tube = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 2.4), tubeMat);
        tube.position.set(i * 2.6, 5.2, z);
        s.add(tube);
      }
    }

    // walls
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture(showroom ? 'concrete' : 'corrugated', showroom ? '#3a3d44' : '#41464d'), roughness: 0.8, metalness: showroom ? 0.0 : 0.3 });
    (wallMat.map as THREE.Texture).repeat.set(5, 1.5);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 7), wallMat);
    back.position.set(0, 3.5, -9);
    s.add(back);
    const sideMat = new THREE.MeshStandardMaterial({ map: wallTexture(showroom ? 'concrete' : 'brick', showroom ? '#34373e' : '#3a2a24'), roughness: 0.9 });
    (sideMat.map as THREE.Texture).repeat.set(4, 1.5);
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(22, 7), sideMat);
      w.rotation.y = -sx * Math.PI / 2;
      w.position.set(sx * 11, 3.5, 0);
      s.add(w);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 5.4;
    s.add(ceil);

    // signage & props
    if (showroom) {
      const sign = neonSign('PREMIER AUTO', '#ffffff', { sub: 'NEW · USED · IMPORT', w: 8, h: 2 });
      sign.position.set(0, 4.2, -8.9);
      s.add(sign);
      const brands = ['kairo', 'mizuno', 'takeda', 'werkhaus', 'belladonna', 'ironclad', 'apex'];
      brands.forEach((b, i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: bannerTexture(b, '#0e1016', '#e8ecf2') }));
        const a = (i / brands.length) * Math.PI * 1.2 - Math.PI * 0.6;
        m.position.set(Math.sin(a) * 10.8, 2.6, -Math.cos(a) * 8.5);
        m.lookAt(0, 2.6, 0);
        s.add(m);
      });
      for (let i = 0; i < 4; i++) {
        const spot = new THREE.SpotLight(0xffffff, 60, 16, 0.5, 0.6, 1.5);
        spot.position.set(Math.cos(i * 1.57) * 4, 5, Math.sin(i * 1.57) * 4);
        spot.target.position.set(0, 0, 0);
        s.add(spot, spot.target);
      }
    } else {
      const sign = neonSign('CUT THE WIND', '#25c8ff', { sub: 'GARAGE · EST. 2004', w: 7, h: 1.75 });
      sign.position.set(0, 3.8, -8.9);
      s.add(sign);
      const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.3, 1.0) });
      this.neonMats.push(stripMat);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(18, 0.05, 0.05), stripMat);
      strip.position.set(0, 2.2, -8.85);
      s.add(strip);
      s.add(this.props());
    }
    const pool = lightPool(showroom ? 0xffffff : 0x2a8cff, 9, showroom ? 0.1 : 0.12);
    pool.position.y = 0.065;
    s.add(pool);
    this.camera.position.set(5, 2, 5);
  }

  private props(): THREE.Group {
    const g = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: 0x9c1418, metalness: 0.5, roughness: 0.4 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a9098, metalness: 0.8, roughness: 0.4 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 });
    // tool chest
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.6), red);
    chest.position.set(-7.5, 0.55, -8.2);
    g.add(chest);
    for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.02), steel); d.position.set(-7.5, 0.25 + i * 0.18, -7.89); g.add(d); }
    // workbench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.9), wood);
    bench.position.set(6.5, 0.95, -8.3);
    g.add(bench);
    for (const x of [5.2, 7.8]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.8), steel); leg.position.set(x, 0.47, -8.3); g.add(leg); }
    // tyre stacks
    const tyreG = new THREE.TorusGeometry(0.33, 0.12, 10, 24);
    for (const [x, z, n] of [[-9.5, -4, 4], [-9.6, -2.7, 3], [9.4, 3, 5]] as const) {
      for (let i = 0; i < n; i++) { const t = new THREE.Mesh(tyreG, rubber); t.rotation.x = Math.PI / 2; t.position.set(x, 0.12 + i * 0.24, z); g.add(t); }
    }
    // shelves with parts boxes
    for (let lvl = 0; lvl < 3; lvl++) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 4), steel);
      sh.position.set(10.6, 0.6 + lvl * 0.9, -2);
      g.add(sh);
      for (let k = 0; k < 4; k++) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: [0x7a5a30, 0x2a4a7a, 0x6a6a6a, 0x8a2a20][(k + lvl) % 4], roughness: 0.8 }));
        box.position.set(10.55, 0.8 + lvl * 0.9, -3.5 + k * 0.95);
        g.add(box);
      }
    }
    // posters
    const posters = ['kairo', 'ironclad', 'werkhaus', 'mizuno'];
    posters.forEach((b, i) => {
      const [c, ctx] = canvas(256, 360);
      const grd = ctx.createLinearGradient(0, 0, 0, 360);
      grd.addColorStop(0, ['#0b2a5a', '#3a0a0a', '#101820', '#2a0a2a'][i]); grd.addColorStop(1, '#050507');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 360);
      drawLogo(ctx, b, 128, 140, 150);
      ctx.fillStyle = '#f0f0f0'; ctx.font = 'italic 900 34px Arial Black, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b.toUpperCase(), 128, 280);
      ctx.font = '700 16px Arial'; ctx.fillText('PERFORMANCE SINCE ' + ['1978', '1965', '1954', '1969'][i], 128, 310);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.55), new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.6 }));
      m.rotation.y = Math.PI / 2;
      m.position.set(-10.95, 2.6, -5 + i * 2.2);
      g.add(m);
    });
    // roll-up door glow
    const door = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.2, 0.6) }));
    door.rotation.y = -Math.PI / 2;
    door.position.set(10.95, 0.08, 4);
    g.add(door);
    return g;
  }

  setCar(build: CarBuild | null) {
    if (this.car) { this.car.dispose(); this.car = null; }
    if (!build) return;
    this.car = new CarVisual(build, { interior: true });
    this.car.root.position.y = 0.06;
    this.turntable.add(this.car.root);
    this.car.root.position.set(0, 0.03, 0);
  }

  focus(p: FocusPreset) {
    const preset = PRESETS[p];
    this.goal = { ...preset, target: preset.target.clone() };
    if (this.car) {
      // scale z targets by car length
      const k = this.car.length / 4.4;
      this.goal.target.z *= k;
      if (p === 'wheel') this.goal.target.x = this.car.width / 2 - 0.05;
    }
    this.autoRotate = p === 'overview' || p === 'hero';
    this.idle = 0;
  }

  attachControls(el: HTMLElement) {
    const down = (e: PointerEvent) => { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; this.autoRotate = false; };
    const move = (e: PointerEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      this.goal.yaw -= dx * 0.008;
      this.goal.pitch = Math.max(-0.05, Math.min(1.35, this.goal.pitch + dy * 0.005));
      this.idle = 0;
    };
    const up = () => { this.dragging = false; };
    const wheel = (e: WheelEvent) => { this.goal.dist = Math.max(2, Math.min(11, this.goal.dist * (1 + Math.sign(e.deltaY) * 0.08))); this.idle = 0; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: true });
    this.cleanup.push(() => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    });
  }

  update(dt: number) {
    this.t += dt;
    this.idle += dt;
    if (this.autoRotate || this.idle > 12) this.goal.yaw += dt * 0.12;
    const k = Math.min(1, dt * 4);
    this.orbit.yaw += (this.goal.yaw - this.orbit.yaw) * k;
    this.orbit.pitch += (this.goal.pitch - this.orbit.pitch) * k;
    this.orbit.dist += (this.goal.dist - this.orbit.dist) * k;
    this.orbit.target.lerp(this.goal.target, k);
    const o = this.orbit;
    const cp = Math.cos(o.pitch);
    this.camera.position.set(o.target.x + Math.sin(o.yaw) * cp * o.dist, o.target.y + Math.sin(o.pitch) * o.dist, o.target.z + Math.cos(o.yaw) * cp * o.dist);
    this.camera.position.y = Math.max(0.25, this.camera.position.y);
    this.camera.lookAt(o.target);
    for (const m of this.neonMats) {
      const flick = Math.sin(this.t * 37) > 0.97 ? 0.4 : 1;
      m.color.multiplyScalar(1); // keep
      void flick;
    }
    this.car?.update(dt, { speed: 0, accel: 0, braking: false, rpm: 900, redline: 7000, nitro: false, throttle: 0 });
  }

  dispose() {
    for (const c of this.cleanup) c();
    this.cleanup = [];
    this.car?.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        if (!m.geometry.userData.cached) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      }
    });
  }
}
