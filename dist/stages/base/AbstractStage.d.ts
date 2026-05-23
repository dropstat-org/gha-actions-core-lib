import { ActionYaml } from '../../entities/ActionYaml';
import { StageConfig, StageTools } from '../../entities/StageConfig';
export declare abstract class AbstractStage {
    protected config: ActionYaml;
    private artifactHandler;
    private summaryWriter;
    constructor(config: ActionYaml);
    execute(stage: StageConfig): Promise<void>;
    protected abstract run(stage: StageConfig): Promise<void>;
    protected execCommands(commands: string[], tools?: StageTools): Promise<void>;
    protected _buildEnv(tools?: StageTools): NodeJS.ProcessEnv;
    _effectiveTools(stage: StageConfig): StageTools | undefined;
    protected startGroup(name: string): () => void;
}
//# sourceMappingURL=AbstractStage.d.ts.map