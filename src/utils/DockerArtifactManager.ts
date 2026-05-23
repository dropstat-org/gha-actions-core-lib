import * as exec from '@actions/exec';
import * as core from '@actions/core';
import { DefaultArtifactClient } from '@actions/artifact';
import * as fs from 'fs';

const client = new DefaultArtifactClient();
const TMP_DIR = '/tmp/docker-artifacts';

export class DockerArtifactManager {
  static artifactName(shaTag: string): string {
    return `docker-image-${shaTag}`;
  }

  async save(imageRef: string, artifactName: string): Promise<void> {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const tarPath = `${TMP_DIR}/${artifactName}.tar.gz`;
    core.info(`Saving Docker image ${imageRef} → ${tarPath}`);
    await exec.exec('bash', ['-c', `docker save ${imageRef} | gzip > ${tarPath}`]);
    await client.uploadArtifact(artifactName, [tarPath], TMP_DIR, { retentionDays: 1 });
    core.info(`Artifact '${artifactName}' uploaded (1-day retention)`);
  }

  async load(artifactName: string): Promise<boolean> {
    try {
      const { artifact } = await client.getArtifact(artifactName);
      await client.downloadArtifact(artifact.id, { path: TMP_DIR });
      const tarPath = `${TMP_DIR}/${artifactName}.tar.gz`;
      if (!fs.existsSync(tarPath)) {
        core.info(`Artifact tar not found at ${tarPath} — will build from source`);
        return false;
      }
      await exec.exec('bash', ['-c', `docker load < ${tarPath}`]);
      core.info(`Docker image loaded from artifact '${artifactName}'`);
      return true;
    } catch {
      core.info(`Artifact '${artifactName}' not found — will build from source`);
      return false;
    }
  }
}
