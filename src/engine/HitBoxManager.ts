import {
  Box3,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  type Object3D,
} from "three";
import { ResourceDisposer } from "./ResourceDisposer";
import type { AreaDeviceConfig, ModelExternalConfig } from "../types/twin";

export class HitBoxManager {
  private static readonly areaHitBoxPadding = new Vector3(6, 6, 4);
  private readonly hitBoxes: Mesh[] = [];

  createHitBox(root: Object3D, config: ModelExternalConfig): Mesh | undefined {
    this.clear();

    const box = new Box3().setFromObject(root);
    if (box.isEmpty()) {
      return undefined;
    }

    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    const geometry = new BoxGeometry(
      Math.max(size.x, 0.1),
      Math.max(size.y, 0.1),
      Math.max(size.z, 0.1),
    );
    const material = new MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.02,
      transparent: true,
      depthWrite: false,
    });
    const hitBox = new Mesh(geometry, material);
    hitBox.name = `${config.modelId}-hitbox`;
    hitBox.position.copy(center);
    hitBox.userData = {
      ...root.userData,
      modelId: config.modelId,
      isHitBox: true,
      selectTargetUuid: root.uuid,
    };
    this.hitBoxes.push(hitBox);
    return hitBox;
  }

  createAreaDeviceHitBox(root: Object3D, device: AreaDeviceConfig): Mesh | undefined {
    const box = new Box3().setFromObject(root);
    if (box.isEmpty()) {
      return undefined;
    }

    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    size.add(HitBoxManager.areaHitBoxPadding);

    const material = new MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    material.colorWrite = false;

    const hitBox = new Mesh(
      new BoxGeometry(
        Math.max(size.x, 6),
        Math.max(size.y, 6),
        Math.max(size.z, 12),
      ),
      material,
    );
    hitBox.name = `${device.deviceId}-hitbox`;
    hitBox.position.copy(center);
    hitBox.updateMatrixWorld(true);
    hitBox.userData = {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.modelId,
      modelId: device.modelId,
      meshName: device.deviceId,
      areaDeviceId: device.deviceId,
      isHitBox: true,
      isAreaDeviceHitBox: true,
      selectTargetUuid: hitBox.uuid,
    };
    this.hitBoxes.push(hitBox);
    return hitBox;
  }

  getHitBoxes(): Object3D[] {
    return this.hitBoxes;
  }

  clear(): void {
    for (const hitBox of this.hitBoxes) {
      ResourceDisposer.disposeObject3D(hitBox, { removeFromParent: true });
    }
    this.hitBoxes.length = 0;
  }
}
