import { AbstractDeployStage } from './AbstractDeployStage';
import { StageConfig } from '../../entities/StageConfig';

export class PostDeployStage extends AbstractDeployStage {
  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(`post_deploy: ${stage.name}`);
    try {
      await super.run(stage);
    } finally {
      end();
    }
  }
}
