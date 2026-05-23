import { ApprovalContext, ApproverChecker } from './ApproverChecker';
export declare class IndividualUserChecker implements ApproverChecker {
    private readonly users;
    constructor(users: string[]);
    check(context: ApprovalContext): Promise<boolean>;
    describe(): string;
}
//# sourceMappingURL=IndividualUserChecker.d.ts.map