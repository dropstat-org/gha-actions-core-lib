import * as core from '@actions/core';
import { validateDeployForBranch } from '../utils/AccountValidator';
import { BranchType } from '../enums/BranchType';
import { Environment } from '../enums/Environment';
import { ErrorCode } from '../enums/ErrorCode';

jest.mock('@actions/core', () => ({ info: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe('validateDeployForBranch — valid combinations', () => {
  it('develop → dev passes', () => {
    expect(() => validateDeployForBranch(Environment.DEV, BranchType.DEVELOP)).not.toThrow();
  });

  it('release → qa passes', () => {
    expect(() => validateDeployForBranch(Environment.QA, BranchType.RELEASE)).not.toThrow();
  });

  it('release → staging passes', () => {
    expect(() => validateDeployForBranch(Environment.STAGING, BranchType.RELEASE)).not.toThrow();
  });

  it('master → prod passes', () => {
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.MASTER)).not.toThrow();
  });

  it('feature branch has no restriction — any env passes', () => {
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.FEATURE)).not.toThrow();
    expect(() => validateDeployForBranch(Environment.DEV,  BranchType.FEATURE)).not.toThrow();
  });

  it('pull_request has no restriction — any env passes', () => {
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.PULL_REQUEST)).not.toThrow();
  });

  it('hotfix has no restriction — any env passes', () => {
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.HOTFIX)).not.toThrow();
  });

  it('hotfix_emergency has no restriction — any env passes', () => {
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.HOTFIX_EMERGENCY)).not.toThrow();
  });
});

describe('validateDeployForBranch — invalid combinations', () => {
  it('develop → prod throws ACCOUNT_BRANCH_MISMATCH', () => {
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.DEVELOP))
      .toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('develop → staging throws ACCOUNT_BRANCH_MISMATCH', () => {
    expect(() => validateDeployForBranch(Environment.STAGING, BranchType.DEVELOP))
      .toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('develop → qa throws ACCOUNT_BRANCH_MISMATCH', () => {
    expect(() => validateDeployForBranch(Environment.QA, BranchType.DEVELOP))
      .toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('master → dev throws ACCOUNT_BRANCH_MISMATCH', () => {
    expect(() => validateDeployForBranch(Environment.DEV, BranchType.MASTER))
      .toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('master → staging throws ACCOUNT_BRANCH_MISMATCH', () => {
    expect(() => validateDeployForBranch(Environment.STAGING, BranchType.MASTER))
      .toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('master → qa throws ACCOUNT_BRANCH_MISMATCH', () => {
    expect(() => validateDeployForBranch(Environment.QA, BranchType.MASTER))
      .toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('release → prod throws ACCOUNT_BRANCH_MISMATCH', () => {
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.RELEASE))
      .toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('release → dev throws ACCOUNT_BRANCH_MISMATCH', () => {
    expect(() => validateDeployForBranch(Environment.DEV, BranchType.RELEASE))
      .toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('error message includes branch and environment names', () => {
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.DEVELOP))
      .toThrow(/develop/);
    expect(() => validateDeployForBranch(Environment.PROD, BranchType.DEVELOP))
      .toThrow(/prod/);
  });
});

describe('validateDeployForBranch — accounts logging', () => {
  it('logs account IDs when validation passes and accounts provided', () => {
    validateDeployForBranch(Environment.DEV, BranchType.DEVELOP, ['123456789012', '987654321098']);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('123456789012'));
  });

  it('does not log when no accounts provided', () => {
    validateDeployForBranch(Environment.DEV, BranchType.DEVELOP);
    expect(core.info).not.toHaveBeenCalled();
  });

  it('does not log for unrestricted branch types even with accounts', () => {
    validateDeployForBranch(Environment.PROD, BranchType.FEATURE, ['123456789012']);
    expect(core.info).not.toHaveBeenCalled();
  });
});
