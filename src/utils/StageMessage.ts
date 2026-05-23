import * as core from '@actions/core';

/**
 * Well-known output keys produced by ActionsCoreLib stages.
 * Use these constants when emitting or consuming stage outputs to avoid
 * string typos and make inter-stage contracts explicit.
 */
export enum StageOutputKey {
  // plan stage
  PLAN_FILE       = 'plan_file',
  PLAN_SUMMARY    = 'plan_summary',

  // publish stage
  IMAGE_TAG       = 'image_tag',     // sha-4f9c21a
  IMAGE_VERSION   = 'image_version', // v1.4.2-sha-4f9c21a
  IMAGE_REF       = 'image_ref',     // full ECR URL with sha tag
  ARTIFACT_URL    = 'artifact_url',

  // release stage
  VERSION         = 'version',
  TAG             = 'tag',

  // deploy stage
  DEPLOY_ENV      = 'deploy_env',
  DEPLOY_URL      = 'deploy_url',

  // scan stages (checkov, trivy, semgrep)
  SCAN_PASSED     = 'scan_passed',
  SCAN_FINDINGS   = 'scan_findings',
}

/**
 * Typed inter-stage communication.
 *
 * emit()       → core.setOutput  (readable in same job via steps.id.outputs.key)
 * exportEnv()  → core.exportVariable  (readable by all subsequent steps in the job)
 * read()       → process.env lookup  (values injected by the workflow from prior outputs)
 */
export class StageMessage {
  /**
   * Emits a named output for this step.
   * In the workflow YAML, reference it as: ${{ steps.<id>.outputs.<key> }}
   */
  static emit(key: StageOutputKey, value: string): void {
    core.setOutput(key, value);
    core.debug(`[output] ${key}=${value}`);
  }

  /**
   * Exports a value as an environment variable visible to all subsequent
   * steps in the same job — no YAML wiring needed.
   */
  static exportEnv(name: string, value: string): void {
    core.exportVariable(name, value);
    core.debug(`[env-export] ${name}=${value}`);
  }

  /**
   * Reads a value that was injected into this step's environment by the
   * workflow (typically from a previous job's output).
   */
  static read(envVarName: string, fallback = ''): string {
    return process.env[envVarName] ?? fallback;
  }

  /**
   * Reads a required env value — throws a clear error if absent,
   * making the missing wiring easy to diagnose.
   */
  static require(envVarName: string): string {
    const value = process.env[envVarName] ?? '';
    if (!value) {
      throw new Error(
        `Stage input '${envVarName}' is not set. ` +
        `Check that the workflow passes this value via the step's env block.`,
      );
    }
    return value;
  }
}
