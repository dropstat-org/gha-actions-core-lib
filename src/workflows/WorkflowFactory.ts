import { ActionsType } from '../enums/ActionsType';
import { Workflow } from './Workflow';
import { AppWorkflow } from './AppWorkflow';
import { TerraformWorkflow } from './TerraformWorkflow';
import { LibraryWorkflow } from './LibraryWorkflow';
import { GenericWorkflow } from './GenericWorkflow';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

const registry = new Map<string, new () => Workflow>([
  [ActionsType.APP,       AppWorkflow],
  [ActionsType.TERRAFORM, TerraformWorkflow],
  [ActionsType.LIBRARY,   LibraryWorkflow],
  [ActionsType.GENERIC,   GenericWorkflow],
]);

export class WorkflowFactory {
  static create(type: string): Workflow {
    const Ctor = registry.get(type);
    if (!Ctor) {
      throw new ActionsCoreLibError(ErrorCode.INVALID_ActionsCoreLib_TYPE, `Unknown ActionsCoreLib type: '${type}'`);
    }
    return new Ctor();
  }
}
