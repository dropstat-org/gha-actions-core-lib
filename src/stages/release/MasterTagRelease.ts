import * as core from '@actions/core';
import { AbstractReleaseStage } from './AbstractReleaseStage';
import { StageConfig } from '../../entities/StageConfig';

export class MasterTagRelease extends AbstractReleaseStage {
  protected async onMaster(_stage: StageConfig): Promise<void> {
    const tag = `v${this.config.metadata.version}`;
    core.info(`MasterTagRelease: creating git tag ${tag}`);
    const { execSync } = await import('child_process');
    execSync(`git tag ${tag}`);
    execSync(`git push origin ${tag}`);
  }

  protected async onDefault(_stage: StageConfig): Promise<void> {
    core.info(`MasterTagRelease: no action for branch '${this.branchType}'`);
  }
}
