import {
  Box3,
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  type Object3D,
} from "three";
import type { ModelExternalConfig, TwinDevice } from "../types/twin";

export class ProxyFactory {
  createFromBox(
    source: Object3D | undefined,
    devices: TwinDevice[],
    config: ModelExternalConfig,
  ): Group {
    const root = new Group();
    root.name = `${config.bindings.rootName}-proxy`;

    const mainDevice = devices.find((device) => device.meshName === config.bindings.rootName) ?? devices[0];
    if (mainDevice) {
      root.userData = {
        ...root.userData,
        deviceId: mainDevice.id,
        deviceName: mainDevice.name,
        deviceType: mainDevice.type,
        meshName: mainDevice.meshName,
        modelId: config.modelId,
        isProxy: true,
      };
    }

    const box = source ? new Box3().setFromObject(source) : new Box3();
    const size = new Vector3(4, 3, 8);
    const center = new Vector3(0, 0, 4);
    if (!box.isEmpty()) {
      box.getSize(size);
      box.getCenter(center);
    }

    const geometry = new BoxGeometry(
      Math.max(size.x, 0.1),
      Math.max(size.y, 0.1),
      Math.max(size.z, 0.1),
    );
    const material = new MeshBasicMaterial({
      color: 0x2d8cff,
      opacity: 0.18,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.name = "lifter-proxy-box";
    mesh.position.copy(center);
    mesh.userData = { ...root.userData };

    const wireframe = new LineSegments(
      new EdgesGeometry(geometry),
      new LineBasicMaterial({ color: 0x69f0ff }),
    );
    wireframe.name = "lifter-proxy-wireframe";
    wireframe.position.copy(center);
    wireframe.userData = { ...root.userData };

    root.add(mesh, wireframe);
    return root;
  }
}
