/**
 * Security checks for Terraform plan JSON artifacts.
 *
 * Why: plan JSON files are uploaded as GitHub Actions artifacts and are readable
 * by anyone with repository read access. Variables not marked sensitive=true
 * in Terraform will appear as plain text in the plan JSON.
 *
 * Usage: called automatically by PlanStage before uploading the artifact.
 */
export declare class PlanSecurity {
    /**
     * Scans the plan JSON variables section for names that match common secret
     * patterns. Warns when a variable looks sensitive but its value is plain text
     * (i.e., not masked by Terraform's sensitive=true mechanism).
     *
     * Does NOT fail the build — it's a loud reminder, not a gate.
     */
    static warnIfSensitiveVariables(filePath: string): void;
    /**
     * Logs a reminder that plan JSON artifacts are readable by anyone with
     * repository read access. Called once per plan stage run.
     */
    static warnArtifactVisibility(): void;
}
//# sourceMappingURL=PlanSecurity.d.ts.map