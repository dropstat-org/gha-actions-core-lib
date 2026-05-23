import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
import { PlatformConfigLoader } from '../../config/PlatformConfigLoader';
import { StageTransfer, PlanArtifacts, PlanGlobs } from '../../utils/StageTransfer';
import { Logger } from '../../utils/Logger';

type CheckovResult = 'success' | 'warning' | 'failure';

/**
 * Full port of CheckovTfStage.groovy — runs checkov against every per-account
 * terraform plan file produced by PlanStage.
 *
 * Differences from CheckovStage:
 * - Always uses framework=terraform_plan
 * - Iterates over all tfplan*-{account}.json files (one per account)
 * - Aggregates per-account results into a single step outcome
 * - Optionally loads plan files from the analysis-source artifact if not present
 *
 * Config knobs (stage.checkov in action.yaml):
 *   skipChecks        — list of check IDs to skip
 *   softFail          — true → always warn instead of fail (overrides platform policy)
 *   softFailPattern   — regex against projectId/serviceId; match → soft-fail
 *   externalChecksDir — path to a custom checks directory (clone separately via actions/checkout)
 */
export class CheckovTfStage extends AbstractAnalyzerStage {
  protected resultMap(): ResultMap {
    return { 0: 'success', 1: 'failure', 2: 'warning' };
  }

  _effectiveTools(_stage: StageConfig) {
    return undefined;
  }

  private async install(version: string): Promise<void> {
    Logger.info(`Installing checkov ${version}...`);
    await exec.exec('pip', ['install', `checkov==${version}`, '--quiet']);
  }

  /**
   * Resolves soft-fail mode for this run.
   * Priority: stage config > softFailPattern match > platform policy.
   * Mirrors the Groovy productId pattern check (e.g. awseks without deploy-mgnt-cluster).
   */
  private resolveSoftFail(stage: StageConfig, platformSoftFail: boolean): boolean {
    if (stage.checkov?.softFail !== undefined) return stage.checkov.softFail;

    if (stage.checkov?.softFailPattern) {
      const re = new RegExp(stage.checkov.softFailPattern, 'i');
      if (
        re.test(this.config.metadata.projectId) ||
        re.test(this.config.metadata.serviceId)
      ) {
        return true;
      }
    }

    return platformSoftFail;
  }

  private buildArgs(stage: StageConfig, planFile: string): string[] {
    const skipChecks    = stage.checkov?.skipChecks    ?? [];
    const externalDir   = stage.checkov?.externalChecksDir;
    const { projectId, serviceId } = this.config.metadata;

    const args: string[] = [
      '-f', planFile,
      '--framework', 'terraform_plan',
      '--output', 'cli',
      '--repo-id', `${projectId}/${serviceId}`,
    ];

    if (skipChecks.length) args.push('--skip-check', skipChecks.join(','));
    if (externalDir)       args.push('--external-checks-dir', externalDir);

    return args;
  }

  /**
   * Reduces all per-account results into a single aggregate.
   * When softFail=true, 'failure' is downgraded to 'warning'.
   * Priority: failure > warning > success.
   */
  private aggregateResults(
    results: Map<string, CheckovResult>,
    softFail: boolean,
  ): CheckovResult {
    const values = [...results.values()];
    if (!softFail && values.includes('failure')) return 'failure';
    if (values.includes('warning') || (softFail && values.includes('failure'))) return 'warning';
    return 'success';
  }

  private logPerAccountResults(results: Map<string, CheckovResult>, stageName: string): void {
    Logger.info(`CheckovTfStage '${stageName}' — per-account results:`);
    for (const [account, result] of results) {
      const icon = result === 'success' ? '✅' : result === 'warning' ? '⚠️' : '❌';
      Logger.info(`  ${icon} ${account}: ${result}`);
    }
  }

  /** Extracts account name from a per-account plan filename: tfplan{n}-{account}.json */
  private resolveAccountName(filePath: string): string {
    const base  = filePath.replace(/^.*[\\/]/, '').replace(/\.json$/, '');
    const match = base.match(/^tfplan\d+-(.+)$/);
    return match ? match[1] : base;
  }

  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(`checkov-tf: ${stage.name}`);
    try {
      const { soft_fail: platformSoftFail } =
        (await PlatformConfigLoader.securityPolicy()).checkov;
      const { checkov: checkovVersion } = await PlatformConfigLoader.toolVersions();
      const softFail = this.resolveSoftFail(stage, platformSoftFail);

      await this.install(checkovVersion);

      // Restore plan files produced by PlanStage.
      // Wrapped in try so the stage works even when files are already in the workspace.
      try {
        await StageTransfer.restoreByName(PlanArtifacts.JSON);
      } catch {
        Logger.warn(
          'CheckovTfStage: could not restore analysis-source artifact — ' +
          'using plan files already present in workspace',
        );
      }

      const planFiles = await StageTransfer.findFiles(PlanGlobs.JSON);
      if (planFiles.length === 0) {
        core.setFailed('CheckovTfStage: no per-account plan files found (tfplan*-*.json). Run PlanStage first.');
        return;
      }

      Logger.info(`CheckovTfStage: scanning ${planFiles.length} plan file(s)`);

      const accountResults = new Map<string, CheckovResult>();

      for (const planFile of planFiles) {
        const account = this.resolveAccountName(planFile);
        Logger.info(`Security scan → ${planFile}  (account: ${account})`);

        const args     = this.buildArgs(stage, planFile);
        const exitCode = await exec.exec('checkov', args, { ignoreReturnCode: true });
        accountResults.set(account, this.mapResult(exitCode));
      }

      this.logPerAccountResults(accountResults, stage.name);

      const aggregate = this.aggregateResults(accountResults, softFail);
      Logger.info(`Aggregate result: ${aggregate}`);

      // softFail already resolved into aggregate — pass false to avoid double-downgrade
      this.handleResult(aggregate, stage.name, false);
    } finally {
      end();
    }
  }
}
