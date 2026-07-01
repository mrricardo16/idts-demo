import { Mesh, Object3D } from "three";
import { createMockDevices, createUpdateTime, statusColors } from "../mock/deviceStatus";
import type { DeviceStatus, TwinDevice } from "../types/twin";

const statuses: DeviceStatus[] = ["normal", "running", "warning", "error", "stopped"];

export class StatusManager {
  private readonly devices = createMockDevices();
  private readonly lockedDeviceIds = new Set<string>();

  getDevices(): TwinDevice[] {
    return this.devices.map((device) => ({ ...device }));
  }

  getByMeshName(meshName: string): TwinDevice | undefined {
    const device = this.devices.find((item) => item.meshName === meshName);
    return device ? { ...device } : undefined;
  }

  getById(deviceId: string): TwinDevice | undefined {
    const device = this.devices.find((item) => item.id === deviceId);
    return device ? { ...device } : undefined;
  }

  randomUpdate(): TwinDevice[] {
    const count = Math.max(1, Math.floor(Math.random() * 3));
    const updatedIndexes = new Set<number>();

    while (updatedIndexes.size < count) {
      updatedIndexes.add(Math.floor(Math.random() * this.devices.length));
    }

    for (const index of updatedIndexes) {
      const device = this.devices[index];
      if (this.lockedDeviceIds.has(device.id)) {
        continue;
      }

      const nextStatus = statuses[Math.floor(Math.random() * statuses.length)];
      device.status = nextStatus;
      device.updateTime = createUpdateTime();
    }

    return this.getDevices();
  }

  setDeviceStatus(deviceId: string, status: DeviceStatus, locked = false): TwinDevice[] {
    const device = this.devices.find((item) => item.id === deviceId);
    if (device) {
      device.status = status;
      device.updateTime = createUpdateTime();
    }

    if (locked) {
      this.lockedDeviceIds.add(deviceId);
    } else {
      this.lockedDeviceIds.delete(deviceId);
    }

    return this.getDevices();
  }

  applyStatusColors(root: Object3D): void {
    for (const device of this.devices) {
      this.applyColor(root, device.meshName, statusColors[device.status]);
    }
  }

  private applyColor(root: Object3D, meshName: string, color: number): void {
    const target = root.getObjectByName(meshName);
    if (!target) {
      return;
    }

    target.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const item of materials) {
        if ("color" in item) {
          item.color.setHex(color);
        }
      }
    });
  }
}
