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
exports.SemgrepStage = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const AbstractAnalyzerStage_1 = require("./AbstractAnalyzerStage");
const PlatformConfigLoader_1 = require("../../config/PlatformConfigLoader");
const SarifUploader_1 = require("../../utils/SarifUploader");
class SemgrepStage extends AbstractAnalyzerStage_1.AbstractAnalyzerStage {
    resultMap() {
        return { 0: 'success', 1: 'failure' };
    }
    _effectiveTools(_stage) {
        return undefined;
    }
    async install(version) {
        core.info(`Installing Semgrep ${version}...`);
        await exec.exec('pip', ['install', `semgrep==${version}`, '--quiet']);
    }
    async run(stage) {
        const end = this.startGroup(`semgrep: ${stage.name}`);
        try {
            const { default_config: DEFAULT_CONFIG, soft_fail: SOFT_FAIL, upload_sarif: UPLOAD_SARIF } = (await PlatformConfigLoader_1.PlatformConfigLoader.securityPolicy()).semgrep;
            const { semgrep: semgrepVersion } = await PlatformConfigLoader_1.PlatformConfigLoader.toolVersions();
            await this.install(semgrepVersion);
            const semgrepConfig = stage.semgrep?.config ?? DEFAULT_CONFIG;
            const extraArgs = stage.semgrep?.args ?? [];
            // Scan 1: text output for log (determines pass/fail)
            // --error exits with code 1 when findings exist; omitting it exits 0 (soft-fail behaviour)
            const tableArgs = [
                'scan',
                '--config', semgrepConfig,
                '--text',
                ...(!SOFT_FAIL ? ['--error'] : []),
                '.',
                ...extraArgs,
            ];
            const code = await exec.exec('semgrep', tableArgs, { ignoreReturnCode: true });
            this.handleResult(this.mapResult(code), stage.name, SOFT_FAIL);
            if (UPLOAD_SARIF) {
                // Scan 2: SARIF output for GitHub Security tab (requires GitHub Advanced Security)
                const sarifArgs = [
                    'scan',
                    '--config', semgrepConfig,
                    '--sarif',
                    '--output', 'semgrep-results.sarif',
                    '.',
                    ...extraArgs,
                ];
                await exec.exec('semgrep', sarifArgs, { ignoreReturnCode: true });
                core.info('Uploading SARIF to GitHub Security tab');
                await (0, SarifUploader_1.uploadSarif)('semgrep-results.sarif');
            }
        }
        finally {
            end();
        }
    }
}
exports.SemgrepStage = SemgrepStage;
//# sourceMappingURL=SemgrepStage.js.map