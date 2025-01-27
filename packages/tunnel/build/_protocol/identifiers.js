"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextRequestID = void 0;
const MAX_INT32 = 2 ** 32;
const phash = (salt, seed) => {
    let h = (seed || 5381) | 0;
    h = (h << 5) + h + salt;
    return (h | 0);
};
const nextRequestID = (previousRequestId) => {
    if (previousRequestId == null) {
        const seed = typeof crypto === 'undefined'
            ? (Math.random() * 2 - 1) * MAX_INT32 & (MAX_INT32 - 1)
            : crypto.getRandomValues(new Int32Array(1))[0];
        return phash(seed);
    }
    else {
        const salt = phash(Date.now() % MAX_INT32);
        return phash(salt, previousRequestId);
    }
};
exports.nextRequestID = nextRequestID;
