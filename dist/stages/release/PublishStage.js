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
exports.PublishStage = void 0;
const core = __importStar(require("@actions/core"));
const AbstractStage_1 = require("../base/AbstractStage");
const ArchiveManager_1 = require("../../archive/ArchiveManager");
const StageMessage_1 = require("../../utils/StageMessage");
const ImageSHA_1 = require("../../utils/ImageSHA");
class PublishStage extends AbstractStage_1.AbstractStage {
    archive = new ArchiveManager_1.ArchiveManager();
    async run(stage) {
        const end = this.startGroup(`publish: ${stage.name}`);
        try {
            const registry = stage.publish?.docker?.registry ?? 'ghcr';
            const image = stage.publish?.docker?.image ?? this.deriveImage();
            const fullSHA = this.config.metadata.commitHash ?? 'unknown';
            const shaTag = `sha-${(0, ImageSHA_1.shortSHA)(fullSHA)}`;
            const version = this.config.metadata.version;
            const versionTag = `v${version}-${shaTag}`;
            // Export OCI metadata so docker build commands in stage.commands can use them
            StageMessage_1.StageMessage.exportEnv('IMAGE_TAG', shaTag);
            StageMessage_1.StageMessage.exportEnv('IMAGE_VERSION', versionTag);
            StageMessage_1.StageMessage.exportEnv('ARTIFACT_ID', this.config.metadata.artifactId ?? '');
            StageMessage_1.StageMessage.exportEnv('OCI_REVISION', fullSHA);
            StageMessage_1.StageMessage.exportEnv('OCI_VERSION', version);
            StageMessage_1.StageMessage.exportEnv('OCI_SOURCE', process.env.GITHUB_REPOSITORY ?? '');
            if (stage.commands && stage.commands.length > 0) {
                core.info('Running build commands');
                await this.execCommands(stage.commands, this._effectiveTools(stage));
            }
            const localImage = `${this.config.metadata.artifactId}:${shaTag}`;
            // Push sha tag — the canonical immutable reference
            await this.archive.packageAndUpload(localImage, { registry, image, tag: shaTag });
            // Push version tag pointing to same digest (put-image for ECR, retag for GHCR)
            await this.archive.moveAndPublish({ registry, image, tag: shaTag }, { registry, image, tag: versionTag });
            const imageRef = this.buildImageRef(registry, image, shaTag);
            StageMessage_1.StageMessage.emit(StageMessage_1.StageOutputKey.IMAGE_TAG, shaTag);
            StageMessage_1.StageMessage.emit(StageMessage_1.StageOutputKey.IMAGE_VERSION, versionTag);
            StageMessage_1.StageMessage.emit(StageMessage_1.StageOutputKey.IMAGE_REF, imageRef);
        }
        finally {
            end();
        }
    }
    buildImageRef(registry, image, tag) {
        if (registry === 'ecr') {
            const accountId = process.env.AWS_ACCOUNT_ID ?? '';
            const region = process.env.AWS_REGION ?? 'us-east-1';
            return `${accountId}.dkr.ecr.${region}.amazonaws.com/${image}:${tag}`;
        }
        return `ghcr.io/${image}:${tag}`;
    }
    deriveImage() {
        const repo = process.env.GITHUB_REPOSITORY ?? this.config.metadata.artifactId ?? 'unknown';
        return repo.toLowerCase();
    }
}
exports.PublishStage = PublishStage;
//# sourceMappingURL=PublishStage.js.map