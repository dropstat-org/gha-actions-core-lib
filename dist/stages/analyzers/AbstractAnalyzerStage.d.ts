import { AbstractStage } from '../base/AbstractStage';
import { StageConfig } from '../../entities/StageConfig';
export type AnalyzerResult = 'success' | 'warning' | 'failure';
export interface ResultMap {
    [exitCode: number]: AnalyzerResult;
}
export declare abstract class AbstractAnalyzerStage extends AbstractStage {
    protected abstract resultMap(): ResultMap;
    protected mapResult(exitCode: number): AnalyzerResult;
    protected handleResult(result: AnalyzerResult, stageName: string, softFail: boolean): void;
    abstract run(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=AbstractAnalyzerStage.d.ts.map