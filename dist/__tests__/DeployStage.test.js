"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const DeployStage_1 = require("../stages/deploy/DeployStage");
const ActionYaml_1 = require("../entities/ActionYaml");
const BranchType_1 = require("../enums/BranchType");
const Environment_1 = require("../enums/Environment");
const ErrorCode_1 = require("../enums/ErrorCode");
const ActionsType_1 = require("../enums/ActionsType");
jest.mock('@actions/core', () => ({
    info: jest.fn(), startGroup: jest.fn(), endGroup: jest.fn(),
    warning: jest.fn(), error: jest.fn(), debug: jest.fn(),
    notice: jest.fn(), exportVariable: jest.fn(),
}));
jest.mock('@actions/exec', () => ({ exec: jest.fn().mockResolvedValue(0) }));
jest.mock('../utils/ArtifactHandler', () => ({
    ArtifactHandler: jest.fn().mockImplementation(() => ({
        upload: jest.fn().mockResolvedValue(undefined),
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
        findFiles: jest.fn().mockResolvedValue([]),
    },
    PlanArtifacts: { JSON: 'analysis-source', BINARY: 'terragrunt-plan' },
    PlanGlobs: { JSON: '**/tfplan*-*.json', BINARY: '**/tfplan*.binary' },
}));
jest.mock('../utils/PlanSummary', () => ({
    PlanSummary: {
        writeSummaryForPlans: jest.fn().mockResolvedValue(undefined),
    },
}));
function makeConfig(type = ActionsType_1.ActionsType.TERRAFORM) {
    return new ActionYaml_1.ActionYaml({
        type,
        metadata: { projectId: 'platform', serviceId: 'infra', version: '1.0.0' },
        stages: [],
    });
}
function deployStage(branchType, type = ActionsType_1.ActionsType.TERRAFORM) {
    return new DeployStage_1.DeployStage(makeConfig(type), branchType);
}
function stageConfig(overrides) {
    return {
        name: 'deploy',
        commands: ['terragrunt run-all apply tfplan.binary'],
        deploy: { environment: Environment_1.Environment.DEV },
        ...overrides,
    };
}
beforeEach(() => jest.clearAllMocks());
// ── Structural validation ─────────────────────────────────────────────────────
describe('DeployStage — structural validation', () => {
    it('throws MISSING_DEPLOY_ENV when deploy config is absent', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ deploy: undefined }))).rejects.toThrow(ErrorCode_1.ErrorCode.MISSING_DEPLOY_ENV);
    });
    it('throws MISSING_STAGE_COMMANDS when commands is empty', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ commands: [] }))).rejects.toThrow(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS);
    });
});
// ── Terraform command validation ──────────────────────────────────────────────
describe('DeployStage — terraform command validation', () => {
    it('throws DEPLOY_PLAN_COMMAND_FORBIDDEN when plan is present', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt run-all plan --terragrunt-non-interactive'],
        }))).rejects.toThrow(ErrorCode_1.ErrorCode.DEPLOY_PLAN_COMMAND_FORBIDDEN);
    });
    it('throws MISSING_STAGE_COMMANDS when no apply command exists', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt state list'],
        }))).rejects.toThrow(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS);
    });
    it('throws DEPLOY_MISSING_PLAN_REF for bare apply without plan file', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt apply'],
        }))).rejects.toThrow(ErrorCode_1.ErrorCode.DEPLOY_MISSING_PLAN_REF);
    });
    it('throws DEPLOY_MISSING_PLAN_REF for apply -auto-approve without plan file', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt apply -auto-approve'],
        }))).rejects.toThrow(ErrorCode_1.ErrorCode.DEPLOY_MISSING_PLAN_REF);
    });
    it('passes for apply with plan file', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt apply tfplan.binary'],
        }))).resolves.toBeUndefined();
    });
    it('passes for run-all apply with plan file', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt run-all apply tfplan.binary'],
        }))).resolves.toBeUndefined();
    });
    it('skips terraform validation for non-terraform type', async () => {
        // APP type — bare apply without plan file is allowed
        await expect(deployStage(BranchType_1.BranchType.DEVELOP, ActionsType_1.ActionsType.APP).execute(stageConfig({
            commands: ['some-deploy-command apply'],
        }))).resolves.toBeUndefined();
    });
});
// ── Branch-env validation ─────────────────────────────────────────────────────
describe('DeployStage — branch-env validation', () => {
    it('develop + dev passes', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment_1.Environment.DEV } }))).resolves.toBeUndefined();
    });
    it('develop + prod throws ACCOUNT_BRANCH_MISMATCH', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }))).rejects.toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('master + prod passes', async () => {
        await expect(deployStage(BranchType_1.BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }))).resolves.toBeUndefined();
    });
    it('master + dev throws ACCOUNT_BRANCH_MISMATCH', async () => {
        await expect(deployStage(BranchType_1.BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment_1.Environment.DEV } }))).rejects.toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('release + staging passes', async () => {
        await expect(deployStage(BranchType_1.BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment_1.Environment.STAGING } }))).resolves.toBeUndefined();
    });
    it('release + qa passes', async () => {
        await expect(deployStage(BranchType_1.BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment_1.Environment.QA } }))).resolves.toBeUndefined();
    });
    it('release + prod throws ACCOUNT_BRANCH_MISMATCH', async () => {
        await expect(deployStage(BranchType_1.BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }))).rejects.toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('no deploy.environment falls back to branch-derived env — master resolves to prod', async () => {
        // deploy config present but no explicit environment — resolves to PROD from MASTER branch
        await expect(deployStage(BranchType_1.BranchType.MASTER).execute(stageConfig({ deploy: {} }))).resolves.toBeUndefined();
    });
    it('passes with accounts list alongside valid env', async () => {
        await expect(deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            deploy: { environment: Environment_1.Environment.DEV, accounts: ['123456789012'] },
        }))).resolves.toBeUndefined();
    });
});
// ── Execution ─────────────────────────────────────────────────────────────────
describe('DeployStage — execution', () => {
    it('calls exec with the apply command', async () => {
        await deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt apply tfplan.binary'],
        }));
        expect(exec.exec).toHaveBeenCalledWith('bash', ['-c', 'terragrunt apply tfplan.binary'], expect.any(Object));
    });
    it('exports DEPLOY_ENV before running commands', async () => {
        await deployStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment_1.Environment.DEV } }));
        expect(core.exportVariable).toHaveBeenCalledWith('DEPLOY_ENV', Environment_1.Environment.DEV);
    });
    it('exports DEPLOY_ENV matching the declared environment', async () => {
        await deployStage(BranchType_1.BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }));
        expect(core.exportVariable).toHaveBeenCalledWith('DEPLOY_ENV', Environment_1.Environment.PROD);
    });
});
//# sourceMappingURL=DeployStage.test.js.map