"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WorkflowFactory_1 = require("../workflows/WorkflowFactory");
const AppWorkflow_1 = require("../workflows/AppWorkflow");
const TerraformWorkflow_1 = require("../workflows/TerraformWorkflow");
const LibraryWorkflow_1 = require("../workflows/LibraryWorkflow");
const GenericWorkflow_1 = require("../workflows/GenericWorkflow");
const ActionsType_1 = require("../enums/ActionsType");
const ErrorCode_1 = require("../enums/ErrorCode");
describe('WorkflowFactory', () => {
    it.each([
        [ActionsType_1.ActionsType.APP, AppWorkflow_1.AppWorkflow],
        [ActionsType_1.ActionsType.TERRAFORM, TerraformWorkflow_1.TerraformWorkflow],
        [ActionsType_1.ActionsType.LIBRARY, LibraryWorkflow_1.LibraryWorkflow],
        [ActionsType_1.ActionsType.GENERIC, GenericWorkflow_1.GenericWorkflow],
    ])('creates %s workflow', (type, Cls) => {
        expect(WorkflowFactory_1.WorkflowFactory.create(type)).toBeInstanceOf(Cls);
    });
    it('throws INVALID_ActionsCoreLib_TYPE for unknown type', () => {
        expect(() => WorkflowFactory_1.WorkflowFactory.create('unknown')).toThrow(ErrorCode_1.ErrorCode.INVALID_ActionsCoreLib_TYPE);
    });
});
//# sourceMappingURL=WorkflowFactory.test.js.map