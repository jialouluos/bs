import * as THREE from 'three';
import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';
import { Render } from '../Render';

export class Sky {
  group: THREE.Group = new THREE.Group();
  sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  sunPos: THREE.Vector3;
  sunLight!: THREE.DirectionalLight;
  renderTarget!: THREE.WebGLRenderTarget;
  pmremGenerator!: THREE.PMREMGenerator;
  PMREM!: THREE.Texture;
  _helper: THREE.DirectionalLightHelper | null = null;
  params: {
    debug: boolean;
    radius: number;
    elevation: number;
    azimuth: number;
  };
  constructor(
    renderer: THREE.WebGLRenderer,
    texture: THREE.Texture,
    options?: {
      radius?: number,
      debug?: boolean;
    }
  ) {

    this.params = {
      radius: options?.radius ?? 10000,
      debug: options?.debug ?? false,
      elevation: 0,
      azimuth: 180
    };

    this.sunPos = new THREE.Vector3();
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    const geometry = new THREE.SphereGeometry(this.params.radius, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        turbidity: { value: 10 },
        rayleigh: { value: 2 },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.8 },
        sunPosition: { value: new THREE.Vector3() },
        up: { value: new THREE.Vector3(0, 1, 0) },
        u_SkyBg: { value: texture },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,

    });
    this.sky = new THREE.Mesh(geometry, material);
    this.sunLight = new THREE.DirectionalLight('#fff',);
    this.group.add(this.sky);
    this.group.add(this.sunLight);
    if (this.params.debug) {
      this._helper = new THREE.DirectionalLightHelper(this.sunLight, 100);
      this.group.add(this._helper);
    }

  }

  /**@params process:[0-1] */
  update(process: number) {

    const phi = THREE.MathUtils.degToRad(90 - this.params.elevation - 180 * process);
    const theta = THREE.MathUtils.degToRad(this.params.azimuth);
    this.sunPos.setFromSphericalCoords(this.params.radius, phi, theta);
    this.sky.material.uniforms['sunPosition'].value.copy(this.sunPos);
    this.sky.material.uniforms['mieDirectionalG'].value = Math.abs(process - 0.5) + 0.45;
    this.sky.material.uniforms['rayleigh'].value = Math.abs(process - 0.5) * 8.0;
    this.sunLight.position.copy(this.sunPos.clone());
    this._helper?.update();
    this.renderTarget && this.renderTarget.dispose();
    const sceneEnv = new THREE.Scene();
    sceneEnv.add(this.sky);
    this.renderTarget = this.pmremGenerator.fromScene(
      sceneEnv,
      0.04,
    );
    sceneEnv.clear();
    this.group.add(this.sky);
    this.PMREM = this.renderTarget.texture;
    this.sky.material.uniformsNeedUpdate = true;
  }
}
