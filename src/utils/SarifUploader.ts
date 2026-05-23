import * as zlib from 'zlib';
import { getOctokit } from '@actions/github';
import { Credentials } from './Credentials';
import { Env } from './Env';
import { FileUtil } from './FileUtil';
import { Logger } from './Logger';

export async function uploadSarif(sarifFile: string): Promise<void> {
  if (!FileUtil.exists(sarifFile)) {
    Logger.warn(`SARIF file not found: ${sarifFile} — skipping upload`);
    return;
  }

  const token = Credentials.ghToken();
  if (!token) {
    Logger.warn('SARIF upload skipped — GH_TOKEN not set or GitHub Advanced Security not enabled');
    return;
  }

  const { owner, name: repo } = Env.repositoryParts();
  const commitSha = Env.sha();
  const ref       = Env.ref();

  try {
    const sarif = zlib.gzipSync(FileUtil.readBuffer(sarifFile)).toString('base64');

    const octokit = getOctokit(token);
    await octokit.request('POST /repos/{owner}/{repo}/code-scanning/sarifs', {
      owner,
      repo,
      commit_sha: commitSha,
      ref,
      sarif,
    });

    Logger.info(`Security report: ${Env.serverUrl()}/${owner}/${repo}/security/code-scanning`);
  } catch (err) {
    Logger.warn(`SARIF upload skipped — requires GitHub Advanced Security on private repos (${(err as Error).message})`);
  }
}
