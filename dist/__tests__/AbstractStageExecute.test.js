"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AbstractStage_1 = require("../stages/base/AbstractStage");
const ActionYaml_1 = require("../entities/ActionYaml");
const ActionsType_1 = require("../enums/ActionsType");
// Mocks
jest.mock('../utils/ArtifactHandler', () => ({
    ArtifactHandler: jest.fn().mockImplementation(() => ({
        upload: jest.fn().mockResolvedValue(undefined),
        download: jest.fn().mockResolvedValue(undefined),
    })),
}));
jest.mock('../utils/SummaryWriter', () => ({
    SummaryWriter: jest.fn().mockImplementation(() => ({
        write: jest.fn().mockResolvedValue(undefined),
    })),
}));
jest.mock('@actions/core', () => ({
    info: jest.fn(), startGroup: jest.fn(), endGroup: jest.fn(), warning: jest.fn(),
}));
jest.mock('@actions/exec', () => ({ exec: jest.fn().mockResolvedValue(0) }));
function makeConfig() {
    return new ActionYaml_1.ActionYaml({
        type: ActionsType_1.ActionsType.APP,
        metadata: { projectId: 'test', serviceId: 'svc', version: '1.0.0' },
        stages: [],
    });
}
class ConcreteStage extends AbstractStage_1.AbstractStage {
    runCalled = false;
    async run(_stage) {
        this.runCalled = true;
    }
}
describe('AbstractStage.execute — template method', () => {
    let stage;
    let artifactHandler;
    let summaryWriter;
    beforeEach(() => {
        jest.clearAllMocks();
        stage = new ConcreteStage(makeConfig());
        // Acceder a los mocks internos del stage
        artifactHandler = stage.artifactHandler;
        summaryWriter = stage.summaryWriter;
    });
    it('calls download → run → upload → summary in order', async () => {
        const order = [];
        artifactHandler.download.mockImplementation(async () => { order.push('download'); });
        artifactHandler.upload.mockImplementation(async () => { order.push('upload'); });
        summaryWriter.write.mockImplementation(async () => { order.push('summary'); });
        const stageConfig = {
            name: 'compile',
            artifacts: {
                download: [{ name: 'jar', path: 'target/' }],
                upload: [{ name: 'jar', path: 'target/*.jar' }],
            },
            summary: { title: 'Build', file: 'report.txt' },
        };
        await stage.execute(stageConfig);
        expect(order).toEqual(['download', 'upload', 'summary']);
        expect(stage.runCalled).toBe(true);
    });
    it('skips download when no artifacts.download declared', async () => {
        await stage.execute({ name: 'compile' });
        expect(artifactHandler.download).not.toHaveBeenCalled();
    });
    it('skips upload when no artifacts.upload declared', async () => {
        await stage.execute({ name: 'compile' });
        expect(artifactHandler.upload).not.toHaveBeenCalled();
    });
    it('skips summary when not declared', async () => {
        await stage.execute({ name: 'compile' });
        expect(summaryWriter.write).not.toHaveBeenCalled();
    });
    it('passes upload config correctly to ArtifactHandler', async () => {
        const uploads = [{ name: 'tfplan', path: 'tfplan' }];
        await stage.execute({ name: 'deploy', artifacts: { upload: uploads } });
        expect(artifactHandler.upload).toHaveBeenCalledWith(uploads);
    });
    it('passes download config correctly to ArtifactHandler', async () => {
        const downloads = [{ name: 'tfplan', path: '.' }];
        await stage.execute({ name: 'deploy', artifacts: { download: downloads } });
        expect(artifactHandler.download).toHaveBeenCalledWith(downloads);
    });
});
//# sourceMappingURL=AbstractStageExecute.test.js.map