"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDebug = createDebug;
const debug_1 = __importDefault(require("debug"));
function createDebug(namespace) {
    return (0, debug_1.default)('tunnel').extend(namespace);
}
