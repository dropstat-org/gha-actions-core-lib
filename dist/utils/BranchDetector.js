"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchUtils = void 0;
exports.detectBranchType = detectBranchType;
const BranchType_1 = require("../enums/BranchType");
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
function detectBranchType() {
    const eventName = process.env.GITHUB_EVENT_NAME ?? '';
    const ref = process.env.GITHUB_REF ?? '';
    const strategy = process.env.BRANCHING_STRATEGY ?? 'gitflow';
    if (eventName === 'pull_request')
        return BranchType_1.BranchType.PULL_REQUEST;
    const branch = ref.replace('refs/heads/', '');
    if (branch === 'master' || branch === 'main')
        return BranchType_1.BranchType.MASTER;
    if (strategy === 'trunk')
        return BranchType_1.BranchType.FEATURE;
    if (branch === 'develop')
        return BranchType_1.BranchType.DEVELOP;
    if (branch.startsWith('release/'))
        return BranchType_1.BranchType.RELEASE;
    if (branch.startsWith('hotfix/emergency/'))
        return BranchType_1.BranchType.HOTFIX_EMERGENCY;
    if (branch.startsWith('hotfix/'))
        return BranchType_1.BranchType.HOTFIX;
    return BranchType_1.BranchType.FEATURE;
}
/**
 * Static utility — mirrors Groovy's Git.branchType() pattern.
 * Use BranchUtils.detect() inside workflow classes instead of reading
 * env vars directly, so the detection logic stays in one place.
 */
class BranchUtils {
    /** Detects the current branch type from GitHub Actions env vars. */
    static detect() {
        return detectBranchType();
    }
    /** Raw branch name extracted from GITHUB_REF (strips refs/heads/). */
    static name() {
        return (process.env.GITHUB_REF ?? '').replace('refs/heads/', '');
    }
    /**
     * True for branches where a deploy stage is allowed.
     * master → prod, develop → dev, release → staging/qa, hotfix → any.
     */
    static isDeployable(bt) {
        return [
            BranchType_1.BranchType.MASTER,
            BranchType_1.BranchType.DEVELOP,
            BranchType_1.BranchType.RELEASE,
            BranchType_1.BranchType.HOTFIX,
            BranchType_1.BranchType.HOTFIX_EMERGENCY,
        ].includes(bt);
    }
    /** True only for master/main — the branch that cuts release tags. */
    static isMainline(bt) {
        return bt === BranchType_1.BranchType.MASTER;
    }
    /**
     * True for branches where new artifacts are built/compiled.
     * In gitflow: feature and hotfix.  In trunk: feature only.
     */
    static isBuildBranch(bt) {
        return bt === BranchType_1.BranchType.FEATURE || bt === BranchType_1.BranchType.HOTFIX || bt === BranchType_1.BranchType.HOTFIX_EMERGENCY;
    }
    /** True when running in a pull-request context (review gate, no deploy). */
    static isPR(bt) {
        return bt === BranchType_1.BranchType.PULL_REQUEST;
    }
}
exports.BranchUtils = BranchUtils;
//# sourceMappingURL=BranchDetector.js.map