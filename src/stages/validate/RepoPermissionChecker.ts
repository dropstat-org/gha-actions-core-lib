import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { ApprovalContext, ApproverChecker } from './ApproverChecker';

// Ordered from highest to lowest — a lower index means more privilege.
const PERMISSION_LEVELS = ['admin', 'maintain', 'write', 'read', 'none'] as const;

function permissionRank(permission: string): number {
  return PERMISSION_LEVELS.indexOf(permission as typeof PERMISSION_LEVELS[number]);
}

export class RepoPermissionChecker implements ApproverChecker {
  constructor(
    private readonly minPermission: string,
    private readonly githubToken: string,
  ) {}

  async check(context: ApprovalContext): Promise<boolean> {
    const [owner, repo] = context.repo.split('/');
    const octokit = getOctokit(this.githubToken);
    const required = this.minPermission || 'maintain';

    let permission: string;
    try {
      const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
        owner,
        repo,
        username: context.actor,
      });
      permission = data.permission;
    } catch {
      permission = 'none';
    }

    core.info(`Actor: ${context.actor} | Permission: ${permission} | Required: ${required}+`);

    const actorRank = permissionRank(permission);
    const minRank   = permissionRank(required);

    if (actorRank < 0 || minRank < 0) return false;

    const authorized = actorRank <= minRank;
    if (authorized) core.info(`✓ ${context.actor} authorized (permission: ${permission} >= ${required})`);
    else            core.info(`✗ ${context.actor} not authorized — has '${permission}', needs '${required}' or higher`);

    return authorized;
  }

  describe(): string {
    return `repo collaborator permission (>= ${this.minPermission || 'maintain'})`;
  }
}
