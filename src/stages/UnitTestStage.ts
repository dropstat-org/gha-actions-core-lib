import * as core from '@actions/core';
import { AbstractStage } from './base/AbstractStage';
import { StageConfig } from '../entities/StageConfig';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

export class UnitTestStage extends AbstractStage {
  async run(stage: StageConfig): Promise<void> {
    if (!stage.commands || stage.commands.length === 0) {
      throw new ActionsCoreLibError(ErrorCode.MISSING_STAGE_COMMANDS, `Stage '${stage.name}' requires at least one command`);
    }
    const end = this.startGroup(`unit_test: ${stage.name}`);
    try {
      await this.execCommands(stage.commands, this._effectiveTools(stage));
      if (stage.junitPath) {
        core.info(`JUnit results expected at: ${stage.junitPath}`);
      }
    } finally {
      end();
    }
  }
}
