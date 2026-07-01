export type DeviceStatus =
  | "normal"
  | "arrived"
  | "running"
  | "warning"
  | "error"
  | "stopped";

export type MoveAxis = "x" | "y" | "z";

export type TaskSpeed = "slow" | "normal" | "fast";

export type LifterTaskStatus = "running" | "completed" | "failed";

export type MovableBindingSource = "none" | "semantic" | "candidate" | "manual";

export interface TwinDevice {
  id: string;
  name: string;
  type: string;
  status: DeviceStatus;
  meshName: string;
  updateTime: string;
}

export type TwinSceneMode = "single" | "area";

export interface AreaDeviceConfig {
  deviceId: string;
  deviceName: string;
  modelId: string;
  position: VectorSnapshot;
  rotationDeg: VectorSnapshot;
  scale: VectorSnapshot;
  status: DeviceStatus;
}

export interface AreaDemoConfig {
  areaId: string;
  areaName: string;
  devices: AreaDeviceConfig[];
}

export interface AreaChunkBounds {
  min: VectorSnapshot;
  max: VectorSnapshot;
}

export interface AreaChunkConfig {
  chunkId: string;
  chunkName: string;
  campusId: string;
  buildingId: string;
  floorId: string;
  areaId: string;
  bounds: AreaChunkBounds;
  devices: AreaDeviceConfig[];
  modelRefs: string[];
  neighborChunkIds: string[];
}

export type PriorityModelLoadPriority = "selected-device" | "visible-area" | "neighbor-prefetch" | "background";

export interface PriorityModelLoadJob {
  jobId: string;
  modelId: string;
  level: ModelLODLevel;
  priority: PriorityModelLoadPriority;
  chunkId?: string;
  deviceId?: string;
}

export interface ChunkLoaderState {
  isLoading: boolean;
  currentChunkId?: string;
  stableChunkId?: string;
  loadedChunkIds: string[];
  failedChunkId?: string;
  message: string;
  queue: PriorityModelLoadJob[];
}

export interface AreaRuntimeState {
  sceneMode: TwinSceneMode;
  areaId?: string;
  areaName?: string;
  campusId?: string;
  buildingId?: string;
  floorId?: string;
  currentChunkId?: string;
  stableChunkId?: string;
  loadedChunkIds?: string[];
  chunkMessage?: string;
  priorityQueueSize?: number;
  deviceCount: number;
  modelInstanceCount: number;
  selectedDeviceId?: string;
  selectedDeviceName?: string;
}

export interface ModelLoadState {
  isLoading: boolean;
  useFallback: boolean;
  message: string;
  status?: "idle" | "loading" | "loaded" | "failed";
  currentLevel?: ModelLODLevel;
  currentUrl?: string;
  failedModels?: Array<{
    level: ModelLODLevel;
    url: string;
    reason: string;
  }>;
}

export interface SelectableDeviceData {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  meshName: string;
}

export interface VectorSnapshot {
  x: number;
  y: number;
  z: number;
}

export interface CameraControlDebugState {
  navigationMode: "standard-orbit" | "free-look";
  orbitControls?: "enabled" | "disabled";
  zoomMode: "native-orbit" | "native-zoom-to-cursor" | "move-along-camera-forward";
  zoomToCursor: boolean;
  customWheelZoom: "disabled" | "free-look-wheel";
  leftMouse: "rotate view" | "look direction";
  rightMouse: "pan view" | "disabled";
  wheelZoomFocus: "controls.target" | "camera.forward";
  controlsTargetUsage?: string;
  modelSelfRotation: "disabled";
  cameraDistance: number;
  controlsTarget: VectorSnapshot;
  cameraForward?: VectorSnapshot;
  cameraPosition: VectorSnapshot;
  yawDeg?: number;
  pitchDeg?: number;
  wheelMoveSpeed?: number;
  lookSensitivity?: number;
  invertLookX?: boolean;
  invertLookY?: boolean;
  keyboardMove?: "enabled" | "disabled";
  keyboardMoveMode?: "ground" | "fly";
  pressedKeys?: string[];
  navigationActive?: boolean;
  keyMoveSpeed?: number;
  minDistance: number;
  maxDistance: number;
}

export interface BoundingBoxSnapshot {
  min: VectorSnapshot;
  max: VectorSnapshot;
  size: VectorSnapshot;
}

export interface ModelObjectNode {
  id: string;
  name: string;
  originalName: string;
  type: string;
  uuid: string;
  parentName: string;
  parentUuid: string;
  depth: number;
  childrenCount: number;
  position: VectorSnapshot;
  worldPosition: VectorSnapshot;
  rotation: VectorSnapshot;
  scale: VectorSnapshot;
  boundingBox: BoundingBoxSnapshot | null;
  userData: Record<string, string | number | boolean | null>;
}

export interface LifterBindingState {
  deviceId: string;
  movablePartName: string;
  currentMovableObjectName?: string;
  currentMovableObjectUuid?: string;
  currentZ?: number;
  initialPosition?: VectorSnapshot;
  localPosition?: VectorSnapshot;
  worldPosition?: VectorSnapshot;
  baseWorldPosition?: VectorSnapshot;
  targetWorldPosition?: VectorSnapshot;
  baseWorldZ?: number;
  currentWorldZ?: number;
  targetWorldZ?: number;
  moveMode?: "worldZ";
  boundingBox?: BoundingBoxSnapshot | null;
  moveAxis: MoveAxis;
  canMove: boolean;
  bindingSource: MovableBindingSource;
  message: string;
  warning?: string;
}

export interface TaskTargetPosition {
  code: string;
  label: string;
  z: number;
}

export interface LifterTask {
  taskId: string;
  deviceId: string;
  movableObjectName?: string;
  movableObjectUuid?: string;
  targetPositionCode: string;
  targetZ: number;
  speed: TaskSpeed;
  status: LifterTaskStatus;
  createTime: string;
  finishTime?: string;
  message?: string;
  currentZ?: number;
  currentWorldZ?: number;
  targetWorldZ?: number;
}

export interface LifterTaskRequest {
  deviceId: string;
  targetPositionCode: string;
  targetZ: number;
  speed: TaskSpeed;
}

export type ModelUpAxis = "x" | "y" | "z";
export type ModelLODLevel = "proxy" | "low" | "medium" | "high" | "source";
export type InstanceDemoMode = "mesh" | "instanced";
export type InstanceDemoCount = 100 | 500 | 1000;

export interface InstanceDemoState {
  enabled: boolean;
  mode: InstanceDemoMode;
  count: InstanceDemoCount;
  objectType: "static-repeat";
  drawCallHint: string;
}

export interface ModelTransformSettings {
  rotationDeg: VectorSnapshot;
  position: VectorSnapshot;
  scale: VectorSnapshot;
  autoCenter: boolean;
  groundToZero: boolean;
}

export interface ModelBindingSettings {
  rootName: string;
  movablePartName: string;
  moveAxis: MoveAxis;
}

export interface ModelLODSettings {
  sourceUrl: string;
  proxyUrl: string;
  lowUrl: string;
  mediumUrl: string;
  highUrl: string;
  defaultLevel: ModelLODLevel;
  selectedLevel: ModelLODLevel;
  autoLoadHighOnSelect: boolean;
  allowGeneratedProxy: boolean;
  initialFallbackOrder: ModelLODLevel[];
  nearDistance: number;
  farDistance: number;
}

export interface ModelExternalConfig {
  modelId: string;
  modelName: string;
  modelUrl: string;
  upAxis: ModelUpAxis;
  transform: ModelTransformSettings;
  bindings: ModelBindingSettings;
  lod: ModelLODSettings;
}

export interface ModelPerformanceStats {
  sceneMode: TwinSceneMode;
  currentLevel: ModelLODLevel;
  currentUrl?: string;
  deviceCount: number;
  modelInstanceCount: number;
  fps: number;
  meshCount: number;
  materialCount: number;
  textureCount: number;
  vertexCount: number;
  triangleCount: number;
  rendererRenderCalls: number;
  rendererRenderTriangles: number;
  rendererMemoryGeometries: number;
  rendererMemoryTextures: number;
}
