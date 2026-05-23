import { AbstractReleaseStage } from './AbstractReleaseStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class LibraryRelease extends AbstractReleaseStage {
    protected onMaster(stage: StageConfig): Promise<void>;
    protected onDevelop(stage: StageConfig): Promise<void>;
    protected onDefault(stage: StageConfig): Promise<void>;
    private runPublishCommands;
}
//# sourceMappingURL=LibraryRelease.d.ts.map