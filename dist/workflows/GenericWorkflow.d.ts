import { Workflow } from './Workflow';
import { StageSlot } from './StageSlot';
import { BranchType } from '../enums/BranchType';
export declare class GenericWorkflow extends Workflow {
    stagesConfig(_branchType: BranchType): StageSlot[];
    checkStages(): void;
}
//# sourceMappingURL=GenericWorkflow.d.ts.map