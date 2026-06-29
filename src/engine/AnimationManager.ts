import type { Object3D } from "three";

export class AnimationManager {
  private readonly startedAt = performance.now();

  constructor(private readonly root: Object3D) {}

  update(): void {
    const elapsed = (performance.now() - this.startedAt) / 1000;

    const platform = this.root.getObjectByName("lifter-platform");
    if (platform) {
      const baseY = Number(platform.userData.baseY ?? platform.position.y);
      platform.position.y = baseY + Math.sin(elapsed * 1.1) * 0.38;
    }

    this.updatePallet("pallet-01", elapsed, 0);
    this.updatePallet("pallet-02", elapsed, Math.PI);
  }

  private updatePallet(meshName: string, elapsed: number, offset: number): void {
    const pallet = this.root.getObjectByName(meshName);
    if (!pallet) {
      return;
    }

    const baseX = Number(pallet.userData.baseX ?? pallet.position.x);
    pallet.position.x = baseX + Math.sin(elapsed * 0.8 + offset) * 0.92;
  }
}
