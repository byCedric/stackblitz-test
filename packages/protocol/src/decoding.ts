import { RequestID } from './identifiers';
import { alignBytes } from './utils';
import {
  RequestMethod,
  RequestMethodCode,
  Message,
  MessageType,
  RequestMessage,
  RequestBodyChunkMessage,
  ResponseMessage,
  ResponseBodyChunkMessage,
  WebSocketConnectMessage,
  WebSocketMessageMessage,
  WebSocketCloseMessage,
  RequestAbortMessage,
  ResponseAbortMessage,
} from './types';

const decoder = new TextDecoder();

const EMPTY = new Uint8Array(0);

let bytes = EMPTY;
let offset = 0;

const decodeRequestMethod = (code: RequestMethodCode): RequestMethod => {
  switch (code) {
    case RequestMethodCode.GET:
      return 'GET';
    case RequestMethodCode.HEAD:
      return 'HEAD';
    case RequestMethodCode.POST:
      return 'POST';
    case RequestMethodCode.PUT:
      return 'PUT';
    case RequestMethodCode.PATCH:
      return 'PATCH';
    case RequestMethodCode.DELETE:
      return 'DELETE';
    case RequestMethodCode.OPTIONS:
      return 'OPTIONS';
  }
};

const readUint8 = (): number => {
  const output = bytes[offset];
  offset += 4;
  return output;
};

const readSmi = (): number => {
  const output = (bytes[offset] << 24)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3];
  offset += 4;
  return output;
};

const readString = (): string => {
  offset += alignBytes(offset);
  let end = offset;
  for (; end < bytes.byteLength && bytes[end] !== 0; end++);
  const output = decoder.decode(bytes.slice(offset, end));
  offset = end + 1;
  return output;
};

const readHeaders = (): Headers => {
  let start = (offset += alignBytes(offset));
  let end = 0;
  const headers = new Headers();
  while (start < bytes.byteLength && bytes[start] !== 0) {
    for (end = start; end < bytes.byteLength && bytes[end] !== 0; end++);
    const name = decoder.decode(bytes.slice(start, end));
    start = end + 1;
    if (start < bytes.byteLength) {
      for (end = start; end < bytes.byteLength && bytes[end] !== 0; end++);
      const value = decoder.decode(bytes.slice(start, end));
      headers.set(name, value);
      start = end + 1;
    }
  }
  offset = end + 1;
  return headers;
};

const readRestString = (): string | null => {
  offset += alignBytes(offset);
  if (offset >= bytes.byteLength) {
    return null;
  } else {
    const output = decoder.decode(bytes.slice(offset));
    offset = bytes.byteLength;
    return output;
  }
};

const readRestBytes = (): Uint8Array | null => {
  offset += alignBytes(offset);
  if (offset >= bytes.byteLength) {
    return null;
  } else {
    const output = bytes.slice(offset);
    offset = bytes.byteLength;
    return output;
  }
};

const readRequestMessage = (requestId: RequestID): RequestMessage => ({
  type: MessageType.Request,
  id: requestId,
  method: decodeRequestMethod(readUint8()),
  hasContent: readUint8() !== 0,
  url: readString(),
  headers: readHeaders(),
});

const readRequestAbortMessage = (requestId: RequestID): RequestAbortMessage => ({
  type: MessageType.RequestAbort,
  id: requestId,
  errored: readUint8() !== 0,
});

const readRequestBodyChunkMessage = (requestId: RequestID): RequestBodyChunkMessage => ({
  type: MessageType.RequestBodyChunk,
  id: requestId,
  end: readUint8() !== 0,
  data: readRestBytes(),
});

const readResponseMessage = (requestId: RequestID): ResponseMessage => ({
  type: MessageType.Response,
  id: requestId,
  status: readSmi(),
  hasContent: readUint8() !== 0,
  headers: readHeaders(),
});

const readResponseAbortMessage = (requestId: RequestID): ResponseAbortMessage => ({
  type: MessageType.ResponseAbort,
  id: requestId,
  errored: readUint8() !== 0,
});

const readResponseBodyChunkMessage = (requestId: RequestID): ResponseBodyChunkMessage => ({
  type: MessageType.ResponseBodyChunk,
  id: requestId,
  end: readUint8() !== 0,
  data: readRestBytes(),
});

const readWebSocketConnectMessage = (requestId: RequestID): WebSocketConnectMessage => ({
  type: MessageType.WebSocketConnect,
  id: requestId,
  url: readString(),
});

const readWebSocketMessageMessage = (requestId: RequestID): WebSocketMessageMessage => ({
  type: MessageType.WebSocketMessage,
  id: requestId,
  data: readUint8() !== 0 ? readRestString() : readRestBytes(),
});

const readWebSocketCloseMessage = (requestId: RequestID): WebSocketCloseMessage => ({
  type: MessageType.WebSocketClose,
  id: requestId,
});

const readMessage = () => {
  const messageType = readUint8();
  const requestId = readSmi() as RequestID;
  switch (messageType) {
    case MessageType.Request:
      return readRequestMessage(requestId);
    case MessageType.RequestAbort:
      return readRequestAbortMessage(requestId);
    case MessageType.RequestBodyChunk:
      return readRequestBodyChunkMessage(requestId);
    case MessageType.Response:
      return readResponseMessage(requestId);
    case MessageType.ResponseAbort:
      return readResponseAbortMessage(requestId);
    case MessageType.ResponseBodyChunk:
      return readResponseBodyChunkMessage(requestId);
    case MessageType.WebSocketConnect:
      return readWebSocketConnectMessage(requestId);
    case MessageType.WebSocketMessage:
      return readWebSocketMessageMessage(requestId);
    case MessageType.WebSocketClose:
      return readWebSocketCloseMessage(requestId);
    default:
      throw new TypeError(`Received unknown message type: ${messageType}`);
  }
};

export const decodeMessage = (data: Uint8Array): Message => {
  offset = 0;
  bytes = data;
  const message = readMessage();
  bytes = EMPTY;
  return message;
};
