// Night-time drag strip environment with venue themes, christmas tree, crowd and timing boards.
import * as THREE from 'three';
import type { Renderer } from './renderer';
import { bannerTexture, crowd, lightPool, neonSign, skyDome, skyline, wallTexture, wetGround, windowFacadeTexture } from './envkit';
import { canvas, tex } from './textures';

export interface VenueTheme {
  id: string;
  name: string;
  sky: [number, number, number];
  fog: number;
  fogNear: number;
  fogFar: number;
  lamp: number; // pole lamp colour
  accent: string[]; // neon colours
  props: 'docks' | 'foundry' | 'airfield' | 'canal';
  skylineTint: string;
}

export const VENUES: Record<string, VenueTheme> = {
  pier9: { id: 'pier9', name: 'PIER 9 DOCKS', sky: [0x05070d, 0x1a1420, 0x3a2418], fog: 0x0b0d14, fogNear: 60, fogFar: 520, lamp: 0xffa040, accent: ['#ff8a20', '#25c8ff', '#ff2a8a'], props: 'docks', skylineTint: '#ffb060' },
  foundry: { id: 'foundry', name: 'FOUNDRY ROW', sky: [0x08050a, 0x2a1010, 0x4a1a0a], fog: 0x140a0a, fogNear: 50, fogFar: 420, lamp: 0xff6a30, accent: ['#ff3a20', '#ffc030', '#ff2a8a'], props: 'foundry', skylineTint: '#ff7040' },
  airfield: { id: 'airfield', name: 'KESSLER AIRFIELD', sky: [0x03060f, 0x0c1830, 0x1a2a48], fog: 0x070c18, fogNear: 90, fogFar: 700, lamp: 0xcfe0ff, accent: ['#30a0ff', '#ffffff', '#40ffb0'], props: 'airfield', skylineTint: '#a0c8ff' },
  canal: { id: 'canal', name: 'CANAL EXPRESSWAY', sky: [0x02080a, 0x0a2024, 0x103030], fog: 0x061214, fogNear: 50, fogFar: 460, lamp: 0x60ffd0, accent: ['#30ffc0', '#c040ff', '#25c8ff'], props: 'canal', skylineTint: '#80ffe0' },
};

export const LANE_X = { player: -1.85, rival: 1.85 };

interface TreeLane { pre: THREE.MeshBasicMaterial; stage: THREE.MeshBasicMaterial; amber: THREE.MeshBasicMaterial[]; green: THREE.MeshBasicMaterial; red: THREE.MeshBasicMaterial }

const OFF = new THREE.Color(0.08, 0.07, 0.06);

export class StripScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3000);
  readonly theme: VenueTheme;
  readonly distance: number;
  tree: { player: TreeLane; rival: TreeLane };
  private boardCtx!: CanvasRenderingContext2D;
  private boardTex!: THREE.CanvasTexture;
  poleZ: number[] = [];
  carLights: THREE.PointLight[] = [];
  private flicker: THREE.MeshBasicMaterial[] = [];
  private t = 0;

  constructor(r: Renderer, venueId: string, distance: number, opts: { meet?: boolean } = {}) {
    const th = VENUES[venueId] ?? VENUES.pier9;
    this.theme = th;
    this.distance = distance;
    const s = this.scene;
    s.background = new THREE.Color(th.sky[0]);
    s.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
    s.environment = r.nightEnv('venue_' + th.id, { sky: th.sky[1], ground: 0x060608, lights: th.accent.map((c) => new THREE.Color(c).getHex()).concat([th.lamp, th.lamp]), strips: 3 });
    s.add(skyDome(th.sky[0], th.sky[1], th.sky[2]));
    s.add(skyline(1100, 260, th.skylineTint, th.id.length * 7));

    const len = distance + 520;
    const zc = len / 2 - 120;
    s.add(wetGround(70, len, zc, r.settings.reflections, [8, len / 8], 0.78));

    // lights
    s.add(new THREE.HemisphereLight(0x6070a0, 0x101010, 0.45));
    const moon = new THREE.DirectionalLight(0x9ab0ff, 0.5);
    moon.position.set(-30, 60, -40);
    s.add(moon);
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(th.lamp, 0, 16, 1.4);
      s.add(pl);
      this.carLights.push(pl);
    }
    const startSpots = [[-7, 6, -6], [7, 6, -6], [0, 9, 8]];
    for (const [x, y, z] of startSpots) {
      const sp = new THREE.SpotLight(0xfff0dd, 120, 40, 0.7, 0.6, 1.4);
      sp.position.set(x, y, z);
      sp.target.position.set(0, 0, 0);
      s.add(sp, sp.target);
    }

    this.buildTrackMarkings(len, zc);
    this.buildWallsAndPoles(len);
    this.tree = this.buildTree();
    this.buildBoards();
    this.buildProps(th, len);
    this.buildCrowdAndSigns(th, !!opts.meet);
  }

  private buildTrackMarkings(len: number, zc: number) {
    const s = this.scene;
    const white = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.75, 0.75) });
    const yellow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.6, 0.1) });
    const line = (x: number, z0: number, z1: number, w: number, m: THREE.Material) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, z1 - z0), m);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.012, (z0 + z1) / 2);
      s.add(p);
    };
    line(0, -60, len - 120, 0.14, yellow);
    for (const x of [-3.8, 3.8]) line(x, -60, len - 120, 0.12, white);
    // start line and staging
    const st = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.3), white);
    st.rotation.x = -Math.PI / 2;
    st.position.set(0, 0.013, 0);
    s.add(st);
    // finish line checker
    const [c, ctx] = canvas(256, 32);
    for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#f0f0f0' : '#111'; ctx.fillRect(i * 8, j * 8, 8, 8); }
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.95), new THREE.MeshBasicMaterial({ map: tex(c) }));
    fin.rotation.x = -Math.PI / 2;
    fin.position.set(0, 0.013, this.distance);
    s.add(fin);
    // burnout box: dark rubber marks
    const [bc, bctx] = canvas(128, 512);
    bctx.clearRect(0, 0, 128, 512);
    for (const x of [28, 100]) { const g = bctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0.9)'); bctx.fillStyle = g; bctx.fillRect(x - 12, 0, 24, 512); }
    for (const lx of [-1.85, 1.85]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 70), new THREE.MeshBasicMaterial({ map: tex(bc), transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(lx, 0.014, 30);
      s.add(m);
    }
    void zc;
  }

  private buildWallsAndPoles(len: number) {
    const s = this.scene;
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture('concrete', '#6a6c70'), roughness: 0.9 });
    (wallMat.map as THREE.Texture).repeat.set(len / 6, 1);
    for (const sx of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, len), wallMat);
      wall.position.set(sx * 8.2, 0.45, len / 2 - 120);
      s.add(wall);
    }
    // sponsor banners on walls
    const sponsors = ['VOLTEX', 'NIGHTGRID', 'ZENRYU', 'kairo', 'HAKU', 'ctw', 'STRATA', 'apex', 'ORBITAL', 'ironclad', 'KANSO', 'TORQUE HOUSE'];
    const mats = sponsors.map((sp, i) => new THREE.MeshBasicMaterial({ map: bannerTexture(sp, ['#0c0f18', '#1a0a0c', '#0a1410'][i % 3], '#f2f2f2'), color: 0x8a8a8a }));
    for (let z = -40, i = 0; z < this.distance + 200; z += 24, i++) {
      for (const sx of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8), mats[(i + (sx > 0 ? 3 : 0)) % mats.length]);
        b.position.set(sx * 7.93, 0.5, z);
        b.rotation.y = -sx * Math.PI / 2;
        s.add(b);
      }
    }
    // light poles (instanced)
    const poleG = new THREE.CylinderGeometry(0.09, 0.13, 11, 8);
    poleG.translate(0, 5.5, 0);
    const armG = new THREE.BoxGeometry(2.4, 0.12, 0.12);
    const lampG = new THREE.BoxGeometry(0.9, 0.12, 0.4);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3c40, metalness: 0.7, roughness: 0.5 });
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.theme.lamp).multiplyScalar(2.6) });
    const zs: number[] = [];
    for (let z = -30; z < this.distance + 300; z += 32) zs.push(z);
    this.poleZ = zs;
    const n = zs.length * 2;
    const poles = new THREE.InstancedMesh(poleG, poleMat, n);
    const arms = new THREE.InstancedMesh(armG, poleMat, n);
    const lamps = new THREE.InstancedMesh(lampG, lampMat, n);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (const z of zs) for (const sx of [-1, 1]) {
      m4.makeTranslation(sx * 10, 0, z); poles.setMatrixAt(k, m4);
      m4.makeTranslation(sx * 9, 10.9, z); arms.setMatrixAt(k, m4);
      m4.makeTranslation(sx * 8.1, 10.8, z); lamps.setMatrixAt(k, m4);
      k++;
      const pool = lightPool(this.theme.lamp, 13, 0.3);
      pool.position.set(sx * 6, 0.02, z);
      s.add(pool);
    }
    s.add(poles, arms, lamps);
  }

  private buildTree(): { player: TreeLane; rival: TreeLane } {
    const s = this.scene;
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.5, roughness: 0.5 });
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), dark);
    pole.position.y = 1.3;
    g.add(pole);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.25), dark);
    housing.position.y = 2.7;
    g.add(housing);
    const bulbG = new THREE.SphereGeometry(0.075, 12, 8);
    const mk = (x: number): TreeLane => {
      const mat = () => new THREE.MeshBasicMaterial({ color: OFF.clone() });
      const lane: TreeLane = { pre: mat(), stage: mat(), amber: [mat(), mat(), mat()], green: mat(), red: mat() };
      const place = (m: THREE.MeshBasicMaterial, y: number, scale = 1) => {
        for (const side of [-1, 1]) {
          const b = new THREE.Mesh(bulbG, m);
          b.scale.setScalar(scale);
          b.position.set(x, y, side * 0.13);
          g.add(b);
        }
      };
      place(lane.pre, 3.35, 0.7);
      place(lane.stage, 3.18, 0.7);
      lane.amber.forEach((m, i) => place(m, 2.95 - i * 0.24));
      place(lane.green, 2.2);
      place(lane.red, 1.97);
      return lane;
    };
    const tree = { player: mk(-0.22), rival: mk(0.22) };
    g.position.set(0, 0, 1.2);
    s.add(g);
    return tree;
  }

  setTree(lane: 'player' | 'rival', state: { pre: boolean; stage: boolean; amber: number; green: boolean; red: boolean }) {
    const L = this.tree[lane];
    const on = (m: THREE.MeshBasicMaterial, v: boolean, c: THREE.Color) => m.color.copy(v ? c : OFF);
    const W = new THREE.Color(3, 2.8, 2.2), A = new THREE.Color(3.2, 1.6, 0.2), G = new THREE.Color(0.4, 3.2, 0.6), R = new THREE.Color(3.4, 0.2, 0.15);
    on(L.pre, state.pre, W);
    on(L.stage, state.stage, W);
    L.amber.forEach((m, i) => on(m, state.amber > i, A));
    on(L.green, state.green, G);
    on(L.red, state.red, R);
  }

  private buildBoards(): { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture } {
    const [c, ctx] = canvas(512, 256);
    const t = tex(c);
    this.boardCtx = ctx;
    this.boardTex = t;
    const mat = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.4, 1.4, 1.4) });
    for (const z of [6, this.distance + 30]) {
      for (const sx of [-1, 1]) {
        const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), mat);
        board.position.set(sx * 11.5, 5, z);
        board.rotation.y = -sx * 0.6 + (z > 10 ? Math.PI : 0) * 0;
        board.lookAt(0, 3, z - 30);
        this.scene.add(board);
      }
    }
    // finish gantry
    const dark = new THREE.MeshStandardMaterial({ color: 0x202226, metalness: 0.6, roughness: 0.5 });
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), dark);
      p.position.set(sx * 8.6, 3.5, this.distance);
      this.scene.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(17.6, 1.1, 0.5), dark);
    beam.position.set(0, 7.2, this.distance);
    this.scene.add(beam);
    const fin = neonSign('FINISH', '#ff3a3a', { w: 6, h: 1.1 });
    fin.position.set(0, 7.2, this.distance - 0.3);
    fin.rotation.y = Math.PI;
    this.scene.add(fin);
    // distance boards
    const marks: [number, string][] = [[201.168, '1/8 MILE'], [304.8, '1000 FT'], [402.336, '1/4 MILE'], [804.672, '1/2 MILE']];
    for (const [z, label] of marks) {
      if (z > this.distance + 1) continue;
      const sign = neonSign(label, '#ffffff', { w: 3, h: 0.75, box: true, font: '800' });
      sign.position.set(-9.5, 2.6, z);
      sign.rotation.y = Math.PI;
      this.scene.add(sign);
    }
    this.setBoard('--.---', '---', '--.---', '---');
    return { ctx, tex: t };
  }

  setBoard(etL: string, mphL: string, etR: string, mphR: string, winner: 'L' | 'R' | '' = '') {
    const ctx = this.boardCtx;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 512, 256);
    ctx.font = '900 30px "Orbitron", "Arial Black", monospace';
    ctx.textAlign = 'center';
    for (const [i, et, sp, w] of [[0, etL, mphL, winner === 'L'], [1, etR, mphR, winner === 'R']] as const) {
      const x = 128 + i * 256;
      ctx.fillStyle = '#ffb020';
      ctx.font = '700 22px Arial';
      ctx.fillText(i === 0 ? 'LEFT LANE' : 'RIGHT LANE', x, 34);
      ctx.fillStyle = '#ff3a20';
      ctx.font = '900 54px "Orbitron", monospace';
      ctx.fillText(et, x, 108);
      ctx.fillStyle = '#ffd040';
      ctx.font = '900 40px "Orbitron", monospace';
      ctx.fillText(sp, x, 170);
      ctx.font = '700 18px Arial';
      ctx.fillText('KM/H', x, 200);
      if (w) { ctx.fillStyle = '#40ff60'; ctx.fillRect(x - 60, 222, 120, 20); ctx.fillStyle = '#000'; ctx.fillText('WIN', x, 238); }
    }
    if (this.boardTex) this.boardTex.needsUpdate = true;
  }

  private buildProps(th: VenueTheme, len: number) {
    const s = this.scene;
    const rnd = (() => { let r = th.id.length * 1013; return () => { r = (r * 9301 + 49297) % 233280; return r / 233280; }; })();
    const facades = [windowFacadeTexture(th.skylineTint, 3), windowFacadeTexture('#9fd0ff', 7), windowFacadeTexture(th.accent[0], 11)];
    const facadeMats = facades.map((f) => new THREE.MeshStandardMaterial({ map: f, emissiveMap: f, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.9 }));
    const box = new THREE.BoxGeometry(1, 1, 1);
    // buildings beyond the walls
    for (let z = -80; z < len; z += 0) {
      for (const sx of [-1, 1]) {
        const w = 14 + rnd() * 20, d = 12 + rnd() * 26, h = th.props === 'airfield' ? 8 + rnd() * 6 : 10 + rnd() * 30;
        const mat = facadeMats[Math.floor(rnd() * facadeMats.length)].clone();
        (mat.map as THREE.Texture) = facades[Math.floor(rnd() * facades.length)].clone();
        mat.map!.repeat.set(Math.max(1, w / 8), Math.max(1, h / 12));
        mat.map!.needsUpdate = true;
        mat.emissiveMap = mat.map;
        const b = new THREE.Mesh(box, mat);
        b.scale.set(w, h, d);
        b.position.set(sx * (34 + w / 2 + rnd() * 30), h / 2, z + d / 2);
        s.add(b);
      }
      z += 30 + rnd() * 30;
    }
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.6, roughness: 0.5 });
    if (th.props === 'docks') {
      // shipping containers
      const colors = [0x8a2a1a, 0x1a4a7a, 0x2a6a3a, 0x9a7a1a, 0x5a5a5a, 0x7a3a6a];
      const cg = new THREE.BoxGeometry(2.5, 2.6, 12);
      for (let i = 0; i < 70; i++) {
        const sx = rnd() < 0.5 ? -1 : 1;
        const m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: wallTexture('corrugated', '#' + colors[i % colors.length].toString(16).padStart(6, '0')), roughness: 0.7, metalness: 0.3 }));
        const stack = Math.floor(rnd() * 3);
        m.position.set(sx * (14 + rnd() * 16), 1.3 + stack * 2.6, -60 + rnd() * (len - 100));
        m.rotation.y = rnd() < 0.3 ? Math.PI / 2 : 0;
        s.add(m);
      }
      // cranes
      for (let i = 0; i < 4; i++) {
        const crane = new THREE.Group();
        for (const dx of [-4, 4]) for (const dz of [-4, 4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 34, 0.8), metal); leg.position.set(dx, 17, dz); crane.add(leg); }
        const boom = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 60), metal);
        boom.position.set(0, 36, 14);
        crane.add(boom);
        const blink = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.2) }));
        blink.position.set(0, 37.5, 44);
        crane.add(blink);
        this.flicker.push(blink.material as THREE.MeshBasicMaterial);
        crane.position.set(i % 2 ? 46 : -46, 0, 60 + i * 150);
        crane.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2;
        s.add(crane);
      }
    } else if (th.props === 'foundry') {
      for (let i = 0; i < 10; i++) {
        const sx = i % 2 ? -1 : 1;
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2, 40, 12), new THREE.MeshStandardMaterial({ map: wallTexture('brick', '#5a2a1e'), roughness: 0.9 }));
        stack.position.set(sx * (40 + rnd() * 30), 20, -40 + i * 90);
        s.add(stack);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.7, 0.2), transparent: true, opacity: 0.6 }));
        glow.position.set(stack.position.x, 40.5, stack.position.z);
        s.add(glow);
      }
      for (let i = 0; i < 40; i++) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 20, 8), metal);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set((rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 10), 3 + rnd() * 6, rnd() * len - 60);
        s.add(pipe);
      }
    } else if (th.props === 'airfield') {
      for (let z = -40; z < len; z += 12) {
        for (const sx of [-1, 1]) {
          const l = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.0, 3.0) }));
          l.position.set(sx * 16, 0.2, z);
          s.add(l);
        }
      }
      for (let i = 0; i < 5; i++) {
        const hangar = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 40, 24, 1, false, 0, Math.PI), metal);
        hangar.rotation.z = Math.PI / 2;
        hangar.rotation.y = Math.PI / 2;
        hangar.position.set(i % 2 ? 60 : -60, 0, i * 160);
        s.add(hangar);
      }
    } else if (th.props === 'canal') {
      // overpass
      for (let i = 0; i < 6; i++) {
        const z = 60 + i * 140;
        const deck = new THREE.Mesh(new THREE.BoxGeometry(80, 2, 14), new THREE.MeshStandardMaterial({ map: wallTexture('concrete', '#4a4e54'), roughness: 0.9 }));
        deck.position.set(0, 14, z);
        s.add(deck);
        for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 2), deck.material); p.position.set(sx * 13, 7, z); s.add(p); }
        const strip = new THREE.Mesh(new THREE.BoxGeometry(80, 0.15, 0.15), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 3, 2.2) }));
        strip.position.set(0, 12.95, z - 7);
        s.add(strip);
      }
      const water = new THREE.Mesh(new THREE.PlaneGeometry(40, len), new THREE.MeshStandardMaterial({ color: 0x041014, roughness: 0.1, metalness: 0.8 }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(-50, -0.5, len / 2 - 120);
      s.add(water);
    }
  }

  private buildCrowdAndSigns(th: VenueTheme, meet: boolean) {
    const s = this.scene;
    const spots: number[][] = [];
    const rnd = (() => { let r = 777; return () => { r = (r * 9301 + 49297) % 233280; return r / 233280; }; })();
    const zMax = meet ? 60 : 40;
    for (let i = 0; i < (meet ? 260 : 170); i++) {
      const sx = rnd() < 0.5 ? -1 : 1;
      const x = sx * (8.8 + rnd() * 6);
      const z = -30 + rnd() * (zMax + 30);
      spots.push([x, z, sx > 0 ? -Math.PI / 2 + (rnd() - 0.5) : Math.PI / 2 + (rnd() - 0.5)]);
    }
    // people around the start line behind the cars
    for (let i = 0; i < (meet ? 40 : 18); i++) spots.push([(rnd() - 0.5) * 12, -12 - rnd() * 14, (rnd() - 0.5) * 0.8]);
    s.add(crowd(spots));
    // neon signs
    const signs: [string, string, string | undefined][] = [[th.name, th.accent[0], 'STREET DRAG · NIGHTLY'], ['CUT THE WIND', th.accent[1], undefined], ['NIGHTGRID', th.accent[2], 'ENGINE MANAGEMENT'], ['24H DINER', '#ff4060', 'OPEN LATE']];
    signs.forEach(([txt, col, sub], i) => {
      const sign = neonSign(txt, col, { sub, w: 9, h: 2.25 });
      const sx = i % 2 ? 1 : -1;
      sign.position.set(sx * 17, 6 + (i % 2) * 2, -10 + i * 22);
      sign.rotation.y = -sx * Math.PI / 2 + sx * 0.5;
      s.add(sign);
    });
    const big = neonSign('START', th.accent[1], { w: 5, h: 1.2 });
    big.position.set(0, 5.4, 1.5);
    big.rotation.y = Math.PI;
    s.add(big);
  }

  /** Move per-car fill lights so cars pick up lamp light as they pass poles. */
  updateCarLights(positions: THREE.Vector3[]) {
    this.t += 1 / 60;
    positions.forEach((p, i) => {
      const L = this.carLights[i * 2], L2 = this.carLights[i * 2 + 1];
      if (!L) return;
      let nearest = 1e9;
      for (const z of this.poleZ) { const d = z - p.z; if (Math.abs(d) < Math.abs(nearest)) nearest = d; }
      const k = Math.exp(-(nearest * nearest) / 60);
      L.position.set(p.x + (p.x > 0 ? 3 : -3), 6, p.z + nearest * 0.6);
      L.intensity = 30 + 90 * k;
      L2.position.set(p.x, 2.5, p.z + 4);
      L2.intensity = 10;
    });
    for (const f of this.flicker) f.color.setRGB(Math.sin(this.t * 3) > 0.6 ? 3 : 0.2, 0.1, 0.1);
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        if (!m.geometry.userData.cached) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      }
      if ((o as any).isReflector) (o as any).dispose?.();
    });
  }
}
