import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { ApprovalContext, ApproverChecker } from './ApproverChecker';

export class TeamMembershipChecker implements ApproverChecker {
  constructor(
    private readonly teams: string[],
    private readonly orgReadToken: string,
  ) {}

  async check(context: ApprovalContext): Promise<boolean> {
    const octokit = getOctokit(this.orgReadToken);

    for (const team of this.teams) {
      try {
        const { data } = await octokit.rest.teams.getMembershipForUserInOrg({
          org: context.org,
          team_slug: team.trim(),
          username: context.actor,
        });
        if (data.state === 'active') {
          core.info(`✓ ${context.actor} authorized via team: ${team}`);
          return true;
        }
      } catch {
        // 404 = not a member of this team, try the next one
      }
    }

    core.info(`✗ ${context.actor} is not a member of any authorized team: [${this.teams.join(', ')}]`);
    return false;
  }

  describe(): string {
    return `team membership (ORG_READ_TOKEN) [${this.teams.join(', ')}]`;
  }
}
