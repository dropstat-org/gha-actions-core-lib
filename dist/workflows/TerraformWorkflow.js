"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerraformWorkflow = void 0;
const Workflow_1 = require("./Workflow");
const StageName_1 = require("../enums/StageName");
const BranchType_1 = require("../enums/BranchType");
class TerraformWorkflow extends Workflow_1.Workflow {
    stagesConfig(branchType) {
        switch (branchType) {
            // Production: full pipeline + git tag release
            case BranchType_1.BranchType.MASTER:
                return [
                    { name: StageName_1.StageName.PLAN, required: false },
                    { name: StageName_1.StageName.CHECKOV_TF, required: false },
                    { name: StageName_1.StageName.CHECKOV, required: false },
                    { name: StageName_1.StageName.LINTER, required: false },
                    { name: StageName_1.StageName.DEPLOY, required: false },
                    { name: StageName_1.StageName.RELEASE, required: true },
                ];
            // Promotion branches: plan + security + deploy (no release tag)
            case BranchType_1.BranchType.DEVELOP:
            case BranchType_1.BranchType.RELEASE:
                return [
                    { name: StageName_1.StageName.PLAN, required: false },
                    { name: StageName_1.StageName.CHECKOV_TF, required: false },
                    { name: StageName_1.StageName.CHECKOV, required: false },
                    { name: StageName_1.StageName.LINTER, required: false },
                    { name: StageName_1.StageName.DEPLOY, required: false },
                ];
            // Emergency patch: plan + security gate + deploy (skip generic checkov)
            case BranchType_1.BranchType.HOTFIX_EMERGENCY:
            case BranchType_1.BranchType.HOTFIX:
                return [
                    { name: StageName_1.StageName.PLAN, required: false },
                    { name: StageName_1.StageName.CHECKOV_TF, required: false },
                    { name: StageName_1.StageName.LINTER, required: false },
                    { name: StageName_1.StageName.DEPLOY, required: false },
                ];
            // CI-only: plan preview + security scan, no deploy
            case BranchType_1.BranchType.FEATURE:
            case BranchType_1.BranchType.PULL_REQUEST:
            default:
                return [
                    { name: StageName_1.StageName.PLAN, required: false },
                    { name: StageName_1.StageName.CHECKOV_TF, required: false },
                    { name: StageName_1.StageName.CHECKOV, required: false },
                    { name: StageName_1.StageName.LINTER, required: false },
                ];
        }
    }
}
exports.TerraformWorkflow = TerraformWorkflow;
//# sourceMappingURL=TerraformWorkflow.js.map