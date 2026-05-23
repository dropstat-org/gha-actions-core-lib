import { Metadata } from '../entities/Metadata';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export class MetadataValidator {
  static validate(metadata: Metadata): void {
    if (!metadata.projectId) {
      throw new ActionsCoreLibError(ErrorCode.MISSING_PROJECT_ID, 'metadata.projectId is required');
    }
    if (!ID_PATTERN.test(metadata.projectId)) {
      throw new ActionsCoreLibError(
        ErrorCode.INVALID_PROJECT_ID,
        `metadata.projectId '${metadata.projectId}' must be lowercase, start with a letter, and contain only letters, numbers, and hyphens`,
      );
    }

    if (!metadata.serviceId) {
      throw new ActionsCoreLibError(ErrorCode.MISSING_SERVICE_ID, 'metadata.serviceId is required');
    }
    if (!ID_PATTERN.test(metadata.serviceId)) {
      throw new ActionsCoreLibError(
        ErrorCode.INVALID_SERVICE_ID,
        `metadata.serviceId '${metadata.serviceId}' must be lowercase, start with a letter, and contain only letters, numbers, and hyphens`,
      );
    }

    if (!metadata.version) {
      throw new ActionsCoreLibError(ErrorCode.MISSING_VERSION, 'metadata.version is required');
    }
    if (!VERSION_PATTERN.test(metadata.version)) {
      throw new ActionsCoreLibError(
        ErrorCode.INVALID_VERSION,
        `metadata.version '${metadata.version}' must follow semver format X.X.X`,
      );
    }
  }
}
