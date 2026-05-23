import * as core from '@actions/core';
import { AbstractStage } from '../base/AbstractStage';
import { StageConfig } from '../../entities/StageConfig';

export type AnalyzerResult = 'success' | 'warning' | 'failure';

export interface ResultMap {
  [exitCode: number]: AnalyzerResult;
}

export abstract class AbstractAnalyzerStage extends AbstractStage {
  protected abstract resultMap(): ResultMap;

  protected mapResult(exitCode: number): AnalyzerResult {
    const map = this.resultMap();
    return map[exitCode] ?? 'failure';
  }

  protected handleResult(result: AnalyzerResult, stageName: string, softFail: boolean): void {
    switch (result) {
      case 'success':
        core.info(`Analyzer '${stageName}' passed`);
        break;
      case 'warning':
        core.warning(`Analyzer '${stageName}' returned warnings`);
        break;
      case 'failure':
        if (softFail) {
          core.warning(`Analyzer '${stageName}' failed (soft_fail=true, continuing)`);
        } else {
          core.setFailed(`Analyzer '${stageName}' failed`);
        }
        break;
    }
  }

  abstract run(stage: StageConfig): Promise<void>;
}
