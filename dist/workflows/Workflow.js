"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workflow = void 0;
const ErrorCode_1 = require("../enums/ErrorCode");
const ActionYaml_1 = require("../entities/ActionYaml");
class Workflow {
    checkStages(stages, branchType) {
        const slots = this.stagesConfig(branchType);
        const stageNames = stages.map(s => s.name);
        for (const slot of slots) {
            if (slot.required && !stageNames.includes(slot.name)) {
                throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_REQUIRED_STAGE, `Stage '${slot.name}' is required for this ActionsCoreLib type on branch '${branchType}'`);
            }
        }
        const allowedNames = slots.map(s => s.name);
        const orderedAllowed = stages.filter(s => allowedNames.includes(s.name));
        this.checkOrder(orderedAllowed.map(s => s.name), slots);
    }
    checkOrder(present, slots) {
        const slotOrder = slots.map(s => s.name);
        const filtered = present.filter(n => slotOrder.includes(n));
        const expected = slotOrder.filter(n => filtered.includes(n));
        for (let i = 0; i < filtered.length; i++) {
            if (filtered[i] !== expected[i]) {
                throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.INVALID_STAGE_ORDER, `Stage order is invalid. Expected '${expected[i]}' but got '${filtered[i]}'`);
            }
        }
    }
}
exports.Workflow = Workflow;
//# sourceMappingURL=Workflow.js.map