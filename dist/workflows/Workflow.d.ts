import { StageSlot } from './StageSlot';
import { StageConfig } from '../entities/StageConfig';
import { BranchType } from '../enums/BranchType';
import { StageName } from '../enums/StageName';
export declare abstract class Workflow {
    abstract stagesConfig(branchType: BranchType): StageSlot[];
    checkStages(stages: StageConfig[], branchType: BranchType): void;
    protected checkOrder(present: StageName[], slots: StageSlot[]): void;
}
//# sourceMappingURL=Workflow.d.ts.map