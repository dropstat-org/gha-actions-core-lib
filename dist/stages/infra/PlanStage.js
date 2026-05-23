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
exports.PlanStage = void 0;
const core = __importStar(require("@actions/core"));
const AbstractBranchStage_1 = require("../base/AbstractBranchStage");
const ActionYaml_1 = require("../../entities/ActionYaml");
const ErrorCode_1 = require("../../enums/ErrorCode");
const AccountValidator_1 = require("../../utils/AccountValidator");
const PlanExtractor_1 = require("../../utils/PlanExtractor");
const StageTransfer_1 = require("../../utils/StageTransfer");
const PlanSummary_1 = require("../../utils/PlanSummary");
const PlanSecurity_1 = require("../../utils/PlanSecurity");
// Subcommands that are never allowed inside a plan stage.
const FORBIDDEN_SUBCOMMANDS = ['apply', 'destroy', 'force-unlock'];
function containsSubcommand(cmd, sub) {
    return cmd.trim().split(/\s+/).includes(sub);
}
class PlanStage extends AbstractBranchStage_1.AbstractBranchStage {
    validateCommands(commands) {
        for (const cmd of commands) {
            for (const forbidden of FORBIDDEN_SUBCOMMANDS) {
                if (containsSubcommand(cmd, forbidden)) {
                    throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.PLAN_COMMAND_FORBIDDEN, `Plan stage must not contain '${forbidden}' — use the deploy stage for apply/destroy operations`);
                }
            }
        }
    }
    async onDefault(stage) {
        const commands = stage.commands ?? [];
        if (commands.length === 0) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS, `Plan stage '${stage.name}' requires at least one command`);
        }
        this.validateCommands(commands);
        if (stage.deploy?.environment) {
            (0, AccountValidator_1.validateDeployForBranch)(stage.deploy.environment, this.branchType, stage.deploy.accounts);
        }
        const extractor = new PlanExtractor_1.PlanExtractor(this.config.metadata);
        // Fallback account: accounts joined by "_", mirrors TerragruntUtils.valAccountsByBranch
        const fallbackAccount = stage.deploy?.accounts?.join('_')
            ?? this.config.metadata.projectId;
        // ── Phase 1: execute commands ──────────────────────────────────────────
        // Plan commands are split into: [plan --out binary] + [show -json > json]
        // Non-plan commands (state list, state rm, import) run as-is.
        const planIndices = [];
        for (const [i, cmd] of commands.entries()) {
            const cmdIndex = i + 1;
            if (PlanExtractor_1.PlanExtractor.isPlanCommand(cmd)) {
                planIndices.push(cmdIndex);
                const [planCmd, showCmd] = extractor.buildRunCommands(cmd, cmdIndex);
                core.info(`[plan ${cmdIndex}] ${cmd}`);
                await this.execCommands([planCmd, showCmd], this._effectiveTools(stage));
            }
            else {
                core.info(`[cmd ${cmdIndex}] ${cmd}`);
                await this.execCommands([cmd], this._effectiveTools(stage));
            }
        }
        if (planIndices.length === 0) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.NO_PLAN_COMMAND_FOUND, `Plan stage '${stage.name}' must contain at least one terragrunt plan command`);
        }
        // ── Phase 2: parse JSONL → per-account files ───────────────────────────
        // Each raw plan file is JSONL (one JSON object per module/account per line).
        // TerragruntUtils.getVarEnvIdFromPlan reads planJson.variables.env_id.value.
        for (const cmdIndex of planIndices) {
            extractor.extractPerAccountPlans(cmdIndex, fallbackAccount);
        }
        // ── Phase 3: collect valid plans and save to artifact ──────────────────
        // Exclude parent JSONL files (tfplan{n}-{projectId}-{serviceId}-*.json).
        const allJsonFiles = await StageTransfer_1.StageTransfer.findFiles('tfplan*.json');
        const perAccountPlans = extractor.filterPerAccountPlans(allJsonFiles);
        if (perAccountPlans.length === 0) {
            core.warning('PlanStage: no per-account plan files found to save');
        }
        else {
            // Security: warn before upload — plan JSON may contain plain-text variable values.
            // Artifact retention is capped at 1 day to minimize the exposure window.
            PlanSecurity_1.PlanSecurity.warnArtifactVisibility();
            for (const f of perAccountPlans)
                PlanSecurity_1.PlanSecurity.warnIfSensitiveVariables(f);
            core.info(`Saving ${perAccountPlans.length} plan file(s) as '${StageTransfer_1.PlanArtifacts.JSON}' (retention: 1 day)`);
            await StageTransfer_1.StageTransfer.saveByPaths(StageTransfer_1.PlanArtifacts.JSON, perAccountPlans, 1);
        }
        await StageTransfer_1.StageTransfer.saveByGlob(StageTransfer_1.PlanArtifacts.BINARY, StageTransfer_1.PlanGlobs.BINARY);
        // ── Phase 4: write resource change summary to GitHub Job Summary ───────────
        await PlanSummary_1.PlanSummary.writeSummaryForPlans(perAccountPlans);
    }
}
exports.PlanStage = PlanStage;
//# sourceMappingURL=PlanStage.js.map