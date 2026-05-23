import { AbstractStage } from '../stages/base/AbstractStage';
import { ActionYaml } from '../entities/ActionYaml';
import { BranchType } from '../enums/BranchType';
export declare class StageRegistry {
    static create(stageName: string, config: ActionYaml, branchType?: BranchType): AbstractStage;
}
//# sourceMappingURL=StageRegistry.d.ts.map