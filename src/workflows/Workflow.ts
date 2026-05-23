import { StageSlot } from './StageSlot';
import { StageConfig } from '../entities/StageConfig';
import { BranchType } from '../enums/BranchType';
import { StageName } from '../enums/StageName';
import { ErrorCode } from '../enums/ErrorCode';
import { ActionsCoreLibError } from '../entities/ActionYaml';

export abstract class Workflow {
  abstract stagesConfig(branchType: BranchType): StageSlot[];

  checkStages(stages: StageConfig[], branchType: BranchType): void {
    const slots = this.stagesConfig(branchType);
    const stageNames = stages.map(s => s.name as StageName);

    for (const slot of slots) {
      if (slot.required && !stageNames.includes(slot.name)) {
        throw new ActionsCoreLibError(
          ErrorCode.MISSING_REQUIRED_STAGE,
          `Stage '${slot.name}' is required for this ActionsCoreLib type on branch '${branchType}'`,
        );
      }
    }

    const allowedNames = slots.map(s => s.name as string);
    const orderedAllowed = stages.filter(s => allowedNames.includes(s.name));
    this.checkOrder(orderedAllowed.map(s => s.name as StageName), slots);
  }

  protected checkOrder(present: StageName[], slots: StageSlot[]): void {
    const slotOrder = slots.map(s => s.name);
    const filtered = present.filter(n => slotOrder.includes(n));
    const expected = slotOrder.filter(n => filtered.includes(n));
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] !== expected[i]) {
        throw new ActionsCoreLibError(
          ErrorCode.INVALID_STAGE_ORDER,
          `Stage order is invalid. Expected '${expected[i]}' but got '${filtered[i]}'`,
        );
      }
    }
  }
}
