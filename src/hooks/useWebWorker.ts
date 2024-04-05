const proxyMarker = Symbol('proxy');
const releaseProxy = Symbol('releaseProxy');
const throwMarker = Symbol('error');
interface EventSource {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: {}): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: {}): void;
}
export interface Endpoint extends EventSource {
    postMessage(message: any, transfer?: Transferable[]): void;
    start?: () => void;
}

enum MessageType {
    GET = 'GET',
    SET = 'SET',
    APPLY = 'APPLY',
    RELEASE = 'RELEASE',
}
enum ValueType {
    RAW = 'RAW',
    HANDLER = 'HANDLER',
}
interface MessageValue<T = any> {
    type: MessageType;
    value: T;
    id: string;
    path: string[];
}
interface RawValue {
    type: ValueType.RAW;
    value: any;

}
interface HandlerValue {
    type: ValueType.HANDLER;
    value: any;
    name: string;
}
interface ErrorValue {
    value: any;
    isError: boolean;
}
type WireValue = RawValue | HandlerValue;
interface Handle<T, V> {
    canHandle: (obj: unknown) => boolean;
    serialize: (obj: unknown) => [T, V[]];
    deserialize: (obj: T) => any;
}
const proxyCount = new WeakMap<Endpoint, number>();
const transferCacheObject = new WeakMap<any, Transferable[]>();
const proxyFinalizers =
    'FinalizationRegistry' in globalThis &&
    new FinalizationRegistry((ep: Endpoint) => {
        proxyCount.set(ep, (proxyCount.get(ep) ?? 1) - 1);
        if (!proxyCount.get(ep)) {
            releaseEndpoint(ep);
        }
    });

function isMessagePort(endpoint: Endpoint): endpoint is MessagePort {
    return endpoint.constructor.name === 'MessagePort';
}

function closeEndPoint(endpoint: Endpoint) {
    if (isMessagePort(endpoint)) endpoint.close();
}
const releaseEndpoint = (ep: Endpoint) => {
    return createMessage(ep, { type: MessageType.RELEASE }).then(_ => {
        closeEndPoint(ep);
    });
};
const unregisterProxy = (proxy: any) => {
    if (proxyFinalizers) {
        proxyFinalizers.unregister(proxy);
    }
};
const registerProxy = (proxy: any, ep: Endpoint) => {
    proxyCount.set(ep, (proxyCount.get(ep) ?? 0) + 1);
    if (proxyFinalizers) {
        proxyFinalizers.register(proxy, ep, proxy);
    }
};
const throwIfProxyReleased = (isReleased: boolean) => {
    if (isReleased) {
        throw new Error('Proxy has been released and is not useable');
    }
};
function generateUUID() {
    return new Array(4)
        .fill(0)
        .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
        .join('-');
}
const isObject = (obj: unknown): obj is Record<string | symbol, any> => {
    return (typeof obj === 'object' && obj !== null) || typeof obj === 'function';
};
const transferHandleBuild = (): Handle<MessagePort, Transferable> => {
    return {
        canHandle: (obj: unknown) => isObject(obj) && obj[proxyMarker],
        serialize: (obj: unknown) => {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port1); //这里要分清楚是在主线程环境下调用的还是在worker下调用的proxy()，如果是在主线程，那么是worker线程传递消息给主线程，主线程处理消息，反之则是worker线程处理消息
            return [port2, [port2]]; //将另一个port传递给信道的另一端
        },
        deserialize: port2 => {
            if ('start' in port2) port2.start();
            return wrap(port2); //接受传递来的另一端口，并将其交给proxy
        },
    };

};
const transferHandle = transferHandleBuild();
const throwHandlerBuild = (): Handle<ErrorValue, any> => {
    return {
        canHandle: obj => isObject(obj) && obj[throwMarker],
        serialize(obj: unknown) {
            if (obj instanceof Error) {
                return [
                    {
                        isError: true,
                        value: {
                            message: obj.message,
                            name: obj.name,
                            stack: obj.stack,
                        },
                    },
                    [],
                ];
            } else {
                return [{ isError: false, value: obj }, []];
            }
        },
        deserialize(serialized) {
            if (serialized.isError) {
                throw Object.assign(new Error(serialized.value.message), serialized.value);
            }
            throw serialized.value;
        },
    };

};
const throwHandler = throwHandlerBuild();
const handles = new Map<string, Handle<any, any>>([
    ['proxyMarker', transferHandle],
    ['throwMarker', throwHandler],
]);
const fromWireValue = (val: WireValue) => {

    switch (val.type) {
        case ValueType.RAW: {
            return val.value;
        }
        case ValueType.HANDLER: {
            return handles.get(val.name)?.deserialize(val.value);
        }
    }
};
const toWireValue = (val: any): [WireValue, Transferable[]] => {
    for (const [name, handle] of handles) {
        if (handle.canHandle(val)) {
            const [value, transfer] = transferHandle.serialize(val);
            return [
                {
                    type: ValueType.HANDLER,
                    value,
                    name,
                },
                transfer,
            ];
        }
    }

    return [
        {
            type: ValueType.RAW,
            value: val,
        },
        transferCacheObject.get(val) ?? [],
    ];
};

const wrap = (ep: Endpoint) => {
    return createProxy(ep);
};

const createMessage = (ep: Endpoint, obj: Partial<MessageValue>, transfer?: Transferable[]) => {
    const id = generateUUID(); //创建一个随机ID，用于区分不同的消息，因为存在多个文件调用同一个worker的情况，所以需要一个id去确认使用的双方
    return new Promise<WireValue & { id: string; }>((_res, _rej) => {

        ep.addEventListener('message', function call(ev: MessageEvent<WireValue & { id: string; }>) {
            if (!ev || !ev.data || ev.data.id !== id) return;
            ep.removeEventListener('message', call as any);
            _res(ev.data);
        } as any);
        if ('start' in ep && ep.start) ep.start();
        ep.postMessage(
            {
                id,
                ...obj,
            },
            transfer
        );
    });
};

const createProxy = (ep: Endpoint, path: string[] = []) => {
    let isProxyReleased = false;
    const proxy: any = new Proxy(function () { }, {
        get(_, prop) {
            throwIfProxyReleased(isProxyReleased);
            if (prop === releaseProxy) {
                return () => {
                    unregisterProxy(proxy);
                    releaseEndpoint(ep);
                    isProxyReleased = true;
                };
            }
            if (prop === 'then') {
                //这里表示只有 prop 为 then 时才发送消息执行取值操作，体现在 Comlink 上就是针对代理对象的操作都需要使用 await 获取。
                //thenable

                const r = createMessage(ep, {
                    type: MessageType.GET,
                    path: path,
                }).then(fromWireValue);
                return r.then.bind(r);
            }
            return createProxy(ep, [...path, prop as string]);
        },
        set(_, prop, newValue) {
            const [wireValue, transfer] = toWireValue(newValue);
            return createMessage(
                ep,
                {
                    type: MessageType.SET,
                    path: [...path, prop].map(p => p.toString()),
                    value: wireValue,
                },
                transfer
            ) as any;
        },
        apply(_, __, rawArgumentList) {
            const [wireValues, transfers] = rawArgumentList.map(toWireValue).reduce(
                (array, cur) => {
                    array = [
                        [...array[0], cur[0]],
                        [...array[1], ...cur[1]],
                    ];

                    return array;
                },
                [[] as WireValue[], [] as Transferable[]]
            );
            return createMessage(
                ep,
                {
                    type: MessageType.APPLY,
                    path: [...path].map(p => p.toString()),
                    value: wireValues,
                },
                transfers
            ).then(fromWireValue) as any;
        },
    });
    registerProxy(proxy, ep);
    return proxy;
};
export const transfer = <T>(obj: T, transfers: Transferable[]) => {
    transferCacheObject.set(obj, transfers);
    return obj;
};
export const proxy = (obj: Record<string, any>) => {
    return Object.assign(obj, { [proxyMarker]: true });
};
const expose = (rawObject: any, ep: Endpoint = globalThis as any, allowedOrigins: string[] = ['*']) => {
    ep.addEventListener('message', function call(ev: MessageEvent<MessageValue<any>>) {

        if (!ev || !ev.data) return;
        if (!allowedOrigins.includes(`*`) && !allowedOrigins.includes(ev.origin as (typeof allowedOrigins)[number])) return;
        const { id, path = [], type, value } = ev.data; //这里是内部用于传递数据的自定义类型
        let returnValue: any;

        try {
            const parentObj = path.slice(0, -1).reduce((obj, prop) => obj[prop], rawObject); //取到其父对象，用其父对象调用方法，保证this指向不变
            const rawValue = path.reduce((obj, prop) => obj[prop], rawObject) as any;

            switch (type) {
                case MessageType.GET:
                    {
                        returnValue = rawValue;

                    }
                    break;
                case MessageType.SET:
                    {
                        parentObj[path.slice(-1)[0]] = fromWireValue(value);
                        returnValue = true;
                    }
                    break;
                case MessageType.APPLY:
                    {
                        returnValue = rawValue.apply(parentObj, value.map(fromWireValue));
                    }
                    break;
                case MessageType.RELEASE:
                default:
                    {
                        returnValue = undefined;
                    }
                    break;
            }
        } catch (value) {
            returnValue = { value, throwMarker: true };
        }

        Promise.resolve(returnValue)
            .catch(value => {

                return { value, [throwMarker]: 0 };
            })
            .then(value => {
                const [wireValue, transfer] = toWireValue(value);
                ep.postMessage(
                    {
                        ...wireValue,
                        id,
                    },
                    transfer
                );
                if (type === MessageType.RELEASE) {
                    //释放
                    ep.removeEventListener('message', call as any);
                    closeEndPoint(ep);
                }
            })
            .catch(value => {

                return { value, [throwMarker]: 0 };
            });
    } as any);
    if ('start' in ep && ep.start) {
        ep.start();
    }
};
export const useWebWorker = <T = object>(handleObject: () => T): T => {
    const workerBuildString = `(()=>{
        const proxyMarker = Symbol('proxy');
        const releaseProxy = Symbol('releaseProxy');
        const throwMarker = Symbol('error');
        const proxyCount = new WeakMap();
        const transferCacheObject = new WeakMap();
        const proxyFinalizers = 'FinalizationRegistry' in globalThis && new FinalizationRegistry((ep) => {
        proxyCount.set(ep, (proxyCount.get(ep) ?? 1) - 1);
            if (!proxyCount.get(ep)) {
                releaseEndpoint(ep);
            }
        });
        const MessageType = {
            GET :'GET',
            SET :'SET',
            APPLY : 'APPLY',
            RELEASE : 'RELEASE',
        };
        const ValueType = {
            RAW : 'RAW',
            HANDLER : 'HANDLER',
        };
        const isMessagePort =${isMessagePort};
        const registerProxy = ${registerProxy}
        const isObject = ${isObject};
        const wrap = ${wrap};
        const createProxy = ${createProxy};
        const createMessage = ${createMessage};
        const transferHandle = (${transferHandleBuild})();
        const throwHandler = (${throwHandlerBuild})();
        const generateUUID =${generateUUID};
        const throwIfProxyReleased = ${throwIfProxyReleased};
        const unregisterProxy = ${unregisterProxy};
        const releaseEndpoint = ${releaseEndpoint};
        const closeEndPoint = ${closeEndPoint};
        const handles = new Map([
            ['proxyMarker', transferHandle],
            ['throwMarker', throwHandler],
        ]);
        const handleObject = (${handleObject})();
        const fromWireValue = ${fromWireValue}
        const toWireValue = ${toWireValue}
        (${expose})(handleObject);
    })()`;
    const blob = new Blob([workerBuildString], { type: 'text/javascript' });
    return wrap(new Worker(URL.createObjectURL(blob)));
};