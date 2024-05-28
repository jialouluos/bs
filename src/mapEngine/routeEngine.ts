import * as THREE from 'three';
import { ModelType, Route, RouteSource, RouteType } from '@/types';
import { MapEngine } from '.';
import { runTaskStream, timeInfoEnd, timeInfoStart } from '@/utils/tools';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import vs from './shader/flyLine/vs.glsl?raw';
import fs from './shader/flyLine/fs.glsl?raw';
import { Render } from './Render';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { InstanceModel } from './_instanceModel';
export class RouteEngine {
    indexRangeMap: Map<number, { _index: number, lineIndex: number; length: number; }> = new Map();
    map!: Map<RouteType, Map<number, Route & { drawIndex?: number; }>>;
    lowLinePointer: THREE.LineSegments | null = null;
    label: CSS2DObject;
    cachePickObject: { _index: number, lineIndex: number; length: number; } | null = null;

    uavPointer: InstanceModel | null = null;
    constructor(private layerGroup: Record<RouteType, THREE.Group>, public mapEngine: Render) {

        this.map = new Map([
            [RouteType.low, new Map()],
            [RouteType.high, new Map()],
            [RouteType.normal, new Map()]
        ]);
        const labelElement = document.createElement('div');
        labelElement.className = `display_card`;
        this.label = new CSS2DObject(labelElement);
    }
    render = async (routeSources: RouteSource) => {
        return runTaskStream([
            async () => {
                timeInfoStart('道路构建', '#b435f1');
                return this.buildLow(routeSources[RouteType.low]);
            },
            async () => {
                this.mapEngine.renderSingleFrame();
            },
            async () => timeInfoEnd('道路构建', '#b435f1'),

            async (diffTime: number) => {
                this.mapEngine.emit("dataChange", {
                    type: 'routeData',
                    data: {

                        routeBuildTime: diffTime.toFixed(2),

                    }
                });
            }
        ]);
    };
    async renderFly(data: Route[]) {
        return runTaskStream([
            async () => { timeInfoStart('构建无人机群', '#b435f1'); },
            async () => {
                return Render.modelLoadByGLTF.setPath("model/").loadAsync('fly.glb').then(res => res);
            }, async (modal) => {
                const instanceModel = new InstanceModel(modal.scene, data.length, false, {
                    layer: 0,
                    type: ModelType.UAV
                });

                for (let i = 0, len = data.length; i < len; i++) {
                    const matrix4 = new THREE.Matrix4().makeScale(10, 10, 10);
                    matrix4.setPosition(new THREE.Vector3(data[i].points[0], 1600, -data[i].points[1]));
                    instanceModel.forceSetMatrixAt(i, matrix4);
                }
                this.mapEngine.updateCBQueue.push((_, time) => {
                    for (let i = 0, len = data.length; i < len; i++) {
                        const matrix4 = new THREE.Matrix4().makeScale(10, 10, 10);
                        const points = data[i].points;
                        const process = Math.abs((time.value % (points.length / 3 - 2) / (points.length / 3 - 2) - 0.5)) * 2.0 * (points.length / 3 - 2) + 1;
                        const floorNumber = Math.floor(process);
                        const fractNumber = process - floorNumber;

                        const v3 = new THREE.Vector3(
                            points[(floorNumber - 1) * 3],
                            1600,
                            -points[(floorNumber - 1) * 3 + 1]
                        ).lerp(new THREE.Vector3(
                            points[(floorNumber) * 3],
                            1600,
                            -points[floorNumber * 3 + 1]
                        ),
                            fractNumber);
                        matrix4.setPosition(v3);

                        instanceModel.forceSetMatrixAt(i, matrix4);
                    }
                });
                this.mapEngine.updateCBQueue.push((_, time) => {
                    if (!this.uavPointer) return;
                    this.updateUav();
                });
                this.layerGroup[RouteType.high].add(instanceModel.instance);
                this.uavPointer = instanceModel;
                return instanceModel.instance;
            }, () => timeInfoEnd('构建无人机群', '#b435f1'), () => {
                this.mapEngine.emit("dataChange", {
                    type: 'UAVData',
                    data: {
                        uavData: data
                    }
                });
            }]);
    }
    updateUav() {

    }
    cameraFollowUAV(index: number, fixPosition: THREE.Vector3) {
        this.updateUav = () => {
            if (!this.uavPointer) return;
            const matrixArray: THREE.Matrix4[] = [];
            this.uavPointer!.getMatrixAt(index, matrixArray);
            const position = new THREE.Vector3();
            matrixArray[0].decompose(position, new THREE.Quaternion(), new THREE.Vector3());
            position.add(fixPosition);
            this.mapEngine.activeCamera.position.copy(position.clone());
            position.y = 0;
            this.mapEngine.activeControls.target.copy(position);
        };
    }
    cancelFollowUAV() {
        this.updateUav = () => { };
    }
    buildLow = async (source: RouteSource[RouteType.low]) => {
        return runTaskStream([
            async () => timeInfoStart(`low层级道路构建`, '#b435f1'),
            () => {
                const _shaderMaterial = new THREE.ShaderMaterial({
                    vertexShader: vs,
                    fragmentShader: fs,
                    uniforms: {
                        u_Time: Render.GlobalTime,
                        u_Speed: {
                            value: 0.1
                        },
                        u_PickColor: {
                            value: new THREE.Color("#ff0000")
                        },
                        u_PickColor2: {
                            value: new THREE.Color("#ffff00")
                        }
                    }
                });

                const points = source.map((item2, index) => {
                    this.map.get(RouteType.low)!.set(index, item2);
                    return item2.points;
                });
                this.renderFly(source.filter(item => (item.points.length / 3) > 20).slice(0, 5));
                const geometry = this.mergeLineGeometry(points, { isLineSegmentsGeometry: false, isCreateSpacedPoints: false, spacedTime: 1 });
                geometry.rotateX(-Math.PI / 2);
                const count = geometry.getAttribute("position").count;
                this.mapEngine.emit("dataChange", {
                    type: 'routeData',
                    data: {
                        routePointCount: count
                    }
                });
                const line = new THREE.LineSegments(geometry, _shaderMaterial);
                this.lowLinePointer = line;
                line.userData = {
                    layer: RouteType.normal,
                    type: ModelType.ROUTE
                };
                this.layerGroup[RouteType.low].add(line);
            },
            async () => timeInfoEnd(`low层级道路构建`, '#b435f1')
        ]);
    };

    mergeLineGeometry(points: number[][], { spacedTime = 2, isCreateSpacedPoints = false, isLineSegmentsGeometry = true }: {
        isLineSegmentsGeometry?: boolean;
        spacedTime?: number;
        isCreateSpacedPoints?: boolean;
    }) {
        let _points = [];
        if (isCreateSpacedPoints) {

            for (const point of points) {
                const _v3s = [];
                for (let i = 0, len = point.length; i < len; i += 3) {
                    _v3s.push(new THREE.Vector3(point[i], point[i + 1], point[i + 2]));
                }
                _points.push(new THREE.CatmullRomCurve3(_v3s).getPoints(point.length * spacedTime).map(item => {
                    return [item.x, item.y, item.z];
                }).flat(1));
            }

        } else {
            _points = points;
        }

        const indexArray = [];
        const uvArray = [];
        const colorArray = [];
        const pickFlag = [];
        let index = 0;
        const vertices = [];
        let lineIndex = 0;
        for (const point of _points) {

            const _index = index;
            for (let i = 0, len = point.length; i < len; i += 3) {
                this.indexRangeMap.set(indexArray.length, { lineIndex, _index, length: len / 3 });
                vertices.push(point[i], point[i + 1], point[i + 2]);
                uvArray.push(i / len, 1);
                colorArray.push(i / len, (len - i) / len, 1);
                pickFlag.push(0);
                i && indexArray.push(index - 1, index);

                index = index + 1;

            }

            lineIndex++;
        }
        //isLineSegmentsGeometry have a bug . Don't use it
        const bufferGeometry = isLineSegmentsGeometry ? new LineSegmentsGeometry : new THREE.BufferGeometry;
        if (isLineSegmentsGeometry) {
            (bufferGeometry as LineSegmentsGeometry).setPositions(vertices);
        } else {
            bufferGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        }
        bufferGeometry.setAttribute("self_uv", new THREE.Float32BufferAttribute(uvArray, 2));
        bufferGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colorArray, 3));
        bufferGeometry.setAttribute("pickFlag", new THREE.Float16BufferAttribute(pickFlag, 1));
        bufferGeometry.setIndex(indexArray);
        return bufferGeometry;
    }
    onPick = (pickObject: any, engine: MapEngine) => {
        const userData = pickObject.object.userData;
        if (!('layer' in userData) || !('type' in userData)) return;

        const type = userData.type;
        if (type !== ModelType.ROUTE && type !== ModelType.UAV) return;
        if (type === ModelType.ROUTE) {
            const info = this.indexRangeMap.get(pickObject.index)!;
            this.pickLine(info._index, info._index + info.length, 1);
            this.addCSS2DObject(pickObject.point, this.map.get(RouteType.low)!.get(info.lineIndex)!);
            this.cachePickObject = info;
        }

    };
    pickLine(startIndex: number, endIndex: number, flag: number) {
        if (!this.lowLinePointer) return;

        for (let i = startIndex; i <= endIndex; i++) {
            this.lowLinePointer.geometry.getAttribute("pickFlag").setX(i, flag);
        }

        this.lowLinePointer.geometry.getAttribute("pickFlag").needsUpdate = true;
    }
    resetPick() {
        if (!this.lowLinePointer || !this.cachePickObject) return;
        this.mapEngine.scene.remove(this.label);
        this.pickLine(this.cachePickObject._index, this.cachePickObject._index + this.cachePickObject.length, 0);

        this.cachePickObject = null;
    }
    addCSS2DObject(pos: THREE.Vector3, info: Record<string, any>) {

        this.label.element.innerHTML = `
        <div>
            <div class="header">详细信息</div>
            <div class="info" >
            <ul>
            ${['name', 'osm_id', 'highway'].map(item => {
            return `<li>${item}:${info[item]}</li>`;
        }).join("")}
            </ul>
            </div>
            </div>
        `;
        this.label.center.set(0, 0);
        this.mapEngine.scene.add(this.label);
        this.label.position.copy(pos);
    }
}