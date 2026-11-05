// Developer views: ?debug=car&model=<id>&build=bluehour|blackout|stock&cam=<n>   ?debug=lineup&side=1
import * as THREE from 'three';
import { blackoutBuild, blueHourBuild, stockBuild } from './core/builds';
import { CAR_LIST } from './data/cars';
import { CarVisual } from './render/car';
import { Renderer } from './render/renderer';

export function runDebug(params: URLSearchParams) {
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const r = new Renderer(canvas, { quality: 'high', retro: 0.0, bloom: true, reflections: false });
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
