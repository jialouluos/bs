import { useWebWorker } from '@/hooks/useWebWorker';
import { RouteSource, Route, RouteType } from '@/types';


type TFN<T, F> = { handle: (source: T) => Promise<F>; };
export function handleRoutePipeline(type: "mainThread"): TFN<Record<string, any>, RouteSource>;
export function handleRoutePipeline(type: "workerThread", buffer: ArrayBuffer[]): TFN<ArrayBuffer, ArrayBuffer>;
export function handleRoutePipeline(type: "mainThread" | "workerThread", buffer: ArrayBuffer[] = []) {
    switch (type) {
        case "mainThread": {
            return {
                handle: (source: Record<string, any>) => {

                    enum RouteType {
                        low = 0,
                        normal = 1,
                        high = 2,
                    }
                    const lon2xy = (longitude: number, latitude: number): [number, number] => {
                        const E = longitude,
                            N = latitude;
                        const x = E * (20037508.34 / 180);
                        const y = (Math.log(Math.tan((90 + N) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;
                        return [x, y];
                    };

                    return new Promise<RouteSource>((_res, _rej) => {
                        let index = 0;
                        let pointIndex = 0;
                        const highwaySet = new Set();
                        const features = source['features'];
                        const routePointArray: Route[] = [];


                        for (const feature of features) {
                            const properties = feature['properties'];//楼层高度
                            const geometry = feature['geometry'];
                            highwaySet.add(properties['highway']);
                            if (geometry.type === 'LineString') {
                                const points = [];


                                const _minPointIndex = pointIndex;
                                for (const coord of geometry.coordinates) {
                                    if (Array.isArray(coord[0])) {
                                        coord.map((item: any) => {
                                            const xy = lon2xy(item[0], item[1] + 0.00017);
                                            points.push([xy[0], xy[1], 0]);

                                            pointIndex++;
                                        });
                                    } else {
                                        const xy = lon2xy(coord[0], coord[1] + 0.00017);
                                        points.push([xy[0], xy[1], 0]);
                                        pointIndex++;
                                    }
                                }
                                routePointArray.push({
                                    points: points.flat(),
                                    layer: 0,
                                    index,
                                    minPointIndex: _minPointIndex,
                                    maxPointIndex: pointIndex,
                                    ...properties ?? {}
                                });
                                index++;
                            }
                        }

                        _res(routePointArray.reduce((pre, cur) => {
                            pre[cur.layer].push(cur);
                            return pre;
                        }, <RouteSource>{ [RouteType.high]: [], [RouteType.normal]: [], [RouteType.low]: [] }));
                    });
                },
            };
        }
        case "workerThread": {
            return useWebWorker(() => {
                return {
                    handle: (buffer: ArrayBuffer) => {

                        enum RouteType {
                            low = 0,
                            normal = 1,
                            high = 2,
                        }
                        const lon2xy = (longitude: number, latitude: number): [number, number] => {
                            const E = longitude,
                                N = latitude;
                            const x = E * (20037508.34 / 180);
                            const y = (Math.log(Math.tan((90 + N) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;
                            return [x, y];
                        };
                        const json = useDecodeBuffer(buffer);
                        return new Promise<ArrayBuffer>((_res, _rej) => {
                            let index = 0;
                            let pointIndex = 0;
                            const highwaySet = new Set();
                            const features = json['features'];
                            const routePointArray: Route[] = [];


                            for (const feature of features) {
                                const properties = feature['properties'];//楼层高度
                                const geometry = feature['geometry'];
                                highwaySet.add(properties['highway']);
                                if (geometry.type === 'LineString') {
                                    const points = [];


                                    const _minPointIndex = pointIndex;
                                    for (const coord of geometry.coordinates) {
                                        if (Array.isArray(coord[0])) {
                                            coord.map((item: any) => {
                                                const xy = lon2xy(item[0], item[1] + 0.00017);
                                                points.push([xy[0], xy[1], 0]);

                                                pointIndex++;
                                            });
                                        } else {
                                            const xy = lon2xy(coord[0], coord[1] + 0.00017);
                                            points.push([xy[0], xy[1], 0]);
                                            pointIndex++;
                                        }
                                    }
                                    routePointArray.push({
                                        points: points.flat(),
                                        layer: 0,
                                        index,
                                        minPointIndex: _minPointIndex,
                                        maxPointIndex: pointIndex,
                                        ...properties ?? {}
                                    });
                                    index++;
                                }
                            }


                            const buffer = useEncodeBuffer(routePointArray.reduce((pre, cur) => {
                                pre[cur.layer].push(cur);
                                return pre;
                            }, <RouteSource>{ [RouteType.high]: [], [RouteType.normal]: [], [RouteType.low]: [] }));
                            transfer(buffer.buffer, [buffer.buffer]);
                            _res(buffer.buffer);
                        });
                    },
                };
            }, buffer);
        }
    }
}





