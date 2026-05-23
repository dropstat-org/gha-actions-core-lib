"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryWorkflow = void 0;
const Workflow_1 = require("./Workflow");
const StageName_1 = require("../enums/StageName");
const BranchType_1 = require("../enums/BranchType");
class LibraryWorkflow extends Workflow_1.Workflow {
    stagesConfig(branchType) {
        const releaseRequired = branchType === BranchType_1.BranchType.MASTER || branchType === BranchType_1.BranchType.DEVELOP;
        return [
            { name: StageName_1.StageName.COMPILE, required: false },
            { name: StageName_1.StageName.UNIT_TEST, required: false },
            { name: StageName_1.StageName.LINTER, required: false },
            { name: StageName_1.StageName.SEMGREP, required: false },
            { name: StageName_1.StageName.SONARQUBE, required: false },
            { name: StageName_1.StageName.RELEASE, required: releaseRequired },
        ];
    }
}
exports.LibraryWorkflow = LibraryWorkflow;
//# sourceMappingURL=LibraryWorkflow.js.map