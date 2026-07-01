import type { Material, Object3D, Texture } from "three";

interface DisposableGeometry {
  dispose: () => void;
}

interface DisposableMaterial extends Material {
  [key: string]: unknown;
}

export interface ResourceDisposeSummary {
  geometries: number;
  materials: number;
  textures: number;
}

export interface ResourceDisposeOptions {
  removeFromParent?: boolean;
  disposeEnvMap?: boolean;
}

const textureFields = [
  "map",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "emissiveMap",
  "aoMap",
  "alphaMap",
  "bumpMap",
  "displacementMap",
  "lightMap",
  "specularMap",
  "clearcoatMap",
  "clearcoatNormalMap",
  "clearcoatRoughnessMap",
  "sheenColorMap",
  "sheenRoughnessMap",
  "transmissionMap",
  "thicknessMap",
  "iridescenceMap",
  "iridescenceThicknessMap",
];

function isTexture(value: unknown): value is Texture {
  return Boolean(
    value &&
      typeof value === "object" &&
      "isTexture" in value &&
      (value as { isTexture?: boolean }).isTexture,
  );
}

function getObjectGeometry(object: Object3D): DisposableGeometry | undefined {
  const geometry = (object as Object3D & { geometry?: DisposableGeometry }).geometry;
  return geometry && typeof geometry.dispose === "function" ? geometry : undefined;
}

function getObjectMaterials(object: Object3D): DisposableMaterial[] {
  const material = (object as Object3D & { material?: DisposableMaterial | DisposableMaterial[] }).material;
  if (!material) {
    return [];
  }

  return Array.isArray(material) ? material : [material];
}

export class ResourceDisposer {
  static disposeObject3D(
    object: Object3D,
    options: ResourceDisposeOptions = {},
  ): ResourceDisposeSummary {
    const geometries = new Set<DisposableGeometry>();
    const materials = new Set<DisposableMaterial>();
    const textures = new Set<Texture>();

    object.traverse((child) => {
      const geometry = getObjectGeometry(child);
      if (geometry) {
        geometries.add(geometry);
      }

      for (const material of getObjectMaterials(child)) {
        materials.add(material);
        for (const field of textureFields) {
          const texture = material[field];
          if (isTexture(texture)) {
            textures.add(texture);
          }
        }

        if (options.disposeEnvMap && isTexture(material.envMap)) {
          textures.add(material.envMap);
        }
      }
    });

    for (const texture of textures) {
      texture.dispose();
    }

    for (const material of materials) {
      material.dispose();
    }

    for (const geometry of geometries) {
      geometry.dispose();
    }

    if (options.removeFromParent) {
      object.parent?.remove(object);
    }

    return {
      geometries: geometries.size,
      materials: materials.size,
      textures: textures.size,
    };
  }
}
