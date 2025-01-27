"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebSocket = createWebSocket;
const ws_1 = require("ws");
function createWebSocket(url) {
    const socket = new ws_1.WebSocket(url, {
        skipUTF8Validation: true,
        // The maximum that Cloudflare allows per message
        maxPayload: 1_024 * 1_024, /*1MiB*/
        // Unclear whether this is performant on WebContainers
        perMessageDeflate: false,
    });
    // Skip Buffer conversion
    socket.binaryType = 'arraybuffer';
    return socket;
}
