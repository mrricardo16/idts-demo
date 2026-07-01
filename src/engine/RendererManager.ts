import { ACESFilmicToneMapping, PCFSoftShadowMap, Scene, WebGLRenderer } from "three";
import type { PerspectiveCamera } from "three";
import { backgroundConfig } from "../config/backgroundConfig";

export class RendererManager {
  readonly renderer: WebGLRenderer;
  private readonly useScreenFixedBackground = backgroundConfig.renderMode === "screen-fixed";

  constructor(container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: this.useScreenFixedBackground });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    if (this.useScreenFixedBackground) {
      this.renderer.setClearAlpha(0);
      container.style.backgroundColor = backgroundConfig.fallbackBottomColor;
      container.style.backgroundImage = `url("${backgroundConfig.panoramaUrl}")`;
      container.style.backgroundPosition = "center";
      container.style.backgroundSize = "cover";
    }
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
  }

  resize(container: HTMLElement): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
