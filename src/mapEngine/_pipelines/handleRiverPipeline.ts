


import { useWebWorker } from '@/hooks/useWebWorker';
import { River, RiverSource, RiverType } from '@/types';





type TFN<T, F> = { handle: (source: T) => Promise<F>; };
export function handleRiverPipeline(type: "mainThread"): TFN<Record<string, any>, RiverSource>;
export function handleRiverPipeline(type: "workerThread", buffer: ArrayBuffer[]): TFN<ArrayBuffer, ArrayBuffer>;
export function handleRiverPipeline(type: "mainThread" | "workerThread", buffer: ArrayBuffer[] = []) {
    switch (type) {
        case "mainThread": {
            return {
                handle: (source: Record<string, any>) => {
                    const lon2xy = (longitude: number, latitude: number): [number, number] => {

                        const E = longitude,
                            N = latitude;
                        const x = E * (20037508.34 / 180);

                        const y = (Math.log(Math.tan((90 + N) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;

                        return [x, y];
                    };
                    enum RiverType {
                        low = 0,
                        normal = 1,
                        high = 2,
                    }
                    return new Promise<RiverSource>((_res, _rej) => {

                        let index = 0;

                        const features = source['features'];
                        const shapesBuildPoints = [];
                        for (const feature of features) {
                            const geometry = feature['geometry'];
                            if (geometry.type === 'Polygon') {
                                for (const coord of geometry.coordinates) {
                                    const points = [];
                                    for (const lon of coord) {
                                        if (Array.isArray(lon[0])) {
                                            lon.map((item: any) => {
                                                points.push(lon2xy(item[0], item[1]));
                                            });
                                        } else {
                                            points.push(lon2xy(lon[0], lon[1]));
                                        }
                                    }//直接在这里创建
                                    index++;

                                    shapesBuildPoints.push(<River>{
                                        index, points, layer: 0
                                    });
                                }


                            }
                        }


                        _res(shapesBuildPoints.reduce((pre, cur) => {
                            pre[cur.layer].push(cur);
                            return pre;
                        }, <RiverSource>{ [RiverType.high]: [], [RiverType.normal]: [], [RiverType.low]: [] }));

                    });
                },
            };
        }
        case "workerThread": {
            return useWebWorker(() => {
                return {
                    handle: (source: ArrayBuffer) => {
                        const lon2xy = (longitude: number, latitude: number): [number, number] => {

                            const E = longitude,
                                N = latitude;
                            const x = E * (20037508.34 / 180);

                            const y = (Math.log(Math.tan((90 + N) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;

                            return [x, y];
                        };
                        enum RiverType {
                            low = 0,
                            normal = 1,
                            high = 2,
                        }
                        return new Promise<ArrayBuffer>((_res, _rej) => {
                            const json = useDecodeBuffer(source);
                            let index = 0;

                            const features = json['features'];
                            const shapesBuildPoints = [];
                            for (const feature of features) {
                                const geometry = feature['geometry'];
                                if (geometry.type === 'Polygon') {
                                    for (const coord of geometry.coordinates) {
                                        const points = [];
                                        for (const lon of coord) {
                                            if (Array.isArray(lon[0])) {
                                                lon.map((item: any) => {
                                                    points.push(lon2xy(item[0], item[1]));
                                                });
                                            } else {
                                                points.push(lon2xy(lon[0], lon[1]));
                                            }
                                        }//直接在这里创建
                                        index++;

                                        shapesBuildPoints.push(<River>{
                                            index, points, layer: 0
                                        });
                                    }


                                }
                            }

                            const buffer = useEncodeBuffer(shapesBuildPoints.reduce((pre, cur) => {
                                pre[cur.layer].push(cur);
                                return pre;
                            }, <RiverSource>{ [RiverType.high]: [], [RiverType.normal]: [], [RiverType.low]: [] }));
                            transfer(buffer.buffer, [buffer.buffer]);
                            _res(buffer.buffer);

                        });
                    },
                };
            }, buffer);
        }
    }
}

