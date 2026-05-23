import { Workflow } from './Workflow';
import { StageSlot } from './StageSlot';
import { BranchType } from '../enums/BranchType';
export declare class AppWorkflow extends Workflow {
    /**
     * "gitflow" (default) or "trunk" — read from BRANCHING_STRATEGY env var.
     *
     * GitFlow: feature/* → develop → release/* → master, with hotfix/* → master.
     * Trunk:   feature/* → main (short-lived branches, no develop/release/hotfix).
     */
    private readonly strategy;
    constructor();
    stagesConfig(branchType: BranchType): StageSlot[];
    private gitflowStages;
    private trunkStages;
}
//# sourceMappingURL=AppWorkflow.d.ts.map