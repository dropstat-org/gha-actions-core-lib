import * as exec from '@actions/exec';
import * as core from '@actions/core';
import { CheckovTfStage } from '../stages/analyzers/CheckovTfStage';
import { StageTransfer } from '../utils/StageTransfer';
import { ActionYaml } from '../entities/ActionYaml';
import { ActionsType } from '../enums/ActionsType';
import { StageConfig } from '../entities/StageConfig';

jest.mock('@actions/core', () => ({
  info:       jest.fn(),
  warning:    jest.fn(),
  error:      jest.fn(),
  debug:      jest.fn(),
  notice:     jest.fn(),
  setFailed:  jest.fn(),
  startGroup: jest.fn(),
  endGroup:   jest.fn(),
}));

jest.mock('@actions/exec', () => ({ exec: jest.fn().mockResolvedValue(0) }));

jest.mock('../config/PlatformConfigLoader', () => ({
  PlatformConfigLoader: {
    securityPolicy: jest.fn().mockResolvedValue({ checkov: { soft_fail: false, upload_sarif: false } }),
    toolVersions:   jest.fn().mockResolvedValue({ checkov: '3.2.527' }),
  },
}));

jest.mock('../utils/StageTransfer', () => ({
  StageTransfer: {
    restoreByName: jest.fn().mockResolvedValue(undefined),
    findFiles:     jest.fn().mockResolvedValue(['tfplan1-acct-d-01.json', 'tfplan2-acct-d-02.json']),
  },
  PlanArtifacts: { JSON: 'analysis-source', BINARY: 'terragrunt-plan' },
  PlanGlobs:     { JSON: '**/tfplan*-*.json', BINARY: '**/tfplan*.binary' },
}));

jest.mock('../utils/ArtifactHandler', () => ({
  ArtifactHandler: jest.fn().mockImplementation(() => ({
    upload:   jest.fn().mockResolvedValue(undefined),
    download: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../utils/SummaryWriter', () => ({
  SummaryWriter: jest.fn().mockImplementation(() => ({
    write: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(overrides?: { projectId?: string; serviceId?: string }) {
  return new ActionYaml({
    type: ActionsType.TERRAFORM,
    metadata: {
      projectId: overrides?.projectId ?? 'platform',
      serviceId: overrides?.serviceId ?? 'infra',
      version:   '1.0.0',
    },
    stages: [],
  });
}

function makeStageConfig(overrides?: Partial<StageConfig>): StageConfig {
  return { name: 'checkov_tf', ...overrides };
}

function stage(overrides?: { projectId?: string; serviceId?: string }) {
  return new CheckovTfStage(makeConfig(overrides));
}

const mockExec          = exec.exec as jest.Mock;
const mockFindFiles     = StageTransfer.findFiles as jest.Mock;
const mockRestoreByName = StageTransfer.restoreByName as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ── checkov install ───────────────────────────────────────────────────────────

describe('CheckovTfStage — install', () => {
  it('installs checkov via pip before scanning', async () => {
    await stage().execute(makeStageConfig());
    // pip install is called without options (no third arg)
    expect(mockExec).toHaveBeenNthCalledWith(
      1, 'pip', ['install', 'checkov==3.2.527', '--quiet'],
    );
  });
});

// ── artifact restore ──────────────────────────────────────────────────────────

describe('CheckovTfStage — artifact restore', () => {
  it('tries to restore analysis-source artifact', async () => {
    await stage().execute(makeStageConfig());
    expect(mockRestoreByName).toHaveBeenCalledWith('analysis-source');
  });

  it('continues when artifact restore fails', async () => {
    mockRestoreByName.mockRejectedValueOnce(new Error('artifact not found'));
    await expect(stage().execute(makeStageConfig())).resolves.toBeUndefined();
  });
});

// ── no plan files ─────────────────────────────────────────────────────────────

describe('CheckovTfStage — no plan files', () => {
  it('calls setFailed when no plan files are found', async () => {
    mockFindFiles.mockResolvedValueOnce([]);
    await stage().execute(makeStageConfig());
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('no per-account plan files'));
  });
});

// ── per-account scanning ──────────────────────────────────────────────────────

describe('CheckovTfStage — per-account scanning', () => {
  it('runs checkov for each plan file found', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-acct-d-01.json', 'tfplan1-acct-d-02.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip install
      .mockResolvedValueOnce(0)  // checkov acct-d-01
      .mockResolvedValueOnce(0); // checkov acct-d-02

    await stage().execute(makeStageConfig());

    const checkovCalls = mockExec.mock.calls.filter(c => c[0] === 'checkov');
    expect(checkovCalls).toHaveLength(2);
  });

  it('passes -f planFile and --framework terraform_plan to checkov', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-acct-d-01.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip
      .mockResolvedValueOnce(0); // checkov

    await stage().execute(makeStageConfig());

    const [, args] = mockExec.mock.calls.find(c => c[0] === 'checkov')!;
    expect(args).toContain('-f');
    expect(args).toContain('tfplan1-acct-d-01.json');
    expect(args).toContain('--framework');
    expect(args).toContain('terraform_plan');
  });

  it('includes --repo-id in args', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-acct.json']);
    mockExec.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await stage().execute(makeStageConfig());

    const [, args] = mockExec.mock.calls.find(c => c[0] === 'checkov')!;
    expect(args).toContain('--repo-id');
    expect(args).toContain('platform/infra');
  });

  it('passes --skip-check when skipChecks is configured', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-acct.json']);
    mockExec.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await stage().execute(makeStageConfig({ checkov: { skipChecks: ['CKV_AWS_1', 'CKV_AWS_2'] } }));

    const [, args] = mockExec.mock.calls.find(c => c[0] === 'checkov')!;
    expect(args).toContain('--skip-check');
    expect(args).toContain('CKV_AWS_1,CKV_AWS_2');
  });

  it('passes --external-checks-dir when externalChecksDir is set', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-acct.json']);
    mockExec.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await stage().execute(makeStageConfig({ checkov: { externalChecksDir: './custom-checks' } }));

    const [, args] = mockExec.mock.calls.find(c => c[0] === 'checkov')!;
    expect(args).toContain('--external-checks-dir');
    expect(args).toContain('./custom-checks');
  });
});

// ── result aggregation ────────────────────────────────────────────────────────

describe('CheckovTfStage — result aggregation', () => {
  it('succeeds when all accounts pass (exit 0)', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-a.json', 'tfplan1-b.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip
      .mockResolvedValueOnce(0)  // checkov a → success
      .mockResolvedValueOnce(0); // checkov b → success

    await stage().execute(makeStageConfig());

    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('calls setFailed when any account fails (exit 1, no soft-fail)', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-a.json', 'tfplan1-b.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip
      .mockResolvedValueOnce(0)  // a → success
      .mockResolvedValueOnce(1); // b → failure

    await stage().execute(makeStageConfig());

    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining("'checkov_tf' failed"));
  });

  it('warns instead of failing when platform soft_fail=true', async () => {
    const { PlatformConfigLoader } = require('../config/PlatformConfigLoader');
    PlatformConfigLoader.securityPolicy.mockResolvedValueOnce({
      checkov: { soft_fail: true, upload_sarif: false },
    });

    mockFindFiles.mockResolvedValueOnce(['tfplan1-a.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip
      .mockResolvedValueOnce(1); // a → failure

    await stage().execute(makeStageConfig());

    expect(core.setFailed).not.toHaveBeenCalled();
    // aggregateResults converts failure→warning when softFail; handleResult('warning') emits "returned warnings"
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("'checkov_tf' returned warnings"));
  });

  it('stage.checkov.softFail=true overrides platform policy', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-a.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip
      .mockResolvedValueOnce(1); // failure

    await stage().execute(makeStageConfig({ checkov: { softFail: true } }));

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("'checkov_tf' returned warnings"));
  });

  it('softFailPattern matching projectId triggers soft-fail', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-a.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip
      .mockResolvedValueOnce(1); // failure

    // projectId is 'awseks-cluster', pattern matches
    await stage({ projectId: 'awseks-cluster' })
      .execute(makeStageConfig({ checkov: { softFailPattern: '^awseks' } }));

    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('softFailPattern not matching leaves hard-fail intact', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-a.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip
      .mockResolvedValueOnce(1); // failure

    // projectId is 'platform', pattern does not match
    await stage().execute(makeStageConfig({ checkov: { softFailPattern: '^awseks' } }));

    expect(core.setFailed).toHaveBeenCalled();
  });

  it('exit 2 maps to warning result', async () => {
    mockFindFiles.mockResolvedValueOnce(['tfplan1-a.json']);
    mockExec
      .mockResolvedValueOnce(0)  // pip
      .mockResolvedValueOnce(2); // unstable

    await stage().execute(makeStageConfig());

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("'checkov_tf' returned warnings"));
  });
});
