import { encodeMessage, Message, MessageType, RequestID, WebSocketCloseMessage, WebSocketConnectMessage, WebSocketMessageMessage } from '@lunchbox/protocol';
import { type WebSocket, createWebSocket } from '../utils/ws';

import { createDebug } from '../utils/debug';
import { toUint8Array, toString } from '../utils/chunk';

const debug = createDebug('websockets');

/**
 * All active/pending websocket connections by unique ID
 * This might create "duplicate" websocket connections, but thats intentional.
 * Every connection is destined for a single target.
 */
const websockets = new Map<RequestID, WebSocket>();

/**
 * All websocket messages that were emitted from external clients, before the socket fully connected.
 * This skew is caused by clients connecting to the Cloudflare Durable Object, and receiving the "open" connection status.
 * It does not mean that the websocket connection is ready to receive messages.
 */
const earlyMessages = new Map<RequestID, Message[]>();

export async function sendToProxiedWebsocket(message: WebSocketMessageMessage) {
  const socket = websockets.get(message.id);
  if (socket && socket.readyState === socket.OPEN) {
    // Immediately send when the socket is available
    socket.send(message.data!);
  } else if (socket && socket.readyState === socket.CONNECTING) {
    let queue = earlyMessages.get(message.id);
    if (!queue)
      earlyMessages.set(message.id, (queue = []));
    queue.push(message);
  } else if (socket) {
    // TODO: Handle CLOSING/CLOSED
    // TODO: maybe emit socket-close for this, so the client can decide if a new connection should be attempted
    console.error('Proxied socket ID', message.id, 'is in a bad state to forward messages to:', socket.readyState);
  } else {
    console.log('Proxied socket ID', message.id, 'requested, but no socket is available');
  }
}

export async function createProxiedWebsocket(tunnel: WebSocket, message: WebSocketConnectMessage) {
  let socket = websockets.get(message.id);
  if (socket) closeSocket(message.id, socket); // TODO: Better error handling. This should never happen

  // TODO: The URL's host should be enforced on the client-side too
  socket = createWebSocket(message.url);

  websockets.set(message.id, socket);

  socket.addEventListener('close', () => {
    debug('Proxied websocket closed');
    tunnel.send(encodeMessage({ type: MessageType.WebSocketClose, id: message.id }));
    // Clean up the websocket registry, if it isn't overwritten
    if (websockets.get(message.id) === socket) websockets.delete(message.id);
  });

  socket.addEventListener('error', (event) => {
    // TODO: proxy errors over tunnel
    debug('Proxied websocket threw an error', event.error);
  });

  socket.on('message', (raw, isBinary) => {
    debug('Proxied websocket emitted message for websocket ID', message.id);
    if (isBinary) {
      const data = toUint8Array(raw);
      tunnel.send(encodeMessage({ type: MessageType.WebSocketMessage, id: message.id, data }));
    } else {
      const data = toString(raw);
      tunnel.send(encodeMessage({ type: MessageType.WebSocketMessage, id: message.id, data }));
    }
  });

  socket.on('open', () => {
    debug('Proxied websocket opened to', message.url, 'for websocket ID', message.id);
    // Flush early received messages when the connection is open
    earlyMessages.get(message.id)?.forEach((message) => socket.send(encodeMessage(message)));
    earlyMessages.delete(message.id);
  });
}

function closeSocket(id: RequestID, socket: WebSocket) {
  socket.close();
  websockets.delete(id);
  earlyMessages.delete(id);
}

export async function closeProxiedWebsocket(message: WebSocketCloseMessage) {
  const socket = websockets.get(message.id);
  if (socket) {
    console.log('Closing proxied websocket ID', message.id);
    closeSocket(message.id, socket);
  } else {
    console.log('Close of socket ID', message.id, 'requested, but no socket is available');
  }
}
