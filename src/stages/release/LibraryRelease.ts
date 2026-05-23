import * as core from '@actions/core';
import { AbstractReleaseStage } from './AbstractReleaseStage';
import { StageConfig } from '../../entities/StageConfig';
import { BranchType } from '../../enums/BranchType';

export class LibraryRelease extends AbstractReleaseStage {
  protected async onMaster(stage: StageConfig): Promise<void> {
    core.info('LibraryRelease: publishing release to package registry');
    await this.runPublishCommands(stage, 'release');
  }

  protected async onDevelop(stage: StageConfig): Promise<void> {
    core.info('LibraryRelease: publishing snapshot to package registry');
    await this.runPublishCommands(stage, 'snapshot');
  }

  protected async onDefault(stage: StageConfig): Promise<void> {
    core.info(`LibraryRelease: no publish for branch '${this.branchType}'`);
  }

  private async runPublishCommands(stage: StageConfig, releaseType: string): Promise<void> {
    const env = { ...process.env, RELEASE_TYPE: releaseType };
    if (stage.commands && stage.commands.length > 0) {
      for (const cmd of stage.commands) {
        const { execSync } = await import('child_process');
        core.info(`$ ${cmd}`);
        execSync(cmd, { env, stdio: 'inherit' });
      }
    }
  }
}
