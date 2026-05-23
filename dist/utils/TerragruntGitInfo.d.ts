export interface ModuleGitInfo {
    workingDir: string;
    gitUrl: string;
    gitBranch: string;
    gitCommitHash: string;
}
/**
 * Ports TerragruntUtils.getTerragruntGitInfo + getTerragruntGitInfo + valAccountsByBranch
 * from the Groovy pipeline library.
 *
 * Usage:
 *   const info = await TerragruntGitInfo.get('./envs/dev/my-module');
 *   TerragruntGitInfo.validateBranchMatch(info.gitBranch, 'develop');
 */
export declare class TerragruntGitInfo {
    /**
     * Runs `terragrunt terragrunt-info` inside moduleDir and returns the WorkingDir
     * field (the resolved terraform working directory for that module).
     */
    static getWorkingDir(moduleDir: string): Promise<string>;
    /**
     * Full port of TerragruntUtils.getTerragruntGitInfo.
     * Runs terragrunt-info in moduleDir to get the WorkingDir, then extracts
     * git url, branch and commit hash from that directory.
     *
     * Returns "No disponible" strings for each field if the directory doesn't exist,
     * mirroring the Groovy fallback behavior.
     */
    static get(moduleDir: string): Promise<ModuleGitInfo>;
    /**
     * Validates that the infra module's branch matches the expected deploy branch.
     * Mirrors the Groovy check:
     *   if ((!branchInfra.contains(branchType) && !Utils.isTagFormatValid(branchInfra)) || branchInfra.contains("/"))
     *
     * Logs a warning on mismatch — never throws (same as Groovy behavior).
     * Returns true when valid, false on mismatch.
     *
     * @param gitBranch   - branch name returned by get()
     * @param deployBranch - expected branch string, e.g. 'develop', 'master', 'release'
     */
    static validateBranchMatch(gitBranch: string, deployBranch: string): boolean;
    /**
     * Runs `terragrunt output-module-groups` and returns the parsed JSON.
     * Result shape: { groupName: [[absolutePath, ...], ...] }
     * Returns {} silently when the command fails (mirrors the Groovy try/catch).
     *
     * @param workingDir - optional directory to run the command in
     */
    static getModuleGroups(workingDir?: string): Promise<Record<string, string[][]>>;
}
//# sourceMappingURL=TerragruntGitInfo.d.ts.map