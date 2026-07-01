import { PerspectiveCamera, Vector3 } from "three";
import { cameraControlConfig } from "../config/cameraControlConfig";

export class CameraManager {
  readonly camera: PerspectiveCamera;

  constructor(container: HTMLElement) {
    this.camera = new PerspectiveCamera(
      cameraControlConfig.camera.fov,
      container.clientWidth / Math.max(container.clientHeight, 1),
      cameraControlConfig.camera.near,
      cameraControlConfig.camera.far,
    );
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(
      cameraControlConfig.camera.position.x,
      cameraControlConfig.camera.position.y,
      cameraControlConfig.camera.position.z,
    );
  }

  resize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    this.camera.updateProjectionMatrix();
  }

  focusOn(center: Vector3, radius: number): void {
    const distance = Math.max(radius * 2.8, 2);
    this.camera.position.set(center.x + distance, center.y - distance, center.z + distance * 0.7);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
  }

  adaptClippingToModel(maxSize: number): void {
    if (!Number.isFinite(maxSize) || maxSize <= 0) {
      return;
    }

    const autoFar = Math.max(maxSize * 50, cameraControlConfig.camera.near * 100);
    const farLimit = 100000;
    this.camera.near = cameraControlConfig.camera.near;
    this.camera.far = Math.min(autoFar, farLimit);
    this.camera.updateProjectionMatrix();
  }
}
