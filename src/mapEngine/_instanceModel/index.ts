import { Group, InstancedMesh, } from 'three';
import * as THREE from 'three';
import { isMesh } from '../../utils/tools';
import { Render } from '../Render';

export class InstanceModel {
    instanceGroup: (InstancedMesh | THREE.Mesh)[];
    instance: THREE.Object3D;
    group: THREE.Group;
    constructor(model: Group, private instanceCount: number, private mergeFlag: boolean, private userData: Record<string, any>) {
        this.instanceGroup = [];
        this.group = new THREE.Group();
        this.instance = this.traverse(model);

        Render.GCPool.disposeGroup(model);
    }
    setMatrixAt(index: number, matrixArray: THREE.Matrix4[] | THREE.Matrix4) {
        const localMatrix: THREE.Matrix4[] = [];
        this.getMatrixAt(index, localMatrix);
        for (let i = 0, len = this.instanceGroup.length; i < len; i++) {
            if (Array.isArray(matrixArray)) {
                const matrix = matrixArray[i];
                (this.instanceGroup[i] as InstancedMesh).setMatrixAt(index, localMatrix[i].clone().multiply(matrix));
            } else {
                (this.instanceGroup[i] as InstancedMesh).setMatrixAt(index, localMatrix[i].clone().multiply(matrixArray));
            }
            (this.instanceGroup[i] as InstancedMesh).instanceMatrix!.needsUpdate = true;
        }
    }
    forceSetMatrixAt(index: number, matrixArray: THREE.Matrix4[] | THREE.Matrix4) {
        for (let i = 0, len = this.instanceGroup.length; i < len; i++) {
            if (Array.isArray(matrixArray)) {
                const matrix = matrixArray[i];
                (this.instanceGroup[i] as InstancedMesh).setMatrixAt(index, matrix);
            } else {
                (this.instanceGroup[i] as InstancedMesh).setMatrixAt(index, matrixArray);
            }
            (this.instanceGroup[i] as InstancedMesh).instanceMatrix!.needsUpdate = true;
        }
    }
    setColorAt(index: number, colorArray: THREE.Color[] | THREE.Color) {
        for (let i = 0, len = this.instanceGroup.length; i < len; i++) {
            if (Array.isArray(colorArray)) {
                const color = colorArray[i];
                (this.instanceGroup[i] as InstancedMesh).setColorAt(index, color);
            } else {
                (this.instanceGroup[i] as InstancedMesh).setColorAt(index, colorArray);
            }
            (this.instanceGroup[i] as InstancedMesh).instanceColor!.needsUpdate = true;
        }
    }
    getMatrixAt(index: number, matrixArray: THREE.Matrix4[]) {
        for (let i = 0, len = this.instanceGroup.length; i < len; i++) {
            const matrix = new THREE.Matrix4();
            (this.instanceGroup[i] as InstancedMesh).getMatrixAt(index, matrix);
            matrixArray.push(matrix);
        }
    }
    /**调用时需要传入Group */
    traverse = (model: THREE.Object3D): THREE.Object3D => {
        if (this.mergeFlag) {
            return model;
        } else {
            const _group = new THREE.Group();
            const _instanceGroup: THREE.Mesh[] = [];
            model.traverse(item => {
                if (isMesh(item)) {
                    _instanceGroup.push(item);
                }
            });
            for (const mesh of _instanceGroup) {
                _group.attach(mesh);//将父矩阵的变换转移到自身
                const matrix = mesh.matrix.clone();
                mesh.geometry.applyMatrix4(matrix);
                const instance = new InstancedMesh(mesh.geometry.clone(), (mesh.material as THREE.Material)?.clone(), this.instanceCount);

                instance.userData = this.userData;
                instance.name = mesh.name;
                this.group.attach(instance);
                this.instanceGroup.push(instance);
            }
            return this.group;
        }

    };
}