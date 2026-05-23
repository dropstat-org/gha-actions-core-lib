/**
 * Typed access to environment variables, with named accessors
 * for all standard GitHub Actions context variables.
 */
export declare class Env {
    /** Returns the value or fallback (default: ''). Never throws. */
    static get(name: string, fallback?: string): string;
    /** Returns the value or throws if absent. */
    static require(name: string): string;
    /** Full SHA of the commit that triggered the workflow. */
    static sha(): string;
    /** Full ref: refs/heads/main, refs/pull/123/merge, etc. */
    static ref(): string;
    /** Short ref name: main, feature/foo, v1.0.0, etc. */
    static refName(): string;
    /** Username of the person or app that triggered the workflow. */
    static actor(): string;
    /** owner/repo — e.g. dropstat/terraform-null */
    static repository(): string;
    /** Organisation or user that owns the repository. */
    static repositoryOwner(): string;
    /** Absolute path to the checked-out repository on the runner. */
    static workspace(): string;
    /** Event that triggered the workflow: push, pull_request, workflow_dispatch, etc. */
    static eventName(): string;
    /** Unique ID of the workflow run. */
    static runId(): string;
    /** Sequential run number within this workflow. */
    static runNumber(): string;
    /** GitHub server URL (https://github.com for public). */
    static serverUrl(): string;
    /** Source branch of a pull_request event. */
    static headRef(): string;
    /** Target branch of a pull_request event. */
    static baseRef(): string;
    /** Splits GITHUB_REPOSITORY into { owner, name }. */
    static repositoryParts(): {
        owner: string;
        name: string;
    };
    /** URL to this run's summary page. */
    static runUrl(): string;
}
//# sourceMappingURL=Env.d.ts.map