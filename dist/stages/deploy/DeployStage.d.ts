import { AbstractDeployStage } from './AbstractDeployStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class DeployStage extends AbstractDeployStage {
    private validateTerraformDeploy;
    private showPlanSummary;
    run(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=DeployStage.d.ts.map