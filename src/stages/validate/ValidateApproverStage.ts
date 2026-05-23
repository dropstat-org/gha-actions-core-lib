import { ApproverChecker, ApprovalContext } from './ApproverChecker';
import { IndividualUserChecker } from './IndividualUserChecker';
import { TeamMembershipChecker } from './TeamMembershipChecker';
import { RepoPermissionChecker } from './RepoPermissionChecker';
import { ApprovalValidator } from './ApprovalValidator';
import { Credentials } from '../../utils/Credentials';
import { Env } from '../../utils/Env';
import { Logger } from '../../utils/Logger';
import { StageMessage } from '../../utils/StageMessage';

function splitList(value: string): string[] {
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export class ValidateApproverStage {
  static async run(): Promise<void> {
    const actor         = StageMessage.read('ACTOR') || Env.actor();
    const org           = StageMessage.read('ORG')   || Env.repositoryOwner();
    const repo          = StageMessage.read('REPO')  || Env.repository();
    const githubToken   = Credentials.ghToken();
    const orgReadToken  = Credentials.orgReadToken();
    const approverTeams = splitList(StageMessage.read('APPROVER_TEAMS'));
    const approverUsers = splitList(StageMessage.read('APPROVER_USERS'));
    const minPermission = StageMessage.read('MIN_PERMISSION');

    if (!approverTeams.length && !approverUsers.length && !minPermission) {
      Logger.warn('No approver policy configured — anyone can deploy');
      return;
    }

    const checkers: ApproverChecker[] = [];

    if (approverUsers.length) {
      checkers.push(new IndividualUserChecker(approverUsers));
    }

    if (orgReadToken && approverTeams.length) {
      Logger.info('Mode: team membership (ORG_READ_TOKEN available)');
      checkers.push(new TeamMembershipChecker(approverTeams, orgReadToken));
    } else {
      Logger.info('Mode: repo collaborator permission (GITHUB_TOKEN)');
      checkers.push(new RepoPermissionChecker(minPermission, githubToken));
    }

    const context: ApprovalContext = { actor, org, repo };
    await new ApprovalValidator(checkers).validate(context);
  }
}
