/**
 * Typed access to environment variables, with named accessors
 * for all standard GitHub Actions context variables.
 */
export class Env {
  /** Returns the value or fallback (default: ''). Never throws. */
  static get(name: string, fallback = ''): string {
    return process.env[name] ?? fallback;
  }

  /** Returns the value or throws if absent. */
  static require(name: string): string {
    const value = process.env[name] ?? '';
    if (!value) throw new Error(`Required environment variable '${name}' is not set`);
    return value;
  }

  // ── GitHub Actions standard variables ────────────────────────────────────

  /** Full SHA of the commit that triggered the workflow. */
  static sha(): string            { return this.get('GITHUB_SHA'); }

  /** Full ref: refs/heads/main, refs/pull/123/merge, etc. */
  static ref(): string            { return this.get('GITHUB_REF'); }

  /** Short ref name: main, feature/foo, v1.0.0, etc. */
  static refName(): string        { return this.get('GITHUB_REF_NAME'); }

  /** Username of the person or app that triggered the workflow. */
  static actor(): string          { return this.get('GITHUB_ACTOR'); }

  /** owner/repo — e.g. dropstat/terraform-null */
  static repository(): string     { return this.get('GITHUB_REPOSITORY'); }

  /** Organisation or user that owns the repository. */
  static repositoryOwner(): string { return this.get('GITHUB_REPOSITORY_OWNER'); }

  /** Absolute path to the checked-out repository on the runner. */
  static workspace(): string      { return this.get('GITHUB_WORKSPACE', '.'); }

  /** Event that triggered the workflow: push, pull_request, workflow_dispatch, etc. */
  static eventName(): string      { return this.get('GITHUB_EVENT_NAME'); }

  /** Unique ID of the workflow run. */
  static runId(): string          { return this.get('GITHUB_RUN_ID'); }

  /** Sequential run number within this workflow. */
  static runNumber(): string      { return this.get('GITHUB_RUN_NUMBER'); }

  /** GitHub server URL (https://github.com for public). */
  static serverUrl(): string      { return this.get('GITHUB_SERVER_URL', 'https://github.com'); }

  /** Source branch of a pull_request event. */
  static headRef(): string        { return this.get('GITHUB_HEAD_REF'); }

  /** Target branch of a pull_request event. */
  static baseRef(): string        { return this.get('GITHUB_BASE_REF'); }

  // ── Convenience helpers ──────────────────────────────────────────────────

  /** Splits GITHUB_REPOSITORY into { owner, name }. */
  static repositoryParts(): { owner: string; name: string } {
    const [owner = '', name = ''] = this.repository().split('/');
    return { owner, name };
  }

  /** URL to this run's summary page. */
  static runUrl(): string {
    return `${this.serverUrl()}/${this.repository()}/actions/runs/${this.runId()}`;
  }
}
