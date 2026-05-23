import { StageName } from '../enums/StageName';
import { AbstractStage } from '../stages/base/AbstractStage';
import { ActionYaml } from '../entities/ActionYaml';
import { BranchType } from '../enums/BranchType';
import { StageConfig } from '../entities/StageConfig';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

import { PlanStage }        from '../stages/infra/PlanStage';
import { CompileStage }     from '../stages/CompileStage';
import { UnitTestStage }    from '../stages/UnitTestStage';
import { LintStage }        from '../stages/LintStage';
import { GenericStage }     from '../stages/GenericStage';
import { SonarQubeStage }   from '../stages/analyzers/SonarQubeStage';
import { TrivyStage }       from '../stages/analyzers/TrivyStage';
import { CheckovStage }     from '../stages/analyzers/CheckovStage';
import { CheckovTfStage }   from '../stages/analyzers/CheckovTfStage';
import { SemgrepStage }     from '../stages/analyzers/SemgrepStage';
import { PublishStage }     from '../stages/release/PublishStage';
import { AppRelease }       from '../stages/release/AppRelease';
import { MasterTagRelease } from '../stages/release/MasterTagRelease';
import { LibraryRelease }   from '../stages/release/LibraryRelease';
import { DeployStage }      from '../stages/deploy/DeployStage';
import { PreDeployStage }   from '../stages/deploy/PreDeployStage';
import { PostDeployStage }  from '../stages/deploy/PostDeployStage';

import { ActionsType }     from '../enums/ActionsType';

type BranchAwareCtor = new (config: ActionYaml, branchType: BranchType) => AbstractStage;
type SimpleCtor      = new (config: ActionYaml) => AbstractStage;

const simpleRegistry = new Map<StageName, SimpleCtor>([
  [StageName.COMPILE,   CompileStage],
  [StageName.UNIT_TEST, UnitTestStage],
  [StageName.LINTER,    LintStage],
  [StageName.SEMGREP,   SemgrepStage],
  [StageName.SONARQUBE, SonarQubeStage],
  [StageName.TRIVY,     TrivyStage],
  [StageName.CHECKOV,    CheckovStage],
  [StageName.CHECKOV_TF, CheckovTfStage],
  [StageName.PUBLISH,   PublishStage],
  [StageName.GENERIC,   GenericStage],
]);

const branchAwareRegistry = new Map<StageName, BranchAwareCtor>([
  [StageName.PLAN,        PlanStage],
  [StageName.DEPLOY,      DeployStage],
  [StageName.PRE_DEPLOY,  PreDeployStage],
  [StageName.POST_DEPLOY, PostDeployStage],
]);

function releaseCtorFor(type: string): BranchAwareCtor {
  switch (type) {
    case ActionsType.LIBRARY:   return LibraryRelease;
    case ActionsType.TERRAFORM: return MasterTagRelease;
    default:                     return AppRelease;
  }
}

export class StageRegistry {
  static create(stageName: string, config: ActionYaml, branchType?: BranchType): AbstractStage {
    const name = stageName as StageName;

    if (name === StageName.RELEASE) {
      const Ctor = releaseCtorFor(config.type);
      return new Ctor(config, branchType ?? BranchType.FEATURE);
    }

    const BranchCtor = branchAwareRegistry.get(name);
    if (BranchCtor) {
      return new BranchCtor(config, branchType ?? BranchType.FEATURE);
    }

    const SimpleCtor = simpleRegistry.get(name);
    if (SimpleCtor) {
      return new SimpleCtor(config);
    }

    throw new ActionsCoreLibError(ErrorCode.UNKNOWN_STAGE, `Unknown stage: '${stageName}'`);
  }
}
