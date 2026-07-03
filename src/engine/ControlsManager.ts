import type { Object3D, PerspectiveCamera } from "three";
import { FreeLookControls } from "./FreeLookControls";
import type { CameraControlDebugState } from "../types/twin";

export class ControlsManager {
  private readonly freeLookControls: FreeLookControls;

  constructor(camera: PerspectiveCamera, domElement: HTMLElement, onChange: () => void) {
    this.freeLookControls = new FreeLookControls(camera, domElement, onChange);
  }

  update(): void {
    this.freeLookControls.update();
  }

  getDebugState(): CameraControlDebugState {
    const state = this.freeLookControls.getDebugState();
    return {
      navigationMode: "free-look",
      orbitControls: "disabled",
      zoomMode: "move-along-camera-forward",
      zoomToCursor: false,
      customWheelZoom: "free-look-wheel",
      leftMouse: "look direction",
      rightMouse: "disabled",
      wheelZoomFocus: "camera.forward",
      controlsTargetUsage: "not used for wheel zoom",
      modelSelfRotation: "disabled",
      cameraDistance: state.cameraDistance,
      controlsTarget: state.focusPoint,
      cameraForward: state.cameraForward,
      cameraPosition: state.cameraPosition,
      yawDeg: state.yawDeg,
      pitchDeg: state.pitchDeg,
      wheelMoveSpeed: state.wheelMoveSpeed,
      lookSensitivity: state.lookSensitivity,
      invertLookX: state.invertLookX,
      invertLookY: state.invertLookY,
      keyboardMove: state.keyboardMove,
      keyboardMoveMode: state.keyboardMoveMode,
      keyboardActiveSource: state.keyboardActiveSource,
      pressedKeys: state.pressedKeys,
      navigationActive: state.active,
      keyMoveSpeed: state.keyMoveSpeed,
      minDistance: state.minDistance,
      maxDistance: state.maxDistance,
    };
  }

  focusModel(root: Object3D): boolean {
    return this.freeLookControls.focusModel(root);
  }

  focusObject(object: Object3D, options: { padding?: number } = {}): boolean {
    return this.freeLookControls.focusObject(object, options);
  }

  resetView(): void {
    this.freeLookControls.resetView();
  }

  needsContinuousRender(): boolean {
    return this.freeLookControls.needsContinuousRender();
  }

  dispose(): void {
    this.freeLookControls.dispose();
  }
}
