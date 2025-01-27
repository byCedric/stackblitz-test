"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.minifetch = void 0;
const node_stream_1 = require("node:stream");
const http = __importStar(require("node:http"));
const https = __importStar(require("node:https"));
const headersToDict = (headers) => {
    const dict = {};
    for (const [key, value] of headers)
        dict[key] = value;
    return dict;
};
const dictToHeaders = (dict) => {
    const headers = new Headers();
    for (const key in dict)
        if (dict[key] != null)
            headers.set(key, Array.isArray(dict[key]) ? dict[key].join(',') : dict[key]);
    return headers;
};
const minifetch = (...args) => new Promise((resolve, reject) => {
    const request = new Request(...args);
    const url = new URL(request.url);
    const requestOptions = {
        hostname: url.hostname,
        port: url.port,
        method: request.method,
        path: url.pathname + url.search,
        headers: headersToDict(request.headers),
        signal: request.signal,
    };
    const protocol = url.protocol === 'https:' ? https : http;
    const outgoing = protocol.request(requestOptions, (incoming) => {
        resolve(new Response(node_stream_1.Readable.toWeb(incoming), {
            status: incoming.statusCode,
            statusText: incoming.statusMessage,
            headers: dictToHeaders(incoming.headers),
        }));
    });
    outgoing.on('error', reject);
    if (request.body) {
        (0, node_stream_1.pipeline)(node_stream_1.Readable.fromWeb(request.body, { signal: request.signal }), outgoing, (error) => {
            if (error)
                reject(error);
        });
    }
    else {
        outgoing.end();
    }
});
exports.minifetch = minifetch;
