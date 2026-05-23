import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './Logger';

export type ChangeAction = 'create' | 'update' | 'delete' | 'replace' | 'no-op';

export interface ResourceChange {
  address: string;
  type: string;
  action: ChangeAction;
}

export interface PlanSummaryResult {
  account: string;
  toCreate:  ResourceChange[];
  toUpdate:  ResourceChange[];
  toDelete:  ResourceChange[];
  toReplace: ResourceChange[];
  noOp:      ResourceChange[];
}

interface TfResourceChange {
  address: string;
  type: string;
  change: { actions: string[] };
}

function resolveAction(actions: string[]): ChangeAction {
  if (actions.includes('delete') && actions.includes('create')) return 'replace';
  if (actions[0] === 'create') return 'create';
  if (actions[0] === 'update') return 'update';
  if (actions[0] === 'delete') return 'delete';
  return 'no-op';
}

/**
 * Parses the per-account terraform plan JSON produced by PlanStage
 * and emits a human-readable summary of resource changes.
 *
 * Quick usage:
 *   const result = PlanSummary.fromFile('tfplan1-acct-d-01.json');
 *   console.log(PlanSummary.toMarkdown(result));
 *
 * Wired into PlanStage — writes automatically to GitHub Job Summary after every plan run.
 * Also callable from any custom stage:
 *   const files = await StageTransfer.findFiles(PlanGlobs.JSON);
 *   await PlanSummary.writeSummaryForPlans(files);
 */
export class PlanSummary {
  /**
   * Parse a single per-account plan JSON file from disk.
   * The file must contain a full terraform plan JSON object (not JSONL).
   * Account name is inferred from the filename: tfplan{n}-{account}.json
   */
  static fromFile(filePath: string): PlanSummaryResult {
    const base    = path.basename(filePath, '.json');
    const account = base.replace(/^tfplan\d+-/, '');
    const raw     = fs.readFileSync(filePath, 'utf8');
    return this.fromJson(JSON.parse(raw) as Record<string, unknown>, account);
  }

  /**
   * Parse from an already-loaded plan JSON object.
   * Reads `resource_changes[].change.actions` to classify each resource.
   */
  static fromJson(planJson: Record<string, unknown>, account = 'unknown'): PlanSummaryResult {
    const result: PlanSummaryResult = {
      account,
      toCreate: [], toUpdate: [], toDelete: [], toReplace: [], noOp: [],
    };

    const changes = (planJson.resource_changes ?? []) as TfResourceChange[];

    for (const rc of changes) {
      const action = resolveAction(rc.change?.actions ?? ['no-op']);
      const entry: ResourceChange = { address: rc.address, type: rc.type, action };
      switch (action) {
        case 'create':  result.toCreate.push(entry);  break;
        case 'update':  result.toUpdate.push(entry);  break;
        case 'delete':  result.toDelete.push(entry);  break;
        case 'replace': result.toReplace.push(entry); break;
        default:        result.noOp.push(entry);      break;
      }
    }

    return result;
  }

  /**
   * Renders the summary as markdown for GitHub Job Summary.
   * Includes a count table and per-action resource lists.
   */
  static toMarkdown(r: PlanSummaryResult): string {
    const lines: string[] = [
      `## Terraform Plan: \`${r.account}\``,
      '',
      '| Action    | Count |',
      '|-----------|------:|',
      `| ➕ Create  | ${r.toCreate.length}  |`,
      `| 🔄 Update  | ${r.toUpdate.length}  |`,
      `| 🗑️ Delete  | ${r.toDelete.length}  |`,
      `| ♻️ Replace | ${r.toReplace.length} |`,
      '',
    ];

    if (r.toCreate.length)  lines.push(...resourceSection('➕ Resources to Create',  r.toCreate));
    if (r.toUpdate.length)  lines.push(...resourceSection('🔄 Resources to Update',  r.toUpdate));
    if (r.toDelete.length)  lines.push(...resourceSection('🗑️ Resources to Delete (destructive)',  r.toDelete));
    if (r.toReplace.length) lines.push(...resourceSection('♻️ Resources to Replace', r.toReplace));

    return lines.join('\n');
  }

  /**
   * Logs a one-line inline summary to the GitHub Actions log.
   * Useful for quick feedback without writing to the Job Summary.
   *
   * Output: +2 ~1 -0 ±1  (create/update/delete/replace)
   */
  static logInline(r: PlanSummaryResult): void {
    Logger.info(
      `Plan '${r.account}': ` +
      `+${r.toCreate.length} create  ` +
      `~${r.toUpdate.length} update  ` +
      `-${r.toDelete.length} delete  ` +
      `±${r.toReplace.length} replace`,
    );
  }

  /**
   * Parses all per-account plan JSON files and writes a combined markdown
   * report to the GitHub Actions Job Summary.
   *
   * Called automatically by PlanStage. Also available for custom stages:
   *   const files = await StageTransfer.findFiles(PlanGlobs.JSON);
   *   await PlanSummary.writeSummaryForPlans(files);
   */
  static async writeSummaryForPlans(planFiles: string[]): Promise<void> {
    if (planFiles.length === 0) {
      Logger.warn('PlanSummary: no plan files to summarize');
      return;
    }

    let hasContent = false;

    for (const filePath of planFiles) {
      if (!fs.existsSync(filePath)) {
        Logger.warn(`PlanSummary: file not found: ${filePath}`);
        continue;
      }
      try {
        const result = this.fromFile(filePath);
        this.logInline(result);
        core.summary.addRaw(this.toMarkdown(result) + '\n\n---\n\n');
        hasContent = true;
      } catch (err) {
        Logger.warn(`PlanSummary: could not parse ${filePath}: ${(err as Error).message}`);
      }
    }

    if (hasContent) {
      await core.summary.write();
    }
  }
}

function resourceSection(title: string, items: ResourceChange[]): string[] {
  return [
    `### ${title}`,
    '',
    ...items.map(r => `- \`${r.address}\` *(${r.type})*`),
    '',
  ];
}
