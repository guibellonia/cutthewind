// WebGL renderer with retro post-processing (bloom, colour grade, speed blur, grain, scanlines).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high';
  retro: number; // 0..1 strength of retro filter (grain, scanlines, pixelation)
  bloom: boolean;
  reflections: boolean;
}

const RetroShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    time: { value: 0 },
    blur: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
    grain: { value: 0.035 },
    vignette: { value: 1.0 },
    aberration: { value: 0.004 },
    saturation: { value: 1.12 },
    contrast: { value: 1.08 },
    tint: { value: new THREE.Vector3(1.0, 0.98, 1.02) },
    shadowTint: { value: new THREE.Vector3(0.0, 0.25, 0.4) },
    highTint: { value: new THREE.Vector3(0.35, 0.18, 0.0) },
    scan: { value: 0.0 },
    pixel: { value: 1.0 },
    flash: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time, blur, grain, vignette, aberration, saturation, contrast, scan, pixel, flash;
    uniform vec2 resolution;
    uniform vec3 tint, shadowTint, highTint;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      if (pixel > 1.0) uv = (floor(uv * resolution / pixel) + 0.5) * pixel / resolution;
      vec2 dir = uv - vec2(0.5, 0.52);
      vec3 col = vec3(0.0);
      if (blur > 0.001) {
        float tot = 0.0;
        for (int i = 0; i < 10; i++) {
          float t = float(i) / 9.0;
          float w = 1.0 - t * 0.6;
          col += texture2D(tDiffuse, uv - dir * t * blur * 0.075).rgb * w;
          tot += w;
        }
        col /= tot;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }
      float ca = aberration * (0.4 + length(dir) * 2.0) * (1.0 + blur * 3.0);
      col.r = mix(col.r, texture2D(tDiffuse, uv + dir * ca).r, 0.7);
      col.b = mix(col.b, texture2D(tDiffuse, uv - dir * ca).b, 0.7);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.5) * contrast + 0.5;
      col += shadowTint * (1.0 - smoothstep(0.0, 0.45, l)) * 0.07;
      col += highTint * smoothstep(0.55, 1.0, l) * 0.08;
      col *= tint;
      float vg = smoothstep(0.95, 0.28, length(dir * vec2(1.0, 0.9)) * vignette);
      col *= mix(0.55, 1.0, vg);
      col += (rand(uv * resolution + fract(time) * 100.0) - 0.5) * grain;
      if (scan > 0.0) col *= 1.0 - scan * (0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159));
      col += flash;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  private renderPass: RenderPass;
  readonly bloom: UnrealBloomPass;
  readonly retro: ShaderPass;
  settings: GraphicsSettings;
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera();
  private envCache = new Map<string, THREE.Texture>();
  readonly pmrem: THREE.PMREMGenerator;
  speedBlur = 0;
  flash = 0;

  constructor(canvasEl: HTMLCanvasElement, settings: GraphicsSettings) {
    this.settings = settings;
    this.gl = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: settings.quality !== 'low', powerPreference: 'high-performance' });
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.pmrem = new THREE.PMREMGenerator(this.gl);
    this.composer = new EffectComposer(this.gl);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.7, 0.5, 0.86);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.retro = new ShaderPass(RetroShader);
    this.composer.addPass(this.retro);
    this.applySettings();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  applySettings() {
    const s = this.settings;
    const pr = Math.min(window.devicePixelRatio || 1, s.quality === 'high' ? 2 : s.quality === 'medium' ? 1.25 : 0.85);
    this.gl.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);
    this.bloom.enabled = s.bloom;
    const u = this.retro.uniforms;
    u.grain.value = 0.02 + s.retro * 0.05;
    u.scan.value = s.retro * 0.06;
    u.pixel.value = s.retro > 0.75 ? 2.0 : 1.0;
    u.aberration.value = 0.002 + s.retro * 0.004;
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.gl.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pr = this.gl.getPixelRatio();
    this.retro.uniforms.resolution.value.set(w * pr, h * pr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setView(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  render(dt: number) {
    const u = this.retro.uniforms;
    u.time.value += dt;
    u.blur.value = this.speedBlur;
    this.flash = Math.max(0, this.flash - dt * 2.5);
    u.flash.value = this.flash;
    if (this.camera.aspect !== window.innerWidth / window.innerHeight) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
    this.composer.render(dt);
  }

  /** Night-city environment map for reflections, cached by palette key. */
  nightEnv(key: string, palette: { sky: number; ground: number; lights: number[]; strips?: number }): THREE.Texture {
    const hit = this.envCache.get(key);
    if (hit) return hit;
    const scene = new THREE.Scene();
    const skyGeo = new THREE.SphereGeometry(50, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { top: { value: new THREE.Color(palette.sky) }, bottom: { value: new THREE.Color(palette.ground) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(bottom, top, smoothstep(-0.2, 0.6, h)); c += vec3(0.25,0.18,0.12) * exp(-abs(h) * 14.0) * 0.6; gl_FragColor = vec4(c, 1.0); }',
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
    const strips = palette.strips ?? 6;
    for (let i = 0; i < strips; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(14, 0.25, 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.93, 0.9) }));
      m.position.set(0, 12, -18 + i * 7);
      scene.add(m);
    }
    palette.lights.forEach((c, i) => {
      const a = (i / palette.lights.length) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2) }));
      m.position.set(Math.cos(a) * 20, 3 + (i % 3) * 2.5, Math.sin(a) * 20);
      m.lookAt(0, 3, 0);
      scene.add(m);
    });
    const env = this.pmrem.fromScene(scene, 0.035).texture;
    scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
    this.envCache.set(key, env);
    return env;
  }
}
