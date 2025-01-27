import { WebSocket, type RawData } from 'ws';

export type { WebSocket, RawData };

export function createWebSocket(url: URL | string): WebSocket {
  const socket = new WebSocket(url, {
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
