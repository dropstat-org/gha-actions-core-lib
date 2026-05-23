import * as exec from '@actions/exec';
import { TerragruntGitInfo } from '../utils/TerragruntGitInfo';

jest.mock('@actions/core', () => ({
  info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

jest.mock('@actions/exec', () => ({ exec: jest.fn() }));

const mockExec = exec.exec as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ── validateBranchMatch ───────────────────────────────────────────────────────

describe('TerragruntGitInfo.validateBranchMatch', () => {
  it('returns true when gitBranch contains deployBranch', () => {
    expect(TerragruntGitInfo.validateBranchMatch('develop', 'develop')).toBe(true);
  });

  it('returns false for a branch with slash even when it contains deployBranch', () => {
    // 'feature/develop-sync' contains 'develop' but has a slash → mismatch
    expect(TerragruntGitInfo.validateBranchMatch('feature/develop-sync', 'develop')).toBe(false);
  });

  it('returns true when on a semver tag regardless of deployBranch', () => {
    expect(TerragruntGitInfo.validateBranchMatch('v1.2.3', 'master')).toBe(true);
    expect(TerragruntGitInfo.validateBranchMatch('1.0.0', 'develop')).toBe(true);
  });

  it('returns false when gitBranch does not contain deployBranch and is not a tag', () => {
    expect(TerragruntGitInfo.validateBranchMatch('master', 'develop')).toBe(false);
  });

  it('returns false when gitBranch contains a slash', () => {
    // slash → detached or remote ref — always mismatch per Groovy rule
    expect(TerragruntGitInfo.validateBranchMatch('origin/develop', 'develop')).toBe(false);
    expect(TerragruntGitInfo.validateBranchMatch('refs/heads/master', 'master')).toBe(false);
  });

  it('returns true when gitBranch is "No disponible" (upstream already warned)', () => {
    expect(TerragruntGitInfo.validateBranchMatch('No disponible', 'develop')).toBe(true);
  });

  it('logs a warning on mismatch', () => {
    const core = require('@actions/core');
    TerragruntGitInfo.validateBranchMatch('master', 'develop');
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Infra branch mismatch'));
  });

  it('does not log a warning on match', () => {
    const core = require('@actions/core');
    TerragruntGitInfo.validateBranchMatch('develop', 'develop');
    expect(core.warning).not.toHaveBeenCalled();
  });
});

// ── getModuleGroups ───────────────────────────────────────────────────────────

describe('TerragruntGitInfo.getModuleGroups', () => {
  it('returns parsed JSON from stdout', async () => {
    const payload = { group1: [['path/a', 'path/b']] };
    mockExec.mockImplementationOnce((_bin: string, _args: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from(JSON.stringify(payload)));
      return Promise.resolve(0);
    });

    const result = await TerragruntGitInfo.getModuleGroups();
    expect(result).toEqual(payload);
  });

  it('returns {} when command produces no output', async () => {
    mockExec.mockResolvedValueOnce(1);
    const result = await TerragruntGitInfo.getModuleGroups();
    expect(result).toEqual({});
  });

  it('returns {} and warns on invalid JSON', async () => {
    const core = require('@actions/core');
    mockExec.mockImplementationOnce((_bin: string, _args: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from('not-json'));
      return Promise.resolve(0);
    });

    const result = await TerragruntGitInfo.getModuleGroups();
    expect(result).toEqual({});
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('could not parse'));
  });
});

// ── get ───────────────────────────────────────────────────────────────────────

describe('TerragruntGitInfo.get', () => {
  it('returns fallback info when terragrunt-info fails', async () => {
    mockExec.mockRejectedValueOnce(new Error('not found'));
    const info = await TerragruntGitInfo.get('/nonexistent');
    expect(info.gitBranch).toBe('No disponible');
    expect(info.workingDir).toBe('No disponible');
  });

  it('populates all fields when commands succeed', async () => {
    // Call 1: terragrunt terragrunt-info → WorkingDir
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from(JSON.stringify({ WorkingDir: '/tmp/module' })));
      return Promise.resolve(0);
    });
    // Call 2: git config --get remote.origin.url
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from('git@github.com:org/repo.git\n'));
      return Promise.resolve(0);
    });
    // Call 3: git rev-parse --abbrev-ref HEAD
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from('develop\n'));
      return Promise.resolve(0);
    });
    // Call 4: git rev-parse HEAD
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from('abc1234\n'));
      return Promise.resolve(0);
    });

    const info = await TerragruntGitInfo.get('/some/module');
    expect(info.workingDir).toBe('/tmp/module');
    expect(info.gitUrl).toBe('git@github.com:org/repo.git');
    expect(info.gitBranch).toBe('develop');
    expect(info.gitCommitHash).toBe('abc1234');
  });

  it('uses git describe when HEAD is detached', async () => {
    // terragrunt-info
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from(JSON.stringify({ WorkingDir: '/tmp/module' })));
      return Promise.resolve(0);
    });
    // git config remote.origin.url
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from('git@github.com:org/repo.git\n'));
      return Promise.resolve(0);
    });
    // git rev-parse --abbrev-ref HEAD → HEAD (detached)
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from('HEAD\n'));
      return Promise.resolve(0);
    });
    // git describe --tags
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from('v2.1.0\n'));
      return Promise.resolve(0);
    });
    // git rev-parse HEAD
    mockExec.mockImplementationOnce((_b: string, _a: string[], opts: exec.ExecOptions) => {
      opts.listeners?.stdout?.(Buffer.from('deadbeef\n'));
      return Promise.resolve(0);
    });

    const info = await TerragruntGitInfo.get('/some/module');
    expect(info.gitBranch).toBe('v2.1.0');
  });
});
