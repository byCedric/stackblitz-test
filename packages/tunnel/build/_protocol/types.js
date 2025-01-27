"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Request"] = 1] = "Request";
    MessageType[MessageType["RequestAbort"] = 2] = "RequestAbort";
    MessageType[MessageType["RequestBodyChunk"] = 3] = "RequestBodyChunk";
    MessageType[MessageType["Response"] = 4] = "Response";
    MessageType[MessageType["ResponseAbort"] = 5] = "ResponseAbort";
    MessageType[MessageType["ResponseBodyChunk"] = 6] = "ResponseBodyChunk";
    MessageType[MessageType["WebSocketConnect"] = 7] = "WebSocketConnect";
    MessageType[MessageType["WebSocketMessage"] = 8] = "WebSocketMessage";
    MessageType[MessageType["WebSocketClose"] = 9] = "WebSocketClose";
})(MessageType || (exports.MessageType = MessageType = {}));
