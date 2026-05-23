import * as core from '@actions/core';
import { AbstractBranchStage } from '../base/AbstractBranchStage';
import { StageConfig } from '../../entities/StageConfig';
import { Environment } from '../../enums/Environment';
import { ActionsCoreLibError } from '../../entities/ActionYaml';
import { ErrorCode } from '../../enums/ErrorCode';
import { validateDeployForBranch } from '../../utils/AccountValidator';

export abstract class AbstractDeployStage extends AbstractBranchStage {
  protected resolveDeployEnvironment(stage: StageConfig): Environment {
    const envValue = stage.deploy?.environment ?? this.environment;
    const validEnvs = Object.values(Environment) as string[];
    if (!validEnvs.includes(envValue as string)) {
      throw new ActionsCoreLibError(
        ErrorCode.INVALID_DEPLOY_ENV,
        `Invalid deploy environment '${envValue}'. Valid: ${validEnvs.join(', ')}`,
      );
    }
    return envValue as Environment;
  }

  protected setDeployEnvVars(env: Environment): void {
    core.exportVariable('DEPLOY_ENV', env);
    core.info(`Deploying to environment: ${env}`);
  }

  protected async onDefault(stage: StageConfig): Promise<void> {
    const env = this.resolveDeployEnvironment(stage);
    validateDeployForBranch(env, this.branchType, stage.deploy?.accounts);
    this.setDeployEnvVars(env);
    if (stage.commands && stage.commands.length > 0) {
      await this.execCommands(stage.commands, this._effectiveTools(stage));
    }
  }
}
