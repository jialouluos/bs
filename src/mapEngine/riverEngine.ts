
import * as THREE from 'three';
import { ModelType, RiverSource, RiverType } from '@/types';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MapEngine } from '.';
import { runTaskStream, timeInfoEnd, timeInfoStart } from '@/utils/tools';
import { Render } from './Render';
export class RiverEngine {

    group: THREE.Group;
    constructor(private layerGroup: Record<RiverType, THREE.Group>, public mapEngine: Render) {
        this.group = new THREE.Group();

    }
    render = async (sources: RiverSource) => {

        return runTaskStream([
            async () => {
                timeInfoStart('河流构建', '#b435f1');
                return this.buildLow(sources[RiverType.low]);
            },
            async () => {
                this.mapEngine.renderSingleFrame();
            },
            async () => timeInfoEnd('河流构建', '#b435f1'),
            async (diffTime: number) => {
                this.mapEngine.emit("dataChange", {
                    type: 'riverData',
                    data: {
                        riverBuildTime: diffTime.toFixed(2),
                        riverCount: sources[RiverType.low].length
                    }
                });
            }
        ]);

    };

    async buildLow(source: RiverSource[RiverType.low]) {
        return runTaskStream([
            async () => timeInfoStart(`low层级河流构建`, '#b435f1'),
            () => {
                const material = new THREE.MeshStandardMaterial({
                    color: "#0000ff"
                });
                const geometries = source.map((item) => {
                    const shapes = new THREE.Shape(item.points.map((item: [number, number]) => {
                        return new THREE.Vector2(item[0], item[1]);
                    }));
                    const geometry = new THREE.ShapeGeometry(shapes);
                    geometry.rotateX(-Math.PI / 2);

                    return geometry;
                });
                const geometry = mergeGeometries(geometries, true);
                this.mapEngine.emit("dataChange", {
                    type: 'riverData',
                    data: {
                        riverPointCount: geometry.getAttribute("position").count
                    }
                });
                const mesh = new THREE.Mesh(geometry, material);

                mesh.userData = {
                    layer: RiverType.low,
                    type: ModelType.RIVER
                };

                this.layerGroup[RiverType.low].add(mesh);
            },
            async () => timeInfoEnd(`low层级河流构建`, '#b435f1')
        ]);

    }
    onPick = (pickObject: any, engine: MapEngine) => {
        const userData = pickObject.object.userData;
        if (!('layer' in userData) || !('type' in userData)) return;
        const layer = userData.layer;
        const type = userData.type;
        if (type !== ModelType.RIVER) return;
        switch (layer) {
            case RiverType.low: {
                const index = engine.findIndex(pickObject.face!, pickObject.object.geometry.groups);
                return;
            } case RiverType.normal: {
                // const index = pickObject.instanceId!;
                // const info = this.map.get(BuildingLayer.normal)!.get(index);
                // if (!info || !info.info) return;
                // this.flyToByTween(pickObject.point);
                return;
            } case RiverType.high: {
                engine.flyToByTween(pickObject.point);
                return;
            }
        }
    };
}