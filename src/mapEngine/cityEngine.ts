
import { Building, BuildingLayer, BuildingSource, ModelType, Point } from '@/types';
import * as RawTHREE from 'three';
import { mergeGeometries as RawmergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { InstanceModel } from './_instanceModel';
import { Render } from './Render';
import { MapEngine } from '.';
// import { _ExtrudeGeometry } from './_extrudeGeometry';
import { useThreeWorker } from '@/hooks/useThreeWorker';
import { useEncodeBuffer } from '@/hooks/useBuffer';

import { runTask, runTaskStream, timeInfoEnd, timeInfoStart } from '@/utils/tools';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class CityEngine {
    highInstanceModel!: InstanceModel;
    pickInfo: Building | null = null;
    label: CSS2DObject;
    map!: Map<BuildingLayer, Map<number, Building & { drawIndex?: number; info?: RawTHREE.Vector3[]; }>>;
    constructor(private layerGroup: Record<BuildingLayer, RawTHREE.Group>, public mapEngine: Render) {
        this.map = new Map([
            [BuildingLayer.low, new Map()],
            [BuildingLayer.high, new Map()],
            [BuildingLayer.normal, new Map()]
        ]);
        const labelElement = document.createElement('div');
        labelElement.className = `display_card`;
        this.label = new CSS2DObject(labelElement);
    }
    render = async (shapeSources: BuildingSource) => {
        return runTaskStream([async () => { timeInfoStart('建筑构建', '#b435f1'); },
        async () => this.buildLow(shapeSources[BuildingLayer.low]),
        () => {
            this.mapEngine.renderSingleFrame();
        },
        async () => this.buildNormal(shapeSources[BuildingLayer.normal]),
        async () => {
            this.mapEngine.renderSingleFrame();
        },
        async () => this.buildHigh(shapeSources[BuildingLayer.high]),
        async () => {
            this.mapEngine.renderSingleFrame();
        },
        async () => timeInfoEnd('建筑构建', '#b435f1'),
        async (diffTime: number) => {
            this.mapEngine.emit('dataChange', {
                type: 'cityData',
                data: {
                    cityBuildTime: diffTime.toFixed(2),
                },
            });
        }]);
    };

    async buildHigh(source: BuildingSource[BuildingLayer.high]) {
        const buildingNameType = ['医院', '写字楼', '大厦', '小区', '大楼'];

        return runTaskStream([
            async () => { timeInfoStart('构建high级建筑', '#b435f1'); },
            async () => {
                return Render.modelLoadByGLTF.setPath("model/").loadAsync('high_building.glb').then(res => res);
            }, async (modal) => {
                const infos: (Building & { drawIndex?: number; info?: RawTHREE.Vector3[]; })[] = [];
                let count = 0;
                Object.keys(source).map((item) => {
                    source[item].map((item) => {
                        this.map.get(BuildingLayer.high)!.set(count, { drawIndex: count, ...item, name: `上海第${count + 1}${buildingNameType.at(Math.floor(Math.random() * 5))}` });
                        infos.push(this.map.get(BuildingLayer.high)!.get(count)!);
                        count++;
                    });
                });
                const instanceModel = new InstanceModel(modal.scene, infos.length, false, {
                    layer: BuildingLayer.high,
                    type: ModelType.CITY
                });

                for (let i = 0, len = infos.length; i < len; i++) {
                    const matrix4 = new RawTHREE.Matrix4().makeScale(infos[i].size.x / 24, infos[i].height * 0.95 / 50 * 10, infos[i].size.z / 24);
                    matrix4.setPosition(new RawTHREE.Vector3(infos[i].center.x, 0, -infos[i].center.z));
                    instanceModel.setMatrixAt(i, matrix4);
                    instanceModel.setColorAt(i, new RawTHREE.Color("#fff"));
                }
                let pointCount = 0;
                for (const mesh of instanceModel.instanceGroup) {
                    const count = mesh.geometry.getAttribute("position").count;
                    pointCount += count;
                }
                this.mapEngine.emit("dataChange", {
                    type: 'cityData',
                    data: {
                        highCityCount: count,
                        highCityPointCount: pointCount * infos.length,
                        highCityInfo: this.map.get(BuildingLayer.high)
                    }
                });
                this.layerGroup[BuildingLayer.high].add(instanceModel.instance);
                this.highInstanceModel = instanceModel;
                return instanceModel.instance;
            }, () => timeInfoEnd('构建high级建筑', '#b435f1'), async (diffTime: number) => {
                this.mapEngine.emit('dataChange', {
                    type: 'cityData',
                    data: {
                        highCityBuildTime: diffTime.toFixed(2),
                    },
                });
            }]);
    }
    async buildNormal(source: BuildingSource[BuildingLayer.normal]) {
        return runTaskStream([async () => { timeInfoStart('构建normal级建筑', '#b435f1'); }, async () => {
            return Render.modelLoadByGLTF.setPath("model/").loadAsync('normal_building.glb').then(res => res);
        }, (modal) => {
            const infos: Building[] = [];
            let count = 0;

            Object.keys(source).map((item) => {
                source[item].map((item) => {
                    this.map.get(BuildingLayer.normal)!.set(count, { drawIndex: count, ...item });
                    infos.push(item);
                    count++;
                });
            });

            const instanceModel = new InstanceModel(modal.scene, infos.length, false, {
                layer: BuildingLayer.normal,
                type: ModelType.CITY
            });
            for (let i = 0, len = infos.length; i < len; i++) {
                const matrix4 = new RawTHREE.Matrix4().makeScale(infos[i].size.x, infos[i].height * 1.4 * 2, infos[i].size.z);
                matrix4.setPosition(new RawTHREE.Vector3(infos[i].center.x, infos[i].height, -infos[i].center.z));
                instanceModel.setMatrixAt(i, matrix4);
            }

            let pointCount = 0;
            for (const mesh of instanceModel.instanceGroup) {
                const count = mesh.geometry.getAttribute("position").count;
                pointCount += count;
            }
            this.mapEngine.emit("dataChange", {
                type: 'cityData',
                data: {
                    normalCityCount: count,
                    normalCityPointCount: pointCount * infos.length
                }
            });
            this.layerGroup[BuildingLayer.normal].add(instanceModel.instance);
            return instanceModel.instance;
        }, async () => timeInfoEnd('构建normal级建筑', '#b435f1'), async (diffTime: number) => {
            this.mapEngine.emit('dataChange', {
                type: 'cityData',
                data: {
                    normalCityBuildTime: diffTime.toFixed(2),
                },
            });
        }]);
    }
    async buildLow(source: BuildingSource[BuildingLayer.low]) {

        timeInfoStart('构建low级建筑', '#b435f1');
        const aoMap = await Render.textureLoader.loadAsync('aomap.png');
        aoMap.colorSpace = RawTHREE.SRGBColorSpace;
        const envMap = await Render.textureLoader.loadAsync('envmap.png');
        envMap.colorSpace = RawTHREE.SRGBColorSpace;
        const colorMap = await Render.textureLoader.loadAsync('color.png');
        colorMap.colorSpace = RawTHREE.SRGBColorSpace;
        const material = new RawTHREE.MeshPhysicalMaterial({
            map: colorMap,
            envMap: envMap,
            aoMap,
            roughness: 0.3,
            transparent: true
        });
        return this.loadLowByWorkers(source, material);
    }
    async loadLowByWorkers(source: BuildingSource[BuildingLayer.low], material: RawTHREE.Material) {
        let keyList: Record<string, Building[]> = {};
        const keys = Object.keys(source);
        const proxyList: Promise<RawTHREE.Mesh>[] = [];
        this.mapEngine.emit("dataChange", {
            type: 'cityData',
            data: {
                lowCityCount: keys.map(item => { return source[item].length; }).reduce((pre, cur) => { return pre + cur; }, 0),
            }
        });
        keys.map((key, ind) => {
            keyList[key] = source[key];
            if (Object.keys(keyList).length > 3 || keys.length - 1 === ind) {
                const scope = keyList;
                proxyList.push(runTask(async () => {
                    return this.loadLoadBySingleWorker(scope, material);
                }));
                keyList = {};
            }
        });
        return Promise.all(proxyList).then(meshList => {
            timeInfoStart('合并low级建筑几何顶点', '#b435f1');
            meshList.map(item => item.parent?.remove(item));
            const geometry = RawmergeGeometries(meshList.map(item => item.geometry), false);
            const mesh = new RawTHREE.Mesh(geometry, material);
            this.layerGroup[BuildingLayer.low].add(mesh);
            timeInfoEnd('合并low级建筑几何顶点', '#b435f1');
            const time = timeInfoEnd('构建low级建筑', '#b435f1');
            this.mapEngine.emit('dataChange', {
                type: 'cityData',
                data: {
                    lowCityPointCount: geometry.getAttribute("position").count,
                    lowCityBuildTime: time.toFixed(2),
                },
            });
            return mesh;
        });
    }
    async loadLoadBySingleWorker(source: BuildingSource[BuildingLayer.low], material: RawTHREE.Material) {
        const buffer = useEncodeBuffer(source);
        const proxy = useThreeWorker(() => {
            return {
                handle: (buffer: ArrayBuffer) => {
                    return new Promise<THREEWORKER.NormalBufferAttributes>((_res, _rej) => {
                        const source: BuildingSource[BuildingLayer.low] = useDecodeBuffer(buffer);
                        const geometries = Object.keys(source).map((item) => {
                            const shapes = source[item].map(item => {
                                if (item.points[0] instanceof THREEWORKER.Vector2) {
                                    return new THREEWORKER.Shape(item.points as RawTHREE.Vector2[]);
                                } else {
                                    return new THREEWORKER.Shape((item.points as Point[]).map((i) => {
                                        return new THREEWORKER.Vector2(i.x, i.z);
                                    }));
                                }
                            });
                            const geometry = new _ExtrudeGeometry(shapes, {
                                depth: Number(item),
                                bevelEnabled: false,
                                steps: 1
                            });
                            geometry.translate(0, Number(item), 0);
                            geometry.rotateX(-Math.PI / 2);
                            return geometry;
                        });

                        const geometry = mergeGeometries(geometries, false);
                        for (const key of Object.keys(geometry.attributes)) {
                            transfer(geometry.attributes[key], [geometry.attributes[key].array.buffer]);
                        }
                        _res(geometry.attributes);
                        geometry.dispose();
                        for (const geo of geometries) {
                            geo.dispose();
                        }

                    });

                }
            };
        }, [buffer.buffer]);

        return runTask(async () => {

            return proxy.handle(buffer.buffer).then((buffers) => {
                return runTask(() => {
                    const bufferGeometry = new RawTHREE.BufferGeometry();
                    for (const buffer of Object.keys(buffers)) {
                        bufferGeometry.setAttribute(buffer, new RawTHREE.BufferAttribute(buffers[buffer].array, buffers[buffer].itemSize));
                    }
                    const mesh = new RawTHREE.Mesh(bufferGeometry, material);
                    mesh.name = 'city_low_merge_mesh';
                    mesh.userData = {
                        layer: BuildingLayer.low,
                        type: ModelType.CITY
                    };
                    this.layerGroup[BuildingLayer.low].add(mesh);
                    return mesh;
                });

            });
        });
    }
    onPick = (pickObject: any, engine: MapEngine) => {

        const userData = pickObject.object.userData;
        if (!('layer' in userData) || !('type' in userData)) return;
        const layer = userData.layer;
        const type = userData.type;
        if (type !== ModelType.CITY) return;
        switch (layer) {
            case BuildingLayer.low: {
                const index = engine.findIndex(pickObject.face!, pickObject.object.geometry.groups);
                return;
            } case BuildingLayer.normal: {
                return;
            } case BuildingLayer.high: {
                const info = this.map.get(BuildingLayer.high)!.get(pickObject.instanceId);
                if (!info) return;
                this.pickInfo = info;
                engine.flyToByTween(new RawTHREE.Vector3(info.center.x, 40, -info.center.z));
                this.addCSS2DObject(pickObject.point, info!);
                if (this.highInstanceModel) {
                    this.highInstanceModel.setColorAt(info.drawIndex!, new RawTHREE.Color("#ff0000"));
                }
                return;
            }
        }
    };
    resetPick() {
        this.mapEngine.scene.remove(this.label);
        if (this.highInstanceModel && this.pickInfo) {
            this.highInstanceModel.setColorAt(this.pickInfo.drawIndex!, new RawTHREE.Color("#fff"));
            this.pickInfo = null;
        }
    }

    addCSS2DObject(pos: RawTHREE.Vector3, info: Record<string, any>) {
        this.label.element.innerHTML = `
        <div>
            <div class="header">详细信息</div>
            <div class="info" >
            <ul>
            ${['name', 'height'].map(item => {
            return `<li>${item}:${info[item]}</li>`;
        }).join("")}
        <li>简介:<button>点我查看</button></li>
        <li>联系电话:88888888<button>点我联系</button></li>
            </ul>
            </div>
            </div>
        `;
        this.label.center.set(0, 0);
        this.mapEngine.scene.add(this.label);
        this.label.position.copy(pos);
    }
}