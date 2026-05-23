import * as core from '@actions/core';
import * as fs from 'fs';

// Variable names that suggest sensitive data.
// Terraform marks provider-managed secrets as "(sensitive value)" automatically,
// but user-defined variables declared without sensitive=true appear in plain text.
const SENSITIVE_NAME_RE = /password|secret|token|key|credential|private|cert|auth|api_key/i;

interface TfVariable {
  value?: unknown;
  sensitive?: boolean;
}

/**
 * Security checks for Terraform plan JSON artifacts.
 *
 * Why: plan JSON files are uploaded as GitHub Actions artifacts and are readable
 * by anyone with repository read access. Variables not marked sensitive=true
 * in Terraform will appear as plain text in the plan JSON.
 *
 * Usage: called automatically by PlanStage before uploading the artifact.
 */
export class PlanSecurity {
  /**
   * Scans the plan JSON variables section for names that match common secret
   * patterns. Warns when a variable looks sensitive but its value is plain text
   * (i.e., not masked by Terraform's sensitive=true mechanism).
   *
   * Does NOT fail the build — it's a loud reminder, not a gate.
   */
  static warnIfSensitiveVariables(filePath: string): void {
    let plan: Record<string, unknown>;
    try {
      plan = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    } catch {
      return; // already warned by PlanSummary if unparseable
    }

    const variables = (plan.variables ?? {}) as Record<string, TfVariable>;
    const exposed: string[] = [];

    for (const [name, def] of Object.entries(variables)) {
      const isStringValue  = typeof def?.value === 'string' && def.value.length > 0;
      const isSensitiveName = SENSITIVE_NAME_RE.test(name);
      if (isSensitiveName && isStringValue) {
        exposed.push(name);
      }
    }

    if (exposed.length > 0) {
      core.warning(
        `PlanSecurity [${filePath}]: the following variables have sensitive-looking names ` +
        `but appear as plain text in the plan JSON — mark them with sensitive=true in ` +
        `Terraform so their values are masked before upload: ${exposed.join(', ')}`,
      );
    }
  }

  /**
   * Logs a reminder that plan JSON artifacts are readable by anyone with
   * repository read access. Called once per plan stage run.
   */
  static warnArtifactVisibility(): void {
    core.info(
      'PlanSecurity: plan JSON artifact (analysis-source) is accessible to all ' +
      'repository collaborators. Retention is set to 1 day to minimize exposure. ' +
      'Ensure all sensitive Terraform variables are declared with sensitive=true.',
    );
  }
}
