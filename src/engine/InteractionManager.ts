import {
  Mesh,
  Object3D,
  Raycaster,
  Vector2,
  type Camera,
  type Intersection,
} from "three";

export type DeviceSelectHandler = (meshName: string) => void;

export class InteractionManager {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private selectedMeshName = "";

  constructor(
    private readonly domElement: HTMLElement,
    private readonly camera: Camera,
    private readonly root: Object3D,
    private readonly onSelect: DeviceSelectHandler,
  ) {
    this.domElement.addEventListener("pointerdown", this.handlePointerDown);
  }

  select(meshName: string): void {
    this.selectedMeshName = meshName;
    this.applyHighlight();
  }

  clear(): void {
    this.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.clearHighlight();
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObject(this.root, true);
    const target = this.findSelectable(intersections);
    if (!target) {
      return;
    }

    const meshName = String(target.userData.meshName || target.name);
    this.select(meshName);
    this.onSelect(meshName);
  };

  private findSelectable(intersections: Intersection[]): Object3D | undefined {
    for (const intersection of intersections) {
      let current: Object3D | null = intersection.object;
      while (current) {
        if (current.userData.deviceId && current.userData.meshName) {
          return current;
        }
        current = current.parent;
      }
    }

    return undefined;
  }

  private applyHighlight(): void {
    this.clearHighlight();
    const selected = this.root.getObjectByName(this.selectedMeshName);
    if (!selected) {
      return;
    }

    selected.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if ("emissive" in material) {
          material.emissive.setHex(0x69f0ff);
          material.emissiveIntensity = 0.45;
        }
      }
    });
  }

  private clearHighlight(): void {
    this.root.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if ("emissive" in material) {
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
        }
      }
    });
  }
}
