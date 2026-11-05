// 3D add-on parts: wings, scoops, mirrors, exhaust tips, splitters, diffusers, canards, roof items, interior.
import * as THREE from 'three';
import type { CarBuild, CarModel, InteriorConfig } from '../core/types';
import { visualPart } from '../data/visualParts';
import { BodyShape, P_SHOULDER } from './bodyShape';
import type { BumperInfo } from './bodyMesh';
import { surfacePatch } from './bodyMesh';
import { canvas, exhaustLayout, tex, ventTexture } from './textures';

export interface PartMats {
  paint: THREE.Material;
  carbon: THREE.Material;
  black: THREE.Material;
  chrome: THREE.Material;
  alu: THREE.Material;
  dark: THREE.Material;
  tip: THREE.Material;
  interior: THREE.Material;
  interiorDark: THREE.Material;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function slopeAt(shape: BodyShape, s: number, x = 0): number {
  const a = shape.topPoint(s - 0.01, x), b = shape.topPoint(s + 0.01, x);
  return Math.atan2(a[1] - b[1], a[2] - b[2]); // rise toward the front
}

function airfoil(chord: number, thick: number): THREE.Shape {
  const s = new THREE.Shape();
  // leading edge at +z (front), trailing at -z
  const n = 14;
  const top: [number, number][] = [], bot: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const yt = 5 * thick * (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t ** 3 - 0.1015 * t ** 4);
    const camber = 0.06 * thick * 8 * t * (1 - t);
    top.push([chord / 2 - t * chord, camber + yt * chord * 0.9]);
    bot.push([chord / 2 - t * chord, camber - yt * chord * 0.5]);
  }
  top.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  for (let i = bot.length - 1; i >= 0; i--) s.lineTo(bot[i][0], bot[i][1]);
  s.closePath();
  return s;
}

function extrudeX(shape: THREE.Shape, width: number, bevel = 0.002): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
  g.translate(0, 0, -width / 2);
  // shape (sx, sy) with sx = car z; extrusion along Z becomes car x. rotateY(-90°): x' = -z, z' = x
  g.rotateY(-Math.PI / 2);
  return g;
}

// ------------------------------------------------------------------ SPOILERS
export function buildSpoiler(shape: BodyShape, build: CarBuild, m: PartMats): THREE.Object3D | null {
  const p = visualPart('spoiler', build.visual.spoiler).p;
  if (p.kind === 'none' || p.kind === 'ducktail') return null;
  const finish = build.visual.spoilerFinish === 'carbon' ? m.carbon : build.visual.spoilerFinish === 'black' ? m.black : m.paint;
  const g = new THREE.Group();
  const sh = shape.sh;
  const hatch = sh.rearGlassBase > 0.94;
  if (p.kind === 'lip') {
    const s = hatch ? sh.roofEnd + 0.01 : 0.982;
    const tp = shape.topPoint(s, 0);
    const w = shape.halfWidth(s) * 1.75;
    const lip = new THREE.Mesh(extrudeX(airfoil(0.1, 0.12), w), finish);
    lip.position.set(0, tp[1] + 0.012, tp[2] - 0.02);
    lip.rotation.x = -0.25;
    g.add(lip);
    return g;
  }
  const s = hatch ? sh.roofEnd + 0.005 : Math.max(sh.rearGlassBase + 0.05, 0.935);
  const tp = shape.topPoint(s, 0);
  const span = Math.min(shape.W * p.span, shape.W * 1.02);
  const chord = p.chord;
  const h = hatch ? p.h * 0.45 : p.h;
  const wingY = tp[1] + h;
  const wing = new THREE.Mesh(extrudeX(airfoil(chord, 0.14), span), finish);
  wing.position.set(0, wingY, tp[2] - 0.02);
  wing.rotation.x = -0.12;
  g.add(wing);
  if (p.double) {
    const w2 = new THREE.Mesh(extrudeX(airfoil(chord * 0.6, 0.12), span * 0.96), finish);
    w2.position.set(0, wingY + 0.07, tp[2] - 0.06);
    w2.rotation.x = -0.3;
    g.add(w2);
  }
  if (p.end) {
    const eh = p.end === 2 ? 0.16 : 0.09, el = chord * (p.end === 2 ? 1.25 : 1.05);
    const epG = new THREE.BoxGeometry(0.008, eh, el);
    for (const sx of [-1, 1]) {
      const ep = new THREE.Mesh(epG, p.end === 2 ? m.carbon : finish);
      ep.position.set((sx * span) / 2, wingY - eh * 0.25, tp[2] - 0.03);
      g.add(ep);
    }
  }
  const legX = Math.min(shape.halfWidth(s) * 0.62, span * 0.34);
  for (const sx of [-1, 1]) {
    const x = sx * legX;
    const base = shape.topPoint(s, Math.abs(x));
    if (p.legs === 'pedestal') {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, wingY - base[1] + 0.01, chord * 0.55), finish);
      leg.position.set(x, (wingY + base[1]) / 2, tp[2] - 0.02);
      g.add(leg);
    } else if (p.legs === 'upright') {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.01, wingY - base[1] + 0.02, chord * 0.6), m.alu);
      leg.position.set(x, (wingY + base[1]) / 2, tp[2] - 0.04);
      leg.rotation.x = 0.12;
      g.add(leg);
    } else {
      // swan neck: curved plate attached to the top of the wing
      const curve = new THREE.CatmullRomCurve3([V(x, base[1], tp[2] + 0.08), V(x, wingY - 0.05, tp[2] + 0.06), V(x, wingY + 0.05, tp[2] - 0.01), V(x, wingY + 0.02, tp[2] - 0.06)]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.012, 6, false), m.alu);
      tube.scale.set(0.6, 1, 1);
      tube.position.x = x * 0.4;
      g.add(tube);
    }
  }
  return g;
}

// ------------------------------------------------------------------ HOOD (scoops & vents)
export function buildHoodDetails(shape: BodyShape, build: CarBuild, model: CarModel, m: PartMats): THREE.Object3D {
  const g = new THREE.Group();
  const sh = shape.sh;
  const v = build.visual;
  const hood = visualPart('hood', v.hood).p;
  const hs = shape.hoodStart, he = sh.wsBase;
  const L = (he - hs) * shape.L;
  const ventPatch = (kind: 'slots' | 'louver' | 'gill' | 'naca' | 'mesh', s0: number, s1: number, x0: number, x1: number) => {
    const fn = (u: number, w: number) => {
      const s = s0 + (s1 - s0) * w;
      const x = x0 + (x1 - x0) * u;
      const ax = Math.abs(x);
      const pt = shape.topPoint(s, ax);
      return [x, pt[1], pt[2]];
    };
    const geo = surfacePatch(fn, 6, 6, 0.004, [0, 1, 0]);
    const mt = new THREE.MeshStandardMaterial({ map: ventTexture(kind), transparent: true, alphaTest: 0.3, roughness: 0.6, metalness: 0.2, depthWrite: true });
    g.add(new THREE.Mesh(geo, mt));
  };
  const at = (f: number) => hs + (he - hs) * f;
  const w = shape.halfWidth(at(0.5));
  const vents = hood.vents === 'stock' ? (model.shape.hoodVents ? 'twinSmall' : 'none') : hood.vents;
  if (vents === 'twin' || vents === 'twinSmall') {
    const sz = vents === 'twin' ? 1 : 0.7;
    for (const sx of [-1, 1]) ventPatch('slots', at(0.3), at(0.3 + 0.32 * sz), sx * w * 0.22, sx * w * (0.22 + 0.28 * sz));
  } else if (vents === 'louver') {
    ventPatch('louver', at(0.25), at(0.75), -w * 0.4, w * 0.4);
  } else if (vents === 'gill') {
    for (const sx of [-1, 1]) ventPatch('gill', at(0.15), at(0.55), sx * w * 0.58, sx * w * 0.8);
    ventPatch('slots', at(0.5), at(0.78), -w * 0.18, w * 0.18);
  } else if (vents === 'ram') {
    ventPatch('mesh', at(0.12), at(0.2), -w * 0.18, w * 0.18);
  }

  // scoops
  const sc = visualPart('hoodScoop', v.hoodScoop).p.kind as string;
  const roots = build.perf.supercharger === 'sc_roots';
  const place = (obj: THREE.Object3D, f: number, x = 0) => {
    const s = at(f);
    const tp = shape.topPoint(s, Math.abs(x));
    obj.position.set(x, tp[1] - 0.005, tp[2]);
    obj.rotation.x = -slopeAt(shape, s, Math.abs(x));
    g.add(obj);
  };
  const scoop = (len: number, h: number, wid: number, forward: boolean, mat = m.paint) => {
    const grp = new THREE.Group();
    const prof: [number, number][] = forward
      ? [[len / 2, 0], [len / 2, h], [len / 2 - 0.04, h], [-len / 2, 0]]
      : [[len / 2, 0], [-len / 2 + 0.04, h], [-len / 2, h], [-len / 2, 0]];
    const s = new THREE.Shape();
    prof.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
    s.closePath();
    grp.add(new THREE.Mesh(extrudeX(s, wid, 0.006), mat));
    const open = new THREE.Mesh(new THREE.PlaneGeometry(wid * 0.85, h * 0.75), m.dark);
    open.position.set(0, h * 0.5, forward ? len / 2 + 0.007 : -len / 2 - 0.007);
    if (!forward) open.rotation.y = Math.PI;
    grp.add(open);
    return grp;
  };
  switch (sc) {
    case 'ram': place(scoop(0.42, 0.075, 0.34, true), 0.45); break;
    case 'tmic': place(scoop(0.5, 0.065, 0.62, true), 0.4); break;
    case 'cowl': place(scoop(0.5, 0.08, 0.4, false), 0.62); break;
    case 'twin': place(scoop(0.32, 0.06, 0.15, true), 0.45, w * 0.28); place(scoop(0.32, 0.06, 0.15, true), 0.45, -w * 0.28); break;
    case 'naca': ventPatch('naca', at(0.35), at(0.7), -w * 0.15, w * 0.15); break;
    case 'shaker': {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 20), m.black);
      body.scale.set(1.3, 1, 1);
      body.position.y = 0.04;
      grp.add(body);
      const open = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), m.dark);
      open.scale.set(1.6, 0.4, 1);
      open.position.set(0, 0.07, 0.17);
      grp.add(open);
      place(grp, 0.55);
      break;
    }
  }
  if (roots) {
    const grp = new THREE.Group();
    const blower = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.42), m.chrome);
    blower.position.y = 0.06;
    grp.add(blower);
    for (let i = 0; i < 6; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.012, 0.012), m.alu); rib.position.set(0, 0.1, -0.18 + i * 0.07); grp.add(rib); }
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.26), m.black);
    hat.position.set(0, 0.2, 0.04);
    grp.add(hat);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.09), m.dark);
    mouth.position.set(0, 0.2, 0.172);
    grp.add(mouth);
    place(grp, 0.42);
  }
  void L;
  return g;
}

// ------------------------------------------------------------------ MIRRORS
export function buildMirrors(shape: BodyShape, build: CarBuild, m: PartMats): THREE.Object3D {
  const g = new THREE.Group();
  const p = visualPart('mirrors', build.visual.mirrors).p;
  const sh = shape.sh;
  const housingMat = p.carbon ? m.carbon : m.paint;
  for (const sx of [-1, 1]) {
    if (p.kind === 'fender') {
      const s = shape.hoodStart + 0.05;
      const tp = shape.topPoint(s, shape.halfWidth(s) * 0.8);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.12, 6), m.black);
      stalk.position.set(sx * tp[0], tp[1] + 0.06, tp[2]);
      stalk.rotation.x = 0.4;
      g.add(stalk);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), m.black);
      head.position.set(sx * tp[0], tp[1] + 0.12, tp[2] + 0.03);
      g.add(head);
      continue;
    }
    const s = sh.wsBase + 0.03;
    const sec = shape.section(s);
    const sp = sec[P_SHOULDER];
    const base = V(sx * (sp[0] - 0.01), sp[1] + 0.05, sp[2]);
    const aero = p.kind === 'aero';
    const housing = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.06, 4, 10), housingMat);
    housing.rotation.z = Math.PI / 2;
    housing.scale.set(aero ? 0.8 : 1, aero ? 1.0 : 0.95, aero ? 1.3 : 1.05);
    housing.position.set(base.x + sx * (aero ? 0.13 : 0.1), base.y + 0.05, base.z - 0.02);
    g.add(housing);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), m.chrome);
    glass.scale.set(aero ? 1.1 : 1.2, aero ? 0.65 : 0.85, 1);
    glass.position.set(housing.position.x, housing.position.y, housing.position.z - 0.055);
    glass.rotation.y = Math.PI;
    g.add(glass);
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(aero ? 0.1 : 0.06, aero ? 0.012 : 0.04, aero ? 0.02 : 0.06), aero ? housingMat : m.black);
    stalk.position.set(base.x + sx * (aero ? 0.06 : 0.04), base.y + 0.03, base.z);
    g.add(stalk);
  }
  return g;
}

// ------------------------------------------------------------------ EXHAUST
let tiCanvasTex: THREE.Texture | null = null;
function titaniumTexture(): THREE.Texture {
  if (tiCanvasTex) return tiCanvasTex;
  const [c, ctx] = canvas(64, 64);
  const gr = ctx.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#c9b06a'); gr.addColorStop(0.35, '#9b5a8c'); gr.addColorStop(0.65, '#3b4fb3'); gr.addColorStop(1, '#2c3c80');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
  tiCanvasTex = tex(c);
  return tiCanvasTex;
}

export function tipMaterial(finish: string): THREE.Material {
  switch (finish) {
    case 'titanium': return new THREE.MeshStandardMaterial({ map: titaniumTexture(), metalness: 1, roughness: 0.22 });
    case 'black': return new THREE.MeshStandardMaterial({ color: 0x18191b, metalness: 0.6, roughness: 0.4 });
    case 'carbon': return new THREE.MeshStandardMaterial({ color: 0x202226, metalness: 0.4, roughness: 0.3 });
    case 'polished': return new THREE.MeshStandardMaterial({ color: 0xb9bec6, metalness: 1, roughness: 0.2 });
    default: return new THREE.MeshStandardMaterial({ color: 0xeef1f4, metalness: 1, roughness: 0.06 });
  }
}

export function exhaustKind(build: CarBuild, model: CarModel): string {
  const p = visualPart('exhaust', build.visual.exhaust).p.kind as string;
  return p === 'stock' ? model.shape.stockExhaust : p;
}

export interface ExhaustOut { group: THREE.Object3D; outlets: { pos: THREE.Vector3; dir: THREE.Vector3; r: number }[] }

export function buildExhaust(shape: BodyShape, build: CarBuild, model: CarModel, m: PartMats, rb: BumperInfo): ExhaustOut {
  const capR = { wc: rb.wc, yMin: rb.yBot, z: rb.z };
  const g = new THREE.Group();
  const kind = exhaustKind(build, model);
  const p = visualPart('exhaust', build.visual.exhaust).p;
  const baseR = (p.r as number | undefined) ?? 0.04;
  const outlets: ExhaustOut['outlets'] = [];
  const tipMat = m.tip;
  const y0 = capR.yMin + 0.075;
  if (kind === 'sideExit') {
    for (const sx of [-1, 1]) {
      const z = shape.zRA + shape.archR + 0.12;
      const s = shape.sOf(z);
      const x = (shape.halfWidth(s) + shape.flare(s) + shape.skirtOut(s)) * sx;
      for (const dz of [0, 0.09]) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(baseR, baseR, 0.12, 14, 1, true), tipMat);
        t.rotation.z = Math.PI / 2;
        t.position.set(x - sx * 0.02, shape.bottom(s) + 0.05, z + dz);
        g.add(t);
        const inner = new THREE.Mesh(new THREE.CircleGeometry(baseR * 0.85, 14), m.dark);
        inner.rotation.y = (sx * Math.PI) / 2;
        inner.position.set(x + sx * 0.035, shape.bottom(s) + 0.05, z + dz);
        g.add(inner);
        outlets.push({ pos: V(x + sx * 0.04, shape.bottom(s) + 0.05, z + dz), dir: V(sx, 0, 0), r: baseR });
      }
    }
    return { group: g, outlets };
  }
  for (const t of exhaustLayout(kind, capR.wc)) {
    const r = baseR * t.r;
    const len = kind === 'can' ? 0.3 : kind === 'stack' ? 0.9 : 0.12;
    const radial = kind === 'hex' ? 6 : 16;
    const geo = new THREE.CylinderGeometry(r, r, len, radial, 1, true);
    const tip = new THREE.Mesh(geo, tipMat);
    const z = capR.z + (kind === 'can' ? 0.08 : 0.025);
    if (kind === 'stack') {
      tip.position.set(t.x, y0 + 0.32, z + 0.05);
      tip.rotation.x = -0.6;
      g.add(tip);
      const end = tip.position.clone().add(V(0, Math.cos(0.6) * len * 0.5, -Math.sin(0.6) * len * 0.5));
      outlets.push({ pos: end, dir: V(0, 0.8, -0.6).normalize(), r });
      continue;
    }
    tip.rotation.x = Math.PI / 2;
    tip.position.set(t.x, y0, z - len / 2 + (kind === 'can' ? -0.02 : 0.03));
    if (t.oval) tip.scale.set(1.5, 1, 0.8);
    g.add(tip);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, radial), m.dark);
    inner.position.set(t.x, y0, z - len + (kind === 'can' ? 0.0 : 0.04));
    inner.rotation.y = Math.PI;
    if (t.oval) inner.scale.set(1.5, 0.8, 1);
    g.add(inner);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 6, radial), tipMat);
    rim.position.set(t.x, y0, z - len + 0.03 + (kind === 'can' ? -0.03 : 0.0));
    if (t.oval) rim.scale.set(1.5, 0.8, 1);
    g.add(rim);
    if (kind === 'can') {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 20), tipMat);
      cap.position.copy(inner.position).add(V(0, 0, -0.001));
      cap.rotation.y = Math.PI;
      const hole = new THREE.Mesh(new THREE.CircleGeometry(r * 0.45, 16), m.dark);
      hole.position.copy(inner.position).add(V(0, 0, -0.003));
      hole.rotation.y = Math.PI;
      g.add(cap, hole);
      g.remove(inner);
    }
    outlets.push({ pos: V(t.x, y0, z - len + 0.02), dir: V(0, 0, -1), r });
  }
  return { group: g, outlets };
}

// ------------------------------------------------------------------ AERO ADD-ONS
export function buildAero(shape: BodyShape, build: CarBuild, m: PartMats, fbI: BumperInfo, rbI: BumperInfo): THREE.Object3D {
  const capF = { wc: fbI.wc, yMin: fbI.yBot, z: fbI.z };
  const capR = { wc: rbI.wc, yMin: rbI.yBot, z: rbI.z };
  const g = new THREE.Group();
  const v = build.visual;
  const sh = shape.sh;
  // front lip
  const fb = visualPart('frontBumper', v.frontBumper).p;
  const frontOutline = (sMax: number, out: number, y: number) => {
    const pts: THREE.Vector3[] = [];
    const steps = 12;
    for (let i = steps; i >= 0; i--) { const s = (sMax * i) / steps; const f = 1 - s / sMax; pts.push(V(shape.halfWidth(s) + 0.03 + out * f * 0.3, y, shape.z(s) + 0.03 + out * f)); }
    for (let i = 1; i <= steps; i++) { const s = (sMax * i) / steps; const f = 1 - s / sMax; pts.push(V(-(shape.halfWidth(s) + 0.03 + out * f * 0.3), y, shape.z(s) + 0.03 + out * f)); }
    return pts;
  };
  if (fb.lip) {
    const curve = new THREE.CatmullRomCurve3(frontOutline(Math.min(0.1, shape.sArchFront * 0.9), shape.k.fbExt, fbI.yBot - 0.004));
    const lip = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.016, 6, false), fb.lip === 2 ? m.carbon : m.black);
    lip.scale.y = 0.55;
    lip.position.y = (1 - 0.55) * (fbI.yBot - 0.006);
    g.add(lip);
  }
  // splitter
  const spl = visualPart('splitter', v.splitter).p;
  if (spl.kind !== 'none') {
    const ext = spl.ext as number;
    const shp = new THREE.Shape();
    const steps = 10;
    const samples: [number, number][] = [];
    for (let i = 0; i <= steps; i++) { const s = (0.14 * i) / steps; samples.push([shape.halfWidth(s) + 0.03, shape.z(s) + 0.04 + shape.k.fbExt + ext * (1 - s / 0.14)]); }
    shp.moveTo(0, samples[steps][1] - 0.15);
    for (let i = steps; i >= 0; i--) shp.lineTo(samples[i][0], samples[i][1]);
    for (let i = 0; i <= steps; i++) shp.lineTo(-samples[i][0], samples[i][1]);
    shp.lineTo(0, samples[steps][1] - 0.15);
    const geo = new THREE.ExtrudeGeometry(shp, { depth: 0.012, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    const plate = new THREE.Mesh(geo, spl.alu ? m.alu : m.carbon);
    plate.position.y = fbI.yBot - 0.012;
    g.add(plate);
    if (spl.kind === 'rods') {
      for (const sx of [-1, 1]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 6), m.alu);
        rod.position.set(sx * capF.wc * 0.6, fbI.yBot + 0.08, capF.z + 0.04 + ext * 0.7);
        rod.rotation.x = 0.7;
        g.add(rod);
      }
    }
  }
  // canards
  const cn = visualPart('canards', v.canards).p;
  if (cn.count) {
    for (let k = 0; k < cn.count; k++) {
      for (const sx of [-1, 1]) {
        const s = 0.03 + k * 0.012;
        const sec = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [shape.halfWidth(s) + 0.05, (fbI.yBot + fbI.yTop) / 2, shape.z(s)]];
        const y = sec[3][1] - 0.03 + k * 0.06;
        const tri = new THREE.Shape();
        tri.moveTo(0, 0); tri.lineTo(0.11, 0.025); tri.lineTo(0.09, 0.0); tri.lineTo(0, -0.012); tri.closePath();
        const geo = new THREE.ExtrudeGeometry(tri, { depth: 0.006, bevelEnabled: false });
        const c = new THREE.Mesh(geo, cn.carbon ? m.carbon : m.black);
        c.rotation.y = sx > 0 ? Math.PI / 2 + 0.25 : -Math.PI / 2 - 0.25;
        c.rotation.z = 0.15;
        c.position.set(sx * (sec[3][0] - 0.02), y, sec[3][2] - 0.04);
        c.scale.set(1, 1, 1);
        g.add(c);
      }
    }
  }
  // side blades
  const sk = visualPart('sideSkirts', v.sideSkirts).p;
  if (sk.blade) {
    const z0 = shape.zRA + shape.archR * 1.1, z1 = shape.zFA - shape.archR * 1.1;
    for (const sx of [-1, 1]) {
      const s = shape.sOf((z0 + z1) / 2);
      const x = (shape.halfWidth(s) + shape.skirtOut(s) + 0.03) * sx;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, z1 - z0), m.carbon);
      blade.position.set(x, shape.bottom(s) + 0.01, (z0 + z1) / 2);
      g.add(blade);
    }
  }
  // diffuser
  const df = visualPart('diffuser', v.diffuser).p;
  if (df.kind === 'fins') {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(capR.wc * 1.5, 0.01, 0.3), m.carbon);
    plate.position.set(0, capR.yMin - 0.005, capR.z + 0.12);
    plate.rotation.x = 0.18;
    g.add(plate);
    for (let i = 0; i < df.fins; i++) {
      const x = ((i - (df.fins - 1) / 2) / Math.max(1, df.fins - 1)) * capR.wc * 1.3;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.09, 0.3), m.carbon);
      fin.position.set(x, capR.yMin - 0.04, capR.z + 0.1);
      g.add(fin);
    }
  } else if (df.kind === 'chute') {
    const pack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), new THREE.MeshStandardMaterial({ color: 0xb31b1b, roughness: 0.8 }));
    pack.rotation.x = Math.PI / 2;
    pack.position.set(0, capR.yMin + 0.2, capR.z - 0.1);
    g.add(pack);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.006, 4, 16), m.black);
    strap.position.copy(pack.position);
    g.add(strap);
  }
  // roof items
  const rf = visualPart('roof', v.roof).p.kind as string;
  const roofS = (sh.roofStart + sh.roofEnd) / 2;
  const roofTop = shape.topPoint(roofS, 0);
  if (rf === 'scoop') {
    const s = sh.roofStart + 0.03;
    const tp = shape.topPoint(s, 0);
    const prof = new THREE.Shape();
    prof.moveTo(0.12, 0); prof.lineTo(0.12, 0.055); prof.lineTo(0.08, 0.055); prof.lineTo(-0.15, 0); prof.closePath();
    const scoop = new THREE.Mesh(extrudeX(prof, 0.24, 0.004), m.paint);
    scoop.position.set(0, tp[1] - 0.004, tp[2] - 0.04);
    g.add(scoop);
    const open = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.04), m.dark);
    open.position.set(0, tp[1] + 0.026, tp[2] + 0.085);
    g.add(open);
  } else if (rf === 'fin') {
    const s = sh.roofEnd - 0.02;
    const tp = shape.topPoint(s, 0);
    const prof = new THREE.Shape();
    prof.moveTo(0.06, 0); prof.quadraticCurveTo(-0.02, 0.01, -0.06, 0.06); prof.lineTo(-0.08, 0); prof.closePath();
    const fin = new THREE.Mesh(extrudeX(prof, 0.025, 0.004), m.black);
    fin.position.set(0, tp[1] - 0.003, tp[2]);
    g.add(fin);
  } else if (rf === 'vortex') {
    const s = sh.roofEnd - 0.012;
    for (let i = -4; i <= 4; i++) {
      const x = i * 0.08;
      const tp = shape.topPoint(s, Math.abs(x));
      const prof = new THREE.Shape();
      prof.moveTo(0.04, 0); prof.lineTo(-0.03, 0.03); prof.lineTo(-0.03, 0); prof.closePath();
      const vg = new THREE.Mesh(extrudeX(prof, 0.004, 0), m.black);
      vg.position.set(x, tp[1], tp[2]);
      vg.rotation.y = i % 2 ? 0.25 : -0.25;
      g.add(vg);
    }
  } else if (rf === 'spoiler') {
    const s = sh.roofEnd + 0.004;
    const tp = shape.topPoint(s, 0);
    const sp = new THREE.Mesh(extrudeX(airfoil(0.16, 0.1), shape.halfWidth(s) * 2 * sh.tumble * 1.05), m.paint);
    sp.position.set(0, tp[1] + 0.012, tp[2] - 0.05);
    sp.rotation.x = -0.15;
    g.add(sp);
  }
  void roofTop;
  return g;
}

// ------------------------------------------------------------------ INTERIOR
export function buildInterior(shape: BodyShape, model: CarModel, interior: InteriorConfig, m: PartMats): THREE.Object3D {
  const g = new THREE.Group();
  const sh = shape.sh;
  const rhd = model.brand === 'kairo' || model.brand === 'mizuno' || model.brand === 'takeda';
  const driverX = rhd ? -0.34 : 0.34;
  const floorY = sh.sill + 0.12;
  const seatS = sh.roofStart + (sh.roofEnd - sh.roofStart) * 0.32;
  const seatZ = shape.z(seatS);
  const belt = Math.min(shape.belt(seatS), shape.cabinTop(seatS) - 0.42);
  const bucket = interior.seats !== 'stock';
  for (const sx of [-1, 1]) {
    const x = sx * 0.34;
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.48), m.interior);
    cushion.position.set(x, floorY + 0.16, seatZ + 0.12);
    g.add(cushion);
    const backH = Math.min(belt - floorY + 0.22, shape.cabinTop(seatS - 0.03) - 0.1 - (floorY + 0.16));
    const back = new THREE.Mesh(new THREE.BoxGeometry(bucket ? 0.48 : 0.46, backH, 0.1), interior.seats === 'seat_carbon' ? m.carbon : m.interior);
    back.position.set(x, floorY + 0.16 + backH / 2, seatZ - 0.12);
    back.rotation.x = -0.18;
    g.add(back);
    if (bucket) {
      for (const wsx of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, backH * 0.55, 0.14), interior.seats === 'seat_carbon' ? m.carbon : m.interior);
        wing.position.set(x + wsx * 0.24, floorY + 0.16 + backH * 0.6, seatZ - 0.08);
        wing.rotation.x = -0.18;
        g.add(wing);
      }
    } else {
      if (floorY + 0.16 + backH + 0.18 < shape.cabinTop(seatS - 0.03) - 0.06) {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), m.interior);
        head.position.set(x, floorY + 0.16 + backH + 0.08, seatZ - 0.19);
        g.add(head);
      }
    }
  }
  // dashboard
  const dashS = sh.wsBase + 0.03;
  const dz = shape.z(dashS);
  const dashW = shape.halfWidth(dashS) * 1.8;
  const dash = new THREE.Mesh(new THREE.BoxGeometry(dashW, 0.18, 0.4), interior.dash === 'dash_carbon' ? m.carbon : interior.dash === 'dash_alu' ? m.alu : m.interiorDark);
  dash.position.set(0, shape.belt(dashS) - 0.04, dz - 0.15);
  g.add(dash);
  // steering wheel
  const swZ = dz - 0.42;
  const sw = new THREE.Group();
  const deep = interior.steering !== 'stock';
  const rim = new THREE.Mesh(new THREE.TorusGeometry(deep ? 0.17 : 0.19, 0.016, 8, 24), m.interiorDark);
  sw.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), m.interiorDark);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = deep ? 0.06 : 0.0;
  sw.add(hub);
  for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.012), m.alu);
    sp.position.set(Math.sin(a) * 0.08, Math.cos(a) * 0.08 - 0.0, deep ? 0.03 : 0);
    sp.rotation.z = -a;
    sw.add(sp);
  }
  sw.position.set(driverX, belt + 0.02, swZ);
  sw.rotation.x = -0.35;
  g.add(sw);
  // gauges
  if (interior.gauges === 'ga_pod') {
    const pod = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const gge = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 12), m.black);
      gge.rotation.x = Math.PI / 2;
      gge.position.y = i * 0.058;
      pod.add(gge);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), new THREE.MeshBasicMaterial({ color: 0xffa020 }));
      face.position.set(0, i * 0.058, -0.016);
      face.rotation.y = Math.PI;
      pod.add(face);
    }
    const ed = shape.cabinEdge(sh.wsBase + 0.05);
    pod.position.set((rhd ? -1 : 1) * (ed[0] - 0.08), shape.belt(sh.wsBase + 0.05) + 0.08, shape.z(sh.wsBase + 0.05) - 0.06);
    g.add(pod);
  }
  if (interior.gauges === 'ga_digital') {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.07), new THREE.MeshBasicMaterial({ color: 0x40ffb0 }));
    scr.position.set(driverX, belt + 0.05, dz - 0.33);
    scr.rotation.x = -0.4;
    scr.rotation.y = Math.PI;
    g.add(scr);
  }
  // roll cage
  if (interior.cage !== 'none') {
    const tubes: THREE.Vector3[][] = [];
    const hoopS = Math.min(sh.roofEnd - 0.02, seatS + 0.09);
    const fy = floorY + 0.02;
    const edgeIn = (s: number, d = 0.08) => { const e = shape.cabinEdge(s); return V(Math.max(0.1, e[0] - d), e[1] - d * 0.7, e[2]); };
    const baseIn = (s: number, d = 0.08) => { const b = shape.cabinBase(s); return V(Math.max(0.1, b[0] - d * 0.6), b[1], b[2]); };
    const hoopPts = (s: number) => {
      const e = edgeIn(s), b = baseIn(s), t = shape.cabinTop(s) - 0.08;
      return [V(b.x, fy, b.z), V(b.x, b.y, b.z), V(e.x, e.y, e.z), V(e.x * 0.45, t, e.z), V(-e.x * 0.45, t, e.z), V(-e.x, e.y, e.z), V(-b.x, b.y, b.z), V(-b.x, fy, b.z)];
    };
    tubes.push(hoopPts(hoopS));
    const rearS = Math.min(0.92, sh.rearGlassBase + 0.04);
    const top = edgeIn(hoopS);
    for (const sx of [-1, 1]) tubes.push([V(sx * top.x, top.y, top.z), V(sx * (shape.halfWidth(rearS) - 0.2), floorY + 0.15, shape.z(rearS))]);
    if (interior.cage === 'cage_full') {
      for (const sx of [-1, 1]) {
        const a0 = baseIn(sh.wsBase + 0.02);
        const a1 = edgeIn(sh.roofStart + 0.01);
        tubes.push([V(sx * a0.x, fy, a0.z), V(sx * a0.x, a0.y, a0.z), V(sx * a1.x, a1.y, a1.z), V(sx * top.x, top.y, top.z)]);
        tubes.push([V(sx * a0.x, floorY + 0.2, a0.z), V(sx * (top.x + 0.04), floorY + 0.35, top.z)]);
      }
      const l = baseIn(hoopS);
      tubes.push([V(l.x, fy, l.z), V(-top.x, top.y, top.z)]);
    }
    for (const t of tubes) {
      const curve = new THREE.CatmullRomCurve3(t, false, 'catmullrom', 0.2);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, t.length * 6, 0.02, 6, false), m.alu));
    }
  }
  return g;
}
