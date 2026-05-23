import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
/**
 * Full port of CheckovTfStage.groovy — runs checkov against every per-account
 * terraform plan file produced by PlanStage.
 *
 * Differences from CheckovStage:
 * - Always uses framework=terraform_plan
 * - Iterates over all tfplan*-{account}.json files (one per account)
 * - Aggregates per-account results into a single step outcome
 * - Optionally loads plan files from the analysis-source artifact if not present
 *
 * Config knobs (stage.checkov in action.yaml):
 *   skipChecks        — list of check IDs to skip
 *   softFail          — true → always warn instead of fail (overrides platform policy)
 *   softFailPattern   — regex against projectId/serviceId; match → soft-fail
 *   externalChecksDir — path to a custom checks directory (clone separately via actions/checkout)
 */
export declare class CheckovTfStage extends AbstractAnalyzerStage {
    protected resultMap(): ResultMap;
    _effectiveTools(_stage: StageConfig): undefined;
    private install;
    /**
     * Resolves soft-fail mode for this run.
     * Priority: stage config > softFailPattern match > platform policy.
     * Mirrors the Groovy productId pattern check (e.g. awseks without deploy-mgnt-cluster).
     */
    private resolveSoftFail;
    private buildArgs;
    /**
     * Reduces all per-account results into a single aggregate.
     * When softFail=true, 'failure' is downgraded to 'warning'.
     * Priority: failure > warning > success.
     */
    private aggregateResults;
    private logPerAccountResults;
    /** Extracts account name from a per-account plan filename: tfplan{n}-{account}.json */
    private resolveAccountName;
    run(stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=CheckovTfStage.d.ts.map