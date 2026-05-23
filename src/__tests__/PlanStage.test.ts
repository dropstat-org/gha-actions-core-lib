import * as exec from '@actions/exec';
import { PlanStage } from '../stages/infra/PlanStage';
import { PlanExtractor } from '../utils/PlanExtractor';
import { StageTransfer } from '../utils/StageTransfer';
import { ActionYaml } from '../entities/ActionYaml';
import { BranchType } from '../enums/BranchType';
import { Environment } from '../enums/Environment';
import { ErrorCode } from '../enums/ErrorCode';
import { ActionsType } from '../enums/ActionsType';
import { StageConfig } from '../entities/StageConfig';

jest.mock('@actions/core', () => ({
  info: jest.fn(), startGroup: jest.fn(), endGroup: jest.fn(),
  warning: jest.fn(), error: jest.fn(), debug: jest.fn(), notice: jest.fn(),
}));
jest.mock('@actions/exec', () => ({ exec: jest.fn().mockResolvedValue(0) }));
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

jest.mock('../utils/PlanSummary', () => ({
  PlanSummary: {
    writeSummaryForPlans: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../utils/PlanSecurity', () => ({
  PlanSecurity: {
    warnArtifactVisibility:    jest.fn(),
    warnIfSensitiveVariables:  jest.fn(),
  },
}));

// Prevent real artifact API / glob calls
jest.mock('../utils/StageTransfer', () => ({
  StageTransfer: {
    findFiles:    jest.fn().mockResolvedValue([]),
    saveByPaths:  jest.fn().mockResolvedValue(undefined),
    saveByGlob:   jest.fn().mockResolvedValue(undefined),
    restoreByName: jest.fn().mockResolvedValue(undefined),
  },
  PlanArtifacts: { JSON: 'analysis-source', BINARY: 'terragrunt-plan' },
  PlanGlobs:     { JSON: '**/tfplan*-*.json', BINARY: '**/tfplan*.binary' },
}));

// Prevent real file-system calls from PlanExtractor
jest.mock('../utils/PlanExtractor', () => {
  const MockPlanExtractor = jest.fn().mockImplementation(() => ({
    buildRunCommands: jest.fn().mockImplementation((cmd: string, idx: number) => [
      `${cmd} --out tfplan${idx}-platform-infra-1.0.0.binary`,
      `terragrunt show -json tfplan${idx}-platform-infra-1.0.0.binary > tfplan${idx}-platform-infra-1.0.0.json`,
    ]),
    extractPerAccountPlans: jest.fn().mockReturnValue([]),
    filterPerAccountPlans:  jest.fn().mockReturnValue([]),
  }));
  (MockPlanExtractor as jest.Mock & { isPlanCommand: (cmd: string) => boolean })
    .isPlanCommand = (cmd: string) => cmd.trim().split(/\s+/).includes('plan');
  return { PlanExtractor: MockPlanExtractor };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig() {
  return new ActionYaml({
    type: ActionsType.TERRAFORM,
    metadata: { projectId: 'platform', serviceId: 'infra', version: '1.0.0' },
    stages: [],
  });
}

function planStage(branchType: BranchType) {
  return new PlanStage(makeConfig(), branchType);
}

function stageConfig(overrides?: Partial<StageConfig>): StageConfig {
  return { name: 'plan', commands: ['terragrunt run-all plan'], ...overrides };
}

beforeEach(() => jest.clearAllMocks());

// ── Command validation ────────────────────────────────────────────────────────

describe('PlanStage — command validation', () => {
  it('throws MISSING_STAGE_COMMANDS when commands is empty', async () => {
    await expect(planStage(BranchType.DEVELOP).execute(stageConfig({ commands: [] })))
      .rejects.toThrow(ErrorCode.MISSING_STAGE_COMMANDS);
  });

  it('throws PLAN_COMMAND_FORBIDDEN when apply is present', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt apply tfplan.binary'] }))
    ).rejects.toThrow(ErrorCode.PLAN_COMMAND_FORBIDDEN);
  });

  it('throws PLAN_COMMAND_FORBIDDEN when destroy is present', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt destroy'] }))
    ).rejects.toThrow(ErrorCode.PLAN_COMMAND_FORBIDDEN);
  });

  it('throws PLAN_COMMAND_FORBIDDEN when force-unlock is present', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt force-unlock 9b4d1a6e'] }))
    ).rejects.toThrow(ErrorCode.PLAN_COMMAND_FORBIDDEN);
  });

  it('throws NO_PLAN_COMMAND_FOUND when no plan subcommand is present', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt state list'] }))
    ).rejects.toThrow(ErrorCode.NO_PLAN_COMMAND_FOUND);
  });

  it('passes for a valid terragrunt plan command', async () => {
    await expect(planStage(BranchType.DEVELOP).execute(stageConfig())).resolves.toBeUndefined();
  });

  it('passes for run-all plan with working-dir flag', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({
        commands: ['terragrunt run-all plan --terragrunt-working-dir ./envs/dev'],
      }))
    ).resolves.toBeUndefined();
  });
});

// ── Branch-env validation ─────────────────────────────────────────────────────

describe('PlanStage — branch-env validation', () => {
  it('develop + dev passes', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment.DEV } }))
    ).resolves.toBeUndefined();
  });

  it('develop + prod throws ACCOUNT_BRANCH_MISMATCH', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment.PROD } }))
    ).rejects.toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('develop + staging throws ACCOUNT_BRANCH_MISMATCH', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment.STAGING } }))
    ).rejects.toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('master + prod passes', async () => {
    await expect(
      planStage(BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment.PROD } }))
    ).resolves.toBeUndefined();
  });

  it('master + dev throws ACCOUNT_BRANCH_MISMATCH', async () => {
    await expect(
      planStage(BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment.DEV } }))
    ).rejects.toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('release + staging passes', async () => {
    await expect(
      planStage(BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment.STAGING } }))
    ).resolves.toBeUndefined();
  });

  it('release + qa passes', async () => {
    await expect(
      planStage(BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment.QA } }))
    ).resolves.toBeUndefined();
  });

  it('release + prod throws ACCOUNT_BRANCH_MISMATCH', async () => {
    await expect(
      planStage(BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment.PROD } }))
    ).rejects.toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('feature branch has no restriction — any env passes', async () => {
    await expect(
      planStage(BranchType.FEATURE).execute(stageConfig({ deploy: { environment: Environment.PROD } }))
    ).resolves.toBeUndefined();
  });

  it('pull_request has no restriction', async () => {
    await expect(
      planStage(BranchType.PULL_REQUEST).execute(stageConfig({ deploy: { environment: Environment.PROD } }))
    ).resolves.toBeUndefined();
  });

  it('no deploy config skips validation entirely', async () => {
    await expect(
      planStage(BranchType.MASTER).execute(stageConfig())
    ).resolves.toBeUndefined();
  });

  it('passes with accounts list alongside valid env', async () => {
    await expect(
      planStage(BranchType.DEVELOP).execute(stageConfig({
        deploy: { environment: Environment.DEV, accounts: ['123456789012'] },
      }))
    ).resolves.toBeUndefined();
  });
});

// ── Execution — command expansion ─────────────────────────────────────────────

describe('PlanStage — plan command expansion', () => {
  it('expands a plan command into plan+show exec calls', async () => {
    await planStage(BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt plan'] }));

    // plan command is expanded into two shell calls by buildRunCommands
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec).toHaveBeenNthCalledWith(
      1, 'bash', ['-c', 'terragrunt plan --out tfplan1-platform-infra-1.0.0.binary'], expect.any(Object),
    );
    expect(exec.exec).toHaveBeenNthCalledWith(
      2, 'bash', ['-c', 'terragrunt show -json tfplan1-platform-infra-1.0.0.binary > tfplan1-platform-infra-1.0.0.json'], expect.any(Object),
    );
  });

  it('runs non-plan commands (state list) as-is without expansion', async () => {
    // Need at least one plan command to avoid NO_PLAN_COMMAND_FOUND
    const commands = ['terragrunt state list', 'terragrunt plan'];
    await planStage(BranchType.DEVELOP).execute(stageConfig({ commands }));

    // state list runs as-is (1 call), plan expands to 2 calls → total 3
    expect(exec.exec).toHaveBeenCalledTimes(3);
    expect(exec.exec).toHaveBeenNthCalledWith(
      1, 'bash', ['-c', 'terragrunt state list'], expect.any(Object),
    );
  });

  it('saves per-account plans and binaries to artifacts after execution', async () => {
    await planStage(BranchType.DEVELOP).execute(stageConfig());

    expect(StageTransfer.findFiles).toHaveBeenCalledWith('tfplan*.json');
    expect(StageTransfer.saveByGlob).toHaveBeenCalledWith(
      'terragrunt-plan', '**/tfplan*.binary',
    );
  });

  it('uses accounts as fallback when env_id is absent', async () => {
    await planStage(BranchType.DEVELOP).execute(stageConfig({
      commands: ['terragrunt plan'],
      deploy: { environment: Environment.DEV, accounts: ['acct-d-01'] },
    }));
    // PlanExtractor is instantiated once per execute call
    const MockExtractor = PlanExtractor as unknown as jest.Mock;
    expect(MockExtractor).toHaveBeenCalled();
  });
});
