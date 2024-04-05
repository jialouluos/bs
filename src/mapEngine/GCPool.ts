import * as THREE from 'three';
import { isObject } from '../../utils/tools';
export default class GCPool {
    sources!: Set<any>;
    _sources!: Set<any>;
    constructor() {
        this.sources = new Set();
        this._sources = new Set();
    }
    track(obj: any, sources: Set<any> = this.sources) {
        if (!isObject(obj)) return obj;
        if (Array.isArray(obj)) {
            obj.forEach(item => {
                this.track(item);
            });
        }

        'dispose' in obj && typeof obj.dispose === 'function' && sources.add(obj);
        'geometry' in obj && this.track(obj.geometry);
        'material' in obj && this.track(obj.material);
        'children' in obj && this.track(obj.children);

        if (obj instanceof THREE.Material) {
            for (const value of Object.values(obj)) {
                if (value instanceof THREE.Texture) {
                    this.track(value);
                }
            }
        }
        if (obj instanceof THREE.ShaderMaterial || obj instanceof THREE.RawShaderMaterial) {
            for (const uniform of Object.values(obj.uniforms)) {
                if (uniform) {
                    const { value } = uniform;
                    if (value instanceof THREE.Texture) {
                        this.track(value);
                    }
                }
            }
        }
        return obj;
    }
    trackByScene(scene: THREE.Scene) {
        this.track(scene);
    }
    dispose(obj: any) {
        this.sources.delete(obj);
        if (obj instanceof THREE.Object3D) {
            obj.removeFromParent();
            obj.clear();
        }
        obj.dispose && obj.dispose();
        return obj;
    }
    disposeGroup(group: THREE.Group) {
        if (group instanceof THREE.Group) {
            this.track(group, this._sources);
            this.allDispose(this._sources);
        }
    }
    allDispose(sources: Set<any> = this.sources) {
        for (let item of sources) {
            this.dispose(item);
        }
        sources.clear();
    }
    info() {
        return this.sources;
    }
}