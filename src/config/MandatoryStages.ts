import { StageName } from '../enums/StageName';
import { StageConfig } from '../entities/StageConfig';
import { ActionsType } from '../enums/ActionsType';

export interface MandatoryStageDefinition {
  stage: StageConfig;
  // First choice: insert right after this stage when present.
  insertAfter: StageName;
  // Fallback: insert before the earliest of these stages when insertAfter is absent.
  // Must be the stages that come after the mandatory stage in the canonical slot order.
  insertBefore: StageName[];
}

// Mandatory stages enforced at platform level — developers cannot opt out.
// If a developer adds the same stage name to action.yaml, their config takes precedence.
export const MANDATORY_STAGES: Partial<Record<string, MandatoryStageDefinition[]>> = {
  [ActionsType.APP]: [
    {
      stage: { name: StageName.SEMGREP },
      insertAfter: StageName.LINTER,
      insertBefore: [StageName.SONARQUBE, StageName.TRIVY, StageName.CHECKOV, StageName.PUBLISH, StageName.RELEASE],
    },
  ],
  [ActionsType.LIBRARY]: [
    {
      stage: { name: StageName.SEMGREP },
      insertAfter: StageName.LINTER,
      insertBefore: [StageName.SONARQUBE, StageName.RELEASE],
    },
  ],
};

export function injectMandatoryStages(stages: StageConfig[], type: string): StageConfig[] {
  const mandatory = MANDATORY_STAGES[type];
  if (!mandatory?.length) return stages;

  const result = [...stages];

  for (const { stage, insertAfter, insertBefore } of mandatory) {
    if (result.some(s => s.name === stage.name)) continue;

    const afterIdx = result.findIndex(s => s.name === insertAfter);
    if (afterIdx >= 0) {
      result.splice(afterIdx + 1, 0, { ...stage });
      continue;
    }

    // insertAfter not found — insert before the earliest following stage
    let insertAt = result.length;
    for (const beforeName of insertBefore) {
      const idx = result.findIndex(s => s.name === beforeName);
      if (idx >= 0 && idx < insertAt) insertAt = idx;
    }
    result.splice(insertAt, 0, { ...stage });
  }

  return result;
}
