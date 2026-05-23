import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class CheckovStage extends AbstractAnalyzerStage {
    protected resultMap(): ResultMap;
    _effectiveTools(_stage: StageConfig): undefined;
    private install;
    private buildArgs;
    run(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=CheckovStage.d.ts.map