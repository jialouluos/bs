import { message } from '@/components/Message';
import * as THREE from 'three';
export const isObject = (o: any): o is object => {
    return typeof o === 'object' && o !== null;
};
export const isMesh = (o: any): o is THREE.Mesh => {
    return o instanceof THREE.Mesh || 'geometry' in o;
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


export const _runTask = <T>(task: () => T, resolve: (value: T) => void, reject: (reason?: any) => void, lastTime: number) => {

    if ('requestIdleCallback' in window) {
        requestIdleCallback(idle => {
            const remainingTime = idle.timeRemaining();
            if (remainingTime > 2 || new Date().getTime() - lastTime > 2000) {
                //至少剩余2ms或者延迟到2000ms
                Promise.resolve(task()).then(resolve).catch(reject);
            } else {
                _runTask(task, resolve, reject, lastTime);
            }
        });
    } else
        if ('requestAnimationFrame' in window) {
            const selfLastTime = new Date().getTime();
            requestAnimationFrame(() => {
                const nowTime = new Date().getTime();
                if (nowTime - selfLastTime > 16.6) {
                    return Promise.resolve(task()).then(resolve).catch(reject);
                } else {
                    return _runTask(task, resolve, reject, lastTime);
                }
            });
        } else {
            //no run
        }
};

export const runTask = <T>(task: () => T | Promise<T>): Promise<T> => {
    return new Promise<T>((_res, _rej) => {
        _runTask(task, _res, _rej, new Date().getTime());
    });
};

const _runTaskStream = <T extends any[]>(taskList: ((...args: any[]) => T)[], resolveList: (T)[] = [], resolve: (value: any) => void, reject: (reason?: any) => void, lastResolve: T) => {


    if (!taskList.length) {
        resolve(resolveList);
    } else {
        const task = taskList.shift()!;
        runTask<typeof task extends () => infer R ? R : any>(() => task(lastResolve)).then(returnValue => {

            resolveList.push(returnValue);
            _runTaskStream(taskList, resolveList, resolve, reject, returnValue);
        });
    }
};

export const runTaskStream = <T>(taskList: ((...args: any[]) => any | Promise<any>)[],) => {
    return new Promise<T>((_res, _rej) => {
        _runTaskStream(taskList, [], _res, _rej, undefined,);
    });
};

const timeMap = new Map();

export const timeInfoStart = (info: string, color: string) => {
    timeMap.set(info, window.performance.now());
    console.log(`%c开始${info}...`, `color:${color};`);
    console.time(`${info}耗时`);
};
export const timeInfoEnd = (info: string, color: string) => {
    console.timeEnd(`${info}耗时`);
    console.log(`%c----${info}完成----`, `color:${color};`);
    return window.performance.now() - timeMap.get(info);
};