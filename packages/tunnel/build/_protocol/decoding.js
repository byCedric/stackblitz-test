"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeMessage = void 0;
const utils_1 = require("./utils");
const types_1 = require("./types");
const decoder = new TextDecoder();
const EMPTY = new Uint8Array(0);
let bytes = EMPTY;
let offset = 0;
const decodeRequestMethod = (code) => {
    switch (code) {
        case 1 /* RequestMethodCode.GET */:
            return 'GET';
        case 2 /* RequestMethodCode.HEAD */:
            return 'HEAD';
        case 3 /* RequestMethodCode.POST */:
            return 'POST';
        case 4 /* RequestMethodCode.PUT */:
            return 'PUT';
        case 5 /* RequestMethodCode.PATCH */:
            return 'PATCH';
        case 6 /* RequestMethodCode.DELETE */:
            return 'DELETE';
        case 7 /* RequestMethodCode.OPTIONS */:
            return 'OPTIONS';
    }
};
const readUint8 = () => {
    const output = bytes[offset];
    offset += 4;
    return output;
};
const readSmi = () => {
    const output = (bytes[offset] << 24)
        | (bytes[offset + 1] << 16)
        | (bytes[offset + 2] << 8)
        | bytes[offset + 3];
    offset += 4;
    return output;
};
const readString = () => {
    offset += (0, utils_1.alignBytes)(offset);
    let end = offset;
    for (; end < bytes.byteLength && bytes[end] !== 0; end++)
        ;
    const output = decoder.decode(bytes.slice(offset, end));
    offset = end + 1;
    return output;
};
const readHeaders = () => {
    let start = (offset += (0, utils_1.alignBytes)(offset));
    let end = 0;
    const headers = new Headers();
    while (start < bytes.byteLength && bytes[start] !== 0) {
        for (end = start; end < bytes.byteLength && bytes[end] !== 0; end++)
            ;
        const name = decoder.decode(bytes.slice(start, end));
        start = end + 1;
        if (start < bytes.byteLength) {
            for (end = start; end < bytes.byteLength && bytes[end] !== 0; end++)
                ;
            const value = decoder.decode(bytes.slice(start, end));
            headers.set(name, value);
            start = end + 1;
        }
    }
    offset = end + 1;
    return headers;
};
const readRestString = () => {
    offset += (0, utils_1.alignBytes)(offset);
    if (offset >= bytes.byteLength) {
        return null;
    }
    else {
        const output = decoder.decode(bytes.slice(offset));
        offset = bytes.byteLength;
        return output;
    }
};
const readRestBytes = () => {
    offset += (0, utils_1.alignBytes)(offset);
    if (offset >= bytes.byteLength) {
        return null;
    }
    else {
        const output = bytes.slice(offset);
        offset = bytes.byteLength;
        return output;
    }
};
const readRequestMessage = (requestId) => ({
    type: types_1.MessageType.Request,
    id: requestId,
    method: decodeRequestMethod(readUint8()),
    hasContent: readUint8() !== 0,
    url: readString(),
    headers: readHeaders(),
});
const readRequestAbortMessage = (requestId) => ({
    type: types_1.MessageType.RequestAbort,
    id: requestId,
    errored: readUint8() !== 0,
});
const readRequestBodyChunkMessage = (requestId) => ({
    type: types_1.MessageType.RequestBodyChunk,
    id: requestId,
    end: readUint8() !== 0,
    data: readRestBytes(),
});
const readResponseMessage = (requestId) => ({
    type: types_1.MessageType.Response,
    id: requestId,
    status: readSmi(),
    hasContent: readUint8() !== 0,
    headers: readHeaders(),
});
const readResponseAbortMessage = (requestId) => ({
    type: types_1.MessageType.ResponseAbort,
    id: requestId,
    errored: readUint8() !== 0,
});
const readResponseBodyChunkMessage = (requestId) => ({
    type: types_1.MessageType.ResponseBodyChunk,
    id: requestId,
    end: readUint8() !== 0,
    data: readRestBytes(),
});
const readWebSocketConnectMessage = (requestId) => ({
    type: types_1.MessageType.WebSocketConnect,
    id: requestId,
    url: readString(),
});
const readWebSocketMessageMessage = (requestId) => ({
    type: types_1.MessageType.WebSocketMessage,
    id: requestId,
    data: readUint8() !== 0 ? readRestString() : readRestBytes(),
});
const readWebSocketCloseMessage = (requestId) => ({
    type: types_1.MessageType.WebSocketClose,
    id: requestId,
});
const readMessage = () => {
    const messageType = readUint8();
    const requestId = readSmi();
    switch (messageType) {
        case types_1.MessageType.Request:
            return readRequestMessage(requestId);
        case types_1.MessageType.RequestAbort:
            return readRequestAbortMessage(requestId);
        case types_1.MessageType.RequestBodyChunk:
            return readRequestBodyChunkMessage(requestId);
        case types_1.MessageType.Response:
            return readResponseMessage(requestId);
        case types_1.MessageType.ResponseAbort:
            return readResponseAbortMessage(requestId);
        case types_1.MessageType.ResponseBodyChunk:
            return readResponseBodyChunkMessage(requestId);
        case types_1.MessageType.WebSocketConnect:
            return readWebSocketConnectMessage(requestId);
        case types_1.MessageType.WebSocketMessage:
            return readWebSocketMessageMessage(requestId);
        case types_1.MessageType.WebSocketClose:
            return readWebSocketCloseMessage(requestId);
        default:
            throw new TypeError(`Received unknown message type: ${messageType}`);
    }
};
const decodeMessage = (data) => {
    offset = 0;
    bytes = data;
    const message = readMessage();
    bytes = EMPTY;
    return message;
};
exports.decodeMessage = decodeMessage;
