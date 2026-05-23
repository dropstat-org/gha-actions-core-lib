import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as fs from 'fs';
import { Artifact } from './Artifact';

export class GithubArtifact implements Artifact {
  private readonly artifactName: string;

  constructor(artifactName: string) {
    this.artifactName = artifactName;
  }

  async upload(source: string, _destination: string): Promise<void> {
    core.info(`Uploading artifact ${this.artifactName} from ${source}`);
    await exec.exec('gh', ['actions', 'upload-artifact', this.artifactName, '--path', source]);
  }

  async move(source: string, destination: string): Promise<void> {
    core.info(`Moving artifact from ${source} to ${destination}`);
    await exec.exec('cp', ['-r', source, destination]);
  }

  async checkFile(path: string): Promise<boolean> {
    return fs.existsSync(path);
  }
}
