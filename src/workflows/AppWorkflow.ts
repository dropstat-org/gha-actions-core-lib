import { Workflow } from './Workflow';
import { StageSlot } from './StageSlot';
import { StageName } from '../enums/StageName';
import { BranchType } from '../enums/BranchType';

const BUILD_STAGES: StageSlot[] = [
  { name: StageName.COMPILE,   required: false },
  { name: StageName.UNIT_TEST, required: false },
  { name: StageName.LINTER,    required: false },
  { name: StageName.SEMGREP,   required: false },
  { name: StageName.SONARQUBE, required: false },
  { name: StageName.CHECKOV,   required: false },
  { name: StageName.PUBLISH,   required: false },
];

const PROMOTE_STAGES: StageSlot[] = [
  { name: StageName.TRIVY,   required: false },
  { name: StageName.RELEASE, required: false },
];

export class AppWorkflow extends Workflow {
  /**
   * "gitflow" (default) or "trunk" — read from BRANCHING_STRATEGY env var.
   *
   * GitFlow: feature/* → develop → release/* → master, with hotfix/* → master.
   * Trunk:   feature/* → main (short-lived branches, no develop/release/hotfix).
   */
  private readonly strategy: string;

  constructor() {
    super();
    this.strategy = process.env.BRANCHING_STRATEGY ?? 'gitflow';
  }

  stagesConfig(branchType: BranchType): StageSlot[] {
    return this.strategy === 'trunk'
      ? this.trunkStages(branchType)
      : this.gitflowStages(branchType);
  }

  private gitflowStages(branchType: BranchType): StageSlot[] {
    switch (branchType) {
      case BranchType.FEATURE:
      case BranchType.HOTFIX:
      case BranchType.HOTFIX_EMERGENCY:
        // Build the image once here; all subsequent branches only promote.
        return BUILD_STAGES;

      case BranchType.PULL_REQUEST:
        // Trivy image scan gates the merge — no build, no promote.
        return [{ name: StageName.TRIVY, required: false }];

      case BranchType.DEVELOP:
      case BranchType.RELEASE:
      case BranchType.MASTER:
        // Scan the already-built image then promote to the env tag.
        return PROMOTE_STAGES;

      default:
        return BUILD_STAGES;
    }
  }

  private trunkStages(branchType: BranchType): StageSlot[] {
    switch (branchType) {
      case BranchType.FEATURE:
        return BUILD_STAGES;

      case BranchType.PULL_REQUEST:
        return [{ name: StageName.TRIVY, required: false }];

      case BranchType.MASTER:
        // In trunk, main is the single integration point — scan + promote to prod.
        return [
          ...PROMOTE_STAGES,
          { name: StageName.PRE_DEPLOY,  required: false },
          { name: StageName.DEPLOY,      required: false },
          { name: StageName.POST_DEPLOY, required: false },
        ];

      default:
        return BUILD_STAGES;
    }
  }
}
