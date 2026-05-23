import { AbstractBranchStage } from '../base/AbstractBranchStage';
import { ArchiveManager } from '../../archive/ArchiveManager';
import { ActionYaml } from '../../entities/ActionYaml';
import { BranchType } from '../../enums/BranchType';

export abstract class AbstractReleaseStage extends AbstractBranchStage {
  protected archive: ArchiveManager;

  constructor(config: ActionYaml, branchType: BranchType) {
    super(config, branchType);
    this.archive = new ArchiveManager();
  }
}
