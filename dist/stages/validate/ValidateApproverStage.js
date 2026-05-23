"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateApproverStage = void 0;
const IndividualUserChecker_1 = require("./IndividualUserChecker");
const TeamMembershipChecker_1 = require("./TeamMembershipChecker");
const RepoPermissionChecker_1 = require("./RepoPermissionChecker");
const ApprovalValidator_1 = require("./ApprovalValidator");
const Credentials_1 = require("../../utils/Credentials");
const Env_1 = require("../../utils/Env");
const Logger_1 = require("../../utils/Logger");
const StageMessage_1 = require("../../utils/StageMessage");
function splitList(value) {
    return value.split(',').map(s => s.trim()).filter(Boolean);
}
class ValidateApproverStage {
    static async run() {
        const actor = StageMessage_1.StageMessage.read('ACTOR') || Env_1.Env.actor();
        const org = StageMessage_1.StageMessage.read('ORG') || Env_1.Env.repositoryOwner();
        const repo = StageMessage_1.StageMessage.read('REPO') || Env_1.Env.repository();
        const githubToken = Credentials_1.Credentials.ghToken();
        const orgReadToken = Credentials_1.Credentials.orgReadToken();
        const approverTeams = splitList(StageMessage_1.StageMessage.read('APPROVER_TEAMS'));
        const approverUsers = splitList(StageMessage_1.StageMessage.read('APPROVER_USERS'));
        const minPermission = StageMessage_1.StageMessage.read('MIN_PERMISSION');
        if (!approverTeams.length && !approverUsers.length && !minPermission) {
            Logger_1.Logger.warn('No approver policy configured — anyone can deploy');
            return;
        }
        const checkers = [];
        if (approverUsers.length) {
            checkers.push(new IndividualUserChecker_1.IndividualUserChecker(approverUsers));
        }
        if (orgReadToken && approverTeams.length) {
            Logger_1.Logger.info('Mode: team membership (ORG_READ_TOKEN available)');
            checkers.push(new TeamMembershipChecker_1.TeamMembershipChecker(approverTeams, orgReadToken));
        }
        else {
            Logger_1.Logger.info('Mode: repo collaborator permission (GITHUB_TOKEN)');
            checkers.push(new RepoPermissionChecker_1.RepoPermissionChecker(minPermission, githubToken));
        }
        const context = { actor, org, repo };
        await new ApprovalValidator_1.ApprovalValidator(checkers).validate(context);
    }
}
exports.ValidateApproverStage = ValidateApproverStage;
//# sourceMappingURL=ValidateApproverStage.js.map