import {
  AxesHelper,
  CanvasTexture,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  Texture,
  TextureLoader,
} from "three";
import { backgroundConfig } from "../config/backgroundConfig";
import { debugConfig } from "../config/debugConfig";

export class SceneManager {
  readonly scene = new Scene();
  private readonly axesHelper = new AxesHelper(4);
  private readonly textureLoader = new TextureLoader();
  private backgroundTexture?: Texture;
  private groundMesh?: Mesh<PlaneGeometry, MeshLambertMaterial>;
  private gridHelper?: GridHelper;

  constructor(private readonly onBackgroundChange?: () => void) {
    this.scene.up.set(0, 0, 1);
    this.applyConfiguredBackground();

    const hemisphereLight = new HemisphereLight(0xffffff, 0xc8c8c8, 0.65);
    const keyLight = new DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(8, -10, 14);

    const fillLight = new DirectionalLight(0xb8d8ff, 0.35);
    fillLight.position.set(-8, 8, 6);

    this.createFixedGround();
    if (backgroundConfig.enableGridHelper && debugConfig.enableGridHelper) {
      this.gridHelper = new GridHelper(18, 18, 0x2b6f79, 0x45636a);
      this.gridHelper.rotation.x = Math.PI / 2;
      this.gridHelper.position.z = 0.01;
      this.scene.add(this.gridHelper);
    }

    this.axesHelper.visible = false;

    this.scene.add(hemisphereLight, keyLight, fillLight, this.axesHelper);
  }

  setAxesVisible(visible: boolean): void {
    this.axesHelper.visible = visible;
  }

  dispose(): void {
    this.backgroundTexture?.dispose();
    this.groundMesh?.geometry.dispose();
    this.groundMesh?.material.dispose();
    this.gridHelper?.geometry.dispose();
    const gridMaterial = this.gridHelper?.material;
    if (Array.isArray(gridMaterial)) {
      gridMaterial.forEach((material) => material.dispose());
    } else {
      gridMaterial?.dispose();
    }
  }

  private applyConfiguredBackground(): void {
    if (
      backgroundConfig.type === "sky-panorama" &&
      backgroundConfig.renderMode === "screen-fixed"
    ) {
      this.scene.background = null;
      return;
    }

    if (backgroundConfig.type === "solid") {
      this.scene.background = new Color(backgroundConfig.solidColor);
      return;
    }

    this.applyGradientBackground();
    if (
      backgroundConfig.type === "sky-panorama" &&
      backgroundConfig.enableSkyPanorama &&
      backgroundConfig.renderMode === "scene-background"
    ) {
      this.loadPanoramaBackground();
    }
  }

  private loadPanoramaBackground(): void {
    this.textureLoader.load(
      backgroundConfig.panoramaUrl,
      (texture) => {
        this.backgroundTexture?.dispose();
        texture.mapping = EquirectangularReflectionMapping;
        texture.colorSpace = SRGBColorSpace;
        this.backgroundTexture = texture;
        this.scene.background = texture;
        this.onBackgroundChange?.();
      },
      undefined,
      () => {
        console.warn("天空全景图加载失败，已回退到浅蓝渐变背景。");
        this.applyGradientBackground();
        this.onBackgroundChange?.();
      },
    );
  }

  private createFixedGround(): void {
    if (!backgroundConfig.enableFixedGround) {
      return;
    }

    const groundGeometry = new PlaneGeometry(
      backgroundConfig.groundSize,
      backgroundConfig.groundSize,
    );
    const groundMaterial = new MeshLambertMaterial({
      color: backgroundConfig.groundColor,
    });
    this.groundMesh = new Mesh(groundGeometry, groundMaterial);
    this.groundMesh.name = "fixed-ground-z0";
    this.groundMesh.receiveShadow = true;
    this.groundMesh.position.set(0, 0, 0);
    this.scene.add(this.groundMesh);
  }

  private applyGradientBackground(): void {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) {
      this.scene.background = new Color(backgroundConfig.solidColor);
      return;
    }

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, backgroundConfig.fallbackTopColor);
    gradient.addColorStop(0.55, backgroundConfig.fallbackMiddleColor);
    gradient.addColorStop(1, backgroundConfig.fallbackBottomColor);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    this.backgroundTexture?.dispose();
    this.backgroundTexture = new CanvasTexture(canvas);
    this.backgroundTexture.colorSpace = SRGBColorSpace;
    this.scene.background = this.backgroundTexture;
  }
}
