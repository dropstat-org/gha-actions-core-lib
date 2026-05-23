export interface Artifact {
  upload(source: string, destination: string): Promise<void>;
  move(source: string, destination: string): Promise<void>;
  checkFile(path: string): Promise<boolean>;
}
