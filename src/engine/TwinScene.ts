import type { Group } from "three";
import { AnimationManager } from "./AnimationManager";
import { CameraManager } from "./CameraManager";
import { ControlsManager } from "./ControlsManager";
import { InteractionManager } from "./InteractionManager";
import { ModelLoader } from "./ModelLoader";
import { RendererManager } from "./RendererManager";
import { SceneManager } from "./SceneManager";
import { StatusManager } from "./StatusManager";
import type { ModelLoadState, TwinDevice } from "../types/twin";

interface TwinSceneCallbacks {
  onLoadStateChange: (state: ModelLoadState) => void;
  onDevicesChange: (devices: TwinDevice[]) => void;
  onSelectDevice: (device: TwinDevice | undefined) => void;
}

export class TwinScene {
  private readonly sceneManager: SceneManager;
  private readonly cameraManager: CameraManager;
  private readonly rendererManager: RendererManager;
  private readonly controlsManager: ControlsManager;
  private readonly modelLoader = new ModelLoader();
  private readonly statusManager = new StatusManager();
  private animationManager?: AnimationManager;
  private interactionManager?: InteractionManager;
  private modelRoot?: Group;
  private animationFrameId = 0;
  private statusTimerId = 0;
  private selectedMeshName = "";
  private isDisposed = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: TwinSceneCallbacks,
  ) {
    this.sceneManager = new SceneManager();
    this.cameraManager = new CameraManager(container);
    this.rendererManager = new RendererManager(container);
    this.controlsManager = new ControlsManager(
      this.cameraManager.camera,
      this.rendererManager.renderer.domElement,
    );
    window.addEventListener("resize", this.handleResize);
  }

  async init(): Promise<void> {
    this.callbacks.onDevicesChange(this.statusManager.getDevices());
    this.callbacks.onLoadStateChange({
      isLoading: true,
      useFallback: false,
      message: "正在加载 /models/lifter.glb",
    });

    const loaded = await this.modelLoader.load(this.statusManager.getDevices());
    if (this.isDisposed) {
      return;
    }

    this.modelRoot = loaded.root;
    this.sceneManager.scene.add(loaded.root);
    this.statusManager.applyStatusColors(loaded.root);

    this.animationManager = new AnimationManager(loaded.root);
    this.interactionManager = new InteractionManager(
      this.rendererManager.renderer.domElement,
      this.cameraManager.camera,
      loaded.root,
      this.handleSelect,
    );

    this.callbacks.onLoadStateChange({
      isLoading: false,
      useFallback: loaded.useFallback,
      message: loaded.message,
    });

    this.startStatusUpdates();
    this.render();
  }

  setAxesVisible(visible: boolean): void {
    this.sceneManager.setAxesVisible(visible);
  }

  selectDevice(meshName: string): void {
    this.selectedMeshName = meshName;
    this.interactionManager?.select(meshName);
    this.callbacks.onSelectDevice(this.statusManager.getByMeshName(meshName));
  }

  dispose(): void {
    this.isDisposed = true;
    window.removeEventListener("resize", this.handleResize);
    window.cancelAnimationFrame(this.animationFrameId);
    window.clearInterval(this.statusTimerId);
    this.interactionManager?.clear();
    this.controlsManager.dispose();
    this.rendererManager.dispose();
  }

  private readonly handleResize = (): void => {
    this.cameraManager.resize(this.container);
    this.rendererManager.resize(this.container);
  };

  private readonly handleSelect = (meshName: string): void => {
    this.selectedMeshName = meshName;
    this.callbacks.onSelectDevice(this.statusManager.getByMeshName(meshName));
  };

  private startStatusUpdates(): void {
    this.statusTimerId = window.setInterval(() => {
      const devices = this.statusManager.randomUpdate();
      if (this.modelRoot) {
        this.statusManager.applyStatusColors(this.modelRoot);
        if (this.selectedMeshName) {
          this.interactionManager?.select(this.selectedMeshName);
          this.callbacks.onSelectDevice(this.statusManager.getByMeshName(this.selectedMeshName));
        }
      }
      this.callbacks.onDevicesChange(devices);
    }, 2000);
  }

  private readonly render = (): void => {
    if (this.isDisposed) {
      return;
    }

    this.animationManager?.update();
    this.controlsManager.update();
    this.rendererManager.render(this.sceneManager.scene, this.cameraManager.camera);
    this.animationFrameId = window.requestAnimationFrame(this.render);
  };
}
