// Game shell: renderer, settings, profile, screens and the main loop.
import * as THREE from 'three';
import { Renderer } from '../render/renderer';
import { GarageScene, type GarageTheme } from '../render/garageScene';
import { loadProfile, loadSettings, saveProfile, saveSettings, type Profile, type Settings } from '../core/state';
import { audio } from '../audio/audio';
import { clear } from '../ui/dom';
import { ensureDay } from './progression';

export interface Screen {
  enter(): void;
  exit(): void;
  update?(dt: number): void;
}

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ui: HTMLElement;
  readonly renderer: Renderer;
  settings: Settings;
  profile: Profile | null;
  private screen: Screen | null = null;
  private view: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; update?: (dt: number) => void } | null = null;
  private garage: GarageScene | null = null;
  private last = performance.now();
  timeScale = 1;

  constructor() {
    this.canvas = document.getElementById('gl') as HTMLCanvasElement;
    this.ui = document.getElementById('ui')!;
    this.settings = loadSettings();
    this.renderer = new Renderer(this.canvas, this.settings.graphics);
    audio.volumes = { ...this.settings.audio };
    this.profile = loadProfile();
    const unlock = () => { audio.init(); audio.applyVolumes(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    requestAnimationFrame(this.loop);
  }

  private loop = () => {
    const now = performance.now();
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const dt = raw * this.timeScale;
    try {
      this.screen?.update?.(dt);
      this.view?.update?.(dt);
      if (this.view) this.renderer.render(raw);
    } catch (e) {
      console.error(e);
    }
    requestAnimationFrame(this.loop);
  };

  setScreen(s: Screen) {
    this.screen?.exit();
    clear(this.ui);
    this.timeScale = 1;
    this.renderer.speedBlur = 0;
    this.screen = s;
    s.enter();
  }

  setView(scene: THREE.Scene, camera: THREE.PerspectiveCamera, update?: (dt: number) => void) {
    this.view = { scene, camera, update };
    this.renderer.setView(scene, camera);
  }

  /** Shared garage scene (re-used across title, garage and shops). */
  garageScene(theme: GarageTheme): GarageScene {
    if (this.garage && this.garage.theme !== theme) { this.garage.dispose(); this.garage = null; }
    if (!this.garage) {
      this.garage = new GarageScene(this.renderer, theme);
      this.garage.attachControls(this.canvas);
    }
    const g = this.garage;
    this.setView(g.scene, g.camera, (dt) => g.update(dt));
    return g;
  }

  releaseGarage() {
    this.garage?.dispose();
    this.garage = null;
  }

  save() {
    if (this.profile) {
      ensureDay(this.profile);
      saveProfile(this.profile);
    }
  }

  saveSettings() {
    saveSettings(this.settings);
    this.renderer.settings = this.settings.graphics;
    this.renderer.applySettings();
    audio.volumes = { ...this.settings.audio };
    audio.applyVolumes();
  }
}
