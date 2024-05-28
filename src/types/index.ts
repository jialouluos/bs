import { MapEngine } from "@/mapEngine";
import { Render } from "@/mapEngine/Render";
import * as THREE from 'three';
export type Point = {
    x: number,
    y: number,
    z: number;
};
export interface Pipeline<T> {
    apply(renderer: Render, mapEngine: MapEngine): Promise<T>;
}
export interface Building {
    index: number;
    points: (THREE.Vector2 | Point)[];
    layer: BuildingLayer;
    name: string;
    height: number;
    center: THREE.Vector3 | Point;
    size: THREE.Vector3 | Point;
    drawIndex?: number;
}
export interface River {
    index: number;
    points: ([number, number])[];
    layer: RiverType;
    name: string;
}
export interface Route {
    points: number[];
    layer: RouteType;
    name?: string;
    highway: string;
    index: number;
    maxPointIndex: number;
    minPointIndex: number;
}
export enum RiverType {
    low = 0,
    normal = 1,
    high = 2,
}
export enum BuildingLayer {
    low = 0,
    normal = 1,
    high = 2,
}
export enum ModelType {
    CITY = "CITY",
    ROUTE = "ROUTE",
    RIVER = "RIVER",
    UAV = "UAV",
}
export enum RouteType {
    low = 0,
    normal = 1,
    high = 2,
}
export interface BuildingSource {
    [BuildingLayer.high]: Record<string, Building[]>;
    [BuildingLayer.low]: Record<string, Building[]>;
    [BuildingLayer.normal]: Record<string, Building[]>;
}
export interface RouteSource {
    [RouteType.high]: Route[];
    [RouteType.low]: Route[];
    [RouteType.normal]: Route[];
}
export interface RiverSource {
    [RiverType.high]: River[];
    [RiverType.low]: River[];
    [RiverType.normal]: River[];
}
