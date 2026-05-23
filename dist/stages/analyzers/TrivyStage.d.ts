import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class TrivyStage extends AbstractAnalyzerStage {
    protected resultMap(): ResultMap;
    _effectiveTools(_stage: StageConfig): undefined;
    private install;
    /**
     * Resolves the ECR image ref from the publish stage config + resolved commitHash.
     * Used on PR / develop / release / master where the image was already pushed to ECR
     * by the feature branch build — no local docker build needed.
     *
     * AWS_ACCOUNT_ID is optional: falls back to aws sts get-caller-identity when
     * only IAM credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are provided.
     */
    private resolveECRImageRef;
    run(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=TrivyStage.d.ts.map