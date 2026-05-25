import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AbstractBranchStage } from '../base/AbstractBranchStage';
import { StageConfig } from '../../entities/StageConfig';
import { ActionsCoreLibError } from '../../entities/ActionYaml';
import { ErrorCode } from '../../enums/ErrorCode';
import { validateDeployForBranch } from '../../utils/AccountValidator';
import { PlanExtractor, ExtractedPlan } from '../../utils/PlanExtractor';
import { StageTransfer, PlanArtifacts, PlanGlobs } from '../../utils/StageTransfer';
import { PlanSummary } from '../../utils/PlanSummary';
import { PlanSecurity } from '../../utils/PlanSecurity';

// Subcommands that are never allowed inside a plan stage.
const FORBIDDEN_SUBCOMMANDS = ['apply', 'destroy', 'force-unlock'];

function containsSubcommand(cmd: string, sub: string): boolean {
  return cmd.trim().split(/\s+/).includes(sub);
}

export class PlanStage extends AbstractBranchStage {
  private validateCommands(commands: string[]): void {
    for (const cmd of commands) {
      for (const forbidden of FORBIDDEN_SUBCOMMANDS) {
        if (containsSubcommand(cmd, forbidden)) {
          throw new ActionsCoreLibError(
            ErrorCode.PLAN_COMMAND_FORBIDDEN,
            `Plan stage must not contain '${forbidden}' — use the deploy stage for apply/destroy operations`,
          );
        }
      }
    }
  }

  protected async onDefault(stage: StageConfig): Promise<void> {
    const commands = stage.commands ?? [];
    if (commands.length === 0) {
      throw new ActionsCoreLibError(
        ErrorCode.MISSING_STAGE_COMMANDS,
        `Plan stage '${stage.name}' requires at least one command`,
      );
    }

    this.validateCommands(commands);

    if (stage.deploy?.environment) {
      validateDeployForBranch(stage.deploy.environment, this.branchType, stage.deploy.accounts);
    }

    const extractor = new PlanExtractor(this.config.metadata);

    // Fallback account: accounts joined by "_", mirrors TerragruntUtils.valAccountsByBranch
    const fallbackAccount = stage.deploy?.accounts?.join('_')
      ?? this.config.metadata.projectId;

    // ── Phase 1: execute commands ──────────────────────────────────────────
    // Plan commands are split into: [plan --out binary] + [show -json > json]
    // Non-plan commands (state list, state rm, import) run as-is.
    // For each plan command we also capture `output-module-groups` (best-effort)
    // so the Job Summary can show the module path alongside the account name.
    const planIndices: number[] = [];
    const modulePathsByCmd = new Map<number, string[]>(); // cmdIndex → ordered module paths

    for (const [i, cmd] of commands.entries()) {
      const cmdIndex = i + 1;

      if (PlanExtractor.isPlanCommand(cmd)) {
        planIndices.push(cmdIndex);
        const [planCmd, showCmd] = extractor.buildRunCommands(cmd, cmdIndex);

        core.info(`[plan ${cmdIndex}] ${cmd}`);
        await this.execCommands([planCmd, showCmd], this._effectiveTools(stage));

        // Capture module groups — mirrors PreDeployStage.groovy line 59.
        // Failure is non-fatal: the plan summary still works without paths.
        try {
          const moduleGroupsCmd = extractor.buildModuleGroupsCommand(cmd);
          const { stdout } = await exec.getExecOutput('bash', ['-c', moduleGroupsCmd], {
            ignoreReturnCode: true,
            silent: true,
          });
          const paths = PlanExtractor.flattenModuleGroups(stdout);
          if (paths.length > 0) {
            modulePathsByCmd.set(cmdIndex, paths);
            core.info(`[plan ${cmdIndex}] module paths resolved: ${paths.join(', ')}`);
          }
        } catch {
          core.info(`[plan ${cmdIndex}] output-module-groups not available — paths omitted from summary`);
        }
      } else {
        core.info(`[cmd ${cmdIndex}] ${cmd}`);
        await this.execCommands([cmd], this._effectiveTools(stage));
      }
    }

    if (planIndices.length === 0) {
      throw new ActionsCoreLibError(
        ErrorCode.NO_PLAN_COMMAND_FOUND,
        `Plan stage '${stage.name}' must contain at least one terragrunt plan command`,
      );
    }

    // ── Phase 2: parse JSONL → per-account files ───────────────────────────
    // Each raw plan file is JSONL (one JSON object per module/account per line).
    // TerragruntUtils.getVarEnvIdFromPlan reads planJson.variables.env_id.value.
    // Module paths (from output-module-groups) are threaded through so the summary
    // can display them — mirrors TerragruntUtils.getFolderModule (moduleCount logic).
    const allExtracted: ExtractedPlan[] = [];
    for (const cmdIndex of planIndices) {
      const modulePaths = modulePathsByCmd.get(cmdIndex);
      const extracted = extractor.extractPerAccountPlans(cmdIndex, fallbackAccount, modulePaths);
      allExtracted.push(...extracted);
    }

    // Build filePath → modulePath lookup for the summary writer.
    const modulePathsMap: Record<string, string> = {};
    for (const plan of allExtracted) {
      if (plan.modulePath) modulePathsMap[plan.filePath] = plan.modulePath;
    }

    // ── Phase 3: collect valid plans and save to artifact ──────────────────
    // Exclude parent JSONL files (tfplan{n}-{projectId}-{serviceId}-*.json).
    const allJsonFiles   = await StageTransfer.findFiles('tfplan*.json');
    const perAccountPlans = extractor.filterPerAccountPlans(allJsonFiles);

    if (perAccountPlans.length === 0) {
      core.warning('PlanStage: no per-account plan files found to save');
    } else {
      // Security: warn before upload — plan JSON may contain plain-text variable values.
      // Artifact retention is capped at 1 day to minimize the exposure window.
      PlanSecurity.warnArtifactVisibility();
      for (const f of perAccountPlans) PlanSecurity.warnIfSensitiveVariables(f);

      core.info(`Saving ${perAccountPlans.length} plan file(s) as '${PlanArtifacts.JSON}' (retention: 1 day)`);
      await StageTransfer.saveByPaths(PlanArtifacts.JSON, perAccountPlans, 1);
    }

    await StageTransfer.saveByGlob(PlanArtifacts.BINARY, PlanGlobs.BINARY);

    // ── Phase 4: write resource change summary to GitHub Job Summary ───────────
    // Module paths are passed so each plan heading shows its source directory.
    await PlanSummary.writeSummaryForPlans(perAccountPlans, modulePathsMap);
  }
}
