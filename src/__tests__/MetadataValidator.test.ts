import { MetadataValidator } from '../validator/MetadataValidator';
import { ActionsCoreLibError } from '../entities/ActionYaml';
import { ErrorCode } from '../enums/ErrorCode';

describe('MetadataValidator', () => {
  it('passes valid metadata', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'pagos',
      serviceId: 'ms-totales',
      version: '1.0.0',
    })).not.toThrow();
  });

  it('throws MISSING_PROJECT_ID when projectId is empty', () => {
    expect(() => MetadataValidator.validate({
      projectId: '',
      serviceId: 'svc',
      version: '1.0.0',
    })).toThrow(ActionsCoreLibError);
  });

  it('throws INVALID_PROJECT_ID for uppercase', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'Pagos',
      serviceId: 'svc',
      version: '1.0.0',
    })).toThrow(ErrorCode.INVALID_PROJECT_ID);
  });

  it('throws INVALID_PROJECT_ID for underscores', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'my_project',
      serviceId: 'svc',
      version: '1.0.0',
    })).toThrow(ErrorCode.INVALID_PROJECT_ID);
  });

  it('throws INVALID_PROJECT_ID when starts with number', () => {
    expect(() => MetadataValidator.validate({
      projectId: '1pagos',
      serviceId: 'svc',
      version: '1.0.0',
    })).toThrow(ErrorCode.INVALID_PROJECT_ID);
  });

  it('throws MISSING_SERVICE_ID when serviceId is empty', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'pagos',
      serviceId: '',
      version: '1.0.0',
    })).toThrow(ErrorCode.MISSING_SERVICE_ID);
  });

  it('throws INVALID_SERVICE_ID for uppercase', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'pagos',
      serviceId: 'MyService',
      version: '1.0.0',
    })).toThrow(ErrorCode.INVALID_SERVICE_ID);
  });

  it('throws MISSING_VERSION when version is empty', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'pagos',
      serviceId: 'svc',
      version: '',
    })).toThrow(ErrorCode.MISSING_VERSION);
  });

  it('throws INVALID_VERSION for non-semver', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'pagos',
      serviceId: 'svc',
      version: '1.0',
    })).toThrow(ErrorCode.INVALID_VERSION);
  });

  it('accepts version with multiple digits', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'pagos',
      serviceId: 'svc',
      version: '10.20.300',
    })).not.toThrow();
  });

  it('accepts projectId with hyphens', () => {
    expect(() => MetadataValidator.validate({
      projectId: 'my-project',
      serviceId: 'svc',
      version: '1.0.0',
    })).not.toThrow();
  });
});
