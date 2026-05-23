"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DeployWorkflow_1 = require("../workflows/DeployWorkflow");
const BranchType_1 = require("../enums/BranchType");
const StageName_1 = require("../enums/StageName");
const ErrorCode_1 = require("../enums/ErrorCode");
const workflow = new DeployWorkflow_1.DeployWorkflow();
function stages(...names) {
    return names.map(n => ({ name: n }));
}
describe('DeployWorkflow', () => {
    it('throws DEPLOY_NOT_ALLOWED_ON_BRANCH on feature', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.DEPLOY), BranchType_1.BranchType.FEATURE))
            .toThrow(ErrorCode_1.ErrorCode.DEPLOY_NOT_ALLOWED_ON_BRANCH);
    });
    it('throws DEPLOY_NOT_ALLOWED_ON_BRANCH on pull_request', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.DEPLOY), BranchType_1.BranchType.PULL_REQUEST))
            .toThrow(ErrorCode_1.ErrorCode.DEPLOY_NOT_ALLOWED_ON_BRANCH);
    });
    it('requires deploy stage on master', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.PRE_DEPLOY), BranchType_1.BranchType.MASTER))
            .toThrow(ErrorCode_1.ErrorCode.MISSING_REQUIRED_STAGE);
    });
    it('passes with deploy on master', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.DEPLOY), BranchType_1.BranchType.MASTER))
            .not.toThrow();
    });
    it('passes full deploy chain on develop', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.PRE_DEPLOY, StageName_1.StageName.DEPLOY, StageName_1.StageName.POST_DEPLOY), BranchType_1.BranchType.DEVELOP)).not.toThrow();
    });
});
//# sourceMappingURL=DeployWorkflow.test.js.map