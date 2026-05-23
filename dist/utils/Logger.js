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
exports.Logger = void 0;
const core = __importStar(require("@actions/core"));
/** Structured logging wrapper around @actions/core. */
class Logger {
    static info(message) { core.info(message); }
    static warn(message) { core.warning(message); }
    static error(message) { core.error(message); }
    static debug(message) { core.debug(message); }
    static notice(message) { core.notice(message); }
    /**
     * Opens a collapsible log group and returns a closer function.
     * The closer logs the elapsed time when called.
     *
     * @example
     * const end = Logger.group('install trivy');
     * try { ... } finally { end(); }
     */
    static group(name) {
        const start = Date.now();
        core.startGroup(name);
        return () => {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            core.endGroup();
            core.info(`'${name}' completed in ${elapsed}s`);
        };
    }
    /**
     * Runs fn inside a named log group and always closes it.
     *
     * @example
     * await Logger.withGroup('plan', async () => { ... });
     */
    static async withGroup(name, fn) {
        const end = this.group(name);
        try {
            return await fn();
        }
        finally {
            end();
        }
    }
    /**
     * Prints a visible banner — useful at the start of a stage to make
     * it easy to spot in a long log.
     */
    static banner(title) {
        const bar = '─'.repeat(title.length + 4);
        core.info(bar);
        core.info(`  ${title}`);
        core.info(bar);
    }
    /** Mask a value so it never appears in plain text in the logs. */
    static mask(value) {
        core.setSecret(value);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map