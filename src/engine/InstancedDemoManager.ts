import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Scene,
} from "three";
import { ResourceDisposer } from "./ResourceDisposer";
import type { InstanceDemoCount, InstanceDemoMode, InstanceDemoState } from "../types/twin";

interface InstanceDemoOptions {
  mode: InstanceDemoMode;
  count: InstanceDemoCount;
}

export class InstancedDemoManager {
  private root?: Group;
  private state: InstanceDemoState = {
    enabled: false,
    mode: "instanced",
    count: 100,
    objectType: "static-repeat",
    drawCallHint: "disabled",
  };

  setDemo(scene: Scene, options: InstanceDemoOptions): InstanceDemoState {
    this.clear();

    this.root = new Group();
    this.root.name = "static-repeat-instancing-demo";
    this.root.userData = {
      isInstancingDemo: true,
      selectable: false,
    };

    const geometry = new BoxGeometry(0.34, 0.24, 0.08);
    const material = new MeshStandardMaterial({
      color: 0xb7a26a,
      roughness: 0.78,
      metalness: 0.05,
    });

    if (options.mode === "instanced") {
      this.root.add(this.createInstancedObjects(geometry, material, options.count));
    } else {
      this.createMeshObjects(geometry, material, options.count, this.root);
    }

    scene.add(this.root);
    this.state = {
      enabled: true,
      mode: options.mode,
      count: options.count,
      objectType: "static-repeat",
      drawCallHint:
        options.mode === "instanced"
          ? "1 InstancedMesh draw call for repeated static objects"
          : `${options.count} Mesh objects, expected draw calls increase with count`,
    };
    return this.state;
  }

  getState(): InstanceDemoState {
    return this.state;
  }

  clear(): void {
    if (this.root) {
      ResourceDisposer.disposeObject3D(this.root, { removeFromParent: true });
      this.root = undefined;
    }

    this.state = {
      ...this.state,
      enabled: false,
      drawCallHint: "disabled",
    };
  }

  private createInstancedObjects(
    geometry: BoxGeometry,
    material: MeshStandardMaterial,
    count: number,
  ): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, count);
    mesh.name = "static-pallet-instanced";
    mesh.userData = {
      isInstancingDemo: true,
      selectable: false,
      mode: "instanced",
    };

    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const scale = new Vector3(1, 1, 1);
    for (let index = 0; index < count; index += 1) {
      matrix.compose(this.getInstancePosition(index, count), quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private createMeshObjects(
    geometry: BoxGeometry,
    material: MeshStandardMaterial,
    count: number,
    root: Group,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const mesh = new Mesh(geometry, material);
      mesh.name = `static-pallet-mesh-${index + 1}`;
      mesh.position.copy(this.getInstancePosition(index, count));
      mesh.userData = {
        isInstancingDemo: true,
        selectable: false,
        mode: "mesh",
      };
      root.add(mesh);
    }
  }

  private getInstancePosition(index: number, count: number): Vector3 {
    const columns = Math.ceil(Math.sqrt(count));
    const row = Math.floor(index / columns);
    const column = index % columns;
    const spacing = 0.42;
    const originX = -12;
    const originY = -8;
    return new Vector3(
      originX + column * spacing,
      originY - row * spacing,
      0.04,
    );
  }
}
