import { AbstractBranchStage } from '../base/AbstractBranchStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class PlanStage extends AbstractBranchStage {
    private validateCommands;
    protected onDefault(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=PlanStage.d.ts.map