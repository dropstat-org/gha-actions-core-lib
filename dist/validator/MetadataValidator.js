"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataValidator = void 0;
const ActionYaml_1 = require("../entities/ActionYaml");
const ErrorCode_1 = require("../enums/ErrorCode");
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
class MetadataValidator {
    static validate(metadata) {
        if (!metadata.projectId) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_PROJECT_ID, 'metadata.projectId is required');
        }
        if (!ID_PATTERN.test(metadata.projectId)) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.INVALID_PROJECT_ID, `metadata.projectId '${metadata.projectId}' must be lowercase, start with a letter, and contain only letters, numbers, and hyphens`);
        }
        if (!metadata.serviceId) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_SERVICE_ID, 'metadata.serviceId is required');
        }
        if (!ID_PATTERN.test(metadata.serviceId)) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.INVALID_SERVICE_ID, `metadata.serviceId '${metadata.serviceId}' must be lowercase, start with a letter, and contain only letters, numbers, and hyphens`);
        }
        if (!metadata.version) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.MISSING_VERSION, 'metadata.version is required');
        }
        if (!VERSION_PATTERN.test(metadata.version)) {
            throw new ActionYaml_1.ActionsCoreLibError(ErrorCode_1.ErrorCode.INVALID_VERSION, `metadata.version '${metadata.version}' must follow semver format X.X.X`);
        }
    }
}
exports.MetadataValidator = MetadataValidator;
//# sourceMappingURL=MetadataValidator.js.map