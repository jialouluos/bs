import * as THREE from 'three';
export class _Math {
    constructor() { }
    deg2Rad(rad: number): number;
    deg2Rad(rad: THREE.Vector3): THREE.Vector3;
    deg2Rad(deg: number | THREE.Vector3) {
        if (deg instanceof THREE.Vector3) {
            return deg.clone().multiplyScalar(Math.PI / 180);
        }
        return deg * Math.PI / 180;
    }

    rad2Deg(rad: number): number;
    rad2Deg(rad: THREE.Vector3): THREE.Vector3;
    rad2Deg(rad: number | THREE.Vector3) {
        if (rad instanceof THREE.Vector3) {
            return rad.clone().multiplyScalar(180 / Math.PI);
        }
        return rad * 180 / Math.PI;
    }

    lon2xy = (longitude: number, latitude: number): [number, number] => {


        const R = 6378137; // 地球半径（可根据实际情况调整）

        const lonRad = (longitude * Math.PI) / 180;
        const latRad = (latitude * Math.PI) / 180;

        const x = R * lonRad;
        const y = R * Math.log(Math.tan(Math.PI / 4 + latRad / 2));

        // const E = longitude,
        //     N = latitude;
        // const x = E * (20037508.34 / 180);

        // const y = (Math.log(Math.tan((90 + N) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;

        return [x, y];
    };
    center(params: THREE.Group | THREE.Mesh): [THREE.Vector3, THREE.Box3];
    center(params: [number, number][]): [THREE.Vector3, THREE.Vector3];
    center(params: THREE.Vector2[]): [THREE.Vector3, THREE.Vector3];
    center(params: THREE.Group | THREE.Mesh | [number, number][] | THREE.Vector2[]): [THREE.Vector3, THREE.Box3] | [THREE.Vector3, THREE.Vector3] {
        if (params instanceof THREE.Object3D) {
            const box = new THREE.Box3();
            box.expandByObject(params);
            return [box.max.clone().add(box.min).multiplyScalar(-.5), box];
        } else {
            if (!Array.isArray(params)) return params;
            const isV2 = params[0] instanceof THREE.Vector2;
            const geometry = new THREE.BufferGeometry().setFromPoints(params.map((item: any) => {
                return isV2 ? new THREE.Vector3(item.x, item.y, 0) : new THREE.Vector3(item[0], item[1], 0);
            }));
            geometry.rotateX(-Math.PI / 2);
            geometry.computeBoundingBox();
            const box = geometry.boundingBox!.clone();
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            box.getCenter(center);
            box.getSize(size);
            geometry.dispose();
            return [center, size];
        }
    }

}