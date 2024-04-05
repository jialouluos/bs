
import { Pipeline } from '@/types';
import { Render } from './Render';


export class MapEngine {
    mapRender: Render;
    constructor(el: string | HTMLElement) {
        this.mapRender = new Render(el, { stats: true });
    }
    dispose() {
        this.mapRender.dispose();
    }
    startRender = () => {
        this.mapRender.render();
    };
    pauseRender = () => {
        this.mapRender.stopRender();
    };
    async runPipelines(ps: Pipeline<any>[]) {
        for (const p of ps) {
            await p.apply(this.mapRender, this);
        }
    }

}
