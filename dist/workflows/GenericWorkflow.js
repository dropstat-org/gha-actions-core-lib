"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericWorkflow = void 0;
const Workflow_1 = require("./Workflow");
class GenericWorkflow extends Workflow_1.Workflow {
    stagesConfig(_branchType) {
        return [];
    }
    checkStages() {
        // Generic ActionsCoreLib imposes no stage restrictions
    }
}
exports.GenericWorkflow = GenericWorkflow;
//# sourceMappingURL=GenericWorkflow.js.map