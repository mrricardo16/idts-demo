import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import type { TwinDevice } from "../types/twin";

function material(color: number, metalness = 0.32, roughness = 0.48): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, metalness, roughness });
}

function assignDevice(mesh: Mesh, device: TwinDevice): Mesh {
  mesh.name = device.meshName;
  mesh.userData = {
    deviceId: device.id,
    deviceName: device.name,
    deviceType: device.type,
    meshName: device.meshName,
  };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
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
): Mesh {
  const mesh = new Mesh(new CylinderGeometry(radius, radius, depth, 32), material(color));
  mesh.position.set(...position);
  mesh.rotation.z = Math.PI / 2;
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
      box([0.28, 4.2, 0.28], [-2.2, 2.1, -1.6], 0x4f6573),
      box([0.28, 4.2, 0.28], [2.2, 2.1, -1.6], 0x4f6573),
      box([0.28, 4.2, 0.28], [-2.2, 2.1, 1.6], 0x4f6573),
      box([0.28, 4.2, 0.28], [2.2, 2.1, 1.6], 0x4f6573),
      box([5.0, 0.26, 0.32], [0, 4.25, -1.6], 0x5d7786),
      box([5.0, 0.26, 0.32], [0, 4.25, 1.6], 0x5d7786),
      box([0.34, 0.26, 3.5], [-2.2, 4.25, 0], 0x5d7786),
      box([0.34, 0.26, 3.5], [2.2, 4.25, 0], 0x5d7786),
    );

    const mainDevice = assignDevice(
      box([4.7, 0.18, 3.4], [0, 0.1, 0], 0x526675),
      getDevice("lifter-main"),
    );

    const platform = assignDevice(
      box([3.25, 0.24, 2.35], [0, 1.25, 0], 0x2d8cff),
      getDevice("lifter-platform"),
    );
    platform.userData.baseY = platform.position.y;

    const conveyor = assignDevice(
      box([6.8, 0.25, 1.05], [0, 0.45, 3.0], 0x21c17a),
      getDevice("conveyor-01"),
    );
    const conveyorRollers = new Group();
    conveyorRollers.name = "conveyor-rollers";
    for (let index = 0; index < 7; index += 1) {
      conveyorRollers.add(cylinder(0.12, 1.15, [-2.7 + index * 0.9, 0.68, 3.0], 0x9db5c3));
    }

    const motor = assignDevice(
      cylinder(0.42, 0.82, [2.95, 1.04, 2.25], 0xf2c94c),
      getDevice("motor-01"),
    );

    const palletOne = assignDevice(
      box([1.0, 0.18, 0.82], [-1.7, 0.9, 3.0], 0x2d8cff),
      getDevice("pallet-01"),
    );
    palletOne.userData.baseX = palletOne.position.x;

    const palletTwo = assignDevice(
      box([1.0, 0.18, 0.82], [1.35, 0.9, 3.0], 0x8b95a5),
      getDevice("pallet-02"),
    );
    palletTwo.userData.baseX = palletTwo.position.x;

    const stationNodes = new Group();
    stationNodes.name = "station-nodes";
    stationNodes.add(
      box([0.5, 0.5, 0.5], [-3.25, 0.45, -0.9], 0x5d7786),
      box([0.5, 0.5, 0.5], [3.25, 0.45, -0.9], 0x5d7786),
      box([0.5, 0.5, 0.5], [-3.25, 0.45, 1.0], 0x5d7786),
      box([0.5, 0.5, 0.5], [3.25, 0.45, 1.0], 0x5d7786),
    );

    root.add(frame, mainDevice, platform, conveyor, conveyorRollers, motor, palletOne, palletTwo, stationNodes);
    this.center(root);
    return root;
  }

  private center(root: Object3D): void {
    root.position.set(0, 0, 0);
  }
}
