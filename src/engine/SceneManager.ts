import {
  AmbientLight,
  AxesHelper,
  Color,
  DirectionalLight,
  GridHelper,
  Scene,
} from "three";

export class SceneManager {
  readonly scene = new Scene();
  private readonly axesHelper = new AxesHelper(4);

  constructor() {
    this.scene.background = new Color(0x071013);

    const ambientLight = new AmbientLight(0xffffff, 0.65);
    const keyLight = new DirectionalLight(0xddeeff, 1.6);
    keyLight.position.set(5, 8, 6);

    const fillLight = new DirectionalLight(0x6aa8ff, 0.7);
    fillLight.position.set(-6, 4, -5);

    const gridHelper = new GridHelper(18, 18, 0x2f7d8a, 0x193238);
    gridHelper.position.y = -0.02;

    this.axesHelper.visible = false;

    this.scene.add(ambientLight, keyLight, fillLight, gridHelper, this.axesHelper);
  }

  setAxesVisible(visible: boolean): void {
    this.axesHelper.visible = visible;
  }
}
