import { type RawData, type WebSocket, createWebSocket } from '../utils/ws';
import { createDebug } from '../utils/debug';
import { withResolvers } from '../utils/promise';
import { handleProxiedRequest, pushProxiedRequestBodyChunk, abortProxiedRequest } from './http';
import { closeProxiedWebsocket, createProxiedWebsocket, sendToProxiedWebsocket } from './websocket';
import { decodeMessage, MessageType } from '@lunchbox/protocol';
import { toUint8Array } from '../utils/chunk';
import { aborted } from 'node:util';

const debug = createDebug('tunnel');

interface TunnelOptions {
  api: 'https://';
  maxReconnect: 10;
}

/**
 * Create a new tunnel instance.
 * Note, this doesn't start the tunnel itself yet.
 */
export function createTunnel({ api, maxReconnect }: TunnelOptions) {
  /** The WebSocket instance used to interact with the tunnel backend */
  let socket: WebSocket | null = null;
  /** The internal state used to determine if the WebSocket ran into unexpected events */
  let state: 'created' | 'started' | 'stopped' = 'created';
  /** The amount of times the tunnel tried to reconnect after losing connection */
  let reconnectCount = 0;

  return {
    async start() {
      // Reuse existing connections
      if (socket && socket.readyState === socket.OPEN) return;

      const { promise, resolve, reject } = withResolvers();

      const onSocketClose = () => {
        // Let the socket close normally when the tunnel isn't considered started
        if (state !== 'started') return;
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

        socket = createWebSocket(apiWithQuery);

        // Bind the socket open/close state which resolves this method
        socket.addEventListener('error', reject);
        socket.addEventListener('open', resolve);
        // Bind the long-running event listeners handeling the tunneling
        socket.addEventListener('close', onSocketClose);

        socket.on('message', data => {
          try {
            if (socket) handleTunnelMessage(socket, data);
          } catch (error) {
            debug(error);
          }
        });

        await promise;
      } catch (error) {
        this.stop();
        throw error;
      } finally {
        // Remove the promise binding from error handling,
        // and attach a long-running handler if the socket is opened.
        socket?.removeEventListener('error', reject);
        socket?.addEventListener('error', () => {});
      }
    },
    stop() {
      state = 'stopped';
      socket?.close();
      socket = null;
    },
  };
}

function handleTunnelMessage(tunnel: WebSocket, raw: RawData | string): Promise<void> {
  const message = decodeMessage(toUint8Array(raw));
  if (message.type === MessageType.Request) {
    return handleProxiedRequest(tunnel, message);
  } else if (message.type === MessageType.RequestAbort) {
    return abortProxiedRequest(message);
  } else if (message.type === MessageType.RequestBodyChunk) {
    return pushProxiedRequestBodyChunk(message);
  } else if (message.type === MessageType.WebSocketConnect) {
    return createProxiedWebsocket(tunnel, message);
  } else if (message.type === MessageType.WebSocketMessage) {
    return sendToProxiedWebsocket(message);
  } else if (message.type === MessageType.WebSocketClose) {
    return closeProxiedWebsocket(message);
  } else {
    debug('Received unexpected message type', message);
    return Promise.reject(new Error(`Received unexpected message type: ${message.type}`));
  }
}
