import { Workflow } from './Workflow';
import { StageSlot } from './StageSlot';
import { StageName } from '../enums/StageName';
import { BranchType } from '../enums/BranchType';

export class LibraryWorkflow extends Workflow {
  stagesConfig(branchType: BranchType): StageSlot[] {
    const releaseRequired =
      branchType === BranchType.MASTER || branchType === BranchType.DEVELOP;

    return [
      { name: StageName.COMPILE,   required: false },
      { name: StageName.UNIT_TEST, required: false },
      { name: StageName.LINTER,    required: false },
      { name: StageName.SEMGREP,   required: false },
      { name: StageName.SONARQUBE, required: false },
      { name: StageName.RELEASE,   required: releaseRequired },
    ];
  }
}
