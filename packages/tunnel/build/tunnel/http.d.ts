import { WebSocket } from 'ws';
import { RequestBodyChunkMessage, RequestMessage, RequestAbortMessage } from '@lunchbox/protocol';
declare global {
    interface RequestInit {
        duplex?: 'half';
    }
}
export declare function handleProxiedRequest(tunnel: WebSocket, message: RequestMessage): Promise<void>;
export declare function pushProxiedRequestBodyChunk(message: RequestBodyChunkMessage): Promise<void>;
export declare function abortProxiedRequest(message: RequestAbortMessage): Promise<void>;
