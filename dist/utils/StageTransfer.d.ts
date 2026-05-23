/**
 * Artifact names used when passing terraform plan files between stages.
 * Mirrors the Groovy Cache keys: "analysis-source" and "terragrunt-plan".
 */
export declare const PlanArtifacts: {
    readonly JSON: "analysis-source";
    readonly BINARY: "terragrunt-plan";
};
/**
 * Glob patterns that match the plan file naming convention:
 *   tfplan{index}-{accountName}.json / tfplan{index}-...{hash}.binary
 */
export declare const PlanGlobs: {
    readonly JSON: "**/tfplan*-*.json";
    readonly BINARY: "**/tfplan*.binary";
};
/**
 * Equivalent of the Groovy Cache utility — saves and restores files
 * between pipeline stages using GitHub Actions artifacts.
 *
 * Usage in a plan stage:
 *   await StageTransfer.saveByGlob(PlanArtifacts.JSON, PlanGlobs.JSON);
 *
 * Usage in a checkov stage:
 *   await StageTransfer.restoreByName(PlanArtifacts.JSON);
 *   const plans = await StageTransfer.findFiles(PlanGlobs.JSON);
 */
export declare class StageTransfer {
    /**
     * Finds all files matching `pattern` and uploads them as a named artifact.
     * Equivalent to Groovy: Cache.saveByInclude(name, tfplanListForCache)
     */
    static saveByGlob(name: string, pattern: string, retentionDays?: number): Promise<void>;
    /**
     * Uploads an explicit list of file paths as a named artifact.
     * Equivalent to Groovy: Cache.saveByInclude(name, paths.join(','))
     */
    static saveByPaths(name: string, files: string[], retentionDays?: number): Promise<void>;
    /**
     * Downloads a named artifact into the workspace.
     * Equivalent to Groovy: Cache.restoreByName(name)
     */
    static restoreByName(name: string, destPath?: string): Promise<void>;
    /**
     * Returns the list of files matching a glob pattern.
     * Equivalent to Groovy: jenkins.findFiles(glob: pattern)
     */
    static findFiles(pattern: string): Promise<string[]>;
}
//# sourceMappingURL=StageTransfer.d.ts.map