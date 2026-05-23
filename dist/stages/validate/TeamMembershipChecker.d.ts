import { ApprovalContext, ApproverChecker } from './ApproverChecker';
export declare class TeamMembershipChecker implements ApproverChecker {
    private readonly teams;
    private readonly orgReadToken;
    constructor(teams: string[], orgReadToken: string);
    check(context: ApprovalContext): Promise<boolean>;
    describe(): string;
}
//# sourceMappingURL=TeamMembershipChecker.d.ts.map