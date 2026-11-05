// Assembles a complete procedural car from a CarBuild.
import * as THREE from 'three';
import type { CarBuild, PaintConfig } from '../core/types';
import { CARS } from '../data/cars';
import { visualPart } from '../data/visualParts';
import { BodyShape, kitParams } from './bodyShape';
import { ATLAS, buildBodyGeometry, surfacePatch } from './bodyMesh';
import { paintAtlas } from './vinyl';
import { canvas, carbonTexture, frontBumperTextures, frontFasciaTextures, headlightTextures, rearBumperTextures, rearFasciaTextures, resolveHeadlight, tex } from './textures';
import { createWheel, type WheelObject } from './wheels';
import { buildAero, buildExhaust, buildHoodDetails, buildInterior, buildMirrors, buildSpoiler, exhaustKind, tipMaterial, type PartMats } from './carParts';

export interface CarState {
  speed: number; // m/s
  wheelSpin?: number; // driven wheel speed m/s (for burnouts)
  accel: number; // m/s^2
  braking: boolean;
  rpm: number;
  redline: number;
  nitro: boolean;
  throttle: number;
  idle?: boolean;
}

export function paintMaterialParams(p: PaintConfig): THREE.MeshPhysicalMaterialParameters {
  switch (p.finish) {
    case 'solid': return { metalness: 0.05, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.05 };
    case 'pearl': return { metalness: 0.4, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.85, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 520], sheen: 0.6, sheenColor: new THREE.Color(p.pearl), sheenRoughness: 0.4 };
    case 'matte': return { metalness: 0.15, roughness: 0.64, clearcoat: 0 };
    case 'candy': return { metalness: 0.75, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.02 };
    case 'chrome': return { metalness: 1, roughness: 0.06, clearcoat: 0.5 };
    case 'carbon': return { metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.03 };
    default: return { metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 };
  }
}

const glowTexCache: Record<string, THREE.Texture> = {};
export function radialGlowTexture(kind: 'soft' | 'neon' | 'shadow' | 'beam' = 'soft'): THREE.Texture {
  if (glowTexCache[kind]) return glowTexCache[kind];
  const [c, ctx] = canvas(256, 256);
  if (kind === 'beam') {
    const g = ctx.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(110, 256); ctx.lineTo(146, 256); ctx.lineTo(256, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  } else if (kind === 'neon' || kind === 'shadow') {
    // rounded-rectangle falloff
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      ctx.fillStyle = kind === 'shadow' ? `rgba(0,0,0,${0.035})` : `rgba(255,255,255,${0.03})`;
      const m = t * 110;
      const r = 120 - m;
      ctx.beginPath();
      ctx.roundRect(m, m * 0.6, 256 - 2 * m, 256 - 1.2 * m, Math.max(4, r));
      ctx.fill();
    }
  } else {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  glowTexCache[kind] = tex(c);
  return glowTexCache[kind];
}

export class CarVisual {
  readonly build: CarBuild;
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly shape: BodyShape;
  wheels: { w: WheelObject; side: 1 | -1; front: boolean; x: number; z: number }[] = [];
  private disposables: { dispose(): void }[] = [];
  private rearMat!: THREE.MeshPhysicalMaterial;
  private headMats: THREE.MeshStandardMaterial[] = [];
  private frontCapMat!: THREE.MeshPhysicalMaterial;
  private fogMat!: THREE.MeshPhysicalMaterial;
  private neonMesh: THREE.Mesh | null = null;
  private neonLight: THREE.PointLight | null = null;
  private flames: THREE.Mesh[] = [];
  private beams: THREE.Mesh[] = [];
  private wheelAngle = 0;
  private t = 0;
  private pitch = 0;
  private backfire = 0;
  readonly rideHeight: number;
  lightsOn = true;
  readonly length: number;
  readonly width: number;

  constructor(build: CarBuild, opts: { interior?: boolean; beams?: boolean; shadow?: boolean } = {}) {
    this.build = build;
    const model = CARS[build.modelId];
    const v = build.visual;
    const shape = new BodyShape(model, kitParams(v));
    this.shape = shape;
    this.length = model.length;
    this.width = model.width;
    const geo = buildBodyGeometry(shape);
    this.root.add(this.body);

    // ---- atlas
    const [atlasC, atlasCtx] = canvas(ATLAS, ATLAS);
    paintAtlas(atlasCtx, model, v, shape);
    const atlas = tex(atlasC);
    atlas.anisotropy = 8;
    this.disposables.push(atlas);

    const pp = paintMaterialParams(v.paint);
    const paint = new THREE.MeshPhysicalMaterial({ map: atlas, color: 0xffffff, ...pp, envMapIntensity: 1.25 });
    const partPaint = new THREE.MeshPhysicalMaterial({ color: v.paint.finish === 'carbon' ? 0x222428 : v.paint.color, ...pp, envMapIntensity: 1.25, map: v.paint.finish === 'carbon' ? carbonTexture() : null });
    const carbonish = new THREE.MeshPhysicalMaterial({ map: atlas, color: 0xffffff, metalness: 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.2 });
    const carbon = new THREE.MeshPhysicalMaterial({ map: carbonTexture(), color: 0xffffff, metalness: 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 });
    const black = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.45, metalness: 0.3 });
    const dark = new THREE.MeshBasicMaterial({ color: 0x030304 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xf0f3f6, metalness: 1, roughness: 0.06 });
    const alu = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.9, roughness: 0.3 });
    const interiorCol = new THREE.Color(v.interior.color);
    const interior = new THREE.MeshStandardMaterial({ color: interiorCol, roughness: v.interior.material === 'leather' ? 0.45 : 0.85, metalness: 0.05 });
    const interiorDark = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.7, metalness: 0.1 });
    const tip = tipMaterial(v.exhaustFinish);
    const mats: PartMats = { paint: partPaint, carbon, black, chrome, alu, dark, tip, interior, interiorDark };
    this.disposables.push(paint, partPaint, carbonish, carbon, black, dark, chrome, alu, interior, interiorDark, tip);

    const hoodCarbon = !!visualPart('hood', v.hood).p.carbon;
    const roofCarbon = visualPart('roof', v.roof).p.kind === 'carbon';
    const tint = Math.min(0.9, Math.max(0, v.windowTint));
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(v.tintColor).lerp(new THREE.Color(0x05070a), 0.5), metalness: 0.0, roughness: 0.03,
      transparent: true, opacity: 0.8 + tint * 0.18, envMapIntensity: 1.1, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.02,
    });
    const pillar = new THREE.MeshPhysicalMaterial({ color: 0x08090a, metalness: 0.2, roughness: 0.15, clearcoat: 1 });
    const under = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.9 });
    this.disposables.push(glass, pillar, under);

    const add = (g: THREE.BufferGeometry | undefined, m: THREE.Material, order = 0) => {
      if (!g) return;
      const mesh = new THREE.Mesh(g, m);
      mesh.renderOrder = order;
      this.body.add(mesh);
      this.disposables.push(g);
    };
    add(geo.buckets.side, paint);
    add(geo.buckets.top, paint);
    add(geo.buckets.hood, hoodCarbon ? carbonish : paint);
    add(geo.buckets.roof, roofCarbon ? carbonish : paint);
    add(geo.buckets.pillar, pillar);
    add(geo.buckets.under, under);
    add(geo.buckets.glass, glass, 2);

    // ---- flares, skirts
    add(geo.flares ?? undefined, paint);
    add(geo.skirts ?? undefined, paint);

    // ---- caps (header panel & tail panel) and bumpers
    const ft = frontFasciaTextures(model, v, { ...geo.capFInfo, bumperTop: shape.fBumperTop });
    const exKind = exhaustKind(build, model);
    const rt = rearFasciaTextures(model, v, { ...geo.capRInfo, bumperTop: shape.rBumperTop });
    const fbt = frontBumperTextures(model, v, geo.bumperFInfo);
    const rbt = rearBumperTextures(model, v, geo.bumperRInfo, exKind);
    this.disposables.push(ft.map, ft.emissive, rt.map, rt.emissive, fbt.map, fbt.emissive, rbt.map, rbt.emissive);
    this.frontCapMat = new THREE.MeshPhysicalMaterial({ map: ft.map, emissiveMap: ft.emissive, emissive: 0xfff2d8, emissiveIntensity: 1.1, ...pp, envMapIntensity: 1.1 });
    this.rearMat = new THREE.MeshPhysicalMaterial({ map: rt.map, emissiveMap: rt.emissive, emissive: 0xff2020, emissiveIntensity: 0.9, ...pp, envMapIntensity: 1.1 });
    const fbMat = new THREE.MeshPhysicalMaterial({ map: fbt.map, emissiveMap: fbt.emissive, emissive: 0xfff2d8, emissiveIntensity: 1.0, ...pp, envMapIntensity: 1.2 });
    const rbMat = new THREE.MeshPhysicalMaterial({ map: rbt.map, emissiveMap: rbt.emissive, emissive: 0xff3030, emissiveIntensity: 0.6, ...pp, envMapIntensity: 1.2 });
    this.fogMat = fbMat;
    this.disposables.push(this.frontCapMat, this.rearMat, fbMat, rbMat);
    add(geo.capF, this.frontCapMat);
    add(geo.capR, this.rearMat);
    add(geo.bumperF, fbMat);
    add(geo.bumperR, rbMat);

    // ---- corner headlights (conform to the nose corner between bumper and hood line)
    const sh = model.shape;
    if (sh.lightMount === 'corner') {
      const style = resolveHeadlight(model, v);
      const ht = headlightTextures(style);
      const hm = new THREE.MeshStandardMaterial({ map: ht.map, emissiveMap: ht.emissive, emissive: 0xfff4dc, emissiveIntensity: 1.3, transparent: true, alphaTest: 0.35, roughness: 0.08, metalness: 0.3 });
      this.headMats.push(hm);
      this.disposables.push(hm);
      const sA = 0.002, sB = Math.min(sh.noseRound * 1.05, 0.1);
      for (const sx of [1, -1]) {
        const fn = (u: number, w: number) => {
          const s = sA + (sB - sA) * u;
          const y0 = shape.fBumperTop + 0.012;
          const y1 = Math.max(y0 + 0.05, shape.belt(s) - 0.006);
          const y = y0 + (y1 - y0) * w;
          return [sx * shape.sideX(s, y), y, shape.z(s)];
        };
        const g = surfacePatch(fn, 12, 4, 0.006, [sx * 0.5, 0.1, 1]);
        this.body.add(new THREE.Mesh(g, hm));
        this.disposables.push(g);
      }
    }

    // ---- wheel wells & floor
    const wellMat = new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.DoubleSide });
    this.disposables.push(wellMat);
    for (const za of [shape.zFA, shape.zRA]) {
      for (const sx of [-1, 1]) {
        const s = shape.sOf(za);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(shape.archR + 0.05, 24, 0, Math.PI), wellMat);
        disc.rotation.y = Math.PI / 2;
        disc.position.set(sx * (shape.halfWidth(s) - 0.3), shape.wheelY - 0.02, za);
        disc.rotation.z = 0;
        this.body.add(disc);
        const arch = new THREE.Mesh(new THREE.CylinderGeometry(shape.archR - 0.004, shape.archR - 0.004, 0.32, 20, 1, true, 0, Math.PI), wellMat);
        arch.rotation.z = Math.PI / 2;
        arch.rotation.y = 0;
        arch.position.set(sx * (shape.halfWidth(s) - 0.15 + shape.flare(s) * 0.5), shape.wheelY, za);
        this.body.add(arch);
      }
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(shape.w0 * 1.7, shape.L * 0.8), wellMat);
    floor.rotation.x = Math.PI / 2;
    floor.position.set(0, shape.sh.sill + 0.03, (shape.zF + shape.zR) / 2);
    this.body.add(floor);

    // ---- parts
    const spoiler = buildSpoiler(shape, build, mats);
    if (spoiler) this.body.add(spoiler);
    this.body.add(buildHoodDetails(shape, build, model, mats));
    this.body.add(buildMirrors(shape, build, mats));
    const ex = buildExhaust(shape, build, model, mats, geo.bumperRInfo);
    this.body.add(ex.group);
    this.body.add(buildAero(shape, build, mats, geo.bumperFInfo, geo.bumperRInfo));
    if (opts.interior !== false) this.body.add(buildInterior(shape, model, v.interior, mats));

    // nitro / backfire flames
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.disposables.push(flameMat);
    for (const o of ex.outlets) {
      const fg = new THREE.ConeGeometry(o.r * 0.9, 0.45, 10, 1, true);
      fg.translate(0, -0.225, 0);
      const fm = new THREE.Mesh(fg, flameMat);
      fm.position.copy(o.pos);
      fm.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), o.dir);
      fm.visible = false;
      this.body.add(fm);
      this.flames.push(fm);
    }

    // ---- wheels
    const brakeLevel = { stock: 0, br_pads: 0.5, br_bbk: 2, br_race: 3 }[build.perf.brakes] ?? 0;
    const tireLabel = { tr_street: 'ZENRYU', tr_sport: 'ZENRYU SPORT', tr_semi: 'ZENRYU R-SPEC', tr_dragr: 'QUARTER MILE', tr_slick: 'QUARTER MILE' }[build.perf.tires] ?? 'ZENRYU';
    const white = build.perf.tires === 'tr_dragr' || build.perf.tires === 'tr_slick';
    const wc = v.wheels;
    const camber = (deg: number) => (-deg * Math.PI) / 180;
    for (const [za, front] of [[shape.zFA, true], [shape.zRA, false]] as const) {
      const s = shape.sOf(za);
      for (const side of [1, -1] as const) {
        const w = createWheel(wc, v.caliperColor, brakeLevel, tireLabel, white, side);
        const fl = shape.flare(s);
        const x = side * (shape.halfWidth(s) + fl - w.width / 2 - 0.018 + wc.offset / 1000);
        w.root.position.set(x, w.radius, za);
        w.root.rotation.z = camber((front ? build.tune.camberF : build.tune.camberR) || wc.camber);
        this.root.add(w.root);
        this.wheels.push({ w, side, front, x, z: za });
      }
    }

    // ---- ride height
    const susp = build.tune.rideHeight;
    this.rideHeight = Math.max(-0.1, Math.min(0.03, susp / 1000));
    this.body.position.y = this.rideHeight;

    // ---- neon underglow
    if (v.neon.enabled) {
      const nm = new THREE.MeshBasicMaterial({ map: radialGlowTexture('neon'), color: v.neon.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(shape.W * 1.9, shape.L * 1.3), nm);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.012;
      this.root.add(plane);
      this.neonMesh = plane;
      this.neonLight = new THREE.PointLight(v.neon.color, 1.6, 4.5, 1.6);
      this.neonLight.position.set(0, 0.12, 0);
      this.root.add(this.neonLight);
      this.disposables.push(nm, plane.geometry);
    }
    // ---- blob shadow
    if (opts.shadow !== false) {
      const sm = new THREE.MeshBasicMaterial({ map: radialGlowTexture('shadow'), transparent: true, depthWrite: false, opacity: 0.95, color: 0x000000 });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(shape.W * 1.35, shape.L * 1.12), sm);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.006;
      plane.renderOrder = -1;
      this.root.add(plane);
      this.disposables.push(sm, plane.geometry);
    }
    // ---- headlight beams on the ground
    if (opts.beams) {
      const bm = new THREE.MeshBasicMaterial({ map: radialGlowTexture('beam'), color: 0xfff1d0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
      for (const sx of [-1, 1]) {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9), bm);
        plane.rotation.x = -Math.PI / 2;
        plane.position.set(sx * 0.55, 0.015, shape.zF + 4.4);
        plane.rotation.z = Math.PI;
        this.root.add(plane);
        this.beams.push(plane);
        this.disposables.push(plane.geometry);
      }
      this.disposables.push(bm);
    }
  }

  setLights(on: boolean) {
    this.lightsOn = on;
    for (const m of this.headMats) m.emissiveIntensity = on ? 1.3 : 0.05;
    this.frontCapMat.emissiveIntensity = on ? 1.1 : 0.05;
    this.fogMat.emissiveIntensity = on ? 1.0 : 0.05;
    for (const b of this.beams) b.visible = on;
  }

  triggerBackfire() { this.backfire = 0.12; }

  update(dt: number, st: CarState) {
    this.t += dt;
    const spinSpeed = st.wheelSpin ?? st.speed;
    for (const wh of this.wheels) {
      const r = wh.w.radius;
      const ws = !wh.front || this.build.modelId.includes('arashi') ? spinSpeed : st.speed;
      wh.w.spin.rotation.x += ((ws / r) * dt) ;
    }
    this.wheelAngle += (st.speed / 0.3) * dt;
    // body pitch (squat under accel, dive under braking) and idle shake
    const targetPitch = Math.max(-0.035, Math.min(0.035, -st.accel * 0.0032));
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 6);
    this.body.rotation.x = this.pitch;
    const shake = st.speed < 0.5 ? Math.sin(this.t * (st.rpm / 60) * 0.5) * 0.0012 * (0.4 + st.throttle) : 0;
    this.body.rotation.z = shake;
    this.body.position.y = this.rideHeight + Math.abs(this.pitch) * 0.3;
    this.rearMat.emissiveIntensity = st.braking ? 2.6 : this.lightsOn ? 0.9 : 0.15;
    // flames
    if (this.backfire > 0) this.backfire -= dt;
    const flameOn = st.nitro || this.backfire > 0;
    for (const f of this.flames) {
      f.visible = flameOn;
      if (flameOn) {
        const k = st.nitro ? 1 : 0.6;
        f.scale.set(1, (0.6 + Math.random() * 0.7) * k, 1);
        (f.material as THREE.MeshBasicMaterial).color.setHex(st.nitro ? 0x5a9cff : 0xff9a3a);
      }
    }
    // neon
    if (this.neonMesh && this.neonLight) {
      const mode = this.build.visual.neon.mode;
      let k = 1;
      if (mode === 'pulse') k = 0.55 + 0.45 * Math.sin(this.t * 3);
      if (mode === 'strobe') k = Math.sin(this.t * 18) > 0 ? 1 : 0.15;
      (this.neonMesh.material as THREE.MeshBasicMaterial).opacity = k;
      this.neonLight.intensity = 1.6 * k;
    }
  }

  dispose() {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry && !m.geometry.userData.cached) this.disposables.push(m.geometry);
    });
    for (const d of new Set(this.disposables)) d.dispose();
    this.root.removeFromParent();
  }
}
