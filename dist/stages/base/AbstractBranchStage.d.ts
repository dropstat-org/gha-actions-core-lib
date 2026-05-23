import { AbstractStage } from './AbstractStage';
import { ActionYaml } from '../../entities/ActionYaml';
import { StageConfig } from '../../entities/StageConfig';
import { BranchType } from '../../enums/BranchType';
import { Environment } from '../../enums/Environment';
export declare abstract class AbstractBranchStage extends AbstractStage {
    protected branchType: BranchType;
    protected environment: Environment;
    constructor(config: ActionYaml, branchType: BranchType);
    private resolveEnvironment;
    run(stage: StageConfig): Promise<void>;
    protected onMaster(stage: StageConfig): Promise<void>;
    protected onDevelop(stage: StageConfig): Promise<void>;
    protected onRelease(stage: StageConfig): Promise<void>;
    protected onFeature(stage: StageConfig): Promise<void>;
    protected onHotfix(stage: StageConfig): Promise<void>;
    protected onPullRequest(stage: StageConfig): Promise<void>;
    protected abstract onDefault(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=AbstractBranchStage.d.ts.map