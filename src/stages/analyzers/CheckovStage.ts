import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
import { PlatformConfigLoader } from '../../config/PlatformConfigLoader';
import { uploadSarif } from '../../utils/SarifUploader';

const DIRECTORY = '.';

export class CheckovStage extends AbstractAnalyzerStage {
  protected resultMap(): ResultMap {
    return { 0: 'success', 1: 'failure' };
  }

  _effectiveTools(_stage: StageConfig) {
    return undefined;
  }

  private async install(version: string): Promise<void> {
    core.info(`Installing checkov ${version}...`);
    await exec.exec('pip', ['install', `checkov==${version}`, '--quiet']);
  }

  private buildArgs(stage: StageConfig, softFail: boolean): string[] {
    const framework  = stage.checkov?.framework;
    const skipChecks = stage.checkov?.skipChecks ?? [];

    const isTerraformPlan = framework === 'terraform_plan';
    const planFile = stage.checkov?.planFile ?? 'tfplan.json';

    const args: string[] = isTerraformPlan
      ? ['-f', planFile, '--output', 'cli']
      : ['-d', DIRECTORY, '--output', 'cli'];

    if (framework)         args.push('--framework', framework);
    if (softFail)          args.push('--soft-fail');
    if (skipChecks.length) args.push('--skip-check', skipChecks.join(','));

    return args;
  }

  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(`checkov: ${stage.name}`);
    try {
      const { soft_fail: SOFT_FAIL, upload_sarif: UPLOAD_SARIF } =
        (await PlatformConfigLoader.securityPolicy()).checkov;
      const { checkov: checkovVersion } = await PlatformConfigLoader.toolVersions();

      await this.install(checkovVersion);

      const args = this.buildArgs(stage, SOFT_FAIL);
      const code = await exec.exec('checkov', args, { ignoreReturnCode: true });
      this.handleResult(this.mapResult(code), stage.name, SOFT_FAIL);

      if (UPLOAD_SARIF) {
        core.info('Uploading SARIF to GitHub Security tab');
        await uploadSarif('results_sarif.sarif');
      }
    } finally {
      end();
    }
  }
}
