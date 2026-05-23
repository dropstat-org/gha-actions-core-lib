import { WorkflowFactory } from '../workflows/WorkflowFactory';
import { AppWorkflow } from '../workflows/AppWorkflow';
import { TerraformWorkflow } from '../workflows/TerraformWorkflow';
import { LibraryWorkflow } from '../workflows/LibraryWorkflow';
import { GenericWorkflow } from '../workflows/GenericWorkflow';
import { ActionsType } from '../enums/ActionsType';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

describe('WorkflowFactory', () => {
  it.each([
    [ActionsType.APP,       AppWorkflow],
    [ActionsType.TERRAFORM, TerraformWorkflow],
    [ActionsType.LIBRARY,   LibraryWorkflow],
    [ActionsType.GENERIC,   GenericWorkflow],
  ])('creates %s workflow', (type, Cls) => {
    expect(WorkflowFactory.create(type)).toBeInstanceOf(Cls);
  });

  it('throws INVALID_ActionsCoreLib_TYPE for unknown type', () => {
    expect(() => WorkflowFactory.create('unknown')).toThrow(ErrorCode.INVALID_ActionsCoreLib_TYPE);
  });
});
