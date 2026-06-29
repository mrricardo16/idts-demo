import { Box3, Group, Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FallbackFactory } from "./FallbackFactory";
import type { TwinDevice } from "../types/twin";

export interface LoadedModel {
  root: Group;
  useFallback: boolean;
  message: string;
}

export class ModelLoader {
  private readonly loader = new GLTFLoader();
  private readonly fallbackFactory = new FallbackFactory();

  async load(devices: TwinDevice[]): Promise<LoadedModel> {
    try {
      const gltf = await this.loader.loadAsync("/models/lifter.glb");
      const root = gltf.scene;
      root.name = "lifter-glb-root";
      const bindingCount = this.prepareRealModel(root, devices);
      const message =
        bindingCount > 0
          ? "已加载真实 GLB 模型：public/models/lifter.glb"
          : "已加载真实 GLB，但未发现业务 meshName，已按整体 lifter-main 绑定";
      return {
        root,
        useFallback: false,
        message,
      };
    } catch {
      return {
        root: this.fallbackFactory.create(devices),
        useFallback: true,
        message: "未找到或无法加载 lifter.glb，已切换为几何体 fallback 场景",
      };
    }
  }

  private prepareRealModel(root: Object3D, devices: TwinDevice[]): number {
    const deviceMap = new Map(devices.map((device) => [device.meshName, device]));
    let bindingCount = 0;

    root.traverse((object) => {
      const device = deviceMap.get(object.name);
      if (device) {
        bindingCount += 1;
        object.userData = {
          ...object.userData,
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          meshName: device.meshName,
        };
      }
    });

    if (bindingCount === 0) {
      const mainDevice = devices.find((device) => device.meshName === "lifter-main");
      if (mainDevice) {
        root.name = mainDevice.meshName;
        root.userData = {
          ...root.userData,
          deviceId: mainDevice.id,
          deviceName: mainDevice.name,
          deviceType: mainDevice.type,
          meshName: mainDevice.meshName,
        };
      }
    }

    this.normalize(root);
    return bindingCount;
  }

  private normalize(root: Object3D): void {
    const box = new Box3().setFromObject(root);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxAxis = Math.max(size.x, size.y, size.z);
    if (maxAxis > 0) {
      root.scale.multiplyScalar(7 / maxAxis);
    }
    root.position.sub(center.multiplyScalar(root.scale.x));
  }
}
