import { transfer, wrap } from 'comlink';
import ThreeWorkerBuildString from '../../public/threeWorker.js?raw';
export const useThreeWorker = <T>(handleObject: () => T, buffers: ArrayBuffer[] = []): T => {

    const workerBuildString = `
    importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");
    (()=>{
        const useEncodeBuffer = (data) => {
            const strJson = JSON.stringify(data);
            const encoder = new TextEncoder();
            const unit8array = encoder.encode(strJson);
            return unit8array;
        };
        const useDecodeBuffer = (data) => {
            const encoder = new TextDecoder();
            const unit8array = encoder.decode(data);
            return JSON.parse(unit8array);
        };
        const transfer = Comlink.transfer;
        ${ThreeWorkerBuildString}
        const handleObject = (${handleObject})();
        Comlink.expose(handleObject);
    })()`;
    const blob = new Blob([workerBuildString], { type: 'text/javascript' });
    for (const buffer of buffers) {

        transfer(buffer, [buffer]);
    }
    return wrap<any>(new Worker(URL.createObjectURL(blob)));
};