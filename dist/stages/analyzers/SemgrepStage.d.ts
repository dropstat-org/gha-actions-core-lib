import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class SemgrepStage extends AbstractAnalyzerStage {
    protected resultMap(): ResultMap;
    _effectiveTools(_stage: StageConfig): undefined;
    private install;
    run(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=SemgrepStage.d.ts.map