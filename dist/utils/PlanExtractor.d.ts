import { Metadata } from '../entities/Metadata';
export interface PlanFlags {
    runAll: boolean;
    workingDir: string | null;
}
export interface ExtractedPlan {
    cmdIndex: number;
    accountName: string;
    filePath: string;
}
/**
 * Ports the plan-extraction logic from Groovy PreDeployStage.
 *
 * Covers three command shapes:
 *   terragrunt plan
 *   terragrunt run-all plan
 *   terragrunt plan --terragrunt-working-dir <dir>
 *   terragrunt run-all plan --terragrunt-working-dir <dir>
 */
export declare class PlanExtractor {
    private readonly projectId;
    private readonly serviceId;
    private readonly versionTag;
    constructor(metadata: Pick<Metadata, 'projectId' | 'serviceId' | 'version' | 'commitHash'>);
    /** True when the command should produce a plan file (contains the word "plan"). */
    static isPlanCommand(cmd: string): boolean;
    /**
     * Extracts the flags that change how terragrunt plan is invoked.
     * Mirrors: Utils.isSpecified("run-all") / Utils.getParm("--terragrunt-working-dir")
     */
    static parseFlags(cmd: string): PlanFlags;
    /**
     * Raw binary name produced by `plan --out`.
     * e.g. tfplan1-myproject-myservice-1.0.0-abc1234.binary
     */
    rawBinaryName(cmdIndex: number): string;
    /**
     * Raw JSONL name produced by `show -json` (one JSON object per line = one module).
     * e.g. tfplan1-myproject-myservice-1.0.0-abc1234.json
     */
    rawJsonName(cmdIndex: number): string;
    /**
     * Per-account file name written after parsing the JSONL.
     * e.g. tfplan1-my-account.json
     */
    static perAccountName(cmdIndex: number, accountName: string): string;
    /**
     * Returns the two shell commands that replace the original plan invocation:
     *   1. original plan command  + --out <binary>
     *   2. terragrunt [run-all] show -json <binary> [--terragrunt-working-dir <dir>]  > <json>
     *
     * Mirrors lines 54-55 in PreDeployStage.groovy.
     */
    buildRunCommands(cmd: string, cmdIndex: number): [string, string];
    /**
     * Command to collect module groups used for multi-module account resolution.
     * Mirrors line 59 in PreDeployStage.groovy.
     */
    buildModuleGroupsCommand(cmd: string): string;
    /**
     * Reads the raw JSONL plan file and writes one per-account JSON for each line.
     * Returns the list of file paths created.
     *
     * Account name resolution order (mirrors TerragruntUtils.getVarEnvIdFromPlan):
     *   1. planJson.variables.env_id.value
     *   2. fallbackAccount
     */
    extractPerAccountPlans(cmdIndex: number, fallbackAccount: string): ExtractedPlan[];
    /**
     * Reads env_id from plan variables, falls back to the provided string.
     * Mirrors: planJson?.variables?.env_id?.value ?: backAccount
     */
    static resolveAccountName(planJson: Record<string, unknown>, fallback: string): string;
    /**
     * From a flat list of tfplan*.json paths, removes the raw JSONL parent files
     * that follow the naming convention tfplan{n}-{projectId}-{serviceId}-*.json.
     *
     * The Groovy version uses a TODO comment to delete these; here we exclude them
     * explicitly so checkov only receives single-object plan files.
     */
    filterPerAccountPlans(files: string[]): string[];
}
//# sourceMappingURL=PlanExtractor.d.ts.map