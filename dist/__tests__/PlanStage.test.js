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
const exec = __importStar(require("@actions/exec"));
const PlanStage_1 = require("../stages/infra/PlanStage");
const PlanExtractor_1 = require("../utils/PlanExtractor");
const StageTransfer_1 = require("../utils/StageTransfer");
const ActionYaml_1 = require("../entities/ActionYaml");
const BranchType_1 = require("../enums/BranchType");
const Environment_1 = require("../enums/Environment");
const ErrorCode_1 = require("../enums/ErrorCode");
const ActionsType_1 = require("../enums/ActionsType");
jest.mock('@actions/core', () => ({
    info: jest.fn(), startGroup: jest.fn(), endGroup: jest.fn(),
    warning: jest.fn(), error: jest.fn(), debug: jest.fn(), notice: jest.fn(),
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
jest.mock('../utils/PlanSummary', () => ({
    PlanSummary: {
        writeSummaryForPlans: jest.fn().mockResolvedValue(undefined),
    },
}));
jest.mock('../utils/PlanSecurity', () => ({
    PlanSecurity: {
        warnArtifactVisibility: jest.fn(),
        warnIfSensitiveVariables: jest.fn(),
    },
}));
// Prevent real artifact API / glob calls
jest.mock('../utils/StageTransfer', () => ({
    StageTransfer: {
        findFiles: jest.fn().mockResolvedValue([]),
        saveByPaths: jest.fn().mockResolvedValue(undefined),
        saveByGlob: jest.fn().mockResolvedValue(undefined),
        restoreByName: jest.fn().mockResolvedValue(undefined),
    },
    PlanArtifacts: { JSON: 'analysis-source', BINARY: 'terragrunt-plan' },
    PlanGlobs: { JSON: '**/tfplan*-*.json', BINARY: '**/tfplan*.binary' },
}));
// Prevent real file-system calls from PlanExtractor
jest.mock('../utils/PlanExtractor', () => {
    const MockPlanExtractor = jest.fn().mockImplementation(() => ({
        buildRunCommands: jest.fn().mockImplementation((cmd, idx) => [
            `${cmd} --out tfplan${idx}-platform-infra-1.0.0.binary`,
            `terragrunt show -json tfplan${idx}-platform-infra-1.0.0.binary > tfplan${idx}-platform-infra-1.0.0.json`,
        ]),
        extractPerAccountPlans: jest.fn().mockReturnValue([]),
        filterPerAccountPlans: jest.fn().mockReturnValue([]),
    }));
    MockPlanExtractor
        .isPlanCommand = (cmd) => cmd.trim().split(/\s+/).includes('plan');
    return { PlanExtractor: MockPlanExtractor };
});
// ── Helpers ───────────────────────────────────────────────────────────────────
function makeConfig() {
    return new ActionYaml_1.ActionYaml({
        type: ActionsType_1.ActionsType.TERRAFORM,
        metadata: { projectId: 'platform', serviceId: 'infra', version: '1.0.0' },
        stages: [],
    });
}
function planStage(branchType) {
    return new PlanStage_1.PlanStage(makeConfig(), branchType);
}
function stageConfig(overrides) {
    return { name: 'plan', commands: ['terragrunt run-all plan'], ...overrides };
}
beforeEach(() => jest.clearAllMocks());
// ── Command validation ────────────────────────────────────────────────────────
describe('PlanStage — command validation', () => {
    it('throws MISSING_STAGE_COMMANDS when commands is empty', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ commands: [] })))
            .rejects.toThrow(ErrorCode_1.ErrorCode.MISSING_STAGE_COMMANDS);
    });
    it('throws PLAN_COMMAND_FORBIDDEN when apply is present', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt apply tfplan.binary'] }))).rejects.toThrow(ErrorCode_1.ErrorCode.PLAN_COMMAND_FORBIDDEN);
    });
    it('throws PLAN_COMMAND_FORBIDDEN when destroy is present', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt destroy'] }))).rejects.toThrow(ErrorCode_1.ErrorCode.PLAN_COMMAND_FORBIDDEN);
    });
    it('throws PLAN_COMMAND_FORBIDDEN when force-unlock is present', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt force-unlock 9b4d1a6e'] }))).rejects.toThrow(ErrorCode_1.ErrorCode.PLAN_COMMAND_FORBIDDEN);
    });
    it('throws NO_PLAN_COMMAND_FOUND when no plan subcommand is present', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt state list'] }))).rejects.toThrow(ErrorCode_1.ErrorCode.NO_PLAN_COMMAND_FOUND);
    });
    it('passes for a valid terragrunt plan command', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig())).resolves.toBeUndefined();
    });
    it('passes for run-all plan with working-dir flag', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt run-all plan --terragrunt-working-dir ./envs/dev'],
        }))).resolves.toBeUndefined();
    });
});
// ── Branch-env validation ─────────────────────────────────────────────────────
describe('PlanStage — branch-env validation', () => {
    it('develop + dev passes', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment_1.Environment.DEV } }))).resolves.toBeUndefined();
    });
    it('develop + prod throws ACCOUNT_BRANCH_MISMATCH', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }))).rejects.toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('develop + staging throws ACCOUNT_BRANCH_MISMATCH', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ deploy: { environment: Environment_1.Environment.STAGING } }))).rejects.toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('master + prod passes', async () => {
        await expect(planStage(BranchType_1.BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }))).resolves.toBeUndefined();
    });
    it('master + dev throws ACCOUNT_BRANCH_MISMATCH', async () => {
        await expect(planStage(BranchType_1.BranchType.MASTER).execute(stageConfig({ deploy: { environment: Environment_1.Environment.DEV } }))).rejects.toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('release + staging passes', async () => {
        await expect(planStage(BranchType_1.BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment_1.Environment.STAGING } }))).resolves.toBeUndefined();
    });
    it('release + qa passes', async () => {
        await expect(planStage(BranchType_1.BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment_1.Environment.QA } }))).resolves.toBeUndefined();
    });
    it('release + prod throws ACCOUNT_BRANCH_MISMATCH', async () => {
        await expect(planStage(BranchType_1.BranchType.RELEASE).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }))).rejects.toThrow(ErrorCode_1.ErrorCode.ACCOUNT_BRANCH_MISMATCH);
    });
    it('feature branch has no restriction — any env passes', async () => {
        await expect(planStage(BranchType_1.BranchType.FEATURE).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }))).resolves.toBeUndefined();
    });
    it('pull_request has no restriction', async () => {
        await expect(planStage(BranchType_1.BranchType.PULL_REQUEST).execute(stageConfig({ deploy: { environment: Environment_1.Environment.PROD } }))).resolves.toBeUndefined();
    });
    it('no deploy config skips validation entirely', async () => {
        await expect(planStage(BranchType_1.BranchType.MASTER).execute(stageConfig())).resolves.toBeUndefined();
    });
    it('passes with accounts list alongside valid env', async () => {
        await expect(planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            deploy: { environment: Environment_1.Environment.DEV, accounts: ['123456789012'] },
        }))).resolves.toBeUndefined();
    });
});
// ── Execution — command expansion ─────────────────────────────────────────────
describe('PlanStage — plan command expansion', () => {
    it('expands a plan command into plan+show exec calls', async () => {
        await planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ commands: ['terragrunt plan'] }));
        // plan command is expanded into two shell calls by buildRunCommands
        expect(exec.exec).toHaveBeenCalledTimes(2);
        expect(exec.exec).toHaveBeenNthCalledWith(1, 'bash', ['-c', 'terragrunt plan --out tfplan1-platform-infra-1.0.0.binary'], expect.any(Object));
        expect(exec.exec).toHaveBeenNthCalledWith(2, 'bash', ['-c', 'terragrunt show -json tfplan1-platform-infra-1.0.0.binary > tfplan1-platform-infra-1.0.0.json'], expect.any(Object));
    });
    it('runs non-plan commands (state list) as-is without expansion', async () => {
        // Need at least one plan command to avoid NO_PLAN_COMMAND_FOUND
        const commands = ['terragrunt state list', 'terragrunt plan'];
        await planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({ commands }));
        // state list runs as-is (1 call), plan expands to 2 calls → total 3
        expect(exec.exec).toHaveBeenCalledTimes(3);
        expect(exec.exec).toHaveBeenNthCalledWith(1, 'bash', ['-c', 'terragrunt state list'], expect.any(Object));
    });
    it('saves per-account plans and binaries to artifacts after execution', async () => {
        await planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig());
        expect(StageTransfer_1.StageTransfer.findFiles).toHaveBeenCalledWith('tfplan*.json');
        expect(StageTransfer_1.StageTransfer.saveByGlob).toHaveBeenCalledWith('terragrunt-plan', '**/tfplan*.binary');
    });
    it('uses accounts as fallback when env_id is absent', async () => {
        await planStage(BranchType_1.BranchType.DEVELOP).execute(stageConfig({
            commands: ['terragrunt plan'],
            deploy: { environment: Environment_1.Environment.DEV, accounts: ['acct-d-01'] },
        }));
        // PlanExtractor is instantiated once per execute call
        const MockExtractor = PlanExtractor_1.PlanExtractor;
        expect(MockExtractor).toHaveBeenCalled();
    });
});
//# sourceMappingURL=PlanStage.test.js.map