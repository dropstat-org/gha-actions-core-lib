import { Environment } from '../enums/Environment';
export interface StageTools {
    java?: string;
    maven?: string;
    gradle?: string;
    node?: string;
    pnpm?: string;
    go?: string;
    python?: string;
    dotnet?: string;
}
export interface DockerArtifact {
    registry: 'ghcr' | 'ecr';
    image: string;
    tag?: string;
}
export interface DeployConfig {
    environment?: Environment | string;
    accounts?: string[];
}
export interface SonarConfig {
    args?: string[];
}
export interface TrivyConfig {
    scanType?: 'fs' | 'image';
    imageRef?: string;
}
export interface CheckovConfig {
    framework?: string;
    skipChecks?: string[];
    planFile?: string;
    softFail?: boolean;
    softFailPattern?: string;
    externalChecksDir?: string;
}
export interface SemgrepConfig {
    config?: string;
    args?: string[];
}
export interface PublishConfig {
    docker?: DockerArtifact;
}
export interface ArtifactUpload {
    name: string;
    path: string;
    retentionDays?: number;
}
export interface ArtifactDownload {
    name: string;
    path?: string;
}
export interface SummaryConfig {
    title?: string;
    file?: string;
    command?: string;
    format?: 'text' | 'hcl' | 'json' | 'diff' | 'bash';
}
export interface StageConfig {
    name: string;
    type?: string;
    commands?: string[];
    tools?: StageTools;
    env?: Record<string, string>;
    deploy?: DeployConfig;
    sonar?: SonarConfig;
    semgrep?: SemgrepConfig;
    trivy?: TrivyConfig;
    checkov?: CheckovConfig;
    publish?: PublishConfig;
    junitPath?: string;
    artifacts?: {
        upload?: ArtifactUpload[];
        download?: ArtifactDownload[];
    };
    summary?: SummaryConfig;
}
//# sourceMappingURL=StageConfig.d.ts.map