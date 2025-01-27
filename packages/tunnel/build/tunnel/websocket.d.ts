import { WebSocketCloseMessage, WebSocketConnectMessage, WebSocketMessageMessage } from '@lunchbox/protocol';
import { type WebSocket } from '../utils/ws';
export declare function sendToProxiedWebsocket(message: WebSocketMessageMessage): Promise<void>;
export declare function createProxiedWebsocket(tunnel: WebSocket, message: WebSocketConnectMessage): Promise<void>;
export declare function closeProxiedWebsocket(message: WebSocketCloseMessage): Promise<void>;
