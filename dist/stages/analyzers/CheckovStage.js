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
exports.CheckovStage = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const AbstractAnalyzerStage_1 = require("./AbstractAnalyzerStage");
const PlatformConfigLoader_1 = require("../../config/PlatformConfigLoader");
const SarifUploader_1 = require("../../utils/SarifUploader");
const DIRECTORY = '.';
class CheckovStage extends AbstractAnalyzerStage_1.AbstractAnalyzerStage {
    resultMap() {
        return { 0: 'success', 1: 'failure' };
    }
    _effectiveTools(_stage) {
        return undefined;
    }
    async install(version) {
        core.info(`Installing checkov ${version}...`);
        await exec.exec('pip', ['install', `checkov==${version}`, '--quiet']);
    }
    buildArgs(stage, softFail) {
        const framework = stage.checkov?.framework;
        const skipChecks = stage.checkov?.skipChecks ?? [];
        const isTerraformPlan = framework === 'terraform_plan';
        const planFile = stage.checkov?.planFile ?? 'tfplan.json';
        const args = isTerraformPlan
            ? ['-f', planFile, '--output', 'cli']
            : ['-d', DIRECTORY, '--output', 'cli'];
        if (framework)
            args.push('--framework', framework);
        if (softFail)
            args.push('--soft-fail');
        if (skipChecks.length)
            args.push('--skip-check', skipChecks.join(','));
        return args;
    }
    async run(stage) {
        const end = this.startGroup(`checkov: ${stage.name}`);
        try {
            const { soft_fail: SOFT_FAIL, upload_sarif: UPLOAD_SARIF } = (await PlatformConfigLoader_1.PlatformConfigLoader.securityPolicy()).checkov;
            const { checkov: checkovVersion } = await PlatformConfigLoader_1.PlatformConfigLoader.toolVersions();
            await this.install(checkovVersion);
            const args = this.buildArgs(stage, SOFT_FAIL);
            const code = await exec.exec('checkov', args, { ignoreReturnCode: true });
            this.handleResult(this.mapResult(code), stage.name, SOFT_FAIL);
            if (UPLOAD_SARIF) {
                core.info('Uploading SARIF to GitHub Security tab');
                await (0, SarifUploader_1.uploadSarif)('results_sarif.sarif');
            }
        }
        finally {
            end();
        }
    }
}
exports.CheckovStage = CheckovStage;
//# sourceMappingURL=CheckovStage.js.map