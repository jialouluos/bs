export const useEncodeBuffer = (data: Record<string, any>) => {
    const strJson = JSON.stringify(data);
    const encoder = new TextEncoder();
    const unit8array = encoder.encode(strJson);
    return unit8array;
};
export const useDecodeBuffer = (data: ArrayBuffer) => {
    const encoder = new TextDecoder();
    const unit8array = encoder.decode(data);
    return JSON.parse(unit8array);
};