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
exports.DockerGHCR = void 0;
const exec = __importStar(require("@actions/exec"));
const core = __importStar(require("@actions/core"));
class DockerGHCR {
    registry;
    token;
    username;
    constructor(registry = 'ghcr.io') {
        this.registry = registry;
        this.token = process.env.GITHUB_TOKEN ?? '';
        this.username = process.env.GITHUB_ACTOR ?? '';
    }
    async login() {
        await exec.exec('docker', [
            'login', this.registry,
            '-u', this.username,
            '--password-stdin',
        ], {
            input: Buffer.from(this.token),
        });
    }
    async upload(source, destination) {
        await this.login();
        const dest = this.fullRef(destination);
        core.info(`Pushing ${source} → ${dest}`);
        await exec.exec('docker', ['tag', source, dest]);
        await exec.exec('docker', ['push', dest]);
    }
    async move(source, destination) {
        await this.login();
        const src = this.fullRef(source);
        const dest = this.fullRef(destination);
        core.info(`Promoting ${src} → ${dest}`);
        await exec.exec('docker', ['pull', src]);
        await exec.exec('docker', ['tag', src, dest]);
        await exec.exec('docker', ['push', dest]);
    }
    async checkFile(imageRef) {
        const ref = this.fullRef(imageRef);
        const result = await exec.exec('docker', ['manifest', 'inspect', ref], { ignoreReturnCode: true });
        return result === 0;
    }
    fullRef(ref) {
        if (ref.startsWith(this.registry))
            return ref;
        return `${this.registry}/${ref}`;
    }
}
exports.DockerGHCR = DockerGHCR;
//# sourceMappingURL=DockerGHCR.js.map