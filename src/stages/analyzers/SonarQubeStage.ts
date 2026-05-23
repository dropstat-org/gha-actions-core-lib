import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AbstractAnalyzerStage, ResultMap } from './AbstractAnalyzerStage';
import { StageConfig } from '../../entities/StageConfig';
import { ErrorCode } from '../../enums/ErrorCode';
import { PlatformConfigLoader } from '../../config/PlatformConfigLoader';
import { Credentials } from '../../utils/Credentials';
import { Logger } from '../../utils/Logger';

export class SonarQubeStage extends AbstractAnalyzerStage {
  protected resultMap(): ResultMap {
    return { 0: 'success', 1: 'failure', 2: 'warning' };
  }

  private async install(): Promise<void> {
    const { sonarqube_scanner: version } = await PlatformConfigLoader.toolVersions();
    Logger.info(`Installing sonar-scanner ${version}...`);
    const url = `https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${version}-linux-x64.zip`;
    await exec.exec('curl', ['-sSLo', '/tmp/sonar.zip', url]);
    await exec.exec('unzip', ['-q', '/tmp/sonar.zip', '-d', '/tmp']);
    await exec.exec('sudo', ['mv', `/tmp/sonar-scanner-${version}-linux-x64`, '/opt/sonar-scanner']);
    await exec.exec('sudo', ['ln', '-sf', '/opt/sonar-scanner/bin/sonar-scanner', '/usr/local/bin/sonar-scanner']);
  }

  async run(stage: StageConfig): Promise<void> {
    const end = this.startGroup(`sonarqube: ${stage.name}`);
    try {
      await this.install();
      const sonarToken = Credentials.sonarToken();
      const sonarUrl   = Credentials.optional('SONAR_HOST_URL');

      // projectKey = artifactId — generado automáticamente desde projectId+serviceId
      const projectKey = this.config.metadata.artifactId ?? '';

      const args = [
        `-Dsonar.projectKey=${projectKey}`,
        `-Dsonar.sources=.`,
        sonarUrl    ? `-Dsonar.host.url=${sonarUrl}`   : '',
        sonarToken  ? `-Dsonar.token=${sonarToken}`    : '',
        ...(stage.sonar?.args ?? []),
      ].filter(Boolean);

      let exitCode = 0;
      try {
        exitCode = await exec.exec('sonar-scanner', args, { ignoreReturnCode: true });
      } catch {
        exitCode = 1;
      }

      const result = this.mapResult(exitCode);
      if (result === 'failure') {
        core.setFailed(`[${ErrorCode.SONARQUBE_QUALITY_GATE_FAILED}] SonarQube Quality Gate failed`);
      } else {
        this.handleResult(result, stage.name, false);
      }
    } finally {
      end();
    }
  }
}
