import { Box3, MathUtils, Sphere, Vector3, type Object3D, type PerspectiveCamera } from "three";
import { cameraControlConfig } from "../config/cameraControlConfig";
import type { VectorSnapshot } from "../types/twin";

export interface FreeLookDebugState {
  cameraDistance: number;
  focusPoint: VectorSnapshot;
  cameraForward: VectorSnapshot;
  cameraPosition: VectorSnapshot;
  yawDeg: number;
  pitchDeg: number;
  wheelMoveSpeed: number;
  lookSensitivity: number;
  invertLookX: boolean;
  invertLookY: boolean;
  keyboardMove: "enabled" | "disabled";
  keyboardMoveMode: "ground" | "fly";
  pressedKeys: string[];
  active: boolean;
  keyMoveSpeed: number;
  minDistance: number;
  maxDistance: number;
}

export class FreeLookControls {
  private static readonly worldUp = new Vector3(0, 0, 1);

  private readonly defaultCameraPosition = new Vector3(
    cameraControlConfig.camera.position.x,
    cameraControlConfig.camera.position.y,
    cameraControlConfig.camera.position.z,
  );
  private readonly defaultFocusPoint = new Vector3(0, 0, 3.5);
  private readonly defaultCameraOffset = this.defaultCameraPosition.clone().sub(this.defaultFocusPoint);
  private readonly minPitch = MathUtils.degToRad(cameraControlConfig.navigation.pitchMinDeg);
  private readonly maxPitch = MathUtils.degToRad(cameraControlConfig.navigation.pitchMaxDeg);
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly moveDirection = new Vector3();
  private readonly focusPoint = this.defaultFocusPoint.clone();
  private readonly modelCenter = this.defaultFocusPoint.clone();
  private readonly pressedKeys = new Set<string>();

  private yaw = 0;
  private pitch = 0;
  private modelRadius = 10;
  private minDistance = cameraControlConfig.controls.minDistance;
  private maxDistance = cameraControlConfig.controls.maxDistance;
  private lastUpdateTime = performance.now();
  private isActive = false;
  private pointerState:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        lastX: number;
        lastY: number;
        isLooking: boolean;
      }
    | undefined;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly domElement: HTMLElement,
    private readonly onChange: () => void,
  ) {
    this.camera.up.copy(FreeLookControls.worldUp);
    this.syncAnglesFromCamera();
    this.applyLookDirection();
    this.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.domElement.addEventListener("pointerup", this.handlePointerUp);
    this.domElement.addEventListener("pointercancel", this.handlePointerCancel);
    this.domElement.addEventListener("wheel", this.handleWheel, { passive: false });
    this.domElement.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleWindowBlur);
  }

  update(): void {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1);
    this.lastUpdateTime = now;
    this.updateKeyboardMovement(deltaTime);
    this.applyLookDirection();
  }

  getDebugState(): FreeLookDebugState {
    this.getForward(this.forward);
    return {
      cameraDistance: this.camera.position.distanceTo(this.focusPoint),
      focusPoint: this.toVectorSnapshot(this.focusPoint),
      cameraForward: this.toVectorSnapshot(this.forward),
      cameraPosition: this.toVectorSnapshot(this.camera.position),
      yawDeg: MathUtils.radToDeg(this.yaw),
      pitchDeg: MathUtils.radToDeg(this.pitch),
      wheelMoveSpeed: cameraControlConfig.navigation.wheelMoveSpeed,
      lookSensitivity: cameraControlConfig.navigation.lookSensitivity,
      invertLookX: cameraControlConfig.navigation.invertLookX,
      invertLookY: cameraControlConfig.navigation.invertLookY,
      keyboardMove: cameraControlConfig.navigation.enableKeyboardMove ? "enabled" : "disabled",
      keyboardMoveMode: cameraControlConfig.navigation.keyboardMoveMode,
      pressedKeys: Array.from(this.pressedKeys).sort(),
      active: this.isActive,
      keyMoveSpeed: cameraControlConfig.navigation.keyMoveSpeed,
      minDistance: this.minDistance,
      maxDistance: this.maxDistance,
    };
  }

  focusModel(root: Object3D): boolean {
    const sphere = this.createBoundingSphere(root);
    if (!sphere) {
      return false;
    }

    this.modelCenter.copy(sphere.center);
    this.focusPoint.copy(sphere.center);
    this.modelRadius = sphere.radius;
    this.setModelDistanceRange(sphere.radius);
    this.focusSphere(sphere, 1.35);
    return true;
  }

  focusObject(object: Object3D, options: { padding?: number } = {}): boolean {
    const sphere = this.createBoundingSphere(object);
    if (!sphere) {
      return false;
    }

    const radius = Math.max(sphere.radius, 0.01);
    this.minDistance = Math.max(radius * 0.05, 0.02);
    this.maxDistance = Math.max(radius * 50, 100);
    this.focusSphere(sphere, options.padding ?? 1.3);
    return true;
  }

  resetView(): void {
    this.setModelDistanceRange(this.modelRadius);
    this.focusPoint.copy(this.modelCenter);
    this.camera.position.copy(this.modelCenter).add(this.defaultCameraOffset);
    this.lookAt(this.modelCenter);
    this.camera.updateProjectionMatrix();
    this.onChange();
  }

  dispose(): void {
    this.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.domElement.removeEventListener("pointermove", this.handlePointerMove);
    this.domElement.removeEventListener("pointerup", this.handlePointerUp);
    this.domElement.removeEventListener("pointercancel", this.handlePointerCancel);
    this.domElement.removeEventListener("wheel", this.handleWheel);
    this.domElement.removeEventListener("contextmenu", this.handleContextMenu);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleWindowBlur);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.isActive = true;
    if (event.button !== 0) {
      return;
    }

    this.pointerState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      isLooking: false,
    };
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.pointerState || this.pointerState.pointerId !== event.pointerId) {
      return;
    }

    const distanceFromStart = Math.hypot(
      event.clientX - this.pointerState.startX,
      event.clientY - this.pointerState.startY,
    );
    if (!this.pointerState.isLooking) {
      if (distanceFromStart <= cameraControlConfig.navigation.dragThresholdPx) {
        return;
      }

      this.pointerState.isLooking = true;
      this.pointerState.lastX = event.clientX;
      this.pointerState.lastY = event.clientY;
      return;
    }

    const deltaX = event.clientX - this.pointerState.lastX;
    const deltaY = event.clientY - this.pointerState.lastY;
    this.pointerState.lastX = event.clientX;
    this.pointerState.lastY = event.clientY;
    const xSign = cameraControlConfig.navigation.invertLookX ? 1 : -1;
    const ySign = cameraControlConfig.navigation.invertLookY ? -1 : 1;
    this.yaw += deltaX * cameraControlConfig.navigation.lookSensitivity * xSign;
    this.pitch = MathUtils.clamp(
      this.pitch + deltaY * cameraControlConfig.navigation.lookSensitivity * ySign,
      this.minPitch,
      this.maxPitch,
    );
    this.applyLookDirection();
    this.onChange();
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.pointerState?.pointerId === event.pointerId) {
      this.pointerState = undefined;
    }
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (this.pointerState?.pointerId === event.pointerId) {
      this.pointerState = undefined;
    }
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    this.isActive = true;
    event.preventDefault();
    this.getForward(this.forward);
    const stepScale = MathUtils.clamp(Math.abs(event.deltaY) / 100, 0.25, 4);
    const directionSign = event.deltaY < 0 ? 1 : -1;
    const distance = cameraControlConfig.navigation.wheelMoveSpeed * stepScale * directionSign;
    const nextPosition = this.camera.position.clone().addScaledVector(this.forward, distance);
    const maxDistance = Math.max(
      this.modelRadius * cameraControlConfig.navigation.maxDistanceMultiplier,
      this.maxDistance,
    );
    const distanceToFocus = nextPosition.distanceTo(this.focusPoint);
    if (distanceToFocus <= maxDistance) {
      nextPosition.z = Math.max(nextPosition.z, cameraControlConfig.navigation.minCameraZ);
      this.camera.position.copy(nextPosition);
      this.applyLookDirection();
      this.onChange();
    }
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!cameraControlConfig.navigation.enableKeyboardMove || !this.isActive || this.isEditableTarget(event.target)) {
      return;
    }

    const key = this.normalizeKey(event);
    if (!key) {
      return;
    }

    this.pressedKeys.add(key);
    event.preventDefault();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const key = this.normalizeKey(event);
    if (key) {
      this.pressedKeys.delete(key);
    }
  };

  private readonly handleWindowBlur = (): void => {
    this.pressedKeys.clear();
  };

  private createBoundingSphere(object: Object3D): Sphere | undefined {
    const box = new Box3().setFromObject(object);
    if (box.isEmpty()) {
      return undefined;
    }

    const sphere = new Sphere();
    box.getBoundingSphere(sphere);
    if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) {
      return undefined;
    }

    return sphere;
  }

  private focusSphere(sphere: Sphere, padding: number): void {
    const radius = Math.max(sphere.radius, 0.01);
    const fovRadians = MathUtils.degToRad(this.camera.fov);
    const distance = Math.max((radius * padding) / Math.sin(fovRadians / 2), this.minDistance * 1.5);
    this.getForward(this.forward);
    if (this.forward.lengthSq() < 0.0001) {
      this.forward.set(1, -1, 0.7).normalize();
    }

    this.focusPoint.copy(sphere.center);
    this.camera.position.copy(sphere.center).addScaledVector(this.forward, -distance);
    this.lookAt(sphere.center);
    this.camera.updateProjectionMatrix();
    this.onChange();
  }

  private lookAt(target: Vector3): void {
    this.camera.lookAt(target);
    this.syncAnglesFromCamera();
    this.applyLookDirection();
  }

  private applyLookDirection(): void {
    this.getForward(this.forward);
    this.camera.lookAt(this.camera.position.clone().add(this.forward));
  }

  private updateKeyboardMovement(deltaTime: number): void {
    if (
      !cameraControlConfig.navigation.enableKeyboardMove ||
      !this.isActive ||
      this.pressedKeys.size === 0 ||
      deltaTime <= 0
    ) {
      return;
    }

    this.getMoveBasis(this.forward, this.right);
    this.moveDirection.set(0, 0, 0);
    if (this.pressedKeys.has("w")) {
      this.moveDirection.add(this.forward);
    }
    if (this.pressedKeys.has("s")) {
      this.moveDirection.sub(this.forward);
    }
    if (this.pressedKeys.has("d")) {
      this.moveDirection.add(this.right);
    }
    if (this.pressedKeys.has("a")) {
      this.moveDirection.sub(this.right);
    }
    if (this.pressedKeys.has("e")) {
      this.moveDirection.add(FreeLookControls.worldUp);
    }
    if (this.pressedKeys.has("q")) {
      this.moveDirection.sub(FreeLookControls.worldUp);
    }
    if (this.moveDirection.lengthSq() <= 0) {
      return;
    }

    const boost = this.pressedKeys.has("shift") ? cameraControlConfig.navigation.keyBoostMultiplier : 1;
    const distance = cameraControlConfig.navigation.keyMoveSpeed * boost * deltaTime;
    this.moveDirection.normalize().multiplyScalar(distance);
    this.camera.position.add(this.moveDirection);
    this.camera.position.z = Math.max(this.camera.position.z, cameraControlConfig.navigation.minCameraZ);
    this.onChange();
  }

  private getMoveBasis(forward: Vector3, right: Vector3): void {
    this.camera.getWorldDirection(forward).normalize();
    if (cameraControlConfig.navigation.keyboardMoveMode === "ground") {
      forward.z = 0;
      if (forward.lengthSq() < 0.0001) {
        this.getForward(forward);
        forward.z = 0;
      }
      if (forward.lengthSq() < 0.0001) {
        forward.set(0, 1, 0);
      }
      forward.normalize();
      right.crossVectors(forward, FreeLookControls.worldUp).normalize();
      return;
    }

    right.crossVectors(forward, FreeLookControls.worldUp);
    if (right.lengthSq() < 0.0001) {
      right.set(1, 0, 0);
    } else {
      right.normalize();
    }
  }

  private getForward(target: Vector3): Vector3 {
    const cosPitch = Math.cos(this.pitch);
    target.set(Math.sin(this.yaw) * cosPitch, Math.cos(this.yaw) * cosPitch, Math.sin(this.pitch));
    return target.normalize();
  }

  private syncAnglesFromCamera(): void {
    this.camera.getWorldDirection(this.forward).normalize();
    this.pitch = MathUtils.clamp(Math.asin(MathUtils.clamp(this.forward.z, -1, 1)), this.minPitch, this.maxPitch);
    this.yaw = Math.atan2(this.forward.x, this.forward.y);
  }

  private normalizeKey(event: KeyboardEvent): string | undefined {
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      return "shift";
    }

    const key = event.key.toLowerCase();
    if (key === "w" || key === "a" || key === "s" || key === "d" || key === "q" || key === "e") {
      return key;
    }

    return undefined;
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target.isContentEditable
    );
  }

  private setModelDistanceRange(radius: number): void {
    const safeRadius = Math.max(radius, 0.01);
    this.minDistance = Math.max(safeRadius * 0.001, 0.01);
    this.maxDistance = Math.max(safeRadius * 50, 500);
  }

  private toVectorSnapshot(vector: Vector3): VectorSnapshot {
    return {
      x: vector.x,
      y: vector.y,
      z: vector.z,
    };
  }
}
