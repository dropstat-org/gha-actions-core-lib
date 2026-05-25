import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { Metadata } from '../entities/Metadata';

export interface PlanFlags {
  runAll: boolean;
  workingDir: string | null;
}

export interface ExtractedPlan {
  cmdIndex: number;
  accountName: string;
  filePath: string;
  /** Absolute module path from `terragrunt output-module-groups`. Undefined when the command
   *  is not available or when this plan was produced by a non-run-all invocation. */
  modulePath?: string;
}

/**
 * Ports the plan-extraction logic from Groovy PreDeployStage.
 *
 * Covers three command shapes:
 *   terragrunt plan
 *   terragrunt run-all plan
 *   terragrunt plan --terragrunt-working-dir <dir>
 *   terragrunt run-all plan --terragrunt-working-dir <dir>
 */
export class PlanExtractor {
  private readonly projectId: string;
  private readonly serviceId: string;
  private readonly versionTag: string;

  constructor(metadata: Pick<Metadata, 'projectId' | 'serviceId' | 'version' | 'commitHash'>) {
    this.projectId  = metadata.projectId;
    this.serviceId  = metadata.serviceId;
    this.versionTag = metadata.commitHash
      ? `${metadata.version}-${metadata.commitHash}`
      : metadata.version;
  }

  // ── Command detection ─────────────────────────────────────────────────────

  /** True when the command should produce a plan file (contains the word "plan"). */
  static isPlanCommand(cmd: string): boolean {
    return cmd.trim().split(/\s+/).includes('plan');
  }

  /**
   * Extracts the flags that change how terragrunt plan is invoked.
   * Mirrors: Utils.isSpecified("run-all") / Utils.getParm("--terragrunt-working-dir")
   */
  static parseFlags(cmd: string): PlanFlags {
    const args = cmd.trim().split(/\s+/);
    const runAll    = args.includes('run-all');
    const wdIdx     = args.indexOf('--terragrunt-working-dir');
    const workingDir = wdIdx !== -1 ? (args[wdIdx + 1] ?? null) : null;
    return { runAll, workingDir };
  }

  // ── File naming ───────────────────────────────────────────────────────────

  /**
   * Raw binary name produced by `plan --out`.
   * e.g. tfplan1-myproject-myservice-1.0.0-abc1234.binary
   */
  rawBinaryName(cmdIndex: number): string {
    return `tfplan${cmdIndex}-${this.projectId}-${this.serviceId}-${this.versionTag}.binary`;
  }

  /**
   * Raw JSONL name produced by `show -json` (one JSON object per line = one module).
   * e.g. tfplan1-myproject-myservice-1.0.0-abc1234.json
   */
  rawJsonName(cmdIndex: number): string {
    return `tfplan${cmdIndex}-${this.projectId}-${this.serviceId}-${this.versionTag}.json`;
  }

  /**
   * Per-account file name written after parsing the JSONL.
   * e.g. tfplan1-my-account.json
   */
  static perAccountName(cmdIndex: number, accountName: string): string {
    return `tfplan${cmdIndex}-${accountName}.json`;
  }

  // ── Command builders ──────────────────────────────────────────────────────

  /**
   * Returns the two shell commands that replace the original plan invocation:
   *   1. original plan command  + --out <binary>
   *   2. terragrunt [run-all] show -json <binary> [--terragrunt-working-dir <dir>]  > <json>
   *
   * Mirrors lines 54-55 in PreDeployStage.groovy.
   */
  buildRunCommands(cmd: string, cmdIndex: number): [string, string] {
    const { runAll, workingDir } = PlanExtractor.parseFlags(cmd);
    const binary = this.rawBinaryName(cmdIndex);
    const json   = this.rawJsonName(cmdIndex);
    const ra     = runAll     ? 'run-all '                               : '';
    const wd     = workingDir ? ` --terragrunt-working-dir ${workingDir}` : '';

    // Strip any user-supplied -out / --out so we control the output filename.
    // Handles both forms: --out=file  and  --out file
    const cleanCmd = cmd.replace(/\s+-{1,2}out(?:=\S+|\s+\S+)/g, '').trimEnd();

    const planCmd = `${cleanCmd} --out ${binary}`;
    const showCmd = `terragrunt ${ra}show -json ${binary}${wd} > ${json}`;
    return [planCmd, showCmd];
  }

  /**
   * Command to collect module groups used for multi-module account resolution.
   * Mirrors line 59 in PreDeployStage.groovy.
   */
  buildModuleGroupsCommand(cmd: string): string {
    const { workingDir } = PlanExtractor.parseFlags(cmd);
    const wd = workingDir ? ` --terragrunt-working-dir ${workingDir}` : '';
    return `terragrunt output-module-groups${wd} 2>/dev/null`;
  }

  // ── Plan parsing ──────────────────────────────────────────────────────────

  /**
   * Reads the raw JSONL plan file and writes one per-account JSON for each line.
   * Returns the list of extracted plans (file paths + optional module paths).
   *
   * Account name resolution order (mirrors TerragruntUtils.getVarEnvIdFromPlan):
   *   1. planJson.variables.env_id.value
   *   2. fallbackAccount
   *
   * @param modulePaths  Ordered list from `PlanExtractor.flattenModuleGroups()`.
   *                     When provided, each successfully-parsed module is annotated
   *                     with its absolute path at the matching index — mirrors
   *                     TerragruntUtils.getFolderModule (moduleCount ↔ moduleIndex).
   */
  extractPerAccountPlans(
    cmdIndex: number,
    fallbackAccount: string,
    modulePaths?: string[],
  ): ExtractedPlan[] {
    const rawFile = this.rawJsonName(cmdIndex);

    if (!fs.existsSync(rawFile)) {
      core.warning(`PlanExtractor: raw plan file not found: ${rawFile}`);
      return [];
    }

    const lines = fs
      .readFileSync(rawFile, 'utf8')
      .split('\n')
      .filter(l => l.trim().length > 0);

    const created: ExtractedPlan[] = [];
    let moduleIndex = 0; // tracks only successfully-parsed modules (mirrors moduleCount in Groovy)

    for (const line of lines) {
      let planJson: Record<string, unknown>;
      try {
        planJson = JSON.parse(line);
      } catch {
        core.warning(`PlanExtractor: skipping non-JSON line in ${rawFile}`);
        continue;
      }

      const accountName = PlanExtractor.resolveAccountName(planJson, fallbackAccount);
      const filePath    = PlanExtractor.perAccountName(cmdIndex, accountName);
      const modulePath  = modulePaths?.[moduleIndex];

      fs.writeFileSync(filePath, JSON.stringify(planJson, null, 2), 'utf8');
      core.info(
        `Extracted plan → ${filePath}  (account: ${accountName}` +
        `${modulePath ? `  path: ${modulePath}` : ''})`,
      );
      created.push({ cmdIndex, accountName, filePath, modulePath });
      moduleIndex++;
    }

    return created;
  }

  /**
   * Reads env_id from plan variables, falls back to the provided string.
   * Mirrors: planJson?.variables?.env_id?.value ?: backAccount
   */
  static resolveAccountName(
    planJson: Record<string, unknown>,
    fallback: string,
  ): string {
    const vars  = planJson?.variables as Record<string, unknown> | undefined;
    const envId = (vars?.env_id as Record<string, unknown> | undefined)?.value;
    return typeof envId === 'string' && envId.length > 0 ? envId : fallback;
  }

  // ── Module-groups helpers ─────────────────────────────────────────────────

  /**
   * Parses the JSON output of `terragrunt output-module-groups` and returns
   * an **ordered flat list** of absolute module paths — one entry per module,
   * in the same order as the lines in the raw JSONL plan file.
   *
   * Mirrors TerragruntUtils.getModuleAbsolutePath / getFolderModule:
   *   - Single group  → all paths in the group, in order.
   *   - Multiple groups → first path from each group, in group order.
   *
   * Returns [] on empty / invalid input (always safe to call).
   */
  static flattenModuleGroups(json: string): string[] {
    if (!json || !json.trim()) return [];
    try {
      const groups = JSON.parse(json.trim()) as Record<string, string[]>;
      const values = Object.values(groups);
      if (values.length === 0) return [];
      if (values.length === 1) return values[0];
      // Multiple groups: take the first path from each group (mirrors mgArray[moduleCount][0])
      return values.map(g => g[0] ?? '');
    } catch {
      return [];
    }
  }

  // ── File filtering ────────────────────────────────────────────────────────

  /**
   * From a flat list of tfplan*.json paths, removes the raw JSONL parent files
   * that follow the naming convention tfplan{n}-{projectId}-{serviceId}-*.json.
   *
   * The Groovy version uses a TODO comment to delete these; here we exclude them
   * explicitly so checkov only receives single-object plan files.
   */
  filterPerAccountPlans(files: string[]): string[] {
    const escapedProject = escapeRegex(this.projectId);
    const escapedService = escapeRegex(this.serviceId);
    const parentRe = new RegExp(
      `^tfplan\\d+-${escapedProject}-${escapedService}-`,
    );
    return files.filter(f => !parentRe.test(path.basename(f)));
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
