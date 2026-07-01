import { smallAreaDemoConfig } from "./areaDemo";
import type { AreaChunkConfig, AreaDemoConfig } from "../types/twin";

export const defaultAreaChunkId = "CHUNK-LIFTER-A";

export const mockAreaChunks: AreaChunkConfig[] = [
  {
    chunkId: "CHUNK-LIFTER-A",
    chunkName: "提升机区域 A 排",
    campusId: "CAMPUS-IDTS-DEMO",
    buildingId: "BUILDING-04",
    floorId: "F01",
    areaId: smallAreaDemoConfig.areaId,
    bounds: {
      min: { x: -36, y: -24, z: 0 },
      max: { x: 36, y: 0, z: 24 },
    },
    devices: smallAreaDemoConfig.devices.slice(0, 6),
    modelRefs: ["lifter"],
    neighborChunkIds: ["CHUNK-LIFTER-B"],
  },
  {
    chunkId: "CHUNK-LIFTER-B",
    chunkName: "提升机区域 B 排",
    campusId: "CAMPUS-IDTS-DEMO",
    buildingId: "BUILDING-04",
    floorId: "F01",
    areaId: smallAreaDemoConfig.areaId,
    bounds: {
      min: { x: -36, y: 0, z: 0 },
      max: { x: 36, y: 24, z: 24 },
    },
    devices: smallAreaDemoConfig.devices.slice(6, 12),
    modelRefs: ["lifter"],
    neighborChunkIds: ["CHUNK-LIFTER-A"],
  },
];

export function createAreaDemoConfigFromChunk(chunk: AreaChunkConfig): AreaDemoConfig {
  return {
    areaId: chunk.areaId,
    areaName: `${smallAreaDemoConfig.areaName} / ${chunk.chunkName}`,
    devices: chunk.devices,
  };
}
