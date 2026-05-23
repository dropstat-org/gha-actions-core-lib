import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
import { ErrorCode } from '../../enums/ErrorCode';
import { PlatformConfigLoader } from '../../config/PlatformConfigLoader';
import { uploadSarif } from '../../utils/SarifUploader';
import { shortSHA } from '../../utils/ImageSHA';
import { DockerECR } from '../../artifacts/DockerECR';
import { StageMessage } from '../../utils/StageMessage';
import { DockerArtifactManager } from '../../utils/DockerArtifactManager';

export class TrivyStage extends AbstractAnalyzerStage {
  protected resultMap(): ResultMap {
    return { 0: 'success', 1: 'failure' };
  }

  _effectiveTools(_stage: StageConfig) {
    return undefined;
  }

  private async install(version: string): Promise<void> {
    core.info(`Installing Trivy ${version}...`);
    const tarball = `trivy_${version}_Linux-64bit.tar.gz`;
    const url = `https://github.com/aquasecurity/trivy/releases/download/v${version}/${tarball}`;
    await exec.exec('curl', ['-sfL', '-o', `/tmp/${tarball}`, url]);
    await exec.exec('tar', ['-xzf', `/tmp/${tarball}`, '-C', '/usr/local/bin', 'trivy']);
  }

  /**
   * Resolves the ECR image ref from the publish stage config + resolved commitHash.
   * Used on PR / develop / release / master where the image was already pushed to ECR
   * by the feature branch build — no local docker build needed.
   *
   * AWS_ACCOUNT_ID is optional: falls back to aws sts get-caller-identity when
   * only IAM credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are provided.
   */
  private async resolveECRImageRef(): Promise<string | null> {
    const publishStage = this.config.stages?.find(s => s.name === 'publish');
    const docker = publishStage?.publish?.docker;
    if (!docker || docker.registry !== 'ecr') return null;

    const region    = process.env.AWS_REGION?.trim() ?? 'us-east-1';
    const accountId = await DockerECR.resolveAccountId(region);
    if (!accountId) return null;

    const sha = `sha-${shortSHA(this.config.metadata.commitHash ?? '')}`;
    return `${accountId}.dkr.ecr.${region}.amazonaws.com/${docker.image}:${sha}`;
  }

  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(`trivy: ${stage.name}`);
    try {
      const { severity: SEVERITY, soft_fail: SOFT_FAIL, upload_sarif: UPLOAD_SARIF } =
        (await PlatformConfigLoader.securityPolicy()).trivy;
      const { trivy: trivyVersion } = await PlatformConfigLoader.toolVersions();

      await this.install(trivyVersion);

      let scanType = stage.trivy?.scanType ?? 'fs';
      let imageRef = stage.trivy?.imageRef;
      let localShaTag: string | undefined;

      // When there are build commands and a docker publish config, auto-switch to
      // image scan: export IMAGE_TAG, run the build commands, then scan the local image.
      const publishStage = this.config.stages?.find(s => s.name === 'publish');
      const hasDockerConfig = !!publishStage?.publish?.docker;
      const hasBuildCommands = !!stage.commands?.length;

      if (hasBuildCommands && hasDockerConfig && scanType === 'fs' && !imageRef) {
        localShaTag = `sha-${shortSHA(this.config.metadata.commitHash ?? '')}`;
        StageMessage.exportEnv('IMAGE_TAG', localShaTag);
        await this.execCommands(stage.commands!, this._effectiveTools(stage));
        scanType = 'image';
        imageRef = `${this.config.metadata.artifactId}:${localShaTag}`;
        core.info(`Scanning locally-built image: ${imageRef}`);
      }

      // Auto-resolve ECR image ref when scanType=image and no explicit imageRef.
      if (scanType === 'image' && !imageRef) {
        const resolved = await this.resolveECRImageRef();
        if (resolved) {
          core.info(`Auto-resolved ECR image for Trivy scan: ${resolved}`);
          imageRef = resolved;
        } else {
          core.setFailed(`[${ErrorCode.MISSING_IMAGE_REF}] trivy image scan requires trivy.imageRef or a publish stage with ECR config`);
          return;
        }
      }

      const target = scanType === 'image' ? imageRef! : '.';

      const code = await exec.exec('trivy', [
        scanType,
        '--format',    'table',
        '--severity',  SEVERITY,
        '--exit-code', SOFT_FAIL ? '0' : '1',
        target,
      ], { ignoreReturnCode: true });

      this.handleResult(this.mapResult(code), stage.name, SOFT_FAIL);

      // Save the locally-built image as artifact so Publish can load it without rebuilding.
      // Only save when scan passed (or soft_fail — publish will still run in both cases).
      if (localShaTag && imageRef && (code === 0 || SOFT_FAIL)) {
        const artifactName = DockerArtifactManager.artifactName(localShaTag);
        await new DockerArtifactManager().save(imageRef, artifactName);
      }

      if (UPLOAD_SARIF) {
        await exec.exec('trivy', [
          scanType,
          '--format',    'sarif',
          '--output',    'trivy-results.sarif',
          '--severity',  SEVERITY,
          '--exit-code', '0',
          target,
        ], { ignoreReturnCode: true });

        core.info('Uploading SARIF to GitHub Security tab');
        await uploadSarif('trivy-results.sarif');
      }
    } finally {
      end();
    }
  }
}
