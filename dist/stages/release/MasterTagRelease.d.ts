import { AbstractReleaseStage } from './AbstractReleaseStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class MasterTagRelease extends AbstractReleaseStage {
    protected onMaster(_stage: StageConfig): Promise<void>;
    protected onDefault(_stage: StageConfig): Promise<void>;
}
//# sourceMappingURL=MasterTagRelease.d.ts.map