"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfraWorkflow = void 0;
const Workflow_1 = require("./Workflow");
const StageName_1 = require("../enums/StageName");
const BranchType_1 = require("../enums/BranchType");
class InfraWorkflow extends Workflow_1.Workflow {
    stagesConfig(branchType) {
        const slots = [
            { name: StageName_1.StageName.LINTER, required: false },
        ];
        if (branchType === BranchType_1.BranchType.PULL_REQUEST) {
            slots[0] = { name: StageName_1.StageName.LINTER, required: true };
        }
        if (branchType === BranchType_1.BranchType.MASTER) {
            slots.push({ name: StageName_1.StageName.RELEASE, required: true });
        }
        return slots;
    }
}
exports.InfraWorkflow = InfraWorkflow;
//# sourceMappingURL=InfraWorkflow.js.map