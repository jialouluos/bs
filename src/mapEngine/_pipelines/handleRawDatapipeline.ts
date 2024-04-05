


import { useWebWorker } from '@/hooks/useWebWorker';

export const handleRawDataPipeline = () => {
    return {
        apply: () => {
            return useWebWorker(() => {
                return {
                    handle: (json: Record<string, any>) => {
                        return new Promise((_res, _rej) => {
                            const geometries = json['geometries'];
                            const shapesBuildPoints = [];
                            for (const geo of geometries) {
                                if (geo.type === 'Polygon') {
                                    for (const coord of geo.coordinates) {
                                        const shapeBuildPoints = [];
                                        for (const lon of coord) {
                                            shapeBuildPoints.push(lon);
                                        }
                                        shapesBuildPoints.push(shapeBuildPoints);
                                    }

                                };
                            }
                            _res(shapesBuildPoints);
                        });
                    },
                };
            });

        }
    };
};



