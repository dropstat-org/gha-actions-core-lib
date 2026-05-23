import { AbstractDeployStage } from './AbstractDeployStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class OpaStage extends AbstractDeployStage {
    run(stage: StageConfig): Promise<void>;
    protected onDefault(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=OpaStage.d.ts.map