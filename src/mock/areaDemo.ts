import { createUpdateTime } from "./deviceStatus";
import type { AreaDemoConfig, TwinDevice } from "../types/twin";

export const smallAreaDemoConfig: AreaDemoConfig = {
  areaId: "AREA-LIFTER-01",
  areaName: "提升机小区域压力 Demo",
  devices: [
    { deviceId: "LIFTER-A01", deviceName: "提升机 A01", modelId: "lifter", position: { x: -30, y: -18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 0 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "normal" },
    { deviceId: "LIFTER-A02", deviceName: "提升机 A02", modelId: "lifter", position: { x: -18, y: -18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 8 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "running" },
    { deviceId: "LIFTER-A03", deviceName: "提升机 A03", modelId: "lifter", position: { x: -6, y: -18, z: 0 }, rotationDeg: { x: 0, y: 0, z: -8 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "normal" },
    { deviceId: "LIFTER-A04", deviceName: "提升机 A04", modelId: "lifter", position: { x: 6, y: -18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 0 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "warning" },
    { deviceId: "LIFTER-A05", deviceName: "提升机 A05", modelId: "lifter", position: { x: 18, y: -18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 8 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "normal" },
    { deviceId: "LIFTER-A06", deviceName: "提升机 A06", modelId: "lifter", position: { x: 30, y: -18, z: 0 }, rotationDeg: { x: 0, y: 0, z: -8 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "stopped" },
    { deviceId: "LIFTER-B01", deviceName: "提升机 B01", modelId: "lifter", position: { x: -30, y: 18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 180 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "normal" },
    { deviceId: "LIFTER-B02", deviceName: "提升机 B02", modelId: "lifter", position: { x: -18, y: 18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 172 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "running" },
    { deviceId: "LIFTER-B03", deviceName: "提升机 B03", modelId: "lifter", position: { x: -6, y: 18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 188 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "normal" },
    { deviceId: "LIFTER-B04", deviceName: "提升机 B04", modelId: "lifter", position: { x: 6, y: 18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 180 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "error" },
    { deviceId: "LIFTER-B05", deviceName: "提升机 B05", modelId: "lifter", position: { x: 18, y: 18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 172 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "normal" },
    { deviceId: "LIFTER-B06", deviceName: "提升机 B06", modelId: "lifter", position: { x: 30, y: 18, z: 0 }, rotationDeg: { x: 0, y: 0, z: 188 }, scale: { x: 0.35, y: 0.35, z: 0.35 }, status: "warning" },
  ],
};

export function createAreaTwinDevices(config = smallAreaDemoConfig): TwinDevice[] {
  const updateTime = createUpdateTime();
  return config.devices.map((device) => ({
    id: device.deviceId,
    name: device.deviceName,
    type: device.modelId,
    status: device.status,
    meshName: device.deviceId,
    updateTime,
  }));
}
