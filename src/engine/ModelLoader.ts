import { Group, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ModelTransformApplier } from "./ModelTransformApplier";
import type {
  ModelBindingSettings,
  ModelExternalConfig,
  ModelLODSettings,
  ModelTransformSettings,
  TwinDevice,
} from "../types/twin";

export interface LoadedModel {
  root?: Group;
  useFallback: boolean;
  message: string;
  config: ModelExternalConfig;
}

export class ModelLoader {
  private readonly loader = new GLTFLoader();
  private readonly transformApplier = new ModelTransformApplier();

  async load(devices: TwinDevice[]): Promise<LoadedModel> {
    const config = await this.loadModelConfig();

    try {
      const gltf = await this.loader.loadAsync(config.modelUrl);
      const root = gltf.scene;
      root.name = config.bindings.rootName;
      const bindingCount = this.prepareRealModel(root, devices, config);
      const message =
        bindingCount > 0
          ? `已加载真实 GLB 模型：${config.modelUrl}`
          : `已加载真实 GLB，但未发现业务 meshName，已按整体 ${config.bindings.rootName} 绑定`;

      return {
        root,
        useFallback: false,
        message,
        config,
      };
    } catch {
      return {
        root: undefined,
        useFallback: false,
        message: `未找到或无法加载 ${config.modelUrl}，请检查 public/models 目录或 lifter.json 配置。`,
        config,
      };
    }
  }

  private async loadModelConfig(): Promise<ModelExternalConfig> {
    try {
      const response = await fetch("/model-configs/lifter.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const rawConfig = await response.json();
      return this.mergeModelConfig(rawConfig);
    } catch (error) {
      console.warn("模型外部配置加载失败，已使用内置默认配置。", error);
      return this.mergeModelConfig({});
    }
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

  private prepareRealModel(
    root: Object3D,
    devices: TwinDevice[],
    config: ModelExternalConfig,
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
        };
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
        };
      }
    }

    this.transformApplier.apply(root, config.transform);
    return bindingCount;
  }
}
