export interface ApprovalContext {
    actor: string;
    org: string;
    repo: string;
}
export interface ApproverChecker {
    check(context: ApprovalContext): Promise<boolean>;
    describe(): string;
}
//# sourceMappingURL=ApproverChecker.d.ts.map