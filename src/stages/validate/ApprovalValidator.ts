import * as core from '@actions/core';
import { ApprovalContext, ApproverChecker } from './ApproverChecker';
import { ErrorCode } from '../../enums/ErrorCode';
import { ActionsCoreLibError } from '../../entities/ActionYaml';

export class ApprovalValidator {
  constructor(private readonly checkers: ApproverChecker[]) {}

  async validate(context: ApprovalContext): Promise<void> {
    for (const checker of this.checkers) {
      core.info(`Checking: ${checker.describe()}`);
      if (await checker.check(context)) return;
    }
    throw new ActionsCoreLibError(
      ErrorCode.APPROVER_NOT_AUTHORIZED,
      `${context.actor} is not authorized to approve deployments`,
    );
  }
}
