import { Box3, Mesh, Vector3 } from "three";
import type { Material, Object3D, Texture, WebGLRenderer } from "three";
import type { ModelLODLevel, ModelPerformanceStats, TwinSceneMode } from "../types/twin";

export interface ModelStructureStats {
  meshCount: number;
  materialCount: number;
  textureCount: number;
  vertexCount: number;
  triangleCount: number;
  boxSize: {
    x: number;
    y: number;
    z: number;
  };
  first100NodeNames: string[];
}

function getMeshTriangleCount(mesh: Mesh): number {
  const geometry = mesh.geometry;
  const index = geometry.index;
  if (index) {
    return Math.floor(index.count / 3);
  }

  const position = geometry.getAttribute("position");
  return position ? Math.floor(position.count / 3) : 0;
}

function getMeshMaterials(mesh: Mesh): Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function isTexture(value: unknown): value is Texture {
  return Boolean(
    value &&
      typeof value === "object" &&
      "isTexture" in value &&
      (value as { isTexture?: boolean }).isTexture,
  );
}

function collectMaterialTextures(material: Material, textures: Set<Texture>): void {
  const values = Object.values(material as unknown as Record<string, unknown>);
  for (const value of values) {
    if (isTexture(value)) {
      textures.add(value);
    }
  }
}

export function collectModelStructureStats(root: Object3D): ModelStructureStats {
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const nodeNames: string[] = [];
  let meshCount = 0;
  let triangleCount = 0;
  let vertexCount = 0;

  root.traverse((object) => {
    if (object.name && nodeNames.length < 100) {
      nodeNames.push(object.name);
    }

    if (!(object instanceof Mesh)) {
      return;
    }

    meshCount += 1;
    triangleCount += getMeshTriangleCount(object);
    vertexCount += object.geometry.getAttribute("position")?.count ?? 0;

    for (const material of getMeshMaterials(object)) {
      materials.add(material);
      collectMaterialTextures(material, textures);
    }
  });

  const box = new Box3().setFromObject(root);
  const size = new Vector3();
  box.getSize(size);

  return {
    meshCount,
    triangleCount,
    materialCount: materials.size,
    vertexCount,
    textureCount: textures.size,
    boxSize: {
      x: size.x,
      y: size.y,
      z: size.z,
    },
    first100NodeNames: nodeNames,
  };
}

export function createModelPerformanceStats(
  structureStats: ModelStructureStats,
  renderer: WebGLRenderer,
  currentLevel: ModelLODLevel,
  currentUrl: string | undefined,
  fps: number,
  runtimeStats: {
    sceneMode: TwinSceneMode;
    deviceCount: number;
    modelInstanceCount: number;
  },
): ModelPerformanceStats {
  return {
    sceneMode: runtimeStats.sceneMode,
    currentLevel,
    currentUrl,
    deviceCount: runtimeStats.deviceCount,
    modelInstanceCount: runtimeStats.modelInstanceCount,
    fps,
    meshCount: structureStats.meshCount,
    materialCount: structureStats.materialCount,
    textureCount: structureStats.textureCount,
    vertexCount: structureStats.vertexCount,
    triangleCount: structureStats.triangleCount,
    rendererRenderCalls: renderer.info.render.calls,
    rendererRenderTriangles: renderer.info.render.triangles,
    rendererMemoryGeometries: renderer.info.memory.geometries,
    rendererMemoryTextures: renderer.info.memory.textures,
  };
}

export function collectModelPerformanceStats(
  root: Object3D,
  renderer: WebGLRenderer,
  currentLevel: ModelLODLevel,
  currentUrl?: string,
  fps = 0,
  runtimeStats = {
    sceneMode: "single" as TwinSceneMode,
    deviceCount: 1,
    modelInstanceCount: 1,
  },
): ModelPerformanceStats & ModelStructureStats {
  const structureStats = collectModelStructureStats(root);

  return {
    ...structureStats,
    ...createModelPerformanceStats(structureStats, renderer, currentLevel, currentUrl, fps, runtimeStats),
  };
}

export function logModelPerformanceStats(
  root: Object3D,
  renderer: WebGLRenderer,
  currentLevel: ModelLODLevel,
  currentUrl?: string,
): void {
  const stats = collectModelPerformanceStats(root, renderer, currentLevel, currentUrl);

  console.group("[TwinDemo] GLB model performance stats");
  console.table({
    currentLevel: stats.currentLevel,
    currentUrl: stats.currentUrl,
    meshCount: stats.meshCount,
    triangleCount: stats.triangleCount,
    materialCount: stats.materialCount,
    vertexCount: stats.vertexCount,
    textureCount: stats.textureCount,
    rendererRenderCalls: stats.rendererRenderCalls,
    rendererRenderTriangles: stats.rendererRenderTriangles,
    rendererMemoryGeometries: stats.rendererMemoryGeometries,
    rendererMemoryTextures: stats.rendererMemoryTextures,
    boxSizeX: stats.boxSize.x,
    boxSizeY: stats.boxSize.y,
    boxSizeZ: stats.boxSize.z,
  });
  console.log("Box3 size", stats.boxSize);
  console.log("First 100 node.name", stats.first100NodeNames);
  console.groupEnd();
}
