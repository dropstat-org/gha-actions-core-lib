import * as exec from '@actions/exec';
import * as core from '@actions/core';
import { Artifact } from './Artifact';

export class DockerECR implements Artifact {
  private accountId: string;
  private readonly region: string;
  private registry: string;

  constructor() {
    this.accountId = process.env.AWS_ACCOUNT_ID?.trim() ?? '';
    this.region    = process.env.AWS_REGION?.trim() ?? 'us-east-1';
    this.registry  = this.accountId
      ? `${this.accountId}.dkr.ecr.${this.region}.amazonaws.com`
      : '';
  }

  /**
   * Resolves the AWS account ID from the environment or STS.
   * Falls back to aws sts get-caller-identity so users only need
   * to provide IAM credentials — AWS_ACCOUNT_ID is optional.
   */
  static async resolveAccountId(region: string): Promise<string> {
    const fromEnv = process.env.AWS_ACCOUNT_ID?.trim() ?? '';
    if (fromEnv) return fromEnv;

    let output = '';
    const code = await exec.exec('aws', [
      'sts', 'get-caller-identity',
      '--query', 'Account', '--output', 'text',
      '--region', region,
    ], {
      listeners: { stdout: (d: Buffer) => { output += d.toString(); } },
      ignoreReturnCode: true,
      silent: true,
    });
    const id = output.trim();
    if (code === 0 && id) core.info(`Auto-resolved AWS account ID from STS: ${id}`);
    return id;
  }

  private async ensureRegistry(): Promise<void> {
    if (this.registry) return;
    this.accountId = await DockerECR.resolveAccountId(this.region);
    if (!this.accountId) {
      throw new Error(
        'AWS_ACCOUNT_ID is not set and could not be resolved from STS. ' +
        'Provide it as a secret or ensure AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are set.',
      );
    }
    this.registry = `${this.accountId}.dkr.ecr.${this.region}.amazonaws.com`;
  }

  async login(): Promise<void> {
    await this.ensureRegistry();
    let password = '';
    await exec.exec('aws', ['ecr', 'get-login-password', '--region', this.region], {
      listeners: { stdout: (data: Buffer) => { password += data.toString(); } },
    });
    await exec.exec('docker', ['login', this.registry, '-u', 'AWS', '--password-stdin'], {
      input: Buffer.from(password.trim()),
    });
  }

  async upload(source: string, destination: string): Promise<void> {
    await this.ensureRegistry();
    const dest = this.fullRef(destination);
    core.info(`Pushing ${source} → ${dest}`);
    await exec.exec('docker', ['tag', source, dest]);
    await exec.exec('docker', ['push', dest]);
  }

  /**
   * Promotes an existing ECR image to a new tag using aws ecr put-image.
   * No docker daemon, no layer transfer — pure API call on the manifest.
   * This is the ECR equivalent of JFrog Artifactory virtual repo promotion.
   */
  async move(source: string, destination: string): Promise<void> {
    await this.ensureRegistry();
    const { repo, tag: srcTag } = this.parseRef(this.fullRef(source));
    const { tag: destTag }      = this.parseRef(this.fullRef(destination));

    core.info(`Promoting ECR ${repo}:${srcTag} → ${repo}:${destTag} (put-image, no layer transfer)`);

    let manifest = '';
    await exec.exec('aws', [
      'ecr', 'batch-get-image',
      '--region',          this.region,
      '--repository-name', repo,
      '--image-ids',       `imageTag=${srcTag}`,
      '--query',           'images[0].imageManifest',
      '--output',          'text',
    ], { listeners: { stdout: (d: Buffer) => { manifest += d.toString(); } } });

    manifest = manifest.trim();
    if (!manifest || manifest === 'None') {
      throw new Error(`ECR image not found: ${repo}:${srcTag}`);
    }

    await exec.exec('aws', [
      'ecr', 'put-image',
      '--region',          this.region,
      '--repository-name', repo,
      '--image-tag',       destTag,
      '--image-manifest',  manifest,
    ]);
  }

  /** Checks existence via ECR API — no docker daemon required. */
  async checkFile(imageRef: string): Promise<boolean> {
    await this.ensureRegistry();
    const { repo, tag } = this.parseRef(this.fullRef(imageRef));
    const code = await exec.exec('aws', [
      'ecr', 'describe-images',
      '--region',          this.region,
      '--repository-name', repo,
      '--image-ids',       `imageTag=${tag}`,
    ], { ignoreReturnCode: true });
    return code === 0;
  }

  private fullRef(ref: string): string {
    if (ref.startsWith(this.registry)) return ref;
    return `${this.registry}/${ref}`;
  }

  private parseRef(fullRef: string): { repo: string; tag: string } {
    const withoutRegistry = fullRef.startsWith(this.registry + '/')
      ? fullRef.slice(this.registry.length + 1)
      : fullRef;
    const colonIdx = withoutRegistry.lastIndexOf(':');
    if (colonIdx === -1) return { repo: withoutRegistry, tag: 'latest' };
    return {
      repo: withoutRegistry.slice(0, colonIdx),
      tag:  withoutRegistry.slice(colonIdx + 1),
    };
  }
}
