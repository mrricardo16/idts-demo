export type DeviceStatus =
  | "normal"
  | "running"
  | "warning"
  | "error"
  | "stopped";

export interface TwinDevice {
  id: string;
  name: string;
  type: string;
  status: DeviceStatus;
  meshName: string;
  updateTime: string;
}

export interface ModelLoadState {
  isLoading: boolean;
  useFallback: boolean;
  message: string;
}

export interface SelectableDeviceData {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  meshName: string;
}
