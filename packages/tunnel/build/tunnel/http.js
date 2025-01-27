"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleProxiedRequest = handleProxiedRequest;
exports.pushProxiedRequestBodyChunk = pushProxiedRequestBodyChunk;
exports.abortProxiedRequest = abortProxiedRequest;
const protocol_1 = require("@lunchbox/protocol");
const debug_1 = require("../utils/debug");
const minifetch_1 = require("../utils/minifetch");
const debug = (0, debug_1.createDebug)('http');
const requestBodies = new Map();
const abortControllers = new Map();
async function handleProxiedRequest(tunnel, message) {
    // TODO: fix on React Native / Expo CLI's end
    // This requires adding the proxied origin as allowed CORS header
    const proxiedHeaders = new Headers(message.headers);
    proxiedHeaders.delete('origin');
    debug('Executing proxied request with pending request body stream');
    const controller = new AbortController();
    const signal = controller.signal;
    abortControllers.set(message.id, controller);
    const body = message.hasContent ? new ReadableStream({
        start(controller) {
            requestBodies.set(message.id, controller);
        },
    }) : null;
    let response;
    try {
        // TODO: The URL's host should be enforced on the client-side too
        response = await (0, minifetch_1.minifetch)(message.url, {
            signal: controller.signal,
            method: message.method,
            headers: proxiedHeaders,
            body,
        });
    }
    catch (error) {
        requestBodies.delete(message.id);
        if (!signal.aborted) {
            tunnel.send((0, protocol_1.encodeMessage)({
                type: protocol_1.MessageType.ResponseAbort,
                id: message.id,
                errored: true,
            }));
        }
        return;
    }
    try {
        for await (const chunk of encodeResponse(message.id, response, signal))
            tunnel.send(chunk);
    }
    finally {
        abortControllers.delete(message.id);
        requestBodies.delete(message.id);
    }
}
async function pushProxiedRequestBodyChunk(message) {
    debug('Streaming proxied request body chunk');
    const controller = requestBodies.get(message.id);
    if (controller) {
        if (message.data)
            controller.enqueue(message.data);
        if (message.end) {
            controller.close();
            requestBodies.delete(message.id);
        }
    }
    else {
        debug('No active request stream found for message ID', message.id);
    }
}
async function abortProxiedRequest(message) {
    debug('Aborting proxied request');
    const abortController = abortControllers.get(message.id);
    if (abortController) {
        abortController.abort(message.errored ? new Error('Remote closed request stream') : undefined);
        abortControllers.delete(message.id);
    }
    const bodyController = requestBodies.get(message.id);
    if (bodyController && message.errored) {
        bodyController.error(new Error('Remote closed request stream'));
    }
    else if (bodyController) {
        bodyController.close();
    }
    if (!bodyController && !abortController) {
        debug('No active request to abort found for message ID', message.id);
    }
}
async function* encodeResponse(id, response, signal) {
    if (signal.aborted)
        return;
    yield (0, protocol_1.encodeMessage)({
        type: protocol_1.MessageType.Response,
        id,
        hasContent: !!response.body,
        status: response.status,
        headers: response.headers,
    });
    if (signal.aborted) {
        yield (0, protocol_1.encodeMessage)({
            type: protocol_1.MessageType.ResponseAbort,
            id,
            errored: false,
        });
    }
    else if (response.body) {
        try {
            for await (const chunk of (0, protocol_1.bodyToChunks)(response.body, { signal })) {
                if (signal.aborted)
                    break;
                yield (0, protocol_1.encodeMessage)({
                    type: protocol_1.MessageType.ResponseBodyChunk,
                    id,
                    end: chunk.done,
                    data: chunk.value || null,
                });
            }
        }
        catch (error) {
            if (!signal.aborted) {
                debug('Broken response body stream for request ID', id, error);
                yield (0, protocol_1.encodeMessage)({ type: protocol_1.MessageType.ResponseAbort, id, errored: true });
            }
        }
        finally {
            if (signal.aborted) {
                yield (0, protocol_1.encodeMessage)({ type: protocol_1.MessageType.RequestAbort, id, errored: false });
            }
        }
    }
}
