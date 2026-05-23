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
exports.AppRelease = void 0;
const core = __importStar(require("@actions/core"));
const AbstractReleaseStage_1 = require("./AbstractReleaseStage");
const Environment_1 = require("../../enums/Environment");
const ImageSHA_1 = require("../../utils/ImageSHA");
class AppRelease extends AbstractReleaseStage_1.AbstractReleaseStage {
    async onMaster(stage) {
        core.info('AppRelease: promoting image to prod');
        await this.promoteImage(stage, Environment_1.Environment.PROD);
        await this.createGitTag();
    }
    async onDevelop(stage) {
        core.info('AppRelease: promoting image to dev');
        await this.promoteImage(stage, Environment_1.Environment.DEV);
    }
    async onRelease(stage) {
        core.info('AppRelease: promoting image to qa');
        await this.promoteImage(stage, Environment_1.Environment.QA);
    }
    async onPullRequest(_stage) {
        core.info('AppRelease: PR is a Trivy gate only — promotion happens after merge');
    }
    async onHotfix(_stage) {
        core.info('AppRelease: hotfix branch — image built, waiting for merge to master');
    }
    async onDefault(_stage) {
        core.info(`AppRelease: no release action for branch '${this.branchType}'`);
    }
    /**
     * Promotes the immutable sha tag to an environment mutable tag.
     *
     * Source:  ecr/myapp:sha-4f9c21a   (built on feature/hotfix branch)
     * Dest:    ecr/myapp:dev | qa | prod
     *
     * Uses ECR put-image (no layer transfer). All env tags always point to
     * the same digest — same artefact across every environment.
     */
    async promoteImage(stage, env) {
        if (!stage.publish?.docker) {
            core.warning('No publish.docker config — skipping image promotion');
            return;
        }
        const docker = stage.publish.docker;
        const shaTag = `sha-${(0, ImageSHA_1.shortSHA)(this.config.metadata.commitHash ?? '')}`;
        await this.archive.moveAndPublish({ ...docker, tag: shaTag }, { ...docker, tag: env });
        core.info(`Promoted ${docker.image}:${shaTag} → ${docker.image}:${env}`);
    }
    async createGitTag() {
        const version = this.config.metadata.version;
        const sha = (0, ImageSHA_1.shortSHA)(this.config.metadata.commitHash ?? '');
        const tag = `v${version}-sha-${sha}`;
        const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
        core.info(`Creating git tag ${tag}`);
        execSync(`git tag ${tag}`);
        execSync(`git push origin ${tag}`);
    }
}
exports.AppRelease = AppRelease;
//# sourceMappingURL=AppRelease.js.map