import { Box3, Mesh, Vector3 } from "three";
import type { Object3D } from "three";
import type { BoundingBoxSnapshot, ModelObjectNode, VectorSnapshot } from "../types/twin";

function toSnapshot(vector: Vector3): VectorSnapshot {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function getDepth(object: Object3D, root: Object3D): number {
  let depth = 0;
  let current = object.parent;
  while (current && current !== root) {
    depth += 1;
    current = current.parent;
  }

  return depth;
}

function createDisplayName(object: Object3D, unnamedIndex: number): string {
  if (object.name) {
    return object.name;
  }

  return `unnamed_mesh_${String(unnamedIndex).padStart(3, "0")}`;
}

function getBoundingBox(object: Object3D): BoundingBoxSnapshot | null {
  const box = new Box3().setFromObject(object);
  if (box.isEmpty()) {
    return null;
  }

  const size = new Vector3();
  box.getSize(size);

  return {
    min: toSnapshot(box.min),
    max: toSnapshot(box.max),
    size: toSnapshot(size),
  };
}

function toUserDataSnapshot(userData: Object3D["userData"]): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(userData).map(([key, value]) => {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return [key, value];
      }

      return [key, String(value)];
    }),
  );
}

export function collectModelObjectTree(root: Object3D): ModelObjectNode[] {
  const nodes: ModelObjectNode[] = [];
  let unnamedIndex = 0;

  root.traverse((object) => {
    if (object.type !== "Group" && object.type !== "Object3D" && !(object instanceof Mesh)) {
      return;
    }

    if (!object.name) {
      unnamedIndex += 1;
    }

    const parent = object.parent;
    const displayName = createDisplayName(object, unnamedIndex);
    const parentName = parent ? parent.name || parent.type : "";
    const worldPosition = new Vector3();
    object.getWorldPosition(worldPosition);

    nodes.push({
      id: object.uuid,
      name: displayName,
      originalName: object.name,
      type: object.type,
      uuid: object.uuid,
      parentName,
      parentUuid: parent?.uuid ?? "",
      depth: getDepth(object, root),
      childrenCount: object.children.length,
      position: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z,
      },
      worldPosition: toSnapshot(worldPosition),
      rotation: {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z,
      },
      scale: {
        x: object.scale.x,
        y: object.scale.y,
        z: object.scale.z,
      },
      boundingBox: getBoundingBox(object),
      userData: toUserDataSnapshot(object.userData),
    });
  });

  return nodes;
}

export function logModelObjectTree(nodes: ModelObjectNode[]): void {
  console.group("[TwinDemo] Model object tree");
  console.table(
    nodes.map((node) => ({
      name: node.name,
      type: node.type,
      uuid: node.uuid,
      parentName: node.parentName,
      position: node.position,
      rotation: node.rotation,
      scale: node.scale,
      boundingBox: node.boundingBox,
    })),
  );
  console.groupEnd();
}
