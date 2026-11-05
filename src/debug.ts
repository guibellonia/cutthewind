// Developer views: ?debug=car&model=<id>&build=bluehour|blackout|stock&cam=<n>   ?debug=lineup&side=1
import * as THREE from 'three';
import { blackoutBuild, blueHourBuild, stockBuild } from './core/builds';
import { CAR_LIST } from './data/cars';
import { CarVisual } from './render/car';
import { Renderer } from './render/renderer';
import { GarageScene } from './render/garageScene';
import { LANE_X, StripScene } from './render/stripScene';

export function runDebug(params: URLSearchParams) {
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const r = new Renderer(canvas, { quality: 'high', retro: 0.25, bloom: params.get('bloom') !== '0', reflections: params.get('refl') !== '0' });
  if (params.get('debug') === 'garage') {
    const g = new GarageScene(r, (params.get('theme') as any) ?? 'home');
    g.setCar(params.get('build') === 'blackout' ? blackoutBuild() : blueHourBuild());
    g.focus((params.get('focus') as any) ?? 'overview');
    g.attachControls(canvas);
    r.setView(g.scene, g.camera);
    let last = performance.now();
    const loop = () => { const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now; g.update(dt); r.render(dt); requestAnimationFrame(loop); };
    loop();
    return;
  }
  if (params.get('debug') === 'templates') {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4a505a);
    scene.environment = r.nightEnv('studio', { sky: 0x6a7280, ground: 0x2a2c30, lights: [0xffffff, 0xd0e0ff, 0xffe8d0, 0xffffff], strips: 8 });
    scene.add(new THREE.HemisphereLight(0xdde6f5, 0x404040, 1.4));
    const kl = new THREE.DirectionalLight(0xffffff, 2.2); kl.position.set(4, 7, 5); scene.add(kl);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; scene.add(fl);
    import('./data/bodyBlends.json').then((mod) => {
      const T = (mod as any).default.models as Record<string, { secs: number[][][] }>;
      const ids = (params.get('models') ?? Object.keys(T).slice(0, 8).join(',')).split(',');
      const side = params.get('side') === '1';
      const cols = 4;
      ids.forEach((id, k) => {
        const t = T[id];
        const mdl = CAR_LIST.find((c) => c.id === id)!;
        const L = mdl.length, W = mdl.width, H = mdl.height, base = 0.15;
        const ns = t.secs.length, na = t.secs[0].length;
        const pos: number[] = [], idx: number[] = [];
        const zF = mdl.wheelbase / 2 + mdl.frontOverhang;
        for (let i = 0; i < ns; i++) {
          const z = zF - ((i + 0.5) / ns) * L;
          for (let j = 0; j < 2 * na - 1; j++) {
            const jj = j < na ? j : 2 * na - 2 - j;
            const sg = j < na ? 1 : -1;
            const [xn, yn] = t.secs[i][jj];
            pos.push(sg * xn * W / 2, base + yn * (H - base), z);
          }
        }
        const nr = 2 * na - 1;
        for (let i = 0; i < ns - 1; i++) for (let j = 0; j < nr - 1; j++) { const a = i * nr + j, b = (i + 1) * nr + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        const grp = new THREE.Group();
        grp.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: [0xc4161c, 0x1f6fd1, 0xe0b321, 0xd9dbe0][k % 4], metalness: 0.5, roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide })));
        const tr = (mdl.stockWheelSize * 0.0254) / 2 + (mdl.stockTireWidth * mdl.stockTireProfile) / 100000;
        for (const za of [mdl.wheelbase / 2, -mdl.wheelbase / 2]) for (const sx of [-1, 1]) {
          const wh = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x111111 }));
          wh.rotation.z = Math.PI / 2; wh.position.set(sx * (W / 2 - 0.12), tr, za); grp.add(wh);
        }
        const col = k % cols, row = Math.floor(k / cols);
        if (side) { grp.rotation.y = Math.PI / 2; grp.position.set((col - 1.5) * 5.3, 0, -row * 6); } else { grp.rotation.y = 0.6; grp.position.set((col - 1.5) * 5.5, 0, -row * 7); }
        scene.add(grp);
      });
    });
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 300);
    cam.position.set(0, params.get('side') === '1' ? 3.5 : 8, 24);
    cam.lookAt(0, 0.2, -3.5);
    r.setView(scene, cam);
    const loop = () => { r.render(1 / 60); requestAnimationFrame(loop); };
    loop();
    return;
  }
  if (params.get('debug') === 'strip') {
    const st = new StripScene(r, params.get('venue') ?? 'pier9', 402.336, { meet: params.get('meet') === '1' });
    const p = new CarVisual(blueHourBuild(), { beams: true });
    const rv = new CarVisual(blackoutBuild(), { beams: true });
    const z = Number(params.get('z') ?? 0);
    p.root.position.set(LANE_X.player, 0, z - p.shape.zF);
    rv.root.position.set(LANE_X.rival, 0, z - rv.shape.zF);
    st.scene.add(p.root, rv.root);
    const cam = st.camera;
    const view = params.get('cam') ?? 'chase';
    if (view === 'chase') { cam.position.set(LANE_X.player, 1.6, z - 8.5); cam.lookAt(LANE_X.player * 0.5, 0.9, z + 8); }
    else if (view === 'front') { cam.position.set(0, 1.4, z + 9); cam.lookAt(0, 0.7, z - 2); }
    else { cam.position.set(-6, 2.2, z + 6); cam.lookAt(0, 0.8, z - 2); }
    st.setTree('player', { pre: true, stage: true, amber: 3, green: false, red: false });
    st.setTree('rival', { pre: true, stage: true, amber: 3, green: false, red: false });
    r.setView(st.scene, cam);
    let last = performance.now();
    const loop = () => {
      const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
      st.updateCarLights([p.root.position, rv.root.position]);
      for (const c of [p, rv]) c.update(dt, { speed: 0, accel: 0, braking: false, rpm: 3000, redline: 7000, nitro: false, throttle: 0.4 });
      r.render(dt); requestAnimationFrame(loop);
    };
    loop();
    return;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4a505a);
  scene.environment = r.nightEnv('studio', { sky: 0x6a7280, ground: 0x2a2c30, lights: [0xffffff, 0xd0e0ff, 0xffe8d0, 0xffffff], strips: 8 });
  scene.add(new THREE.HemisphereLight(0xdde6f5, 0x404040, 1.4));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2);
  dl.position.set(4, 7, 5);
  scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0xc8d8ff, 0.8);
  dl2.position.set(-5, 3, -4);
  scene.add(dl2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  const cars: CarVisual[] = [];
  if (params.get('debug') === 'lineup') {
    const ids = (params.get('models') ?? CAR_LIST.map((m) => m.id).join(',')).split(',');
    const side = params.get('side') === '1';
    const cols = Number(params.get('cols') ?? 4);
    ids.forEach((id, i) => {
      const c = new CarVisual(stockBuild(id), { shadow: true });
      const col = i % cols, row = Math.floor(i / cols);
      if (side) { c.root.rotation.y = Math.PI / 2; c.root.position.set((col - (cols - 1) / 2) * 5.4, 0, -row * 7); }
      else { c.root.rotation.y = 0.65; c.root.position.set((col - (cols - 1) / 2) * 5.6, 0, -row * 7.5); }
      scene.add(c.root);
      cars.push(c);
    });
    const rows = Math.ceil(ids.length / cols);
    cam.fov = 26;
    cam.position.set(0, side ? 4 : 9, 16 + rows * 4);
    cam.lookAt(0, 0, -(rows - 1) * 3.6);
  } else {
    const b = params.get('build');
    const model = params.get('model') ?? 'kairo_kestrel';
    const build = b === 'bluehour' ? blueHourBuild() : b === 'blackout' ? blackoutBuild() : stockBuild(model);
    const car = new CarVisual(build, { beams: false });
    scene.add(car.root);
    cars.push(car);
    const views = [[5.2, 1.6, 5.6], [-5.2, 1.4, 5.0], [6.5, 1.0, 0], [0, 1.2, 7.5], [0, 1.4, -7.5], [-4.5, 2.5, -5.5], [0, 8, 0.01], [3.2, 0.9, 4.2]];
    const v = views[Number(params.get('cam') ?? 0)] ?? views[0];
    cam.position.set(v[0], v[1], v[2]);
    cam.lookAt(0, 0.55, 0);
  }
  r.setView(scene, cam);
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const c of cars) c.update(dt, { speed: 0, accel: 0, braking: false, rpm: 900, redline: 7000, nitro: false, throttle: 0 });
    r.render(dt);
    requestAnimationFrame(loop);
  };
  loop();
}
