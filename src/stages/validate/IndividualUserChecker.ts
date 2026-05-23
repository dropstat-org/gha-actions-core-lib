import * as core from '@actions/core';
import { ApprovalContext, ApproverChecker } from './ApproverChecker';

export class IndividualUserChecker implements ApproverChecker {
  constructor(private readonly users: string[]) {}

  async check(context: ApprovalContext): Promise<boolean> {
    const authorized = this.users.includes(context.actor);
    if (authorized) core.info(`✓ ${context.actor} authorized as individual approver`);
    return authorized;
  }

  describe(): string {
    return `individual user list [${this.users.join(', ')}]`;
  }
}
