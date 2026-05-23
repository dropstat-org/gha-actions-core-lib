/**
 * Resolves the SHA of the commit that originally built the Docker image.
 *
 * GITHUB_SHA changes at every event (PR creates a simulated merge commit,
 * push-to-develop creates a new merge commit) — neither matches the feature
 * branch commit that was used to build and tag the image.
 *
 * Priority:
 *   1. IMAGE_SHA env var — workflow passes ${{ github.event.pull_request.head.sha }}
 *      explicitly for pull_request events where GITHUB_SHA is wrong.
 *   2. Second parent of a merge commit — resolves the feature/hotfix tip that
 *      was merged into develop/master.
 *   3. GITHUB_SHA — correct for feature/* and hotfix/* pushes (direct commits).
 */
export declare function resolveImageSHA(): string;
/** Returns the 7-char short form used in ECR tags (e.g. "sha-4f9c21a"). */
export declare function shortSHA(fullSHA: string): string;
//# sourceMappingURL=ImageSHA.d.ts.map