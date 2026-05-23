"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    // Metadata validation
    ErrorCode["MISSING_PROJECT_ID"] = "MISSING_PROJECT_ID";
    ErrorCode["INVALID_PROJECT_ID"] = "INVALID_PROJECT_ID";
    ErrorCode["MISSING_SERVICE_ID"] = "MISSING_SERVICE_ID";
    ErrorCode["INVALID_SERVICE_ID"] = "INVALID_SERVICE_ID";
    ErrorCode["MISSING_VERSION"] = "MISSING_VERSION";
    ErrorCode["INVALID_VERSION"] = "INVALID_VERSION";
    // ActionsCoreLib config
    ErrorCode["MISSING_ActionsCoreLib_TYPE"] = "MISSING_ActionsCoreLib_TYPE";
    ErrorCode["INVALID_ActionsCoreLib_TYPE"] = "INVALID_ActionsCoreLib_TYPE";
    ErrorCode["CONFIG_PARSE_ERROR"] = "CONFIG_PARSE_ERROR";
    ErrorCode["CONFIG_NOT_FOUND"] = "CONFIG_NOT_FOUND";
    // Stage validation
    ErrorCode["MISSING_REQUIRED_STAGE"] = "MISSING_REQUIRED_STAGE";
    ErrorCode["INVALID_STAGE_ORDER"] = "INVALID_STAGE_ORDER";
    ErrorCode["MISSING_STAGE_COMMANDS"] = "MISSING_STAGE_COMMANDS";
    ErrorCode["INVALID_STAGE_TYPE"] = "INVALID_STAGE_TYPE";
    ErrorCode["UNKNOWN_STAGE"] = "UNKNOWN_STAGE";
    // Plan / deploy correspondence
    ErrorCode["NO_PLAN_COMMAND_FOUND"] = "NO_PLAN_COMMAND_FOUND";
    ErrorCode["PLAN_COMMAND_FORBIDDEN"] = "PLAN_COMMAND_FORBIDDEN";
    ErrorCode["DEPLOY_PLAN_COMMAND_FORBIDDEN"] = "DEPLOY_PLAN_COMMAND_FORBIDDEN";
    ErrorCode["DEPLOY_MISSING_PLAN_REF"] = "DEPLOY_MISSING_PLAN_REF";
    // Deploy validation
    ErrorCode["MISSING_DEPLOY_ENV"] = "MISSING_DEPLOY_ENV";
    ErrorCode["INVALID_DEPLOY_ENV"] = "INVALID_DEPLOY_ENV";
    ErrorCode["ACCOUNT_BRANCH_MISMATCH"] = "ACCOUNT_BRANCH_MISMATCH";
    ErrorCode["APPROVER_NOT_AUTHORIZED"] = "APPROVER_NOT_AUTHORIZED";
    ErrorCode["INVALID_CONFIRM"] = "INVALID_CONFIRM";
    // Artifact / publish
    ErrorCode["MISSING_IMAGE_REF"] = "MISSING_IMAGE_REF";
    ErrorCode["MISSING_REGISTRY_CONFIG"] = "MISSING_REGISTRY_CONFIG";
    // Hotfix emergency
    ErrorCode["HOTFIX_EXCEPTION_NOT_ALLOWED"] = "HOTFIX_EXCEPTION_NOT_ALLOWED";
    // Analyzer
    ErrorCode["SONARQUBE_QUALITY_GATE_FAILED"] = "SONARQUBE_QUALITY_GATE_FAILED";
    ErrorCode["TRIVY_VULNERABILITIES_FOUND"] = "TRIVY_VULNERABILITIES_FOUND";
    ErrorCode["CHECKOV_POLICY_FAILED"] = "CHECKOV_POLICY_FAILED";
    // Generic
    ErrorCode["EXECUTION_FAILED"] = "EXECUTION_FAILED";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=ErrorCode.js.map