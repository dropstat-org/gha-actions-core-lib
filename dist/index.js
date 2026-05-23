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
const ActionYaml_1 = require("./entities/ActionYaml");
const MetadataValidator_1 = require("./validator/MetadataValidator");
const StageValidator_1 = require("./validator/StageValidator");
const WorkflowFactory_1 = require("./workflows/WorkflowFactory");
const StageRegistry_1 = require("./registry/StageRegistry");
const OutputWriter_1 = require("./utils/OutputWriter");
const BranchDetector_1 = require("./utils/BranchDetector");
const StageName_1 = require("./enums/StageName");
const ValidateApproverStage_1 = require("./stages/validate/ValidateApproverStage");
const ValidateConfirmStage_1 = require("./stages/validate/ValidateConfirmStage");
const SetupTerragruntStage_1 = require("./stages/infra/SetupTerragruntStage");
async function run() {
    try {
        const configPath = core.getInput('config') || 'action.yaml';
        const stageName = core.getInput('stage');
        const branchType = (0, BranchDetector_1.detectBranchType)();
        core.info(`Branch type detected: ${branchType}`);
        const config = ActionYaml_1.ActionYaml.load(configPath);
        MetadataValidator_1.MetadataValidator.validate(config.metadata);
        StageValidator_1.StageValidator.validate(config.stages);
        const workflow = WorkflowFactory_1.WorkflowFactory.create(config.type);
        workflow.checkStages(config.stages, branchType);
        if (stageName === StageName_1.StageName.CONFIG) {
            await OutputWriter_1.OutputWriter.writeFlags(config, branchType, workflow);
            return;
        }
        if (stageName === StageName_1.StageName.VALIDATE_APPROVER) {
            await ValidateApproverStage_1.ValidateApproverStage.run();
            return;
        }
        if (stageName === StageName_1.StageName.VALIDATE_CONFIRM) {
            ValidateConfirmStage_1.ValidateConfirmStage.run();
            return;
        }
        if (stageName === StageName_1.StageName.SETUP_TERRAGRUNT) {
            await SetupTerragruntStage_1.SetupTerragruntStage.run();
            return;
        }
        const stageConfig = config.stages.find(s => s.name === stageName);
        if (!stageConfig) {
            throw new ActionYaml_1.ActionsCoreLibError('UNKNOWN_STAGE', `Stage '${stageName}' not found in action.yaml`);
        }
        const stage = StageRegistry_1.StageRegistry.create(stageName, config, branchType);
        await stage.execute(stageConfig);
    }
    catch (err) {
        if (err instanceof ActionYaml_1.ActionsCoreLibError) {
            core.setFailed(err.message);
        }
        else {
            core.setFailed(err.message ?? String(err));
        }
    }
}
run();
//# sourceMappingURL=index.js.map