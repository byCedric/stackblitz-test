"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeMessage = void 0;
const utils_1 = require("./utils");
const types_1 = require("./types");
const encoder = new TextEncoder();
const EMPTY = new Uint8Array(0);
const NULL_BYTE = '\0';
const BYTE_MASK = (1 << 8) - 1;
const MESSAGE_BASE_SIZE = 8;
let bytes = EMPTY;
let offset = 0;
const encodeRequestMethod = (method) => {
    switch (method) {
        case 'GET':
            return 1 /* RequestMethodCode.GET */;
        case 'HEAD':
            return 2 /* RequestMethodCode.HEAD */;
        case 'POST':
            return 3 /* RequestMethodCode.POST */;
        case 'PUT':
            return 4 /* RequestMethodCode.PUT */;
        case 'PATCH':
            return 5 /* RequestMethodCode.PATCH */;
        case 'DELETE':
            return 6 /* RequestMethodCode.DELETE */;
        case 'OPTIONS':
            return 7 /* RequestMethodCode.OPTIONS */;
        default:
            return 1 /* RequestMethodCode.GET */;
    }
};
const encodeString = (input) => encoder.encode(input + NULL_BYTE);
const encodeRestString = (input) => input.length ? encoder.encode(input) : EMPTY;
const encodeHeaders = (headers) => {
    let encoded = '';
    for (const [name, value] of headers)
        encoded += name + NULL_BYTE + value + NULL_BYTE;
    return encoder.encode((encoded || NULL_BYTE) + NULL_BYTE);
};
const writeUint8 = (uint8) => {
    bytes[offset] = uint8;
    offset += 4; // NOTE: Memory alignment (don't consume just one byte)
};
const writeSmi = (smi) => {
    bytes[offset] = (smi >>> 24) & BYTE_MASK;
    bytes[offset + 1] = (smi >>> 16) & BYTE_MASK;
    bytes[offset + 2] = (smi >>> 8) & BYTE_MASK;
    bytes[offset + 3] = smi & BYTE_MASK;
    offset += 4;
};
const writeBytes = (data) => {
    offset += (0, utils_1.alignBytes)(offset);
    bytes.set(data, offset);
    offset += data.byteLength;
};
const writeRest = (data) => {
    if (data?.byteLength) {
        offset += (0, utils_1.alignBytes)(offset);
        bytes.set(data, offset);
        offset += data.byteLength;
    }
};
const writeMessageBase = (message) => {
    writeUint8(message.type);
    writeSmi(message.id);
};
const encodeRequestMessage = (message) => {
    const methodBytes = encodeRequestMethod(message.method);
    const hasContentBytes = message.hasContent ? 1 : 0;
    const urlBytes = encodeString(message.url);
    const headersBytes = encodeHeaders(message.headers);
    let size = MESSAGE_BASE_SIZE;
    size += 8; // methodBytes + hasContentBytes
    size += (0, utils_1.alignBytes)(size);
    size += urlBytes.byteLength;
    size += (0, utils_1.alignBytes)(size);
    size += headersBytes.byteLength;
    bytes = new Uint8Array(size);
    offset = 0;
    writeMessageBase(message);
    writeUint8(methodBytes);
    writeUint8(hasContentBytes);
    writeBytes(urlBytes);
    writeBytes(headersBytes);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeRequestAbortMessage = (message) => {
    const endBytes = message.errored ? 1 : 0;
    bytes = new Uint8Array(MESSAGE_BASE_SIZE + 4 /*endBytes*/);
    offset = 0;
    writeMessageBase(message);
    writeUint8(endBytes);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeRequestBodyChunkMessage = (message) => {
    const endBytes = message.end ? 1 : 0;
    let size = MESSAGE_BASE_SIZE;
    size += 4; // endBytes
    if (message.data?.byteLength) {
        size += (0, utils_1.alignBytes)(size);
        size += message.data.byteLength;
    }
    bytes = new Uint8Array(size);
    offset = 0;
    writeMessageBase(message);
    writeUint8(endBytes);
    writeRest(message.data);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeResponseMessage = (message) => {
    const statusBytes = message.status;
    const hasContentBytes = message.hasContent ? 1 : 0;
    const headersBytes = encodeHeaders(message.headers);
    let size = MESSAGE_BASE_SIZE;
    size += 8; // statusBytes + hasContentBytes
    size += (0, utils_1.alignBytes)(size);
    size += headersBytes.byteLength;
    bytes = new Uint8Array(size);
    offset = 0;
    writeMessageBase(message);
    writeSmi(statusBytes);
    writeUint8(hasContentBytes);
    writeBytes(headersBytes);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeResponseAbortMessage = (message) => {
    const endBytes = message.errored ? 1 : 0;
    bytes = new Uint8Array(MESSAGE_BASE_SIZE + 4 /*endBytes*/);
    offset = 0;
    writeMessageBase(message);
    writeUint8(endBytes);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeResponseBodyChunkMessage = (message) => {
    const endByte = message.end ? 1 : 0;
    let size = MESSAGE_BASE_SIZE;
    size += 4; // end byte
    if (message.data?.byteLength) {
        size += (0, utils_1.alignBytes)(size);
        size += message.data.byteLength;
    }
    bytes = new Uint8Array(size);
    offset = 0;
    writeMessageBase(message);
    writeUint8(endByte);
    writeRest(message.data);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeWebSocketConnectMessage = (message) => {
    const urlBytes = encodeString(message.url);
    offset = 0;
    bytes = new Uint8Array(MESSAGE_BASE_SIZE
        + (0, utils_1.alignBytes)(MESSAGE_BASE_SIZE)
        + urlBytes.byteLength);
    writeMessageBase(message);
    writeBytes(urlBytes);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeWebSocketMessageMessage = (message) => {
    const isStringBytes = typeof message.data === 'string' ? 1 : 0;
    const restBytes = typeof message.data === 'string' ? encodeRestString(message.data) : message.data;
    let size = MESSAGE_BASE_SIZE;
    size += 4; // isStringBytes
    if (restBytes?.byteLength) {
        size += (0, utils_1.alignBytes)(size);
        size += restBytes.byteLength;
    }
    bytes = new Uint8Array(size);
    offset = 0;
    writeMessageBase(message);
    writeUint8(isStringBytes);
    writeRest(restBytes);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeWebSocketCloseMessage = (message) => {
    offset = 0;
    bytes = new Uint8Array(MESSAGE_BASE_SIZE);
    writeMessageBase(message);
    const output = bytes;
    bytes = EMPTY;
    return output;
};
const encodeMessage = (message) => {
    switch (message.type) {
        case types_1.MessageType.Request:
            return encodeRequestMessage(message);
        case types_1.MessageType.RequestAbort:
            return encodeRequestAbortMessage(message);
        case types_1.MessageType.RequestBodyChunk:
            return encodeRequestBodyChunkMessage(message);
        case types_1.MessageType.Response:
            return encodeResponseMessage(message);
        case types_1.MessageType.ResponseAbort:
            return encodeResponseAbortMessage(message);
        case types_1.MessageType.ResponseBodyChunk:
            return encodeResponseBodyChunkMessage(message);
        case types_1.MessageType.WebSocketConnect:
            return encodeWebSocketConnectMessage(message);
        case types_1.MessageType.WebSocketMessage:
            return encodeWebSocketMessageMessage(message);
        case types_1.MessageType.WebSocketClose:
            return encodeWebSocketCloseMessage(message);
    }
};
exports.encodeMessage = encodeMessage;
