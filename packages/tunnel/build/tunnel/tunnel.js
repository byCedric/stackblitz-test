"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTunnel = createTunnel;
const ws_1 = require("../utils/ws");
const debug_1 = require("../utils/debug");
const promise_1 = require("../utils/promise");
const http_1 = require("./http");
const websocket_1 = require("./websocket");
const protocol_1 = require("@lunchbox/protocol");
const chunk_1 = require("../utils/chunk");
const debug = (0, debug_1.createDebug)('tunnel');
/**
 * Create a new tunnel instance.
 * Note, this doesn't start the tunnel itself yet.
 */
function createTunnel({ api, maxReconnect }) {
    /** The WebSocket instance used to interact with the tunnel backend */
    let socket = null;
    /** The internal state used to determine if the WebSocket ran into unexpected events */
    let state = 'created';
    /** The amount of times the tunnel tried to reconnect after losing connection */
    let reconnectCount = 0;
    return {
        async start() {
            // Reuse existing connections
            if (socket && socket.readyState === socket.OPEN)
                return;
            const { promise, resolve, reject } = (0, promise_1.withResolvers)();
            const onSocketClose = () => {
                // Let the socket close normally when the tunnel isn't considered started
                if (state !== 'started')
                    return;
                // Throw an error when the reconnect count is higher than the limit
                if (reconnectCount > maxReconnect) {
                    throw new Error('Tunnel exceeded maximum reconnect attempts');
                }
                console.log('reconnecting');
                // Restart the connection and keep track of the reconnects
                reconnectCount += 1;
                this.stop();
                this.start();
            };
            try {
                const apiWithQuery = new URL(api);
                apiWithQuery.searchParams.set('_tunnel', 'true');
                socket = (0, ws_1.createWebSocket)(apiWithQuery);
                // Bind the socket open/close state which resolves this method
                socket.addEventListener('error', reject);
                socket.addEventListener('open', resolve);
                // Bind the long-running event listeners handeling the tunneling
                socket.addEventListener('close', onSocketClose);
                socket.on('message', data => {
                    try {
                        if (socket)
                            handleTunnelMessage(socket, data);
                    }
                    catch (error) {
                        debug(error);
                    }
                });
                await promise;
            }
            catch (error) {
                this.stop();
                throw error;
            }
            finally {
                // Remove the promise binding from error handling,
                // and attach a long-running handler if the socket is opened.
                socket?.removeEventListener('error', reject);
                socket?.addEventListener('error', () => { });
            }
        },
        stop() {
            state = 'stopped';
            socket?.close();
            socket = null;
        },
    };
}
function handleTunnelMessage(tunnel, raw) {
    const message = (0, protocol_1.decodeMessage)((0, chunk_1.toUint8Array)(raw));
    if (message.type === protocol_1.MessageType.Request) {
        return (0, http_1.handleProxiedRequest)(tunnel, message);
    }
    else if (message.type === protocol_1.MessageType.RequestAbort) {
        return (0, http_1.abortProxiedRequest)(message);
    }
    else if (message.type === protocol_1.MessageType.RequestBodyChunk) {
        return (0, http_1.pushProxiedRequestBodyChunk)(message);
    }
    else if (message.type === protocol_1.MessageType.WebSocketConnect) {
        return (0, websocket_1.createProxiedWebsocket)(tunnel, message);
    }
    else if (message.type === protocol_1.MessageType.WebSocketMessage) {
        return (0, websocket_1.sendToProxiedWebsocket)(message);
    }
    else if (message.type === protocol_1.MessageType.WebSocketClose) {
        return (0, websocket_1.closeProxiedWebsocket)(message);
    }
    else {
        debug('Received unexpected message type', message);
        return Promise.reject(new Error(`Received unexpected message type: ${message.type}`));
    }
}
