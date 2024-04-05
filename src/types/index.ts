import { MapEngine } from "@/mapEngine";
import { Render } from "@/mapEngine/Render";

export interface Pipeline<T> {
    apply(renderer: Render, mapEngine: MapEngine): Promise<T>;
}