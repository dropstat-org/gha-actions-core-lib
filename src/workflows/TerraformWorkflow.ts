import { Workflow } from './Workflow';
import { StageSlot } from './StageSlot';
import { StageName } from '../enums/StageName';
import { BranchType } from '../enums/BranchType';

export class TerraformWorkflow extends Workflow {
  stagesConfig(branchType: BranchType): StageSlot[] {
    switch (branchType) {
      // Production: full pipeline + git tag release
      case BranchType.MASTER:
        return [
          { name: StageName.PLAN,       required: false },
          { name: StageName.CHECKOV_TF, required: false },
          { name: StageName.CHECKOV,    required: false },
          { name: StageName.LINTER,     required: false },
          { name: StageName.DEPLOY,     required: false },
          { name: StageName.RELEASE,    required: true  },
        ];

      // Promotion branches: plan + security + deploy (no release tag)
      case BranchType.DEVELOP:
      case BranchType.RELEASE:
        return [
          { name: StageName.PLAN,       required: false },
          { name: StageName.CHECKOV_TF, required: false },
          { name: StageName.CHECKOV,    required: false },
          { name: StageName.LINTER,     required: false },
          { name: StageName.DEPLOY,     required: false },
        ];

      // Emergency patch: plan + security gate + deploy (skip generic checkov)
      case BranchType.HOTFIX_EMERGENCY:
      case BranchType.HOTFIX:
        return [
          { name: StageName.PLAN,       required: false },
          { name: StageName.CHECKOV_TF, required: false },
          { name: StageName.LINTER,     required: false },
          { name: StageName.DEPLOY,     required: false },
        ];

      // CI-only: plan preview + security scan, no deploy
      case BranchType.FEATURE:
      case BranchType.PULL_REQUEST:
      default:
        return [
          { name: StageName.PLAN,       required: false },
          { name: StageName.CHECKOV_TF, required: false },
          { name: StageName.CHECKOV,    required: false },
          { name: StageName.LINTER,     required: false },
        ];
    }
  }
}
