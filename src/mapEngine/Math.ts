import * as THREE from 'three';
export class _Math {
    constructor() { }
    deg2Rad = (deg: number | THREE.Vector3) => {
        if (deg instanceof THREE.Vector3) {
            return deg.clone().multiplyScalar(Math.PI / 180);
        }
        return deg * Math.PI / 180;
    };
    rad2Deg = (rad: number | THREE.Vector3) => {
        if (rad instanceof THREE.Vector3) {
            return rad.clone().multiplyScalar(180 / Math.PI);
        }
        return rad * 180 / Math.PI;
    };
    lon2xy = (longitude: number, latitude: number) => {
        const E = longitude,
            N = latitude;
        const x = E * 20037508.34 / 100;
        const y = (Math.log(Math.tan((90 + N) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;
        return new THREE.Vector2(x, y);
    };
}