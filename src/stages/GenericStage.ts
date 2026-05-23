import { AbstractStage } from './base/AbstractStage';
import { StageConfig } from '../entities/StageConfig';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

export class GenericStage extends AbstractStage {
  async run(stage: StageConfig): Promise<void> {
    if (!stage.name) {
      throw new ActionsCoreLibError(ErrorCode.MISSING_STAGE_COMMANDS, 'Generic stage requires a name');
    }
    const end = this.startGroup(`generic: ${stage.name}`);
    try {
      if (stage.commands && stage.commands.length > 0) {
        await this.execCommands(stage.commands, this._effectiveTools(stage));
      }
    } finally {
      end();
    }
  }
}
