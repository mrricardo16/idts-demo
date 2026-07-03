import { Mesh, Object3D, type Material } from "three";
import type { ModelFaultInfo } from "../types/modelConfig";
import type { ModelExternalConfig } from "../types/twin";

export interface RuntimeFaultInfo extends ModelFaultInfo {
  matched: boolean;
  matchedObjectName?: string;
  matchedObjectUuid?: string;
  matchMessage: string;
}

export interface FaultSimulationState {
  enabled: boolean;
  deviceId: string;
  faultColor: string;
  activeFaults: RuntimeFaultInfo[];
  selectedFault?: RuntimeFaultInfo;
  currentFaultObjectName?: string;
  message: string;
}

type ColorMaterial = Material & {
  color?: {
    set: (color: string) => void;
  };
  opacity: number;
  transparent: boolean;
};

interface MatchedFault {
  fault: RuntimeFaultInfo;
  object?: Object3D;
}

export class FaultSimulationManager {
  private root?: Object3D;
  private config?: ModelExternalConfig;
  private enabled = false;
  private readonly originalMaterials = new Map<Mesh, Material | Material[]>();
  private matchedFaults: MatchedFault[] = [];
  private selectedFault?: RuntimeFaultInfo;

  configure(root: Object3D | undefined, config: ModelExternalConfig | undefined): FaultSimulationState {
    this.disable();
    this.root = root;
    this.config = config;
    this.enabled = Boolean(config?.faultSimulation?.enabled);
    this.rebuildMatches();
    if (this.enabled) {
      this.applyFaultMaterials();
    }
    return this.getState();
  }

  enable(): FaultSimulationState {
    this.enabled = true;
    this.rebuildMatches();
    this.applyFaultMaterials();
    return this.getState();
  }

  disable(): FaultSimulationState {
    this.restoreOriginalMaterials();
    this.enabled = false;
    this.selectedFault = undefined;
    return this.getState();
  }

  dispose(): void {
    this.restoreOriginalMaterials();
    this.root = undefined;
    this.config = undefined;
    this.matchedFaults = [];
    this.selectedFault = undefined;
    this.enabled = false;
  }

  refreshSelection(object?: Object3D): FaultSimulationState {
    this.selectedFault = this.findFaultForObject(object);
    return this.getState();
  }

  reapply(): FaultSimulationState {
    if (this.enabled) {
      this.applyFaultMaterials();
    }
    return this.getState();
  }

  getState(): FaultSimulationState {
    const activeFaults = this.matchedFaults.map((item) => item.fault);
    const matchedCount = activeFaults.filter((fault) => fault.matched).length;
    const totalCount = activeFaults.length;
    const unmatchedCount = totalCount - matchedCount;

    return {
      enabled: this.enabled,
      deviceId: this.config?.faultSimulation?.deviceId ?? "",
      faultColor: this.getFaultColor(),
      activeFaults,
      selectedFault: this.selectedFault,
      currentFaultObjectName: this.selectedFault?.matchedObjectName ?? this.selectedFault?.objectName,
      message:
        totalCount === 0
          ? "未配置异常模拟。"
          : unmatchedCount > 0
            ? `已配置 ${totalCount} 条异常，${unmatchedCount} 条异常部件未匹配到模型对象。`
            : `已配置 ${totalCount} 条异常，已匹配 ${matchedCount} 个模型对象。`,
    };
  }

  private rebuildMatches(): void {
    const faults = this.config?.faultSimulation?.activeFaults ?? [];
    this.matchedFaults = faults.map((fault) => {
      const object = this.findFaultObject(fault);
      return {
        object,
        fault: {
          ...fault,
          matched: Boolean(object),
          matchedObjectName: object?.name,
          matchedObjectUuid: object?.uuid,
          matchMessage: object ? "已匹配到模型对象" : "异常部件未匹配到模型对象",
        },
      };
    });
  }

  private findFaultObject(fault: ModelFaultInfo): Object3D | undefined {
    if (!this.root) {
      return undefined;
    }

    const objectUuid = fault.objectUuid?.trim();
    if (objectUuid) {
      const object = this.root.getObjectByProperty("uuid", objectUuid);
      if (object) {
        return object;
      }
    }

    const objectName = fault.objectName?.trim();
    return objectName ? this.root.getObjectByName(objectName) : undefined;
  }

  private findFaultForObject(object?: Object3D): RuntimeFaultInfo | undefined {
    if (!object) {
      return undefined;
    }

    return this.matchedFaults.find((item) => {
      if (!item.object) {
        return false;
      }

      return item.object === object || this.isAncestorOf(item.object, object);
    })?.fault;
  }

  private isAncestorOf(parent: Object3D, child: Object3D): boolean {
    let current: Object3D | null = child;
    while (current) {
      if (current === parent) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private applyFaultMaterials(): void {
    const faultColor = this.getFaultColor();
    for (const item of this.matchedFaults) {
      if (!item.object) {
        continue;
      }

      item.object.traverse((object) => {
        if (!(object instanceof Mesh)) {
          return;
        }

        if (!this.originalMaterials.has(object)) {
          this.originalMaterials.set(object, object.material);
        } else {
          this.disposeCurrentMaterial(object.material);
        }

        object.material = Array.isArray(object.material)
          ? object.material.map((material) => this.cloneFaultMaterial(material, faultColor))
          : this.cloneFaultMaterial(object.material, faultColor);
      });
    }
  }

  private cloneFaultMaterial(material: Material, faultColor: string): Material {
    const cloned = material.clone() as ColorMaterial;
    cloned.color?.set(faultColor);
    cloned.opacity = 1;
    cloned.transparent = false;
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

  private getFaultColor(): string {
    return this.config?.materialConfig?.faultColor || "#ff3333";
  }
}
