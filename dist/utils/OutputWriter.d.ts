import { ActionYaml } from '../entities/ActionYaml';
import { BranchType } from '../enums/BranchType';
import { Workflow } from '../workflows/Workflow';
export declare class OutputWriter {
    static writeFlags(config: ActionYaml, branchType: BranchType, workflow: Workflow): Promise<void>;
}
//# sourceMappingURL=OutputWriter.d.ts.map