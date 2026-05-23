import * as core from '@actions/core';
import { DockerArtifact } from '../entities/StageConfig';
import { DockerGHCR } from '../artifacts/DockerGHCR';
import { DockerECR } from '../artifacts/DockerECR';
import { Artifact } from '../artifacts/Artifact';
import { Environment } from '../enums/Environment';

export class ArchiveManager {
  private artifact(config: DockerArtifact): Artifact {
    return config.registry === 'ecr' ? new DockerECR() : new DockerGHCR();
  }

  async packageAndUpload(localImage: string, config: DockerArtifact): Promise<void> {
    const dest = config.tag ? `${config.image}:${config.tag}` : config.image;
    core.info(`packageAndUpload: ${localImage} → ${dest}`);
    await this.artifact(config).upload(localImage, dest);
  }

  async moveAndPublish(source: DockerArtifact, destination: DockerArtifact): Promise<void> {
    const src = source.tag ? `${source.image}:${source.tag}` : source.image;
    const dest = destination.tag ? `${destination.image}:${destination.tag}` : destination.image;
    core.info(`moveAndPublish (promote without rebuild): ${src} → ${dest}`);
    await this.artifact(destination).move(src, dest);
  }

  async moveOrPackageAndUpload(localImage: string, config: DockerArtifact, sourceTag?: string): Promise<void> {
    const exists = await this.artifact(config).checkFile(
      sourceTag ? `${config.image}:${sourceTag}` : config.image,
    );
    if (exists && sourceTag) {
      await this.moveAndPublish({ ...config, tag: sourceTag }, config);
    } else {
      await this.packageAndUpload(localImage, config);
    }
  }

  async packageAndUploadToEnv(localImage: string, config: DockerArtifact, env: Environment): Promise<void> {
    const envTag = config.tag ? `${config.tag}-${env}` : env;
    core.info(`packageAndUploadToEnv → env=${env} tag=${envTag}`);
    await this.packageAndUpload(localImage, { ...config, tag: envTag });
  }
}
