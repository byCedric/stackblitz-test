import { Readable, pipeline } from 'node:stream';
import * as http from 'node:http';
import * as https from 'node:https';

const headersToDict = (headers: Headers): Record<string, string> => {
  const dict: Record<string, string> = {};
  for (const [key, value] of headers)
    dict[key] = value;
  return dict;
};

const dictToHeaders = (dict: Record<string, string | string[] | undefined>): Headers => {
  const headers = new Headers();
  for (const key in dict)
    if (dict[key] != null)
      headers.set(key, Array.isArray(dict[key]) ? dict[key].join(',') : dict[key]);
  return headers;
};

export const minifetch: typeof fetch = (...args) => new Promise((resolve, reject) => {
  const request = new Request(...args);
  const url = new URL(request.url);
  const requestOptions: http.RequestOptions = {
    hostname: url.hostname,
    port: url.port,
    method: request.method,
    path: url.pathname + url.search,
    headers: headersToDict(request.headers),
    signal: request.signal,
  };

  const protocol = url.protocol === 'https:' ? https : http;
  const outgoing = protocol.request(requestOptions, (incoming) => {
    resolve(
      new Response(Readable.toWeb(incoming) as any, {
        status: incoming.statusCode,
        statusText: incoming.statusMessage,
        headers: dictToHeaders(incoming.headers),
      })
    );
  });

  outgoing.on('error', reject);
  if (request.body) {
    pipeline(
      Readable.fromWeb(request.body as any, { signal: request.signal }),
      outgoing,
      (error) => {
        if (error) reject(error);
      },
    );
  } else {
    outgoing.end();
  }
});
