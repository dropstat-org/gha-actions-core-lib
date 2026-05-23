import * as core from '@actions/core';

/**
 * Typed, auto-masking credential access.
 * Every value fetched via this class is registered with core.setSecret()
 * so it will never appear in plain text in GitHub Actions logs.
 */
export class Credentials {
  private static readonly masked = new Set<string>();

  private static fetch(name: string, required: boolean): string {
    const value = process.env[name] ?? '';
    if (required && !value) {
      throw new Error(
        `Required credential '${name}' is not set. ` +
        `Add it as a repository or organisation secret.`,
      );
    }
    if (value && !this.masked.has(name)) {
      core.setSecret(value);
      this.masked.add(name);
    }
    return value;
  }

  /** Throws if the credential is absent. */
  static require(name: string): string {
    return this.fetch(name, true);
  }

  /** Returns an empty string if the credential is absent (no error). */
  static optional(name: string): string {
    return this.fetch(name, false);
  }

  // ── Well-known credentials ──────────────────────────────────────────────

  static githubToken(): string  { return this.require('GITHUB_TOKEN'); }
  static orgReadToken(): string { return this.optional('ORG_READ_TOKEN'); }
  static sonarToken(): string   { return this.optional('SONAR_TOKEN'); }
  static ghToken(): string {
    // Prefer explicit GH_TOKEN override (set in step env) over GITHUB_TOKEN
    return this.optional('GH_TOKEN') || this.require('GITHUB_TOKEN');
  }
  static awsAccessKeyId(): string     { return this.optional('AWS_ACCESS_KEY_ID'); }
  static awsSecretAccessKey(): string { return this.optional('AWS_SECRET_ACCESS_KEY'); }
}
