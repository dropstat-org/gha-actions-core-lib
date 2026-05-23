import { ApprovalContext, ApproverChecker } from './ApproverChecker';
export declare class ApprovalValidator {
    private readonly checkers;
    constructor(checkers: ApproverChecker[]);
    validate(context: ApprovalContext): Promise<void>;
}
//# sourceMappingURL=ApprovalValidator.d.ts.map