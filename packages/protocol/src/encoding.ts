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

const encoder = new TextEncoder();

const EMPTY = new Uint8Array(0);
const NULL_BYTE = '\0';
const BYTE_MASK = (1 << 8) - 1;
const MESSAGE_BASE_SIZE = 8;

let bytes = EMPTY;
let offset = 0;

const encodeRequestMethod = (method: RequestMethod) => {
  switch (method) {
    case 'GET':
      return RequestMethodCode.GET;
    case 'HEAD':
      return RequestMethodCode.HEAD;
    case 'POST':
      return RequestMethodCode.POST;
    case 'PUT':
      return RequestMethodCode.PUT;
    case 'PATCH':
      return RequestMethodCode.PATCH;
    case 'DELETE':
      return RequestMethodCode.DELETE;
    case 'OPTIONS':
      return RequestMethodCode.OPTIONS;
    default:
      return RequestMethodCode.GET;
  }
};

const encodeString = (input: string): Uint8Array =>
  encoder.encode(input + NULL_BYTE);

const encodeRestString = (input: string): Uint8Array =>
  input.length ? encoder.encode(input) : EMPTY;

const encodeHeaders = (headers: Headers): Uint8Array => {
  let encoded = '';
  for (const [name, value] of headers)
    encoded += name + NULL_BYTE + value + NULL_BYTE;
  return encoder.encode(
    (encoded || NULL_BYTE) + NULL_BYTE
  );
};

const writeUint8 = (uint8: number): void => {
  bytes[offset] = uint8;
  offset += 4; // NOTE: Memory alignment (don't consume just one byte)
};

const writeSmi = (smi: number): void => {
  bytes[offset] = (smi >>> 24) & BYTE_MASK;
  bytes[offset + 1] = (smi >>> 16) & BYTE_MASK;
  bytes[offset + 2] = (smi >>> 8) & BYTE_MASK;
  bytes[offset + 3] = smi & BYTE_MASK;
  offset += 4;
};

const writeBytes = (data: Uint8Array): void => {
  offset += alignBytes(offset);
  bytes.set(data, offset);
  offset += data.byteLength;
};

const writeRest = (data: Uint8Array | null): void => {
  if (data?.byteLength) {
    offset += alignBytes(offset);
    bytes.set(data, offset);
    offset += data.byteLength;
  }
};

const writeMessageBase = (message: Message): void => {
  writeUint8(message.type);
  writeSmi(message.id);
};

const encodeRequestMessage = (message: RequestMessage): Uint8Array => {
  const methodBytes = encodeRequestMethod(message.method);
  const hasContentBytes = message.hasContent ? 1 : 0;
  const urlBytes = encodeString(message.url);
  const headersBytes = encodeHeaders(message.headers);
  let size = MESSAGE_BASE_SIZE;
  size += 8; // methodBytes + hasContentBytes
  size += alignBytes(size);
  size += urlBytes.byteLength;
  size += alignBytes(size);
  size += headersBytes.byteLength;
  bytes = new Uint8Array(size);
  offset = 0;
  writeMessageBase(message);
  writeUint8(methodBytes);
  writeUint8(hasContentBytes);
  writeBytes(urlBytes);
  writeBytes(headersBytes);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

const encodeRequestAbortMessage = (message: RequestAbortMessage): Uint8Array => {
  const endBytes = message.errored ? 1 : 0;
  bytes = new Uint8Array(MESSAGE_BASE_SIZE + 4 /*endBytes*/);
  offset = 0;
  writeMessageBase(message);
  writeUint8(endBytes);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

const encodeRequestBodyChunkMessage = (message: RequestBodyChunkMessage): Uint8Array => {
  const endBytes = message.end ? 1 : 0;
  let size = MESSAGE_BASE_SIZE;
  size += 4; // endBytes
  if (message.data?.byteLength) {
    size += alignBytes(size);
    size += message.data.byteLength;
  }
  bytes = new Uint8Array(size);
  offset = 0;
  writeMessageBase(message);
  writeUint8(endBytes);
  writeRest(message.data);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

const encodeResponseMessage = (message: ResponseMessage): Uint8Array => {
  const statusBytes = message.status;
  const hasContentBytes = message.hasContent ? 1 : 0;
  const headersBytes = encodeHeaders(message.headers);
  let size = MESSAGE_BASE_SIZE;
  size += 8; // statusBytes + hasContentBytes
  size += alignBytes(size);
  size += headersBytes.byteLength;
  bytes = new Uint8Array(size);
  offset = 0;
  writeMessageBase(message);
  writeSmi(statusBytes);
  writeUint8(hasContentBytes);
  writeBytes(headersBytes);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

const encodeResponseAbortMessage = (message: ResponseAbortMessage): Uint8Array => {
  const endBytes = message.errored ? 1 : 0;
  bytes = new Uint8Array(MESSAGE_BASE_SIZE + 4 /*endBytes*/);
  offset = 0;
  writeMessageBase(message);
  writeUint8(endBytes);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

const encodeResponseBodyChunkMessage = (message: ResponseBodyChunkMessage): Uint8Array => {
  const endByte = message.end ? 1 : 0;
  let size = MESSAGE_BASE_SIZE;
  size += 4; // end byte
  if (message.data?.byteLength) {
    size += alignBytes(size);
    size += message.data.byteLength;
  }
  bytes = new Uint8Array(size);
  offset = 0;
  writeMessageBase(message);
  writeUint8(endByte);
  writeRest(message.data);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

const encodeWebSocketConnectMessage = (message: WebSocketConnectMessage): Uint8Array => {
  const urlBytes = encodeString(message.url);
  offset = 0;
  bytes = new Uint8Array(
    MESSAGE_BASE_SIZE
      + alignBytes(MESSAGE_BASE_SIZE)
      + urlBytes.byteLength
  );
  writeMessageBase(message);
  writeBytes(urlBytes);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

const encodeWebSocketMessageMessage = (message: WebSocketMessageMessage): Uint8Array => {
  const isStringBytes = typeof message.data === 'string' ? 1 : 0;
  const restBytes = typeof message.data === 'string' ? encodeRestString(message.data) : message.data;
  let size = MESSAGE_BASE_SIZE;
  size += 4; // isStringBytes
  if (restBytes?.byteLength) {
    size += alignBytes(size);
    size += restBytes.byteLength;
  }
  bytes = new Uint8Array(size);
  offset = 0;
  writeMessageBase(message);
  writeUint8(isStringBytes);
  writeRest(restBytes);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

const encodeWebSocketCloseMessage = (message: WebSocketCloseMessage): Uint8Array => {
  offset = 0;
  bytes = new Uint8Array(MESSAGE_BASE_SIZE);
  writeMessageBase(message);
  const output = bytes;
  bytes = EMPTY;
  return output;
};

export const encodeMessage = (message: Message): Uint8Array => {
  switch (message.type) {
    case MessageType.Request:
      return encodeRequestMessage(message);
    case MessageType.RequestAbort:
      return encodeRequestAbortMessage(message);
    case MessageType.RequestBodyChunk:
      return encodeRequestBodyChunkMessage(message);
    case MessageType.Response:
      return encodeResponseMessage(message);
    case MessageType.ResponseAbort:
      return encodeResponseAbortMessage(message);
    case MessageType.ResponseBodyChunk:
      return encodeResponseBodyChunkMessage(message);
    case MessageType.WebSocketConnect:
      return encodeWebSocketConnectMessage(message);
    case MessageType.WebSocketMessage:
      return encodeWebSocketMessageMessage(message);
    case MessageType.WebSocketClose:
      return encodeWebSocketCloseMessage(message);
  }
};
