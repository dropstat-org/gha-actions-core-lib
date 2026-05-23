import { AbstractDeployStage } from './AbstractDeployStage';
import { StageConfig } from '../../entities/StageConfig';

export class PreDeployStage extends AbstractDeployStage {
  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(`pre_deploy: ${stage.name}`);
    try {
      await super.run(stage);
    } finally {
      end();
    }
  }
}
