import { PerspectiveCamera } from "three";

export class CameraManager {
  readonly camera: PerspectiveCamera;

  constructor(container: HTMLElement) {
    this.camera = new PerspectiveCamera(
      48,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000,
    );
    this.camera.position.set(8, 6, 9);
  }

  resize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    this.camera.updateProjectionMatrix();
  }
}
