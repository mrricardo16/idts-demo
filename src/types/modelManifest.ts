import type { ModelLODLevel, ModelTransformSettings } from "./twin";

export interface ModelManifestLevels {
  source: string;
  high: string;
  medium: string;
  low: string;
  proxy: string;
}

export interface ModelManifestLOD {
  autoLoadHighOnSelect: boolean;
  allowGeneratedProxy: boolean;
}

export interface ModelManifestTransform extends ModelTransformSettings {
  upAxis: "X" | "Y" | "Z";
}

export interface ModelManifestSemantic {
  movableParts: string[];
  selectableParts: string[];
}

export interface ModelManifest {
  modelId: string;
  modelName: string;
  defaultLevel: ModelLODLevel;
  levels: ModelManifestLevels;
  lod: ModelManifestLOD;
  transform: ModelManifestTransform;
  semantic: ModelManifestSemantic;
}
