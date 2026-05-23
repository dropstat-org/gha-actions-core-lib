import * as core from '@actions/core';
import { BranchType } from '../enums/BranchType';
import { Environment } from '../enums/Environment';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

// Allowed deploy environments per branch type.
// RELEASE accepts both QA and STAGING to support different naming conventions.
const BRANCH_ALLOWED_ENVS: Partial<Record<BranchType, Environment[]>> = {
  [BranchType.DEVELOP]: [Environment.DEV],
  [BranchType.RELEASE]: [Environment.QA, Environment.STAGING],
  [BranchType.MASTER]:  [Environment.PROD],
};

export function validateDeployForBranch(
  deployEnv: string,
  branchType: BranchType,
  accounts?: string[],
): void {
  const allowed = BRANCH_ALLOWED_ENVS[branchType];
  if (!allowed) return; // feature / PR / hotfix — no env restriction on plan-only branches

  if (!allowed.includes(deployEnv as Environment)) {
    throw new ActionsCoreLibError(
      ErrorCode.ACCOUNT_BRANCH_MISMATCH,
      `Branch '${branchType}' can only target [${allowed.join(', ')}] ` +
      `but stage declares environment '${deployEnv}'. ` +
      `Deploying to the wrong environment from this branch is not allowed.`,
    );
  }

  if (accounts && accounts.length > 0) {
    core.info(`Account validation passed — target accounts for '${deployEnv}': ${accounts.join(', ')}`);
  }
}
