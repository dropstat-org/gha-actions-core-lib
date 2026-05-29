"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageRegistry = void 0;
const StageName_1 = require("../enums/StageName");
const BranchType_1 = require("../enums/BranchType");
const ActionYaml_1 = require("../entities/ActionYaml");
const ErrorCode_1 = require("../enums/ErrorCode");
const PlanStage_1 = require("../stages/infra/PlanStage");
const CompileStage_1 = require("../stages/CompileStage");
const UnitTestStage_1 = require("../stages/UnitTestStage");
const LintStage_1 = require("../stages/LintStage");
const GenericStage_1 = require("../stages/GenericStage");
const SonarQubeStage_1 = require("../stages/analyzers/SonarQubeStage");
const TrivyStage_1 = require("../stages/analyzers/TrivyStage");
const CheckovStage_1 = require("../stages/analyzers/CheckovStage");
const CheckovTfStage_1 = require("../stages/analyzers/CheckovTfStage");
const SemgrepStage_1 = require("../stages/analyzers/SemgrepStage");
const PublishStage_1 = require("../stages/release/PublishStage");
const AppRelease_1 = require("../stages/release/AppRelease");
const MasterTagRelease_1 = require("../stages/release/MasterTagRelease");
const LibraryRelease_1 = require("../stages/release/LibraryRelease");
const DeployStage_1 = require("../stages/deploy/DeployStage");
const PreDeployStage_1 = require("../stages/deploy/PreDeployStage");
const PostDeployStage_1 = require("../stages/deploy/PostDeployStage");
const ActionsType_1 = require("../enums/ActionsType");
const simpleRegistry = new Map([
    [StageName_1.StageName.COMPILE, CompileStage_1.CompileStage],
    [StageName_1.StageName.UNIT_TEST, UnitTestStage_1.UnitTestStage],
    [StageName_1.StageName.LINTER, LintStage_1.LintStage],
    [StageName_1.StageName.SEMGREP, SemgrepStage_1.SemgrepStage],
    [StageName_1.StageName.SONARQUBE, SonarQubeStage_1.SonarQubeStage],
    [StageName_1.StageName.TRIVY, TrivyStage_1.TrivyStage],
    [StageName_1.StageName.CHECKOV, CheckovStage_1.CheckovStage],
    [StageName_1.StageName.CHECKOV_TF, CheckovTfStage_1.CheckovTfStage],
    [StageName_1.StageName.PUBLISH, PublishStage_1.PublishStage],
    [StageName_1.StageName.GENERIC, GenericStage_1.GenericStage],
]);
const branchAwareRegistry = new Map([
    [StageName_1.StageName.PLAN, PlanStage_1.PlanStage],
    [StageName_1.StageName.DEPLOY, DeployStage_1.DeployStage],
    [StageName_1.StageName.PRE_DEPLOY, PreDeployStage_1.PreDeployStage],
    [StageName_1.StageName.POST_DEPLOY, PostDeployStage_1.PostDeployStage],
]);
function releaseCtorFor(type) {
    switch (type) {
        case ActionsType_1.ActionsType.LIBRARY: return LibraryRelease_1.LibraryRelease;
        case ActionsType_1.ActionsType.TERRAFORM: return MasterTagRelease_1.MasterTagRelease;
        default: return AppRelease_1.AppRelease;
    }
}
class StageRegistry {
    static create(stageName, config, branchType) {
        const name = stageName;
        if (name === StageName_1.StageName.RELEASE) {
            const Ctor = releaseCtorFor(config.type);
            return new Ctor(config, branchType ?? BranchType_1.BranchType.FEATURE);
        }
        const BranchCtor = branchAwareRegistry.get(name);
        if (BranchCtor) {
            return new BranchCtor(config, branchType ?? BranchType_1.BranchType.FEATURE);
        }
        const SimpleCtor = simpleRegistry.get(name);
        if (SimpleCtor) {
            return new SimpleCtor(config);
        }
        throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.UNKNOWN_STAGE, `Unknown stage: '${stageName}'`);
    }
}
exports.StageRegistry = StageRegistry;
//# sourceMappingURL=StageRegistry.js.map