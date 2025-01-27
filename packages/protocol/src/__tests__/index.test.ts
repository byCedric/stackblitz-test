import { Message, MessageType, RequestID, nextRequestID, encodeMessage, decodeMessage } from '../index';

let _id = 0;
const requestId = () => (++_id) as RequestID;

const encoder = new TextEncoder();

describe('MessageType.Request', () => {
  it('encodes Request messages', () => {
    const expected: Message = {
      type: MessageType.Request,
      id: requestId(),
      method: 'POST',
      hasContent: false,
      url: 'http://localhost:8081/path',
      headers: new Headers({
        'content-type': 'application/json',
        'accept': 'text/html, */*',
      }),
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });

  describe('request IDs', () => {
    it.each([
      ['maximum Smi', (2**31 - 1) as RequestID],
      ['minimum Smi', -(2**31) as RequestID],
      ['-1', -1 as RequestID],
      ['0', 0 as RequestID],
      ['(rand 1)', nextRequestID(null)],
      ['(rand 2)', nextRequestID(null)],
      ['(rand 3)', nextRequestID(null)],
    ])('encodes Request messages with edge-case request ID %s', (_, id) => {
      const expected: Message = {
        type: MessageType.Request,
        id,
        method: 'POST',
        hasContent: true,
        url: 'http://localhost:8081/path',
        headers: new Headers({
          'content-type': 'application/json',
          'accept': 'text/html, */*',
        }),
      };
      const actual = decodeMessage(encodeMessage(expected));
      expect(actual).toEqual(expected);
    });
  });

  describe('headers', () => {
    it('encodes Request messages (single header)', () => {
      const expected: Message = {
        type: MessageType.Request,
        id: requestId(),
        method: 'POST',
        hasContent: true,
        url: 'http://localhost:8081/path',
        headers: new Headers({
          'content-type': 'application/json',
        }),
      };
      const actual = decodeMessage(encodeMessage(expected));
      expect(actual).toEqual(expected);
    });

    it('encodes Request messages (empty headers)', () => {
      const expected: Message = {
        type: MessageType.Request,
        id: requestId(),
        method: 'POST',
        hasContent: true,
        url: 'http://localhost:8081/path',
        headers: new Headers(),
      };
      const actual = decodeMessage(encodeMessage(expected));
      expect(actual).toEqual(expected);
    });

    it('encodes Request messages (list header values)', () => {
      const headers = new Headers();
      headers.append('Test', 'value 1');
      headers.append('Test', 'value 2');
      const expected: Message = {
        type: MessageType.Request,
        id: requestId(),
        method: 'POST',
        hasContent: true,
        url: 'http://localhost:8081/path',
        headers,
      };
      const actual = decodeMessage(encodeMessage(expected));
      expect(actual).toEqual(expected);
    });
  });

  describe('methods', () => {
    it.each(
      [['GET'], ['HEAD'], ['POST'], ['PUT'], ['PATCH'], ['DELETE'], ['OPTIONS']] as const,
    )('encodes Request messages of %s method', (method) => {
      const expected: Message = {
        type: MessageType.Request,
        id: requestId(),
        method,
        hasContent: true,
        url: 'http://localhost:8081/path',
        headers: new Headers(),
      };
      const actual = decodeMessage(encodeMessage(expected));
      expect(actual).toEqual(expected);
    });
  });
});

describe('MessageType.RequestAbort', () => {
  it('encodes RequestAbort messages', () => {
    const expected: Message = {
      type: MessageType.RequestAbort,
      id: requestId(),
      errored: true,
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });
});

describe('MessageType.RequestBodyChunk', () => {
  it('encodes RequestBodyChunk messages', () => {
    const expected: Message = {
      type: MessageType.RequestBodyChunk,
      id: requestId(),
      end: false,
      data: encoder.encode('Hello World!'),
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });

  it('encodes null for empty RequestBodyChunk messages', () => {
    const expected: Message = {
      type: MessageType.RequestBodyChunk,
      id: requestId(),
      end: true,
      data: null,
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });
});

describe('MessageType.Response', () => {
  it('encodes Response messages', () => {
    const expected: Message = {
      type: MessageType.Response,
      id: requestId(),
      status: 200,
      hasContent: false,
      headers: new Headers({
        'content-type': 'application/json',
        'age': '9000',
      }),
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });

  describe('headers', () => {
    it('encodes Response messages (single header)', () => {
      const expected: Message = {
        type: MessageType.Response,
        id: requestId(),
        status: 200,
        hasContent: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
      };
      const actual = decodeMessage(encodeMessage(expected));
      expect(actual).toEqual(expected);
    });

    it('encodes Response messages (empty headers)', () => {
      const expected: Message = {
        type: MessageType.Response,
        id: requestId(),
        status: 200,
        hasContent: true,
        headers: new Headers(),
      };
      const actual = decodeMessage(encodeMessage(expected));
      expect(actual).toEqual(expected);
    });

    it('encodes Response messages (list header values)', () => {
      const headers = new Headers();
      headers.append('Test', 'value 1');
      headers.append('Test', 'value 2');
      const expected: Message = {
        type: MessageType.Response,
        id: requestId(),
        status: 200,
        hasContent: true,
        headers,
      };
      const actual = decodeMessage(encodeMessage(expected));
      expect(actual).toEqual(expected);
    });
  });
});

describe('MessageType.ResponseAbort', () => {
  it('encodes ResponseAbort messages', () => {
    const expected: Message = {
      type: MessageType.ResponseAbort,
      id: requestId(),
      errored: true,
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });
});

describe('MessageType.ResponseBodyChunk', () => {
  it('encodes ResponseBodyChunk messages', () => {
    const expected: Message = {
      type: MessageType.ResponseBodyChunk,
      id: requestId(),
      end: false,
      data: encoder.encode('Hello World 2!'),
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });

  it('encodes null for empty ResponseBodyChunk messages', () => {
    const expected: Message = {
      type: MessageType.ResponseBodyChunk,
      id: requestId(),
      end: true,
      data: null,
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });
});

describe('MessageType.WebSocketConnect', () => {
  it('encodes WebSocketConnect messages', () => {
    const expected: Message = {
      type: MessageType.WebSocketConnect,
      id: requestId(),
      url: 'ws://localhost:8081/_debug'
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });
});

describe('MessageType.WebSocketMessage', () => {
  it('encodes WebSocketMessage messages (string payload)', () => {
    const expected: Message = {
      type: MessageType.WebSocketMessage,
      id: requestId(),
      data: 'Hello World!',
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });

  it('encodes WebSocketMessage messages (binary payload)', () => {
    const expected: Message = {
      type: MessageType.WebSocketMessage,
      id: requestId(),
      data: encoder.encode('Hello World!'),
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });
});

describe('MessageType.WebSocketClose', () => {
  it('encodes WebSocketClose messages', () => {
    const expected: Message = {
      type: MessageType.WebSocketClose,
      id: requestId(),
    };
    const actual = decodeMessage(encodeMessage(expected));
    expect(actual).toEqual(expected);
  });
});
