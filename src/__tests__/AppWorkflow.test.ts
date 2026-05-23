import { AppWorkflow } from '../workflows/AppWorkflow';
import { BranchType } from '../enums/BranchType';
import { StageName } from '../enums/StageName';
import { ErrorCode } from '../enums/ErrorCode';

const workflow = new AppWorkflow();

function stages(...names: StageName[]) {
  return names.map(n => ({ name: n }));
}

describe('AppWorkflow.checkStages', () => {
  it('passes with build stages in correct order on feature', () => {
    expect(() => workflow.checkStages(
      stages(StageName.COMPILE, StageName.UNIT_TEST, StageName.LINTER, StageName.PUBLISH),
      BranchType.FEATURE,
    )).not.toThrow();
  });

  it('passes with trivy + release on master', () => {
    expect(() => workflow.checkStages(
      stages(StageName.TRIVY, StageName.RELEASE),
      BranchType.MASTER,
    )).not.toThrow();
  });

  it('passes with only trivy on pull_request', () => {
    expect(() => workflow.checkStages(
      stages(StageName.TRIVY),
      BranchType.PULL_REQUEST,
    )).not.toThrow();
  });

  it('throws INVALID_STAGE_ORDER when order is wrong on feature', () => {
    expect(() => workflow.checkStages(
      stages(StageName.UNIT_TEST, StageName.COMPILE),
      BranchType.FEATURE,
    )).toThrow(ErrorCode.INVALID_STAGE_ORDER);
  });
});

describe('AppWorkflow.stagesConfig', () => {
  it('feature has publish slot, no trivy, no release', () => {
    const slots     = workflow.stagesConfig(BranchType.FEATURE);
    const names     = slots.map(s => s.name);
    expect(names).toContain(StageName.PUBLISH);
    expect(names).not.toContain(StageName.TRIVY);
    expect(names).not.toContain(StageName.RELEASE);
  });

  it('hotfix has same slots as feature', () => {
    const feature = workflow.stagesConfig(BranchType.FEATURE).map(s => s.name);
    const hotfix  = workflow.stagesConfig(BranchType.HOTFIX).map(s => s.name);
    expect(hotfix).toEqual(feature);
  });

  it('pull_request has only trivy slot', () => {
    const slots = workflow.stagesConfig(BranchType.PULL_REQUEST);
    expect(slots).toHaveLength(1);
    expect(slots[0].name).toBe(StageName.TRIVY);
  });

  it('develop has trivy + release, no publish', () => {
    const slots = workflow.stagesConfig(BranchType.DEVELOP);
    const names = slots.map(s => s.name);
    expect(names).toContain(StageName.TRIVY);
    expect(names).toContain(StageName.RELEASE);
    expect(names).not.toContain(StageName.PUBLISH);
  });

  it('master has trivy + release, no publish', () => {
    const slots = workflow.stagesConfig(BranchType.MASTER);
    const names = slots.map(s => s.name);
    expect(names).toContain(StageName.TRIVY);
    expect(names).toContain(StageName.RELEASE);
    expect(names).not.toContain(StageName.PUBLISH);
  });

  it('release branch has trivy + release (QA promotion)', () => {
    const slots = workflow.stagesConfig(BranchType.RELEASE);
    const names = slots.map(s => s.name);
    expect(names).toContain(StageName.TRIVY);
    expect(names).toContain(StageName.RELEASE);
  });

  it('all slots on feature/hotfix are optional', () => {
    const slots = workflow.stagesConfig(BranchType.FEATURE);
    expect(slots.every(s => !s.required)).toBe(true);
  });
});
