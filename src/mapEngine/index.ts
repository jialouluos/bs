
import { BuildingLayer, BuildingSource, RiverSource, RiverType, RouteSource, RouteType } from '@/types';
import { Render } from './Render';
import * as THREE from 'three';
import { isMesh, runTaskStream, timeInfoEnd, timeInfoStart } from '../utils/tools';

import { RouteEngine } from './routeEngine';
import { CityEngine } from './cityEngine';
import { RiverEngine } from './riverEngine';

import { Sky } from './Sky';
import { EventEngine } from './EventEngine';


export class MapEngine {
    mapRender: Render;
    eventEngine: EventEngine;
    routeEngine: RouteEngine;
    cityEngine: CityEngine;
    riverEngine: RiverEngine;
    group: THREE.Group = new THREE.Group();
    nonPickGroup: THREE.Group = new THREE.Group();
    pickGroup: THREE.Group = new THREE.Group();
    constructor(el: string | HTMLElement) {
        this.mapRender = new Render(el, { stats: true, helper: false, gui: false });


        // this.group.position.set(-13509225.589845065, 0, 3653652.5193683496);//offset fix
        this.group.position.set(-13526578.5, 0, 3662262.125);//offset line fix
        this.mapRender.scene.add(this.group);
        this.group.add(this.pickGroup);
        this.group.add(this.nonPickGroup);
        this.routeEngine = new RouteEngine({
            [RouteType.low]: this.pickGroup,
            [RouteType.normal]: this.nonPickGroup,
            [RouteType.high]: this.pickGroup
        }, this.mapRender);
        this.cityEngine = new CityEngine({
            [BuildingLayer.low]: this.nonPickGroup,
            [BuildingLayer.normal]: this.nonPickGroup,
            [BuildingLayer.high]: this.pickGroup
        }, this.mapRender);
        this.riverEngine = new RiverEngine({
            [RiverType.low]: this.nonPickGroup,
            [RiverType.normal]: this.nonPickGroup,
            [RiverType.high]: this.pickGroup
        }, this.mapRender);
        this.eventEngine = new EventEngine(this.group, this);

        this.mapRender.addListener("boardMessage", (data) => {
            if (data.type === "flyTo") {
                const center = data?.info?.center;
                if (!center) return;
                this.flyToByTween(new THREE.Vector3(center.x, 40, -center.z));
            } else if (data.type === "uavCamera") {
                const index = data?.index;
                this.routeEngine.cameraFollowUAV(index, this.group.position.clone());
            }
            else if (data.type === 'cancelUavCamera') {
                this.routeEngine.cancelFollowUAV();
            }

        });
    }
    dispose() {
        this.mapRender.dispose();
    }
    async renderRoute(routeSources: RouteSource) {
        this.eventEngine.setRouteData(routeSources);

        return this.routeEngine.render(routeSources);
        // setTimeout(() => {
        //     const [v3] = Render.math.center(this.group);
        //     console.log(v3);
        //     this.group.position.set(v3.x, 0, v3.z);
        // }, 10000);
    }
    async renderCity(citySources: BuildingSource) {
        this.eventEngine.setCityData(citySources);

        return this.cityEngine.render(citySources);
    }
    async renderRiver(riverSources: RiverSource) {
        return this.riverEngine.render(riverSources);
    }
    async renderScene() {
        return runTaskStream([
            () => { timeInfoStart('环境渲染', '#b435f1'); },
            () => this.renderSkyBox(),
            () => this.renderGrass(),
            () => timeInfoEnd('环境渲染', '#b435f1'),
            async (diffTime: number) => {
                this.mapRender.emit('dataChange', {
                    type: 'envData',
                    data: {
                        envRenderTime: diffTime.toFixed(2),
                    },
                });
            }]);
    }

    renderGrass = async () => {
        const geo = new THREE.PlaneGeometry(100000, 100000);
        const material = new THREE.MeshLambertMaterial({
            bumpScale: 1.0,
        });
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, -100, 1);
        const mesh = new THREE.Mesh(geo, material);
        this.mapRender.scene.add(mesh);
    };
    renderSkyBox = async () => {

        return runTaskStream([
            async () => {
                return Render.hdrLoader.loadAsync('hdr-1mb.hdr').then(res => res);
            },
            (env) => {
                env.mapping = THREE.EquirectangularRefractionMapping; //设置映射方式
                env.anisotropy = 16; //设置各项异性
                const sky = new Sky(this.mapRender.renderer!, env, {
                    radius: 100000
                });
                this.mapRender.scene.add(sky.group);
                this.mapRender.updateCBQueue.push((_, time) => {
                    const process = time.value * 3.0 % 180 / 180;
                    this.mapRender.renderer!.toneMappingExposure = Math.abs(Math.abs(process - 0.5) * 2.0 - 1.0) * 3.;

                    sky.update(process);
                    this.mapRender.scene.environment = sky.PMREM;
                });
            }
        ]);
    };
    startRender = () => {
        const handleClick = (mouseUp: THREE.Vector2, mousePos: THREE.Vector2) => {
            if (!mouseUp.equals(mousePos)) {

                return;
            }
            this.routeEngine.resetPick();
            this.cityEngine.resetPick();
            const objects = this.mapRender.useRayCaster(mousePos, true, [this.pickGroup]);
            const pickObject = objects[0];

            if (!pickObject || !isMesh(pickObject.object)) {

                return;
            }

            this.cityEngine.onPick(pickObject, this);
            this.routeEngine.onPick(pickObject, this);
        };
        this.mapRender.addListener("pointerUp", handleClick);
        this.mapRender.render();
    };
    renderSingleFrame() {
        this.mapRender.renderSingleFrame();
    }
    pauseRender = () => {

        this.mapRender.stopRender();
    };
    findIndex(source: { a: number, b: number, c: number; }, groups: { start: number, count: number; }[]) {
        const index = groups.findIndex((item) => {
            return item.start < source.a && source.a < item.count + item.start &&
                item.start < source.b && source.b < item.count + item.start &&
                item.start < source.c && source.c < item.count + item.start;
        });
        return index;
    }
    flyToByTween(targetPosition: THREE.Vector3) {
        const prePos: THREE.Vector3 = this.mapRender.activeControls.target.clone();
        const currentPos = targetPosition.add(this.group.position).clone();
        const offset = currentPos.clone().sub(prePos);
        offset.y = 0;
        const tweenV3 = new THREE.Vector3();
        const lastCameraPos = this.mapRender.activeCamera.position.clone();
        const lastControlsPos = this.mapRender.activeControls.target.clone();

        this.mapRender.$gsap.to(tweenV3, {
            x: offset.x,
            y: offset.y,
            z: offset.z,
            duration: 0.5,
            ease: "circ.inOut",
            onUpdate: () => {
                this.mapRender.activeCamera.position.copy(lastCameraPos.clone().add(tweenV3));
                this.mapRender.activeControls.target.copy(lastControlsPos.clone().add(tweenV3));
            }
        });
    }

}
