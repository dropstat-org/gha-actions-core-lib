import { detectBranchType } from '../utils/BranchDetector';
import { BranchType } from '../enums/BranchType';

function withEnv(vars: Record<string, string>, fn: () => void) {
  const originals: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    originals[k] = process.env[k];
    process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(originals)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe('detectBranchType', () => {
  it('returns PULL_REQUEST for pull_request event', () => {
    withEnv({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_REF: 'refs/pull/1/merge' }, () => {
      expect(detectBranchType()).toBe(BranchType.PULL_REQUEST);
    });
  });

  it('returns MASTER for refs/heads/master', () => {
    withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master' }, () => {
      expect(detectBranchType()).toBe(BranchType.MASTER);
    });
  });

  it('returns MASTER for refs/heads/main', () => {
    withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main' }, () => {
      expect(detectBranchType()).toBe(BranchType.MASTER);
    });
  });

  it('returns DEVELOP for refs/heads/develop', () => {
    withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/develop' }, () => {
      expect(detectBranchType()).toBe(BranchType.DEVELOP);
    });
  });

  it('returns HOTFIX for hotfix/* branch', () => {
    withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/hotfix/issue-123' }, () => {
      expect(detectBranchType()).toBe(BranchType.HOTFIX);
    });
  });

  it('returns FEATURE for feature/* branch', () => {
    withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/feature/my-feature' }, () => {
      expect(detectBranchType()).toBe(BranchType.FEATURE);
    });
  });

  it('returns FEATURE for unknown branch', () => {
    withEnv({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/some-random-branch' }, () => {
      expect(detectBranchType()).toBe(BranchType.FEATURE);
    });
  });
});
