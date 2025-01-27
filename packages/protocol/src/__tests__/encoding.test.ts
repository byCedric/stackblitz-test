import { MessageType, RequestID, encodeMessage } from '../index';

const requestId = () => 0b11111111_11111111_11111111_11111111 as RequestID;

const encoder = new TextEncoder();

expect.addSnapshotSerializer({
  test(value) {
    return value instanceof Uint8Array;
  },
  serialize(data: Uint8Array) {
    const CODES_PER_LINE = 16;
    let output = '';
    for (let i = 0; i < data.byteLength; i++) {
      const hex = data[i].toString(16).padStart(2, '0').toUpperCase();
      if (i) output += i % CODES_PER_LINE === 0 ? '\n' : ' ';
      output += hex;
    }
    return output;
  },
});

describe('MessageType.Request', () => {
  it('encodes Request messages', () => {
    expect(encodeMessage({
      type: MessageType.Request,
      id: requestId(),
      method: 'POST',
      hasContent: false,
      url: 'http://localhost:8081/path',
      headers: new Headers({
        'content-type': 'application/json',
        'accept': 'text/html, */*'
      })
    })).toMatchInlineSnapshot(`
      01 00 00 00 FF FF FF FF 03 00 00 00 00 00 00 00
      68 74 74 70 3A 2F 2F 6C 6F 63 61 6C 68 6F 73 74
      3A 38 30 38 31 2F 70 61 74 68 00 00 00 00 00 00
      61 63 63 65 70 74 00 74 65 78 74 2F 68 74 6D 6C
      2C 20 2A 2F 2A 00 63 6F 6E 74 65 6E 74 2D 74 79
      70 65 00 61 70 70 6C 69 63 61 74 69 6F 6E 2F 6A
      73 6F 6E 00 00
    `);
  });
});

describe('MessageType.RequestAbort', () => {
  it('encodes RequestAbort messages', () => {
    expect(encodeMessage({
      type: MessageType.RequestAbort,
      id: requestId(),
      errored: true
    })).toMatchInlineSnapshot(`02 00 00 00 FF FF FF FF 01 00 00 00`);
  });
});

describe('MessageType.RequestBodyChunk', () => {
  it('encodes RequestBodyChunk messages', () => {
    expect(encodeMessage({
      type: MessageType.RequestBodyChunk,
      id: requestId(),
      end: false,
      data: encoder.encode('Hello World!')
    })).toMatchInlineSnapshot(`
      03 00 00 00 FF FF FF FF 00 00 00 00 00 00 00 00
      48 65 6C 6C 6F 20 57 6F 72 6C 64 21
    `);
  });

  it('encodes null bytes for empty RequestBodyChunk messages', () => {
    expect(encodeMessage({
      type: MessageType.RequestBodyChunk,
      id: requestId(),
      end: true,
      data: new Uint8Array()
    })).toMatchInlineSnapshot(`03 00 00 00 FF FF FF FF 01 00 00 00`);
  });
});

describe('MessageType.Response', () => {
  it('encodes Response messages', () => {
    expect(encodeMessage({
      type: MessageType.Response,
      id: requestId(),
      status: 200,
      hasContent: false,
      headers: new Headers({
        'content-type': 'application/json',
        'age': '9000'
      })
    })).toMatchInlineSnapshot(`
      04 00 00 00 FF FF FF FF 00 00 00 C8 00 00 00 00
      61 67 65 00 39 30 30 30 00 63 6F 6E 74 65 6E 74
      2D 74 79 70 65 00 61 70 70 6C 69 63 61 74 69 6F
      6E 2F 6A 73 6F 6E 00 00
    `);
  });
});

describe('MessageType.ResponseAbort', () => {
  it('encodes ResponseAbort messages', () => {
    expect(encodeMessage({
      type: MessageType.ResponseAbort,
      id: requestId(),
      errored: true
    })).toMatchInlineSnapshot(`05 00 00 00 FF FF FF FF 01 00 00 00`);
  });
});

describe('MessageType.ResponseBodyChunk', () => {
  it('encodes ResponseBodyChunk messages', () => {
    expect(encodeMessage({
      type: MessageType.ResponseBodyChunk,
      id: requestId(),
      end: false,
      data: encoder.encode('Hello World 2!')
    })).toMatchInlineSnapshot(`
      06 00 00 00 FF FF FF FF 00 00 00 00 00 00 00 00
      48 65 6C 6C 6F 20 57 6F 72 6C 64 20 32 21
    `);
  });

  it('encodes null bytes for empty ResponseBodyChunk messages', () => {
    expect(encodeMessage({
      type: MessageType.ResponseBodyChunk,
      id: requestId(),
      end: true,
      data: new Uint8Array()
    })).toMatchInlineSnapshot(`06 00 00 00 FF FF FF FF 01 00 00 00`);
  });
});

describe('MessageType.WebSocketConnect', () => {
  it('encodes WebSocketConnect messages', () => {
    expect(encodeMessage({
      type: MessageType.WebSocketConnect,
      id: requestId(),
      url: 'ws://localhost:8081/_debug'
    })).toMatchInlineSnapshot(`
      07 00 00 00 FF FF FF FF 77 73 3A 2F 2F 6C 6F 63
      61 6C 68 6F 73 74 3A 38 30 38 31 2F 5F 64 65 62
      75 67 00
    `);
  });
});

describe('MessageType.WebSocketMessage', () => {
  it('encodes WebSocketMessage messages (string payload)', () => {
    expect(encodeMessage({
      type: MessageType.WebSocketMessage,
      id: requestId(),
      data: 'Hello World!'
    })).toMatchInlineSnapshot(`
      08 00 00 00 FF FF FF FF 01 00 00 00 00 00 00 00
      48 65 6C 6C 6F 20 57 6F 72 6C 64 21
    `);
  });

  it('encodes WebSocketMessage messages (binary payload)', () => {
    expect(encodeMessage({
      type: MessageType.WebSocketMessage,
      id: requestId(),
      data: encoder.encode('Hello World!')
    })).toMatchInlineSnapshot(`
      08 00 00 00 FF FF FF FF 00 00 00 00 00 00 00 00
      48 65 6C 6C 6F 20 57 6F 72 6C 64 21
    `);
  });
});

describe('MessageType.WebSocketClose', () => {
  it('encodes WebSocketClose messages', () => {
    expect(encodeMessage({
      type: MessageType.WebSocketClose,
      id: requestId()
    })).toMatchInlineSnapshot(`09 00 00 00 FF FF FF FF`);
  });
});
