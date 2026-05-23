import { ActionsType } from '../enums/ActionsType';
import { Metadata } from './Metadata';
import { StageConfig, StageTools } from './StageConfig';
import { ErrorCode } from '../enums/ErrorCode';
export interface ActionYamlData {
    version?: string;
    type: ActionsType | string;
    metadata: Metadata;
    tools?: StageTools;
    env?: Record<string, string>;
    stages: StageConfig[];
}
export declare class ActionYaml implements ActionYamlData {
    version?: string;
    type: ActionsType | string;
    metadata: Metadata;
    tools?: StageTools;
    env?: Record<string, string>;
    stages: StageConfig[];
    constructor(data: ActionYamlData);
    static load(configPath: string): ActionYaml;
}
export declare class ActionsCoreLibError extends Error {
    readonly code: ErrorCode;
    constructor(code: ErrorCode, message: string);
}
//# sourceMappingURL=ActionYaml.d.ts.map