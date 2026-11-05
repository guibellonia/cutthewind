// Procedural wheels, tyres, brake discs and calipers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WheelConfig } from '../core/types';
import { WHEEL_DESIGNS, WHEEL_FINISHES } from '../data/visualParts';
import { tireSidewallTexture } from './textures';

const geoCache = new Map<string, THREE.BufferGeometry>();

/** Rotates geometry so a shape drawn in the XY plane faces +X (wheel axle along X). */
function toAxleX(g: THREE.BufferGeometry): THREE.BufferGeometry {
  g.rotateY(Math.PI / 2);
  return g;
}

function spokeShape(r0: number, r1: number, w0: number, w1: number, curve = 0): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w0 / 2, r0);
  if (curve) {
    s.quadraticCurveTo(-w1 / 2 + curve, (r0 + r1) / 2, -w1 / 2 + curve * 1.4, r1);
    s.lineTo(w1 / 2 + curve * 1.4, r1);
    s.quadraticCurveTo(w0 / 2 + curve, (r0 + r1) / 2, w0 / 2, r0);
  } else {
    s.lineTo(-w1 / 2, r1);
    s.lineTo(w1 / 2, r1);
    s.lineTo(w0 / 2, r0);
  }
  s.closePath();
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0.004): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function radial(g: THREE.BufferGeometry, n: number, offset = 0): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const c = g.clone();
    c.rotateZ(offset + (i / n) * Math.PI * 2);
    out.push(c);
  }
  return out;
}

/** Face geometry (spokes + centre) in XY plane, wheel facing +Z, sized for rim radius r. */
function faceGeometry(kind: string, spokes: number, r: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hubR = r * 0.26;
  const d = 0.03;
  switch (kind) {
    case 'spoke': parts.push(...radial(extrude(spokeShape(hubR * 0.8, r * 0.97, r * (spokes > 10 ? 0.07 : spokes > 7 ? 0.11 : 0.2), r * (spokes > 10 ? 0.045 : spokes > 7 ? 0.08 : 0.12)), d), spokes)); break;
    case 'split': {
      const sp = extrude(spokeShape(hubR * 0.8, r * 0.97, r * 0.09, r * 0.05), d);
      for (const a of [-0.11, 0.11]) { const c = sp.clone(); c.rotateZ(a); parts.push(...radial(c, spokes)); }
      break;
    }
    case 'mesh': {
      const sp = extrude(spokeShape(hubR * 0.9, r * 0.97, r * 0.05, r * 0.035), d * 0.8);
      for (const a of [-0.32, 0.32]) { const c = sp.clone(); c.rotateZ(a); parts.push(...radial(c, spokes)); }
      const ring = new THREE.TorusGeometry(r * 0.62, r * 0.025, 6, 48); parts.push(ring);
      break;
    }
    case 'mono': parts.push(...radial(extrude(spokeShape(hubR * 0.7, r * 0.97, r * 0.42, r * 0.3), d * 1.2, 0.008), spokes)); break;
    case 'fan': {
      const disc = new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.012, 48); disc.rotateX(Math.PI / 2); disc.translate(0, 0, -0.012); parts.push(disc);
      const blade = extrude(spokeShape(hubR, r * 0.93, r * 0.05, r * 0.18, r * 0.08), 0.02);
      parts.push(...radial(blade, spokes));
      break;
    }
    case 'star': parts.push(...radial(extrude(spokeShape(hubR * 0.8, r * 0.97, r * 0.16, r * 0.05), d), spokes)); break;
    case 'twin': {
      const sp = extrude(spokeShape(hubR * 0.8, r * 0.97, r * 0.07, r * 0.06), d);
      for (const off of [-0.045, 0.045]) { const c = sp.clone(); c.translate(off * r * 3, 0, 0); parts.push(...radial(c, spokes)); }
      break;
    }
    case 'y': {
      const stem = extrude(spokeShape(hubR * 0.8, r * 0.6, r * 0.14, r * 0.1), d);
      const fork = extrude(spokeShape(r * 0.55, r * 0.97, r * 0.07, r * 0.05), d);
      parts.push(...radial(stem, spokes));
      for (const a of [-0.2, 0.2]) { const c = fork.clone(); c.rotateZ(a); parts.push(...radial(c, spokes)); }
      break;
    }
    case 'spiral': parts.push(...radial(extrude(spokeShape(hubR * 0.8, r * 0.97, r * 0.16, r * 0.08, r * 0.22), d), spokes)); break;
    case 'steel': {
      const disc = new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.02, 40); disc.rotateX(Math.PI / 2); parts.push(disc);
      break;
    }
    case 'slot': {
      const disc = new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.022, 40); disc.rotateX(Math.PI / 2); parts.push(disc);
      break;
    }
  }
  // hub / centre cap
  const hub = new THREE.CylinderGeometry(hubR, hubR * 1.08, 0.035, 24); hub.rotateX(Math.PI / 2); parts.push(hub);
  for (const p of parts) if (p.index === null) { /* ok */ }
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)).map((p) => { p.deleteAttribute('uv'); return p; }), false)!;
  return merged;
}

function barrelGeometry(r: number, width: number, dish: number): THREE.BufferGeometry {
  // profile in (radius, axial) – lathe around Y, then rotate to axle X
  const lip = 0.012 + dish * 0.05;
  const pts = [
    new THREE.Vector2(r * 0.86, -width / 2),
    new THREE.Vector2(r * 0.95, -width / 2),
    new THREE.Vector2(r * 0.95, width / 2 - lip),
    new THREE.Vector2(r * 1.02, width / 2 - 0.004),
    new THREE.Vector2(r * 1.06, width / 2),
    new THREE.Vector2(r * 1.0, width / 2 + 0.006),
  ];
  const g = new THREE.LatheGeometry(pts, 48);
  g.rotateZ(-Math.PI / 2); // lathe axis Y -> X
  return g;
}

function tireGeometry(rimR: number, R: number, width: number): THREE.BufferGeometry {
  const sw = R - rimR;
  const pts: THREE.Vector2[] = [];
  const hw = width / 2;
  pts.push(new THREE.Vector2(rimR * 1.04, -hw * 0.92));
  pts.push(new THREE.Vector2(rimR + sw * 0.45, -hw * 1.02));
  pts.push(new THREE.Vector2(R - sw * 0.18, -hw));
  pts.push(new THREE.Vector2(R - sw * 0.02, -hw * 0.8));
  pts.push(new THREE.Vector2(R, -hw * 0.45));
  pts.push(new THREE.Vector2(R, hw * 0.45));
  pts.push(new THREE.Vector2(R - sw * 0.02, hw * 0.8));
  pts.push(new THREE.Vector2(R - sw * 0.18, hw));
  pts.push(new THREE.Vector2(rimR + sw * 0.45, hw * 1.02));
  pts.push(new THREE.Vector2(rimR * 1.04, hw * 0.92));
  const g = new THREE.LatheGeometry(pts, 56);
  g.rotateZ(-Math.PI / 2);
  return g;
}

export interface WheelObject {
  root: THREE.Group; // positioned at hub, handles camber/steer
  spin: THREE.Group; // rotates with wheel
  radius: number;
  width: number;
}

const matCache = new Map<string, THREE.Material>();
function cache(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) { g = make(); g.userData.cached = true; geoCache.set(key, g); }
  return g;
}

function mat(key: string, make: () => THREE.Material): THREE.Material {
  let m = matCache.get(key);
  if (!m) { m = make(); matCache.set(key, m); }
  return m;
}

export function wheelMaterial(cfg: WheelConfig): THREE.MeshStandardMaterial {
  const f = WHEEL_FINISHES.find((x) => x.id === cfg.finish) ?? WHEEL_FINISHES[0];
  const color = f.id === 'painted' ? cfg.color : f.color;
  return mat(`wheel_${f.id}_${color}`, () => new THREE.MeshStandardMaterial({ color, metalness: f.metal, roughness: f.rough, envMapIntensity: 1.2 })) as THREE.MeshStandardMaterial;
}

export function createWheel(cfg: WheelConfig, caliperColor: string, brakeLevel: number, tireLabel: string, whiteLetters: boolean, side: 1 | -1): WheelObject {
  const design = WHEEL_DESIGNS.find((d) => d.id === cfg.design) ?? WHEEL_DESIGNS[0];
  const rimR = (cfg.size * 0.0254) / 2;
  const tireW = cfg.tireWidth / 1000;
  const R = rimR + (cfg.tireWidth * cfg.profile) / 100000;
  const rimW = cfg.width * 0.0254;
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const finish = WHEEL_FINISHES.find((x) => x.id === cfg.finish) ?? WHEEL_FINISHES[0];
  const rimMat = wheelMaterial(cfg);
  const lipMat = finish.lip ? mat(`lip_${finish.lip}`, () => new THREE.MeshStandardMaterial({ color: finish.lip, metalness: 1, roughness: 0.12 })) : rimMat;
  const darkMat = mat('wheel_dark', () => new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.8, metalness: 0.2 }));

  // barrel
  const bKey = `barrel_${rimR.toFixed(3)}_${rimW.toFixed(3)}_${design.dish}`;
  const barrel = cache(bKey, () => barrelGeometry(rimR, rimW, design.dish));
  const barrelMesh = new THREE.Mesh(barrel, lipMat);
  spin.add(barrelMesh);
  // inner barrel shadow
  const innerKey = `inner_${rimR.toFixed(3)}_${rimW.toFixed(3)}`;
  const inner = cache(innerKey, () => new THREE.CylinderGeometry(rimR * 0.94, rimR * 0.94, rimW * 0.96, 32, 1, true).rotateZ(Math.PI / 2));
  const innerMesh = new THREE.Mesh(inner, mat('wheel_inner', () => new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.7, metalness: 0.5, side: THREE.BackSide })));
  spin.add(innerMesh);

  // face
  const fKey = `face_${design.id}_${rimR.toFixed(3)}`;
  const face = cache(fKey, () => toAxleX(faceGeometry(design.kind, design.spokes, rimR)));
  const faceMesh = new THREE.Mesh(face, rimMat);
  faceMesh.position.x = rimW / 2 - 0.02 - design.dish * 0.07;
  spin.add(faceMesh);
  if (design.kind === 'steel' || design.kind === 'slot') {
    // holes as dark discs
    const holeG = new THREE.CircleGeometry(rimR * (design.kind === 'slot' ? 0.13 : 0.09), 16);
    holeG.rotateY(Math.PI / 2);
    for (let i = 0; i < (design.kind === 'slot' ? 5 : 8); i++) {
      const a = (i / (design.kind === 'slot' ? 5 : 8)) * Math.PI * 2;
      const h = new THREE.Mesh(holeG, darkMat);
      const rr = rimR * (design.kind === 'slot' ? 0.6 : 0.68);
      h.position.set(faceMesh.position.x + 0.0125, Math.cos(a) * rr, Math.sin(a) * rr);
      if (design.kind === 'slot') h.scale.set(1, 1.6, 0.8);
      h.rotation.x = -a;
      spin.add(h);
    }
  }
  // lug nuts
  const lugG = new THREE.CylinderGeometry(0.009, 0.009, 0.02, 6);
  lugG.rotateZ(Math.PI / 2);
  const lugMat = mat('lug', () => new THREE.MeshStandardMaterial({ color: 0xd0d4da, metalness: 1, roughness: 0.25 }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const l = new THREE.Mesh(lugG, lugMat);
    l.position.set(faceMesh.position.x + 0.03, Math.cos(a) * rimR * 0.17, Math.sin(a) * rimR * 0.17);
    spin.add(l);
  }
  // tyre
  const tKey = `tire_${rimR.toFixed(3)}_${R.toFixed(3)}_${tireW.toFixed(3)}`;
  const tg = cache(tKey, () => tireGeometry(rimR, R, tireW));
  const tireMat = mat(`tire_${tireLabel}_${whiteLetters}`, () => {
    const m = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.92, metalness: 0 });
    return m;
  });
  spin.add(new THREE.Mesh(tg, tireMat));
  // sidewall lettering ring
  const ringG = new THREE.RingGeometry(rimR * 1.08, R - (R - rimR) * 0.22, 64, 1);
  // map ring uv as angle around
  const pos = ringG.attributes.position;
  const uv = ringG.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const ang = Math.atan2(y, x) / (Math.PI * 2) + 0.5;
    const rr = Math.hypot(x, y);
    uv.setXY(i, ang, (rr - rimR * 1.08) / (R - (R - rimR) * 0.22 - rimR * 1.08));
  }
  ringG.rotateY(Math.PI / 2);
  const ringMat = mat(`ring_${tireLabel}_${whiteLetters}`, () => new THREE.MeshStandardMaterial({ map: tireSidewallTexture(tireLabel, whiteLetters), roughness: 0.9, metalness: 0, transparent: false }));
  const ring = new THREE.Mesh(ringG, ringMat);
  ring.position.x = tireW / 2 * 1.02 + 0.001;
  spin.add(ring);

  // brake disc (doesn't need to spin visibly but we put it on spin group for slots)
  const discR = Math.min(rimR * 0.82, 0.12 + brakeLevel * 0.025);
  const discG = new THREE.CylinderGeometry(discR, discR, 0.026, 32);
  discG.rotateZ(Math.PI / 2);
  const disc = new THREE.Mesh(discG, mat('disc', () => new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.9, roughness: 0.38 })));
  disc.position.x = -0.02;
  spin.add(disc);
  // caliper (static)
  const calG = new THREE.BoxGeometry(0.05 + brakeLevel * 0.008, 0.07 + brakeLevel * 0.035, 0.05 + brakeLevel * 0.01);
  const cal = new THREE.Mesh(calG, mat(`cal_${caliperColor}`, () => new THREE.MeshStandardMaterial({ color: caliperColor, metalness: 0.3, roughness: 0.35 })));
  cal.position.set(0.0, discR * 0.55, side > 0 ? -discR * 0.62 : discR * 0.62);
  cal.rotation.x = 0.85;
  root.add(cal);

  // orient: left wheels face +X, right wheels face -X
  if (side < 0) root.rotation.y = Math.PI;
  return { root, spin, radius: R, width: tireW };
}
