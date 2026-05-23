import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import { SummaryConfig } from '../entities/StageConfig';

export class SummaryWriter {
  async write(config: SummaryConfig): Promise<void> {
    const content = await this.resolveContent(config);
    if (!content.trim()) return;

    const summary = core.summary;
    if (config.title) summary.addHeading(config.title, 2);
    summary.addCodeBlock(content, config.format ?? 'text');
    await summary.write();
  }

  private async resolveContent(config: SummaryConfig): Promise<string> {
    if (config.file) {
      if (!fs.existsSync(config.file)) {
        core.warning(`Summary file not found: ${config.file}`);
        return '';
      }
      return fs.readFileSync(config.file, 'utf8');
    }

    if (config.command) {
      let output = '';
      await exec.exec('bash', ['-c', config.command], {
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => { output += data.toString(); },
          stderr: (data: Buffer) => { output += data.toString(); },
        },
      });
      return output;
    }

    return '';
  }
}
