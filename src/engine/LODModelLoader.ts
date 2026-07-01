import { Mesh, Object3D, type Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ModelManifestLoader } from "./ModelManifestLoader";
import { ModelTransformApplier } from "./ModelTransformApplier";
import type {
  ModelBindingSettings,
  ModelExternalConfig,
  ModelLODLevel,
  ModelLODSettings,
  ModelTransformSettings,
  TwinDevice,
} from "../types/twin";

export interface LODLoadedModel {
  root?: Group;
  useFallback: boolean;
  message: string;
  config: ModelExternalConfig;
  level: ModelLODLevel;
  url?: string;
  failedModels: Array<{
    level: ModelLODLevel;
    url: string;
    reason: string;
  }>;
}

export class LODModelLoader {
  private readonly loader = new GLTFLoader();
  private readonly manifestLoader = new ModelManifestLoader();
  private readonly transformApplier = new ModelTransformApplier();
  private config?: ModelExternalConfig;

  async loadDefault(devices: TwinDevice[]): Promise<LODLoadedModel> {
    const config = await this.loadModelConfig();
    return this.loadByOrder(config.lod.initialFallbackOrder, devices);
  }

  async loadLevel(
    requestedLevel: ModelLODLevel,
    devices: TwinDevice[],
    existingRoot?: Object3D,
  ): Promise<LODLoadedModel> {
    return this.loadByOrder([requestedLevel], devices, existingRoot);
  }

  async loadPreferredLevels(
    levels: ModelLODLevel[],
    devices: TwinDevice[],
    existingRoot?: Object3D,
  ): Promise<LODLoadedModel> {
    return this.loadByOrder(levels, devices, existingRoot);
  }

  getConfig(): ModelExternalConfig | undefined {
    return this.config;
  }

  private async loadByOrder(
    levels: ModelLODLevel[],
    devices: TwinDevice[],
    existingRoot?: Object3D,
  ): Promise<LODLoadedModel> {
    const config = this.config ?? (await this.loadModelConfig());
    const failedModels: LODLoadedModel["failedModels"] = [];

    for (const level of levels) {
      const loaded = await this.tryLoadGlbLevel(level, config, devices);
      if (loaded) {
        return {
          ...loaded,
          failedModels,
        };
      }

      const url = this.getLevelUrl(config, level);
      if (url) {
        failedModels.push({
          level,
          url,
          reason: "文件不存在或 GLB 加载失败",
        });
      }
    }

    return {
      root: undefined,
      useFallback: false,
      message: existingRoot
        ? "目标级别加载失败，已保留当前模型"
        : "未找到可加载的 GLB 模型，请检查 public/models 目录或 lifter.json 配置。",
      config,
      level: config.lod.defaultLevel,
      url: undefined,
      failedModels,
    };
  }

  private async tryLoadGlbLevel(
    level: ModelLODLevel,
    config: ModelExternalConfig,
    devices: TwinDevice[],
  ): Promise<Omit<LODLoadedModel, "failedModels"> | undefined> {
    const url = this.getLevelUrl(config, level);
    if (!url) {
      return undefined;
    }

    try {
      const gltf = await this.loader.loadAsync(url);
      const root = gltf.scene;
      root.name = config.bindings.rootName;
      const bindingCount = this.prepareModel(root, devices, config, level);
      return {
        root,
        useFallback: false,
        message:
          bindingCount > 0
            ? `已加载 ${level} 模型：${url}`
            : `已加载 ${level} 模型，但未发现业务 meshName，已按整体 ${config.bindings.rootName} 绑定`,
        config,
        level,
        url,
      };
    } catch {
      return undefined;
    }
  }

  private async loadModelConfig(): Promise<ModelExternalConfig> {
    try {
      const response = await fetch("/model-configs/lifter.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const rawConfig = await response.json();
      const manifest = await this.manifestLoader.load();
      this.config = this.mergeModelConfig(this.applyManifestConfig(rawConfig, manifest));
    } catch (error) {
      console.warn("模型外部配置加载失败，已使用内置默认配置。", error);
      this.config = this.mergeModelConfig({});
    }

    return this.config;
  }

  private mergeModelConfig(rawConfig: Partial<ModelExternalConfig>): ModelExternalConfig {
    const fallback = this.createDefaultModelConfig();
    const rawTransform = (rawConfig.transform ?? {}) as Partial<ModelTransformSettings>;
    const rawBindings = (rawConfig.bindings ?? {}) as Partial<ModelBindingSettings>;
    const rawLod = (rawConfig.lod ?? {}) as Partial<ModelLODSettings>;

    return {
      ...fallback,
      ...rawConfig,
      transform: {
        ...fallback.transform,
        ...rawTransform,
        rotationDeg: {
          ...fallback.transform.rotationDeg,
          ...rawTransform.rotationDeg,
        },
        position: {
          ...fallback.transform.position,
          ...rawTransform.position,
        },
        scale: {
          ...fallback.transform.scale,
          ...rawTransform.scale,
        },
      },
      bindings: {
        ...fallback.bindings,
        ...rawBindings,
      },
      lod: {
        ...fallback.lod,
        ...rawLod,
      },
    };
  }

  private applyManifestConfig(
    rawConfig: Partial<ModelExternalConfig>,
    manifest?: Awaited<ReturnType<ModelManifestLoader["load"]>>,
  ): Partial<ModelExternalConfig> {
    if (!manifest) {
      return rawConfig;
    }

    return {
      ...rawConfig,
      modelId: manifest.modelId,
      modelName: manifest.modelName,
      modelUrl: manifest.levels.source,
      upAxis: manifest.transform.upAxis.toLowerCase() as ModelExternalConfig["upAxis"],
      transform: {
        ...rawConfig.transform,
        rotationDeg: manifest.transform.rotationDeg,
        position: manifest.transform.position,
        scale: manifest.transform.scale,
        autoCenter: manifest.transform.autoCenter,
        groundToZero: manifest.transform.groundToZero,
      },
      bindings: {
        rootName: rawConfig.bindings?.rootName ?? "lifter-main",
        movablePartName: manifest.semantic.movableParts[0] ?? rawConfig.bindings?.movablePartName ?? "lifter-platform",
        moveAxis: rawConfig.bindings?.moveAxis ?? "z",
      },
      lod: {
        sourceUrl: manifest.levels.source,
        highUrl: manifest.levels.high,
        mediumUrl: manifest.levels.medium,
        lowUrl: manifest.levels.low,
        proxyUrl: manifest.levels.proxy,
        defaultLevel: manifest.defaultLevel,
        selectedLevel: rawConfig.lod?.selectedLevel ?? "high",
        autoLoadHighOnSelect: manifest.lod.autoLoadHighOnSelect,
        allowGeneratedProxy: manifest.lod.allowGeneratedProxy,
        initialFallbackOrder: rawConfig.lod?.initialFallbackOrder ?? ["medium", "low", "source", "high", "proxy"],
        nearDistance: rawConfig.lod?.nearDistance ?? 20,
        farDistance: rawConfig.lod?.farDistance ?? 80,
      },
    };
  }

  private createDefaultModelConfig(): ModelExternalConfig {
    return {
      modelId: "lifter",
      modelName: "提升机",
      modelUrl: "/models/lifter.glb",
      upAxis: "z",
      transform: {
        rotationDeg: { x: 180, y: 0, z: 0 },
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        autoCenter: true,
        groundToZero: true,
      },
      bindings: {
        rootName: "lifter-main",
        movablePartName: "lifter-platform",
        moveAxis: "z",
      },
      lod: {
        sourceUrl: "/models/lifter.glb",
        proxyUrl: "/models/lifter/lifter.proxy.glb",
        lowUrl: "/models/lifter/lifter.low.glb",
        mediumUrl: "/models/lifter/lifter.medium.glb",
        highUrl: "/models/lifter/lifter.high.glb",
        defaultLevel: "source",
        selectedLevel: "high",
        autoLoadHighOnSelect: false,
        allowGeneratedProxy: false,
        initialFallbackOrder: ["medium", "low", "source", "high", "proxy"],
        nearDistance: 20,
        farDistance: 80,
      },
    };
  }

  private getLevelUrl(config: ModelExternalConfig, level: ModelLODLevel): string {
    switch (level) {
      case "source":
        return config.lod.sourceUrl || config.modelUrl;
      case "proxy":
        return config.lod.proxyUrl;
      case "low":
        return config.lod.lowUrl;
      case "medium":
        return config.lod.mediumUrl;
      case "high":
        return config.lod.highUrl;
      default:
        return config.modelUrl;
    }
  }

  private prepareModel(
    root: Object3D,
    devices: TwinDevice[],
    config: ModelExternalConfig,
    level: ModelLODLevel,
  ): number {
    const deviceMap = new Map(devices.map((device) => [device.meshName, device]));
    let bindingCount = 0;

    root.traverse((object) => {
      const device = deviceMap.get(object.name);
      if (device) {
        bindingCount += 1;
        object.userData = {
          ...object.userData,
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          meshName: device.meshName,
          modelId: config.modelId,
          lodLevel: level,
        };
      }

      if (object instanceof Mesh) {
        object.castShadow = false;
        object.receiveShadow = level === "high";
      }
    });

    if (bindingCount === 0) {
      const mainDevice = devices.find((device) => device.meshName === config.bindings.rootName);
      if (mainDevice) {
        root.name = mainDevice.meshName;
        root.userData = {
          ...root.userData,
          deviceId: mainDevice.id,
          deviceName: mainDevice.name,
          deviceType: mainDevice.type,
          meshName: mainDevice.meshName,
          modelId: config.modelId,
          lodLevel: level,
        };
      }
    }

    this.transformApplier.apply(root, config.transform);
    return bindingCount;
  }
}
