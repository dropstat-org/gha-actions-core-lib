import * as exec from '@actions/exec';
import * as core from '@actions/core';
import { Artifact } from './Artifact';

export class DockerGHCR implements Artifact {
  private readonly registry: string;
  private readonly token: string;
  private readonly username: string;

  constructor(registry = 'ghcr.io') {
    this.registry = registry;
    this.token = process.env.GITHUB_TOKEN ?? '';
    this.username = process.env.GITHUB_ACTOR ?? '';
  }

  async login(): Promise<void> {
    await exec.exec('docker', [
      'login', this.registry,
      '-u', this.username,
      '--password-stdin',
    ], {
      input: Buffer.from(this.token),
    });
  }

  async upload(source: string, destination: string): Promise<void> {
    await this.login();
    const dest = this.fullRef(destination);
    core.info(`Pushing ${source} → ${dest}`);
    await exec.exec('docker', ['tag', source, dest]);
    await exec.exec('docker', ['push', dest]);
  }

  async move(source: string, destination: string): Promise<void> {
    await this.login();
    const src = this.fullRef(source);
    const dest = this.fullRef(destination);
    core.info(`Promoting ${src} → ${dest}`);
    await exec.exec('docker', ['pull', src]);
    await exec.exec('docker', ['tag', src, dest]);
    await exec.exec('docker', ['push', dest]);
  }

  async checkFile(imageRef: string): Promise<boolean> {
    const ref = this.fullRef(imageRef);
    const result = await exec.exec('docker', ['manifest', 'inspect', ref], { ignoreReturnCode: true });
    return result === 0;
  }

  private fullRef(ref: string): string {
    if (ref.startsWith(this.registry)) return ref;
    return `${this.registry}/${ref}`;
  }
}
