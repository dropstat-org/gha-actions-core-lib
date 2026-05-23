import * as core from '@actions/core';
import { OutputWriter } from '../utils/OutputWriter';
import { ActionYaml } from '../entities/ActionYaml';
import { ActionsType } from '../enums/ActionsType';
import { BranchType } from '../enums/BranchType';
import { AppWorkflow } from '../workflows/AppWorkflow';
import { PlatformConfigLoader } from '../config/PlatformConfigLoader';

jest.mock('@actions/core');
jest.mock('../config/PlatformConfigLoader', () => ({
  PlatformConfigLoader: {
    deployPolicy:  jest.fn().mockResolvedValue({}),
    hotfixPolicy:  jest.fn().mockResolvedValue({ allowed_repos: [], skippable_stages: [] }),
  },
}));

function makeConfig(stages: { name: string }[], type = ActionsType.APP): ActionYaml {
  return new ActionYaml({
    type,
    metadata: { projectId: 'pagos', serviceId: 'ms-totales', version: '1.0.0' },
    stages: stages as ActionYaml['stages'],
  });
}

const featureWorkflow = new AppWorkflow();
const feature = BranchType.FEATURE;
const pr      = BranchType.PULL_REQUEST;
const develop = BranchType.DEVELOP;

describe('OutputWriter.writeFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PlatformConfigLoader.deployPolicy as jest.Mock).mockResolvedValue({});
  });

  it('emits compile_enabled=true on feature branch when stage exists', async () => {
    await OutputWriter.writeFlags(makeConfig([{ name: 'compile' }]), feature, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('compile_enabled', 'true');
  });

  it('emits compile_enabled=false when stage absent', async () => {
    await OutputWriter.writeFlags(makeConfig([{ name: 'unit_test' }]), feature, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('compile_enabled', 'false');
  });

  it('emits publish_enabled=false on PR even if stage exists (branch not allowed)', async () => {
    await OutputWriter.writeFlags(makeConfig([{ name: 'publish' }]), pr, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('publish_enabled', 'false');
  });

  it('emits trivy_enabled=false on feature even if stage exists (branch not allowed)', async () => {
    await OutputWriter.writeFlags(makeConfig([{ name: 'trivy' }]), feature, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('trivy_enabled', 'false');
  });

  it('emits trivy_enabled=true on PR when stage exists', async () => {
    await OutputWriter.writeFlags(makeConfig([{ name: 'trivy' }]), pr, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('trivy_enabled', 'true');
  });

  it('emits release_enabled=true on develop when stage exists', async () => {
    await OutputWriter.writeFlags(makeConfig([{ name: 'trivy' }, { name: 'release' }]), develop, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('release_enabled', 'true');
  });

  it('emits multiple stages correctly on feature branch', async () => {
    await OutputWriter.writeFlags(makeConfig([
      { name: 'compile' },
      { name: 'unit_test' },
      { name: 'publish' },
    ]), feature, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('compile_enabled',   'true');
    expect(core.setOutput).toHaveBeenCalledWith('unit_test_enabled', 'true');
    expect(core.setOutput).toHaveBeenCalledWith('publish_enabled',   'true');
    expect(core.setOutput).toHaveBeenCalledWith('linter_enabled',    'false');
  });

  it('emits ActionsCoreLib_type output', async () => {
    await OutputWriter.writeFlags(makeConfig([], ActionsType.TERRAFORM), feature, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('ActionsCoreLib_type', 'terraform');
  });

  it('emits tools_java from config.tools', async () => {
    const cfg = new ActionYaml({
      type: ActionsType.APP,
      metadata: { projectId: 'p', serviceId: 's', version: '1.0.0' },
      tools: { java: '17' },
      stages: [],
    });
    await OutputWriter.writeFlags(cfg, feature, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('tools_java', '17');
  });

  it('emits empty string for tools not configured', async () => {
    await OutputWriter.writeFlags(makeConfig([]), feature, featureWorkflow);
    expect(core.setOutput).toHaveBeenCalledWith('tools_java', '');
  });
});
