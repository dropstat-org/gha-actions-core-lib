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
exports.OutputWriter = void 0;
const core = __importStar(require("@actions/core"));
const ActionYaml_1 = require("../entities/ActionYaml");
const StageName_1 = require("../enums/StageName");
const BranchType_1 = require("../enums/BranchType");
const ErrorCode_1 = require("../enums/ErrorCode");
const PlatformConfigLoader_1 = require("../config/PlatformConfigLoader");
const STAGE_FLAGS = [
    { output: 'compile_enabled', stageName: StageName_1.StageName.COMPILE },
    { output: 'unit_test_enabled', stageName: StageName_1.StageName.UNIT_TEST },
    { output: 'linter_enabled', stageName: StageName_1.StageName.LINTER },
    { output: 'semgrep_enabled', stageName: StageName_1.StageName.SEMGREP },
    { output: 'sonarqube_enabled', stageName: StageName_1.StageName.SONARQUBE },
    { output: 'trivy_enabled', stageName: StageName_1.StageName.TRIVY },
    { output: 'checkov_enabled', stageName: StageName_1.StageName.CHECKOV },
    { output: 'checkov_tf_enabled', stageName: StageName_1.StageName.CHECKOV_TF },
    { output: 'plan_enabled', stageName: StageName_1.StageName.PLAN },
    { output: 'publish_enabled', stageName: StageName_1.StageName.PUBLISH },
    { output: 'release_enabled', stageName: StageName_1.StageName.RELEASE },
    { output: 'deploy_enabled', stageName: StageName_1.StageName.DEPLOY },
    { output: 'pre_deploy_enabled', stageName: StageName_1.StageName.PRE_DEPLOY },
    { output: 'post_deploy_enabled', stageName: StageName_1.StageName.POST_DEPLOY },
];
class OutputWriter {
    static async writeFlags(config, branchType, workflow) {
        const stageNames = new Set(config.stages.map(s => s.name));
        let allowedSlots = new Set(workflow.stagesConfig(branchType).map(s => s.name));
        // Hotfix emergency: validate repo authorization and remove skippable stages
        if (branchType === BranchType_1.BranchType.HOTFIX_EMERGENCY) {
            const policy = await PlatformConfigLoader_1.PlatformConfigLoader.hotfixPolicy();
            const repo = process.env.GITHUB_REPOSITORY ?? '';
            if (!policy.allowed_repos.includes(repo)) {
                throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.HOTFIX_EXCEPTION_NOT_ALLOWED, `repo '${repo}' is not authorized for hotfix/emergency mode — contact the platform team`);
            }
            for (const stage of policy.skippable_stages)
                allowedSlots.delete(stage);
            core.warning(`Hotfix emergency mode active for ${repo} — skipping: ${policy.skippable_stages.join(', ')}`);
        }
        for (const { output, stageName } of STAGE_FLAGS) {
            const enabled = stageNames.has(stageName) && allowedSlots.has(stageName);
            core.setOutput(output, String(enabled));
        }
        const tools = config.tools ?? {};
        core.setOutput('tools_java', tools.java ?? '');
        core.setOutput('tools_maven', tools.maven ?? '');
        core.setOutput('tools_gradle', tools.gradle ?? '');
        core.setOutput('tools_node', tools.node ?? '');
        core.setOutput('tools_pnpm', tools.pnpm ?? '');
        core.setOutput('tools_go', tools.go ?? '');
        core.setOutput('tools_python', tools.python ?? '');
        core.setOutput('tools_dotnet', tools.dotnet ?? '');
        core.setOutput('ActionsCoreLib_type', config.type);
        const deployPolicies = await PlatformConfigLoader_1.PlatformConfigLoader.deployPolicy();
        const policy = deployPolicies[config.type] ?? { teams: [], users: [], min_permission: '' };
        core.setOutput('deploy_approver_teams', policy.teams.join(','));
        core.setOutput('deploy_approver_users', policy.users.join(','));
        core.setOutput('deploy_min_permission', policy.min_permission);
        core.info(`ActionsCoreLib type: ${config.type} | branch: ${branchType}`);
        core.info(`Stages configured: ${[...stageNames].join(', ')}`);
        core.info(`Stages allowed for branch: ${[...allowedSlots].join(', ')}`);
    }
}
exports.OutputWriter = OutputWriter;
//# sourceMappingURL=OutputWriter.js.map