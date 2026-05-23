import { AbstractReleaseStage } from './AbstractReleaseStage';
import { StageConfig } from '../../entities/StageConfig';
export declare class AppRelease extends AbstractReleaseStage {
    protected onMaster(stage: StageConfig): Promise<void>;
    protected onDevelop(stage: StageConfig): Promise<void>;
    protected onRelease(stage: StageConfig): Promise<void>;
    protected onPullRequest(_stage: StageConfig): Promise<void>;
    protected onHotfix(_stage: StageConfig): Promise<void>;
    protected onDefault(_stage: StageConfig): Promise<void>;
    /**
     * Promotes the immutable sha tag to an environment mutable tag.
     *
     * Source:  ecr/myapp:sha-4f9c21a   (built on feature/hotfix branch)
     * Dest:    ecr/myapp:dev | qa | prod
     *
     * Uses ECR put-image (no layer transfer). All env tags always point to
     * the same digest — same artefact across every environment.
     */
    private promoteImage;
    private createGitTag;
}
//# sourceMappingURL=AppRelease.d.ts.map