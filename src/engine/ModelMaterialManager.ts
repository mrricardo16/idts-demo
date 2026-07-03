import { Mesh, Object3D, type Material } from "three";
import type { ModelMaterialConfig, ModelObjectColorConfig } from "../types/modelConfig";
import type { ModelExternalConfig } from "../types/twin";

export interface ModelMaterialState {
  preserveOriginalMaterial: boolean;
  defaultColor?: string;
  defaultOpacity?: number;
  faultColor: string;
  selectionColor: string;
  movablePartColor: string;
  objectColorCount: number;
  appliedObjectColorCount: number;
}

type ColorMaterial = Material & {
  color?: {
    set: (color: string) => void;
  };
  opacity: number;
  transparent: boolean;
};

export class ModelMaterialManager {
  private root?: Object3D;
  private config?: ModelMaterialConfig;
  private readonly originalMaterials = new Map<Mesh, Material | Material[]>();
  private appliedObjectColorCount = 0;

  apply(root: Object3D | undefined, config: ModelExternalConfig | undefined): ModelMaterialState {
    this.dispose();
    this.root = root;
    this.config = config?.materialConfig;
    this.appliedObjectColorCount = 0;

    if (!root || !this.config) {
      return this.getState();
    }

    const appliedMeshes = new Set<Mesh>();
    for (const objectColor of this.config.objectColors) {
      const target = this.findObjectColorTarget(objectColor);
      if (!target) {
        continue;
      }

      target.traverse((object) => {
        if (!(object instanceof Mesh)) {
          return;
        }

        this.applyMeshMaterial(object, objectColor.color, objectColor.opacity ?? this.config?.defaultOpacity ?? 1);
        appliedMeshes.add(object);
      });
    }
    this.appliedObjectColorCount = appliedMeshes.size;

    root.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      if (!appliedMeshes.has(object) && !this.config?.preserveOriginalMaterial && this.config?.defaultColor) {
        this.applyMeshMaterial(object, this.config.defaultColor, this.config.defaultOpacity ?? 1);
      }
    });

    return this.getState();
  }

  dispose(): void {
    this.restoreOriginalMaterials();
    this.root = undefined;
    this.config = undefined;
    this.appliedObjectColorCount = 0;
  }

  getState(): ModelMaterialState {
    return {
      preserveOriginalMaterial: this.config?.preserveOriginalMaterial ?? true,
      defaultColor: this.config?.defaultColor,
      defaultOpacity: this.config?.defaultOpacity,
      faultColor: this.config?.faultColor ?? "#ff3333",
      selectionColor: this.config?.selectionColor ?? "#69f0ff",
      movablePartColor: this.config?.movablePartColor ?? "#21c17a",
      objectColorCount: this.config?.objectColors.length ?? 0,
      appliedObjectColorCount: this.appliedObjectColorCount,
    };
  }

  private findObjectColorTarget(objectColor: ModelObjectColorConfig): Object3D | undefined {
    if (!this.root) {
      return undefined;
    }

    const objectUuid = objectColor.objectUuid?.trim();
    if (objectUuid) {
      const target = this.root.getObjectByProperty("uuid", objectUuid);
      if (target) {
        return target;
      }
    }

    const objectName = objectColor.objectName?.trim();
    return objectName ? this.root.getObjectByName(objectName) : undefined;
  }

  private applyMeshMaterial(mesh: Mesh, color: string, opacity: number): void {
    if (!this.originalMaterials.has(mesh)) {
      this.originalMaterials.set(mesh, mesh.material);
    }

    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => this.cloneConfiguredMaterial(material, color, opacity))
      : this.cloneConfiguredMaterial(mesh.material, color, opacity);
  }

  private cloneConfiguredMaterial(material: Material, color: string, opacity: number): Material {
    const cloned = material.clone() as ColorMaterial;
    cloned.color?.set(color);
    cloned.opacity = opacity;
    cloned.transparent = opacity < 1;
    cloned.needsUpdate = true;
    return cloned;
  }

  private restoreOriginalMaterials(): void {
    for (const [mesh, material] of this.originalMaterials) {
      this.disposeCurrentMaterial(mesh.material);
      mesh.material = material;
      const materials = Array.isArray(material) ? material : [material];
      for (const item of materials) {
        item.needsUpdate = true;
      }
    }
    this.originalMaterials.clear();
  }

  private disposeCurrentMaterial(material: Material | Material[]): void {
    const materials = Array.isArray(material) ? material : [material];
    for (const item of materials) {
      item.dispose();
    }
  }
}
