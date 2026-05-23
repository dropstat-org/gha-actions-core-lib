"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageName = void 0;
var StageName;
(function (StageName) {
    StageName["CONFIG"] = "config";
    StageName["COMPILE"] = "compile";
    StageName["UNIT_TEST"] = "unit_test";
    StageName["LINTER"] = "linter";
    StageName["SEMGREP"] = "semgrep";
    StageName["SONARQUBE"] = "sonarqube";
    StageName["TRIVY"] = "trivy";
    StageName["CHECKOV"] = "checkov";
    StageName["CHECKOV_TF"] = "checkov_tf";
    StageName["PLAN"] = "plan";
    StageName["PUBLISH"] = "publish";
    StageName["DEPLOY"] = "deploy";
    StageName["PRE_DEPLOY"] = "pre_deploy";
    StageName["POST_DEPLOY"] = "post_deploy";
    StageName["RELEASE"] = "release";
    StageName["VALIDATE_APPROVER"] = "validate-approver";
    StageName["VALIDATE_CONFIRM"] = "validate-confirm";
    StageName["SETUP_TERRAGRUNT"] = "setup-terragrunt";
    StageName["GENERIC"] = "generic";
})(StageName || (exports.StageName = StageName = {}));
//# sourceMappingURL=StageName.js.map