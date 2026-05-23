import * as exec from '@actions/exec';
import { PlatformConfigLoader } from '../../config/PlatformConfigLoader';
import { FileUtil } from '../../utils/FileUtil';
import { Logger } from '../../utils/Logger';

export class SetupTerragruntStage {
  static async run(): Promise<void> {
    const { terragrunt: version } = await PlatformConfigLoader.toolVersions();
    const dest = '/usr/local/bin/terragrunt';
    const url  = `https://github.com/gruntwork-io/terragrunt/releases/download/v${version}/terragrunt_linux_amd64`;

    Logger.info(`Installing Terragrunt ${version}...`);
    await exec.exec('curl', ['-s', '-L', '-o', dest, url]);
    FileUtil.chmod(dest, 0o755);
    Logger.info(`Terragrunt ${version} installed at ${dest}`);
  }
}
