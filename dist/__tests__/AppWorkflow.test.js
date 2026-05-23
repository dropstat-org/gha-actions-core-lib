"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AppWorkflow_1 = require("../workflows/AppWorkflow");
const BranchType_1 = require("../enums/BranchType");
const StageName_1 = require("../enums/StageName");
const ErrorCode_1 = require("../enums/ErrorCode");
const workflow = new AppWorkflow_1.AppWorkflow();
function stages(...names) {
    return names.map(n => ({ name: n }));
}
describe('AppWorkflow.checkStages', () => {
    it('passes with build stages in correct order on feature', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.COMPILE, StageName_1.StageName.UNIT_TEST, StageName_1.StageName.LINTER, StageName_1.StageName.PUBLISH), BranchType_1.BranchType.FEATURE)).not.toThrow();
    });
    it('passes with trivy + release on master', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.TRIVY, StageName_1.StageName.RELEASE), BranchType_1.BranchType.MASTER)).not.toThrow();
    });
    it('passes with only trivy on pull_request', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.TRIVY), BranchType_1.BranchType.PULL_REQUEST)).not.toThrow();
    });
    it('throws INVALID_STAGE_ORDER when order is wrong on feature', () => {
        expect(() => workflow.checkStages(stages(StageName_1.StageName.UNIT_TEST, StageName_1.StageName.COMPILE), BranchType_1.BranchType.FEATURE)).toThrow(ErrorCode_1.ErrorCode.INVALID_STAGE_ORDER);
    });
});
describe('AppWorkflow.stagesConfig', () => {
    it('feature has publish slot, no trivy, no release', () => {
        const slots = workflow.stagesConfig(BranchType_1.BranchType.FEATURE);
        const names = slots.map(s => s.name);
        expect(names).toContain(StageName_1.StageName.PUBLISH);
        expect(names).not.toContain(StageName_1.StageName.TRIVY);
        expect(names).not.toContain(StageName_1.StageName.RELEASE);
    });
    it('hotfix has same slots as feature', () => {
        const feature = workflow.stagesConfig(BranchType_1.BranchType.FEATURE).map(s => s.name);
        const hotfix = workflow.stagesConfig(BranchType_1.BranchType.HOTFIX).map(s => s.name);
        expect(hotfix).toEqual(feature);
    });
    it('pull_request has only trivy slot', () => {
        const slots = workflow.stagesConfig(BranchType_1.BranchType.PULL_REQUEST);
        expect(slots).toHaveLength(1);
        expect(slots[0].name).toBe(StageName_1.StageName.TRIVY);
    });
    it('develop has trivy + release, no publish', () => {
        const slots = workflow.stagesConfig(BranchType_1.BranchType.DEVELOP);
        const names = slots.map(s => s.name);
        expect(names).toContain(StageName_1.StageName.TRIVY);
        expect(names).toContain(StageName_1.StageName.RELEASE);
        expect(names).not.toContain(StageName_1.StageName.PUBLISH);
    });
    it('master has trivy + release, no publish', () => {
        const slots = workflow.stagesConfig(BranchType_1.BranchType.MASTER);
        const names = slots.map(s => s.name);
        expect(names).toContain(StageName_1.StageName.TRIVY);
        expect(names).toContain(StageName_1.StageName.RELEASE);
        expect(names).not.toContain(StageName_1.StageName.PUBLISH);
    });
    it('release branch has trivy + release (QA promotion)', () => {
        const slots = workflow.stagesConfig(BranchType_1.BranchType.RELEASE);
        const names = slots.map(s => s.name);
        expect(names).toContain(StageName_1.StageName.TRIVY);
        expect(names).toContain(StageName_1.StageName.RELEASE);
    });
    it('all slots on feature/hotfix are optional', () => {
        const slots = workflow.stagesConfig(BranchType_1.BranchType.FEATURE);
        expect(slots.every(s => !s.required)).toBe(true);
    });
});
//# sourceMappingURL=AppWorkflow.test.js.map