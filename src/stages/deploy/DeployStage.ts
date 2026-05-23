import * as core from '@actions/core';
import { AbstractDeployStage } from './AbstractDeployStage';
import { StageConfig } from '../../entities/StageConfig';
import { ActionsCoreLibError } from '../../entities/ActionYaml';
import { ErrorCode } from '../../enums/ErrorCode';
import { ActionsType } from '../../enums/ActionsType';
import { StageTransfer, PlanArtifacts, PlanGlobs } from '../../utils/StageTransfer';
import { PlanSummary } from '../../utils/PlanSummary';

function containsSubcommand(cmd: string, sub: string): boolean {
  return cmd.trim().split(/\s+/).includes(sub);
}

// After 'apply', checks that at least one non-flag token exists (the plan file).
// Bare 'apply' or 'apply -auto-approve' without a plan file would re-plan and apply
// without the security review done in the plan stage.
// run-all apply is exempt — each module manages its own plan state internally.
function applyHasPlanFileArg(cmd: string): boolean {
  const parts = cmd.trim().split(/\s+/);
  const applyIdx = parts.indexOf('apply');
  if (applyIdx < 0) return false;
  return parts.slice(applyIdx + 1).some(p => !p.startsWith('-'));
}

export class DeployStage extends AbstractDeployStage {
  private validateTerraformDeploy(stage: StageConfig): void {
    const commands = stage.commands ?? [];

    for (const cmd of commands) {
      if (containsSubcommand(cmd, 'plan')) {
        throw new ActionsCoreLibError(
          ErrorCode.DEPLOY_PLAN_COMMAND_FORBIDDEN,
          `Deploy stage must not contain 'plan' — plan commands belong in the plan stage`,
        );
      }
    }

    const applyCmds = commands.filter(cmd => containsSubcommand(cmd, 'apply'));
    if (applyCmds.length === 0) {
      throw new ActionsCoreLibError(
        ErrorCode.MISSING_STAGE_COMMANDS,
        `Terraform deploy stage requires at least one 'apply' command`,
      );
    }

    // run-all apply manages plan state per-module internally (.terragrunt-cache),
    // so no explicit plan file arg is required. Single-module apply must still
    // reference the plan file to prevent an unreviewed re-plan.
    for (const applyCmd of applyCmds) {
      if (!containsSubcommand(applyCmd, 'run-all') && !applyHasPlanFileArg(applyCmd)) {
        throw new ActionsCoreLibError(
          ErrorCode.DEPLOY_MISSING_PLAN_REF,
          `Terraform 'apply' must reference the plan file produced by the plan stage ` +
          `(e.g., 'terragrunt apply tfplan.binary'). Bare apply re-plans and bypasses the reviewed plan.`,
        );
      }
    }
  }

  // Restores plan JSON files from the previous job's artifact (if available) and
  // renders the resource-change summary at the top of the deploy job summary.
  // Files may already be present when plan and deploy run on the same runner.
  private async showPlanSummary(): Promise<void> {
    try {
      await StageTransfer.restoreByName(PlanArtifacts.JSON);
    } catch {
      // Files already in workspace (same-runner deploy) — not an error
    }
    const planFiles = await StageTransfer.findFiles(PlanGlobs.JSON);
    if (planFiles.length > 0) {
      await PlanSummary.writeSummaryForPlans(planFiles);
    } else {
      core.info('DeployStage: no plan summary files found — skipping summary display');
    }
  }

  async run(stage: StageConfig): Promise<void> {
    if (!stage.deploy) {
      throw new ActionsCoreLibError(ErrorCode.MISSING_DEPLOY_ENV, `Stage '${stage.name}' requires deploy config`);
    }
    if (!stage.commands || stage.commands.length === 0) {
      throw new ActionsCoreLibError(ErrorCode.MISSING_STAGE_COMMANDS, `Deploy stage '${stage.name}' requires at least one command`);
    }

    if (this.config.type === ActionsType.TERRAFORM) {
      this.validateTerraformDeploy(stage);
      await this.showPlanSummary();
    }

    const end = this.startGroup(`deploy: ${stage.name}`);
    try {
      await super.run(stage);
    } finally {
      end();
    }
  }
}
