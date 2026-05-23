import { AbstractStage } from '../base/AbstractStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class PublishStage extends AbstractStage {
    private archive;
    run(stage: StageConfig): Promise<void>;
    private buildImageRef;
    private deriveImage;
}
//# sourceMappingURL=PublishStage.d.ts.map