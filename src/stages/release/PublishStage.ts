import * as core from '@actions/core';
import { AbstractStage } from '../base/AbstractStage';
import { StageConfig } from '../../entities/StageConfig';
import { ArchiveManager } from '../../archive/ArchiveManager';
import { StageMessage, StageOutputKey } from '../../utils/StageMessage';
import { shortSHA } from '../../utils/ImageSHA';

export class PublishStage extends AbstractStage {
  private archive = new ArchiveManager();

  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(`publish: ${stage.name}`);
    try {
      const registry   = stage.publish?.docker?.registry ?? 'ghcr';
      const image      = stage.publish?.docker?.image ?? this.deriveImage();
      const fullSHA    = this.config.metadata.commitHash ?? 'unknown';
      const shaTag     = `sha-${shortSHA(fullSHA)}`;
      const version    = this.config.metadata.version;
      const versionTag = `v${version}-${shaTag}`;

      // Export OCI metadata so docker build commands in stage.commands can use them
      StageMessage.exportEnv('IMAGE_TAG',    shaTag);
      StageMessage.exportEnv('IMAGE_VERSION', versionTag);
      StageMessage.exportEnv('ARTIFACT_ID',  this.config.metadata.artifactId ?? '');
      StageMessage.exportEnv('OCI_REVISION', fullSHA);
      StageMessage.exportEnv('OCI_VERSION',  version);
      StageMessage.exportEnv('OCI_SOURCE',   process.env.GITHUB_REPOSITORY ?? '');

      if (stage.commands && stage.commands.length > 0) {
        core.info('Running build commands');
        await this.execCommands(stage.commands, this._effectiveTools(stage));
      }

      const localImage = `${this.config.metadata.artifactId}:${shaTag}`;

      // Push sha tag — the canonical immutable reference
      await this.archive.packageAndUpload(localImage, { registry, image, tag: shaTag });

      // Push version tag pointing to same digest (put-image for ECR, retag for GHCR)
      await this.archive.moveAndPublish(
        { registry, image, tag: shaTag },
        { registry, image, tag: versionTag },
      );

      const imageRef = this.buildImageRef(registry, image, shaTag);
      StageMessage.emit(StageOutputKey.IMAGE_TAG,     shaTag);
      StageMessage.emit(StageOutputKey.IMAGE_VERSION, versionTag);
      StageMessage.emit(StageOutputKey.IMAGE_REF,     imageRef);
    } finally {
      end();
    }
  }

  private buildImageRef(registry: string, image: string, tag: string): string {
    if (registry === 'ecr') {
      const accountId = process.env.AWS_ACCOUNT_ID ?? '';
      const region    = process.env.AWS_REGION ?? 'us-east-1';
      return `${accountId}.dkr.ecr.${region}.amazonaws.com/${image}:${tag}`;
    }
    return `ghcr.io/${image}:${tag}`;
  }

  private deriveImage(): string {
    const repo = process.env.GITHUB_REPOSITORY ?? this.config.metadata.artifactId ?? 'unknown';
    return repo.toLowerCase();
  }
}
