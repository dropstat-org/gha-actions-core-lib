import { DockerArtifact } from '../entities/StageConfig';
import { Environment } from '../enums/Environment';
export declare class ArchiveManager {
    private artifact;
    packageAndUpload(localImage: string, config: DockerArtifact): Promise<void>;
    moveAndPublish(source: DockerArtifact, destination: DockerArtifact): Promise<void>;
    moveOrPackageAndUpload(localImage: string, config: DockerArtifact, sourceTag?: string): Promise<void>;
    packageAndUploadToEnv(localImage: string, config: DockerArtifact, env: Environment): Promise<void>;
}
//# sourceMappingURL=ArchiveManager.d.ts.map