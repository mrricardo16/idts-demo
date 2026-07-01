import type { Object3D, WebGLRenderer } from "three";
import {
  collectModelStructureStats,
  createModelPerformanceStats,
  type ModelStructureStats,
} from "./ModelStats";
import type { ModelLODLevel, ModelPerformanceStats, TwinSceneMode } from "../types/twin";

export interface PerformanceRuntimeStats {
  sceneMode: TwinSceneMode;
  deviceCount: number;
  modelInstanceCount: number;
}

export class PerformanceMonitor {
  private structureStats?: ModelStructureStats;
  private currentLevel: ModelLODLevel = "source";
  private currentUrl?: string;
  private runtimeStats: PerformanceRuntimeStats = {
    sceneMode: "single",
    deviceCount: 1,
    modelInstanceCount: 1,
  };
  private fps = 0;
  private frameCount = 0;
  private lastFpsSampleTime = performance.now();

  setModel(
    root: Object3D,
    currentLevel: ModelLODLevel,
    currentUrl?: string,
    runtimeStats: Partial<PerformanceRuntimeStats> = {},
  ): void {
    this.structureStats = collectModelStructureStats(root);
    this.currentLevel = currentLevel;
    this.currentUrl = currentUrl;
    this.runtimeStats = {
      sceneMode: runtimeStats.sceneMode ?? "single",
      deviceCount: runtimeStats.deviceCount ?? 1,
      modelInstanceCount: runtimeStats.modelInstanceCount ?? 1,
    };
    this.resetFpsWindow();
  }

  clearModel(): void {
    this.structureStats = undefined;
    this.currentUrl = undefined;
    this.runtimeStats = {
      sceneMode: "single",
      deviceCount: 0,
      modelInstanceCount: 0,
    };
    this.fps = 0;
    this.resetFpsWindow();
  }

  recordFrame(now = performance.now()): void {
    this.frameCount += 1;
    const elapsedMs = now - this.lastFpsSampleTime;
    if (elapsedMs < 1000) {
      return;
    }

    this.fps = Math.round((this.frameCount * 1000) / elapsedMs);
    this.frameCount = 0;
    this.lastFpsSampleTime = now;
  }

  getStats(renderer: WebGLRenderer): ModelPerformanceStats | undefined {
    if (!this.structureStats) {
      return undefined;
    }

    return createModelPerformanceStats(
      this.structureStats,
      renderer,
      this.currentLevel,
      this.currentUrl,
      this.fps,
      this.runtimeStats,
    );
  }

  private resetFpsWindow(): void {
    this.frameCount = 0;
    this.lastFpsSampleTime = performance.now();
  }
}
