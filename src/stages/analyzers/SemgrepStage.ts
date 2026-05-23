import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
import { PlatformConfigLoader } from '../../config/PlatformConfigLoader';
import { uploadSarif } from '../../utils/SarifUploader';

export class SemgrepStage extends AbstractAnalyzerStage {
  protected resultMap(): ResultMap {
    return { 0: 'success', 1: 'failure' };
  }

  _effectiveTools(_stage: StageConfig) {
    return undefined;
  }

  private async install(version: string): Promise<void> {
    core.info(`Installing Semgrep ${version}...`);
    await exec.exec('pip', ['install', `semgrep==${version}`, '--quiet']);
  }

  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(`semgrep: ${stage.name}`);
    try {
      const { default_config: DEFAULT_CONFIG, soft_fail: SOFT_FAIL, upload_sarif: UPLOAD_SARIF } =
        (await PlatformConfigLoader.securityPolicy()).semgrep;
      const { semgrep: semgrepVersion } = await PlatformConfigLoader.toolVersions();

      await this.install(semgrepVersion);

      const semgrepConfig = stage.semgrep?.config ?? DEFAULT_CONFIG;
      const extraArgs     = stage.semgrep?.args    ?? [];

      // Scan 1: text output for log (determines pass/fail)
      // --error exits with code 1 when findings exist; omitting it exits 0 (soft-fail behaviour)
      const tableArgs: string[] = [
        'scan',
        '--config', semgrepConfig,
        '--text',
        ...(!SOFT_FAIL ? ['--error'] : []),
        '.',
        ...extraArgs,
      ];
      const code = await exec.exec('semgrep', tableArgs, { ignoreReturnCode: true });
      this.handleResult(this.mapResult(code), stage.name, SOFT_FAIL);

      if (UPLOAD_SARIF) {
        // Scan 2: SARIF output for GitHub Security tab (requires GitHub Advanced Security)
        const sarifArgs: string[] = [
          'scan',
          '--config', semgrepConfig,
          '--sarif',
          '--output', 'semgrep-results.sarif',
          '.',
          ...extraArgs,
        ];
        await exec.exec('semgrep', sarifArgs, { ignoreReturnCode: true });

        core.info('Uploading SARIF to GitHub Security tab');
        await uploadSarif('semgrep-results.sarif');
      }
    } finally {
      end();
    }
  }
}
