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
exports.DeployStage = void 0;
const core = __importStar(require("@actions/core"));
const AbstractDeployStage_1 = require("./AbstractDeployStage");
const ActionYaml_1 = require("../../entities/ActionYaml");
const ErrorCode_1 = require("../../enums/ErrorCode");
const ActionsType_1 = require("../../enums/ActionsType");
const StageTransfer_1 = require("../../utils/StageTransfer");
const PlanSummary_1 = require("../../utils/PlanSummary");
function containsSubcommand(cmd, sub) {
    return cmd.trim().split(/\s+/).includes(sub);
}
// After 'apply', checks that at least one non-flag token exists (the plan file).
// Bare 'apply' or 'apply -auto-approve' without a plan file would re-plan and apply
// without the security review done in the plan stage.
// run-all apply is exempt — each module manages its own plan state internally.
function applyHasPlanFileArg(cmd) {
    const parts = cmd.trim().split(/\s+/);
    const applyIdx = parts.indexOf('apply');
    if (applyIdx < 0)
        return false;
    return parts.slice(applyIdx + 1).some(p => !p.startsWith('-'));
}
class DeployStage extends AbstractDeployStage_1.AbstractDeployStage {
    validateTerraformDeploy(stage) {
        const commands = stage.commands ?? [];
        for (const cmd of commands) {
            if (containsSubcommand(cmd, 'plan')) {
                throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.DEPLOY_PLAN_COMMAND_FORBIDDEN, `Deploy stage must not contain 'plan' — plan commands belong in the plan stage`);
            }
        }
        const applyCmds = commands.filter(cmd => containsSubcommand(cmd, 'apply'));
        if (applyCmds.length === 0) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS, `Terraform deploy stage requires at least one 'apply' command`);
        }
        // run-all apply manages plan state per-module internally (.terragrunt-cache),
        // so no explicit plan file arg is required. Single-module apply must still
        // reference the plan file to prevent an unreviewed re-plan.
        for (const applyCmd of applyCmds) {
            if (!containsSubcommand(applyCmd, 'run-all') && !applyHasPlanFileArg(applyCmd)) {
                throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.DEPLOY_MISSING_PLAN_REF, `Terraform 'apply' must reference the plan file produced by the plan stage ` +
                    `(e.g., 'terragrunt apply tfplan.binary'). Bare apply re-plans and bypasses the reviewed plan.`);
            }
        }
    }
    // Restores plan JSON files from the previous job's artifact (if available) and
    // renders the resource-change summary at the top of the deploy job summary.
    // Files may already be present when plan and deploy run on the same runner.
    async showPlanSummary() {
        try {
            await StageTransfer_1.StageTransfer.restoreByName(StageTransfer_1.PlanArtifacts.JSON);
        }
        catch {
            // Files already in workspace (same-runner deploy) — not an error
        }
        const planFiles = await StageTransfer_1.StageTransfer.findFiles(StageTransfer_1.PlanGlobs.JSON);
        if (planFiles.length > 0) {
            await PlanSummary_1.PlanSummary.writeSummaryForPlans(planFiles);
        }
        else {
            core.info('DeployStage: no plan summary files found — skipping summary display');
        }
    }
    async run(stage) {
        if (!stage.deploy) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_DEPLOY_ENV, `Stage '${stage.name}' requires deploy config`);
        }
        if (!stage.commands || stage.commands.length === 0) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS, `Deploy stage '${stage.name}' requires at least one command`);
        }
        if (this.config.type === ActionsType_1.ActionsType.TERRAFORM) {
            this.validateTerraformDeploy(stage);
            await this.showPlanSummary();
        }
        const end = this.startGroup(`deploy: ${stage.name}`);
        try {
            await super.run(stage);
        }
        finally {
            end();
        }
    }
}
exports.DeployStage = DeployStage;
//# sourceMappingURL=DeployStage.js.map