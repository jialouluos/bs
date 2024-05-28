


import { useWebWorker } from '@/hooks/useWebWorker';
import { Building, BuildingSource, BuildingLayer, Point } from '@/types';
import { Render } from '../Render';
import { Vector3 } from 'three';

const layerShunt = (size: Vector3 | Point, layer: [number, number]) => {
    if (size.x * size.z > layer[0]) {
        return BuildingLayer.high;
    }
    else if (size.x * size.z > layer[1]) {
        return BuildingLayer.normal;
    } else
        return BuildingLayer.low;
};
const getSize = (points: Point[]) => {
    const info = {
        center: <Point>{ x: NaN, y: NaN, z: NaN },
        size: <Point>{ x: NaN, y: NaN, z: NaN },
        min: <Point>{
            x: +Infinity,
            y: +Infinity,
            z: +Infinity
        },
        max: <Point>{
            x: -Infinity,
            y: -Infinity,
            z: -Infinity
        }
    };
    const min = (point: Point) => {
        info.min.x = Math.min(info.min.x, point.x);
        info.min.y = Math.min(info.min.y, point.y);
        info.min.z = Math.min(info.min.z, point.z);
    };
    const max = (point: Point) => {
        info.max.x = Math.max(info.max.x, point.x);
        info.max.y = Math.max(info.max.y, point.y);
        info.max.z = Math.max(info.max.z, point.z);
    };
    for (const point of points) {
        min(point);
        max(point);
    }
    info.center = {
        x: (info.max.x + info.min.x) * 0.5,
        y: (info.max.y + info.min.y) * 0.5,
        z: (info.max.z + info.min.z) * 0.5,
    };
    info.size = {
        x: (info.max.x - info.min.x),
        y: (info.max.y - info.min.y),
        z: (info.max.z - info.min.z),
    };
    return info;
};
type TFN<T, F> = { handle: (source: T) => Promise<F>; };
export function handleBuildingPipeline(type: "mainThread"): TFN<Record<string, any>, BuildingSource>;
export function handleBuildingPipeline(type: "workerThread", buffer: ArrayBuffer[]): TFN<ArrayBuffer, ArrayBuffer>;
export function handleBuildingPipeline(type: "mainThread" | "workerThread", buffer: ArrayBuffer[] = []) {
    switch (type) {
        case "mainThread": {
            return {
                handle: (source: Record<string, any>) => {
                    return new Promise<BuildingSource>((_res, _rej) => {

                        let index = 0;
                        const features = source['features'];
                        const buildingPoints = { [BuildingLayer.high]: <Record<string, Building[]>>{}, [BuildingLayer.normal]: <Record<string, Building[]>>{}, [BuildingLayer.low]: <Record<string, Building[]>>{} };
                        for (const feature of features) {
                            const properties = feature['properties'];//楼层高度
                            const geometry = feature['geometry'];

                            if (geometry.type === 'Polygon' && properties['Floor'] && properties['Floor'] > 2) {
                                for (const coord of geometry.coordinates) {
                                    const points = [];
                                    for (const lon of coord) {
                                        if (Array.isArray(lon[0])) {
                                            lon.map((item: any) => {
                                                const xy = Render.math.lon2xy(item[0], item[1]);
                                                points.push({
                                                    x: xy[0], y: 0, z: xy[1]
                                                });
                                            });
                                        } else {
                                            const xy = Render.math.lon2xy(lon[0], lon[1]);
                                            points.push({
                                                x: xy[0], y: 0, z: xy[1]
                                            });
                                        }
                                    }
                                    index++;
                                    const { center, size } = getSize(points);
                                    const layer = layerShunt(size, [40000, 30000]);
                                    const height = properties['Floor'] * 10;
                                    if (!buildingPoints[layer][height]) buildingPoints[layer][height] = [];
                                    buildingPoints[layer][height].push({
                                        index,
                                        points,
                                        layer,
                                        name: `建筑楼${index}号`,
                                        height,
                                        center,
                                        size
                                    });
                                }
                            }
                        }
                        _res(buildingPoints);
                    });

                },
            };
        }
        case "workerThread": {
            return useWebWorker(() => {
                const layerShunt = (size: Vector3 | Point, layer: [number, number]) => {
                    if (size.x * size.z > layer[0]) {
                        return BuildingLayer.high;
                    }
                    else if (size.x * size.z > layer[1]) {
                        return BuildingLayer.normal;
                    } else
                        return BuildingLayer.low;

                };
                const getSize = (points: Point[]) => {
                    const info = {
                        center: <Point>{ x: NaN, y: NaN, z: NaN },
                        size: <Point>{ x: NaN, y: NaN, z: NaN },
                        min: <Point>{
                            x: +Infinity,
                            y: +Infinity,
                            z: +Infinity
                        },
                        max: <Point>{
                            x: -Infinity,
                            y: -Infinity,
                            z: -Infinity
                        }
                    };
                    const min = (point: Point) => {
                        info.min.x = Math.min(info.min.x, point.x);
                        info.min.y = Math.min(info.min.y, point.y);
                        info.min.z = Math.min(info.min.z, point.z);
                    };
                    const max = (point: Point) => {
                        info.max.x = Math.max(info.max.x, point.x);
                        info.max.y = Math.max(info.max.y, point.y);
                        info.max.z = Math.max(info.max.z, point.z);
                    };
                    for (const point of points) {
                        min(point);
                        max(point);
                    }
                    info.center = {
                        x: (info.max.x + info.min.x) * 0.5,
                        y: (info.max.y + info.min.y) * 0.5,
                        z: (info.max.z + info.min.z) * 0.5,
                    };
                    info.size = {
                        x: (info.max.x - info.min.x),
                        y: (info.max.y - info.min.y),
                        z: (info.max.z - info.min.z),
                    };
                    return info;
                };
                const lon2xy = (longitude: number, latitude: number): [number, number] => {

                    const E = longitude,
                        N = latitude;
                    const x = E * (20037508.34 / 180);

                    const y = (Math.log(Math.tan((90 + N) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;

                    return [x, y];
                };

                enum BuildingLayer {
                    low = 0,
                    normal = 1,
                    high = 2,
                }
                return {
                    handle: (source: ArrayBuffer) => {
                        return new Promise<ArrayBuffer>((_res, _rej) => {
                            const json = useDecodeBuffer(source);
                            let index = 0;
                            const features = json['features'];
                            const buildingPoints = { [BuildingLayer.high]: <Record<string, Building[]>>{}, [BuildingLayer.normal]: <Record<string, Building[]>>{}, [BuildingLayer.low]: <Record<string, Building[]>>{} };
                            for (const feature of features) {
                                const properties = feature['properties'];//楼层高度
                                const geometry = feature['geometry'];

                                if (geometry.type === 'Polygon' && properties['Floor'] && properties['Floor'] > 2) {
                                    for (const coord of geometry.coordinates) {
                                        const points = [];
                                        for (const lon of coord) {
                                            if (Array.isArray(lon[0])) {
                                                lon.map((item: any) => {
                                                    const xy = lon2xy(item[0], item[1]);
                                                    points.push({
                                                        x: xy[0], y: 0, z: xy[1]
                                                    });
                                                });
                                            } else {
                                                const xy = lon2xy(lon[0], lon[1]);
                                                points.push({
                                                    x: xy[0], y: 0, z: xy[1]
                                                });
                                            }
                                        }
                                        index++;
                                        const { center, size } = getSize(points);
                                        const layer = layerShunt(size, [40000, 30000]);
                                        const height = properties['Floor'] * 10;
                                        if (!buildingPoints[layer][height]) buildingPoints[layer][height] = [];
                                        buildingPoints[layer][height].push({
                                            index,
                                            points,
                                            layer,
                                            name: `建筑楼${index}号`,
                                            height,
                                            center,
                                            size
                                        });
                                    }
                                }
                            }
                            const buffer = useEncodeBuffer(buildingPoints);
                            transfer(buffer.buffer, [buffer.buffer]);
                            _res(buffer.buffer);
                        });

                    },
                };
            }, buffer);
        }
    }
}
