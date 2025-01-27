import { WebSocket } from 'ws';
import {
  bodyToChunks,
  encodeMessage,
  MessageType,
  RequestBodyChunkMessage,
  RequestMessage,
  RequestID,
  RequestAbortMessage,
} from '@lunchbox/protocol';

import { createDebug } from '../utils/debug';
import { minifetch } from '../utils/minifetch';

const debug = createDebug('http');

const requestBodies = new Map<RequestID, ReadableStreamDefaultController<Uint8Array>>();
const abortControllers = new Map<RequestID, AbortController>();

declare global {
  interface RequestInit {
    duplex?: 'half';
  }
}

export async function handleProxiedRequest(tunnel: WebSocket, message: RequestMessage) {
  // TODO: fix on React Native / Expo CLI's end
  // This requires adding the proxied origin as allowed CORS header
  const proxiedHeaders = new Headers(message.headers);
  proxiedHeaders.delete('origin');

  debug('Executing proxied request with pending request body stream');

  const controller = new AbortController();
  const signal = controller.signal;
  abortControllers.set(message.id, controller);

  const body = message.hasContent ? new ReadableStream<Uint8Array>({
    start(controller) {
      requestBodies.set(message.id, controller);
    },
  }) : null;

  let response: Response;
  try {
    // TODO: The URL's host should be enforced on the client-side too
    response = await minifetch(message.url, {
      signal: controller.signal,
      method: message.method,
      headers: proxiedHeaders,
      body,
    });
  } catch (error) {
    requestBodies.delete(message.id);
    if (!signal.aborted) {
      tunnel.send(encodeMessage({
        type: MessageType.ResponseAbort,
        id: message.id,
        errored: true,
      }));
    }
    return;
  }

  try {
    for await (const chunk of encodeResponse(message.id, response, signal))
      tunnel.send(chunk);
  } finally {
    abortControllers.delete(message.id);
    requestBodies.delete(message.id);
  }
}

export async function pushProxiedRequestBodyChunk(message: RequestBodyChunkMessage) {
  debug('Streaming proxied request body chunk');
  const controller = requestBodies.get(message.id);
  if (controller) {
    if (message.data) controller.enqueue(message.data);
    if (message.end) {
      controller.close();
      requestBodies.delete(message.id);
    }
  } else {
    debug('No active request stream found for message ID', message.id);
  }
}

export async function abortProxiedRequest(message: RequestAbortMessage) {
  debug('Aborting proxied request');
  const abortController = abortControllers.get(message.id);
  if (abortController) {
    abortController.abort(message.errored ? new Error('Remote closed request stream') : undefined);
    abortControllers.delete(message.id);
  }
  const bodyController = requestBodies.get(message.id);
  if (bodyController && message.errored) {
    bodyController.error(new Error('Remote closed request stream'));
  } else if (bodyController) {
    bodyController.close();
  }
  if (!bodyController && !abortController) {
    debug('No active request to abort found for message ID', message.id);
  }
}

async function* encodeResponse(id: RequestID, response: Response, signal: AbortSignal): AsyncGenerator<Uint8Array> {
  if (signal.aborted) return;

  yield encodeMessage({
    type: MessageType.Response,
    id,
    hasContent: !!response.body,
    status: response.status,
    headers: response.headers,
  })

  if (signal.aborted) {
    yield encodeMessage({
      type: MessageType.ResponseAbort,
      id,
      errored: false,
    });
  } else if (response.body) {
    try {
      for await (const chunk of bodyToChunks(response.body, { signal })) {
        if (signal.aborted) break;
        yield encodeMessage({
          type: MessageType.ResponseBodyChunk,
          id,
          end: chunk.done,
          data: chunk.value || null,
        });
      }
    } catch (error) {
      if (!signal.aborted) {
        debug('Broken response body stream for request ID', id, error);
        yield encodeMessage({ type: MessageType.ResponseAbort, id, errored: true });
      }
    } finally {
      if (signal.aborted) {
        yield encodeMessage({ type: MessageType.RequestAbort, id, errored: false });
      }
    }
  }
}
