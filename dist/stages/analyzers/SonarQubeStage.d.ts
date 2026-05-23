import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class SonarQubeStage extends AbstractAnalyzerStage {
    protected resultMap(): ResultMap;
    private install;
    run(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=SonarQubeStage.d.ts.map