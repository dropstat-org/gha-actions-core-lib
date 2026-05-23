import { ApprovalContext, ApproverChecker } from './ApproverChecker';
export declare class RepoPermissionChecker implements ApproverChecker {
    private readonly minPermission;
    private readonly githubToken;
    constructor(minPermission: string, githubToken: string);
    check(context: ApprovalContext): Promise<boolean>;
    describe(): string;
}
//# sourceMappingURL=RepoPermissionChecker.d.ts.map