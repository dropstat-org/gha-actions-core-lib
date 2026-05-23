"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployWorkflow = void 0;
const Workflow_1 = require("./Workflow");
const StageName_1 = require("../enums/StageName");
const BranchType_1 = require("../enums/BranchType");
const ErrorCode_1 = require("../enums/ErrorCode");
const ActionYaml_1 = require("../entities/ActionYaml");
class DeployWorkflow extends Workflow_1.Workflow {
    stagesConfig(branchType) {
        if (branchType !== BranchType_1.BranchType.MASTER && branchType !== BranchType_1.BranchType.DEVELOP) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.DEPLOY_NOT_ALLOWED_ON_BRANCH, `Deploy ActionsCoreLib only run on master/develop, not on '${branchType}'`);
        }
        return [
            { name: StageName_1.StageName.PRE_DEPLOY, required: false },
            { name: StageName_1.StageName.DEPLOY, required: true },
            { name: StageName_1.StageName.POST_DEPLOY, required: false },
        ];
    }
}
exports.DeployWorkflow = DeployWorkflow;
//# sourceMappingURL=DeployWorkflow.js.map