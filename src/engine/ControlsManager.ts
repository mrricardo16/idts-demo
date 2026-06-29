import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PerspectiveCamera } from "three";

export class ControlsManager {
  readonly controls: OrbitControls;

  constructor(camera: PerspectiveCamera, domElement: HTMLElement) {
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1.6, 0);
    this.controls.minDistance = 4;
    this.controls.maxDistance = 24;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.update();
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
