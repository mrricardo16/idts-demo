import {
  Box3,
  Box3Helper,
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  MathUtils,
  Vector3,
  type Object3D,
} from "three";
import { AnimationManager } from "./AnimationManager";
import { CameraManager } from "./CameraManager";
import { ChunkLoader } from "./ChunkLoader";
import { ControlsManager } from "./ControlsManager";
import { FaultSimulationManager, type FaultSimulationState } from "./FaultSimulationManager";
import { HitBoxManager } from "./HitBoxManager";
import { InstancedDemoManager } from "./InstancedDemoManager";
import { InteractionManager, type InteractionPointerInfo } from "./InteractionManager";
import { LODModelLoader, type LODLoadedModel } from "./LODModelLoader";
import { ModelLoadQueue } from "./ModelLoadQueue";
import { ModelMaterialManager, type ModelMaterialState } from "./ModelMaterialManager";
import { collectModelObjectTree, logModelObjectTree } from "./ModelStructure";
import { logModelPerformanceStats } from "./ModelStats";
import { ModelTransformApplier } from "./ModelTransformApplier";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { RendererManager } from "./RendererManager";
import { ResourceDisposer } from "./ResourceDisposer";
import { SceneManager } from "./SceneManager";
import { StatusManager } from "./StatusManager";
import { debugConfig } from "../config/debugConfig";
import { lifterBindingConfig, taskSpeedUnitsPerSecond } from "../config/lifterBindingConfig";
import { createAreaDemoConfigFromChunk, defaultAreaChunkId, mockAreaChunks } from "../mock/areaChunks";
import { createAreaTwinDevices, smallAreaDemoConfig } from "../mock/areaDemo";
import type {
  AreaChunkConfig,
  AreaDeviceConfig,
  AreaDemoConfig,
  AreaRuntimeState,
  InstanceDemoCount,
  InstanceDemoMode,
  InstanceDemoState,
  LifterBindingState,
  LifterTask,
  LifterTaskRequest,
  ModelExternalConfig,
  CameraControlDebugState,
  ModelLODLevel,
  ModelLoadState,
  ModelObjectNode,
  ModelPerformanceStats,
  ModelTransformSettings,
  TwinSceneMode,
  TwinDevice,
} from "../types/twin";

interface TwinSceneCallbacks {
  onLoadStateChange: (state: ModelLoadState) => void;
  onDevicesChange: (devices: TwinDevice[]) => void;
  onSelectDevice: (device: TwinDevice | undefined) => void;
  onSelectModelNode: (node: ModelObjectNode | undefined) => void;
  onModelTreeChange: (nodes: ModelObjectNode[]) => void;
  onBindingChange: (state: LifterBindingState) => void;
  onTaskChange: (task: LifterTask | undefined) => void;
  onModelConfigChange: (config: ModelExternalConfig | undefined) => void;
  onPerformanceChange: (stats: ModelPerformanceStats | undefined) => void;
  onCameraControlChange: (state: CameraControlDebugState) => void;
  onAreaStateChange: (state: AreaRuntimeState) => void;
  onInstanceDemoChange: (state: InstanceDemoState) => void;
  onFaultSimulationChange: (state: FaultSimulationState) => void;
  onModelMaterialChange: (state: ModelMaterialState) => void;
}

interface ModelWorldBounds {
  minZ: number;
  maxZ: number;
  height: number;
}

interface MovableWorldZLimits {
  minAllowedWorldZ: number;
  maxAllowedWorldZ: number;
  movableHeight: number;
  modelMinZ: number;
  modelMaxZ: number;
  originToMinZ: number;
  originToMaxZ: number;
}

export class TwinScene {
  private readonly sceneManager: SceneManager;
  private readonly cameraManager: CameraManager;
  private readonly rendererManager: RendererManager;
  private readonly controlsManager: ControlsManager;
  private readonly modelLoader = new LODModelLoader();
  private readonly statusManager = new StatusManager();
  private readonly animationManager = new AnimationManager();
  private readonly transformApplier = new ModelTransformApplier();
  private readonly modelMaterialManager = new ModelMaterialManager();
  private readonly faultSimulationManager = new FaultSimulationManager();
  private readonly hitBoxManager = new HitBoxManager();
  private readonly instancedDemoManager = new InstancedDemoManager();
  private readonly performanceMonitor = new PerformanceMonitor();
  private readonly areaLoadQueue = new ModelLoadQueue(1);
  private readonly chunkLoader = new ChunkLoader(mockAreaChunks);
  private interactionManager?: InteractionManager;
  private modelRoot?: Group;
  private activeDetailRoot?: Group;
  private modelConfig?: ModelExternalConfig;
  private modelNodes: ModelObjectNode[] = [];
  private modelWorldBounds?: ModelWorldBounds;
  private movableWorldZLimits?: MovableWorldZLimits;
  private currentDevices: TwinDevice[] = [];
  private movablePart?: Object3D;
  private movableBaseWorldPosition?: Vector3;
  private activeTask?: LifterTask;
  private bindingState: LifterBindingState = {
    deviceId: lifterBindingConfig.deviceId,
    movablePartName: lifterBindingConfig.movablePartName,
    moveAxis: lifterBindingConfig.moveAxis,
    canMove: false,
    bindingSource: "none",
    message: "等待模型加载完成后进行绑定检查。",
  };
  private animationFrameId = 0;
  private statusTimerId = 0;
  private performanceTimerId = 0;
  private selectedMeshName = "";
  private selectedModelUuid = "";
  private loadedUseFallback = false;
  private selectedHelper?: Box3Helper;
  private movableHelper?: Box3Helper;
  private moveHelperLine?: Line;
  private isDisposed = false;
  private shouldLogGlbStats = false;
  private currentLODLevel: ModelLODLevel = "source";
  private currentModelUrl?: string;
  private sceneMode: TwinSceneMode = "single";
  private currentAreaConfig: AreaDemoConfig = smallAreaDemoConfig;
  private areaState: AreaRuntimeState = {
    sceneMode: "single",
    deviceCount: 1,
    modelInstanceCount: 1,
  };

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: TwinSceneCallbacks,
  ) {
    this.sceneManager = new SceneManager(this.requestRender);
    this.cameraManager = new CameraManager(container);
    this.rendererManager = new RendererManager(container);
    this.controlsManager = new ControlsManager(
      this.cameraManager.camera,
      this.rendererManager.renderer.domElement,
      this.requestRender,
    );
    window.addEventListener("resize", this.handleResize);
  }

  async init(): Promise<void> {
    this.sceneMode = "single";
    this.callbacks.onInstanceDemoChange(this.instancedDemoManager.setDemo(this.sceneManager.scene, {
      mode: "instanced",
      count: 100,
    }));
    this.currentDevices = this.statusManager.getDevices();
    this.callbacks.onDevicesChange(this.currentDevices);
    this.callbacks.onAreaStateChange(this.updateAreaState({
      sceneMode: "single",
      deviceCount: this.currentDevices.length,
      modelInstanceCount: this.modelRoot ? 1 : 0,
    }));
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());
    this.callbacks.onLoadStateChange({
      isLoading: true,
      useFallback: false,
      message: "正在加载 LOD 模型",
      status: "loading",
    });

    const loaded = await this.modelLoader.loadDefault(this.currentDevices);
    if (this.isDisposed) {
      return;
    }

    if (!loaded.root) {
      this.handleModelLoadFailure(loaded);
    } else {
      this.installLoadedModel(loaded);
    }

    this.callbacks.onLoadStateChange({
      isLoading: false,
      useFallback: loaded.useFallback,
      message: loaded.message,
      status: loaded.root ? "loaded" : "failed",
      currentLevel: loaded.root ? loaded.level : undefined,
      currentUrl: loaded.url,
      failedModels: loaded.failedModels,
    });

    this.startStatusUpdates();
    this.startPerformanceUpdates();
    this.requestRender();
  }

  async switchModelLevel(level: ModelLODLevel): Promise<void> {
    if (this.isDisposed || this.activeTask?.status === "running") {
      return;
    }

    if (this.sceneMode === "area") {
      await this.loadAreaDemo([level]);
      return;
    }

    this.callbacks.onLoadStateChange({
      isLoading: true,
      useFallback: this.loadedUseFallback,
      message: `正在切换到 ${level} 模型`,
      status: "loading",
      currentLevel: this.currentLODLevel,
    });

    const loaded = await this.modelLoader.loadLevel(
      level,
      this.statusManager.getDevices(),
      this.modelRoot,
    );
    if (this.isDisposed) {
      return;
    }

    if (!loaded.root) {
      this.callbacks.onLoadStateChange({
        isLoading: false,
        useFallback: this.loadedUseFallback,
        message: loaded.message,
        status: "failed",
        currentLevel: this.currentLODLevel,
        currentUrl: this.currentModelUrl,
        failedModels: loaded.failedModels,
      });
      return;
    }

    this.installLoadedModel(loaded);
    this.callbacks.onLoadStateChange({
      isLoading: false,
      useFallback: loaded.useFallback,
      message: loaded.message,
      status: "loaded",
      currentLevel: loaded.level,
      currentUrl: loaded.url,
      failedModels: loaded.failedModels,
    });
    this.requestRender();
  }

  async loadSingleDeviceDemo(): Promise<void> {
    if (this.isDisposed || this.activeTask?.status === "running") {
      return;
    }

    this.sceneMode = "single";
    this.currentDevices = this.statusManager.getDevices();
    this.callbacks.onDevicesChange(this.currentDevices);
    this.callbacks.onAreaStateChange(this.updateAreaState({
      sceneMode: "single",
      areaId: undefined,
      areaName: undefined,
      deviceCount: this.currentDevices.length,
      modelInstanceCount: 1,
      selectedDeviceId: undefined,
      selectedDeviceName: undefined,
    }));
    this.callbacks.onLoadStateChange({
      isLoading: true,
      useFallback: false,
      message: "正在加载单设备模型",
      status: "loading",
      currentLevel: this.currentLODLevel,
    });

    const loaded = await this.modelLoader.loadDefault(this.currentDevices);
    if (this.isDisposed) {
      return;
    }

    if (!loaded.root) {
      this.callbacks.onLoadStateChange({
        isLoading: false,
        useFallback: this.loadedUseFallback,
        message: loaded.message,
        status: "failed",
        currentLevel: this.currentLODLevel,
        currentUrl: this.currentModelUrl,
        failedModels: loaded.failedModels,
      });
      return;
    }

    this.installLoadedModel(loaded);
    this.callbacks.onLoadStateChange({
      isLoading: false,
      useFallback: loaded.useFallback,
      message: loaded.message,
      status: "loaded",
      currentLevel: loaded.level,
      currentUrl: loaded.url,
      failedModels: loaded.failedModels,
    });
    this.requestRender();
  }

  async loadAreaDemo(levels: ModelLODLevel[] = ["medium", "low", "source"]): Promise<void> {
    if (this.isDisposed || this.activeTask?.status === "running") {
      return;
    }

    const requestedLevel = levels[0] ?? "source";
    let chunk: AreaChunkConfig;
    try {
      chunk = this.chunkLoader.beginLoad(defaultAreaChunkId, requestedLevel);
    } catch (error) {
      this.callbacks.onAreaStateChange(this.updateAreaState({
        ...this.areaState,
        sceneMode: "area",
        chunkMessage: error instanceof Error ? error.message : "区域 chunk 配置错误",
      }));
      return;
    }

    const areaConfig = createAreaDemoConfigFromChunk(chunk);
    const areaDevices = createAreaTwinDevices(areaConfig);
    const loadingChunkState = this.chunkLoader.getState();
    this.callbacks.onAreaStateChange(this.updateAreaState({
      sceneMode: "area",
      areaId: areaConfig.areaId,
      areaName: areaConfig.areaName,
      campusId: chunk.campusId,
      buildingId: chunk.buildingId,
      floorId: chunk.floorId,
      currentChunkId: chunk.chunkId,
      stableChunkId: loadingChunkState.stableChunkId,
      loadedChunkIds: loadingChunkState.loadedChunkIds,
      chunkMessage: loadingChunkState.message,
      priorityQueueSize: loadingChunkState.queue.length,
      deviceCount: areaDevices.length,
      modelInstanceCount: 0,
      selectedDeviceId: undefined,
      selectedDeviceName: undefined,
    }));
    this.callbacks.onLoadStateChange({
      isLoading: true,
      useFallback: false,
      message: `正在加载小区域 Demo：${smallAreaDemoConfig.areaName}`,
      status: "loading",
      currentLevel: this.currentLODLevel,
    });

    const loaded = await this.modelLoader.loadPreferredLevels(
      levels,
      this.statusManager.getDevices(),
      this.modelRoot,
    );
    if (this.isDisposed) {
      return;
    }

    if (!loaded.root) {
      const failedChunkState = this.chunkLoader.failLoad(chunk.chunkId, loaded.message);
      this.callbacks.onAreaStateChange(this.updateAreaState({
        ...this.areaState,
        currentChunkId: failedChunkState.currentChunkId,
        stableChunkId: failedChunkState.stableChunkId,
        loadedChunkIds: failedChunkState.loadedChunkIds,
        chunkMessage: failedChunkState.message,
        priorityQueueSize: failedChunkState.queue.length,
      }));
      this.callbacks.onLoadStateChange({
        isLoading: false,
        useFallback: this.loadedUseFallback,
        message: loaded.message,
        status: "failed",
        currentLevel: this.currentLODLevel,
        currentUrl: this.currentModelUrl,
        failedModels: loaded.failedModels,
      });
      return;
    }

    const areaRoot = await this.createAreaRoot(loaded.root, areaConfig);
    if (this.isDisposed) {
      ResourceDisposer.disposeObject3D(areaRoot);
      return;
    }

    this.currentDevices = areaDevices;
    this.callbacks.onDevicesChange(areaDevices);
    const loadedChunkState = this.chunkLoader.commitLoaded(chunk.chunkId);
    this.installAreaModel({
      ...loaded,
      root: areaRoot,
      message: `已加载小区域 Demo：${smallAreaDemoConfig.areaName}，${areaDevices.length} 台设备，当前级别 ${loaded.level}`,
    }, areaConfig, chunk, loadedChunkState);
    this.callbacks.onLoadStateChange({
      isLoading: false,
      useFallback: false,
      message: `已加载小区域 Demo：${smallAreaDemoConfig.areaName}，${areaDevices.length} 台设备，当前级别 ${loaded.level}`,
      status: "loaded",
      currentLevel: loaded.level,
      currentUrl: loaded.url,
      failedModels: loaded.failedModels,
    });
    this.requestRender();
  }

  setAxesVisible(visible: boolean): void {
    this.sceneManager.setAxesVisible(visible);
  }

  setInstanceDemo(mode: InstanceDemoMode, count: InstanceDemoCount): InstanceDemoState {
    const state = this.instancedDemoManager.setDemo(this.sceneManager.scene, { mode, count });
    this.callbacks.onInstanceDemoChange(state);
    this.callbacks.onPerformanceChange(this.getPerformanceStats());
    this.requestRender();
    return state;
  }

  private async createAreaRoot(templateRoot: Group, areaConfig = smallAreaDemoConfig): Promise<Group> {
    const areaRoot = new Group();
    areaRoot.name = areaConfig.areaId;
    areaRoot.userData = {
      areaId: areaConfig.areaId,
      areaName: areaConfig.areaName,
      sceneMode: "area",
    };

    const tasks = areaConfig.devices.map((device, index) => async () => {
      const deviceRoot = new Group();
      deviceRoot.name = device.deviceId;
      deviceRoot.position.set(device.position.x, device.position.y, device.position.z);
      deviceRoot.rotation.set(
        MathUtils.degToRad(device.rotationDeg.x),
        MathUtils.degToRad(device.rotationDeg.y),
        MathUtils.degToRad(device.rotationDeg.z),
      );
      deviceRoot.scale.set(device.scale.x, device.scale.y, device.scale.z);
      deviceRoot.userData = this.createAreaDeviceUserData(device, areaConfig);

      const modelInstance = index === 0 ? templateRoot : (templateRoot.clone(true) as Group);
      modelInstance.name = `${device.deviceId}-model`;
      modelInstance.userData = {
        ...modelInstance.userData,
        ...this.createAreaDeviceUserData(device, areaConfig),
      };
      modelInstance.traverse((object) => {
        object.userData = {
          ...object.userData,
          ...this.createAreaDeviceUserData(device, areaConfig),
        };
      });
      deviceRoot.add(modelInstance);
      areaRoot.add(deviceRoot);
      return deviceRoot;
    });

    await this.areaLoadQueue.run(tasks);
    return areaRoot;
  }

  private createAreaDeviceUserData(device: AreaDeviceConfig, areaConfig: AreaDemoConfig): Record<string, string | boolean> {
    return {
      sceneMode: "area",
      areaId: areaConfig.areaId,
      areaName: areaConfig.areaName,
      areaDeviceId: device.deviceId,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.modelId,
      meshName: device.deviceId,
      modelId: device.modelId,
      isAreaDevice: true,
    };
  }

  private installAreaModel(
    loaded: LODLoadedModel,
    areaConfig: AreaDemoConfig = smallAreaDemoConfig,
    chunk?: AreaChunkConfig,
    chunkState = this.chunkLoader.getState(),
  ): void {
    if (!loaded.root) {
      return;
    }

    this.interactionManager?.clear();
    this.hitBoxManager.clear();
    this.instancedDemoManager.clear();
    this.removeSelectionHelper();
    this.removeMovableHelpers();
    this.movablePart = undefined;
    this.movableBaseWorldPosition = undefined;
    this.movableWorldZLimits = undefined;
    this.activeTask = undefined;
    this.callbacks.onTaskChange(undefined);
    this.faultSimulationManager.dispose();
    this.modelMaterialManager.dispose();

    if (this.modelRoot) {
      this.sceneManager.scene.remove(this.modelRoot);
      ResourceDisposer.disposeObject3D(this.modelRoot);
    }

    this.sceneMode = "area";
    this.loadedUseFallback = false;
    this.shouldLogGlbStats = false;
    this.currentLODLevel = loaded.level;
    this.currentModelUrl = loaded.url;
    this.modelRoot = loaded.root;
    this.updateModelWorldBounds(loaded.root);
    this.currentAreaConfig = areaConfig;
    this.activeDetailRoot = undefined;
    this.modelConfig = loaded.config;
    this.modelNodes = [];
    this.selectedModelUuid = "";
    this.selectedMeshName = "";
    this.performanceMonitor.setModel(loaded.root, loaded.level, loaded.url, {
      sceneMode: "area",
      deviceCount: areaConfig.devices.length,
      modelInstanceCount: areaConfig.devices.length,
    });
    this.sceneManager.scene.add(loaded.root);
    for (const deviceConfig of areaConfig.devices) {
      const deviceRoot = loaded.root.children.find((child) => child.userData.areaDeviceId === deviceConfig.deviceId);
      if (!deviceRoot) {
        continue;
      }

      const hitBox = this.hitBoxManager.createAreaDeviceHitBox(deviceRoot, deviceConfig);
      if (hitBox) {
        this.sceneManager.scene.add(hitBox);
      }
    }
    this.adaptCameraControlsToModel(loaded.root);
    this.callbacks.onAreaStateChange(this.updateAreaState({
      sceneMode: "area",
      areaId: areaConfig.areaId,
      areaName: areaConfig.areaName,
      campusId: chunk?.campusId,
      buildingId: chunk?.buildingId,
      floorId: chunk?.floorId,
      currentChunkId: chunkState.currentChunkId,
      stableChunkId: chunkState.stableChunkId,
      loadedChunkIds: chunkState.loadedChunkIds,
      chunkMessage: chunkState.message,
      priorityQueueSize: chunkState.queue.length,
      deviceCount: areaConfig.devices.length,
      modelInstanceCount: areaConfig.devices.length,
      selectedDeviceId: undefined,
      selectedDeviceName: undefined,
    }));
    this.callbacks.onModelTreeChange([]);
    this.callbacks.onSelectModelNode(undefined);
    this.callbacks.onModelMaterialChange(
      this.modelMaterialManager.apply(loaded.root, loaded.config),
    );
    this.callbacks.onFaultSimulationChange(
      this.faultSimulationManager.configure(loaded.root, loaded.config),
    );
    this.updateBindingState(
      this.createUnboundState("小区域 Demo 已加载。请先点击某台设备，再展开该设备内部对象树并手动选择可动部件。"),
    );
    this.callbacks.onModelConfigChange(loaded.config);
    this.callbacks.onPerformanceChange(this.getPerformanceStats());
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());

    this.interactionManager = new InteractionManager(
      this.rendererManager.renderer.domElement,
      this.cameraManager.camera,
      loaded.root,
      this.handleSelect,
      this.hitBoxManager.getHitBoxes(),
      "hitbox",
      this.handleAreaScreenPick,
    );
  }

  private installLoadedModel(loaded: LODLoadedModel): void {
    if (!loaded.root) {
      return;
    }

    const previousSelectedNode = this.selectedModelUuid ? this.findNodeByUuid(this.selectedModelUuid) : undefined;
    const previousSelectedName = previousSelectedNode?.originalName || previousSelectedNode?.name || "";
    const previousMovableName = this.bindingState.currentMovableObjectName ?? "";

    this.interactionManager?.clear();
    this.hitBoxManager.clear();
    this.removeSelectionHelper();
    this.removeMovableHelpers();
    this.movablePart = undefined;
    this.movableBaseWorldPosition = undefined;
    this.movableWorldZLimits = undefined;
    this.activeTask = undefined;
    this.callbacks.onTaskChange(undefined);
    this.faultSimulationManager.dispose();
    this.modelMaterialManager.dispose();

    if (this.modelRoot) {
      this.sceneManager.scene.remove(this.modelRoot);
      ResourceDisposer.disposeObject3D(this.modelRoot);
    }

    this.shouldLogGlbStats = !loaded.useFallback;
    this.sceneMode = "single";
    this.loadedUseFallback = loaded.useFallback;
    this.currentLODLevel = loaded.level;
    this.currentModelUrl = loaded.url;
    this.modelRoot = loaded.root;
    this.activeDetailRoot = loaded.root;
    this.updateModelWorldBounds(loaded.root);
    this.modelConfig = loaded.config;
    this.currentDevices = this.statusManager.getDevices();
    this.callbacks.onDevicesChange(this.currentDevices);
    this.callbacks.onAreaStateChange(this.updateAreaState({
      sceneMode: "single",
      areaId: undefined,
      areaName: undefined,
      deviceCount: this.currentDevices.length,
      modelInstanceCount: loaded.root ? 1 : 0,
      selectedDeviceId: undefined,
      selectedDeviceName: undefined,
    }));
    this.performanceMonitor.setModel(loaded.root, loaded.level, loaded.url, {
      sceneMode: "single",
      deviceCount: this.currentDevices.length,
      modelInstanceCount: 1,
    });
    this.sceneManager.scene.add(loaded.root);
    this.adaptCameraControlsToModel(loaded.root);
    this.applyMockStatusColors();
    this.callbacks.onModelMaterialChange(
      this.modelMaterialManager.apply(loaded.root, loaded.config),
    );

    const hitBox = this.hitBoxManager.createHitBox(loaded.root, loaded.config);
    if (hitBox) {
      this.sceneManager.scene.add(hitBox);
    }

    const modelTree = collectModelObjectTree(loaded.root);
    this.modelNodes = modelTree;
    const restoredSelectedNode = previousSelectedName
      ? modelTree.find((node) => node.originalName === previousSelectedName || node.name === previousSelectedName)
      : undefined;
    this.selectedModelUuid = restoredSelectedNode?.uuid ?? "";
    this.selectedMeshName = restoredSelectedNode?.name ?? "";
    let bindingState = this.createBindingState(loaded.root);
    if (previousMovableName && !bindingState.canMove) {
      bindingState = this.updateBindingState(
        this.createUnboundState(
          `模型级别已切换，原可动部件 ${previousMovableName} 未在新模型中自动恢复。请在 3D 模型或对象树中重新选择可动部件。`,
        ),
      );
    }
    logModelObjectTree(modelTree);
    this.callbacks.onModelTreeChange(modelTree);
    this.callbacks.onSelectModelNode(restoredSelectedNode);
    this.callbacks.onFaultSimulationChange(
      this.faultSimulationManager.configure(loaded.root, loaded.config),
    );
    this.callbacks.onBindingChange(bindingState);
    this.callbacks.onModelConfigChange(loaded.config);
    this.callbacks.onPerformanceChange(this.getPerformanceStats());
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());
    this.updateSelectionHelper(
      restoredSelectedNode ? loaded.root.getObjectByProperty("uuid", restoredSelectedNode.uuid) : undefined,
    );
    this.callbacks.onFaultSimulationChange(
      this.faultSimulationManager.refreshSelection(
        restoredSelectedNode ? loaded.root.getObjectByProperty("uuid", restoredSelectedNode.uuid) : undefined,
      ),
    );

    this.interactionManager = new InteractionManager(
      this.rendererManager.renderer.domElement,
      this.cameraManager.camera,
      loaded.root,
      this.handleSelect,
    );
  }

  private handleModelLoadFailure(loaded: LODLoadedModel): void {
    this.loadedUseFallback = false;
    this.modelRoot = undefined;
    this.activeDetailRoot = undefined;
    this.modelWorldBounds = undefined;
    this.modelConfig = loaded.config;
    this.currentLODLevel = loaded.level;
    this.currentModelUrl = undefined;
    this.performanceMonitor.clearModel();
    this.modelNodes = [];
    this.movablePart = undefined;
    this.movableBaseWorldPosition = undefined;
    this.movableWorldZLimits = undefined;
    this.activeTask = undefined;
    this.callbacks.onTaskChange(undefined);
    this.faultSimulationManager.dispose();
    this.modelMaterialManager.dispose();
    this.callbacks.onModelTreeChange([]);
    this.callbacks.onSelectModelNode(undefined);
    this.callbacks.onFaultSimulationChange(this.faultSimulationManager.getState());
    this.callbacks.onModelMaterialChange(this.modelMaterialManager.getState());
    this.callbacks.onAreaStateChange(this.updateAreaState({
      sceneMode: this.sceneMode,
      areaId: this.sceneMode === "area" ? smallAreaDemoConfig.areaId : undefined,
      areaName: this.sceneMode === "area" ? smallAreaDemoConfig.areaName : undefined,
      deviceCount: 0,
      modelInstanceCount: 0,
      selectedDeviceId: undefined,
      selectedDeviceName: undefined,
    }));
    this.callbacks.onBindingChange(
      this.createUnboundState("未加载真实模型，无法执行提升机移动任务。"),
    );
    this.callbacks.onModelConfigChange(loaded.config);
    this.callbacks.onPerformanceChange(undefined);
  }

  applyModelTransform(transform: ModelTransformSettings): ModelExternalConfig | undefined {
    if (!this.modelRoot || !this.modelConfig) {
      return undefined;
    }

    return this.applyModelConfig({
      ...this.modelConfig,
      transform,
    });
  }

  applyModelConfig(config: ModelExternalConfig): ModelExternalConfig | undefined {
    if (!this.modelRoot || !this.modelConfig) {
      return undefined;
    }

    const wasFaultEnabled = this.faultSimulationManager.getState().enabled;
    if (wasFaultEnabled) {
      this.faultSimulationManager.disable();
    }

    this.modelConfig = config;
    this.transformApplier.apply(this.modelRoot, config.transform);
    this.adaptCameraControlsToModel(this.modelRoot);
    this.updateModelWorldBounds(this.modelRoot);
    if (this.movablePart && this.bindingState.currentMovableObjectUuid) {
      this.movableWorldZLimits = this.createMovableWorldZLimits(this.movablePart);
    }
    this.refreshHitBox();
    this.refreshModelTree();
    this.callbacks.onModelMaterialChange(this.modelMaterialManager.apply(this.modelRoot, this.modelConfig));
    this.callbacks.onFaultSimulationChange(
      this.faultSimulationManager.configure(this.modelRoot, this.modelConfig),
    );
    if (wasFaultEnabled) {
      this.callbacks.onFaultSimulationChange(this.faultSimulationManager.enable());
    }
    this.updateSelectionHelper(
      this.selectedModelUuid
        ? this.modelRoot.getObjectByProperty("uuid", this.selectedModelUuid)
        : undefined,
    );
    this.updateMovableHelper();
    this.callbacks.onModelConfigChange(this.modelConfig);
    this.callbacks.onPerformanceChange(this.getPerformanceStats());
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());
    this.requestRender();
    return this.modelConfig;
  }

  selectDevice(meshName: string): void {
    if (this.sceneMode === "area") {
      this.selectAreaDevice(meshName);
      return;
    }

    this.selectedMeshName = meshName;
    this.interactionManager?.select(meshName);
    this.callbacks.onSelectDevice(this.statusManager.getByMeshName(meshName));
    this.requestRender();
  }

  private selectAreaDevice(deviceId: string, clickedObject?: Object3D): void {
    if (!this.modelRoot) {
      return;
    }

    const device = this.currentDevices.find((item) => item.id === deviceId);
    const deviceRoot = this.modelRoot.children.find((child) => child.userData.areaDeviceId === deviceId);
    const detailRoot = (deviceRoot?.children[0] ?? deviceRoot) as Group | undefined;
    if (!device || !deviceRoot || !detailRoot) {
      return;
    }

    this.activeDetailRoot = detailRoot;
    this.modelNodes = collectModelObjectTree(detailRoot);
    const clickedNode =
      clickedObject && clickedObject.userData.areaDeviceId === deviceId
        ? this.modelNodes.find((node) => node.uuid === clickedObject.uuid)
        : undefined;
    this.selectedModelUuid = clickedNode?.uuid ?? "";
    this.selectedMeshName = deviceId;
    this.removeSelectionHelper();
    this.updateSelectionHelper(clickedObject ?? deviceRoot);
    this.callbacks.onFaultSimulationChange(this.faultSimulationManager.refreshSelection(clickedObject ?? deviceRoot));
    this.removeMovableHelpers();
    this.movablePart = undefined;
    this.movableBaseWorldPosition = undefined;
    this.movableWorldZLimits = undefined;
    this.callbacks.onDevicesChange(this.currentDevices);
    this.callbacks.onSelectDevice(device);
    this.callbacks.onModelTreeChange(this.modelNodes);
    this.callbacks.onSelectModelNode(clickedNode);
    this.callbacks.onAreaStateChange(this.updateAreaState({
      sceneMode: "area",
      areaId: this.currentAreaConfig.areaId,
      areaName: this.currentAreaConfig.areaName,
      campusId: this.areaState.campusId,
      buildingId: this.areaState.buildingId,
      floorId: this.areaState.floorId,
      currentChunkId: this.areaState.currentChunkId,
      stableChunkId: this.areaState.stableChunkId,
      loadedChunkIds: this.areaState.loadedChunkIds,
      chunkMessage: this.areaState.chunkMessage,
      priorityQueueSize: this.areaState.priorityQueueSize,
      deviceCount: this.currentDevices.length,
      modelInstanceCount: this.currentDevices.length,
      selectedDeviceId: device.id,
      selectedDeviceName: device.name,
    }));
    this.updateBindingState(
      this.createUnboundState(`已选中 ${device.name}。请在对象树或 3D 模型中选择该设备内部对象，并点击设为可动部件。`),
    );
    this.interactionManager?.setHitTestRoots([detailRoot]);
    this.interactionManager?.setPickMode("mesh");
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());
    this.callbacks.onPerformanceChange(this.getPerformanceStats());
    this.requestRender();
  }

  selectModelObject(uuid: string): void {
    this.selectedModelUuid = uuid;
    const node = this.findNodeByUuid(uuid);
    const object = this.findSceneObjectByUuid(uuid);
    if (object?.userData.isHitBox) {
      return;
    }
    this.callbacks.onSelectModelNode(node);
    this.updateSelectionHelper(object);
    this.callbacks.onFaultSimulationChange(this.faultSimulationManager.refreshSelection(object));
    this.requestRender();
  }

  getModelObjectChildren(uuid: string): ModelObjectNode[] | undefined {
    const object = this.findSceneObjectByUuid(uuid);
    if (!object) {
      return undefined;
    }

    return object.children
      .map((child) => this.findNodeByUuid(child.uuid))
      .filter((node): node is ModelObjectNode => Boolean(node));
  }

  getModelObjectParent(uuid: string): ModelObjectNode | undefined {
    const object = this.findSceneObjectByUuid(uuid);
    return object?.parent ? this.findNodeByUuid(object.parent.uuid) : undefined;
  }

  focusModelObject(uuid: string): void {
    const object = this.modelRoot?.getObjectByProperty("uuid", uuid);
    if (!object) {
      return;
    }

    this.controlsManager.focusObject(object);
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());
    this.requestRender();
  }

  focusModel(): void {
    if (!this.modelRoot) {
      return;
    }

    this.controlsManager.focusModel(this.modelRoot);
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());
    this.requestRender();
  }

  resetView(): void {
    this.controlsManager.resetView();
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());
    this.requestRender();
  }

  setMovablePartFromNode(node: ModelObjectNode): LifterBindingState {
    if (!this.modelRoot) {
      return this.updateBindingState(this.createUnboundState("模型尚未加载完成，不能设置可动部件。"));
    }

    const object = this.modelRoot.getObjectByProperty("uuid", node.uuid);
    if (!object) {
      return this.updateBindingState(this.createUnboundState("未在场景中找到该对象，不能设置为可动部件。"));
    }

    const protectionReason = this.getMovableProtectionReason(node);
    if (protectionReason) {
      return this.updateBindingState({
        ...this.bindingState,
        message: protectionReason,
        warning: protectionReason,
      });
    }

    const state = this.bindMovableObject(
      object,
      node,
      "manual",
      `当前可动部件：${node.name}`,
    );
    this.requestRender();
    return state;
  }

  clearMovablePart(): LifterBindingState {
    this.movablePart = undefined;
    this.movableBaseWorldPosition = undefined;
    this.movableWorldZLimits = undefined;
    this.removeMovableHelpers();
    return this.updateBindingState(
      this.createUnboundState("当前真实 GLB 未找到 lifter-platform。请在 3D 模型或对象树中手动选择疑似箱体 / 轿厢 / 载货台对象，并点击设为可动部件。"),
    );
  }

  enableFaultSimulation(): FaultSimulationState {
    const state = this.faultSimulationManager.enable();
    this.callbacks.onFaultSimulationChange(state);
    this.requestRender();
    return state;
  }

  disableFaultSimulation(): FaultSimulationState {
    const state = this.faultSimulationManager.disable();
    this.callbacks.onFaultSimulationChange(state);
    this.requestRender();
    return state;
  }

  moveCurrentMovableBy(deltaZ: number): LifterBindingState | undefined {
    if (!this.movablePart || !this.bindingState.canMove) {
      return undefined;
    }

    const targetWorldPosition = this.getObjectWorldPosition(this.movablePart);
    targetWorldPosition.z += deltaZ;
    this.moveMovableToWorldPosition(targetWorldPosition, "测试移动中", "测试移动完成");
    return this.bindingState;
  }

  resetMovablePartPosition(): LifterBindingState | undefined {
    if (!this.movablePart || !this.movableBaseWorldPosition || !this.bindingState.canMove) {
      return undefined;
    }

    this.moveMovableToWorldPosition(this.movableBaseWorldPosition.clone(), "正在重置可动部件位置", "已重置到绑定时位置");
    return this.bindingState;
  }

  dispatchLifterTask(request: LifterTaskRequest): LifterTask {
    const task = this.createTask(request);

    const limits = this.getMovableWorldZLimits();
    const canMoveSafely = this.bindingState.canMove && this.hasValidMovableWorldZLimits(limits);

    if (!this.movablePart || !this.modelRoot || !canMoveSafely) {
      const failedTask: LifterTask = {
        ...task,
        status: "failed",
        finishTime: this.createTime(),
        message: !this.modelRoot
          ? "未加载真实模型，无法执行提升机移动任务。"
          : !this.movablePart
            ? "请先选择并设置可动部件。"
            : !this.modelWorldBounds
              ? "未获取整机模型边界，无法执行安全移动。"
              : this.bindingState.message,
      };
      this.activeTask = failedTask;
      this.callbacks.onTaskChange(failedTask);
      return failedTask;
    }

    const targetOffsetZ = Math.min(
      lifterBindingConfig.maxZ,
      Math.max(lifterBindingConfig.minZ, request.targetZ),
    );
    const currentWorldPosition = this.getObjectWorldPosition(this.movablePart);
    const requestedTargetWorldPosition = currentWorldPosition.clone();
    requestedTargetWorldPosition.z = limits.modelMinZ + targetOffsetZ + limits.originToMinZ;
    const clampedTarget = this.clampTargetWorldPosition(requestedTargetWorldPosition);
    const targetWorldPosition = clampedTarget.targetWorldPosition;
    const taskMessage = this.createSafetyMoveMessage(
      `任务执行中：正在移动 ${this.bindingState.currentMovableObjectName}`,
      clampedTarget.targetClamped,
    );
    const runningTask: LifterTask = {
      ...task,
      movableObjectName: this.bindingState.currentMovableObjectName,
      movableObjectUuid: this.bindingState.currentMovableObjectUuid,
      targetZ: targetOffsetZ,
      status: "running",
      currentZ: currentWorldPosition.z,
      startWorldZ: currentWorldPosition.z,
      currentWorldZ: currentWorldPosition.z,
      targetWorldZ: requestedTargetWorldPosition.z,
      clampedTargetWorldZ: targetWorldPosition.z,
      modelMinZ: limits.modelMinZ,
      modelMaxZ: limits.modelMaxZ,
      movableHeight: limits.movableHeight,
      minAllowedWorldZ: limits.minAllowedWorldZ,
      maxAllowedWorldZ: limits.maxAllowedWorldZ,
      targetClamped: clampedTarget.targetClamped,
      moveBasis: "current world position",
      message: taskMessage,
    };

    this.activeTask = runningTask;
    this.callbacks.onTaskChange(runningTask);
    this.updateDeviceStatus(request.deviceId, "running", true);
    this.updateMoveHelperLine(targetWorldPosition);

    this.animationManager.moveObjectToWorldPosition({
      object: this.movablePart,
      targetWorldPosition,
      unitsPerSecond: taskSpeedUnitsPerSecond[request.speed],
      minWorldZ: limits.minAllowedWorldZ,
      maxWorldZ: limits.maxAllowedWorldZ,
      onUpdate: (currentWorld) => {
        if (!this.activeTask) {
          return;
        }

        this.activeTask = {
          ...this.activeTask,
          currentZ: currentWorld.z,
          currentWorldZ: currentWorld.z,
          clampedTargetWorldZ: targetWorldPosition.z,
        };
        this.updateBindingWorldState(currentWorld, targetWorldPosition, taskMessage, {
          startWorldZ: currentWorldPosition.z,
          requestedTargetWorldZ: requestedTargetWorldPosition.z,
          targetClamped: clampedTarget.targetClamped,
        });
        this.updateMovableHelper();
        this.callbacks.onTaskChange(this.activeTask);
      },
      onComplete: () => {
        if (!this.activeTask) {
          return;
        }

        this.activeTask = {
          ...this.activeTask,
          status: "completed",
          finishTime: this.createTime(),
          currentZ: targetWorldPosition.z,
          currentWorldZ: targetWorldPosition.z,
          clampedTargetWorldZ: targetWorldPosition.z,
          message: this.createSafetyMoveMessage("已到达目标位置", clampedTarget.targetClamped),
        };
        this.callbacks.onTaskChange(this.activeTask);
        this.updateDeviceStatus(request.deviceId, "arrived", false);
        this.updateBindingWorldState(targetWorldPosition, targetWorldPosition, this.activeTask.message, {
          startWorldZ: currentWorldPosition.z,
          requestedTargetWorldZ: requestedTargetWorldPosition.z,
          targetClamped: clampedTarget.targetClamped,
        });
        this.updateMovableHelper();
        this.clearMoveHelperLine();
      },
    });

    this.requestRender();
    return runningTask;
  }

  dispose(): void {
    this.isDisposed = true;
    window.removeEventListener("resize", this.handleResize);
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    window.clearInterval(this.statusTimerId);
    window.clearInterval(this.performanceTimerId);
    this.interactionManager?.clear();
    this.faultSimulationManager.dispose();
    this.modelMaterialManager.dispose();
    this.hitBoxManager.clear();
    this.removeSelectionHelper();
    this.removeMovableHelpers();
    if (this.modelRoot) {
      ResourceDisposer.disposeObject3D(this.modelRoot, { removeFromParent: true });
      this.modelRoot = undefined;
    }
    this.activeDetailRoot = undefined;
    this.performanceMonitor.clearModel();
    this.controlsManager.dispose();
    this.sceneManager.dispose();
    this.rendererManager.dispose();
  }

  private readonly handleResize = (): void => {
    this.cameraManager.resize(this.container);
    this.rendererManager.resize(this.container);
    this.requestRender();
  };

  private adaptCameraControlsToModel(root: Object3D): void {
    const box = new Box3().setFromObject(root);
    if (box.isEmpty()) {
      return;
    }

    const size = new Vector3();
    box.getSize(size);
    const maxSize = Math.max(size.x, size.y, size.z);
    if (maxSize <= 0) {
      return;
    }

    this.cameraManager.adaptClippingToModel(maxSize);
    this.controlsManager.focusModel(root);
  }

  private refreshHitBox(): void {
    if (!this.modelRoot || !this.modelConfig) {
      return;
    }

    this.hitBoxManager.clear();
    const hitBox = this.hitBoxManager.createHitBox(this.modelRoot, this.modelConfig);
    if (hitBox) {
      this.sceneManager.scene.add(hitBox);
      this.interactionManager?.setHitTestRoots([this.modelRoot]);
    }
  }

  private getPerformanceStats(): ModelPerformanceStats | undefined {
    return this.performanceMonitor.getStats(this.rendererManager.renderer);
  }

  private readonly handleSelect = (uuid: string): void => {
    const object = this.findSceneObjectByUuid(uuid);
    if (this.sceneMode === "area") {
      const areaDeviceId = String(object?.userData.areaDeviceId || object?.userData.deviceId || "");
      if (object?.userData.isHitBox && areaDeviceId) {
        this.selectAreaDevice(areaDeviceId, object);
        return;
      }

      if (object && areaDeviceId) {
        if (!this.activeDetailRoot || !this.activeDetailRoot.getObjectByProperty("uuid", object.uuid)) {
          this.selectAreaDevice(areaDeviceId, object);
          return;
        }
        this.selectAreaModelObject(object);
      }
      return;
    }

    const node = this.findNodeByUuid(uuid);
    this.selectedModelUuid = uuid;
    this.selectedMeshName = String(object?.userData.meshName || object?.name || "");
    this.callbacks.onSelectDevice(
      this.selectedMeshName ? this.statusManager.getByMeshName(this.selectedMeshName) : undefined,
    );
    this.callbacks.onSelectModelNode(node);
    this.updateSelectionHelper(object);
    this.callbacks.onFaultSimulationChange(this.faultSimulationManager.refreshSelection(object));
    this.requestRender();
  };

  private selectAreaModelObject(object: Object3D): void {
    if (object.userData.isHitBox) {
      return;
    }

    const node = this.findNodeByUuid(object.uuid);
    this.selectedModelUuid = object.uuid;
    this.selectedMeshName = String(object.userData.areaDeviceId || object.userData.meshName || object.name || "");
    this.callbacks.onSelectModelNode(node);
    this.updateSelectionHelper(object);
    this.callbacks.onFaultSimulationChange(this.faultSimulationManager.refreshSelection(object));
    this.requestRender();
  }

  private readonly handleAreaScreenPick = (pointer: InteractionPointerInfo): void => {
    if (this.sceneMode !== "area" || !this.modelRoot || this.activeDetailRoot) {
      return;
    }

    const match = this.findAreaDeviceByScreenPoint(pointer);
    if (match) {
      this.selectAreaDevice(match.deviceId, match.object);
    }
  };

  private findAreaDeviceByScreenPoint(pointer: InteractionPointerInfo): { deviceId: string; object: Object3D } | undefined {
    let best:
      | {
          deviceId: string;
          object: Object3D;
          distance: number;
        }
      | undefined;

    for (const object of this.modelRoot?.children ?? []) {
      const deviceId = String(object.userData.areaDeviceId || object.userData.deviceId || "");
      if (!deviceId) {
        continue;
      }

      const rect = this.projectObjectBoxToScreen(object, pointer.canvasWidth, pointer.canvasHeight);
      if (!rect) {
        continue;
      }

      const padding = 18;
      const minX = rect.minX - padding;
      const maxX = rect.maxX + padding;
      const minY = rect.minY - padding;
      const maxY = rect.maxY + padding;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const distance = Math.hypot(pointer.canvasX - centerX, pointer.canvasY - centerY);
      const isInside =
        pointer.canvasX >= minX &&
        pointer.canvasX <= maxX &&
        pointer.canvasY >= minY &&
        pointer.canvasY <= maxY;

      if (isInside && (!best || distance < best.distance)) {
        best = { deviceId, object, distance };
      }
    }

    return best;
  }

  private projectObjectBoxToScreen(
    object: Object3D,
    canvasWidth: number,
    canvasHeight: number,
  ): { minX: number; maxX: number; minY: number; maxY: number } | undefined {
    const box = new Box3().setFromObject(object);
    if (box.isEmpty()) {
      return undefined;
    }

    const points = [
      new Vector3(box.min.x, box.min.y, box.min.z),
      new Vector3(box.min.x, box.min.y, box.max.z),
      new Vector3(box.min.x, box.max.y, box.min.z),
      new Vector3(box.min.x, box.max.y, box.max.z),
      new Vector3(box.max.x, box.min.y, box.min.z),
      new Vector3(box.max.x, box.min.y, box.max.z),
      new Vector3(box.max.x, box.max.y, box.min.z),
      new Vector3(box.max.x, box.max.y, box.max.z),
    ];

    const screenPoints = points.map((point) => {
      const projected = point.project(this.cameraManager.camera);
      return {
        x: ((projected.x + 1) / 2) * canvasWidth,
        y: ((1 - projected.y) / 2) * canvasHeight,
      };
    });

    return {
      minX: Math.min(...screenPoints.map((point) => point.x)),
      maxX: Math.max(...screenPoints.map((point) => point.x)),
      minY: Math.min(...screenPoints.map((point) => point.y)),
      maxY: Math.max(...screenPoints.map((point) => point.y)),
    };
  }

  private createBindingState(root: Group): LifterBindingState {
    const movablePartName = this.getConfiguredMovablePartName();
    const semanticObject = root.getObjectByName(movablePartName);
    const semanticNode = semanticObject ? this.findNodeByUuid(semanticObject.uuid) : undefined;
    if (semanticObject && semanticNode && !this.getMovableProtectionReason(semanticNode)) {
      return this.bindMovableObject(
        semanticObject,
        semanticNode,
        "semantic",
        `已绑定 ${movablePartName}，可执行内部升降动画。`,
      );
    }

    for (const candidateName of lifterBindingConfig.candidateMovablePartNames) {
      const candidateObject = root.getObjectByName(candidateName);
      const candidateNode = candidateObject ? this.findNodeByUuid(candidateObject.uuid) : undefined;
      if (!candidateObject || !candidateNode || this.getMovableProtectionReason(candidateNode)) {
        continue;
      }

      return this.bindMovableObject(
        candidateObject,
        candidateNode,
        "candidate",
        `未找到 lifter-platform，已使用候选对象 ${candidateName} 作为可动部件，请人工确认该对象是否为提升平台。`,
        `当前真实 GLB 没有业务命名 lifter-platform，系统暂时使用 ${candidateName} 作为候选可动部件。请在页面中下发任务观察其移动效果，如果移动对象不是提升平台，则需要在对象树中重新选择，或使用 Blender/CAD 对模型拆分命名。`,
      );
    }

    return this.updateBindingState(
      this.createUnboundState(`当前真实 GLB 未找到 ${movablePartName}。请在 3D 模型或对象树中手动选择疑似箱体 / 轿厢 / 载货台对象，并点击设为可动部件。`),
    );
  }

  private bindMovableObject(
    object: Object3D,
    node: ModelObjectNode,
    bindingSource: LifterBindingState["bindingSource"],
    message: string,
    warning?: string,
  ): LifterBindingState {
    this.movablePart = object;
    this.movableBaseWorldPosition = this.getObjectWorldPosition(object);
    this.movableWorldZLimits = this.createMovableWorldZLimits(object);
    const worldPosition = this.getObjectWorldPosition(object);
    const box = new Box3().setFromObject(object);
    const boundingBox = box.isEmpty() ? null : this.findNodeByUuid(node.uuid)?.boundingBox ?? null;
    const hasModelBounds = Boolean(this.modelWorldBounds);
    const hasValidLimits = this.hasValidMovableWorldZLimits(this.movableWorldZLimits);
    const movableExceedsModel =
      Boolean(this.movableWorldZLimits && this.modelWorldBounds) &&
      this.movableWorldZLimits!.movableHeight > this.modelWorldBounds!.height;
    const canMoveSafely = hasModelBounds && hasValidLimits && !movableExceedsModel;
    const safetyMessage = !hasModelBounds
      ? "未获取整机模型边界，无法执行安全移动。"
      : movableExceedsModel
        ? "可动部件高度超过整机模型高度，无法安全移动。"
        : !hasValidLimits
          ? "可动部件安全移动范围无效，无法执行安全移动。"
          : message;
    this.updateMovableHelper();
    return this.updateBindingState({
      deviceId: lifterBindingConfig.deviceId,
      movablePartName: this.getConfiguredMovablePartName(),
      currentMovableObjectName: node.name,
      currentMovableObjectUuid: node.uuid,
      currentZ: worldPosition.z,
      initialPosition: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z,
      },
      localPosition: this.toVectorSnapshot(object.position),
      worldPosition: this.toVectorSnapshot(worldPosition),
      baseWorldPosition: this.toVectorSnapshot(this.movableBaseWorldPosition),
      baseWorldZ: this.movableBaseWorldPosition.z,
      startWorldZ: worldPosition.z,
      currentWorldZ: worldPosition.z,
      clampedTargetWorldZ: worldPosition.z,
      modelMinZ: this.movableWorldZLimits?.modelMinZ,
      modelMaxZ: this.movableWorldZLimits?.modelMaxZ,
      movableHeight: this.movableWorldZLimits?.movableHeight,
      minAllowedWorldZ: this.movableWorldZLimits?.minAllowedWorldZ,
      maxAllowedWorldZ: this.movableWorldZLimits?.maxAllowedWorldZ,
      targetClamped: false,
      moveBasis: "current world position",
      moveMode: "worldZ",
      boundingBox,
      moveAxis: this.getConfiguredMoveAxis(),
      canMove: canMoveSafely,
      bindingSource,
      message: safetyMessage,
      warning: canMoveSafely ? warning : safetyMessage,
    });
  }

  private createUnboundState(message: string): LifterBindingState {
    return {
      deviceId: lifterBindingConfig.deviceId,
      movablePartName: this.getConfiguredMovablePartName(),
      moveAxis: this.getConfiguredMoveAxis(),
      canMove: false,
      bindingSource: "none",
      message,
    };
  }

  private updateBindingState(state: LifterBindingState): LifterBindingState {
    this.bindingState = state;
    this.callbacks.onBindingChange(state);
    return state;
  }

  private updateAreaState(state: AreaRuntimeState): AreaRuntimeState {
    this.areaState = state;
    return this.areaState;
  }

  private refreshModelTree(): void {
    if (!this.modelRoot) {
      return;
    }

    this.modelRoot.updateMatrixWorld(true);
    const modelTree = collectModelObjectTree(this.modelRoot);
    this.modelNodes = modelTree;
    this.callbacks.onModelTreeChange(modelTree);

    const selectedNode = this.selectedModelUuid ? this.findNodeByUuid(this.selectedModelUuid) : undefined;
    this.callbacks.onSelectModelNode(selectedNode);

    if (this.movablePart && this.bindingState.currentMovableObjectUuid) {
      const movableNode = this.findNodeByUuid(this.movablePart.uuid);
      const worldPosition = this.getObjectWorldPosition(this.movablePart);
      const limits = this.getMovableWorldZLimits();
      const movableExceedsModel = limits && this.modelWorldBounds
        ? limits.movableHeight > this.modelWorldBounds.height
        : false;
      const canMoveSafely = this.hasValidMovableWorldZLimits(limits) && !movableExceedsModel;
      const safetyMessage = !this.modelWorldBounds
        ? "未获取整机模型边界，无法执行安全移动。"
        : movableExceedsModel
          ? "可动部件高度超过整机模型高度，无法安全移动。"
          : !canMoveSafely
            ? "可动部件安全移动范围无效，无法执行安全移动。"
            : this.bindingState.message;
      this.updateBindingState({
        ...this.bindingState,
        currentZ: worldPosition.z,
        localPosition: this.toVectorSnapshot(this.movablePart.position),
        worldPosition: this.toVectorSnapshot(worldPosition),
        currentWorldZ: worldPosition.z,
        modelMinZ: limits?.modelMinZ ?? this.bindingState.modelMinZ,
        modelMaxZ: limits?.modelMaxZ ?? this.bindingState.modelMaxZ,
        movableHeight: limits?.movableHeight ?? this.bindingState.movableHeight,
        minAllowedWorldZ: limits?.minAllowedWorldZ ?? this.bindingState.minAllowedWorldZ,
        maxAllowedWorldZ: limits?.maxAllowedWorldZ ?? this.bindingState.maxAllowedWorldZ,
        boundingBox: movableNode?.boundingBox ?? this.bindingState.boundingBox,
        canMove: canMoveSafely,
        message: safetyMessage,
        warning: canMoveSafely ? this.bindingState.warning : safetyMessage,
      });
    }
  }

  private getConfiguredRootName(): string {
    return this.modelConfig?.bindings.rootName ?? lifterBindingConfig.mainObjectName;
  }

  private getConfiguredMovablePartName(): string {
    return this.modelConfig?.bindings.movablePartName ?? lifterBindingConfig.movablePartName;
  }

  private getConfiguredMoveAxis(): "x" | "y" | "z" {
    return this.modelConfig?.bindings.moveAxis ?? lifterBindingConfig.moveAxis;
  }

  private getObjectWorldPosition(object: Object3D): Vector3 {
    object.updateMatrixWorld(true);
    return object.getWorldPosition(new Vector3());
  }

  private updateModelWorldBounds(root?: Object3D): void {
    if (!root) {
      this.modelWorldBounds = undefined;
      return;
    }

    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(root);
    if (box.isEmpty()) {
      this.modelWorldBounds = undefined;
      return;
    }

    this.modelWorldBounds = {
      minZ: box.min.z,
      maxZ: box.max.z,
      height: box.max.z - box.min.z,
    };
  }

  private createMovableWorldZLimits(object: Object3D): MovableWorldZLimits | undefined {
    if (!this.modelWorldBounds) {
      return undefined;
    }

    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const worldPosition = this.getObjectWorldPosition(object);
    const margin = 0.05;
    const movableHeight = box.isEmpty() ? 0 : box.max.z - box.min.z;
    const originToMinZ = box.isEmpty() ? margin : Math.max(margin, worldPosition.z - box.min.z);
    const originToMaxZ = box.isEmpty() ? margin : Math.max(margin, box.max.z - worldPosition.z);

    return {
      minAllowedWorldZ: this.modelWorldBounds.minZ + originToMinZ,
      maxAllowedWorldZ: this.modelWorldBounds.maxZ - originToMaxZ,
      movableHeight,
      modelMinZ: this.modelWorldBounds.minZ,
      modelMaxZ: this.modelWorldBounds.maxZ,
      originToMinZ,
      originToMaxZ,
    };
  }

  private hasValidMovableWorldZLimits(limits?: MovableWorldZLimits): limits is MovableWorldZLimits {
    return Boolean(
      limits &&
        Number.isFinite(limits.minAllowedWorldZ) &&
        Number.isFinite(limits.maxAllowedWorldZ) &&
        limits.minAllowedWorldZ <= limits.maxAllowedWorldZ,
    );
  }

  private getMovableWorldZLimits(): MovableWorldZLimits | undefined {
    if (!this.movablePart) {
      return undefined;
    }

    this.movableWorldZLimits = this.createMovableWorldZLimits(this.movablePart);
    return this.movableWorldZLimits;
  }

  private clampTargetWorldPosition(targetWorldPosition: Vector3): {
    targetWorldPosition: Vector3;
    targetClamped: boolean;
    limits?: MovableWorldZLimits;
  } {
    const limits = this.getMovableWorldZLimits();
    if (!this.hasValidMovableWorldZLimits(limits)) {
      return { targetWorldPosition: targetWorldPosition.clone(), targetClamped: false, limits };
    }

    const clampedTargetWorldPosition = targetWorldPosition.clone();
    const clampedZ = MathUtils.clamp(
      targetWorldPosition.z,
      limits.minAllowedWorldZ,
      limits.maxAllowedWorldZ,
    );
    clampedTargetWorldPosition.z = clampedZ;

    return {
      targetWorldPosition: clampedTargetWorldPosition,
      targetClamped: clampedZ !== targetWorldPosition.z,
      limits,
    };
  }

  private createSafetyMoveMessage(message: string, targetClamped: boolean): string {
    return targetClamped ? `${message}。目标高度超出模型高度范围，已限制到允许范围内。` : message;
  }

  private toVectorSnapshot(vector: Vector3): { x: number; y: number; z: number } {
    return {
      x: vector.x,
      y: vector.y,
      z: vector.z,
    };
  }

  private vectorFromSnapshot(snapshot?: { x: number; y: number; z: number }): Vector3 | undefined {
    return snapshot ? new Vector3(snapshot.x, snapshot.y, snapshot.z) : undefined;
  }

  private findNodeByUuid(uuid: string): ModelObjectNode | undefined {
    return this.modelNodes.find((node) => node.uuid === uuid);
  }

  private findSceneObjectByUuid(uuid: string): Object3D | undefined {
    return (
      this.activeDetailRoot?.getObjectByProperty("uuid", uuid) ??
      this.modelRoot?.getObjectByProperty("uuid", uuid) ??
      this.hitBoxManager.getHitBoxes().find((hitBox) => hitBox.uuid === uuid)
    );
  }

  private getMovableProtectionReason(node: ModelObjectNode): string {
    const forbiddenNames = new Set([
      "unnamed_mesh_001",
      lifterBindingConfig.mainObjectName,
      this.getConfiguredRootName(),
      "NAUO1",
    ]);
    const isRoot = Boolean(
      (this.modelRoot && node.uuid === this.modelRoot.uuid) ||
        (this.activeDetailRoot && node.uuid === this.activeDetailRoot.uuid),
    );
    const isHitBox = node.userData.isHitBox === true || node.userData.isAreaDeviceHitBox === true;
    const isOversized = (node.boundingBox?.size.z ?? 0) > 15;
    const hasTooManyChildren = node.childrenCount > 120;
    const isNearWholeModel = this.isNearWholeModelSize(node);

    if (isRoot || isHitBox || forbiddenNames.has(node.name) || isOversized || hasTooManyChildren || isNearWholeModel) {
      return "该对象疑似整机或主体框架，不建议作为可动部件。请选择内部箱体 / 轿厢 / 载货台对象。";
    }

    return "";
  }

  private isNearWholeModelSize(node: ModelObjectNode): boolean {
    if (!this.modelRoot || !node.boundingBox) {
      return false;
    }

    const rootBox = new Box3().setFromObject(this.modelRoot);
    const rootSize = new Vector3();
    rootBox.getSize(rootSize);
    const size = node.boundingBox.size;
    if (rootSize.x <= 0 || rootSize.y <= 0 || rootSize.z <= 0) {
      return false;
    }

    return size.x >= rootSize.x * 0.82 && size.y >= rootSize.y * 0.82 && size.z >= rootSize.z * 0.82;
  }

  private createTask(request: LifterTaskRequest): LifterTask {
    return {
      taskId: `TASK-${Date.now()}`,
      deviceId: request.deviceId,
      targetPositionCode: request.targetPositionCode,
      targetZ: request.targetZ,
      speed: request.speed,
      status: "running",
      createTime: this.createTime(),
    };
  }

  private createTime(): string {
    return new Date().toLocaleString("zh-CN", { hour12: false });
  }

  private updateDeviceStatus(deviceId: string, status: "running" | "arrived", locked: boolean): void {
    if (!this.modelRoot) {
      return;
    }

    if (this.sceneMode === "area") {
      this.currentDevices = this.currentDevices.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              status,
              updateTime: this.createTime(),
            }
          : device,
      );
      this.callbacks.onDevicesChange(this.currentDevices);
      this.callbacks.onSelectDevice(this.currentDevices.find((device) => device.id === deviceId));
      this.requestRender();
      return;
    }

    const devices = this.statusManager.setDeviceStatus(deviceId, status, locked);
    this.currentDevices = devices;
    this.applyMockStatusColors();
    this.callbacks.onDevicesChange(devices);
    this.callbacks.onSelectDevice(this.statusManager.getById(deviceId));
    this.requestRender();
  }

  private startStatusUpdates(): void {
    if (!debugConfig.enableMockStatusTimer) {
      return;
    }

    this.statusTimerId = window.setInterval(() => {
      if (this.sceneMode === "area") {
        this.callbacks.onDevicesChange(this.currentDevices);
        return;
      }

      const devices = this.statusManager.randomUpdate();
      if (this.modelRoot) {
        this.applyMockStatusColors();
        this.requestRender();
      }
      this.callbacks.onDevicesChange(devices);
    }, 2000);
  }

  private startPerformanceUpdates(): void {
    if (this.performanceTimerId) {
      return;
    }

    this.performanceTimerId = window.setInterval(() => {
      if (this.isDisposed) {
        return;
      }

      this.callbacks.onPerformanceChange(this.getPerformanceStats());
    }, 1000);
  }

  private applyMockStatusColors(): void {
    if (!this.modelRoot) {
      return;
    }

    if (this.loadedUseFallback || debugConfig.enableMockStatusColor) {
      this.statusManager.applyStatusColors(this.modelRoot);
      this.callbacks.onFaultSimulationChange(this.faultSimulationManager.reapply());
    }
  }

  private moveMovableToWorldPosition(
    targetWorldPosition: Vector3,
    runningMessage: string,
    completeMessage: string,
  ): void {
    if (!this.movablePart) {
      return;
    }

    const currentWorldPosition = this.getObjectWorldPosition(this.movablePart);
    const startWorldZ = currentWorldPosition.z;
    const requestedTargetWorldPosition = targetWorldPosition.clone();
    const clampedTarget = this.clampTargetWorldPosition(requestedTargetWorldPosition);
    const clampedTargetWorldPosition = clampedTarget.targetWorldPosition;
    const limits = clampedTarget.limits;
    const safeRunningMessage = this.createSafetyMoveMessage(runningMessage, clampedTarget.targetClamped);
    const safeCompleteMessage = this.createSafetyMoveMessage(completeMessage, clampedTarget.targetClamped);

    this.updateMoveHelperLine(clampedTargetWorldPosition);
    this.updateBindingState({
      ...this.bindingState,
      currentZ: currentWorldPosition.z,
      localPosition: this.toVectorSnapshot(this.movablePart.position),
      worldPosition: this.toVectorSnapshot(currentWorldPosition),
      startWorldZ: currentWorldPosition.z,
      currentWorldZ: currentWorldPosition.z,
      targetWorldPosition: this.toVectorSnapshot(clampedTargetWorldPosition),
      targetWorldZ: requestedTargetWorldPosition.z,
      clampedTargetWorldZ: clampedTargetWorldPosition.z,
      modelMinZ: limits?.modelMinZ ?? this.bindingState.modelMinZ,
      modelMaxZ: limits?.modelMaxZ ?? this.bindingState.modelMaxZ,
      movableHeight: limits?.movableHeight ?? this.bindingState.movableHeight,
      minAllowedWorldZ: limits?.minAllowedWorldZ ?? this.bindingState.minAllowedWorldZ,
      maxAllowedWorldZ: limits?.maxAllowedWorldZ ?? this.bindingState.maxAllowedWorldZ,
      targetClamped: clampedTarget.targetClamped,
      moveBasis: "current world position",
      moveMode: "worldZ",
      message: safeRunningMessage,
    });
    this.animationManager.moveObjectToWorldPosition({
      object: this.movablePart,
      targetWorldPosition: clampedTargetWorldPosition,
      unitsPerSecond: taskSpeedUnitsPerSecond.normal,
      minWorldZ: limits?.minAllowedWorldZ,
      maxWorldZ: limits?.maxAllowedWorldZ,
      onUpdate: (currentWorldPosition) => {
        this.updateBindingWorldState(currentWorldPosition, clampedTargetWorldPosition, safeRunningMessage, {
          startWorldZ,
          requestedTargetWorldZ: requestedTargetWorldPosition.z,
          targetClamped: clampedTarget.targetClamped,
        });
        this.updateMovableHelper();
      },
      onComplete: () => {
        this.updateBindingWorldState(clampedTargetWorldPosition, clampedTargetWorldPosition, safeCompleteMessage, {
          startWorldZ,
          requestedTargetWorldZ: requestedTargetWorldPosition.z,
          targetClamped: clampedTarget.targetClamped,
        });
        this.updateMovableHelper();
        this.clearMoveHelperLine();
      },
    });
    this.requestRender();
  }

  private updateBindingWorldState(
    currentWorldPosition: Vector3,
    targetWorldPosition = this.vectorFromSnapshot(this.bindingState.targetWorldPosition),
    message = this.bindingState.message,
    moveContext: {
      startWorldZ?: number;
      requestedTargetWorldZ?: number;
      targetClamped?: boolean;
    } = {},
  ): void {
    if (!this.movablePart) {
      return;
    }

    const limits = this.getMovableWorldZLimits();
    this.updateBindingState({
      ...this.bindingState,
      currentZ: currentWorldPosition.z,
      localPosition: this.toVectorSnapshot(this.movablePart.position),
      worldPosition: this.toVectorSnapshot(currentWorldPosition),
      startWorldZ: moveContext.startWorldZ ?? this.bindingState.startWorldZ,
      currentWorldZ: currentWorldPosition.z,
      targetWorldPosition: targetWorldPosition ? this.toVectorSnapshot(targetWorldPosition) : this.bindingState.targetWorldPosition,
      targetWorldZ: moveContext.requestedTargetWorldZ ?? targetWorldPosition?.z ?? this.bindingState.targetWorldZ,
      clampedTargetWorldZ: targetWorldPosition?.z ?? this.bindingState.clampedTargetWorldZ,
      baseWorldPosition: this.movableBaseWorldPosition
        ? this.toVectorSnapshot(this.movableBaseWorldPosition)
        : this.bindingState.baseWorldPosition,
      baseWorldZ: this.movableBaseWorldPosition?.z ?? this.bindingState.baseWorldZ,
      modelMinZ: limits?.modelMinZ ?? this.bindingState.modelMinZ,
      modelMaxZ: limits?.modelMaxZ ?? this.bindingState.modelMaxZ,
      movableHeight: limits?.movableHeight ?? this.bindingState.movableHeight,
      minAllowedWorldZ: limits?.minAllowedWorldZ ?? this.bindingState.minAllowedWorldZ,
      maxAllowedWorldZ: limits?.maxAllowedWorldZ ?? this.bindingState.maxAllowedWorldZ,
      targetClamped: moveContext.targetClamped ?? this.bindingState.targetClamped,
      moveBasis: "current world position",
      moveMode: "worldZ",
      message,
    });
  }

  private updateSelectionHelper(object?: Object3D): void {
    this.removeSelectionHelper();
    if (!debugConfig.enableSelectionHighlight || !object) {
      return;
    }

    const box = new Box3().setFromObject(object);
    if (box.isEmpty()) {
      return;
    }

    this.selectedHelper = new Box3Helper(box, this.modelConfig?.materialConfig?.selectionColor ?? 0x69f0ff);
    this.sceneManager.scene.add(this.selectedHelper);
  }

  private updateMovableHelper(): void {
    this.removeMovableHelper();
    if (!debugConfig.enableMovablePartHighlight || !this.movablePart) {
      return;
    }

    const box = new Box3().setFromObject(this.movablePart);
    if (box.isEmpty()) {
      return;
    }

    this.movableHelper = new Box3Helper(box, this.modelConfig?.materialConfig?.movablePartColor ?? 0x21c17a);
    this.sceneManager.scene.add(this.movableHelper);
  }

  private updateMoveHelperLine(targetWorldPosition: Vector3): void {
    this.clearMoveHelperLine();
    if (!debugConfig.enableMoveHelperLine || !this.movablePart) {
      return;
    }

    const box = new Box3().setFromObject(this.movablePart);
    if (box.isEmpty()) {
      return;
    }

    const center = new Vector3();
    box.getCenter(center);
    const currentWorldPosition = this.getObjectWorldPosition(this.movablePart);
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(center.x, center.y, currentWorldPosition.z),
      new Vector3(center.x, center.y, targetWorldPosition.z),
    ]);
    this.moveHelperLine = new Line(geometry, new LineBasicMaterial({ color: 0xf2c94c }));
    this.sceneManager.scene.add(this.moveHelperLine);
  }

  private removeSelectionHelper(): void {
    if (!this.selectedHelper) {
      return;
    }

    this.sceneManager.scene.remove(this.selectedHelper);
    ResourceDisposer.disposeObject3D(this.selectedHelper);
    this.selectedHelper = undefined;
  }

  private removeMovableHelper(): void {
    if (!this.movableHelper) {
      return;
    }

    this.sceneManager.scene.remove(this.movableHelper);
    ResourceDisposer.disposeObject3D(this.movableHelper);
    this.movableHelper = undefined;
  }

  private removeMovableHelpers(): void {
    this.removeMovableHelper();
    this.clearMoveHelperLine();
  }

  private clearMoveHelperLine(): void {
    if (!this.moveHelperLine) {
      return;
    }

    ResourceDisposer.disposeObject3D(this.moveHelperLine, { removeFromParent: true });
    this.moveHelperLine = undefined;
  }

  private readonly requestRender = (): void => {
    if (this.isDisposed || this.animationFrameId) {
      return;
    }

    this.animationFrameId = window.requestAnimationFrame(this.render);
  };

  private readonly render = (): void => {
    this.animationFrameId = 0;
    if (this.isDisposed) {
      return;
    }

    const hasActiveAnimation = this.animationManager.update();
    this.controlsManager.update();
    const hasActiveNavigation = this.controlsManager.needsContinuousRender();
    this.rendererManager.render(this.sceneManager.scene, this.cameraManager.camera);
    this.performanceMonitor.recordFrame();
    this.callbacks.onCameraControlChange(this.controlsManager.getDebugState());

    if (this.shouldLogGlbStats && this.modelRoot) {
      this.shouldLogGlbStats = false;
      logModelPerformanceStats(
        this.modelRoot,
        this.rendererManager.renderer,
        this.currentLODLevel,
        this.currentModelUrl,
      );
    }

    if (hasActiveAnimation || hasActiveNavigation) {
      this.requestRender();
    }
  };
}
