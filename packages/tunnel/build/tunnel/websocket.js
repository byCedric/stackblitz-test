"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToProxiedWebsocket = sendToProxiedWebsocket;
exports.createProxiedWebsocket = createProxiedWebsocket;
exports.closeProxiedWebsocket = closeProxiedWebsocket;
const protocol_1 = require("@lunchbox/protocol");
const ws_1 = require("../utils/ws");
const debug_1 = require("../utils/debug");
const chunk_1 = require("../utils/chunk");
const debug = (0, debug_1.createDebug)('websockets');
/**
 * All active/pending websocket connections by unique ID
 * This might create "duplicate" websocket connections, but thats intentional.
 * Every connection is destined for a single target.
 */
const websockets = new Map();
/**
 * All websocket messages that were emitted from external clients, before the socket fully connected.
 * This skew is caused by clients connecting to the Cloudflare Durable Object, and receiving the "open" connection status.
 * It does not mean that the websocket connection is ready to receive messages.
 */
const earlyMessages = new Map();
async function sendToProxiedWebsocket(message) {
    const socket = websockets.get(message.id);
    if (socket && socket.readyState === socket.OPEN) {
        // Immediately send when the socket is available
        socket.send(message.data);
    }
    else if (socket && socket.readyState === socket.CONNECTING) {
        let queue = earlyMessages.get(message.id);
        if (!queue)
            earlyMessages.set(message.id, (queue = []));
        queue.push(message);
    }
    else if (socket) {
        // TODO: Handle CLOSING/CLOSED
        // TODO: maybe emit socket-close for this, so the client can decide if a new connection should be attempted
        console.error('Proxied socket ID', message.id, 'is in a bad state to forward messages to:', socket.readyState);
    }
    else {
        console.log('Proxied socket ID', message.id, 'requested, but no socket is available');
    }
}
async function createProxiedWebsocket(tunnel, message) {
    let socket = websockets.get(message.id);
    if (socket)
        closeSocket(message.id, socket); // TODO: Better error handling. This should never happen
    // TODO: The URL's host should be enforced on the client-side too
    socket = (0, ws_1.createWebSocket)(message.url);
    websockets.set(message.id, socket);
    socket.addEventListener('close', () => {
        debug('Proxied websocket closed');
        tunnel.send((0, protocol_1.encodeMessage)({ type: protocol_1.MessageType.WebSocketClose, id: message.id }));
        // Clean up the websocket registry, if it isn't overwritten
        if (websockets.get(message.id) === socket)
            websockets.delete(message.id);
    });
    socket.addEventListener('error', (event) => {
        // TODO: proxy errors over tunnel
        debug('Proxied websocket threw an error', event.error);
    });
    socket.on('message', (raw, isBinary) => {
        debug('Proxied websocket emitted message for websocket ID', message.id);
        if (isBinary) {
            const data = (0, chunk_1.toUint8Array)(raw);
            tunnel.send((0, protocol_1.encodeMessage)({ type: protocol_1.MessageType.WebSocketMessage, id: message.id, data }));
        }
        else {
            const data = (0, chunk_1.toString)(raw);
            tunnel.send((0, protocol_1.encodeMessage)({ type: protocol_1.MessageType.WebSocketMessage, id: message.id, data }));
        }
    });
    socket.on('open', () => {
        debug('Proxied websocket opened to', message.url, 'for websocket ID', message.id);
        // Flush early received messages when the connection is open
        earlyMessages.get(message.id)?.forEach((message) => socket.send((0, protocol_1.encodeMessage)(message)));
        earlyMessages.delete(message.id);
    });
}
function closeSocket(id, socket) {
    socket.close();
    websockets.delete(id);
    earlyMessages.delete(id);
}
async function closeProxiedWebsocket(message) {
    const socket = websockets.get(message.id);
    if (socket) {
        console.log('Closing proxied websocket ID', message.id);
        closeSocket(message.id, socket);
    }
    else {
        console.log('Close of socket ID', message.id, 'requested, but no socket is available');
    }
}
