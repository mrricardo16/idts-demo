import { Box3, Vector3, type Object3D } from "three";
import type { ModelTransformSettings } from "../types/twin";

const DEG_TO_RAD = Math.PI / 180;

export class ModelTransformApplier {
  apply(root: Object3D, transform: ModelTransformSettings): void {
    root.position.set(0, 0, 0);
    root.rotation.set(
      transform.rotationDeg.x * DEG_TO_RAD,
      transform.rotationDeg.y * DEG_TO_RAD,
      transform.rotationDeg.z * DEG_TO_RAD,
    );
    root.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    root.updateMatrixWorld(true);

    this.applyCenterAndGround(root, transform);
    root.position.add(new Vector3(transform.position.x, transform.position.y, transform.position.z));
    root.updateMatrixWorld(true);
  }

  private applyCenterAndGround(root: Object3D, transform: ModelTransformSettings): void {
    if (!transform.autoCenter && !transform.groundToZero) {
      return;
    }

    const box = new Box3().setFromObject(root);
    if (box.isEmpty()) {
      return;
    }

    if (transform.autoCenter) {
      const center = new Vector3();
      box.getCenter(center);
      root.position.x -= center.x;
      root.position.y -= center.y;
      if (!transform.groundToZero) {
        root.position.z -= center.z;
      }
      root.updateMatrixWorld(true);
    }

    if (transform.groundToZero) {
      const groundedBox = new Box3().setFromObject(root);
      if (!groundedBox.isEmpty()) {
        root.position.z -= groundedBox.min.z;
        root.updateMatrixWorld(true);
      }
    }
  }
}
