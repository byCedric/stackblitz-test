import { RawData } from 'ws';
import { createDebug } from '../utils/debug';

const debug = createDebug('tunnel');
const decoder = new TextDecoder();

export function toUint8Array(raw: RawData | string) {
  if (Buffer.isBuffer(raw)) {
    return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  } else if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw);
  } else if (Array.isArray(raw)) {
    return new Uint8Array(Buffer.concat(raw));
  } else {
    debug('Invalid tunnel ws message received', raw);
    throw new TypeError('Invalid tunnel ws message received');
  }
}

export function toString(raw: RawData | string) {
  if (typeof raw === 'string') {
    return raw;
  } else if (Buffer.isBuffer(raw)) {
    return raw.toString();
  } else if (raw instanceof ArrayBuffer) {
    return decoder.decode(raw);
  } else if (Array.isArray(raw)) {
    return decoder.decode(Buffer.concat(raw));
  } else {
    debug('Invalid proxy ws message received', raw);
    throw new TypeError('Invalid proxy ws message received');
  }
}
