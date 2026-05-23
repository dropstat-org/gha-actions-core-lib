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
exports.ArchiveManager = void 0;
const core = __importStar(require("@actions/core"));
const DockerGHCR_1 = require("../artifacts/DockerGHCR");
const DockerECR_1 = require("../artifacts/DockerECR");
class ArchiveManager {
    artifact(config) {
        return config.registry === 'ecr' ? new DockerECR_1.DockerECR() : new DockerGHCR_1.DockerGHCR();
    }
    async packageAndUpload(localImage, config) {
        const dest = config.tag ? `${config.image}:${config.tag}` : config.image;
        core.info(`packageAndUpload: ${localImage} → ${dest}`);
        await this.artifact(config).upload(localImage, dest);
    }
    async moveAndPublish(source, destination) {
        const src = source.tag ? `${source.image}:${source.tag}` : source.image;
        const dest = destination.tag ? `${destination.image}:${destination.tag}` : destination.image;
        core.info(`moveAndPublish (promote without rebuild): ${src} → ${dest}`);
        await this.artifact(destination).move(src, dest);
    }
    async moveOrPackageAndUpload(localImage, config, sourceTag) {
        const exists = await this.artifact(config).checkFile(sourceTag ? `${config.image}:${sourceTag}` : config.image);
        if (exists && sourceTag) {
            await this.moveAndPublish({ ...config, tag: sourceTag }, config);
        }
        else {
            await this.packageAndUpload(localImage, config);
        }
    }
    async packageAndUploadToEnv(localImage, config, env) {
        const envTag = config.tag ? `${config.tag}-${env}` : env;
        core.info(`packageAndUploadToEnv → env=${env} tag=${envTag}`);
        await this.packageAndUpload(localImage, { ...config, tag: envTag });
    }
}
exports.ArchiveManager = ArchiveManager;
//# sourceMappingURL=ArchiveManager.js.map