import type { ModelManifest } from "../types/modelManifest";
import type { ModelLODLevel } from "../types/twin";

const DEFAULT_MANIFEST_URL = "/models/lifter/manifest.json";

export class ModelManifestLoader {
  private cachedManifest?: ModelManifest;

  async load(url = DEFAULT_MANIFEST_URL): Promise<ModelManifest | undefined> {
    if (this.cachedManifest) {
      return this.cachedManifest;
    }

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const rawManifest = await response.json();
      this.cachedManifest = this.normalize(rawManifest);
      return this.cachedManifest;
    } catch (error) {
      console.warn("模型 manifest 加载失败，继续使用 lifter.json 配置。", error);
      return undefined;
    }
  }

  private normalize(rawManifest: Partial<ModelManifest>): ModelManifest {
    const levels = {
      source: rawManifest.levels?.source ?? "/models/lifter.glb",
      high: rawManifest.levels?.high ?? "/models/lifter/lifter.high.glb",
      medium: rawManifest.levels?.medium ?? "/models/lifter/lifter.medium.glb",
      low: rawManifest.levels?.low ?? "/models/lifter/lifter.low.glb",
      proxy: rawManifest.levels?.proxy ?? "/models/lifter/lifter.proxy.glb",
    };
    const defaultLevel = this.normalizeLevel(rawManifest.defaultLevel);

    return {
      modelId: rawManifest.modelId ?? "lifter-001",
      modelName: rawManifest.modelName ?? "提升机 001",
      defaultLevel,
      levels,
      lod: {
        autoLoadHighOnSelect: rawManifest.lod?.autoLoadHighOnSelect ?? false,
        allowGeneratedProxy: rawManifest.lod?.allowGeneratedProxy ?? false,
      },
      transform: {
        upAxis: rawManifest.transform?.upAxis ?? "Z",
        rotationDeg: {
          x: rawManifest.transform?.rotationDeg?.x ?? 180,
          y: rawManifest.transform?.rotationDeg?.y ?? 0,
          z: rawManifest.transform?.rotationDeg?.z ?? 0,
        },
        position: {
          x: rawManifest.transform?.position?.x ?? 0,
          y: rawManifest.transform?.position?.y ?? 0,
          z: rawManifest.transform?.position?.z ?? 0,
        },
        scale: {
          x: rawManifest.transform?.scale?.x ?? 1,
          y: rawManifest.transform?.scale?.y ?? 1,
          z: rawManifest.transform?.scale?.z ?? 1,
        },
        autoCenter: rawManifest.transform?.autoCenter ?? true,
        groundToZero: rawManifest.transform?.groundToZero ?? true,
      },
      semantic: {
        movableParts: rawManifest.semantic?.movableParts ?? [],
        selectableParts: rawManifest.semantic?.selectableParts ?? [],
      },
    };
  }

  private normalizeLevel(level?: ModelLODLevel): ModelLODLevel {
    if (level === "source" || level === "high" || level === "medium" || level === "low" || level === "proxy") {
      return level;
    }

    return "source";
  }
}
