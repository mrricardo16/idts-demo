import { Vector3, type Object3D } from "three";

interface MoveByWorldZRequest {
  object: Object3D;
  targetWorldPosition: Vector3;
  unitsPerSecond: number;
  minWorldZ?: number;
  maxWorldZ?: number;
  onUpdate?: (currentWorldPosition: Vector3) => void;
  onComplete?: () => void;
}

interface ActiveMove extends MoveByWorldZRequest {
  lastUpdateTime: number;
  startLocalPosition: Vector3;
  startWorldPosition: Vector3;
  targetLocalPosition: Vector3;
  distance: number;
}

function getWorldPosition(object: Object3D): Vector3 {
  object.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function worldToParentLocal(object: Object3D, worldPosition: Vector3): Vector3 {
  const localPosition = worldPosition.clone();
  object.parent?.updateMatrixWorld(true);
  object.parent?.worldToLocal(localPosition);
  return localPosition;
}

function clampWorldZ(worldPosition: Vector3, minWorldZ?: number, maxWorldZ?: number): Vector3 {
  if (minWorldZ === undefined && maxWorldZ === undefined) {
    return worldPosition;
  }

  const minZ = minWorldZ ?? -Infinity;
  const maxZ = maxWorldZ ?? Infinity;
  const clampedZ = Math.min(maxZ, Math.max(minZ, worldPosition.z));
  if (clampedZ === worldPosition.z) {
    return worldPosition;
  }

  const clampedPosition = worldPosition.clone();
  clampedPosition.z = clampedZ;
  return clampedPosition;
}

export class AnimationManager {
  private activeMove?: ActiveMove;

  hasActiveAnimation(): boolean {
    return Boolean(this.activeMove);
  }

  moveObjectByWorldZ(object: Object3D, deltaZ: number): Vector3 {
    const targetWorldPosition = getWorldPosition(object);
    targetWorldPosition.z += deltaZ;
    object.position.copy(worldToParentLocal(object, targetWorldPosition));
    object.updateMatrixWorld(true);
    return targetWorldPosition;
  }

  moveObjectToWorldPosition(request: MoveByWorldZRequest): void {
    const startLocalPosition = request.object.position.clone();
    const startWorldPosition = getWorldPosition(request.object);
    const targetWorldPosition = clampWorldZ(
      request.targetWorldPosition,
      request.minWorldZ,
      request.maxWorldZ,
    );
    const targetLocalPosition = worldToParentLocal(request.object, targetWorldPosition);
    const distance = startWorldPosition.distanceTo(targetWorldPosition);

    this.activeMove = {
      ...request,
      targetWorldPosition,
      startLocalPosition,
      startWorldPosition,
      targetLocalPosition,
      distance,
      lastUpdateTime: performance.now(),
    };
    request.onUpdate?.(getWorldPosition(request.object));
  }

  update(): boolean {
    if (!this.activeMove) {
      return false;
    }

    const now = performance.now();
    const deltaSeconds = Math.max(0, (now - this.activeMove.lastUpdateTime) / 1000);
    this.activeMove.lastUpdateTime = now;

    if (this.activeMove.distance <= 0) {
      this.activeMove.object.position.copy(this.activeMove.targetLocalPosition);
      this.activeMove.object.updateMatrixWorld(true);
      const currentWorldPosition = clampWorldZ(
        getWorldPosition(this.activeMove.object),
        this.activeMove.minWorldZ,
        this.activeMove.maxWorldZ,
      );
      this.activeMove.object.position.copy(worldToParentLocal(this.activeMove.object, currentWorldPosition));
      this.activeMove.object.updateMatrixWorld(true);
      this.activeMove.onUpdate?.(currentWorldPosition);
      this.activeMove.onComplete?.();
      this.activeMove = undefined;
      return false;
    }

    const currentStep = getWorldPosition(this.activeMove.object).distanceTo(
      this.activeMove.startWorldPosition,
    );
    const nextStep = Math.min(
      this.activeMove.distance,
      currentStep + this.activeMove.unitsPerSecond * deltaSeconds,
    );
    const progress = nextStep / this.activeMove.distance;
    this.activeMove.object.position.lerpVectors(
      this.activeMove.startLocalPosition,
      this.activeMove.targetLocalPosition,
      progress,
    );
    this.activeMove.object.updateMatrixWorld(true);
    const currentWorldPosition = clampWorldZ(
      getWorldPosition(this.activeMove.object),
      this.activeMove.minWorldZ,
      this.activeMove.maxWorldZ,
    );
    this.activeMove.object.position.copy(worldToParentLocal(this.activeMove.object, currentWorldPosition));
    this.activeMove.object.updateMatrixWorld(true);
    this.activeMove.onUpdate?.(currentWorldPosition);

    if (progress >= 1) {
      this.activeMove.onComplete?.();
      this.activeMove = undefined;
      return false;
    }

    return true;
  }
}
