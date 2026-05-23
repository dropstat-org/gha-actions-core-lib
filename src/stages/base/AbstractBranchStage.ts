import * as core from '@actions/core';
import { AbstractStage } from './AbstractStage';
import { ActionYaml } from '../../entities/ActionYaml';
import { StageConfig } from '../../entities/StageConfig';
import { BranchType } from '../../enums/BranchType';
import { Environment } from '../../enums/Environment';

export abstract class AbstractBranchStage extends AbstractStage {
  protected branchType: BranchType;
  protected environment: Environment;

  constructor(config: ActionYaml, branchType: BranchType) {
    super(config);
    this.branchType  = branchType;
    this.environment = this.resolveEnvironment(branchType);
  }

  private resolveEnvironment(branch: BranchType): Environment {
    switch (branch) {
      case BranchType.MASTER:           return Environment.PROD;
      case BranchType.DEVELOP:          return Environment.DEV;
      case BranchType.RELEASE:          return Environment.QA;
      case BranchType.PULL_REQUEST:     return Environment.QA;
      default:                          return Environment.DEV;
    }
  }

  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(stage.name);
    try {
      switch (this.branchType) {
        case BranchType.MASTER:            await this.onMaster(stage);       break;
        case BranchType.DEVELOP:           await this.onDevelop(stage);      break;
        case BranchType.RELEASE:           await this.onRelease(stage);      break;
        case BranchType.PULL_REQUEST:      await this.onPullRequest(stage);  break;
        case BranchType.HOTFIX:
        case BranchType.HOTFIX_EMERGENCY:  await this.onHotfix(stage);       break;
        default:                           await this.onFeature(stage);       break;
      }
    } finally {
      end();
    }
  }

  protected async onMaster(stage: StageConfig): Promise<void> {
    core.info(`Branch 'master': running default for stage '${stage.name}'`);
    await this.onDefault(stage);
  }

  protected async onDevelop(stage: StageConfig): Promise<void> {
    core.info(`Branch 'develop': running default for stage '${stage.name}'`);
    await this.onDefault(stage);
  }

  protected async onRelease(stage: StageConfig): Promise<void> {
    core.info(`Branch 'release': running default for stage '${stage.name}'`);
    await this.onDefault(stage);
  }

  protected async onFeature(stage: StageConfig): Promise<void> {
    core.info(`Branch 'feature': running default for stage '${stage.name}'`);
    await this.onDefault(stage);
  }

  protected async onHotfix(stage: StageConfig): Promise<void> {
    core.info(`Branch 'hotfix': running default for stage '${stage.name}'`);
    await this.onDefault(stage);
  }

  protected async onPullRequest(stage: StageConfig): Promise<void> {
    core.info(`Branch 'pullRequest': running default for stage '${stage.name}'`);
    await this.onDefault(stage);
  }

  protected abstract onDefault(stage: StageConfig): Promise<void>;
}
