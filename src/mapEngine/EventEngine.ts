import * as THREE from 'three';


import { Render } from './Render';
import { Building, BuildingLayer, BuildingSource, Route, RouteSource } from '@/types';
import { message } from '@/components/Message';
import { MapEngine } from '.';
const path = import.meta.env.PROD ? '../' : '/';
export class EventEngine {
    eventPool = ['fire', 'beat', 'jam',];
    preRouteLine = [{
        node: 5800,
        select: [
            {
                node: 2745,
                select: [
                    {
                        node: 520,
                        select: [
                            {
                                node: 1334,
                            },
                            {
                                node: 8040,
                                select: [
                                    {
                                        node: 8058,
                                        select: [
                                            {
                                                node: 8057,
                                                select: [
                                                    {
                                                        node: 6812,
                                                        select: [
                                                            {
                                                                node: 3499,
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        node: 1335,
                        select: [
                            {
                                node: 3446,
                                select: [
                                    {
                                        node: 6812,
                                        select: [
                                            {
                                                node: 3499,
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                node: 1334,
                            },
                        ],
                    },

                ],
            },
        ],
    }];
    isHaveJam: boolean = false;
    isHaveFire: boolean = false;
    isHaveBeat: boolean = false;
    cityData: BuildingSource | null = null;
    routeData: RouteSource | null = null;
    fireTexture: THREE.Texture = Render.textureLoader.load('fire.png');
    fireSprite: THREE.Sprite | null = null;
    constructor(private group: THREE.Group, public mapEngine: MapEngine) {

    }
    setCityData(data: BuildingSource) {
        this.cityData = data;
    }
    setRouteData(data: RouteSource) {
        this.routeData = data;
    }
    loadEvent() {
        const eventType = this.eventPool.at(Math.floor(Math.random() * this.eventPool.length));
        switch (eventType) {
            case 'fire': {
                this.createFireEvent('fire_1' + Math.random().toString());
                break;
            }
            case 'jam': {
                this.createJamEvent('jam_1' + Math.random().toString());
                break;
            }
            case 'beat': {
                this.createBetaEvent('beat_1' + Math.random().toString());
                break;
            }
            default: {
                break;
            }
        }
    }
    createJamEvent(eventId: string) {
        if (!this.routeData || this.isHaveJam) return;
        this.isHaveJam = true;
        const source = this.routeData[BuildingLayer.low];
        const randomRouteNode = this.preRouteLine.at(Math.floor(Math.random() * this.preRouteLine.length))!;
        const buildInfo = source.at(randomRouteNode!.node)!;
        const points = buildInfo.points;

        const centerPointOffset = (Math.floor(points.length / 3 / 2));
        const centerPoint = new THREE.Vector3(points[centerPointOffset * 3], 0, -points[centerPointOffset * 3 + 1]);
        const label = this.mapEngine.mapRender.create2DLabel(eventId, {
            insertContent: `
            <div>
            <div class="header">事件突发</div>
            <div class="info" >无人机${Math.random().toString().slice(3, 5)}号发现${buildInfo?.name}出现道路堵车</div>
            <div class="handle">
            <button class="${eventId}_1">道路疏通</button>
            <button class="${eventId}_2">视角追踪</button>
            </div>
            </div>
            `
            , className: "display_card"
        });
        const btn = label.element.getElementsByClassName(eventId + "_1");

        btn[0].addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            this.mapEngine.mapRender.remove2DLabel(eventId);
            message.success("当前路况已同步至交管局，请选择临时疏通路线!");

            this.createJamPickSprite(randomRouteNode.select, []).then((res: any) => {

                message.success("已推送至相关道路车辆!");
                setTimeout(() => {
                    for (const r of res) {
                        this.mapEngine.routeEngine.pickLine(r.minPointIndex, r.maxPointIndex, 0);
                    }
                    this.mapEngine.routeEngine.pickLine(buildInfo.minPointIndex, buildInfo.maxPointIndex, 0);
                    this.isHaveJam = false;
                    message.success("检测到路段已疏通，已同步至相关道路车辆!");
                }, 4000);
            });

        });
        const btn2 = label.element.getElementsByClassName(eventId + "_2");

        btn2[0].addEventListener("pointerdown", (e) => {
            e.stopPropagation();

            this.mapEngine.mapRender.emit("boardMessage", {
                type: "flyTo",
                info: {
                    center: {
                        x: buildInfo!.points[0], y: 20, z: buildInfo!.points[1]
                    }
                }
            });
            this.mapEngine.routeEngine.pickLine(buildInfo.minPointIndex, buildInfo.maxPointIndex, 1);
        });
        label.position.copy(centerPoint);
        this.group.add(label);
        message.success("无人机检测到突发事件!");
    }
    createFireEvent(eventId: string) {
        if (!this.cityData || this.isHaveFire) return;
        this.isHaveFire = true;
        const source = this.cityData[BuildingLayer.low]['180'];
        const buildInfo = source.at(Math.floor(Math.random() * source.length));

        const label = this.mapEngine.mapRender.create2DLabel(eventId, {
            insertContent: `
            <div>
            <div class="header">事件突发</div>
            <div class="info" >无人机${Math.random().toString().slice(3, 5)}号发现${buildInfo?.name}出现火灾</div>
            <div class="handle">
            <button class="${eventId}_1">同步到消防局</button>
            <button class="${eventId}_2">视角追踪</button>
            </div>
            </div>
            `
            , className: "display_card"
        });
        const btn = label.element.getElementsByClassName(eventId + "_1");

        btn[0].addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            this.mapEngine.mapRender.remove2DLabel(eventId);
            message.success("已成功同步至消防局!");
            setTimeout(() => {
                message.success("收到一条来自消防局的新消息：消防已开始出发!");
            }, 3000);
            setTimeout(() => {
                this.removeSprite();
                message.success("收到一条来自消防局的新消息：火灾已扑灭！");
                this.isHaveFire = false;
            }, 7000);
        });
        const btn2 = label.element.getElementsByClassName(eventId + "_2");

        btn2[0].addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            this.mapEngine.mapRender.emit("boardMessage", {
                type: "flyTo",
                info: buildInfo
            });
        });

        label.position.set(buildInfo!.center.x, buildInfo!.height, -buildInfo!.center.z);
        this.group.add(label);
        message.success("无人机检测到突发事件!");
        this.createSprite(label.position.clone().add(new THREE.Vector3(0, 10, 0)), this.fireTexture);
    }
    createBetaEvent(eventId: string) {
        if (!this.routeData || this.isHaveBeat) return;
        this.isHaveBeat = true;
        const source = this.routeData[BuildingLayer.low];

        const buildInfo = source.at(Math.floor(Math.random() * source.length))!;
        const points = buildInfo.points;

        const centerPointOffset = (Math.floor(points.length / 3 / 2));
        const centerPoint = new THREE.Vector3(points[centerPointOffset * 3], 0, -points[centerPointOffset * 3 + 1]);

        const label = this.mapEngine.mapRender.create2DLabel(eventId, {
            insertContent: `
            <div>
            <div class="header">事件突发</div>
            <div class="info" >无人机${Math.random().toString().slice(3, 5)}号发现${buildInfo?.name}出现${['互殴', '老人摔倒'].at(Math.floor(Math.random() * 2))}</div>
            <div class="handle">
            <button class="${eventId}_1">同步到警察局</button>
            <button class="${eventId}_2">视角追踪</button>
            </div>
            </div>
            `
            , className: "display_card"
        });
        const btn = label.element.getElementsByClassName(eventId + "_1");

        btn[0].addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            this.mapEngine.mapRender.remove2DLabel(eventId);
            message.success("已成功同步至警察局!");
            setTimeout(() => {
                message.success("收到一条来自警察局的新消息：民警已开始出发!");
            }, 3000);
            setTimeout(() => {
                this.isHaveBeat = false;
                message.success("收到一条来自警察局的新消息：事件正在处理！");
            }, 7000);
        });
        const btn2 = label.element.getElementsByClassName(eventId + "_2");

        btn2[0].addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            this.mapEngine.mapRender.emit("boardMessage", {
                type: "flyTo",
                info: {
                    center: {
                        x: buildInfo!.points[0], y: 20, z: buildInfo!.points[1]
                    }
                }
            });
        });

        label.position.copy(centerPoint);
        this.group.add(label);
        message.success("无人机检测到突发事件!");

    }
    createSprite(v3: THREE.Vector3, texture: THREE.Texture) {
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            color: "#ffff00"
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(100, 100, 1);
        sprite.position.copy(v3);
        this.fireSprite = sprite;
        this.group.add(sprite);
    }
    async createJamPickSprite(layerData: any, dataRes: Route[]) {
        if (!layerData) return dataRes;
        return new Promise((_res, _rej) => {
            if (!this.routeData) return _rej([]);
            for (const item of layerData) {
                const source = this.routeData[BuildingLayer.low];
                const buildInfo = source.at(item!.node)!;
                const points = buildInfo.points;
                const eventId = item!.node;
                const centerPointOffset = (Math.floor(points.length / 3 / 2));
                const centerPoint = new THREE.Vector3(points[centerPointOffset * 3], 0, -points[centerPointOffset * 3 + 1]);

                const label = this.mapEngine.mapRender.create2DLabel(eventId, {
                    insertContent: `
                    <span>当前路况${['良好', '较差',].at(Math.floor(Math.random() * 2))}</span>
                    <button class="${eventId}_1"><img src=${`${path}sign.png`}></button>
                    `
                    , className: "route_select"
                });
                const btn = label.element.getElementsByClassName(eventId + "_1");

                btn[0].addEventListener("pointerdown", (e) => {
                    e.stopPropagation();
                    for (const i of layerData) {
                        this.mapEngine.mapRender.remove2DLabel(i.node);
                    }
                    message.success("已加入推荐道路疏通路线!");
                    dataRes.push(buildInfo);
                    this.mapEngine.routeEngine.pickLine(buildInfo.minPointIndex, buildInfo.maxPointIndex, 2);
                    this.createJamPickSprite(item.select, dataRes).then(res => {
                        _res(res);
                    });
                });
                label.position.copy(centerPoint);
                this.group.add(label);
            }
        });
    }
    removeSprite() {
        this.fireSprite?.removeFromParent();
        this.fireSprite = null;
    }



}