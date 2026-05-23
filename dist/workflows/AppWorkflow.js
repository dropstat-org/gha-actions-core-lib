"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppWorkflow = void 0;
const Workflow_1 = require("./Workflow");
const StageName_1 = require("../enums/StageName");
const BranchType_1 = require("../enums/BranchType");
const BUILD_STAGES = [
    { name: StageName_1.StageName.COMPILE, required: false },
    { name: StageName_1.StageName.UNIT_TEST, required: false },
    { name: StageName_1.StageName.LINTER, required: false },
    { name: StageName_1.StageName.SEMGREP, required: false },
    { name: StageName_1.StageName.SONARQUBE, required: false },
    { name: StageName_1.StageName.CHECKOV, required: false },
    { name: StageName_1.StageName.PUBLISH, required: false },
];
const PROMOTE_STAGES = [
    { name: StageName_1.StageName.TRIVY, required: false },
    { name: StageName_1.StageName.RELEASE, required: false },
];
class AppWorkflow extends Workflow_1.Workflow {
    /**
     * "gitflow" (default) or "trunk" — read from BRANCHING_STRATEGY env var.
     *
     * GitFlow: feature/* → develop → release/* → master, with hotfix/* → master.
     * Trunk:   feature/* → main (short-lived branches, no develop/release/hotfix).
     */
    strategy;
    constructor() {
        super();
        this.strategy = process.env.BRANCHING_STRATEGY ?? 'gitflow';
    }
    stagesConfig(branchType) {
        return this.strategy === 'trunk'
            ? this.trunkStages(branchType)
            : this.gitflowStages(branchType);
    }
    gitflowStages(branchType) {
        switch (branchType) {
            case BranchType_1.BranchType.FEATURE:
            case BranchType_1.BranchType.HOTFIX:
            case BranchType_1.BranchType.HOTFIX_EMERGENCY:
                // Build the image once here; all subsequent branches only promote.
                return BUILD_STAGES;
            case BranchType_1.BranchType.PULL_REQUEST:
                // Trivy image scan gates the merge — no build, no promote.
                return [{ name: StageName_1.StageName.TRIVY, required: false }];
            case BranchType_1.BranchType.DEVELOP:
            case BranchType_1.BranchType.RELEASE:
            case BranchType_1.BranchType.MASTER:
                // Scan the already-built image then promote to the env tag.
                return PROMOTE_STAGES;
            default:
                return BUILD_STAGES;
        }
    }
    trunkStages(branchType) {
        switch (branchType) {
            case BranchType_1.BranchType.FEATURE:
                return BUILD_STAGES;
            case BranchType_1.BranchType.PULL_REQUEST:
                return [{ name: StageName_1.StageName.TRIVY, required: false }];
            case BranchType_1.BranchType.MASTER:
                // In trunk, main is the single integration point — scan + promote to prod.
                return [
                    ...PROMOTE_STAGES,
                    { name: StageName_1.StageName.PRE_DEPLOY, required: false },
                    { name: StageName_1.StageName.DEPLOY, required: false },
                    { name: StageName_1.StageName.POST_DEPLOY, required: false },
                ];
            default:
                return BUILD_STAGES;
        }
    }
}
exports.AppWorkflow = AppWorkflow;
//# sourceMappingURL=AppWorkflow.js.map