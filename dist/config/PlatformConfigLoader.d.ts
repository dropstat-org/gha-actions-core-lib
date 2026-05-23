export interface HotfixExceptionPolicy {
    allowed_repos: string[];
    skippable_stages: string[];
}
export interface DeployApproverPolicy {
    teams: string[];
    users: string[];
    min_permission: string;
}
export interface TrivyPolicy {
    severity: string;
    soft_fail: boolean;
    upload_sarif: boolean;
}
export interface CheckovPolicy {
    soft_fail: boolean;
    upload_sarif: boolean;
}
export interface SemgrepPolicy {
    default_config: string;
    soft_fail: boolean;
    upload_sarif: boolean;
}
export interface SecurityPolicyFile {
    trivy: TrivyPolicy;
    checkov: CheckovPolicy;
    semgrep: SemgrepPolicy;
}
export interface ToolVersionsFile {
    sonarqube_scanner: string;
    trivy: string;
    checkov: string;
    semgrep: string;
    terragrunt: string;
}
export declare class PlatformConfigLoader {
    static hotfixPolicy(): Promise<HotfixExceptionPolicy>;
    static deployPolicy(): Promise<Record<string, DeployApproverPolicy>>;
    static securityPolicy(): Promise<SecurityPolicyFile>;
    static toolVersions(): Promise<ToolVersionsFile>;
}
//# sourceMappingURL=PlatformConfigLoader.d.ts.map