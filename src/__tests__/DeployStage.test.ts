import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { DeployStage } from '../stages/deploy/DeployStage';
import { ActionYaml } from '../entities/ActionYaml';
import { BranchType } from '../enums/BranchType';
import { Environment } from '../enums/Environment';
import { ErrorCode } from '../enums/ErrorCode';
import { ActionsType } from '../enums/ActionsType';
import { StageConfig } from '../entities/StageConfig';

jest.mock('@actions/core', () => ({
  info: jest.fn(), startGroup: jest.fn(), endGroup: jest.fn(),
  warning: jest.fn(), error: jest.fn(), debug: jest.fn(),
  notice: jest.fn(), exportVariable: jest.fn(),
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
jest.mock('../utils/StageTransfer', () => ({
  StageTransfer: {
    restoreByName: jest.fn().mockResolvedValue(undefined),
    findFiles:     jest.fn().mockResolvedValue([]),
  },
  PlanArtifacts: { JSON: 'analysis-source', BINARY: 'terragrunt-plan' },
  PlanGlobs:     { JSON: '**/tfplan*-*.json', BINARY: '**/tfplan*.binary' },
}));
jest.mock('../utils/PlanSummary', () => ({
  PlanSummary: {
    writeSummaryForPlans: jest.fn().mockResolvedValue(undefined),
  },
}));

function makeConfig(type: ActionsType = ActionsType.TERRAFORM) {
  return new ActionYaml({
    type,
    metadata: { projectId: 'platform', serviceId: 'infra', version: '1.0.0' },
    stages: [],
  });
}

function deployStage(branchType: BranchType, type = ActionsType.TERRAFORM) {
  return new DeployStage(makeConfig(type), branchType);
}

function stageConfig(overrides?: Partial<StageConfig>): StageConfig {
  return {
    name: 'deploy',
    commands: ['terragrunt run-all apply tfplan.binary'],
    deploy: { environment: Environment.DEV },
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

// ── Structural validation ─────────────────────────────────────────────────────

describe('DeployStage — structural validation', () => {
  it('throws MISSING_DEPLOY_ENV when deploy config is absent', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({ deploy: undefined }))
    ).rejects.toThrow(ErrorCode.MISSING_DEPLOY_ENV);
  });

  it('throws MISSING_STAGE_COMMANDS when commands is empty', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({ commands: [] }))
    ).rejects.toThrow(ErrorCode.MISSING_STAGE_COMMANDS);
  });
});

// ── Terraform command validation ──────────────────────────────────────────────

describe('DeployStage — terraform command validation', () => {
  it('throws DEPLOY_PLAN_COMMAND_FORBIDDEN when plan is present', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({
        commands: ['terragrunt run-all plan --terragrunt-non-interactive'],
      }))
    ).rejects.toThrow(ErrorCode.DEPLOY_PLAN_COMMAND_FORBIDDEN);
  });

  it('throws MISSING_STAGE_COMMANDS when no apply command exists', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({
        commands: ['terragrunt state list'],
      }))
    ).rejects.toThrow(ErrorCode.MISSING_STAGE_COMMANDS);
  });

  it('throws DEPLOY_MISSING_PLAN_REF for bare apply without plan file', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({
        commands: ['terragrunt apply'],
      }))
    ).rejects.toThrow(ErrorCode.DEPLOY_MISSING_PLAN_REF);
  });

  it('throws DEPLOY_MISSING_PLAN_REF for apply -auto-approve without plan file', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({
        commands: ['terragrunt apply -auto-approve'],
      }))
    ).rejects.toThrow(ErrorCode.DEPLOY_MISSING_PLAN_REF);
  });

  it('passes for apply with plan file', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({
        commands: ['terragrunt apply tfplan.binary'],
      }))
    ).resolves.toBeUndefined();
  });

  it('passes for run-all apply with plan file', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({
        commands: ['terragrunt run-all apply tfplan.binary'],
      }))
    ).resolves.toBeUndefined();
  });

  it('skips terraform validation for non-terraform type', async () => {
    // APP type — bare apply without plan file is allowed
    await expect(
      deployStage(BranchType.DEVELOP, ActionsType.APP).execute(stageConfig({
        commands: ['some-deploy-command apply'],
      }))
    ).resolves.toBeUndefined();
  });
});

// ── Branch-env validation ─────────────────────────────────────────────────────

describe('DeployStage — branch-env validation', () => {
  it('develop + dev passes', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment.DEV } }))
    ).resolves.toBeUndefined();
  });

  it('develop + prod throws ACCOUNT_BRANCH_MISMATCH', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment.PROD } }))
    ).rejects.toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('master + prod passes', async () => {
    await expect(
      deployStage(BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment.PROD } }))
    ).resolves.toBeUndefined();
  });

  it('master + dev throws ACCOUNT_BRANCH_MISMATCH', async () => {
    await expect(
      deployStage(BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment.DEV } }))
    ).rejects.toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('release + staging passes', async () => {
    await expect(
      deployStage(BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment.STAGING } }))
    ).resolves.toBeUndefined();
  });

  it('release + qa passes', async () => {
    await expect(
      deployStage(BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment.QA } }))
    ).resolves.toBeUndefined();
  });

  it('release + prod throws ACCOUNT_BRANCH_MISMATCH', async () => {
    await expect(
      deployStage(BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment.PROD } }))
    ).rejects.toThrow(ErrorCode.ACCOUNT_BRANCH_MISMATCH);
  });

  it('no deploy.environment falls back to branch-derived env — master resolves to prod', async () => {
    // deploy config present but no explicit environment — resolves to PROD from MASTER branch
    await expect(
      deployStage(BranchType.MASTER).execute(stageConfig({ deploy: {} }))
    ).resolves.toBeUndefined();
  });

  it('passes with accounts list alongside valid env', async () => {
    await expect(
      deployStage(BranchType.DEVELOP).execute(stageConfig({
        deploy: { environment: Environment.DEV, accounts: ['123456789012'] },
      }))
    ).resolves.toBeUndefined();
  });
});

// ── Execution ─────────────────────────────────────────────────────────────────

describe('DeployStage — execution', () => {
  it('calls exec with the apply command', async () => {
    await deployStage(BranchType.DEVELOP).execute(stageConfig({
      commands: ['terragrunt apply tfplan.binary'],
    }));
    expect(exec.exec).toHaveBeenCalledWith('bash', ['-c', 'terragrunt apply tfplan.binary'], expect.any(Object));
  });

  it('exports DEPLOY_ENV before running commands', async () => {
    await deployStage(BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment.DEV } }));
    expect(core.exportVariable).toHaveBeenCalledWith('DEPLOY_ENV', Environment.DEV);
  });

  it('exports DEPLOY_ENV matching the declared environment', async () => {
    await deployStage(BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment.PROD } }));
    expect(core.exportVariable).toHaveBeenCalledWith('DEPLOY_ENV', Environment.PROD);
  });
});
