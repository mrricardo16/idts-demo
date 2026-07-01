import { Object3D, Raycaster, Vector2, type Camera, type Intersection } from "three";

export type ObjectSelectHandler = (uuid: string) => void;
export type InteractionPickMode = "mesh" | "hitbox";
export interface InteractionPointerInfo {
  clientX: number;
  clientY: number;
  canvasX: number;
  canvasY: number;
  canvasWidth: number;
  canvasHeight: number;
  ndcX: number;
  ndcY: number;
}
export type ObjectMissHandler = (pointer: InteractionPointerInfo) => void;

export class InteractionManager {
  private static readonly clickMoveThreshold = 5;
  private static readonly clickTimeThresholdMs = 500;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private pointerDown:
    | {
        button: number;
        clientX: number;
        clientY: number;
        time: number;
      }
    | undefined;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly camera: Camera,
    private readonly root: Object3D,
    private readonly onSelect: ObjectSelectHandler,
    private hitTestRoots: Object3D[] = [root],
    private pickMode: InteractionPickMode = "mesh",
    private readonly onMiss?: ObjectMissHandler,
  ) {
    this.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.domElement.addEventListener("pointerup", this.handlePointerUp);
    this.domElement.addEventListener("pointercancel", this.handlePointerCancel);
  }

  setHitTestRoots(hitTestRoots: Object3D[]): void {
    this.hitTestRoots = hitTestRoots.length > 0 ? hitTestRoots : [this.root];
  }

  setPickMode(pickMode: InteractionPickMode): void {
    this.pickMode = pickMode;
  }

  select(meshName: string): void {
    const object = this.root.getObjectByName(meshName);
    if (object) {
      this.onSelect(object.uuid);
    }
  }

  selectObjectByUuid(uuid: string): void {
    const object = this.root.getObjectByProperty("uuid", uuid);
    if (object) {
      this.onSelect(object.uuid);
    }
  }

  clear(): void {
    this.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.domElement.removeEventListener("pointerup", this.handlePointerUp);
    this.domElement.removeEventListener("pointercancel", this.handlePointerCancel);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerDown = {
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
      time: event.timeStamp,
    };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.isLeftClick(event)) {
      this.pointerDown = undefined;
      return;
    }

    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const pointerInfo: InteractionPointerInfo = {
      clientX: event.clientX,
      clientY: event.clientY,
      canvasX: event.clientX - rect.left,
      canvasY: event.clientY - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      ndcX: this.pointer.x,
      ndcY: this.pointer.y,
    };

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.hitTestRoots, true);
    const target = this.findSelectable(intersections);
    if (!target) {
      this.onMiss?.(pointerInfo);
      return;
    }

    this.onSelect(String(target.userData.selectTargetUuid || target.uuid));
  };

  private readonly handlePointerCancel = (): void => {
    this.pointerDown = undefined;
  };

  private isLeftClick(event: PointerEvent): boolean {
    if (!this.pointerDown || this.pointerDown.button !== 0 || event.button !== 0) {
      return false;
    }

    const deltaX = event.clientX - this.pointerDown.clientX;
    const deltaY = event.clientY - this.pointerDown.clientY;
    const moveDistance = Math.hypot(deltaX, deltaY);
    const elapsed = event.timeStamp - this.pointerDown.time;
    this.pointerDown = undefined;

    return (
      moveDistance <= InteractionManager.clickMoveThreshold &&
      elapsed <= InteractionManager.clickTimeThresholdMs
    );
  }

  private findSelectable(intersections: Intersection[]): Object3D | undefined {
    if (this.pickMode === "hitbox") {
      return (
        intersections.find((intersection) => intersection.object.userData.isHitBox)?.object ??
        intersections.find((intersection) => !intersection.object.userData.isHitBox)?.object
      );
    }

    return intersections.find((intersection) => !intersection.object.userData.isHitBox)?.object;
  }
}
