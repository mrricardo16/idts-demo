<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { lifterBindingConfig, lifterTargetPositions } from "../config/lifterBindingConfig";
import { TwinScene } from "../engine/TwinScene";
import { statusClassNames, statusLabels } from "../mock/deviceStatus";
import type {
  AreaRuntimeState,
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

const viewportRef = ref<HTMLElement | null>(null);
const twinScene = ref<TwinScene | null>(null);
const devices = ref<TwinDevice[]>([]);
const selectedDevice = ref<TwinDevice | undefined>();
const axesVisible = ref(false);
const modelNodes = ref<ModelObjectNode[]>([]);
const selectedObjectUuid = ref("");
const objectSearchQuery = ref("");
const objectFilterMode = ref<ObjectFilterMode>("all");
const latestTask = ref<LifterTask | undefined>();
const taskDeviceId = ref<string>(lifterBindingConfig.deviceId);
const selectedTargetCode = ref(lifterTargetPositions[0]?.code ?? "F1");
const selectedSpeed = ref<TaskSpeed>("normal");
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
  scale: 1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  autoCenter: true,
  groundToZero: true,
});
const calibrationCopyMessage = ref("");
const performanceStats = ref<ModelPerformanceStats | undefined>();
const cameraControlState = ref<CameraControlDebugState | undefined>();
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
const canDispatchTask = computed(() => bindingState.value.canMove && !isTaskRunning.value);
const canTestMove = computed(() => bindingState.value.canMove && !isTaskRunning.value);
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
const filteredModelNodes = computed(() => {
  const keyword = objectSearchQuery.value.trim().toLowerCase();
  let nodes = modelNodes.value;

  if (keyword) {
    nodes = nodes.filter((node) => {
      const searchable = `${node.name} ${node.originalName} ${node.parentName} ${node.uuid}`.toLowerCase();
      return searchable.includes(keyword);
    });
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

function getMaxBoxSize(node: ModelObjectNode): number {
  if (!node.boundingBox) {
    return 0;
  }

  const size = node.boundingBox.size;
  return Math.max(size.x, size.y, size.z);
}

function selectDevice(device: TwinDevice): void {
  selectedDevice.value = device;
  twinScene.value?.selectDevice(device.meshName);
}

function selectModelNode(node: ModelObjectNode): void {
  selectedObjectUuid.value = node.uuid;
  twinScene.value?.selectModelObject(node.uuid);
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
  if (!selectedParentNode.value) {
    return;
  }

  objectFilterMode.value = "siblings";
  selectModelNode(selectedParentNode.value);
}

function viewChildObjects(): void {
  objectFilterMode.value = "children";
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
    scale: config.transform.scale.x,
    positionX: config.transform.position.x,
    positionY: config.transform.position.y,
    positionZ: config.transform.position.z,
    autoCenter: config.transform.autoCenter,
    groundToZero: config.transform.groundToZero,
  };
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function buildCalibrationTransform(): ModelTransformSettings {
  const scale = finiteNumber(calibrationForm.value.scale, 1);
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
      x: scale,
      y: scale,
      z: scale,
    },
    autoCenter: calibrationForm.value.autoCenter,
    groundToZero: calibrationForm.value.groundToZero,
  };
}

function applyCalibration(): void {
  const nextConfig = twinScene.value?.applyModelTransform(buildCalibrationTransform());
  if (nextConfig) {
    modelConfig.value = nextConfig;
    calibrationCopyMessage.value = "";
  }
}

async function copyModelConfigJson(): Promise<void> {
  if (!modelConfig.value) {
    return;
  }

  const nextConfig: ModelExternalConfig = {
    ...modelConfig.value,
    transform: buildCalibrationTransform(),
  };
  const json = `${JSON.stringify(nextConfig, null, 2)}\n`;
  await navigator.clipboard.writeText(json);
  calibrationCopyMessage.value = "已复制，可粘贴到 public/model-configs/lifter.json";
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
            <span>模型校准</span>
          </div>
          <div class="calibration-grid">
            <label>
              <span>rotationX</span>
              <input v-model.number="calibrationForm.rotationX" type="number" step="1" @input="applyCalibration" />
            </label>
            <label>
              <span>rotationY</span>
              <input v-model.number="calibrationForm.rotationY" type="number" step="1" @input="applyCalibration" />
            </label>
            <label>
              <span>rotationZ</span>
              <input v-model.number="calibrationForm.rotationZ" type="number" step="1" @input="applyCalibration" />
            </label>
            <label>
              <span>scale</span>
              <input v-model.number="calibrationForm.scale" type="number" min="0.001" step="0.01" @input="applyCalibration" />
            </label>
            <label>
              <span>positionX</span>
              <input v-model.number="calibrationForm.positionX" type="number" step="0.1" @input="applyCalibration" />
            </label>
            <label>
              <span>positionY</span>
              <input v-model.number="calibrationForm.positionY" type="number" step="0.1" @input="applyCalibration" />
            </label>
            <label>
              <span>positionZ</span>
              <input v-model.number="calibrationForm.positionZ" type="number" step="0.1" @input="applyCalibration" />
            </label>
          </div>
          <div class="calibration-switches">
            <label>
              <input v-model="calibrationForm.autoCenter" type="checkbox" @change="applyCalibration" />
              <span>autoCenter</span>
            </label>
            <label>
              <input v-model="calibrationForm.groundToZero" type="checkbox" @change="applyCalibration" />
              <span>groundToZero</span>
            </label>
          </div>
          <div class="action-grid">
            <button class="mini-button" type="button" :disabled="!modelConfig" @click="applyCalibration">
              应用
            </button>
            <button class="mini-button secondary" type="button" :disabled="!modelConfig" @click="copyModelConfigJson">
              复制 JSON
            </button>
          </div>
          <p v-if="calibrationCopyMessage" class="copy-message">{{ calibrationCopyMessage }}</p>
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
                ? "未绑定可动部件时不能下发任务。"
                : "未加载真实模型，无法执行提升机移动任务。"
            }}
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
              <dt>targetWorldZ</dt>
              <dd>{{ latestTask.targetWorldZ === undefined ? "-" : formatNumber(latestTask.targetWorldZ) }}</dd>
            </div>
            <div>
              <dt>status</dt>
              <dd>{{ latestTask.status }}</dd>
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
            <input v-model="objectSearchQuery" placeholder="搜索 name / parentName / uuid" />
          </label>
          <div class="filter-row">
            <button
              v-for="filter in filterOptions"
              :key="filter.value"
              class="filter-button"
              :class="{ active: objectFilterMode === filter.value }"
              type="button"
              @click="objectFilterMode = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
          <p v-if="isResultLimited" class="task-warning">
            搜索结果超过 100 条，当前只显示前 100 条，请缩小搜索条件。
          </p>
        </section>

        <section class="panel-section model-tree-section">
          <div class="section-heading">
            <span>对象树列表</span>
            <span class="mesh-code">{{ visibleModelNodes.length }} shown</span>
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
