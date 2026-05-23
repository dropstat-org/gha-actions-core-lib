"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveImageSHA = resolveImageSHA;
exports.shortSHA = shortSHA;
const child_process_1 = require("child_process");
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
function resolveImageSHA() {
    if (process.env.IMAGE_SHA)
        return process.env.IMAGE_SHA;
    const sha = process.env.GITHUB_SHA ?? '';
    if (!sha)
        return '';
    const secondParent = getSecondParent(sha);
    return secondParent ?? sha;
}
/** Returns the 7-char short form used in ECR tags (e.g. "sha-4f9c21a"). */
function shortSHA(fullSHA) {
    return fullSHA.slice(0, 7);
}
function getSecondParent(sha) {
    try {
        const output = (0, child_process_1.execSync)(`git log --pretty=%P -n 1 ${sha}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
        const parents = output.split(' ').filter(Boolean);
        return parents.length >= 2 ? parents[1] : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=ImageSHA.js.map