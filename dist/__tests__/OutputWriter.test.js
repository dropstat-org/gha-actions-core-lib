"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const OutputWriter_1 = require("../utils/OutputWriter");
const ActionYaml_1 = require("../entities/ActionYaml");
const ActionsType_1 = require("../enums/ActionsType");
const BranchType_1 = require("../enums/BranchType");
const AppWorkflow_1 = require("../workflows/AppWorkflow");
const PlatformConfigLoader_1 = require("../config/PlatformConfigLoader");
jest.mock('@actions/core');
jest.mock('../config/PlatformConfigLoader', () => ({
    PlatformConfigLoader: {
        deployPolicy: jest.fn().mockResolvedValue({}),
        hotfixPolicy: jest.fn().mockResolvedValue({ allowed_repos: [], skippable_stages: [] }),
    },
}));
function makeConfig(stages, type = ActionsType_1.ActionsType.APP) {
    return new ActionYaml_1.ActionYaml({
        type,
        metadata: { projectId: 'pagos', serviceId: 'ms-totales', version: '1.0.0' },
        stages: stages,
    });
}
const featureWorkflow = new AppWorkflow_1.AppWorkflow();
const feature = BranchType_1.BranchType.FEATURE;
const pr = BranchType_1.BranchType.PULL_REQUEST;
const develop = BranchType_1.BranchType.DEVELOP;
describe('OutputWriter.writeFlags', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        PlatformConfigLoader_1.PlatformConfigLoader.deployPolicy.mockResolvedValue({});
    });
    it('emits compile_enabled=true on feature branch when stage exists', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([{ name: 'compile' }]), feature, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('compile_enabled', 'true');
    });
    it('emits compile_enabled=false when stage absent', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([{ name: 'unit_test' }]), feature, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('compile_enabled', 'false');
    });
    it('emits publish_enabled=false on PR even if stage exists (branch not allowed)', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([{ name: 'publish' }]), pr, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('publish_enabled', 'false');
    });
    it('emits trivy_enabled=false on feature even if stage exists (branch not allowed)', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([{ name: 'trivy' }]), feature, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('trivy_enabled', 'false');
    });
    it('emits trivy_enabled=true on PR when stage exists', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([{ name: 'trivy' }]), pr, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('trivy_enabled', 'true');
    });
    it('emits release_enabled=true on develop when stage exists', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([{ name: 'trivy' }, { name: 'release' }]), develop, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('release_enabled', 'true');
    });
    it('emits multiple stages correctly on feature branch', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([
            { name: 'compile' },
            { name: 'unit_test' },
            { name: 'publish' },
        ]), feature, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('compile_enabled', 'true');
        expect(core.setOutput).toHaveBeenCalledWith('unit_test_enabled', 'true');
        expect(core.setOutput).toHaveBeenCalledWith('publish_enabled', 'true');
        expect(core.setOutput).toHaveBeenCalledWith('linter_enabled', 'false');
    });
    it('emits ActionsCoreLib_type output', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([], ActionsType_1.ActionsType.TERRAFORM), feature, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('ActionsCoreLib_type', 'terraform');
    });
    it('emits tools_java from config.tools', async () => {
        const cfg = new ActionYaml_1.ActionYaml({
            type: ActionsType_1.ActionsType.APP,
            metadata: { projectId: 'p', serviceId: 's', version: '1.0.0' },
            tools: { java: '17' },
            stages: [],
        });
        await OutputWriter_1.OutputWriter.writeFlags(cfg, feature, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('tools_java', '17');
    });
    it('emits empty string for tools not configured', async () => {
        await OutputWriter_1.OutputWriter.writeFlags(makeConfig([]), feature, featureWorkflow);
        expect(core.setOutput).toHaveBeenCalledWith('tools_java', '');
    });
});
//# sourceMappingURL=OutputWriter.test.js.map