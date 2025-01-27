"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alignBytes = void 0;
const ALIGNMENT = 8;
// Get alignment bytes necessary for 64-bit alignment.
const alignBytes = (offset) => (ALIGNMENT - (offset % ALIGNMENT)) % ALIGNMENT;
exports.alignBytes = alignBytes;
