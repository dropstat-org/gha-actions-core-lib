import * as core from '@actions/core';
import { AbstractBranchStage } from '../base/AbstractBranchStage';
import { StageConfig } from '../../entities/StageConfig';
import { ActionsCoreLibError } from '../../entities/ActionYaml';
import { ErrorCode } from '../../enums/ErrorCode';
import { validateDeployForBranch } from '../../utils/AccountValidator';
import { PlanExtractor } from '../../utils/PlanExtractor';
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
    const planIndices: number[] = [];

    for (const [i, cmd] of commands.entries()) {
      const cmdIndex = i + 1;

      if (PlanExtractor.isPlanCommand(cmd)) {
        planIndices.push(cmdIndex);
        const [planCmd, showCmd] = extractor.buildRunCommands(cmd, cmdIndex);

        core.info(`[plan ${cmdIndex}] ${cmd}`);
        await this.execCommands([planCmd, showCmd], this._effectiveTools(stage));
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
    for (const cmdIndex of planIndices) {
      extractor.extractPerAccountPlans(cmdIndex, fallbackAccount);
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
    await PlanSummary.writeSummaryForPlans(perAccountPlans);
  }
}
