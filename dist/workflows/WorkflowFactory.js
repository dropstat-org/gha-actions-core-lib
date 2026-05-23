"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowFactory = void 0;
const ActionsType_1 = require("../enums/ActionsType");
const AppWorkflow_1 = require("./AppWorkflow");
const TerraformWorkflow_1 = require("./TerraformWorkflow");
const LibraryWorkflow_1 = require("./LibraryWorkflow");
const GenericWorkflow_1 = require("./GenericWorkflow");
const ActionYaml_1 = require("../entities/ActionYaml");
const ErrorCode_1 = require("../enums/ErrorCode");
const registry = new Map([
    [ActionsType_1.ActionsType.APP, AppWorkflow_1.AppWorkflow],
    [ActionsType_1.ActionsType.TERRAFORM, TerraformWorkflow_1.TerraformWorkflow],
    [ActionsType_1.ActionsType.LIBRARY, LibraryWorkflow_1.LibraryWorkflow],
    [ActionsType_1.ActionsType.GENERIC, GenericWorkflow_1.GenericWorkflow],
]);
class WorkflowFactory {
    static create(type) {
        const Ctor = registry.get(type);
        if (!Ctor) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.INVALID_ActionsCoreLib_TYPE, `Unknown ActionsCoreLib type: '${type}'`);
        }
        return new Ctor();
    }
}
exports.WorkflowFactory = WorkflowFactory;
//# sourceMappingURL=WorkflowFactory.js.map