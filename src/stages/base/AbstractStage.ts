import * as exec from '@actions/exec';
import { ActionYaml } from '../../entities/ActionYaml';
import { StageConfig, StageTools } from '../../entities/StageConfig';
import { ArtifactHandler } from '../../utils/ArtifactHandler';
import { SummaryWriter } from '../../utils/SummaryWriter';
import { Logger } from '../../utils/Logger';

export abstract class AbstractStage {
  protected config: ActionYaml;
  private artifactHandler = new ArtifactHandler();
  private summaryWriter   = new SummaryWriter();

  constructor(config: ActionYaml) {
    this.config = config;
  }

  // Punto de entrada público — orquesta el ciclo completo del stage
  async execute(stage: StageConfig): Promise<void> {
    if (stage.artifacts?.download?.length) {
      await this.artifactHandler.download(stage.artifacts.download);
    }

    await this.run(stage);

    if (stage.artifacts?.upload?.length) {
      await this.artifactHandler.upload(stage.artifacts.upload);
    }

    if (stage.summary) {
      await this.summaryWriter.write(stage.summary);
    }
  }

  protected abstract run(stage: StageConfig): Promise<void>;

  protected async execCommands(commands: string[], tools?: StageTools): Promise<void> {
    const env = this._buildEnv(tools);
    for (const cmd of commands) {
      Logger.info(`$ ${cmd}`);
      await exec.exec('bash', ['-c', cmd], { env: env as Record<string, string> });
    }
  }

  protected _buildEnv(tools?: StageTools): NodeJS.ProcessEnv {
    const t = tools;
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (t?.java)    env['JAVA_VERSION']   = t.java;
    if (t?.maven)   env['MAVEN_VERSION']  = t.maven;
    if (t?.gradle)  env['GRADLE_VERSION'] = t.gradle;
    if (t?.node)    env['NODE_VERSION']   = t.node;
    if (t?.pnpm)    env['PNPM_VERSION']   = t.pnpm;
    if (t?.go)      env['GO_VERSION']     = t.go;
    if (t?.python)  env['PYTHON_VERSION'] = t.python;
    if (t?.dotnet)  env['DOTNET_VERSION'] = t.dotnet;
    return env;
  }

  _effectiveTools(stage: StageConfig): StageTools | undefined {
    if (stage?.tools && Object.keys(stage.tools).length > 0) return stage.tools;
    return this.config.tools;
  }

  protected startGroup(name: string): () => void {
    return Logger.group(name);
  }
}
