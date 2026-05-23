import { Artifact } from './Artifact';
export declare class DockerECR implements Artifact {
    private accountId;
    private readonly region;
    private registry;
    constructor();
    /**
     * Resolves the AWS account ID from the environment or STS.
     * Falls back to aws sts get-caller-identity so users only need
     * to provide IAM credentials — AWS_ACCOUNT_ID is optional.
     */
    static resolveAccountId(region: string): Promise<string>;
    private ensureRegistry;
    login(): Promise<void>;
    upload(source: string, destination: string): Promise<void>;
    /**
     * Promotes an existing ECR image to a new tag using aws ecr put-image.
     * No docker daemon, no layer transfer — pure API call on the manifest.
     * This is the ECR equivalent of JFrog Artifactory virtual repo promotion.
     */
    move(source: string, destination: string): Promise<void>;
    /** Checks existence via ECR API — no docker daemon required. */
    checkFile(imageRef: string): Promise<boolean>;
    private fullRef;
    private parseRef;
}
//# sourceMappingURL=DockerECR.d.ts.map