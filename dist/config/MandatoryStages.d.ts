import { StageName } from '../enums/StageName';
import { StageConfig } from '../entities/StageConfig';
export interface MandatoryStageDefinition {
    stage: StageConfig;
    insertAfter: StageName;
    insertBefore: StageName[];
}
export declare const MANDATORY_STAGES: Partial<Record<string, MandatoryStageDefinition[]>>;
export declare function injectMandatoryStages(stages: StageConfig[], type: string): StageConfig[];
//# sourceMappingURL=MandatoryStages.d.ts.map