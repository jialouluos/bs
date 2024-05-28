import * as THREE from 'three';
import { EventDispatcher, Vector3, Vector2, Spherical, Quaternion, MOUSE, Matrix4, PerspectiveCamera, OrthographicCamera } from 'three';
import gsap from "gsap";

const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };
const STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
};
const EPS = 0.000001;
/**
 * @对比官方去除了一些用不到的功能
 * @`1.去除自动旋转`
 * @`2.去除touch`
 */
export class OrbitControls extends EventDispatcher {
    /** @相机 */
    object: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    /** @挂载的dom */
    domElement: HTMLElement;
    /** @是否启用轨道控制器 */
    enabled: boolean;
    /** @焦点 */
    target: Vector3;
    /** @透视相机 距离焦点的最小距离*/
    minDistance: number;
    /** @透视相机 距离焦点的最大距离*/
    maxDistance: number;
    /** @正交相机 zoom的最小系数*/
    minZoom: number;
    /** @正交相机 zoom的最大系数*/
    maxZoom: number;
    /** @最小极角 垂直方向*/
    minPolarAngle: number;
    /** @最大极角 垂直方向*/
    maxPolarAngle: number;
    /** @最小方位角 水平方向*/
    minAzimuthAngle: number;
    /** @最大方位角 水平方向*/
    maxAzimuthAngle: number;
    /**@阻尼开关 */
    enableDamping: boolean;
    /**@阻尼系数 */
    dampingFactor: number;
    /**@启用缩放 实际zoom在这里面也对【透视相机】生效 */
    enableZoom: boolean;
    /**@旋转开关 */
    enableRotate: boolean;
    /**@平移开关 */
    enablePan: boolean;
    /**@鼠标点击类型 */
    mouseButtons: { LEFT: MOUSE, MIDDLE: MOUSE, RIGHT: MOUSE; DEFAULT: -1; };
    /**@用于暂存target数据 */
    target0: Vector3;
    /**@用于暂存position数据 */
    position0: Vector3;
    /**@用于暂存zoom数据 */
    zoom0: number;
    /**@球体坐标系 */
    spherical: Spherical;
    /**@键盘事件绑定的dom */
    private _domElementKeyEvents: HTMLElement | null;
    /**@当前控制器的状态 */
    state: number;
    /**@更新函数 利用闭包 */
    update!: () => void;
    /**@缩放的速度 倍数*/
    scale: number;
    /**@平移相关 */
    pan: Pan;
    /**@旋转相关 */
    rotate: Rotate;
    /**@zoom是否发生变化 */
    zoomChanged: boolean;
    /**@缩放相关 */
    zoom: Zoom;
    /**@用于存储当前的鼠标或触摸事件 它的长度取决于设备的支持能力*/
    pointers: any[];
    /**@用于存储每个鼠标或触摸事件的位置 */
    pointerPositions: any;
    /**@temp V3 */
    tempV3: Vector3;
    constructor(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, domElement: HTMLElement) {
        super();
        if (camera === undefined) console.warn('OrbitControls: The first parameter "camera" is now mandatory.');
        if (domElement === undefined) console.warn('OrbitControls: The second parameter "domElement" is now mandatory.');
        this.object = camera;
        this.domElement = domElement;
        this.domElement.style.touchAction = 'none'; //禁用触摸滚动事件
        this.target = new Vector3();
        this.minDistance = 0;
        this.maxDistance = Infinity;
        this.minZoom = 0;
        this.maxZoom = Infinity;
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;
        this.minAzimuthAngle = - Infinity;
        this.maxAzimuthAngle = Infinity;
        this.dampingFactor = 0.05;
        this.enabled = true;
        this.enableDamping = false;
        this.enableZoom = true;
        this.enableRotate = true;
        this.enablePan = true;
        this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN, DEFAULT: -1 };
        this.target0 = this.target.clone();
        this.position0 = this.object.position.clone();
        this.zoom0 = this.object.zoom;
        this.tempV3 = new Vector3();
        this.spherical = new Spherical();
        this.scale = 1;
        this.pan = new Pan(this);
        this.rotate = new Rotate(this);
        this._domElementKeyEvents = null;
        this.state = STATE.NONE;
        this.zoomChanged = false;
        this.zoom = new Zoom(this);
        this.pointers = [];
        this.pointerPositions = {};

        this.init();
    }
    /**@获取当前处于球体坐标系上的垂直方向上的极角 */
    getPolarAngle = () => {
        return this.spherical.phi;
    };
    /**@获取当前处于球体坐标系上的水平方向上的方位角 */
    getAzimuthalAngle = () => {
        return this.spherical.theta;
    };
    /**@获取当前相机距离焦点的距离 */
    getDistance = () => {
        return this.object.position.distanceTo(this.target);
    };
    /**@绑定键盘事件 */
    listenToKeyEvents = (domElement: HTMLElement) => {
        domElement.addEventListener('keydown', this.onKeyDown);
        this._domElementKeyEvents = domElement;
    };
    /**@储存当前相机状态 结合reset使用*/
    saveState = () => {
        this.target0.copy(this.target);
        this.position0.copy(this.object.position);
        this.zoom0 = this.object.zoom;
    };
    reset = () => {
        this.target.copy(this.target0);
        this.object.position.copy(this.position0);
        this.object.zoom = this.zoom0;
        this.object.updateProjectionMatrix();
        this.dispatchEvent(_changeEvent as never);
        this.update();
        this.state = STATE.NONE;
    };
    private init = () => {
        const offset = new Vector3();
        const quat = new Quaternion().setFromUnitVectors(this.object.up, new Vector3(0, 1, 0));//保证相机的上方向始终与全局 Y 轴平行
        const quatInverse = quat.clone().invert();
        const lastPosition = new Vector3();
        const lastQuaternion = new Quaternion();
        const twoPI = 2 * Math.PI;
        this.update = () => {
            const position = this.object.position;
            offset.copy(position).sub(this.target);//计算相机距离焦点的相对坐标
            offset.applyQuaternion(quat);//当defaultUp不为y时，进行相应变换修正
            this.spherical.setFromVector3(offset);//设置球体坐标系，通过向量的方式
            if (this.enableDamping) {
                this.spherical.theta += this.rotate.sphericalDelta.theta * this.dampingFactor;
                this.spherical.phi += this.rotate.sphericalDelta.phi * this.dampingFactor;
            } else {
                this.spherical.theta += this.rotate.sphericalDelta.theta;
                this.spherical.phi += this.rotate.sphericalDelta.phi;
            }
            let min = this.minAzimuthAngle;
            let max = this.maxAzimuthAngle;
            if (isFinite(min) && isFinite(max)) {
                if (min < - Math.PI) min += twoPI; else if (min > Math.PI) min -= twoPI;
                if (max < - Math.PI) max += twoPI; else if (max > Math.PI) max -= twoPI;
                if (min <= max) {
                    this.spherical.theta = Math.max(min, Math.min(max, this.spherical.theta));
                } else {
                    this.spherical.theta = (this.spherical.theta > (min + max) / 2) ?
                        Math.max(min, this.spherical.theta) :
                        Math.min(max, this.spherical.theta);
                }
            }
            this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
            this.spherical.makeSafe();
            this.spherical.radius *= this.scale;
            this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
            if (this.enableDamping === true) {
                this.target.addScaledVector(this.pan.panOffset, this.dampingFactor);
            } else {
                this.target.add(this.pan.panOffset);//应用偏移
            }
            offset.setFromSpherical(this.spherical);//经过min与max的修正，此时offset的范围是合法的

            // rotate offset back to "camera-up-vector-is-up" space
            offset.applyQuaternion(quatInverse);//需要将其从相机坐标系变换到全局坐标系下

            position.copy(this.target).add(offset);//offset是相机坐标距离焦点的相对坐标

            this.object.lookAt(this.target);

            if (this.enableDamping === true) {
                this.rotate.sphericalDelta.theta *= (1 - this.dampingFactor);
                this.rotate.sphericalDelta.phi *= (1 - this.dampingFactor);
                this.pan.panOffset.multiplyScalar(1 - this.dampingFactor);
            } else {
                this.rotate.sphericalDelta.set(0, 0, 0);
                this.pan.panOffset.set(0, 0, 0);
            }
            this.scale = 1;

            // update condition is:
            // min(camera displacement, camera rotation in radians)^2 > EPS
            // using small-angle approximation cos(x/2) = 1 - x^2 / 8

            if (this.zoomChanged ||
                lastPosition.distanceToSquared(this.object.position) > EPS ||
                8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS) {
                this.dispatchEvent(_changeEvent as never);
                lastPosition.copy(this.object.position);
                lastQuaternion.copy(this.object.quaternion);
                this.zoomChanged = false;
                return true;
            }
            return false;
        };
        this.domElement.addEventListener('contextmenu', this.onContextMenu);
        this.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.domElement.addEventListener('pointercancel', this.onPointerCancel);
        this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });
    };
    dispose = () => {
        this.domElement.removeEventListener('contextmenu', this.onContextMenu);
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.domElement.removeEventListener('pointercancel', this.onPointerCancel);
        this.domElement.removeEventListener('wheel', this.onMouseWheel);
        this.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.domElement.removeEventListener('pointerup', this.onPointerUp);
        if (this._domElementKeyEvents !== null) {
            this._domElementKeyEvents.removeEventListener('keydown', this.onKeyDown);
        }
    };
    onPointerDown = (event: PointerEvent) => {
        if (this.enabled === false) return;
        if (this.pointers.length === 0) {
            this.domElement.setPointerCapture(event.pointerId);
            this.domElement.addEventListener('pointermove', this.onPointerMove);
            this.domElement.addEventListener('pointerup', this.onPointerUp);
        }
        this.pointers.push(event);
        if (event.pointerType === 'touch') {
            //
        } else {
            this.onMouseDown(event);
        }

    };
    onPointerMove = (event: PointerEvent) => {
        if (this.enabled === false) return;
        if (event.pointerType === 'touch') {
            //
        } else {
            this.onMouseMove(event);
        }

    };
    onPointerUp = (event: PointerEvent) => {

        this.removePointer(event);

        if (this.pointers.length === 0) {

            this.domElement.releasePointerCapture(event.pointerId);

            this.domElement.removeEventListener('pointermove', this.onPointerMove);
            this.domElement.removeEventListener('pointerup', this.onPointerUp);

        }

        this.dispatchEvent(_endEvent as never);

        this.state = STATE.NONE;

    };
    onPointerCancel = (event: PointerEvent) => {
        this.removePointer(event);
    };
    onMouseDown = (event: PointerEvent) => {
        let mouseAction: MOUSE | -1;
        switch (event.button) {
            case 0:
                mouseAction = this.mouseButtons.LEFT;
                break;
            case 1:
                mouseAction = this.mouseButtons.MIDDLE;
                break;
            case 2:
                mouseAction = this.mouseButtons.RIGHT;
                break;
            default:
                mouseAction = this.mouseButtons.DEFAULT;
        }
        switch (mouseAction) {
            case MOUSE.DOLLY:
                if (this.enableZoom === false) return;
                this.zoom.handleMouseDownDolly(event);
                this.state = STATE.DOLLY;
                break;
            case MOUSE.ROTATE:
                if (event.ctrlKey || event.metaKey || event.shiftKey) {
                    if (this.enablePan === false) return;
                    this.pan.handleMouseDownPan(event);
                    this.state = STATE.PAN;
                } else {
                    if (this.enableRotate === false) return;
                    this.rotate.handleMouseDownRotate(event);
                    this.state = STATE.ROTATE;
                }
                break;
            case MOUSE.PAN:
                if (event.ctrlKey || event.metaKey || event.shiftKey) {
                    if (this.enableRotate === false) return;
                    this.rotate.handleMouseDownRotate(event);
                    this.state = STATE.ROTATE;
                } else {
                    if (this.enablePan === false) return;
                    this.pan.handleMouseDownPan(event);
                    this.state = STATE.PAN;
                }
                break;
            default:
                this.state = STATE.NONE;
        }
        if (this.state !== STATE.NONE) {
            this.dispatchEvent(_startEvent as never);
        }
    };
    onMouseMove = (event: PointerEvent) => {

        if (this.enabled === false) return;

        switch (this.state) {

            case STATE.ROTATE:

                if (this.enableRotate === false) return;

                this.rotate.handleMouseMoveRotate(event);

                break;

            case STATE.DOLLY:

                if (this.enableZoom === false) return;

                this.zoom.handleMouseMoveDolly(event);

                break;

            case STATE.PAN:

                if (this.enablePan === false) return;

                this.pan.handleMouseMovePan(event);

                break;

        }

    };
    onMouseWheel = (event: WheelEvent) => {
        if (this.enabled === false || this.enableZoom === false || this.state !== STATE.NONE) return;
        event.preventDefault();

        this.dispatchEvent(_startEvent as never);

        this.zoom.handleMouseWheel(event);

        this.dispatchEvent(_endEvent as never);

    };
    onKeyDown = (event: KeyboardEvent) => {

        if (this.enabled === false || this.enablePan === false) return;

        this.pan.handleKeyDown(event);

    };
    onContextMenu(event: MouseEvent) {

        if (this.enabled === false) return;

        event.preventDefault();

    }
    removePointer = (event: PointerEvent) => {

        delete this.pointerPositions[event.pointerId];

        for (let i = 0; i < this.pointers.length; i++) {

            if (this.pointers[i].pointerId === event.pointerId) {

                this.pointers.splice(i, 1);
                return;

            }

        }

    };
}
class Pan {
    tempV3: Vector3;
    /**@平移的偏移量 作用于相机坐标和相机焦点 */
    panOffset: Vector3;
    /**@将相机的平移转为屏幕空间的平移操作 确保相机的朝向和角度不会发生改变 */
    screenSpacePanning: boolean = false;
    scope: OrbitControls;
    /**@记录偏移变化前的值 */
    panStart: Vector2;
    /**@记录偏移变化后的值 */
    panEnd: Vector2;
    /**@记录偏移变化的值 */
    panDelta: Vector2;
    /**@平移系数 */
    panSpeed: number;
    /**@键盘操控平移系数 */
    keyPanSpeed: number;
    /**@平移控制按键 */
    keys: {
        LEFT: string;
        UP: string;
        RIGHT: string;
        BOTTOM: string;
    };
    constructor(scope: OrbitControls) {
        this.scope = scope;
        this.tempV3 = new Vector3();
        this.panOffset = new Vector3();
        this.panStart = new Vector2();
        this.panEnd = new Vector2();
        this.panDelta = new Vector2();
        this.panSpeed = 1.0;
        this.keyPanSpeed = 7.0;
        this.keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };
    }
    panLeft(distance: number, objectMatrix: Matrix4) {
        this.tempV3.setFromMatrixColumn(objectMatrix, 0); //通过读取变换矩阵的 X 轴部分来获取包含平移信息的向量
        this.tempV3.multiplyScalar(- distance);
        this.panOffset.add(this.tempV3);
    }
    panUp(distance: number, objectMatrix: Matrix4) {
        if (this.screenSpacePanning === true) {
            this.tempV3.setFromMatrixColumn(objectMatrix, 1);//如果只是在屏幕空间移动的话只需要获取Y轴部分的包含平移的信息
        } else {
            this.tempV3.setFromMatrixColumn(objectMatrix, 0);//否则需要计算x轴平移信息与up做叉乘得到偏移的方向，并对该方向施加平移变换
            this.tempV3.crossVectors(this.scope.object.up, this.tempV3);
        }
        this.tempV3.multiplyScalar(distance);
        this.panOffset.add(this.tempV3);
    }
    pan = (deltaX: number, deltaY: number) => {
        const element = this.scope.domElement;
        if (this.scope.object instanceof PerspectiveCamera) {
            // perspective
            const position = this.scope.object.position;
            this.tempV3.copy(position).sub(this.scope.target);
            let targetDistance = this.tempV3.length();//考虑相机如果距离物体较远应当移动距离更大：当相机和目标点的距离较远时，相机需要在屏幕上移动的距离较大，从而实现相应的平移操作；而当相机和目标点的距离较近时，相机需要在屏幕上移动的距离较小，从而实现相应的平移操作。
            targetDistance *= Math.tan((this.scope.object.fov / 2) * Math.PI / 180.0);//屏幕上相机到目标点之间的中心线与屏幕上边缘之间的距离
            this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.scope.object.matrix);//clientHeight 消除不同设备之间的窗口高度带来的差异
            this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.scope.object.matrix);
        } else if (this.scope.object.isOrthographicCamera) {
            // orthographic
            this.panLeft(deltaX * (this.scope.object.right - this.scope.object.left) / this.scope.object.zoom / element.clientWidth, this.scope.object.matrix);
            this.panUp(deltaY * (this.scope.object.top - this.scope.object.bottom) / this.scope.object.zoom / element.clientHeight, this.scope.object.matrix);
        } else {
            // camera neither orthographic nor perspective
            console.warn('WARNING: OrbitControls encountered an unknown camera type - pan disabled.');
            this.scope.enablePan = false;
        }
    };
    handleMouseDownPan = (event: MouseEvent) => {
        this.panStart.set(event.clientX, event.clientY);
    };
    handleMouseMovePan = (event: MouseEvent) => {
        this.panEnd.set(event.clientX, event.clientY);
        this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
        this.pan(this.panDelta.x, this.panDelta.y);
        this.panStart.copy(this.panEnd);
        this.scope.update();
    };
    handleKeyDown = (event: KeyboardEvent) => {
        let needsUpdate = false;
        switch (event.code) {
            case this.keys.UP:
                this.pan(0, this.keyPanSpeed);
                needsUpdate = true;
                break;
            case this.keys.BOTTOM:
                this.pan(0, - this.keyPanSpeed);
                needsUpdate = true;
                break;
            case this.keys.LEFT:
                this.pan(this.keyPanSpeed, 0);
                needsUpdate = true;
                break;
            case this.keys.RIGHT:
                this.pan(- this.keyPanSpeed, 0);
                needsUpdate = true;
                break;
        }
        if (needsUpdate) {
            event.preventDefault();
            this.scope.update();
        }
    };

}
class Rotate {
    scope: OrbitControls;
    /**@用于添加变换的球体坐标系 */
    sphericalDelta: Spherical;
    /**@记录rotation变化前的值 */
    rotateStart: Vector2;
    /**@记录rotation变化后的值 */
    rotateEnd: Vector2;
    /**@记录rotation变化的值 */
    rotateDelta: Vector2;
    /**@旋转系数 */
    rotateSpeed: number;
    /**@动画实例 */
    tween: any;
    deltaTweenObject!: {
        tempPhi: number;
        tempTheta: number;
        lastPhi: number;
        lastTheta: number;
    };
    constructor(scope: OrbitControls) {
        this.scope = scope;
        this.sphericalDelta = new Spherical();
        this.rotateStart = new Vector2();
        this.rotateEnd = new Vector2();
        this.rotateDelta = new Vector2();
        this.rotateSpeed = 1.0;
    }
    getDeltaTweenObject() {
        this.deltaTweenObject = {
            tempPhi: this.scope.getPolarAngle(),
            tempTheta: this.scope.getAzimuthalAngle(),
            lastPhi: this.scope.getPolarAngle(),
            lastTheta: this.scope.getAzimuthalAngle(),
        };
        this.tween && this.tween.kill();
    }
    updateDeltaTweenObject() {
        this.sphericalDelta.phi = this.deltaTweenObject.tempPhi - this.deltaTweenObject.lastPhi;
        this.deltaTweenObject.lastPhi = this.deltaTweenObject.tempPhi;
        this.sphericalDelta.theta = this.deltaTweenObject.tempTheta - this.deltaTweenObject.lastTheta;
        this.deltaTweenObject.lastTheta = this.deltaTweenObject.tempTheta;
    }
    rotateLeft(angle: number) {
        this.sphericalDelta.theta -= angle;
    }
    rotateUp(angle: number) {
        this.sphericalDelta.phi -= angle;
    }
    handleMouseDownRotate = (event: MouseEvent) => {
        this.rotateStart.set(event.clientX, event.clientY);
    };
    handleMouseMoveRotate = (event: MouseEvent) => {
        this.rotateEnd.set(event.clientX, event.clientY);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);
        const element = this.scope.domElement;
        this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight); //将不同分辨率下的鼠标位移映射到相同的旋转角度上，以确保在不同设备上的表现一致。
        this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
        this.rotateStart.copy(this.rotateEnd);
        this.scope.update();
    };
    /**@俯视 */
    rotateToOverLook() {
        this.getDeltaTweenObject();
        this.tween = gsap.to(this.deltaTweenObject, {
            tempPhi: -Math.PI / 2,
            tempTheta: 0,
            duration: 0.5,
            onUpdate: () => {
                this.updateDeltaTweenObject();
            }
        });
    }
    /**@正视 */
    rotateToFaceUp() {
        this.getDeltaTweenObject();
        this.tween = gsap.to(this.deltaTweenObject, {
            tempPhi: Math.PI / 2,
            tempTheta: 0,
            duration: 0.5,
            onUpdate: () => {
                this.updateDeltaTweenObject();
            }
        });
    }
    /**@侧视 */
    rotateToLateralLook() {
        this.getDeltaTweenObject();
        this.tween = gsap.to(this.deltaTweenObject, {
            tempPhi: Math.PI / 2,
            tempTheta: -Math.PI / 2,
            duration: 0.5,
            onUpdate: () => {
                this.updateDeltaTweenObject();
            }
        });
    }
}
class Zoom {
    scope: OrbitControls;
    /**@缩放系数 距离 */
    zoomSpeed: number;
    /**@记录缩放变化前的值 */
    dollyStart: Vector2;
    /**@记录缩放变化后的值 */
    dollyEnd: Vector2;
    /**@记录缩放变化的值 */
    dollyDelta: Vector2;
    constructor(scope: OrbitControls) {
        this.scope = scope;
        this.zoomSpeed = 1.0;
        this.dollyStart = new Vector2();
        this.dollyEnd = new Vector2();
        this.dollyDelta = new Vector2();
    }
    getZoomScale() {
        return Math.pow(0.95, this.zoomSpeed);
    }
    dollyOut = (dollyScale: number) => {
        if (this.scope.object instanceof PerspectiveCamera) {
            this.scope.scale /= dollyScale;
        } else if (this.scope.object instanceof OrthographicCamera) {
            this.scope.object.zoom = Math.max(this.scope.minZoom, Math.min(this.scope.maxZoom, this.scope.object.zoom * dollyScale));
            this.scope.object.updateProjectionMatrix();
            this.scope.zoomChanged = true;
        } else {
            console.warn('WARNING: OrbitControls encountered an unknown camera type - dolly/zoom disabled.');
            this.scope.enableZoom = false;
        }
    };
    dollyIn = (dollyScale: number) => {
        if (this.scope.object instanceof PerspectiveCamera) {
            this.scope.scale *= dollyScale;
        } else if (this.scope.object instanceof OrthographicCamera) {
            this.scope.object.zoom = Math.max(this.scope.minZoom, Math.min(this.scope.maxZoom, this.scope.object.zoom / dollyScale));
            this.scope.object.updateProjectionMatrix();
            this.scope.zoomChanged = true;
        } else {
            console.warn('WARNING: OrbitControls encountered an unknown camera type - dolly/zoom disabled.');
            this.scope.enableZoom = false;
        }
    };
    handleMouseDownDolly = (event: MouseEvent) => {
        this.dollyStart.set(event.clientX, event.clientY);
    };
    handleMouseMoveDolly = (event: MouseEvent) => {
        this.dollyEnd.set(event.clientX, event.clientY);
        this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
        if (this.dollyDelta.y > 0) {
            this.dollyOut(this.getZoomScale());
        } else if (this.dollyDelta.y < 0) {
            this.dollyIn(this.getZoomScale());
        }
        this.dollyStart.copy(this.dollyEnd);
        this.scope.update();
    };
    handleMouseWheel = (event: WheelEvent) => {
        if (event.deltaY < 0) {
            this.dollyIn(this.getZoomScale());
        } else if (event.deltaY > 0) {
            this.dollyOut(this.getZoomScale());
        }
        this.scope.update();
    };
}