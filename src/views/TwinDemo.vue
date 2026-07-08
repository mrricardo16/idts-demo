<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { lifterBindingConfig, lifterTargetPositions } from "../config/lifterBindingConfig";
import type { FaultSimulationState, RuntimeFaultInfo } from "../engine/FaultSimulationManager";
import { modelConfigLocalStorageKey } from "../engine/LODModelLoader";
import type { ModelMaterialState } from "../engine/ModelMaterialManager";
import { TwinScene, type FaultCalloutAnchor } from "../engine/TwinScene";
import { statusClassNames, statusLabels } from "../mock/deviceStatus";
import type {
  AreaRuntimeState,
  AppMode,
  DeviceStatus,
  CameraControlDebugState,
  InstanceDemoCount,
  InstanceDemoMode,
  InstanceDemoState,
  LifterBindingState,
  LifterTask,
  ModelExternalConfig,
  ModelLODLevel,
  ModelLoadState,
  ModelObjectNode,
  ModelPerformanceStats,
  ModelTransformSettings,
  TaskSpeed,
  TwinDevice,
} from "../types/twin";

type ObjectFilterMode =
  | "all"
  | "small"
  | "medium"
  | "large"
  | "siblings"
  | "children"
  | "mesh"
  | "group";

type ObjectListMode = "all" | "search" | "children";

type FaultCalloutInfo = Pick<
  RuntimeFaultInfo,
  | "faultCode"
  | "faultLevel"
  | "faultMessage"
  | "partName"
  | "objectName"
  | "objectUuid"
  | "matchedObjectName"
  | "matchedObjectUuid"
  | "occurTime"
  | "suggestion"
> & {
  deviceId: string;
};

type FaultCalloutPlacement = "left" | "right";

const viewportRef = ref<HTMLElement | null>(null);
const twinScene = ref<TwinScene | null>(null);
const devices = ref<TwinDevice[]>([]);
const selectedDevice = ref<TwinDevice | undefined>();
const axesVisible = ref(false);
const modelNodes = ref<ModelObjectNode[]>([]);
const selectedObjectUuid = ref("");
const objectSearchQuery = ref("");
const objectFilterMode = ref<ObjectFilterMode>("all");
const objectListMode = ref<ObjectListMode>("all");
const objectListMessage = ref("");
const childrenScopeNodes = ref<ModelObjectNode[]>([]);
const currentListParentName = ref("");
const currentListParentUuid = ref("");
const latestTask = ref<LifterTask | undefined>();
const taskDeviceId = ref<string>(lifterBindingConfig.deviceId);
const selectedTargetCode = ref(lifterTargetPositions[0]?.code ?? "F1");
const selectedSpeed = ref<TaskSpeed>("normal");
const appMode = ref<AppMode>("monitor");
const hasInitializedAppMode = ref(false);
const editBaselineConfig = ref<ModelExternalConfig | undefined>();
const bindingState = ref<LifterBindingState>({
  deviceId: lifterBindingConfig.deviceId,
  movablePartName: lifterBindingConfig.movablePartName,
  moveAxis: lifterBindingConfig.moveAxis,
  canMove: false,
  bindingSource: "none",
  message: "等待模型加载完成后进行绑定检查。",
});
const modelConfig = ref<ModelExternalConfig | undefined>();
const calibrationForm = ref({
  rotationX: 180,
  rotationY: 0,
  rotationZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  flipX: false,
  flipY: false,
  flipZ: false,
  autoCenter: true,
  groundToZero: true,
  preserveOriginalMaterial: true,
  defaultColor: "#2f3437",
  defaultOpacity: 1,
});
const calibrationCopyMessage = ref("");
const editModeMessage = ref("");
const performanceStats = ref<ModelPerformanceStats | undefined>();
const cameraControlState = ref<CameraControlDebugState | undefined>();
const faultSimulationState = ref<FaultSimulationState>({
  enabled: false,
  deviceId: "",
  faultColor: "#ff3333",
  activeFaults: [],
  message: "未配置异常模拟。",
});
const faultCalloutFault = ref<FaultCalloutInfo | undefined>();
const faultCalloutAnchor = ref<FaultCalloutAnchor | undefined>();
const isFaultCalloutVisible = ref(false);
const faultCalloutExpanded = ref(false);
const modelMaterialState = ref<ModelMaterialState>({
  preserveOriginalMaterial: true,
  defaultColor: undefined,
  defaultOpacity: undefined,
  faultColor: "#ff3333",
  selectionColor: "#69f0ff",
  movablePartColor: "#21c17a",
  objectColorCount: 0,
  appliedObjectColorCount: 0,
});
const loadState = ref<ModelLoadState>({
  isLoading: true,
  useFallback: false,
  message: "等待初始化",
  status: "idle",
});
const areaState = ref<AreaRuntimeState>({
  sceneMode: "single",
  deviceCount: 0,
  modelInstanceCount: 0,
});
const instanceDemoState = ref<InstanceDemoState>({
  enabled: false,
  mode: "instanced",
  count: 100,
  objectType: "static-repeat",
  drawCallHint: "disabled",
});

const statusOrder: DeviceStatus[] = [
  "normal",
  "arrived",
  "running",
  "warning",
  "error",
  "stopped",
];

const speedLabels: Record<TaskSpeed, string> = {
  slow: "slow",
  normal: "normal",
  fast: "fast",
};
const taskSpeeds: TaskSpeed[] = ["slow", "normal", "fast"];
const lodLevels: ModelLODLevel[] = ["source", "high", "medium", "low"];
const instanceModes: InstanceDemoMode[] = ["mesh", "instanced"];
const instanceCounts: InstanceDemoCount[] = [100, 500, 1000];
const filterOptions: Array<{ label: string; value: ObjectFilterMode }> = [
  { label: "全部", value: "all" },
  { label: "小型对象", value: "small" },
  { label: "中型对象", value: "medium" },
  { label: "大型对象", value: "large" },
  { label: "同级对象", value: "siblings" },
  { label: "子对象", value: "children" },
  { label: "只看 Mesh", value: "mesh" },
  { label: "Group / Object3D", value: "group" },
];

const activeDevice = computed(() => selectedDevice.value ?? devices.value[0]);
const selectedTarget = computed(
  () =>
    lifterTargetPositions.find((position) => position.code === selectedTargetCode.value) ??
    lifterTargetPositions[0],
);
const isTaskRunning = computed(() => latestTask.value?.status === "running");
const isEditMode = computed(() => appMode.value === "edit");
const canDispatchTask = computed(() => appMode.value === "monitor" && bindingState.value.canMove && !isTaskRunning.value);
const canTestMove = computed(() => appMode.value === "monitor" && bindingState.value.canMove && !isTaskRunning.value);
const hasLoadedModel = computed(() => Boolean(performanceStats.value));
const currentDisplayLevel = computed(() => loadState.value.currentLevel ?? performanceStats.value?.currentLevel ?? "-");
const selectedModelNode = computed(() =>
  modelNodes.value.find((node) => node.uuid === selectedObjectUuid.value),
);
const selectedParentNode = computed(() => {
  if (!selectedModelNode.value?.parentUuid) {
    return undefined;
  }

  return modelNodes.value.find((node) => node.uuid === selectedModelNode.value?.parentUuid);
});
const selectedChildNodes = computed(() => {
  if (!selectedModelNode.value) {
    return [];
  }

  return modelNodes.value.filter((node) => node.parentUuid === selectedModelNode.value?.uuid);
});
const objectListModeLabel = computed(() => {
  if (objectListMode.value === "children") {
    return "children";
  }
  if (objectSearchQuery.value.trim()) {
    return "search";
  }
  return objectFilterMode.value === "all" ? "all" : objectFilterMode.value;
});
const filteredModelNodes = computed(() => {
  const keyword = objectSearchQuery.value.trim().toLowerCase();
  let nodes = objectListMode.value === "children" && !keyword ? childrenScopeNodes.value : modelNodes.value;

  if (keyword) {
    nodes = modelNodes.value;
    nodes = nodes.filter((node) => {
      const searchable = `${node.name} ${node.originalName} ${node.parentName} ${node.uuid}`.toLowerCase();
      return searchable.includes(keyword);
    });
  }

  if (objectListMode.value === "children" && !keyword) {
    return nodes;
  }

  switch (objectFilterMode.value) {
    case "small":
      return nodes.filter((node) => getMaxBoxSize(node) > 0 && getMaxBoxSize(node) <= 0.5);
    case "medium":
      return nodes.filter((node) => getMaxBoxSize(node) > 0.5 && getMaxBoxSize(node) <= 2);
    case "large":
      return nodes.filter((node) => getMaxBoxSize(node) > 2);
    case "siblings":
      return selectedModelNode.value
        ? nodes.filter((node) => node.parentUuid === selectedModelNode.value?.parentUuid)
        : nodes;
    case "children":
      return selectedModelNode.value
        ? nodes.filter((node) => node.parentUuid === selectedModelNode.value?.uuid)
        : [];
    case "mesh":
      return nodes.filter((node) => node.type === "Mesh");
    case "group":
      return nodes.filter((node) => node.type === "Group" || node.type === "Object3D");
    default:
      return nodes;
  }
});
const visibleModelNodes = computed(() => filteredModelNodes.value.slice(0, 100));
const isResultLimited = computed(() => filteredModelNodes.value.length > visibleModelNodes.value.length);
const faultCalloutLayout = computed(() => {
  const anchor = faultCalloutAnchor.value;
  if (!anchor) {
    return {
      placement: "right" as FaultCalloutPlacement,
      style: {},
      linePoints: "",
      anchorX: 0,
      anchorY: 0,
      lineEndX: 0,
      lineEndY: 0,
      viewBox: "0 0 0 0",
    };
  }

  const cardWidth = 300;
  const estimatedCardHeight = faultCalloutExpanded.value ? 286 : 188;
  const viewportMargin = 12;
  const anchorGap = 24;
  const preferredTopOffset = -40;
  const hasRightSpace = anchor.x + anchorGap + cardWidth <= anchor.viewportWidth - viewportMargin;
  const placement: FaultCalloutPlacement = hasRightSpace ? "right" : "left";
  const maxLeft = Math.max(viewportMargin, anchor.viewportWidth - cardWidth - viewportMargin);
  const rawLeft = placement === "right" ? anchor.x + anchorGap : anchor.x - anchorGap - cardWidth;
  const left = clampNumber(rawLeft, viewportMargin, maxLeft);
  const preferredTop = anchor.y + preferredTopOffset;
  const downwardTop = anchor.y + anchorGap;
  const maxTop = Math.max(viewportMargin, anchor.viewportHeight - estimatedCardHeight - viewportMargin);
  const rawTop = preferredTop < viewportMargin ? downwardTop : preferredTop;
  const top = clampNumber(rawTop, viewportMargin, maxTop);
  const arrowTop = clampNumber(anchor.y - top, 24, estimatedCardHeight - 24);
  const lineEndX = placement === "right" ? left : left + cardWidth;
  const lineEndY = top + arrowTop;
  const lineBendX = placement === "right"
    ? Math.min(anchor.x + anchorGap * 0.75, lineEndX)
    : Math.max(anchor.x - anchorGap * 0.75, lineEndX);

  return {
    placement,
    style: {
      left: `${left}px`,
      top: `${top}px`,
      "--fault-arrow-top": `${arrowTop}px`,
    },
    linePoints: `${anchor.x},${anchor.y} ${lineBendX},${anchor.y} ${lineBendX},${lineEndY} ${lineEndX},${lineEndY}`,
    anchorX: anchor.x,
    anchorY: anchor.y,
    lineEndX,
    lineEndY,
    viewBox: `0 0 ${anchor.viewportWidth} ${anchor.viewportHeight}`,
  };
});

function getMaxBoxSize(node: ModelObjectNode): number {
  if (!node.boundingBox) {
    return 0;
  }

  const size = node.boundingBox.size;
  return Math.max(size.x, size.y, size.z);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function selectDevice(device: TwinDevice): void {
  selectedDevice.value = device;
  twinScene.value?.selectDevice(device.meshName);
}

function selectModelNode(node: ModelObjectNode): void {
  selectedObjectUuid.value = node.uuid;
  twinScene.value?.selectModelObject(node.uuid);
}

function clearObjectListScope(): void {
  childrenScopeNodes.value = [];
  currentListParentName.value = "";
  currentListParentUuid.value = "";
}

function setChildrenScope(parentNode: ModelObjectNode, children: ModelObjectNode[]): void {
  objectSearchQuery.value = "";
  objectFilterMode.value = "all";
  objectListMode.value = "children";
  objectListMessage.value = "";
  currentListParentName.value = parentNode.name;
  currentListParentUuid.value = parentNode.uuid;
  childrenScopeNodes.value = children;
}

function handleObjectSearchInput(): void {
  if (objectSearchQuery.value.trim()) {
    objectListMode.value = "search";
    objectFilterMode.value = "all";
    objectListMessage.value = "";
    clearObjectListScope();
    return;
  }

  if (objectListMode.value === "search") {
    objectListMode.value = "all";
    clearObjectListScope();
  }
}

function applyObjectFilter(filter: ObjectFilterMode): void {
  if (filter === "children") {
    viewChildObjects();
    return;
  }

  objectFilterMode.value = filter;
  objectListMessage.value = "";

  if (filter === "all") {
    objectSearchQuery.value = "";
    objectListMode.value = "all";
    clearObjectListScope();
    return;
  }

  objectListMode.value = objectSearchQuery.value.trim() ? "search" : "all";
  clearObjectListScope();
}

function setSelectedAsMovable(): void {
  if (!selectedModelNode.value) {
    return;
  }

  const nextState = twinScene.value?.setMovablePartFromNode(selectedModelNode.value);
  if (nextState) {
    bindingState.value = nextState;
  }
}

function clearMovablePart(): void {
  const nextState = twinScene.value?.clearMovablePart();
  if (nextState) {
    bindingState.value = nextState;
  }
}

function enableFaultSimulation(): void {
  const nextState = twinScene.value?.enableFaultSimulation() ?? faultSimulationState.value;
  faultSimulationState.value = nextState;
  syncFaultCallout(nextState);
}

function disableFaultSimulation(): void {
  const nextState = twinScene.value?.disableFaultSimulation() ?? faultSimulationState.value;
  faultSimulationState.value = nextState;
  closeFaultCallout();
}

function syncFaultCallout(state: FaultSimulationState): void {
  if (!state.enabled || !state.selectedFault) {
    closeFaultCallout();
    return;
  }

  const fault = state.selectedFault;
  faultCalloutFault.value = {
    faultCode: fault.faultCode,
    faultLevel: fault.faultLevel,
    faultMessage: fault.faultMessage,
    partName: fault.partName,
    objectName: fault.objectName,
    objectUuid: fault.objectUuid,
    matchedObjectName: fault.matchedObjectName,
    matchedObjectUuid: fault.matchedObjectUuid,
    occurTime: fault.occurTime,
    suggestion: fault.suggestion,
    deviceId: state.deviceId,
  };
  faultCalloutExpanded.value = false;
  isFaultCalloutVisible.value = Boolean(faultCalloutAnchor.value);
}

function updateFaultCalloutAnchor(anchor: FaultCalloutAnchor | undefined): void {
  if (!anchor) {
    closeFaultCallout();
    return;
  }

  faultCalloutAnchor.value = anchor;
  isFaultCalloutVisible.value = Boolean(anchor && faultCalloutFault.value && faultSimulationState.value.enabled);
}

function toggleFaultCalloutDetails(): void {
  faultCalloutExpanded.value = !faultCalloutExpanded.value;
}

function closeFaultCallout(): void {
  isFaultCalloutVisible.value = false;
  faultCalloutFault.value = undefined;
  faultCalloutAnchor.value = undefined;
  faultCalloutExpanded.value = false;
}

function getFaultCalloutObjectUuid(): string {
  return faultCalloutFault.value?.objectUuid || faultCalloutFault.value?.matchedObjectUuid || "";
}

function formatFaultCalloutUuid(uuid: string): string {
  if (!uuid) {
    return "-";
  }
  if (uuid.length <= 18) {
    return uuid;
  }

  return `${uuid.slice(0, 8)}...${uuid.slice(-6)}`;
}

function focusSelectedObject(): void {
  if (selectedObjectUuid.value) {
    twinScene.value?.focusModelObject(selectedObjectUuid.value);
  }
}

function focusModel(): void {
  twinScene.value?.focusModel();
}

function resetView(): void {
  twinScene.value?.resetView();
}

function focusMovablePart(): void {
  if (bindingState.value.currentMovableObjectUuid) {
    twinScene.value?.focusModelObject(bindingState.value.currentMovableObjectUuid);
  }
}

function viewParentObject(): void {
  const parentNode =
    selectedObjectUuid.value
      ? twinScene.value?.getModelObjectParent(selectedObjectUuid.value) ?? selectedParentNode.value
      : selectedParentNode.value;

  if (!parentNode) {
    objectListMessage.value = "当前对象没有父级";
    return;
  }

  const children =
    twinScene.value?.getModelObjectChildren(parentNode.uuid) ??
    modelNodes.value.filter((node) => node.parentUuid === parentNode.uuid);

  selectModelNode(parentNode);
  setChildrenScope(parentNode, children);
}

function viewChildObjects(): void {
  if (!selectedModelNode.value) {
    objectListMessage.value = "请先选择对象";
    return;
  }

  const children = twinScene.value?.getModelObjectChildren(selectedModelNode.value.uuid);
  if (!children) {
    objectListMessage.value = "未在场景中找到当前对象，无法查看子级";
    return;
  }

  if (children.length === 0) {
    objectListMessage.value = "当前对象没有子级";
    return;
  }

  setChildrenScope(selectedModelNode.value, children);
}

function testMove(deltaZ: number): void {
  const nextState = twinScene.value?.moveCurrentMovableBy(deltaZ);
  if (nextState) {
    bindingState.value = nextState;
  }
}

function resetMovablePart(): void {
  const nextState = twinScene.value?.resetMovablePartPosition();
  if (nextState) {
    bindingState.value = nextState;
  }
}

function toggleAxes(): void {
  axesVisible.value = !axesVisible.value;
  twinScene.value?.setAxesVisible(axesVisible.value);
}

function dispatchTask(): void {
  if (!selectedTarget.value) {
    return;
  }

  const task = twinScene.value?.dispatchLifterTask({
    deviceId: taskDeviceId.value,
    targetPositionCode: selectedTarget.value.code,
    targetZ: selectedTarget.value.z,
    speed: selectedSpeed.value,
  });

  if (task) {
    latestTask.value = task;
  }
}

function switchModelLevel(level: ModelLODLevel): void {
  void twinScene.value?.switchModelLevel(level);
}

function loadSingleDeviceDemo(): void {
  void twinScene.value?.loadSingleDeviceDemo();
}

function loadAreaDemo(): void {
  void twinScene.value?.loadAreaDemo();
}

function setInstanceDemo(mode: InstanceDemoMode, count: InstanceDemoCount): void {
  const state = twinScene.value?.setInstanceDemo(mode, count);
  if (state) {
    instanceDemoState.value = state;
  }
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}

function formatBox(node?: ModelObjectNode): string {
  if (!node?.boundingBox) {
    return "无包围盒";
  }

  const size = node.boundingBox.size;
  return `${formatNumber(size.x)} x ${formatNumber(size.y)} x ${formatNumber(size.z)}`;
}

function formatBoxFromState(): string {
  const size = bindingState.value.boundingBox?.size;
  if (!size) {
    return "无包围盒";
  }

  return `${formatNumber(size.x)} x ${formatNumber(size.y)} x ${formatNumber(size.z)}`;
}

function formatVector(vector?: { x: number; y: number; z: number }): string {
  if (!vector) {
    return "-";
  }

  return `${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)}`;
}

function formatUserData(node?: ModelObjectNode): string {
  if (!node || Object.keys(node.userData).length === 0) {
    return "-";
  }

  return JSON.stringify(node.userData);
}

function syncCalibrationForm(config: ModelExternalConfig): void {
  calibrationForm.value = {
    rotationX: config.transform.rotationDeg.x,
    rotationY: config.transform.rotationDeg.y,
    rotationZ: config.transform.rotationDeg.z,
    scaleX: config.transform.scale.x,
    scaleY: config.transform.scale.y,
    scaleZ: config.transform.scale.z,
    positionX: config.transform.position.x,
    positionY: config.transform.position.y,
    positionZ: config.transform.position.z,
    flipX: config.transform.flip?.x ?? false,
    flipY: config.transform.flip?.y ?? false,
    flipZ: config.transform.flip?.z ?? false,
    autoCenter: config.transform.autoCenter,
    groundToZero: config.transform.groundToZero,
    preserveOriginalMaterial: config.materialConfig?.preserveOriginalMaterial ?? true,
    defaultColor: config.materialConfig?.defaultColor ?? "#2f3437",
    defaultOpacity: config.materialConfig?.defaultOpacity ?? 1,
  };
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function buildCalibrationTransform(): ModelTransformSettings {
  return {
    rotationDeg: {
      x: finiteNumber(calibrationForm.value.rotationX, 0),
      y: finiteNumber(calibrationForm.value.rotationY, 0),
      z: finiteNumber(calibrationForm.value.rotationZ, 0),
    },
    position: {
      x: finiteNumber(calibrationForm.value.positionX, 0),
      y: finiteNumber(calibrationForm.value.positionY, 0),
      z: finiteNumber(calibrationForm.value.positionZ, 0),
    },
    scale: {
      x: finiteNumber(calibrationForm.value.scaleX, 1),
      y: finiteNumber(calibrationForm.value.scaleY, 1),
      z: finiteNumber(calibrationForm.value.scaleZ, 1),
    },
    flip: {
      x: calibrationForm.value.flipX,
      y: calibrationForm.value.flipY,
      z: calibrationForm.value.flipZ,
    },
    autoCenter: calibrationForm.value.autoCenter,
    groundToZero: calibrationForm.value.groundToZero,
  };
}

function buildEditedModelConfig(): ModelExternalConfig | undefined {
  if (!modelConfig.value) {
    return undefined;
  }

  return buildPlainModelConfig({
    ...modelConfig.value,
    transform: buildCalibrationTransform(),
    materialConfig: {
      preserveOriginalMaterial: calibrationForm.value.preserveOriginalMaterial,
      defaultColor: calibrationForm.value.defaultColor,
      defaultOpacity: finiteNumber(calibrationForm.value.defaultOpacity, 1),
      selectionColor: modelConfig.value.materialConfig?.selectionColor ?? modelMaterialState.value.selectionColor,
      movablePartColor: modelConfig.value.materialConfig?.movablePartColor ?? modelMaterialState.value.movablePartColor,
      faultColor: modelConfig.value.materialConfig?.faultColor ?? modelMaterialState.value.faultColor,
      objectColors: modelConfig.value.materialConfig?.objectColors ?? [],
    },
  });
}

function buildPlainModelConfig(config: ModelExternalConfig): ModelExternalConfig {
  return JSON.parse(JSON.stringify({
    modelId: config.modelId,
    modelName: config.modelName,
    modelUrl: config.modelUrl,
    upAxis: config.upAxis,
    transform: config.transform,
    bindings: config.bindings,
    lod: config.lod,
    materialConfig: config.materialConfig,
    faultSimulation: config.faultSimulation,
    modeConfig: config.modeConfig,
    performance: config.performance,
  })) as ModelExternalConfig;
}

function applyCalibration(): void {
  if (!isEditMode.value) {
    return;
  }

  const editedConfig = buildEditedModelConfig();
  if (!editedConfig) {
    return;
  }

  const nextConfig = twinScene.value?.applyModelConfig(editedConfig);
  if (nextConfig) {
    modelConfig.value = nextConfig;
    calibrationCopyMessage.value = "";
    editModeMessage.value = "已实时预览整机模型 root 配置。";
  }
}

async function copyModelConfigJson(): Promise<void> {
  const nextConfig = buildEditedModelConfig() ?? modelConfig.value;
  if (!nextConfig) {
    return;
  }

  const json = `${JSON.stringify(buildPlainModelConfig(nextConfig), null, 2)}\n`;
  await navigator.clipboard.writeText(json);
  calibrationCopyMessage.value = "已复制 JSON。";
}

function setAppMode(mode: AppMode): void {
  appMode.value = mode;
  twinScene.value?.setAppMode(mode);
  editModeMessage.value = mode === "edit"
    ? "当前编辑对象是整机模型 root，不是子部件。"
    : "已切换到监控模式。";
  if (mode === "edit") {
    editBaselineConfig.value = modelConfig.value ? buildPlainModelConfig(modelConfig.value) : undefined;
    if (modelConfig.value) {
      syncCalibrationForm(modelConfig.value);
    }
  }
}

function saveModelConfigToLocal(): void {
  const nextConfig = buildEditedModelConfig();
  if (!nextConfig) {
    return;
  }

  const plainConfig = buildPlainModelConfig(nextConfig);
  const payload = {
    config: plainConfig,
    updatedAt: new Date().toISOString(),
    source: "localStorage",
  };
  window.localStorage.setItem(modelConfigLocalStorageKey, JSON.stringify(payload, null, 2));
  editBaselineConfig.value = plainConfig;
  editModeMessage.value = `已保存到 localStorage：${modelConfigLocalStorageKey}`;
}

function exportModelConfigJson(): void {
  const nextConfig = buildEditedModelConfig() ?? modelConfig.value;
  if (!nextConfig) {
    return;
  }

  const plainConfig = buildPlainModelConfig(nextConfig);
  const blob = new Blob([`${JSON.stringify(plainConfig, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${plainConfig.modelId || "model-config"}.json`;
  link.click();
  URL.revokeObjectURL(url);
  editModeMessage.value = "已导出 JSON。";
}

function clearLocalModelConfig(): void {
  window.localStorage.removeItem(modelConfigLocalStorageKey);
  editModeMessage.value = "已清除本地配置，刷新页面后将按静态配置加载。";
}

function mergeStaticModelConfig(base: ModelExternalConfig, raw: Partial<ModelExternalConfig>): ModelExternalConfig {
  return {
    ...base,
    ...raw,
    transform: {
      ...base.transform,
      ...raw.transform,
      rotationDeg: {
        ...base.transform.rotationDeg,
        ...raw.transform?.rotationDeg,
      },
      position: {
        ...base.transform.position,
        ...raw.transform?.position,
      },
      scale: {
        ...base.transform.scale,
        ...raw.transform?.scale,
      },
      flip: {
        x: false,
        y: false,
        z: false,
        ...base.transform.flip,
        ...raw.transform?.flip,
      },
    },
    materialConfig: {
      preserveOriginalMaterial: raw.materialConfig?.preserveOriginalMaterial ?? base.materialConfig?.preserveOriginalMaterial ?? true,
      defaultColor: raw.materialConfig?.defaultColor ?? base.materialConfig?.defaultColor,
      defaultOpacity: raw.materialConfig?.defaultOpacity ?? base.materialConfig?.defaultOpacity,
      selectionColor: raw.materialConfig?.selectionColor ?? base.materialConfig?.selectionColor ?? modelMaterialState.value.selectionColor,
      movablePartColor: raw.materialConfig?.movablePartColor ?? base.materialConfig?.movablePartColor ?? modelMaterialState.value.movablePartColor,
      faultColor: raw.materialConfig?.faultColor ?? base.materialConfig?.faultColor ?? modelMaterialState.value.faultColor,
      objectColors: raw.materialConfig?.objectColors ?? base.materialConfig?.objectColors ?? [],
    },
    modeConfig: {
      defaultMode: raw.modeConfig?.defaultMode ?? base.modeConfig?.defaultMode ?? "monitor",
      allowEditMode: raw.modeConfig?.allowEditMode ?? base.modeConfig?.allowEditMode ?? true,
      localStorageKey: raw.modeConfig?.localStorageKey ?? base.modeConfig?.localStorageKey ?? modelConfigLocalStorageKey,
    },
  };
}

async function restoreStaticModelConfig(): Promise<void> {
  if (!modelConfig.value) {
    return;
  }

  const response = await fetch("/model-configs/lifter.json", { cache: "no-store" });
  const rawConfig = (await response.json()) as Partial<ModelExternalConfig>;
  const staticConfig = mergeStaticModelConfig(modelConfig.value, rawConfig);
  const nextConfig = twinScene.value?.applyModelConfig(staticConfig);
  if (nextConfig) {
    modelConfig.value = nextConfig;
    syncCalibrationForm(nextConfig);
    editBaselineConfig.value = buildPlainModelConfig(nextConfig);
    editModeMessage.value = "已恢复静态 lifter.json 配置预览；如需取消本地覆盖，请点击清除本地配置。";
  }
}

function resetCurrentEdit(): void {
  if (!editBaselineConfig.value) {
    return;
  }

  const nextConfig = twinScene.value?.applyModelConfig(buildPlainModelConfig(editBaselineConfig.value));
  if (nextConfig) {
    modelConfig.value = nextConfig;
    syncCalibrationForm(nextConfig);
    editModeMessage.value = "已重置当前编辑。";
  }
}

onMounted(async () => {
  if (!viewportRef.value) {
    return;
  }

  const scene = new TwinScene(viewportRef.value, {
    onLoadStateChange: (state) => {
      loadState.value = state;
    },
    onDevicesChange: (nextDevices) => {
      devices.value = nextDevices;
      if (selectedDevice.value) {
        selectedDevice.value = nextDevices.find(
          (device) => device.id === selectedDevice.value?.id,
        );
      }
    },
    onSelectDevice: (device) => {
      selectedDevice.value = device;
      if (device) {
        taskDeviceId.value = device.id;
      }
    },
    onSelectModelNode: (node) => {
      selectedObjectUuid.value = node?.uuid ?? "";
    },
    onModelTreeChange: (nodes) => {
      modelNodes.value = nodes;
      objectListMode.value = "all";
      objectSearchQuery.value = "";
      objectFilterMode.value = "all";
      objectListMessage.value = "";
      clearObjectListScope();
    },
    onBindingChange: (state) => {
      bindingState.value = state;
    },
    onTaskChange: (task) => {
      latestTask.value = task;
    },
    onModelConfigChange: (config) => {
      modelConfig.value = config;
      if (config) {
        syncCalibrationForm(config);
        if (!hasInitializedAppMode.value) {
          const initialMode = config.modeConfig?.defaultMode === "edit" ? "edit" : "monitor";
          appMode.value = initialMode;
          twinScene.value?.setAppMode(initialMode);
          hasInitializedAppMode.value = true;
          editBaselineConfig.value = buildPlainModelConfig(config);
        }
      }
    },
    onPerformanceChange: (stats) => {
      performanceStats.value = stats;
    },
    onCameraControlChange: (state) => {
      cameraControlState.value = state;
    },
    onAreaStateChange: (state) => {
      areaState.value = state;
      if (state.sceneMode === "single") {
        taskDeviceId.value = lifterBindingConfig.deviceId;
      }
    },
    onInstanceDemoChange: (state) => {
      instanceDemoState.value = state;
    },
    onFaultSimulationChange: (state) => {
      faultSimulationState.value = state;
      syncFaultCallout(state);
    },
    onFaultCalloutAnchorChange: (anchor) => {
      updateFaultCalloutAnchor(anchor);
    },
    onModelMaterialChange: (state) => {
      modelMaterialState.value = state;
    },
  });

  twinScene.value = scene;
  await scene.init();
});

onBeforeUnmount(() => {
  twinScene.value?.dispose();
});
</script>

<template>
  <main class="twin-shell">
    <header class="twin-header">
      <div>
        <p class="twin-kicker">TwinDemo</p>
        <h1>数字孪生 WebGL 技术 Demo</h1>
        <p>Vue3 + TypeScript + Three.js · Z-up</p>
      </div>
      <button class="tool-button" type="button" @click="toggleAxes">
        {{ axesVisible ? "隐藏坐标轴" : "显示坐标轴" }}
      </button>
    </header>

    <section class="twin-workbench">
      <div class="viewport-wrap" aria-label="三维数字孪生视图">
        <div ref="viewportRef" class="twin-viewport"></div>
        <div class="viewport-badge" :class="{ warning: loadState.useFallback }">
          {{
            loadState.isLoading
              ? "模型加载中"
              : !hasLoadedModel
                ? "未加载模型"
                : loadState.useFallback
                  ? "Fallback 场景"
                  : "真实 GLB"
          }}
        </div>
        <div class="fault-callout-layer" aria-live="polite">
          <svg
            v-if="isFaultCalloutVisible && faultCalloutFault"
            class="fault-callout-link"
            :viewBox="faultCalloutLayout.viewBox"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline class="fault-callout-link-line" :points="faultCalloutLayout.linePoints" />
            <circle class="fault-callout-link-dot" :cx="faultCalloutLayout.anchorX" :cy="faultCalloutLayout.anchorY" r="4" />
            <circle class="fault-callout-link-end" :cx="faultCalloutLayout.lineEndX" :cy="faultCalloutLayout.lineEndY" r="3" />
          </svg>
          <section
            v-if="isFaultCalloutVisible && faultCalloutFault"
            :class="['fault-callout', `placement-${faultCalloutLayout.placement}`]"
            :style="faultCalloutLayout.style"
            aria-label="设备异常"
          >
            <header class="fault-callout-header">
              <div>
                <p class="fault-callout-kicker">Fault</p>
                <h2>设备异常</h2>
              </div>
              <button class="fault-callout-close" type="button" aria-label="关闭异常气泡" @click="closeFaultCallout">
                ×
              </button>
            </header>

            <dl class="fault-callout-grid">
              <div>
                <dt>faultCode</dt>
                <dd>{{ faultCalloutFault.faultCode }}</dd>
              </div>
              <div>
                <dt>faultLevel</dt>
                <dd>
                  <span
                    :class="[
                      'fault-level-badge',
                      {
                        error: faultCalloutFault.faultLevel === 'error',
                        warning: faultCalloutFault.faultLevel === 'warning',
                      },
                    ]"
                  >
                    {{ faultCalloutFault.faultLevel }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>faultMessage</dt>
                <dd class="fault-callout-message">{{ faultCalloutFault.faultMessage }}</dd>
              </div>
              <div>
                <dt>partName</dt>
                <dd>{{ faultCalloutFault.partName ?? "-" }}</dd>
              </div>
              <div>
                <dt>deviceId</dt>
                <dd>{{ faultCalloutFault.deviceId || "-" }}</dd>
              </div>

              <template v-if="faultCalloutExpanded">
                <div>
                  <dt>objectName</dt>
                  <dd>{{ faultCalloutFault.objectName ?? faultCalloutFault.matchedObjectName ?? "-" }}</dd>
                </div>
                <div>
                  <dt>objectUuid</dt>
                  <dd class="fault-callout-uuid" :title="getFaultCalloutObjectUuid()">
                    {{ formatFaultCalloutUuid(getFaultCalloutObjectUuid()) }}
                  </dd>
                </div>
                <div>
                  <dt>occurTime</dt>
                  <dd>{{ faultCalloutFault.occurTime || "-" }}</dd>
                </div>
                <div>
                  <dt>suggestion</dt>
                  <dd class="fault-callout-suggestion">{{ faultCalloutFault.suggestion ?? "-" }}</dd>
                </div>
              </template>
            </dl>

            <button class="fault-callout-toggle" type="button" @click="toggleFaultCalloutDetails">
              {{ faultCalloutExpanded ? "收起" : "详情" }}
            </button>
          </section>
        </div>
      </div>

      <aside class="side-panel" aria-label="模型调试与任务下发">
        <section class="panel-section">
          <div class="section-heading">
            <span>模型加载信息</span>
          </div>
          <p class="load-message">{{ loadState.message }}</p>
          <p class="binding-message" :class="{ blocked: !bindingState.canMove }">
            {{ bindingState.message }}
          </p>
          <p v-if="bindingState.warning" class="binding-message warning">
            {{ bindingState.warning }}
          </p>
          <dl class="meta-grid">
            <div>
              <dt>当前显示级别</dt>
              <dd>{{ currentDisplayLevel }}</dd>
            </div>
            <div>
              <dt>当前模型 URL</dt>
              <dd>{{ loadState.currentUrl ?? "-" }}</dd>
            </div>
            <div>
              <dt>加载状态</dt>
              <dd>{{ loadState.status ?? "-" }}</dd>
            </div>
            <div>
              <dt>节点数</dt>
              <dd>{{ modelNodes.length }}</dd>
            </div>
          </dl>
          <div v-if="loadState.failedModels?.length" class="failed-list">
            <p>加载失败列表</p>
            <ul>
              <li v-for="item in loadState.failedModels" :key="`${item.level}-${item.url}`">
                <code>{{ item.level }}</code>
                <span>{{ item.url }}</span>
              </li>
            </ul>
          </div>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>场景模式</span>
            <span class="mesh-code">{{ areaState.sceneMode }}</span>
          </div>
          <div class="action-grid">
            <button
              class="mini-button"
              :class="{ active: areaState.sceneMode === 'single' }"
              type="button"
              :disabled="loadState.isLoading"
              @click="loadSingleDeviceDemo"
            >
              单设备详情
            </button>
            <button
              class="mini-button secondary"
              :class="{ active: areaState.sceneMode === 'area' }"
              type="button"
              :disabled="loadState.isLoading"
              @click="loadAreaDemo"
            >
              小区域压力 Demo
            </button>
          </div>
          <dl class="meta-grid">
            <div>
              <dt>areaName</dt>
              <dd>{{ areaState.areaName ?? "-" }}</dd>
            </div>
            <div>
              <dt>deviceCount</dt>
              <dd>{{ areaState.deviceCount }}</dd>
            </div>
            <div>
              <dt>modelInstance</dt>
              <dd>{{ areaState.modelInstanceCount }}</dd>
            </div>
            <div>
              <dt>selectedDevice</dt>
              <dd>{{ areaState.selectedDeviceName ?? "-" }}</dd>
            </div>
            <div>
              <dt>chunk</dt>
              <dd>{{ areaState.currentChunkId ?? "-" }}</dd>
            </div>
            <div>
              <dt>loaded chunks</dt>
              <dd>{{ areaState.loadedChunkIds?.join(", ") || "-" }}</dd>
            </div>
            <div>
              <dt>priority queue</dt>
              <dd>{{ areaState.priorityQueueSize ?? 0 }}</dd>
            </div>
            <div>
              <dt>chunk message</dt>
              <dd>{{ areaState.chunkMessage ?? "-" }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>模型性能统计</span>
            <span class="mesh-code">{{ performanceStats?.currentLevel ?? "-" }}</span>
          </div>
          <div class="filter-row">
            <button
              v-for="level in lodLevels"
              :key="level"
              class="filter-button"
              :class="{ active: performanceStats?.currentLevel === level }"
              type="button"
              :disabled="loadState.isLoading"
              @click="switchModelLevel(level)"
            >
              {{ level }}
            </button>
          </div>
          <dl class="meta-grid performance-grid">
            <div>
              <dt>scene mode</dt>
              <dd>{{ performanceStats?.sceneMode ?? areaState.sceneMode }}</dd>
            </div>
            <div>
              <dt>device count</dt>
              <dd>{{ performanceStats?.deviceCount ?? areaState.deviceCount }}</dd>
            </div>
            <div>
              <dt>model count</dt>
              <dd>{{ performanceStats?.modelInstanceCount ?? areaState.modelInstanceCount }}</dd>
            </div>
            <div>
              <dt>FPS</dt>
              <dd>{{ performanceStats ? formatNumber(performanceStats.fps) : "-" }}</dd>
            </div>
            <div>
              <dt>current level</dt>
              <dd>{{ performanceStats?.currentLevel ?? "-" }}</dd>
            </div>
            <div>
              <dt>current URL</dt>
              <dd>{{ performanceStats?.currentUrl ?? "-" }}</dd>
            </div>
            <div>
              <dt>enableLod</dt>
              <dd>{{ modelConfig?.performance ? String(modelConfig.performance.enableLod) : "-" }}</dd>
            </div>
            <div>
              <dt>defaultLevel</dt>
              <dd>{{ modelConfig?.performance?.defaultLevel ?? "-" }}</dd>
            </div>
            <div>
              <dt>cachePolicy</dt>
              <dd>{{ modelConfig?.performance?.cachePolicy ?? "-" }}</dd>
            </div>
            <div>
              <dt>chunkPolicy</dt>
              <dd>{{ modelConfig?.performance?.chunkPolicy ?? "-" }}</dd>
            </div>
            <div>
              <dt>navigation mode</dt>
              <dd>{{ cameraControlState?.navigationMode ?? "-" }}</dd>
            </div>
            <div>
              <dt>orbit controls</dt>
              <dd>{{ cameraControlState?.orbitControls ?? "-" }}</dd>
            </div>
            <div>
              <dt>zoom mode</dt>
              <dd>{{ cameraControlState?.zoomMode ?? "-" }}</dd>
            </div>
            <div>
              <dt>zoomToCursor</dt>
              <dd>{{ cameraControlState ? String(cameraControlState.zoomToCursor) : "-" }}</dd>
            </div>
            <div>
              <dt>custom wheel zoom</dt>
              <dd>{{ cameraControlState?.customWheelZoom ?? "-" }}</dd>
            </div>
            <div>
              <dt>left mouse</dt>
              <dd>{{ cameraControlState?.leftMouse ?? "-" }}</dd>
            </div>
            <div>
              <dt>right mouse</dt>
              <dd>{{ cameraControlState?.rightMouse ?? "-" }}</dd>
            </div>
            <div>
              <dt>wheel zoom focus</dt>
              <dd>{{ cameraControlState?.wheelZoomFocus ?? "-" }}</dd>
            </div>
            <div>
              <dt>target usage</dt>
              <dd>{{ cameraControlState?.controlsTargetUsage ?? "-" }}</dd>
            </div>
            <div>
              <dt>model rotation</dt>
              <dd>{{ cameraControlState?.modelSelfRotation ?? "-" }}</dd>
            </div>
            <div>
              <dt>camera.position</dt>
              <dd>{{ formatVector(cameraControlState?.cameraPosition) }}</dd>
            </div>
            <div>
              <dt>camera.forward</dt>
              <dd>{{ formatVector(cameraControlState?.cameraForward) }}</dd>
            </div>
            <div>
              <dt>camera distance</dt>
              <dd>{{ cameraControlState ? formatNumber(cameraControlState.cameraDistance) : "-" }}</dd>
            </div>
            <div>
              <dt>focus point</dt>
              <dd>{{ formatVector(cameraControlState?.controlsTarget) }}</dd>
            </div>
            <div>
              <dt>yaw / pitch</dt>
              <dd>
                {{
                  cameraControlState?.yawDeg === undefined || cameraControlState?.pitchDeg === undefined
                    ? "-"
                    : `${formatNumber(cameraControlState.yawDeg)} / ${formatNumber(cameraControlState.pitchDeg)}`
                }}
              </dd>
            </div>
            <div>
              <dt>wheel speed</dt>
              <dd>{{ cameraControlState?.wheelMoveSpeed === undefined ? "-" : formatNumber(cameraControlState.wheelMoveSpeed) }}</dd>
            </div>
            <div>
              <dt>look sensitivity</dt>
              <dd>{{ cameraControlState?.lookSensitivity === undefined ? "-" : formatNumber(cameraControlState.lookSensitivity) }}</dd>
            </div>
            <div>
              <dt>look invert X</dt>
              <dd>{{ cameraControlState?.invertLookX === undefined ? "-" : String(cameraControlState.invertLookX) }}</dd>
            </div>
            <div>
              <dt>look invert Y</dt>
              <dd>{{ cameraControlState?.invertLookY === undefined ? "-" : String(cameraControlState.invertLookY) }}</dd>
            </div>
            <div>
              <dt>keyboard move</dt>
              <dd>{{ cameraControlState?.keyboardMove ?? "-" }}</dd>
            </div>
            <div>
              <dt>keyboard mode</dt>
              <dd>{{ cameraControlState?.keyboardMoveMode ?? "-" }}</dd>
            </div>
            <div>
              <dt>keyboard active source</dt>
              <dd>{{ cameraControlState?.keyboardActiveSource ?? "-" }}</dd>
            </div>
            <div>
              <dt>pressed keys</dt>
              <dd>{{ cameraControlState?.pressedKeys?.join(", ") || "-" }}</dd>
            </div>
            <div>
              <dt>canvas active</dt>
              <dd>{{ cameraControlState?.navigationActive === undefined ? "-" : String(cameraControlState.navigationActive) }}</dd>
            </div>
            <div>
              <dt>key speed</dt>
              <dd>{{ cameraControlState?.keyMoveSpeed === undefined ? "-" : formatNumber(cameraControlState.keyMoveSpeed) }}</dd>
            </div>
            <div>
              <dt>minDistance</dt>
              <dd>{{ cameraControlState ? formatNumber(cameraControlState.minDistance) : "-" }}</dd>
            </div>
            <div>
              <dt>maxDistance</dt>
              <dd>{{ cameraControlState ? formatNumber(cameraControlState.maxDistance) : "-" }}</dd>
            </div>
            <div>
              <dt>render.calls</dt>
              <dd>{{ performanceStats?.rendererRenderCalls ?? "-" }}</dd>
            </div>
            <div>
              <dt>render.triangles</dt>
              <dd>{{ performanceStats?.rendererRenderTriangles ?? "-" }}</dd>
            </div>
            <div>
              <dt>memory.geometries</dt>
              <dd>{{ performanceStats?.rendererMemoryGeometries ?? "-" }}</dd>
            </div>
            <div>
              <dt>memory.textures</dt>
              <dd>{{ performanceStats?.rendererMemoryTextures ?? "-" }}</dd>
            </div>
            <div>
              <dt>mesh</dt>
              <dd>{{ performanceStats?.meshCount ?? "-" }}</dd>
            </div>
            <div>
              <dt>material</dt>
              <dd>{{ performanceStats?.materialCount ?? "-" }}</dd>
            </div>
            <div>
              <dt>texture</dt>
              <dd>{{ performanceStats?.textureCount ?? "-" }}</dd>
            </div>
            <div>
              <dt>vertex</dt>
              <dd>{{ performanceStats?.vertexCount ?? "-" }}</dd>
            </div>
            <div>
              <dt>triangles</dt>
              <dd>{{ performanceStats?.triangleCount ?? "-" }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>InstancedMesh Demo</span>
            <span class="mesh-code">{{ instanceDemoState.mode }}</span>
          </div>
          <div class="filter-row">
            <button
              v-for="mode in instanceModes"
              :key="mode"
              class="filter-button"
              :class="{ active: instanceDemoState.mode === mode }"
              type="button"
              @click="setInstanceDemo(mode, instanceDemoState.count)"
            >
              {{ mode === "instanced" ? "InstancedMesh" : "Mesh" }}
            </button>
          </div>
          <div class="filter-row">
            <button
              v-for="count in instanceCounts"
              :key="count"
              class="filter-button"
              :class="{ active: instanceDemoState.count === count }"
              type="button"
              @click="setInstanceDemo(instanceDemoState.mode, count)"
            >
              {{ count }}
            </button>
          </div>
          <dl class="meta-grid">
            <div>
              <dt>enabled</dt>
              <dd>{{ String(instanceDemoState.enabled) }}</dd>
            </div>
            <div>
              <dt>count</dt>
              <dd>{{ instanceDemoState.count }}</dd>
            </div>
            <div>
              <dt>object</dt>
              <dd>{{ instanceDemoState.objectType }}</dd>
            </div>
            <div>
              <dt>draw calls</dt>
              <dd>{{ instanceDemoState.drawCallHint }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>模式切换</span>
            <span class="mesh-code">{{ appMode }}</span>
          </div>
          <div class="filter-row">
            <button
              class="filter-button"
              :class="{ active: appMode === 'monitor' }"
              type="button"
              @click="setAppMode('monitor')"
            >
              监控模式
            </button>
            <button
              class="filter-button"
              :class="{ active: appMode === 'edit' }"
              type="button"
              @click="setAppMode('edit')"
            >
              编辑模式
            </button>
          </div>
          <p class="empty-note">
            {{
              appMode === "edit"
                ? "模型编辑模式：当前编辑对象是整机模型 root，不是子部件。"
                : "监控模式：保留对象选择、异常查看、可动部件绑定、任务下发和视角控制，禁止编辑整机模型配置。"
            }}
          </p>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>{{ isEditMode ? "模型编辑模式" : "模型配置摘要" }}</span>
          </div>
          <p v-if="!isEditMode" class="empty-note">
            当前为 monitor 模式，只显示配置摘要。切换到 edit 模式后才能实时预览并保存整机模型 root 配置。
          </p>
          <p v-else class="task-warning">
            编辑对象是整机模型 root；不要把子部件任务位置保存为模型配置。
          </p>
          <div class="calibration-grid">
            <label>
              <span>rotationX</span>
              <input v-model.number="calibrationForm.rotationX" type="number" step="1" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>rotationY</span>
              <input v-model.number="calibrationForm.rotationY" type="number" step="1" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>rotationZ</span>
              <input v-model.number="calibrationForm.rotationZ" type="number" step="1" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>scaleX</span>
              <input v-model.number="calibrationForm.scaleX" type="number" min="0.001" step="0.01" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>scaleY</span>
              <input v-model.number="calibrationForm.scaleY" type="number" min="0.001" step="0.01" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>scaleZ</span>
              <input v-model.number="calibrationForm.scaleZ" type="number" min="0.001" step="0.01" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>positionX</span>
              <input v-model.number="calibrationForm.positionX" type="number" step="0.1" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>positionY</span>
              <input v-model.number="calibrationForm.positionY" type="number" step="0.1" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>positionZ</span>
              <input v-model.number="calibrationForm.positionZ" type="number" step="0.1" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>defaultColor</span>
              <input v-model="calibrationForm.defaultColor" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
            <label>
              <span>defaultOpacity</span>
              <input v-model.number="calibrationForm.defaultOpacity" type="number" min="0" max="1" step="0.05" :disabled="!isEditMode" @input="applyCalibration" />
            </label>
          </div>
          <div class="calibration-switches">
            <label>
              <input v-model="calibrationForm.flipX" type="checkbox" :disabled="!isEditMode" @change="applyCalibration" />
              <span>flipX</span>
            </label>
            <label>
              <input v-model="calibrationForm.flipY" type="checkbox" :disabled="!isEditMode" @change="applyCalibration" />
              <span>flipY</span>
            </label>
            <label>
              <input v-model="calibrationForm.flipZ" type="checkbox" :disabled="!isEditMode" @change="applyCalibration" />
              <span>flipZ</span>
            </label>
            <label>
              <input v-model="calibrationForm.autoCenter" type="checkbox" :disabled="!isEditMode" @change="applyCalibration" />
              <span>autoCenter</span>
            </label>
            <label>
              <input v-model="calibrationForm.groundToZero" type="checkbox" :disabled="!isEditMode" @change="applyCalibration" />
              <span>groundToZero</span>
            </label>
            <label>
              <input v-model="calibrationForm.preserveOriginalMaterial" type="checkbox" :disabled="!isEditMode" @change="applyCalibration" />
              <span>preserveOriginalMaterial</span>
            </label>
          </div>
          <div class="action-grid">
            <button class="mini-button" type="button" :disabled="!isEditMode || !modelConfig" @click="saveModelConfigToLocal">
              保存到本地
            </button>
            <button class="mini-button secondary" type="button" :disabled="!isEditMode || !modelConfig" @click="copyModelConfigJson">
              复制 JSON
            </button>
            <button class="mini-button secondary" type="button" :disabled="!isEditMode || !modelConfig" @click="exportModelConfigJson">
              导出 JSON
            </button>
            <button class="mini-button secondary" type="button" :disabled="!isEditMode" @click="clearLocalModelConfig">
              清除本地配置
            </button>
            <button class="mini-button secondary" type="button" :disabled="!isEditMode || !modelConfig" @click="restoreStaticModelConfig">
              恢复静态配置
            </button>
            <button class="mini-button secondary" type="button" :disabled="!isEditMode || !editBaselineConfig" @click="resetCurrentEdit">
              重置当前编辑
            </button>
          </div>
          <p v-if="calibrationCopyMessage" class="copy-message">{{ calibrationCopyMessage }}</p>
          <p v-if="editModeMessage" class="empty-note">{{ editModeMessage }}</p>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>当前选中对象详情</span>
          </div>
          <dl v-if="selectedModelNode" class="meta-grid object-detail">
            <div>
              <dt>name</dt>
              <dd>{{ selectedModelNode.name }}</dd>
            </div>
            <div>
              <dt>uuid</dt>
              <dd>{{ selectedModelNode.uuid }}</dd>
            </div>
            <div>
              <dt>parentName</dt>
              <dd>{{ selectedModelNode.parentName || "-" }}</dd>
            </div>
            <div>
              <dt>type</dt>
              <dd>{{ selectedModelNode.type }}</dd>
            </div>
            <div>
              <dt>boundingBox</dt>
              <dd>{{ formatBox(selectedModelNode) }}</dd>
            </div>
            <div>
              <dt>world position</dt>
              <dd>{{ formatVector(selectedModelNode.worldPosition) }}</dd>
            </div>
            <div>
              <dt>local position</dt>
              <dd>{{ formatVector(selectedModelNode.position) }}</dd>
            </div>
            <div>
              <dt>children</dt>
              <dd>{{ selectedModelNode.childrenCount }}</dd>
            </div>
            <div>
              <dt>userData</dt>
              <dd>{{ formatUserData(selectedModelNode) }}</dd>
            </div>
          </dl>
          <p v-else class="empty-note">点击 3D 模型或对象树节点后显示对象详情。</p>
          <div class="action-grid">
            <button class="mini-button" type="button" :disabled="!selectedModelNode" @click="setSelectedAsMovable">
              设为可动部件
            </button>
            <button class="mini-button secondary" type="button" :disabled="!bindingState.currentMovableObjectName" @click="clearMovablePart">
              取消可动部件
            </button>
            <button class="mini-button secondary" type="button" :disabled="!selectedModelNode" @click="focusSelectedObject">
              聚焦当前对象
            </button>
            <button class="mini-button secondary" type="button" :disabled="!hasLoadedModel" @click="focusModel">
              聚焦整机
            </button>
            <button class="mini-button secondary" type="button" :disabled="!hasLoadedModel" @click="resetView">
              重置视角
            </button>
            <button class="mini-button secondary" type="button" :disabled="!selectedParentNode" @click="viewParentObject">
              查看父级
            </button>
            <button class="mini-button secondary" type="button" :disabled="selectedChildNodes.length === 0" @click="viewChildObjects">
              查看子级
            </button>
          </div>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>模型颜色配置</span>
            <span class="mesh-code">{{ modelMaterialState.objectColorCount }} objectColors</span>
          </div>
          <dl class="meta-grid">
            <div>
              <dt>preserveOriginalMaterial</dt>
              <dd>{{ modelMaterialState.preserveOriginalMaterial ? "true" : "false" }}</dd>
            </div>
            <div>
              <dt>defaultColor</dt>
              <dd>{{ modelMaterialState.defaultColor ?? "-" }}</dd>
            </div>
            <div>
              <dt>defaultOpacity</dt>
              <dd>{{ modelMaterialState.defaultOpacity === undefined ? "-" : modelMaterialState.defaultOpacity }}</dd>
            </div>
            <div>
              <dt>selectionColor</dt>
              <dd>{{ modelMaterialState.selectionColor }}</dd>
            </div>
            <div>
              <dt>movablePartColor</dt>
              <dd>{{ modelMaterialState.movablePartColor }}</dd>
            </div>
            <div>
              <dt>faultColor</dt>
              <dd>{{ modelMaterialState.faultColor }}</dd>
            </div>
            <div>
              <dt>objectColors</dt>
              <dd>{{ modelMaterialState.objectColorCount }}</dd>
            </div>
            <div>
              <dt>applied</dt>
              <dd>{{ modelMaterialState.appliedObjectColorCount }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>异常模拟</span>
            <span class="mesh-code">{{ faultSimulationState.enabled ? "enabled" : "disabled" }}</span>
          </div>
          <div class="action-grid">
            <button
              class="mini-button"
              type="button"
              :disabled="faultSimulationState.enabled || faultSimulationState.activeFaults.length === 0"
              @click="enableFaultSimulation"
            >
              开启异常模拟
            </button>
            <button
              class="mini-button secondary"
              type="button"
              :disabled="!faultSimulationState.enabled"
              @click="disableFaultSimulation"
            >
              关闭异常模拟
            </button>
          </div>
          <p class="binding-message" :class="{ blocked: !faultSimulationState.enabled }">
            {{ faultSimulationState.message }}
          </p>
          <dl class="meta-grid">
            <div>
              <dt>deviceId</dt>
              <dd>{{ faultSimulationState.deviceId || "-" }}</dd>
            </div>
            <div>
              <dt>faultColor</dt>
              <dd>{{ faultSimulationState.faultColor }}</dd>
            </div>
            <div>
              <dt>fault count</dt>
              <dd>{{ faultSimulationState.activeFaults.length }}</dd>
            </div>
            <div>
              <dt>当前异常部件</dt>
              <dd>{{ faultSimulationState.currentFaultObjectName ?? "当前对象无异常" }}</dd>
            </div>
          </dl>
          <dl v-if="faultSimulationState.selectedFault" class="meta-grid object-detail">
            <div>
              <dt>faultCode</dt>
              <dd>{{ faultSimulationState.selectedFault.faultCode }}</dd>
            </div>
            <div>
              <dt>faultLevel</dt>
              <dd>{{ faultSimulationState.selectedFault.faultLevel }}</dd>
            </div>
            <div>
              <dt>faultMessage</dt>
              <dd>{{ faultSimulationState.selectedFault.faultMessage }}</dd>
            </div>
            <div>
              <dt>partName</dt>
              <dd>{{ faultSimulationState.selectedFault.partName ?? "-" }}</dd>
            </div>
            <div>
              <dt>objectName</dt>
              <dd>{{ faultSimulationState.selectedFault.objectName ?? "-" }}</dd>
            </div>
            <div>
              <dt>objectUuid</dt>
              <dd>{{ faultSimulationState.selectedFault.objectUuid || faultSimulationState.selectedFault.matchedObjectUuid || "-" }}</dd>
            </div>
            <div>
              <dt>deviceId</dt>
              <dd>{{ faultSimulationState.deviceId || "-" }}</dd>
            </div>
            <div>
              <dt>occurTime</dt>
              <dd>{{ faultSimulationState.selectedFault.occurTime || "-" }}</dd>
            </div>
            <div>
              <dt>suggestion</dt>
              <dd>{{ faultSimulationState.selectedFault.suggestion ?? "-" }}</dd>
            </div>
          </dl>
          <p v-else class="empty-note">当前对象无异常。</p>
          <ul class="legend-list">
            <li v-for="fault in faultSimulationState.activeFaults" :key="fault.faultCode">
              <span :class="['legend-dot', fault.matched ? 'error' : 'stopped']"></span>
              <span>{{ fault.partName || fault.objectName || fault.faultCode }}</span>
              <code>{{ fault.matchMessage }}</code>
            </li>
          </ul>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>当前可动部件</span>
          </div>
          <p class="current-movable" :class="{ blocked: !bindingState.canMove }">
            {{
              bindingState.currentMovableObjectName
                ? `当前可动部件：${bindingState.currentMovableObjectName}`
                : "未绑定可动部件，请从对象树或 3D 模型中选择疑似箱体 / 轿厢 / 载货台对象。"
            }}
          </p>
          <dl class="meta-grid">
            <div>
              <dt>name</dt>
              <dd>{{ bindingState.currentMovableObjectName ?? "-" }}</dd>
            </div>
            <div>
              <dt>uuid</dt>
              <dd>{{ bindingState.currentMovableObjectUuid ?? "-" }}</dd>
            </div>
            <div>
              <dt>boundingBox</dt>
              <dd>{{ formatBoxFromState() }}</dd>
            </div>
            <div>
              <dt>初始位置</dt>
              <dd>{{ formatVector(bindingState.initialPosition) }}</dd>
            </div>
            <div>
              <dt>local position</dt>
              <dd>{{ formatVector(bindingState.localPosition) }}</dd>
            </div>
            <div>
              <dt>world position</dt>
              <dd>{{ formatVector(bindingState.worldPosition) }}</dd>
            </div>
            <div>
              <dt>move mode</dt>
              <dd>{{ bindingState.moveMode ?? "-" }}</dd>
            </div>
            <div>
              <dt>baseWorldZ</dt>
              <dd>{{ bindingState.baseWorldZ === undefined ? "-" : formatNumber(bindingState.baseWorldZ) }}</dd>
            </div>
            <div>
              <dt>currentWorldZ</dt>
              <dd>{{ bindingState.currentWorldZ === undefined ? "-" : formatNumber(bindingState.currentWorldZ) }}</dd>
            </div>
            <div>
              <dt>targetWorldZ</dt>
              <dd>{{ bindingState.targetWorldZ === undefined ? "-" : formatNumber(bindingState.targetWorldZ) }}</dd>
            </div>
            <div>
              <dt>clampedTargetWorldZ</dt>
              <dd>{{ bindingState.clampedTargetWorldZ === undefined ? "-" : formatNumber(bindingState.clampedTargetWorldZ) }}</dd>
            </div>
            <div>
              <dt>startWorldZ</dt>
              <dd>{{ bindingState.startWorldZ === undefined ? "-" : formatNumber(bindingState.startWorldZ) }}</dd>
            </div>
            <div>
              <dt>modelMinZ</dt>
              <dd>{{ bindingState.modelMinZ === undefined ? "-" : formatNumber(bindingState.modelMinZ) }}</dd>
            </div>
            <div>
              <dt>modelMaxZ</dt>
              <dd>{{ bindingState.modelMaxZ === undefined ? "-" : formatNumber(bindingState.modelMaxZ) }}</dd>
            </div>
            <div>
              <dt>movableHeight</dt>
              <dd>{{ bindingState.movableHeight === undefined ? "-" : formatNumber(bindingState.movableHeight) }}</dd>
            </div>
            <div>
              <dt>minAllowedWorldZ</dt>
              <dd>{{ bindingState.minAllowedWorldZ === undefined ? "-" : formatNumber(bindingState.minAllowedWorldZ) }}</dd>
            </div>
            <div>
              <dt>maxAllowedWorldZ</dt>
              <dd>{{ bindingState.maxAllowedWorldZ === undefined ? "-" : formatNumber(bindingState.maxAllowedWorldZ) }}</dd>
            </div>
            <div>
              <dt>move basis</dt>
              <dd>{{ bindingState.moveBasis ?? "-" }}</dd>
            </div>
            <div>
              <dt>target clamped</dt>
              <dd>{{ bindingState.targetClamped === undefined ? "-" : bindingState.targetClamped ? "true" : "false" }}</dd>
            </div>
            <div>
              <dt>当前 Z</dt>
              <dd>{{ bindingState.currentZ === undefined ? "-" : formatNumber(bindingState.currentZ) }}</dd>
            </div>
            <div>
              <dt>绑定来源</dt>
              <dd>{{ bindingState.bindingSource }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>移动测试工具</span>
          </div>
          <ol class="test-steps">
            <li>点击模型中疑似箱体 / 轿厢 / 载货台区域。</li>
            <li>查看右侧对象详情，定位到该对象。</li>
            <li>设为可动部件后点击测试上移 1m。</li>
            <li>如果移动对象不正确，取消后重新选择。</li>
            <li>找到正确对象后再用 F1 / F2 / F3 / F4 下发任务。</li>
          </ol>
          <div class="action-grid">
            <button class="mini-button" type="button" :disabled="!canTestMove" @click="testMove(1)">
              测试上移 1m
            </button>
            <button class="mini-button" type="button" :disabled="!canTestMove" @click="testMove(-1)">
              测试下移 1m
            </button>
            <button class="mini-button secondary" type="button" :disabled="!canTestMove" @click="resetMovablePart">
              重置可动部件位置
            </button>
            <button class="mini-button secondary" type="button" :disabled="!bindingState.currentMovableObjectUuid" @click="focusMovablePart">
              定位到当前可动部件
            </button>
          </div>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>提升机任务下发</span>
          </div>
          <form class="task-form" @submit.prevent="dispatchTask">
            <label>
              <span>设备编号</span>
              <input v-model="taskDeviceId" readonly />
            </label>
            <label>
              <span>目标位置</span>
              <select v-model="selectedTargetCode">
                <option
                  v-for="target in lifterTargetPositions"
                  :key="target.code"
                  :value="target.code"
                >
                  {{ target.label }} · z={{ target.z }}
                </option>
              </select>
            </label>
            <label>
              <span>移动速度</span>
              <select v-model="selectedSpeed">
                <option v-for="speed in taskSpeeds" :key="speed" :value="speed">
                  {{ speedLabels[speed] }}
                </option>
              </select>
            </label>
            <button class="submit-button" type="submit" :disabled="!canDispatchTask">
              下发任务
            </button>
          </form>

          <p v-if="!bindingState.canMove" class="task-warning">
            {{
              hasLoadedModel
                ? bindingState.currentMovableObjectUuid
                  ? bindingState.message
                  : "请先选择并设置可动部件。"
                : "未加载真实模型，无法执行提升机移动任务。"
            }}
          </p>
          <p v-else-if="isEditMode" class="task-warning">
            编辑模式下不建议执行任务，请切回监控模式后下发。
          </p>

          <dl v-if="latestTask" class="meta-grid task-detail">
            <div>
              <dt>taskId</dt>
              <dd>{{ latestTask.taskId }}</dd>
            </div>
            <div>
              <dt>target</dt>
              <dd>{{ latestTask.targetPositionCode }} · z={{ latestTask.targetZ }}</dd>
            </div>
            <div>
              <dt>objectName</dt>
              <dd>{{ latestTask.movableObjectName ?? "-" }}</dd>
            </div>
            <div>
              <dt>objectUuid</dt>
              <dd>{{ latestTask.movableObjectUuid ?? "-" }}</dd>
            </div>
            <div>
              <dt>currentZ</dt>
              <dd>{{ latestTask.currentZ === undefined ? "-" : formatNumber(latestTask.currentZ) }}</dd>
            </div>
            <div>
              <dt>currentWorldZ</dt>
              <dd>{{ latestTask.currentWorldZ === undefined ? "-" : formatNumber(latestTask.currentWorldZ) }}</dd>
            </div>
            <div>
              <dt>startWorldZ</dt>
              <dd>{{ latestTask.startWorldZ === undefined ? "-" : formatNumber(latestTask.startWorldZ) }}</dd>
            </div>
            <div>
              <dt>targetWorldZ</dt>
              <dd>{{ latestTask.targetWorldZ === undefined ? "-" : formatNumber(latestTask.targetWorldZ) }}</dd>
            </div>
            <div>
              <dt>clampedTargetWorldZ</dt>
              <dd>{{ latestTask.clampedTargetWorldZ === undefined ? "-" : formatNumber(latestTask.clampedTargetWorldZ) }}</dd>
            </div>
            <div>
              <dt>allowedWorldZ</dt>
              <dd>
                {{
                  latestTask.minAllowedWorldZ === undefined || latestTask.maxAllowedWorldZ === undefined
                    ? "-"
                    : `${formatNumber(latestTask.minAllowedWorldZ)} ~ ${formatNumber(latestTask.maxAllowedWorldZ)}`
                }}
              </dd>
            </div>
            <div>
              <dt>target clamped</dt>
              <dd>{{ latestTask.targetClamped === undefined ? "-" : latestTask.targetClamped ? "true" : "false" }}</dd>
            </div>
            <div>
              <dt>status</dt>
              <dd>{{ latestTask.status }}</dd>
            </div>
            <div>
              <dt>message</dt>
              <dd>{{ latestTask.message ?? "-" }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>状态图例</span>
          </div>
          <ul class="legend-list">
            <li v-for="status in statusOrder" :key="status">
              <span :class="['legend-dot', statusClassNames[status]]"></span>
              <span>{{ statusLabels[status] }}</span>
              <code>{{ status }}</code>
            </li>
          </ul>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>对象搜索</span>
            <span class="mesh-code">{{ filteredModelNodes.length }}/{{ modelNodes.length }}</span>
          </div>
          <label class="tree-search">
            <span>搜索 name / parentName / uuid</span>
            <input
              v-model="objectSearchQuery"
              placeholder="搜索 name / parentName / uuid"
              @input="handleObjectSearchInput"
            />
          </label>
          <div class="filter-row">
            <button
              v-for="filter in filterOptions"
              :key="filter.value"
              class="filter-button"
              :class="{ active: (objectListMode !== 'children' && objectFilterMode === filter.value) || (filter.value === 'children' && objectListMode === 'children') }"
              type="button"
              @click="applyObjectFilter(filter.value)"
            >
              {{ filter.label }}
            </button>
          </div>
          <p class="empty-note">
            mode={{ objectListModeLabel }}
            <template v-if="objectListMode === 'children'">
              · parent={{ currentListParentName || currentListParentUuid }} · children={{ childrenScopeNodes.length }}
            </template>
          </p>
          <p v-if="objectListMessage" class="task-warning">
            {{ objectListMessage }}
          </p>
          <p v-if="isResultLimited" class="task-warning">
            搜索结果超过 100 条，当前只显示前 100 条，请缩小搜索条件。
          </p>
        </section>

        <section class="panel-section model-tree-section">
          <div class="section-heading">
            <span>对象树列表</span>
            <span class="mesh-code">{{ visibleModelNodes.length }}/{{ filteredModelNodes.length }} shown</span>
          </div>
          <div class="model-tree">
            <button
              v-for="node in visibleModelNodes"
              :key="node.uuid"
              class="model-node"
              :class="{
                active: selectedObjectUuid === node.uuid,
                movable: bindingState.currentMovableObjectUuid === node.uuid,
              }"
              type="button"
              :style="{ paddingLeft: `${10 + Math.min(node.depth, 6) * 12}px` }"
              @click="selectModelNode(node)"
            >
              <span class="model-node-name">{{ node.name }}</span>
              <span class="model-node-meta">
                {{ node.type }} · parent={{ node.parentName || "-" }} · {{ formatBox(node) }}
              </span>
            </button>
          </div>
        </section>

        <details class="panel-section device-list-section">
          <summary>Mock 设备列表</summary>
          <div v-if="activeDevice" class="device-detail">
            <div>
              <span>设备编号</span>
              <strong>{{ activeDevice.id }}</strong>
            </div>
            <div>
              <span>设备名称</span>
              <strong>{{ activeDevice.name }}</strong>
            </div>
            <div>
              <span>当前状态</span>
              <strong :class="['status-text', statusClassNames[activeDevice.status]]">
                {{ statusLabels[activeDevice.status] }}
              </strong>
            </div>
          </div>
          <div class="device-list">
            <button
              v-for="device in devices"
              :key="device.id"
              class="device-row"
              :class="{ active: activeDevice?.id === device.id }"
              type="button"
              @click="selectDevice(device)"
            >
              <span :class="['legend-dot', statusClassNames[device.status]]"></span>
              <span class="device-row-main">
                <strong>{{ device.name }}</strong>
                <small>{{ device.id }}</small>
              </span>
              <span class="device-row-status">{{ statusLabels[device.status] }}</span>
            </button>
          </div>
        </details>
      </aside>
    </section>

  </main>
</template>
