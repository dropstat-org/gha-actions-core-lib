import { Artifact } from './Artifact';
export declare class GithubArtifact implements Artifact {
    private readonly artifactName;
    constructor(artifactName: string);
    upload(source: string, _destination: string): Promise<void>;
    move(source: string, destination: string): Promise<void>;
    checkFile(path: string): Promise<boolean>;
}
//# sourceMappingURL=GithubArtifact.d.ts.map