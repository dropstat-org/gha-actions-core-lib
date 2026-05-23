import * as core from '@actions/core';
import { ActionYaml, ActionsCoreLibError } from './entities/ActionYaml';
import { MetadataValidator } from './validator/MetadataValidator';
import { StageValidator } from './validator/StageValidator';
import { WorkflowFactory } from './workflows/WorkflowFactory';
import { StageRegistry } from './registry/StageRegistry';
import { OutputWriter } from './utils/OutputWriter';
import { detectBranchType } from './utils/BranchDetector';
import { StageName } from './enums/StageName';
import { ValidateApproverStage } from './stages/validate/ValidateApproverStage';
import { ValidateConfirmStage } from './stages/validate/ValidateConfirmStage';
import { SetupTerragruntStage } from './stages/infra/SetupTerragruntStage';

async function run(): Promise<void> {
  try {
    const configPath = core.getInput('config') || 'action.yaml';
    const stageName  = core.getInput('stage');

    const branchType = detectBranchType();
    core.info(`Branch type detected: ${branchType}`);

    const config = ActionYaml.load(configPath);

    MetadataValidator.validate(config.metadata);
    StageValidator.validate(config.stages);

    const workflow = WorkflowFactory.create(config.type);
    workflow.checkStages(config.stages, branchType);

    if (stageName === StageName.CONFIG) {
      await OutputWriter.writeFlags(config, branchType, workflow);
      return;
    }

    if (stageName === StageName.VALIDATE_APPROVER) {
      await ValidateApproverStage.run();
      return;
    }

    if (stageName === StageName.VALIDATE_CONFIRM) {
      ValidateConfirmStage.run();
      return;
    }

    if (stageName === StageName.SETUP_TERRAGRUNT) {
      await SetupTerragruntStage.run();
      return;
    }

    const stageConfig = config.stages.find(s => s.name === stageName);
    if (!stageConfig) {
      throw new ActionsCoreLibError(
        'UNKNOWN_STAGE' as never,
        `Stage '${stageName}' not found in action.yaml`,
      );
    }

    const stage = StageRegistry.create(stageName, config, branchType);
    await stage.execute(stageConfig);
  } catch (err) {
    if (err instanceof ActionsCoreLibError) {
      core.setFailed(err.message);
    } else {
      core.setFailed((err as Error).message ?? String(err));
    }
  }
}

run();
