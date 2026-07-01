import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { lifterBindingConfig } from "../config/lifterBindingConfig";
import type { TwinDevice } from "../types/twin";

function material(color: number, metalness = 0.32, roughness = 0.48): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, metalness, roughness });
}

function assignDevice(object: Object3D, device: TwinDevice): Object3D {
  object.name = device.meshName;
  object.userData = {
    deviceId: device.id,
    deviceName: device.name,
    deviceType: device.type,
    meshName: device.meshName,
  };
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

function box(
  size: [number, number, number],
  position: [number, number, number],
  color: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), material(color));
  mesh.position.set(...position);
  return mesh;
}

function cylinder(
  radius: number,
  depth: number,
  position: [number, number, number],
  color: number,
  rotateToX = false,
): Mesh {
  const mesh = new Mesh(new CylinderGeometry(radius, radius, depth, 32), material(color));
  mesh.position.set(...position);
  if (rotateToX) {
    mesh.rotation.z = Math.PI / 2;
  }
  return mesh;
}

export class FallbackFactory {
  create(devices: TwinDevice[]): Group {
    const root = new Group();
    root.name = "fallback-lifter-root";

    const getDevice = (meshName: string): TwinDevice => {
      const device = devices.find((item) => item.meshName === meshName);
      if (!device) {
        throw new Error(`Missing mock device for ${meshName}`);
      }
      return device;
    };

    const frame = new Group();
    frame.name = "lifter-frame";
    frame.add(
      box([0.28, 0.28, 12.0], [-2.2, -1.6, 6.0], 0x4f6573),
      box([0.28, 0.28, 12.0], [2.2, -1.6, 6.0], 0x4f6573),
      box([0.28, 0.28, 12.0], [-2.2, 1.6, 6.0], 0x4f6573),
      box([0.28, 0.28, 12.0], [2.2, 1.6, 6.0], 0x4f6573),
      box([5.0, 0.32, 0.26], [0, -1.6, 12.15], 0x5d7786),
      box([5.0, 0.32, 0.26], [0, 1.6, 12.15], 0x5d7786),
      box([0.34, 3.5, 0.26], [-2.2, 0, 12.15], 0x5d7786),
      box([0.34, 3.5, 0.26], [2.2, 0, 12.15], 0x5d7786),
    );

    const mainDevice = assignDevice(
      box([4.7, 3.4, 0.18], [0, 0, 0.05], 0x526675),
      getDevice("lifter-main"),
    );

    const platform = new Group();
    assignDevice(platform, getDevice("lifter-platform"));
    platform.position.set(0, 0, lifterBindingConfig.defaultZ);
    platform.add(box([3.25, 2.35, 0.24], [0, 0, 0.14], 0x2d8cff));

    const conveyor = assignDevice(
      box([6.8, 1.05, 0.25], [0, 3.0, 0.45], 0x21c17a),
      getDevice("conveyor-01"),
    );
    const conveyorRollers = new Group();
    conveyorRollers.name = "conveyor-rollers";
    for (let index = 0; index < 7; index += 1) {
      conveyorRollers.add(cylinder(0.12, 1.15, [-2.7 + index * 0.9, 3.0, 0.68], 0x9db5c3));
    }

    const motor = assignDevice(
      cylinder(0.42, 0.82, [2.95, 2.25, 1.04], 0xf2c94c, true),
      getDevice("motor-01"),
    );

    const palletOne = assignDevice(
      box([1.0, 0.82, 0.18], [-1.7, 3.0, 0.9], 0x2d8cff),
      getDevice("pallet-01"),
    );
    palletOne.userData.baseX = palletOne.position.x;

    const palletTwo = assignDevice(
      box([1.0, 0.82, 0.18], [1.35, 3.0, 0.9], 0x8b95a5),
      getDevice("pallet-02"),
    );
    palletTwo.userData.baseX = palletTwo.position.x;

    const stationNodes = new Group();
    stationNodes.name = "station-nodes";
    stationNodes.add(
      box([0.5, 0.5, 0.5], [-3.25, -0.9, 0.45], 0x5d7786),
      box([0.5, 0.5, 0.5], [3.25, -0.9, 0.45], 0x5d7786),
      box([0.5, 0.5, 0.5], [-3.25, 1.0, 0.45], 0x5d7786),
      box([0.5, 0.5, 0.5], [3.25, 1.0, 0.45], 0x5d7786),
    );

    root.add(frame, mainDevice, platform, conveyor, conveyorRollers, motor, palletOne, palletTwo, stationNodes);
    this.center(root);
    return root;
  }

  private center(root: Object3D): void {
    root.position.set(0, 0, 0);
  }
}
