import * as core from '@actions/core';
import * as globModule from '@actions/glob';
import { DefaultArtifactClient } from '@actions/artifact';

const client = new DefaultArtifactClient();

/**
 * Artifact names used when passing terraform plan files between stages.
 * Mirrors the Groovy Cache keys: "analysis-source" and "terragrunt-plan".
 */
export const PlanArtifacts = {
  JSON:   'analysis-source',
  BINARY: 'terragrunt-plan',
} as const;

/**
 * Glob patterns that match the plan file naming convention:
 *   tfplan{index}-{accountName}.json / tfplan{index}-...{hash}.binary
 */
export const PlanGlobs = {
  JSON:   '**/tfplan*-*.json',
  BINARY: '**/tfplan*.binary',
} as const;

/**
 * Equivalent of the Groovy Cache utility — saves and restores files
 * between pipeline stages using GitHub Actions artifacts.
 *
 * Usage in a plan stage:
 *   await StageTransfer.saveByGlob(PlanArtifacts.JSON, PlanGlobs.JSON);
 *
 * Usage in a checkov stage:
 *   await StageTransfer.restoreByName(PlanArtifacts.JSON);
 *   const plans = await StageTransfer.findFiles(PlanGlobs.JSON);
 */
export class StageTransfer {
  /**
   * Finds all files matching `pattern` and uploads them as a named artifact.
   * Equivalent to Groovy: Cache.saveByInclude(name, tfplanListForCache)
   */
  static async saveByGlob(
    name: string,
    pattern: string,
    retentionDays?: number,
  ): Promise<void> {
    const globber = await globModule.create(pattern);
    const files   = await globber.glob();

    if (files.length === 0) {
      core.warning(`StageTransfer.saveByGlob '${name}': no files matched '${pattern}'`);
      return;
    }

    core.info(`Saving ${files.length} file(s) as artifact '${name}'`);
    await client.uploadArtifact(name, files, process.cwd(), { retentionDays });
  }

  /**
   * Uploads an explicit list of file paths as a named artifact.
   * Equivalent to Groovy: Cache.saveByInclude(name, paths.join(','))
   */
  static async saveByPaths(
    name: string,
    files: string[],
    retentionDays?: number,
  ): Promise<void> {
    if (files.length === 0) {
      core.warning(`StageTransfer.saveByPaths '${name}': empty file list`);
      return;
    }

    core.info(`Saving ${files.length} file(s) as artifact '${name}'`);
    await client.uploadArtifact(name, files, process.cwd(), { retentionDays });
  }

  /**
   * Downloads a named artifact into the workspace.
   * Equivalent to Groovy: Cache.restoreByName(name)
   */
  static async restoreByName(name: string, destPath?: string): Promise<void> {
    core.info(`Restoring artifact '${name}'`);
    const { artifact } = await client.getArtifact(name);
    await client.downloadArtifact(artifact.id, {
      path: destPath ?? process.cwd(),
    });
  }

  /**
   * Returns the list of files matching a glob pattern.
   * Equivalent to Groovy: jenkins.findFiles(glob: pattern)
   */
  static async findFiles(pattern: string): Promise<string[]> {
    const globber = await globModule.create(pattern);
    return globber.glob();
  }
}
