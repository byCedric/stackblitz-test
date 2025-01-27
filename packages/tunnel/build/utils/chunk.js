"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUint8Array = toUint8Array;
exports.toString = toString;
const debug_1 = require("../utils/debug");
const debug = (0, debug_1.createDebug)('tunnel');
const decoder = new TextDecoder();
function toUint8Array(raw) {
    if (Buffer.isBuffer(raw)) {
        return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    }
    else if (raw instanceof ArrayBuffer) {
        return new Uint8Array(raw);
    }
    else if (Array.isArray(raw)) {
        return new Uint8Array(Buffer.concat(raw));
    }
    else {
        debug('Invalid tunnel ws message received', raw);
        throw new TypeError('Invalid tunnel ws message received');
    }
}
function toString(raw) {
    if (typeof raw === 'string') {
        return raw;
    }
    else if (Buffer.isBuffer(raw)) {
        return raw.toString();
    }
    else if (raw instanceof ArrayBuffer) {
        return decoder.decode(raw);
    }
    else if (Array.isArray(raw)) {
        return decoder.decode(Buffer.concat(raw));
    }
    else {
        debug('Invalid proxy ws message received', raw);
        throw new TypeError('Invalid proxy ws message received');
    }
}
