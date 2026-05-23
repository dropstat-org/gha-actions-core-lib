import { Artifact } from './Artifact';
export declare class DockerGHCR implements Artifact {
    private readonly registry;
    private readonly token;
    private readonly username;
    constructor(registry?: string);
    login(): Promise<void>;
    upload(source: string, destination: string): Promise<void>;
    move(source: string, destination: string): Promise<void>;
    checkFile(imageRef: string): Promise<boolean>;
    private fullRef;
}
//# sourceMappingURL=DockerGHCR.d.ts.map