export type ChangeAction = 'create' | 'update' | 'delete' | 'replace' | 'no-op';
export interface ResourceChange {
    address: string;
    type: string;
    action: ChangeAction;
}
export interface PlanSummaryResult {
    account: string;
    toCreate: ResourceChange[];
    toUpdate: ResourceChange[];
    toDelete: ResourceChange[];
    toReplace: ResourceChange[];
    noOp: ResourceChange[];
}
/**
 * Parses the per-account terraform plan JSON produced by PlanStage
 * and emits a human-readable summary of resource changes.
 *
 * Quick usage:
 *   const result = PlanSummary.fromFile('tfplan1-acct-d-01.json');
 *   console.log(PlanSummary.toMarkdown(result));
 *
 * Wired into PlanStage — writes automatically to GitHub Job Summary after every plan run.
 * Also callable from any custom stage:
 *   const files = await StageTransfer.findFiles(PlanGlobs.JSON);
 *   await PlanSummary.writeSummaryForPlans(files);
 */
export declare class PlanSummary {
    /**
     * Parse a single per-account plan JSON file from disk.
     * The file must contain a full terraform plan JSON object (not JSONL).
     * Account name is inferred from the filename: tfplan{n}-{account}.json
     */
    static fromFile(filePath: string): PlanSummaryResult;
    /**
     * Parse from an already-loaded plan JSON object.
     * Reads `resource_changes[].change.actions` to classify each resource.
     */
    static fromJson(planJson: Record<string, unknown>, account?: string): PlanSummaryResult;
    /**
     * Renders the summary as markdown for GitHub Job Summary.
     * Includes a count table and per-action resource lists.
     */
    static toMarkdown(r: PlanSummaryResult): string;
    /**
     * Logs a one-line inline summary to the GitHub Actions log.
     * Useful for quick feedback without writing to the Job Summary.
     *
     * Output: +2 ~1 -0 ±1  (create/update/delete/replace)
     */
    static logInline(r: PlanSummaryResult): void;
    /**
     * Parses all per-account plan JSON files and writes a combined markdown
     * report to the GitHub Actions Job Summary.
     *
     * Called automatically by PlanStage. Also available for custom stages:
     *   const files = await StageTransfer.findFiles(PlanGlobs.JSON);
     *   await PlanSummary.writeSummaryForPlans(files);
     */
    static writeSummaryForPlans(planFiles: string[]): Promise<void>;
}
//# sourceMappingURL=PlanSummary.d.ts.map