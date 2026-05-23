/**
 * Typed, auto-masking credential access.
 * Every value fetched via this class is registered with core.setSecret()
 * so it will never appear in plain text in GitHub Actions logs.
 */
export declare class Credentials {
    private static readonly masked;
    private static fetch;
    /** Throws if the credential is absent. */
    static require(name: string): string;
    /** Returns an empty string if the credential is absent (no error). */
    static optional(name: string): string;
    static githubToken(): string;
    static orgReadToken(): string;
    static sonarToken(): string;
    static ghToken(): string;
    static awsAccessKeyId(): string;
    static awsSecretAccessKey(): string;
}
//# sourceMappingURL=Credentials.d.ts.map