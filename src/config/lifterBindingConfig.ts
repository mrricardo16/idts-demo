import type { MoveAxis, TaskSpeed, TaskTargetPosition } from "../types/twin";

export interface LifterBindingConfig {
  deviceId: "LIFTER-001";
  mainObjectName: "lifter-main";
  staticPartNames: string[];
  movablePartName: "lifter-platform";
  candidateMovablePartNames: string[];
  moveAxis: MoveAxis;
  minZ: number;
  maxZ: number;
  defaultZ: number;
}

export const lifterBindingConfig: LifterBindingConfig = {
  deviceId: "LIFTER-001",
  mainObjectName: "lifter-main",
  staticPartNames: ["lifter-frame", "lifter-main"],
  movablePartName: "lifter-platform",
  candidateMovablePartNames: [],
  moveAxis: "z",
  minZ: 0,
  maxZ: 12,
  defaultZ: 0,
};

export const lifterTargetPositions: TaskTargetPosition[] = [
  { code: "F1", label: "F1", z: 0 },
  { code: "F2", label: "F2", z: 4 },
  { code: "F3", label: "F3", z: 8 },
  { code: "F4", label: "F4", z: 12 },
];

export const taskSpeedUnitsPerSecond: Record<TaskSpeed, number> = {
  slow: 1.5,
  normal: 3,
  fast: 6,
};
