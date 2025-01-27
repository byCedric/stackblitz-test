"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bodyToChunks = bodyToChunks;
const CHUNK_LIMIT = 1021 * 1024; // 1021KiB
function createChunkStream() {
    return new TransformStream({
        transform(chunk, controller) {
            if (chunk.byteLength < CHUNK_LIMIT) {
                controller.enqueue(chunk);
            }
            else {
                for (let offset = 0; offset < chunk.byteLength; offset += CHUNK_LIMIT) {
                    controller.enqueue(chunk.slice(offset, offset + CHUNK_LIMIT));
                }
            }
        },
    });
}
async function* bodyToChunks(stream) {
    const reader = stream.pipeThrough(createChunkStream()).getReader();
    try {
        let chunk;
        do {
            yield (chunk = await reader.read());
        } while (!chunk.done);
    }
    finally {
        reader.releaseLock();
    }
}
