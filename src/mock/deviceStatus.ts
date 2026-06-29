import type { DeviceStatus, TwinDevice } from "../types/twin";

export const statusLabels: Record<DeviceStatus, string> = {
  normal: "正常",
  running: "运行",
  warning: "预警",
  error: "故障",
  stopped: "停止",
};

export const statusColors: Record<DeviceStatus, number> = {
  normal: 0x21c17a,
  running: 0x2d8cff,
  warning: 0xf2c94c,
  error: 0xff4d5a,
  stopped: 0x8b95a5,
};

export const statusClassNames: Record<DeviceStatus, string> = {
  normal: "status-normal",
  running: "status-running",
  warning: "status-warning",
  error: "status-error",
  stopped: "status-stopped",
};

export function createUpdateTime(): string {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

export function createMockDevices(): TwinDevice[] {
  const updateTime = createUpdateTime();

  return [
    {
      id: "LIFTER-001",
      name: "提升机主体",
      type: "lifter",
      status: "normal",
      meshName: "lifter-main",
      updateTime,
    },
    {
      id: "PLATFORM-001",
      name: "载货台",
      type: "platform",
      status: "running",
      meshName: "lifter-platform",
      updateTime,
    },
    {
      id: "CONVEYOR-001",
      name: "输送线 01",
      type: "conveyor",
      status: "normal",
      meshName: "conveyor-01",
      updateTime,
    },
    {
      id: "MOTOR-001",
      name: "电机 01",
      type: "motor",
      status: "warning",
      meshName: "motor-01",
      updateTime,
    },
    {
      id: "PALLET-001",
      name: "托盘 01",
      type: "pallet",
      status: "running",
      meshName: "pallet-01",
      updateTime,
    },
    {
      id: "PALLET-002",
      name: "托盘 02",
      type: "pallet",
      status: "stopped",
      meshName: "pallet-02",
      updateTime,
    },
  ];
}
