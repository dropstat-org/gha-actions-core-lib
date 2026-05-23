import { StageConfig } from '../entities/StageConfig';
import { StageName } from '../enums/StageName';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

const KNOWN_STAGE_TYPES = new Set<string>(Object.values(StageName));

export class StageValidator {
  static validate(stages: StageConfig[]): void {
    for (const stage of stages) {
      if (!stage.name) {
        throw new ActionsCoreLibError(ErrorCode.INVALID_STAGE_TYPE, 'Each stage must have a name');
      }
      if (stage.type && !KNOWN_STAGE_TYPES.has(stage.type)) {
        throw new ActionsCoreLibError(
          ErrorCode.INVALID_STAGE_TYPE,
          `Unknown stage type '${stage.type}' for stage '${stage.name}'`,
        );
      }
    }
  }
}
