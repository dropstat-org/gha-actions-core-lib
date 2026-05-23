import * as core from '@actions/core';
import * as globModule from '@actions/glob';
import { DefaultArtifactClient } from '@actions/artifact';
import * as path from 'path';
import { ArtifactUpload, ArtifactDownload } from '../entities/StageConfig';

const client = new DefaultArtifactClient();

export class ArtifactHandler {
  async upload(uploads: ArtifactUpload[]): Promise<void> {
    for (const upload of uploads) {
      const globber = await globModule.create(upload.path);
      const files   = await globber.glob();

      if (files.length === 0) {
        core.warning(`artifact upload '${upload.name}': no files matched '${upload.path}'`);
        continue;
      }

      // Raíz común para que los paths dentro del artifact sean relativos
      const rootDir = files.length === 1 && !upload.path.includes('*')
        ? path.dirname(files[0])
        : process.cwd();

      core.info(`Uploading artifact '${upload.name}' (${files.length} file(s))`);
      await client.uploadArtifact(upload.name, files, rootDir, {
        retentionDays: upload.retentionDays,
      });
    }
  }

  async download(downloads: ArtifactDownload[]): Promise<void> {
    for (const dl of downloads) {
      core.info(`Downloading artifact '${dl.name}'`);
      const { artifact } = await client.getArtifact(dl.name);
      await client.downloadArtifact(artifact.id, {
        path: dl.path ?? process.cwd(),
      });
    }
  }
}
