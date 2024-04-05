import * as THREE from 'three';
export const isObject = (o: any): o is object => {
    return typeof o === 'object' && o !== null;
};
export const isMesh = (o: any): o is THREE.Mesh => {
    return o instanceof THREE.Mesh;
};
export const isSameConstructor = (o: any, target: object) => {
    return typeof o === 'object' && o !== null && o instanceof target.constructor;
};
export const isFalse = (o: any) => {
    if (!o) return true;
    if (Array.isArray(o) && o.length === 0) return true;
    if (o === '0') return true;
    if (Reflect.ownKeys(o).length === 0) return true;
    return false;
};
