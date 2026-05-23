import { BranchType } from '../enums/BranchType';
/**
 * Detects the logical branch type from GitHub Actions environment variables.
 *
 * Supports two branching strategies (set via BRANCHING_STRATEGY env var):
 *   - "gitflow"  (default): master, develop, release/*, hotfix/*, feature/*
 *   - "trunk":              main/master, feature/* only — no develop/release/hotfix
 *
 * Hotfix emergency mode activates when the branch matches "hotfix/emergency/*".
 * It allows platform-configured stages to be skipped for authorized repos.
 */
export declare function detectBranchType(): BranchType;
/**
 * Static utility — mirrors Groovy's Git.branchType() pattern.
 * Use BranchUtils.detect() inside workflow classes instead of reading
 * env vars directly, so the detection logic stays in one place.
 */
export declare class BranchUtils {
    /** Detects the current branch type from GitHub Actions env vars. */
    static detect(): BranchType;
    /** Raw branch name extracted from GITHUB_REF (strips refs/heads/). */
    static name(): string;
    /**
     * True for branches where a deploy stage is allowed.
     * master → prod, develop → dev, release → staging/qa, hotfix → any.
     */
    static isDeployable(bt: BranchType): boolean;
    /** True only for master/main — the branch that cuts release tags. */
    static isMainline(bt: BranchType): boolean;
    /**
     * True for branches where new artifacts are built/compiled.
     * In gitflow: feature and hotfix.  In trunk: feature only.
     */
    static isBuildBranch(bt: BranchType): boolean;
    /** True when running in a pull-request context (review gate, no deploy). */
    static isPR(bt: BranchType): boolean;
}
//# sourceMappingURL=BranchDetector.d.ts.map