import { Workflow } from './Workflow';
import { StageSlot } from './StageSlot';
import { BranchType } from '../enums/BranchType';

export class GenericWorkflow extends Workflow {
  stagesConfig(_branchType: BranchType): StageSlot[] {
    return [];
  }

  checkStages(): void {
    // Generic ActionsCoreLib imposes no stage restrictions
  }
}
