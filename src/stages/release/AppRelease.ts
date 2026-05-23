import * as core from '@actions/core';
import { AbstractReleaseStage } from './AbstractReleaseStage';
import { StageConfig } from '../../entities/StageConfig';
import { Environment } from '../../enums/Environment';
import { shortSHA } from '../../utils/ImageSHA';

export class AppRelease extends AbstractReleaseStage {
  protected async onMaster(stage: StageConfig): Promise<void> {
    core.info('AppRelease: promoting image to prod');
    await this.promoteImage(stage, Environment.PROD);
    await this.createGitTag();
  }

  protected async onDevelop(stage: StageConfig): Promise<void> {
    core.info('AppRelease: promoting image to dev');
    await this.promoteImage(stage, Environment.DEV);
  }

  protected async onRelease(stage: StageConfig): Promise<void> {
    core.info('AppRelease: promoting image to qa');
    await this.promoteImage(stage, Environment.QA);
  }

  protected async onPullRequest(_stage: StageConfig): Promise<void> {
    core.info('AppRelease: PR is a Trivy gate only — promotion happens after merge');
  }

  protected async onHotfix(_stage: StageConfig): Promise<void> {
    core.info('AppRelease: hotfix branch — image built, waiting for merge to master');
  }

  protected async onDefault(_stage: StageConfig): Promise<void> {
    core.info(`AppRelease: no release action for branch '${this.branchType}'`);
  }

  /**
   * Promotes the immutable sha tag to an environment mutable tag.
   *
   * Source:  ecr/myapp:sha-4f9c21a   (built on feature/hotfix branch)
   * Dest:    ecr/myapp:dev | qa | prod
   *
   * Uses ECR put-image (no layer transfer). All env tags always point to
   * the same digest — same artefact across every environment.
   */
  private async promoteImage(stage: StageConfig, env: Environment): Promise<void> {
    if (!stage.publish?.docker) {
      core.warning('No publish.docker config — skipping image promotion');
      return;
    }
    const docker  = stage.publish.docker;
    const shaTag  = `sha-${shortSHA(this.config.metadata.commitHash ?? '')}`;
    await this.archive.moveAndPublish(
      { ...docker, tag: shaTag },
      { ...docker, tag: env },
    );
    core.info(`Promoted ${docker.image}:${shaTag} → ${docker.image}:${env}`);
  }

  private async createGitTag(): Promise<void> {
    const version = this.config.metadata.version;
    const sha     = shortSHA(this.config.metadata.commitHash ?? '');
    const tag     = `v${version}-sha-${sha}`;
    const { execSync } = await import('child_process');
    core.info(`Creating git tag ${tag}`);
    execSync(`git tag ${tag}`);
    execSync(`git push origin ${tag}`);
  }
}
