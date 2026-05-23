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
exports.Credentials = void 0;
const core = __importStar(require("@actions/core"));
/**
 * Typed, auto-masking credential access.
 * Every value fetched via this class is registered with core.setSecret()
 * so it will never appear in plain text in GitHub Actions logs.
 */
class Credentials {
    static masked = new Set();
    static fetch(name, required) {
        const value = process.env[name] ?? '';
        if (required && !value) {
            throw new Error(`Required credential '${name}' is not set. ` +
                `Add it as a repository or organisation secret.`);
        }
        if (value && !this.masked.has(name)) {
            core.setSecret(value);
            this.masked.add(name);
        }
        return value;
    }
    /** Throws if the credential is absent. */
    static require(name) {
        return this.fetch(name, true);
    }
    /** Returns an empty string if the credential is absent (no error). */
    static optional(name) {
        return this.fetch(name, false);
    }
    // ── Well-known credentials ──────────────────────────────────────────────
    static githubToken() { return this.require('GITHUB_TOKEN'); }
    static orgReadToken() { return this.optional('ORG_READ_TOKEN'); }
    static sonarToken() { return this.optional('SONAR_TOKEN'); }
    static ghToken() {
        // Prefer explicit GH_TOKEN override (set in step env) over GITHUB_TOKEN
        return this.optional('GH_TOKEN') || this.require('GITHUB_TOKEN');
    }
    static awsAccessKeyId() { return this.optional('AWS_ACCESS_KEY_ID'); }
    static awsSecretAccessKey() { return this.optional('AWS_SECRET_ACCESS_KEY'); }
}
exports.Credentials = Credentials;
//# sourceMappingURL=Credentials.js.map