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
exports.SonarQubeStage = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const AbstractAnalyzerStage_1 = require("./AbstractAnalyzerStage");
const ErrorCode_1 = require("../../enums/ErrorCode");
const PlatformConfigLoader_1 = require("../../config/PlatformConfigLoader");
const Credentials_1 = require("../../utils/Credentials");
const Logger_1 = require("../../utils/Logger");
class SonarQubeStage extends AbstractAnalyzerStage_1.AbstractAnalyzerStage {
    resultMap() {
        return { 0: 'success', 1: 'failure', 2: 'warning' };
    }
    async install() {
        const { sonarqube_scanner: version } = await PlatformConfigLoader_1.PlatformConfigLoader.toolVersions();
        Logger_1.Logger.info(`Installing sonar-scanner ${version}...`);
        const url = `https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${version}-linux-x64.zip`;
        await exec.exec('curl', ['-sSLo', '/tmp/sonar.zip', url]);
        await exec.exec('unzip', ['-q', '/tmp/sonar.zip', '-d', '/tmp']);
        await exec.exec('sudo', ['mv', `/tmp/sonar-scanner-${version}-linux-x64`, '/opt/sonar-scanner']);
        await exec.exec('sudo', ['ln', '-sf', '/opt/sonar-scanner/bin/sonar-scanner', '/usr/local/bin/sonar-scanner']);
    }
    async run(stage) {
        const end = this.startGroup(`sonarqube: ${stage.name}`);
        try {
            await this.install();
            const sonarToken = Credentials_1.Credentials.sonarToken();
            const sonarUrl = Credentials_1.Credentials.optional('SONAR_HOST_URL');
            // projectKey = artifactId — generado automáticamente desde projectId+serviceId
            const projectKey = this.config.metadata.artifactId ?? '';
            const args = [
                `-Dsonar.projectKey=${projectKey}`,
                `-Dsonar.sources=.`,
                sonarUrl ? `-Dsonar.host.url=${sonarUrl}` : '',
                sonarToken ? `-Dsonar.token=${sonarToken}` : '',
                ...(stage.sonar?.args ?? []),
            ].filter(Boolean);
            let exitCode = 0;
            try {
                exitCode = await exec.exec('sonar-scanner', args, { ignoreReturnCode: true });
            }
            catch {
                exitCode = 1;
            }
            const result = this.mapResult(exitCode);
            if (result === 'failure') {
                core.setFailed(`[${ErrorCode_1.ErrorCode.SONARQUBE_QUALITY_GATE_FAILED}] SonarQube Quality Gate failed`);
            }
            else {
                this.handleResult(result, stage.name, false);
            }
        }
        finally {
            end();
        }
    }
}
exports.SonarQubeStage = SonarQubeStage;
//# sourceMappingURL=SonarQubeStage.js.map