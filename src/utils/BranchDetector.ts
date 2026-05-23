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
export function detectBranchType(): BranchType {
  const eventName = process.env.GITHUB_EVENT_NAME ?? '';
  const ref       = process.env.GITHUB_REF        ?? '';
  const strategy  = process.env.BRANCHING_STRATEGY ?? 'gitflow';

  if (eventName === 'pull_request') return BranchType.PULL_REQUEST;

  const branch = ref.replace('refs/heads/', '');

  if (branch === 'master' || branch === 'main') return BranchType.MASTER;

  if (strategy === 'trunk') return BranchType.FEATURE;

  if (branch === 'develop')                    return BranchType.DEVELOP;
  if (branch.startsWith('release/'))           return BranchType.RELEASE;
  if (branch.startsWith('hotfix/emergency/')) return BranchType.HOTFIX_EMERGENCY;
  if (branch.startsWith('hotfix/'))            return BranchType.HOTFIX;

  return BranchType.FEATURE;
}

/**
 * Static utility — mirrors Groovy's Git.branchType() pattern.
 * Use BranchUtils.detect() inside workflow classes instead of reading
 * env vars directly, so the detection logic stays in one place.
 */
export class BranchUtils {
  /** Detects the current branch type from GitHub Actions env vars. */
  static detect(): BranchType {
    return detectBranchType();
  }

  /** Raw branch name extracted from GITHUB_REF (strips refs/heads/). */
  static name(): string {
    return (process.env.GITHUB_REF ?? '').replace('refs/heads/', '');
  }

  /**
   * True for branches where a deploy stage is allowed.
   * master → prod, develop → dev, release → staging/qa, hotfix → any.
   */
  static isDeployable(bt: BranchType): boolean {
    return [
      BranchType.MASTER,
      BranchType.DEVELOP,
      BranchType.RELEASE,
      BranchType.HOTFIX,
      BranchType.HOTFIX_EMERGENCY,
    ].includes(bt);
  }

  /** True only for master/main — the branch that cuts release tags. */
  static isMainline(bt: BranchType): boolean {
    return bt === BranchType.MASTER;
  }

  /**
   * True for branches where new artifacts are built/compiled.
   * In gitflow: feature and hotfix.  In trunk: feature only.
   */
  static isBuildBranch(bt: BranchType): boolean {
    return bt === BranchType.FEATURE || bt === BranchType.HOTFIX || bt === BranchType.HOTFIX_EMERGENCY;
  }

  /** True when running in a pull-request context (review gate, no deploy). */
  static isPR(bt: BranchType): boolean {
    return bt === BranchType.PULL_REQUEST;
  }
}
