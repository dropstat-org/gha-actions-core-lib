import { AbstractStage } from './base/AbstractStage';
import { StageConfig } from '../entities/StageConfig';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

export class LintStage extends AbstractStage {
  async run(stage: StageConfig): Promise<void> {
    if (!stage.commands || stage.commands.length === 0) {
      throw new ActionsCoreLibError(ErrorCode.MISSING_STAGE_COMMANDS, `Stage '${stage.name}' requires at least one command`);
    }
    const end = this.startGroup(`linter: ${stage.name}`);
    try {
      await this.execCommands(stage.commands, this._effectiveTools(stage));
    } finally {
      end();
    }
  }
}
