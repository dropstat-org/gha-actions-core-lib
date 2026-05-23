import * as core from '@actions/core';
import { ActionsCoreLibError } from '../../entities/ActionYaml';
import { ErrorCode } from '../../enums/ErrorCode';

export class ValidateConfirmStage {
  static run(): void {
    const confirm     = process.env.CONFIRM     ?? '';
    const environment = process.env.ENVIRONMENT ?? '';

    if (confirm !== 'deploy') {
      throw new ActionsCoreLibError(
        ErrorCode.INVALID_CONFIRM,
        `Confirmation must be exactly 'deploy', received: '${confirm}'`,
      );
    }

    core.info(`Confirmation valid — proceeding with deploy to ${environment}`);
  }
}
