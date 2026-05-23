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
exports.TrivyStage = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const AbstractAnalyzerStage_1 = require("./AbstractAnalyzerStage");
const ErrorCode_1 = require("../../enums/ErrorCode");
const PlatformConfigLoader_1 = require("../../config/PlatformConfigLoader");
const SarifUploader_1 = require("../../utils/SarifUploader");
const ImageSHA_1 = require("../../utils/ImageSHA");
const DockerECR_1 = require("../../artifacts/DockerECR");
class TrivyStage extends AbstractAnalyzerStage_1.AbstractAnalyzerStage {
    resultMap() {
        return { 0: 'success', 1: 'failure' };
    }
    _effectiveTools(_stage) {
        return undefined;
    }
    async install(version) {
        core.info(`Installing Trivy ${version}...`);
        const tarball = `trivy_${version}_Linux-64bit.tar.gz`;
        const url = `https://github.com/aquasecurity/trivy/releases/download/v${version}/${tarball}`;
        await exec.exec('curl', ['-sfL', '-o', `/tmp/${tarball}`, url]);
        await exec.exec('tar', ['-xzf', `/tmp/${tarball}`, '-C', '/usr/local/bin', 'trivy']);
    }
    /**
     * Resolves the ECR image ref from the publish stage config + resolved commitHash.
     * Used on PR / develop / release / master where the image was already pushed to ECR
     * by the feature branch build — no local docker build needed.
     *
     * AWS_ACCOUNT_ID is optional: falls back to aws sts get-caller-identity when
     * only IAM credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are provided.
     */
    async resolveECRImageRef() {
        const publishStage = this.config.stages?.find(s => s.name === 'publish');
        const docker = publishStage?.publish?.docker;
        if (!docker || docker.registry !== 'ecr')
            return null;
        const region = process.env.AWS_REGION?.trim() ?? 'us-east-1';
        const accountId = await DockerECR_1.DockerECR.resolveAccountId(region);
        if (!accountId)
            return null;
        const sha = `sha-${(0, ImageSHA_1.shortSHA)(this.config.metadata.commitHash ?? '')}`;
        return `${accountId}.dkr.ecr.${region}.amazonaws.com/${docker.image}:${sha}`;
    }
    async run(stage) {
        const end = this.startGroup(`trivy: ${stage.name}`);
        try {
            const { severity: SEVERITY, soft_fail: SOFT_FAIL, upload_sarif: UPLOAD_SARIF } = (await PlatformConfigLoader_1.PlatformConfigLoader.securityPolicy()).trivy;
            const { trivy: trivyVersion } = await PlatformConfigLoader_1.PlatformConfigLoader.toolVersions();
            await this.install(trivyVersion);
            let scanType = stage.trivy?.scanType ?? 'fs';
            let imageRef = stage.trivy?.imageRef;
            // Auto-resolve ECR image ref when scanType=image and no explicit imageRef.
            // Trivy authenticates to ECR natively via AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.
            if (scanType === 'image' && !imageRef) {
                const resolved = await this.resolveECRImageRef();
                if (resolved) {
                    core.info(`Auto-resolved ECR image for Trivy scan: ${resolved}`);
                    imageRef = resolved;
                }
                else {
                    core.setFailed(`[${ErrorCode_1.ErrorCode.MISSING_IMAGE_REF}] trivy image scan requires trivy.imageRef or a publish stage with ECR config`);
                    return;
                }
            }
            const target = scanType === 'image' ? imageRef : '.';
            const code = await exec.exec('trivy', [
                scanType,
                '--format', 'table',
                '--severity', SEVERITY,
                '--exit-code', SOFT_FAIL ? '0' : '1',
                target,
            ], { ignoreReturnCode: true });
            this.handleResult(this.mapResult(code), stage.name, SOFT_FAIL);
            if (UPLOAD_SARIF) {
                await exec.exec('trivy', [
                    scanType,
                    '--format', 'sarif',
                    '--output', 'trivy-results.sarif',
                    '--severity', SEVERITY,
                    '--exit-code', '0',
                    target,
                ], { ignoreReturnCode: true });
                core.info('Uploading SARIF to GitHub Security tab');
                await (0, SarifUploader_1.uploadSarif)('trivy-results.sarif');
            }
        }
        finally {
            end();
        }
    }
}
exports.TrivyStage = TrivyStage;
//# sourceMappingURL=TrivyStage.js.map