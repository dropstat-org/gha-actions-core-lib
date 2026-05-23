import { AbstractBranchStage } from '../base/AbstractBranchStage';
import { StageConfig } from '../../entities/StageConfig';
import { Environment } from '../../enums/Environment';
export declare abstract class AbstractDeployStage extends AbstractBranchStage {
    protected resolveDeployEnvironment(stage: StageConfig): Environment;
    protected setDeployEnvVars(env: Environment): void;
    protected onDefault(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=AbstractDeployStage.d.ts.map